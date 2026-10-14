import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Pulls clean JSON out of a model response: strips fences, slices to the
// outermost { ... }, and removes trailing commas before } or ].
function extractJson(raw: string): string {
  let s = raw.replace(/```json\s*|```/g, '').trim()

  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first === -1 || last === -1 || last < first) {
    throw new Error('No JSON object found in model response')
  }
  s = s.slice(first, last + 1)

  // Remove trailing commas: ,} or ,] (with optional whitespace between)
  s = s.replace(/,(\s*[}\]])/g, '$1')

  return s
}

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

Respond ONLY in this exact JSON format, no markdown, no preamble, no trailing text. Do not put a comma after the last item in any list or object:
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
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')

    if (!responseText) throw new Error('No text block in model response')

    let parsed
    try {
      parsed = JSON.parse(extractJson(responseText))
    } catch (parseErr) {
      console.error('JSON parse failed. Raw model output:', responseText)
      return NextResponse.json(
        {
          error: `Model returned malformed JSON: ${(parseErr as any)?.message || parseErr}`,
          raw: responseText
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, source: source || 'Unnamed source', data: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String((err as any)?.message || err) }, { status: 500 })
  }
}
