import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { text, source } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

    const prompt = `You are a UGC growth strategist for Liberation Cocktails — a UK-based brand selling mixologist-grade pre-mixed cocktails in cans, pouches, and party kegs. The core message: bar-quality cocktails, no bartender needed, ready whenever and wherever you are. Stocked at Wembley, Twickenham, ABBA Voyage, and available D2C online. UK market focus.

The 4 key buyer personas are:
1. PARTY_HOST — hosting gatherings at home, garden parties, birthdays, anniversaries. Wants to impress guests without the hassle of mixing drinks all night.
2. COCKTAIL_LOVER — wants bar-quality cocktails at home without the effort, expense, or skill of making them from scratch.
3. FESTIVAL_CROWD — going to festivals, picnics, outdoor events, sports matches. Wants great cocktails on the go without carrying a full bar.
4. EVENT_PLANNER — organising weddings, corporate events, private parties. Needs a scalable, impressive cocktail solution.

Analyze the following raw social media text. Extract:

1. pain_points: 6-8 specific pain points in the EXACT language buyers use — short phrases, colloquial, as they'd actually say it in the UK
2. hooks: 8 scroll-stopping TikTok/Instagram hooks in real user language (not marketing speak). Mix types: statement, question, conditional, narrative opener. Each under 15 words. Should make someone think "this is for me." Use British English and tone.
3. angles: For each of the 4 personas, write a 3-sentence script angle. Sentence 1 = hook. Sentence 2 = agitate the problem or desire. Sentence 3 = introduce Liberation Cocktails as the resolution (keep it natural, not salesy).
4. raw_quotes: 3-5 direct quotes or paraphrased phrases from the text particularly useful as creative inspiration.

Respond ONLY in this exact JSON format, no markdown, no preamble, no trailing text:
{
  "pain_points": ["string"],
  "hooks": ["string"],
  "angles": {
    "PARTY_HOST": "string",
    "COCKTAIL_LOVER": "string",
    "FESTIVAL_CROWD": "string",
    "EVENT_PLANNER": "string"
  },
  "raw_quotes": ["string"]
}

Text to analyze:
${text.substring(0, 4000)}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const clean = content.text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ success: true, source: source || 'Unnamed source', data: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Analysis failed. Check your API key and try again.' }, { status: 500 })
  }
}
