'use client'

import { useState } from 'react'
import styles from './page.module.css'

const EXAMPLE_TEXT = `Hosting a party this weekend and I'm already stressed about drinks. Last time I was stuck behind the kitchen counter making cocktails all night and missed half the evening.

Why does making cocktails at home always taste worse than at a bar? I follow the recipe exactly and it still tastes off.

Bought a load of spirits for a garden party and now I've got half-used bottles everywhere that I don't know what to do with. Such a waste.

Festival season is coming and I'm sick of paying £12 for a watered-down cocktail in a plastic cup. There has to be a better way.

I'm organising my sister's hen do and everyone wants cocktails but I don't want to spend the whole time making drinks. I just want to enjoy it too.

Pre-mixed drinks always taste fake and sweet. Like you can tell it's not real. Total disappointment every time.

I had the best Aperol Spritz at a rooftop bar last summer and I've been chasing that taste ever since. Can't get close to it at home.

Going to Glastonbury this year and trying to figure out the drink situation. Queuing for 20 minutes for a weak cocktail is not it.

Garden party season and I want to serve something impressive but I'm not a bartender. I literally just want something that looks and tastes great without the effort.

My husband and I want to do a proper cocktail night at home but every time we try it turns into a mess and nothing tastes right.`

const PERSONA_META: Record<string, { label: string; color: string; bg: string }> = {
  PARTY_HOST: { label: 'Party host', color: '#0F6E56', bg: '#E1F5EE' },
  COCKTAIL_LOVER: { label: 'Cocktail lover', color: '#854F0B', bg: '#FAEEDA' },
  FESTIVAL_CROWD: { label: 'Festival crowd', color: '#3C3489', bg: '#EEEDFE' },
  EVENT_PLANNER: { label: 'Event planner', color: '#993C1D', bg: '#FAECE7' },
}

type Tab = 'analyze' | 'bank' | 'competitor' | 'trending'

type AnalysisResult = {
  source: string
  data: {
    pain_points: string[]
    hooks: string[]
    angles: Record<string, string>
    raw_quotes: string[]
  }
}

type CompetitorResult = {
  keyword: string
  videoCount: number
  topVideos: { desc: string; playCount: number; likeCount: number; author: string }[]
  analysis: {
    hook_patterns: string[]
    winning_angles: string[]
    content_gaps: string[]
    limesoda_hooks: string[]
    persona_fit: string
    creator_notes: string
  }
}

type TrendingResult = {
  period: string
  hashtags: { name: string; views: number; isNew: boolean }[]
  analysis: {
    opportunities: {
      hashtag: string
      relevance: string
      persona: string
      angle: string
      hook: string
    }[]
    top_picks: string[]
    summary: string
  }
}

