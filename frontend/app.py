import streamlit as st
import requests
import time

# ─────────────────────────────────────────────
# Page Config
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="Yoga Wellness Assistant",
    page_icon="🧘",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ─────────────────────────────────────────────
# Backend URL
# ─────────────────────────────────────────────
try:
    BACKEND_URL = st.secrets["BACKEND_URL"]
except Exception:
    BACKEND_URL = "https://yoga-rag-zqr0.onrender.com"

# ─────────────────────────────────────────────
# Dark-Mode CSS + Animations
# ─────────────────────────────────────────────
st.markdown(
    """
<style>
/* ─── Google Font ─── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

/* ─── Global Dark Theme ─── */
html, body, [data-testid="stAppViewContainer"], [data-testid="stApp"] {
    background-color: #0d0f14 !important;
    color: #e8eaf0 !important;
    font-family: 'Inter', sans-serif !important;
}

[data-testid="stHeader"] { background: transparent !important; }
[data-testid="stSidebar"] { background-color: #111318 !important; }
section[data-testid="stMain"] { background-color: #0d0f14 !important; }

/* ─── Hero Header ─── */
.hero-header {
    text-align: center;
    padding: 2.5rem 1rem 1.5rem;
    background: linear-gradient(135deg, #1a1d26 0%, #12151f 100%);
    border-radius: 20px;
    margin-bottom: 2rem;
    border: 1px solid #2a2d3a;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: fadeInDown 0.7s ease-out;
}
.hero-emoji { font-size: 3.5rem; margin-bottom: 0.5rem; }
.hero-title {
    font-family: 'DM Sans', sans-serif;
    font-size: 2.2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #a78bfa, #818cf8, #38bdf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
}
.hero-subtitle {
    font-size: 0.95rem;
    color: #8b8fa8;
    margin-top: 0.5rem;
    font-weight: 400;
}

/* ─── Search Bar ─── */
[data-testid="stTextInput"] > div > div > input {
    background-color: #1a1d26 !important;
    border: 1.5px solid #2e3147 !important;
    border-radius: 12px !important;
    color: #e8eaf0 !important;
    padding: 0.8rem 1rem !important;
    font-size: 1rem !important;
    font-family: 'Inter', sans-serif !important;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
[data-testid="stTextInput"] > div > div > input:focus {
    border-color: #a78bfa !important;
    box-shadow: 0 0 0 3px rgba(167,139,250,0.15) !important;
    outline: none !important;
}
[data-testid="stTextInput"] > label {
    color: #8b8fa8 !important;
    font-size: 0.85rem !important;
    font-weight: 500 !important;
}

/* ─── Button ─── */
[data-testid="stButton"] > button {
    background: linear-gradient(135deg, #7c3aed, #4f46e5) !important;
    color: white !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 0.65rem 2rem !important;
    font-size: 1rem !important;
    font-weight: 600 !important;
    font-family: 'Inter', sans-serif !important;
    cursor: pointer !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 4px 15px rgba(124,58,237,0.4) !important;
    width: 100%;
}
[data-testid="stButton"] > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(124,58,237,0.5) !important;
    background: linear-gradient(135deg, #8b5cf6, #6366f1) !important;
}
[data-testid="stButton"] > button:active { transform: translateY(0) !important; }

/* ─── Safety Warning Banner ─── */
.warning-banner {
    background: linear-gradient(135deg, rgba(217,119,6,0.15), rgba(180,83,9,0.1));
    border: 1.5px solid #d97706;
    border-radius: 14px;
    padding: 1rem 1.2rem;
    margin: 1.2rem 0;
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    animation: fadeInUp 0.5s ease-out;
}
.warning-icon { font-size: 1.4rem; flex-shrink: 0; margin-top: 2px; }
.warning-text { color: #fbbf24; font-size: 0.9rem; line-height: 1.6; font-weight: 400; }
.warning-title { font-weight: 700; font-size: 0.95rem; color: #f59e0b; margin-bottom: 0.3rem; }

/* ─── Domain Rejection Banner ─── */
.rejection-banner {
    background: linear-gradient(135deg, rgba(239,68,68,0.1), rgba(185,28,28,0.08));
    border: 1.5px solid #ef4444;
    border-radius: 14px;
    padding: 1rem 1.2rem;
    margin: 1.2rem 0;
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    animation: fadeInUp 0.5s ease-out;
}
.rejection-text { color: #fca5a5; font-size: 0.95rem; line-height: 1.6; }

/* ─── Article Card ─── */
.article-card {
    background: linear-gradient(145deg, #1a1d26, #141720);
    border: 1px solid #2e3147;
    border-radius: 16px;
    padding: 1.4rem 1.6rem;
    margin-bottom: 1rem;
    transition: all 0.3s ease;
    animation: fadeInUp 0.5s ease-out;
    position: relative;
    overflow: hidden;
}
.article-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 4px; height: 100%;
    background: linear-gradient(180deg, #a78bfa, #38bdf8);
    border-radius: 4px 0 0 4px;
}
.article-card:hover {
    border-color: #a78bfa;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(167,139,250,0.12);
}
.article-number {
    font-size: 0.75rem;
    color: #a78bfa;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 0.4rem;
}
.article-title {
    font-family: 'DM Sans', sans-serif;
    font-size: 1.1rem;
    font-weight: 600;
    color: #e8eaf0;
    margin-bottom: 0.8rem;
}
.article-content {
    font-size: 0.9rem;
    color: #9ca3b8;
    line-height: 1.75;
    margin-bottom: 0.6rem;
}
.article-safety {
    background: rgba(217,119,6,0.08);
    border-left: 3px solid #d97706;
    border-radius: 0 8px 8px 0;
    padding: 0.6rem 0.8rem;
    margin-top: 0.8rem;
    font-size: 0.83rem;
    color: #fbbf24;
    line-height: 1.5;
}
.no-safety-badge {
    display: inline-block;
    background: rgba(16,185,129,0.12);
    color: #34d399;
    border-radius: 20px;
    padding: 0.2rem 0.7rem;
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 0.5rem;
}
.results-header {
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem;
    color: #8b8fa8;
    font-weight: 500;
    margin-bottom: 1rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid #1e2130;
}
.results-count {
    background: linear-gradient(135deg, #a78bfa, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
}

/* ─── Feature Chips ─── */
.feature-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 0.8rem;
}
.feature-chip {
    background: rgba(167,139,250,0.08);
    border: 1px solid rgba(167,139,250,0.2);
    border-radius: 20px;
    padding: 0.3rem 0.9rem;
    font-size: 0.78rem;
    color: #c4b5fd;
    font-weight: 500;
}

/* ─── Example Queries ─── */
.example-section {
    background: #14172080;
    border: 1px solid #2e3147;
    border-radius: 14px;
    padding: 1rem 1.2rem;
    margin-top: 1.5rem;
}
.example-title { color: #6b7280; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.7rem; }
.example-query {
    background: #1a1d26;
    border: 1px solid #2e3147;
    border-radius: 8px;
    padding: 0.45rem 0.8rem;
    font-size: 0.85rem;
    color: #9ca3b8;
    margin-bottom: 0.4rem;
    cursor: pointer;
    transition: all 0.2s ease;
}
.example-query:hover { border-color: #a78bfa; color: #c4b5fd; }

/* ─── Spinner ─── */
[data-testid="stSpinner"] { color: #a78bfa !important; }

/* ─── Footer ─── */
.footer {
    text-align: center;
    margin-top: 3rem;
    padding: 1.5rem;
    color: #4b5063;
    font-size: 0.8rem;
    border-top: 1px solid #1e2130;
}

/* ─── Animations ─── */
@keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

/* ─── Hide Streamlit branding ─── */
#MainMenu { visibility: hidden; }
footer { visibility: hidden; }
</style>
""",
    unsafe_allow_html=True,
)

