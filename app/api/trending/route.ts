import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const SCRAPE_KEY = process.env.SCRAPECREATORS_API_KEY

const SEED_KEYWORDS = [
  'cocktails at home',
  'pre mixed cocktails',
  'house party drinks',
  'festival drinks',
]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '7'

    const batches = await Promise.all(
      SEED_KEYWORDS.map(async (kw) => {
        const res = await fetch(
          `https://api.scrapecreators.com/v1/tiktok/search/keyword?query=${encodeURIComponent(kw)}&trim=true`,
          { headers: { 'x-api-key': SCRAPE_KEY! } }
        )
        if (!res.ok) {
          const body = await res.text()
          throw new Error(`ScrapeCreators ${res.status} on "${kw}": ${body.slice(0, 200)}`)
        }
        const json = await res.json()
        return json?.search_item_list ?? []
      })
    )

    const tally = new Map<string, { name: string; views: number; count: number }>()

    for (const item of batches.flat()) {
      const info = item?.aweme_info ?? item
      const caption: string = info?.desc ?? ''
      const views: number = info?.statistics?.play_count ?? 0
      for (const raw of caption.match(/#[A-Za-z0-9_]+/g) ?? []) {
        const name = raw.slice(1).toLowerCase()
        if (name.length < 2) continue
        const cur = tally.get(name) ?? { name, views: 0, count: 0 }
        cur.views += views
        cur.count += 1
        tally.set(name, cur)
      }
    }

    const hashtags = Array.from(tally.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 30)
      .map((h) => ({ name: h.name, views: h.views, isNew: h.count === 1 }))

    if (!hashtags.length) {
      return NextResponse.json({ error: 'No hashtags found in returned videos.' }, { status: 502 })
    }

    const hashtagList = hashtags.map((h, i) =>
      `${i + 1}. #${h.name} — ${h.views > 1000000 ? (h.views / 1000000).toFixed(1) + 'M' : (h.views / 1000).toFixed(0) + 'K'} views${h.isNew ? ' [NEW]' : ''}`
    ).join('\n')

    const prompt = `You are a UGC growth strategist for Liberation Cocktails, a UK brand selling mixologist-grade pre-mixed cocktails in cans, pouches, and party kegs. No bartender needed, bar quality, ready to drink anywhere. UK market focus.

Liberation's 4 buyer personas:
- PARTY_HOST: hosting home/garden parties, birthdays, anniversaries. Wants to impress without the hassle.
- COCKTAIL_LOVER: wants bar-quality cocktails at home without effort or skill.
- FESTIVAL_CROWD: festivals, picnics, outdoor events, sports matches. Wants great cocktails on the go.
- EVENT_PLANNER: weddings, corporate events, private parties. Needs a scalable cocktail solution.

Core message: Mixologist-grade cocktails, no bartender needed, ready whenever and wherever you are.

These hashtags are currently attached to high-performing UK TikTok content in and around the drinks category, ranked by total views:
${hashtagList}

For each relevant trend, give how Liberation could create content riding it, which persona it fits, and a specific hook in British English. Ignore irrelevant hashtags.

Return at most 6 opportunities. Keep each "angle" and "hook" under 20 words.

Respond ONLY in this exact JSON, no markdown, no preamble:
{
  "opportunities": [
    {
      "hashtag": "string",
      "relevance": "high|medium",
      "persona": "PARTY_HOST|COCKTAIL_LOVER|FESTIVAL_CROWD|EVENT_PLANNER",
      "angle": "string",
      "hook": "string"
    }
  ],
  "top_picks": ["string"],
  "summary": "string"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
  .filter((b: any) => b.type === 'text')
  .map((b: any) => b.text)
  .join('\n')

if (!text) throw new Error('No text block in model response')

    const raw = text.replace(/```json|```/g, '').trim()
    let analysis
    try {
      analysis = JSON.parse(raw)
    } catch {
      throw new Error(`Bad JSON (${raw.length} chars), ends with: ${raw.slice(-200)}`)
    }

    return NextResponse.json({ success: true, period, hashtags, analysis })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
