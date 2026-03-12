require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// Load Knowledge Base
// ─────────────────────────────────────────────
const KB_PATH = path.join(__dirname, '..', 'dataset', 'yoga_knowledge_base.json');
let knowledgeBase = [];
try {
  knowledgeBase = JSON.parse(fs.readFileSync(KB_PATH, 'utf-8'));
  console.log(`✅ Knowledge base loaded: ${knowledgeBase.length} articles`);
} catch (err) {
  console.error('❌ Failed to load knowledge base:', err.message);
}

// ─────────────────────────────────────────────
// MongoDB Connection
// ─────────────────────────────────────────────
// Support common env var names across platforms (Render, Atlas, etc.)
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  '';

if (MONGO_URI) {
  const source =
    process.env.MONGO_URI
      ? 'MONGO_URI'
      : process.env.MONGODB_URI
        ? 'MONGODB_URI'
        : 'DATABASE_URL';
  console.log(`ℹ️  MongoDB connection string found in ${source}`);
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Atlas connected (query logging enabled)'))
    .catch((err) => console.warn('⚠️  MongoDB connection failed (query logging disabled):', err.message));
} else {
  console.warn(
    '⚠️  MongoDB URI env var not set (checked MONGO_URI, MONGODB_URI, DATABASE_URL) — query logging is disabled'
  );
}