# ─────────────────────────────────────────────
# Hero Header
# ─────────────────────────────────────────────
st.markdown(
    """
<div class="hero-header">
    <div class="hero-emoji">🧘</div>
    <h1 class="hero-title">Yoga Wellness Assistant</h1>
    <p class="hero-subtitle">Safety-aware answers from a curated yoga knowledge base · Zero hallucination guarantee</p>
    <div class="feature-row">
        <span class="feature-chip">🧠 RAG-Powered</span>
        <span class="feature-chip">⚠️ Safety Warnings</span>
        <span class="feature-chip">🚫 Anti-Hallucination</span>
        <span class="feature-chip">📊 Query Logged</span>
    </div>
</div>
""",
    unsafe_allow_html=True,
)

# ─────────────────────────────────────────────
# Session State
# ─────────────────────────────────────────────
if "history" not in st.session_state:
    st.session_state.history = []
if "last_response" not in st.session_state:
    st.session_state.last_response = None

# ─────────────────────────────────────────────
# Query Input
# ─────────────────────────────────────────────
with st.form(key="query_form", clear_on_submit=False):
    question = st.text_input(
        "Ask your yoga question",
        placeholder="e.g. How do I do downward dog? / Yoga for stress relief / Safe poses during pregnancy",
        key="question_input",
    )
    submitted = st.form_submit_button("🔍  Search Knowledge Base")

# ─────────────────────────────────────────────
# Example Queries (shown before first search)
# ─────────────────────────────────────────────
if not st.session_state.last_response:
    st.markdown(
        """
<div class="example-section">
    <div class="example-title">💡 Try asking</div>
    <div class="example-query">🧘 What is downward facing dog?</div>
    <div class="example-query">💨 Explain pranayama breathing techniques</div>
    <div class="example-query">🤰 Is yoga safe during pregnancy?</div>
    <div class="example-query">❤️ Yoga poses for high blood pressure</div>
    <div class="example-query">😴 Best yoga poses for better sleep</div>
    <div class="example-query">📉 What is the stock market? (non-yoga rejection demo)</div>
</div>
""",
        unsafe_allow_html=True,
    )

