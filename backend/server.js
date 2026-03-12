require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

// ─────────────────────────────────────────────
// Load Knowledge Base
// ─────────────────────────────────────────────

const KB_PATH = path.join(__dirname, "..", "dataset", "yoga_knowledge_base.json");

let knowledgeBase = [];

try {
  const raw = fs.readFileSync(KB_PATH, "utf-8");
  knowledgeBase = JSON.parse(raw);

  console.log(`✅ Knowledge base loaded: ${knowledgeBase.length} articles`);

} catch (err) {

  console.error("❌ Failed to load knowledge base:", err.message);

}


// ─────────────────────────────────────────────
// MongoDB Configuration
// ─────────────────────────────────────────────

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  "";


// ─────────────────────────────────────────────
// MongoDB Schema
// ─────────────────────────────────────────────

const queryLogSchema = new mongoose.Schema({

  question: { type: String, required: true },
  isUnsafe: { type: Boolean, default: false },
  matchedArticles: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }

});

const QueryLog = mongoose.model("QueryLog", queryLogSchema);


// ─────────────────────────────────────────────
// Domain Guard
// ─────────────────────────────────────────────

const YOGA_DOMAIN_KEYWORDS = [

'yoga','asana','pose','poses','pranayama','breathing','breath',
'meditation','mindfulness','stretch','flexibility','namaste',
'chakra','mantra','savasana','warrior','downward','sun salutation',
'surya','namaskar','vinyasa','ashtanga','hatha','kundalini','yin',
'restorative','prenatal','nidra','dhyana','patanjali','back pain',
'stress relief','anxiety','sleep','wellness','wellbeing','relax',
'health','fitness','exercise','stretching','posture','balance',
'strength','mobility','body','mind','spirit'

];

function isDomainRelated(query){

  const lower = query.toLowerCase();

  return YOGA_DOMAIN_KEYWORDS.some(k => lower.includes(k));

}


// ─────────────────────────────────────────────
// Safety Detection
// ─────────────────────────────────────────────

const SAFETY_KEYWORDS = [

'pregnancy','pregnant','prenatal','trimester',
'hypertension','high blood pressure','blood pressure','bp',
'heart','cardiac','cardiovascular',
'injury','injured','surgery','post-surgery',
'diabetes','blood sugar','insulin',
'osteoporosis','fracture','arthritis',
'chronic pain','chronic illness',
'vertigo','dizziness','balance disorder'

];

function detectSafetyRisks(query){

  const lower = query.toLowerCase();

  return SAFETY_KEYWORDS.filter(k => lower.includes(k));

}


// ─────────────────────────────────────────────
// Stop Words
// ─────────────────────────────────────────────

const STOP_WORDS = new Set([

'a','an','the','is','it','in','on','of','to','do','for','and','or',
'are','be','as','at','by','if','up','so','we','my','can','how',
'with','this','that','have','has','was','were','will','you','your',
'i','me','he','she','they','their','its','from','about','which',
'when','where','does','did','had','been','into','also'

]);

function tokenize(text){

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g," ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

}


// ─────────────────────────────────────────────
// Retrieval
// ─────────────────────────────────────────────

function retrieveArticles(query, topN = 3){

  const queryLower = query.toLowerCase();
  const queryTokens = tokenize(query);

  const scored = knowledgeBase.map(article => {

    let score = 0;

    for(const kw of article.keywords){

      const k = kw.toLowerCase();

      if(queryLower.includes(k)){
        score += 4 + k.split(" ").length;
      }

    }

    if(queryLower.includes(article.title.toLowerCase())){
      score += 6;
    }

    if(queryTokens.length){

      const keywordTokens = article.keywords.flatMap(k => tokenize(k));
      const titleTokens = tokenize(article.title);

      const tokens = new Set([...keywordTokens,...titleTokens]);

      for(const t of queryTokens){
        if(tokens.has(t)){
          score += 2;
        }
      }

    }

    return { article, score };

  });

  return scored
    .filter(s => s.score >= 6)
    .sort((a,b)=>b.score-a.score)
    .slice(0,topN)
    .map(s=>s.article);

}


// ─────────────────────────────────────────────
// Root Route
// ─────────────────────────────────────────────

app.get("/", (req,res)=>{

  res.json({

    message:"Yoga RAG Backend API is running",
    endpoints:{
      health:"/health",
      query:"POST /api/query"
    }

  });

});


// ─────────────────────────────────────────────
// Query Endpoint
// ─────────────────────────────────────────────

app.post("/api/query", async (req,res)=>{

  const { question } = req.body;

  if(!question || !question.trim()){
    return res.status(400).json({error:"Question is required"});
  }

  const q = question.trim();

  if(!isDomainRelated(q)){

    await logQuery(q,false,[]);

    return res.json({

      answer:"🚫 Only yoga related questions are supported.",
      articles:[],
      isUnsafe:false,
      warning:null,
      isDomainRejected:true

    });

  }

  const risks = detectSafetyRisks(q);
  const isUnsafe = risks.length > 0;

  let warning = null;

  if(isUnsafe){

    warning = `⚠️ Health advisory: detected risk factors (${risks.join(", ")}). Consult a medical professional before practicing yoga.`;

  }

  let articles = retrieveArticles(q);

  if(isUnsafe && articles.length === 0){

    articles = knowledgeBase
      .filter(a => a.safetyNote)
      .slice(0,2);

  }

  let answer;

  if(!articles.length){

    answer = "No matching article found. Try asking about a specific yoga pose or technique.";

  }else{

    answer = articles
      .map((a,i)=>`${i+1}. **${a.title}**: ${a.content.slice(0,200)}...`)
      .join("\n\n");

  }

  const titles = articles.map(a=>a.title);

  await logQuery(q,isUnsafe,titles);

  res.json({

    answer,
    articles,
    isUnsafe,
    warning,
    isDomainRejected:false

  });

});


// ─────────────────────────────────────────────
// Query Logger
// ─────────────────────────────────────────────

async function logQuery(question,isUnsafe,matchedArticles){

  if(!MONGO_URI || mongoose.connection.readyState !== 1) return;

  try{

    await QueryLog.create({question,isUnsafe,matchedArticles});

  }catch(err){

    console.warn("⚠️ Query logging failed:",err.message);

  }

}


// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────

app.get("/health",(req,res)=>{

  res.json({

    status:"ok",
    articles:knowledgeBase.length,
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected"

  });

});


// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

async function startServer(){

  try{

    if(MONGO_URI){

      await mongoose.connect(MONGO_URI,{
        serverSelectionTimeoutMS:5000
      });

      console.log("✅ MongoDB Atlas connected");

    }else{

      console.warn("⚠️ MongoDB URI not provided — logging disabled");

    }

    app.listen(PORT,()=>{

      console.log(`🚀 Yoga RAG Backend running on port ${PORT}`);

    });

  }catch(err){

    console.error("❌ MongoDB connection failed:",err.message);
    process.exit(1);

  }

}

startServer();