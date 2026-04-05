import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const SCRAPE_KEY = process.env.SCRAPECREATORS_API_KEY

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '7'

    const hashtagRes = await fetch(
      `https://api.scrapecreators.com/v1/tiktok/hashtags/popular?period=${period}&countryCode=GB&page=1`,
      { headers: { 'x-api-key': SCRAPE_KEY! } }
    )
    const hashtagData = await hashtagRes.json()

    if (!hashtagRes.ok || !hashtagData?.list?.length) {
      return NextResponse.json({ error: 'Could not fetch trending hashtags. Check your ScrapeCreators API key.' }, { status: 500 })
    }

    const hashtags = hashtagData.list.slice(0, 30).map((h: any) => ({
      name: h.hashtag_name || h.name || '',
      views: h.video_views || h.publish_cnt || 0,
      isNew: h.is_new || false,
    })).filter((h: any) => h.name)

    const hashtagList = hashtags.map((h: any, i: number) =>
      `${i + 1}. #${h.name} — ${h.views > 1000000 ? (h.views / 1000000).toFixed(1) + 'M' : (h.views / 1000).toFixed(0) + 'K'} views${h.isNew ? ' [NEW]' : ''}`
    ).join('\n')

    const prompt = `You are a UGC growth strategist for Liberation Cocktails — a UK brand selling mixologist-grade pre-mixed cocktails in cans, pouches, and party kegs. No bartender needed, bar quality, ready to drink anywhere. UK market focus.

Liberation's 4 buyer personas:
- PARTY_HOST: hosting home/garden parties, birthdays, anniversaries. Wants to impress without the hassle.
- COCKTAIL_LOVER: wants bar-quality cocktails at home without effort or skill.
- FESTIVAL_CROWD: festivals, picnics, outdoor events, sports matches. Wants great cocktails on the go.
- EVENT_PLANNER: weddings, corporate events, private parties. Needs a scalable cocktail solution.

Core message: Mixologist-grade cocktails, no bartender needed, ready whenever and wherever you are.

Here are the current trending TikTok hashtags in the United Kingdom (last ${period} days):
${hashtagList}

For each relevant trend, provide how Liberation Cocktails could create content riding that trend, which persona it fits, and a specific hook in British English. Ignore irrelevant hashtags.

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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response')

    const clean = content.text.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)

    return NextResponse.json({ success: true, period, hashtags, analysis })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch trends. Check your API keys and try again.' }, { status: 500 })
  }
}