# ─────────────────────────────────────────────
# Handle Query Submission
# ─────────────────────────────────────────────
if submitted and question.strip():
    with st.spinner("🔍 Searching knowledge base..."):
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/query",
                json={"question": question.strip()},
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()
            st.session_state.last_response = data
            st.session_state.history.append(
                {"question": question.strip(), "response": data}
            )
        except requests.exceptions.ConnectionError:
            st.error(
                "❌ Cannot connect to the backend server. Make sure it's running on "
                f"`{BACKEND_URL}` or check your `BACKEND_URL` secret."
            )
            st.session_state.last_response = None
        except requests.exceptions.Timeout:
            st.error("⏱️ Request timed out. The backend may be starting up (cold start). Please try again.")
            st.session_state.last_response = None
        except Exception as e:
            st.error(f"❌ An unexpected error occurred: {str(e)}")
            st.session_state.last_response = None

elif submitted and not question.strip():
    st.warning("Please enter a question before searching.")

# ─────────────────────────────────────────────
# Display Results
# ─────────────────────────────────────────────
resp = st.session_state.last_response

if resp:
    # ── Domain Rejection ──────────────────────
    if resp.get("isDomainRejected"):
        st.markdown(
            f"""
<div class="rejection-banner">
    <span style="font-size:1.4rem;flex-shrink:0;">🚫</span>
    <div class="rejection-text">
        <strong>Out-of-Domain Question Detected</strong><br>
        {resp.get('answer', '')}
    </div>
</div>
""",
            unsafe_allow_html=True,
        )
    else:
        # ── Safety Warning ────────────────────
        if resp.get("isUnsafe") and resp.get("warning"):
            st.markdown(
                f"""
<div class="warning-banner">
    <span class="warning-icon">⚠️</span>
    <div>
        <div class="warning-title">Health & Safety Advisory</div>
        <div class="warning-text">{resp.get('warning')}</div>
    </div>
</div>
""",
                unsafe_allow_html=True,
            )

        # ── Article Cards ─────────────────────
        articles = resp.get("articles", [])
        if articles:
            st.markdown(
                f"""<div class="results-header">Found <span class="results-count">{len(articles)}</span> relevant article{"s" if len(articles) != 1 else ""} from the Yoga Knowledge Base</div>""",
                unsafe_allow_html=True,
            )
            for i, article in enumerate(articles):
                safety_html = ""
                if article.get("safetyNote"):
                    safety_html = f'<div class="article-safety">{article["safetyNote"]}</div>'
                else:
                    safety_html = '<div class="no-safety-badge">✓ Safe for general practice</div>'

                st.markdown(
                    f"""
<div class="article-card">
    <div class="article-number">Article {i + 1}</div>
    <div class="article-title">{article.get('title', '')}</div>
    <div class="article-content">{article.get('content', '')}</div>
    {safety_html}
</div>
""",
                    unsafe_allow_html=True,
                )
        else:
            st.markdown(
                f"""
<div class="article-card">
    <div class="article-content">{resp.get('answer', 'No results found.')}</div>
</div>
""",
                unsafe_allow_html=True,
            )

# ─────────────────────────────────────────────
# Query History (Sidebar)
# ─────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 📜 Query History")
    if st.session_state.history:
        for i, item in enumerate(reversed(st.session_state.history[-10:])):
            q = item["question"]
            r = item["response"]
            icon = "🚫" if r.get("isDomainRejected") else ("⚠️" if r.get("isUnsafe") else "✅")
            st.markdown(f"**{icon} {q[:50]}{'...' if len(q)>50 else ''}**")
            articles_found = len(r.get("articles", []))
            if r.get("isDomainRejected"):
                st.caption("Out-of-domain rejected")
            else:
                st.caption(f"{articles_found} article(s) retrieved")
            if i < len(st.session_state.history) - 1:
                st.divider()
        if st.button("🗑️ Clear History"):
            st.session_state.history = []
            st.session_state.last_response = None
            st.rerun()
    else:
        st.caption("No queries yet. Ask your first question!")
    
    st.divider()
    st.markdown("### ℹ️ About")
    st.caption(
        "This assistant uses a rule-based RAG pipeline with a curated yoga knowledge base. "
        "All answers come from verified articles — no AI generation, no hallucination."
    )
    st.caption(f"**Backend:** `{BACKEND_URL}`")

# ─────────────────────────────────────────────
# Footer
# ─────────────────────────────────────────────
st.markdown(
    """
<div class="footer">
    🧘 Yoga Wellness RAG Assistant &nbsp;·&nbsp; For educational purposes only &nbsp;·&nbsp;
    Always consult a certified yoga instructor and medical professional for personalised advice.
</div>
""",
    unsafe_allow_html=True,
)