// ─────────────────────────────────────────────
// MongoDB Schema
// ─────────────────────────────────────────────
const queryLogSchema = new mongoose.Schema({
  question: { type: String, required: true },
  isUnsafe: { type: Boolean, default: false },
  matchedArticles: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const QueryLog = mongoose.model('QueryLog', queryLogSchema);

// ─────────────────────────────────────────────
// Domain Guard — Yoga-Related Keywords
// ─────────────────────────────────────────────
const YOGA_DOMAIN_KEYWORDS = [
  'yoga', 'asana', 'pose', 'poses', 'pranayama', 'breathing', 'breath',
  'meditation', 'mindfulness', 'stretch', 'flexibility', 'namaste',
  'chakra', 'mantra', 'savasana', 'warrior', 'downward', 'sun salutation',
  'surya', 'namaskar', 'vinyasa', 'ashtanga', 'hatha', 'kundalini', 'yin',
  'restorative', 'prenatal', 'nidra', 'dhyana', 'patanjali', 'back pain',
  'stress relief', 'anxiety', 'sleep', 'wellness', 'wellbeing', 'relax',
  'health', 'fitness', 'exercise', 'stretching', 'posture', 'balance',
  'strength', 'flexibility', 'mobility', 'body', 'mind', 'spirit',
];

function isDomainRelated(query) {
  const lower = query.toLowerCase();
  return YOGA_DOMAIN_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─────────────────────────────────────────────
// Safety Keywords — Health Risk Detection
// ─────────────────────────────────────────────
const SAFETY_KEYWORDS = [
  'pregnancy', 'pregnant', 'prenatal', 'trimester', 'maternity',
  'hypertension', 'high blood pressure', 'blood pressure', 'bp',
  'heart', 'cardiac', 'cardiovascular', 'heart disease', 'arrhythmia',
  'injury', 'injured', 'surgery', 'post-surgery', 'post op', 'operation',
  'diabetes', 'diabetic', 'blood sugar', 'insulin',
  'osteoporosis', 'fracture', 'broken', 'arthritis',
  'chronic pain', 'chronic illness', 'disability',
  'vertigo', 'dizziness', 'balance disorder',
];

function detectSafetyRisks(query) {
  const lower = query.toLowerCase();
  return SAFETY_KEYWORDS.filter((kw) => lower.includes(kw));
}

// ─────────────────────────────────────────────
// Token-Based Article Retrieval (Precision mode)
// ─────────────────────────────────────────────

// Common words that carry no topical meaning — excluded from scoring
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'of', 'to', 'do', 'for', 'and', 'or', 'not',
  'are', 'be', 'as', 'at', 'by', 'if', 'up', 'so', 'we', 'my', 'can', 'how', 'what',
  'with', 'this', 'that', 'have', 'has', 'was', 'were', 'will', 'you', 'your', 'i',
  'me', 'he', 'she', 'they', 'their', 'its', 'from', 'about', 'which', 'when', 'where',
  'does', 'did', 'had', 'been', 'than', 'into', 'also', 'there', 'some', 'any', 'all',
  'safe', 'good', 'best', 'great', 'general', 'during', 'after', 'before', 'while',
  'should', 'would', 'could', 'tell', 'give', 'need', 'want', 'help', 'use', 'get',
  // Generic yoga terms — present in almost every article, add no topical signal
  'yoga', 'pose', 'poses', 'asana', 'asanas', 'practice', 'techniques', 'technique',
  'body', 'better', 'benefits', 'improve', 'relief', 'way', 'ways', 'type', 'types',
  'try', 'work', 'works', 'makes', 'make', 'feel', 'know', 'learn', 'guide', 'tips',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function retrieveArticles(query, topN = 3) {
  const queryLower = query.toLowerCase();
  const queryTokens = tokenize(query);

  // Only bail out on a completely blank query; phrase matching can work with zero tokens
  if (!queryLower.trim()) return [];

  const scored = knowledgeBase.map((article) => {
    let score = 0;

    // ① Multi-word keyword phrase match (strongest signal)
    // Runs even when queryTokens is empty — catches "what is yoga", "introduction to yoga" etc.
    for (const kw of article.keywords) {
      const kwLower = kw.toLowerCase();
      if (queryLower.includes(kwLower)) {
        // Longer phrases are more specific → extra weight
        score += 4 + kwLower.split(' ').length;
      }
    }

    // ② Title phrase match
    if (queryLower.includes(article.title.toLowerCase())) {
      score += 6;
    }

    // ③ Individual keyword token match (only when meaningful tokens exist)
    if (queryTokens.length > 0) {
      const keywordTokens = article.keywords.flatMap((kw) => tokenize(kw));
      const titleTokens = tokenize(article.title);
      const articleTokenSet = new Set([...keywordTokens, ...titleTokens]);

      for (const token of queryTokens) {
        if (articleTokenSet.has(token)) {
          score += 2;
        }
      }
    }

    return { article, score };
  });

  // Minimum score of 6 required — prevents articles from matching on generic terms alone
  return scored
    .filter((s) => s.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.article);
}

// ─────────────────────────────────────────────
// POST /api/query — Main Endpoint
// ─────────────────────────────────────────────
app.post('/api/query', async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty question is required.' });
  }

  const trimmedQuestion = question.trim();

  // 1. Domain Guard
  if (!isDomainRelated(trimmedQuestion)) {
    await logQuery(trimmedQuestion, false, []);
    return res.json({
      answer:
        '🚫 I can only answer questions related to yoga and wellness. Please ask a yoga-specific question, such as about poses, breathing techniques, meditation, or yoga health benefits.',
      articles: [],
      isUnsafe: false,
      warning: null,
      isDomainRejected: true,
    });
  }

  // 2. Safety Detection
  const detectedRisks = detectSafetyRisks(trimmedQuestion);
  const isUnsafe = detectedRisks.length > 0;

  let warning = null;
  if (isUnsafe) {
    warning = `⚠️ HEALTH & SAFETY ADVISORY: Your query mentions health risk factor(s): ${detectedRisks.join(', ')}. The information provided below is for general educational purposes only. Please consult a qualified yoga instructor and your medical professional or doctor before attempting any yoga practice related to your condition.`;
  }

  // 3. Article Retrieval
  let articles = retrieveArticles(trimmedQuestion);

  // 4. Safety Fallback: if unsafe but no direct articles found
  let fallbackUsed = false;
  if (isUnsafe && articles.length === 0) {
    fallbackUsed = true;
    articles = knowledgeBase
      .filter((a) => a.safetyNote !== null)
      .slice(0, 2);
  }

  // 5. Compose answer
  let answer;
  if (articles.length === 0) {
    answer =
      'I found your question is yoga-related, but I could not find a specific article in the knowledge base that matches your query. Please try rephrasing or asking about a specific pose, technique, or yoga topic.';
  } else {
    const articleSummaries = articles
      .map(
        (a, i) =>
          `${i + 1}. **${a.title}**: ${a.content.slice(0, 200)}...${a.safetyNote ? '\n   ⚠️ ' + a.safetyNote : ''}`
      )
      .join('\n\n');
    answer = fallbackUsed
      ? `No direct article matched your exact query, but here are related safety-focused resources:\n\n${articleSummaries}`
      : articleSummaries;
  }

  const matchedTitles = articles.map((a) => a.title);

  // 6. Log to MongoDB
  await logQuery(trimmedQuestion, isUnsafe, matchedTitles);

  return res.json({
    answer,
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      safetyNote: a.safetyNote,
    })),
    isUnsafe,
    warning,
    isDomainRejected: false,
  });
});

// ─────────────────────────────────────────────
// Helper: Log Query to MongoDB
// ─────────────────────────────────────────────
async function logQuery(question, isUnsafe, matchedArticles) {
  if (!MONGO_URI || mongoose.connection.readyState !== 1) return;
  try {
    await QueryLog.create({ question, isUnsafe, matchedArticles });
  } catch (err) {
    console.warn('⚠️  Failed to log query to MongoDB:', err.message);
  }
}

// ─────────────────────────────────────────────
// GET /health — Health Check
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    articles: knowledgeBase.length,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Yoga RAG Backend running on port ${PORT}`);
});
