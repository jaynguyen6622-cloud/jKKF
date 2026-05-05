# 🎤 Karaoke Key Finder

Find the original, male, and female singing keys for any song — plus links to chord/tab sheets and YouTube.

Powered by Claude AI with web search. Works with Vietnamese, English, Korean, and any language.

---

## 🚀 Deploy to Vercel (5 minutes)

### Step 1 — Get an Anthropic API key
1. Go to https://console.anthropic.com
2. Sign up (free)
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

### Step 2 — Push to GitHub
1. Create a new repo at https://github.com/new
2. Upload all files from this folder (keeping the same structure)

### Step 3 — Deploy on Vercel
1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo
3. In **Environment Variables**, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-...` key
4. Click **Deploy**

Your app is live at `https://your-project.vercel.app` 🎉

---

## 📁 Project Structure

```
karaoke-key-finder/
├── public/
│   └── index.html       # Frontend UI
├── api/
│   └── search.js        # Serverless API proxy (keeps your key secure)
├── vercel.json          # Vercel routing config
└── README.md
```

---

## 🔒 Security

Your API key lives only in Vercel's environment variables — never in the frontend code. All API calls go through the `/api/search` serverless function.

---

## 💡 Features

- 🔍 Searches karaoke sites, chord databases, and YouTube
- 🎵 Returns original, male, and female keys
- 🎸 Links to chord/tab sheets for male and female keys
- ▶️ Links to original YouTube video
- 🌐 Works with any language (Vietnamese, English, Korean, etc.)
- 📱 Mobile-friendly responsive design
