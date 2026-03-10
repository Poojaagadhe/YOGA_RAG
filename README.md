# Yoga Wellness RAG Micro-App

A **safety-aware Yoga Wellness Assistant** that retrieves curated yoga knowledge, applies health-risk warnings, and prevents out-of-domain hallucinations.

## 🏗️ Architecture

```
User (Browser)
      ↓
Streamlit Cloud (Frontend: frontend/app.py)
      ↓  HTTP POST
Render (Node.js + Express Backend: backend/server.js)
      ↓
MongoDB Atlas (Query Logs)
      ↓
dataset/yoga_knowledge_base.json (22 articles)
```

## 📂 Project Structure

```
yoga-wellness-rag-app/
├── frontend/
│   ├── app.py              # Streamlit dark-mode UI
│   └── requirements.txt
├── backend/
│   ├── server.js           # Express API + RAG pipeline
│   ├── package.json
│   └── .env.example        # Environment variable template
├── dataset/
│   └── yoga_knowledge_base.json   # 22 curated articles
├── README.md
└── .gitignore
```

## 🚀 Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your MONGO_URI in .env
node server.js
# → Running on http://localhost:3001
```

### Frontend

```bash
cd frontend
pip install -r requirements.txt
streamlit run app.py
# → Opens http://localhost:8501
```

#### Point frontend to your local backend (optional)

Create `frontend/.streamlit/secrets.toml`:
```toml
BACKEND_URL = "http://localhost:3001"
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB Atlas connection string | Yes (for logging) |
| `PORT` | Server port (default: 3001) | No |

See `backend/.env.example` for the template.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 Knowledge Retrieval | Token-based matching against 22 curated articles |
| ⚠️ Safety Warnings | Detects pregnancy, BP, injuries, surgery, diabetes, etc. |
| 🚫 Domain Guard | Rejects non-yoga questions explicitly |
| 📊 Query Logging | MongoDB Atlas stores every query for auditability |
| 🌙 Dark UI | Streamlit app with custom dark CSS + animations |

## 🧠 RAG Pipeline

1. User submits question via Streamlit
2. Backend **domain guard** checks yoga relevance
3. **Token-based retrieval** scores articles by keyword match
4. **Safety detection** flags health-risk queries
5. Structured articles returned (no LLM generation)
6. **MongoDB** logs `{ question, isUnsafe, matchedArticles, createdAt }`

## 🛠️ Tech Stack

- **Frontend**: Streamlit, Custom CSS (Dark Mode)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Deployment**: Streamlit Cloud + Render

## ⚠️ Disclaimer

This application is for **educational purposes only**. Always consult a certified yoga instructor and medical professional before starting any yoga practice, especially if you have health conditions.

## 🚀 Live URLs

- **Frontend (Streamlit Cloud)**: https://yoga-wellness-rag-app-bcsqqbtuwgiyct9aci4iqk.streamlit.app/
- **Backend (Render)**: https://docs-chat-bot.onrender.com
- **GitHub**: https://github.com/Poojaagadhe/yoga-wellness-rag-app