function formatViews(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('analyze')

  const [source, setSource] = useState('')
  const [text, setText] = useState('')
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const [compKeyword, setCompKeyword] = useState('')
  const [compLoading, setCompLoading] = useState(false)
  const [compError, setCompError] = useState('')
  const [compResult, setCompResult] = useState<CompetitorResult | null>(null)
  const [compHistory, setCompHistory] = useState<CompetitorResult[]>([])

  const [trendPeriod, setTrendPeriod] = useState('7')
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState('')
  const [trendResult, setTrendResult] = useState<TrendingResult | null>(null)

  async function analyze() {
    if (!text.trim()) { setAnalyzeError('Paste some text first.'); return }
    setAnalyzeLoading(true); setAnalyzeError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: source || 'Unnamed source' })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setAnalyses(prev => [json, ...prev])
      setText(''); setSource('')
      setActiveTab('bank')
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setAnalyzeLoading(false)
  }

  function copyAnalysis(idx: number) {
    const a = analyses[idx]
    const lines = [
      `VIRAL BANK — ${a.source}`, '',
      'PAIN POINTS', ...a.data.pain_points.map(p => `• ${p}`), '',
      'HOOKS', ...a.data.hooks.map((h, i) => `${i + 1}. "${h}"`), '',
      'SCRIPT ANGLES',
      ...Object.entries(a.data.angles).map(([k, v]) => `[${PERSONA_META[k]?.label || k}]\n${v}`), '',
      'RAW QUOTES', ...a.data.raw_quotes.map(q => `"${q}"`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  function copyAllHooks() {
    const all = analyses.flatMap(a => a.data.hooks)
    navigator.clipboard.writeText(all.map((h, i) => `${i + 1}. "${h}"`).join('\n'))
  }

  async function analyzeCompetitor() {
    if (!compKeyword.trim()) { setCompError('Enter a keyword first.'); return }
    setCompLoading(true); setCompError(''); setCompResult(null)
    try {
      const res = await fetch('/api/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: compKeyword })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setCompResult(json)
      setCompHistory(prev => [json, ...prev])
    } catch (e: unknown) {
      setCompError(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setCompLoading(false)
  }

  async function fetchTrending() {
    setTrendLoading(true); setTrendError(''); setTrendResult(null)
    try {
      const res = await fetch(`/api/trending?period=${trendPeriod}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setTrendResult(json)
    } catch (e: unknown) {
      setTrendError(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setTrendLoading(false)
  }

  const allHooks = analyses.flatMap(a => a.data.hooks)
  const allPainPoints = Array.from(new Set(analyses.flatMap(a => a.data.pain_points)))

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'analyze', label: 'Analyze' },
    { id: 'bank', label: 'Bank', count: analyses.length || undefined },
    { id: 'competitor', label: 'Competitor' },
    { id: 'trending', label: 'Trending' },
  ]

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          <span className={styles.logo}>🍹</span>
          <span>Liberation</span>
          <span className={styles.headerSub}>Viral Bank</span>
        </div>
        <div className={styles.tabs}>
          {tabs.map(t => (
            <button key={t.id} className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
              {t.count ? <span className={styles.badge}>{t.count}</span> : null}
            </button>
          ))}
        </div>
      </header>

      <main className={styles.main}>

        {activeTab === 'analyze' && (
          <div className={styles.analyzePane}>
            <div className={styles.intro}>
              <p className={styles.introTitle}>Paste raw social text. Get hooks, pain points, and script angles.</p>
              <p className={styles.introSub}>TikTok comment sections, Reddit threads, UK drinking and party forums — anything real party hosts, cocktail lovers, or festival-goers have written about drinks, hosting, or cocktail experiences.</p>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Source</label>
              <input type="text" placeholder="e.g. Reddit r/AskNYC — garden party drinks ideas" value={source} onChange={e => setSource(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Raw text</label>
              <textarea placeholder="Paste comments, threads, or posts here..." value={text} onChange={e => setText(e.target.value)} className={styles.textarea} />
              <div className={styles.textareaFooter}>
                <span className={styles.charCount}>{text.length.toLocaleString()} chars</span>
                <button className={styles.ghostBtn} onClick={() => { setSource('Reddit r/CasualUK — home cocktails and party drinks'); setText(EXAMPLE_TEXT) }}>Load example</button>
              </div>
            </div>
            {analyzeError && <p className={styles.error}>{analyzeError}</p>}
            <button className={styles.analyzeBtn} onClick={analyze} disabled={analyzeLoading}>{analyzeLoading ? 'Analyzing...' : 'Analyze →'}</button>
            <div className={styles.searchList}>
              <p className={styles.label} style={{ marginBottom: '10px' }}>Suggested TikTok search terms</p>
              {['cocktails at home UK','garden party drinks ideas','party hosting tips UK','festival drinks hack','pre-mixed cocktails review','hen party drinks','how to make cocktails at home','summer party ideas UK','Glastonbury drinks tips','cocktail night at home','drinks for garden party','best ready to drink cocktails'].map(term => (
                <div key={term} className={styles.searchTerm}><span className={styles.searchIcon}>↗</span>{term}</div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className={styles.bankPane}>
            {analyses.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No analyses yet.</p>
                <button className={styles.ghostBtn} onClick={() => setActiveTab('analyze')}>Start analyzing →</button>
              </div>
            ) : (
              <>
                {allPainPoints.length > 0 && (
                  <div className={styles.summaryBlock}>
                    <div className={styles.summaryHeader}><span className={styles.summaryTitle}>All pain points ({allPainPoints.length})</span></div>
                    <div className={styles.tagCloud}>{allPainPoints.map(p => <span key={p} className={styles.painTag}>{p}</span>)}</div>
                  </div>
                )}
                {allHooks.length > 0 && (
                  <div className={styles.summaryBlock}>
                    <div className={styles.summaryHeader}>
                      <span className={styles.summaryTitle}>All hooks ({allHooks.length})</span>
                      <button className={styles.ghostBtn} onClick={copyAllHooks}>Copy all hooks</button>
                    </div>
                    <div className={styles.hookGrid}>{allHooks.map((h, i) => <div key={i} className={styles.hookCard}>"{h}"</div>)}</div>
                  </div>
                )}
                <div className={styles.analysesHeader}>
                  <span className={styles.summaryTitle}>Individual analyses</span>
                  <button className={styles.ghostBtn} onClick={() => setActiveTab('analyze')}>+ Add source</button>
                </div>
                {analyses.map((a, idx) => (
                  <div key={idx} className={styles.analysisCard}>
                    <div className={styles.analysisCardHeader}>
                      <span className={styles.analysisSource}>{a.source}</span>
                      <button className={styles.ghostBtn} onClick={() => copyAnalysis(idx)}>{copiedIdx === idx ? 'Copied ✓' : 'Copy'}</button>
                    </div>
                    <div className={styles.section}>
                      <p className={styles.sectionLabel}>Pain points</p>
                      <div className={styles.tagCloud}>{a.data.pain_points.map(p => <span key={p} className={styles.painTag}>{p}</span>)}</div>
                    </div>
                    <div className={styles.section}>
                      <p className={styles.sectionLabel}>Hooks</p>
                      <div className={styles.hookGrid}>{a.data.hooks.map((h, i) => <div key={i} className={styles.hookCard}>"{h}"</div>)}</div>
                    </div>
                    <div className={styles.section}>
                      <p className={styles.sectionLabel}>Script angles</p>
                      {Object.entries(a.data.angles).map(([key, val]) => {
                        const meta = PERSONA_META[key] || { label: key, color: '#333', bg: '#eee' }
                        return (
                          <div key={key} className={styles.angleCard}>
                            <span className={styles.personaBadge} style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                            <p className={styles.angleText}>{val}</p>
                          </div>
                        )
                      })}
                    </div>
                    {a.data.raw_quotes?.length > 0 && (
                      <div className={styles.section}>
                        <p className={styles.sectionLabel}>Raw quotes</p>
                        {a.data.raw_quotes.map((q, i) => <blockquote key={i} className={styles.quote}>"{q}"</blockquote>)}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'competitor' && (
          <div className={styles.analyzePane}>
            <div className={styles.intro}>
              <p className={styles.introTitle}>Competitor keyword research</p>
              <p className={styles.introSub}>Search a keyword to find what's working in adjacent TikTok content. Pulls top videos, analyses hooks and angles, and surfaces gaps Liberation Cocktails can own.</p>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Keyword</label>
              <input type="text" placeholder="e.g. buzzballz, moth, beatbox" value={compKeyword} onChange={e => setCompKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyzeCompetitor()} className={styles.input} />
            </div>
            {compError && <p className={styles.error}>{compError}</p>}
            <button className={styles.analyzeBtn} onClick={analyzeCompetitor} disabled={compLoading}>{compLoading ? 'Searching TikTok...' : 'Analyze →'}</button>

            {compResult && (
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.summaryBlock}>
                  <div className={styles.summaryHeader}>
                    <span className={styles.summaryTitle}>"{compResult.keyword}" — {compResult.videoCount} videos found</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Caption', 'Views', 'Likes', 'Author'].map(h => (
                            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compResult.topVideos.map((v, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--surface2)' }}>
                            <td style={{ padding: '8px 6px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.desc || '—'}</td>
                            <td style={{ padding: '8px 6px', whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontSize: '12px' }}>{formatViews(v.playCount)}</td>
                            <td style={{ padding: '8px 6px', whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontSize: '12px' }}>{formatViews(v.likeCount)}</td>
                            <td style={{ padding: '8px 6px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>@{v.author}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className={styles.analysisCard}>
                  <div className={styles.section}>
                    <p className={styles.sectionLabel}>Hook patterns that are working</p>
                    {compResult.analysis.hook_patterns.map((p, i) => <div key={i} className={styles.hookCard}>{p}</div>)}
                  </div>
                  <div className={styles.section}>
                    <p className={styles.sectionLabel}>Winning angles</p>
                    <div className={styles.tagCloud}>{compResult.analysis.winning_angles.map((a, i) => <span key={i} className={styles.painTag}>{a}</span>)}</div>
                  </div>
                  <div className={styles.section}>
                    <p className={styles.sectionLabel}>Content gaps Liberation can own</p>
                    {compResult.analysis.content_gaps.map((g, i) => <div key={i} className={styles.angleCard}><p className={styles.angleText}>{g}</p></div>)}
                  </div>
                  <div className={styles.section}>
                    <p className={styles.sectionLabel}>Liberation hooks inspired by this space</p>
                    <div className={styles.hookGrid}>{compResult.analysis.limesoda_hooks.map((h, i) => <div key={i} className={styles.hookCard}>"{h}"</div>)}</div>
                  </div>
                  <div className={styles.section}>
                    <p className={styles.sectionLabel}>Best persona fit</p>
                    <p style={{ fontSize: '14px', lineHeight: 1.65 }}>{compResult.analysis.persona_fit}</p>
                  </div>
                  <div className={styles.section}>
                    <p className={styles.sectionLabel}>Creator style notes</p>
                    <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-muted)' }}>{compResult.analysis.creator_notes}</p>
                  </div>
                </div>
              </div>
            )}

            {compHistory.length > 1 && (
              <div style={{ marginTop: '2rem' }}>
                <p className={styles.summaryTitle} style={{ marginBottom: '10px' }}>Previous searches</p>
                {compHistory.slice(1).map((r, i) => (
                  <div key={i} className={styles.searchTerm} style={{ cursor: 'pointer' }} onClick={() => setCompResult(r)}>
                    <span className={styles.searchIcon}>↗</span>{r.keyword}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trending' && (
          <div className={styles.analyzePane}>
            <div className={styles.intro}>
              <p className={styles.introTitle}>Trending TikTok hashtags — United Kingdom</p>
              <p className={styles.introSub}>Pull current trending hashtags in the UK and get Liberation-specific hooks and angles for each relevant trend.</p>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Time period</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ val: '7', label: 'Last 7 days' }, { val: '30', label: 'Last 30 days' }, { val: '120', label: 'Last 120 days' }].map(opt => (
                  <button key={opt.val} onClick={() => setTrendPeriod(opt.val)} className={styles.ghostBtn} style={trendPeriod === opt.val ? { borderColor: 'var(--text)', color: 'var(--text)', background: 'var(--surface2)' } : {}}>{opt.label}</button>
                ))}
              </div>
            </div>
            {trendError && <p className={styles.error}>{trendError}</p>}
            <button className={styles.analyzeBtn} onClick={fetchTrending} disabled={trendLoading}>{trendLoading ? 'Fetching trends...' : 'Fetch trends →'}</button>

            {trendResult && (
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.summaryBlock}>
                  <div className={styles.summaryHeader}><span className={styles.summaryTitle}>Summary</span></div>
                  <p style={{ fontSize: '14px', lineHeight: 1.65 }}>{trendResult.analysis.summary}</p>
                  {trendResult.analysis.top_picks?.length > 0 && (
                    <>
                      <p className={styles.sectionLabel} style={{ marginTop: '12px' }}>Top picks for Liberation</p>
                      <div className={styles.tagCloud}>{trendResult.analysis.top_picks.map((p, i) => <span key={i} className={styles.painTag}>#{p}</span>)}</div>
                    </>
                  )}
                </div>
                {['high', 'medium'].map(rel => {
                  const opps = trendResult.analysis.opportunities?.filter(o => o.relevance === rel)
                  if (!opps?.length) return null
                  return (
                    <div key={rel} className={styles.analysisCard}>
                      <div className={styles.analysisCardHeader}>
                        <span className={styles.analysisSource}>{rel === 'high' ? 'High' : 'Medium'} relevance opportunities</span>
                      </div>
                      {opps.map((opp, i) => {
                        const meta = PERSONA_META[opp.persona] || { label: opp.persona, color: '#333', bg: '#eee' }
                        return (
                          <div key={i} className={styles.section}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 500 }}>#{opp.hashtag}</span>
                              <span className={styles.personaBadge} style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>{opp.angle}</p>
                            <div className={styles.hookCard}>"{opp.hook}"</div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                <div className={styles.summaryBlock}>
                  <div className={styles.summaryHeader}><span className={styles.summaryTitle}>All trending hashtags ({trendResult.hashtags.length})</span></div>
                  <div className={styles.tagCloud}>
                    {trendResult.hashtags.map(h => (
                      <span key={h.name} className={styles.painTag}>
                        #{h.name} <span style={{ opacity: 0.6 }}>{formatViews(h.views)}</span>
                        {h.isNew && <span style={{ color: '#0F6E56', marginLeft: '3px' }}>new</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
