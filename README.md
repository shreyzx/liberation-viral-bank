# Limesoda Viral Bank

UGC research tool. Paste raw social text (TikTok comments, Reddit threads) and get pain points, hooks, and script angles for each Limesoda persona.

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import the repo
3. Add environment variable: `ANTHROPIC_API_KEY` = your key from console.anthropic.com
4. Deploy

## Local development

```bash
cp .env.local.example .env.local
# Add your Anthropic API key to .env.local

npm install
npm run dev
```

Open http://localhost:3000

## How to use

1. Go to the Analyze tab
2. Label your source (e.g. "Reddit r/AskNYC")
3. Paste raw comment sections or thread text
4. Hit Analyze
5. Results appear in the Bank tab — pain points, hooks, script angles per persona, and raw quotes
6. Copy individual analyses or all hooks at once
