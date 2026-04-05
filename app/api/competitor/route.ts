import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const SCRAPE_KEY = process.env.SCRAPECREATORS_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { keyword } = await req.json()
    if (!keyword?.trim()) return NextResponse.json({ error: 'No keyword provided' }, { status: 400 })

    const searchRes = await fetch(
      `https://api.scrapecreators.com/v1/tiktok/search/keyword?query=${encodeURIComponent(keyword)}`,
      { headers: { 'x-api-key': SCRAPE_KEY! } }
    )
    const searchData = await searchRes.json()

    const items = searchData?.search_item_list || []
    if (!items.length) {
      return NextResponse.json({
        error: 'No videos found for that keyword. Try a different search term.',
        debug: searchData?.message || searchData?.error || JSON.stringify(Object.keys(searchData || {}))
      }, { status: 404 })
    }

    const videos = items.slice(0, 15).map((item: any) => {
      const v = item.aweme_info || item
      return {
        id: v.aweme_id || v.id || '',
        desc: v.desc || '',
        playCount: v.statistics?.play_count || v.stats?.playCount || 0,
        likeCount: v.statistics?.digg_count || v.stats?.diggCount || 0,
        commentCount: v.statistics?.comment_count || v.stats?.commentCount || 0,
        author: v.author?.unique_id || v.author?.uniqueId || '',
        authorFollowers: v.author_stats?.follower_count || v.authorStats?.followerCount || 0,
      }
    }).filter((v: any) => v.id)

    videos.sort((a: any, b: any) => b.playCount - a.playCount)

    const topVideos = videos.slice(0, 3)
    const commentsData: string[] = []

    for (const video of topVideos) {
      try {
        const commentRes = await fetch(
          `https://api.scrapecreators.com/v1/tiktok/video/comments?videoId=${video.id}&count=30`,
          { headers: { 'x-api-key': SCRAPE_KEY! } }
        )
        const commentJson = await commentRes.json()
        const comments = (commentJson?.comments || commentJson?.data?.comments || [])
          .slice(0, 20)
          .map((c: any) => c.text || c.share_info?.desc || '')
          .filter(Boolean)
        commentsData.push(...comments)
      } catch {
        // skip
      }
    }

    const videoSummary = videos.slice(0, 10).map((v: any, i: number) =>
      `${i + 1}. "${v.desc}" — ${(v.playCount / 1000).toFixed(0)}k views, ${(v.likeCount / 1000).toFixed(0)}k likes (@${v.author})`
    ).join('\n')

    const commentSummary = commentsData.slice(0, 50).join('\n')

    const prompt = `You are a UGC growth strategist for Liberation Cocktails — a UK brand selling mixologist-grade pre-mixed cocktails in cans, pouches, and party kegs. No bartender needed, bar quality, ready to drink anywhere. UK market focus.

Liberation's 4 buyer personas: Party Host (home/garden parties), Cocktail Lover (bar quality at home), Festival Crowd (on-the-go at events/festivals/sports), Event Planner (weddings, corporate, private events).

A competitor or adjacent creator is posting content around the keyword: "${keyword}"

Here are their top performing videos:
${videoSummary}

${commentSummary ? `Here are comments from their top videos:\n${commentSummary}` : ''}

Analyze this and provide:

1. hook_patterns: 4-5 recurring hook patterns or structures that are working
2. winning_angles: 3-4 content angles getting the most traction
3. content_gaps: 3-4 angles or pain points they are NOT covering that Liberation Cocktails could own
4. liberation_hooks: 6 hooks Liberation could use, inspired by what's working but differentiated. Use British English.
5. persona_fit: Which of the 4 Liberation personas is most represented and why (2-3 sentences)
6. creator_notes: What type of creator energy/style is working here (2 sentences)

Respond ONLY in this exact JSON, no markdown, no preamble:
{
  "hook_patterns": ["string"],
  "winning_angles": ["string"],
  "content_gaps": ["string"],
  "limesoda_hooks": ["string"],
  "persona_fit": "string",
  "creator_notes": "string"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response')

    const clean = content.text.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)

    return NextResponse.json({
      success: true,
      keyword,
      videoCount: videos.length,
      topVideos: videos.slice(0, 8),
      analysis
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Analysis failed. Check your API keys and try again.' }, { status: 500 })
  }
}
