import { useState, useEffect, useCallback } from 'react'
import styles from './App.module.css'

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkUA_4W1NvttLXXqvHI1tb00rjiCG7JvkAqOGyWatNKjRnI55ZP4iX13k5qTej3M84KaO_PgqFuSU6/pub?gid=1763348503&single=true&output=csv'

const SLOTS = [
  'MONDAY – Morning (9am–12pm)',
  'MONDAY – Midday (12pm–2pm)',
  'MONDAY – Afternoon (2pm–6pm)',
  'MONDAY – Night (6pm–11pm)',
  'TUESDAY – Morning (9am–12pm)',
  'TUESDAY – Midday (12pm–2pm)',
  'TUESDAY – Afternoon (2pm–6pm)',
  'TUESDAY – Night (6pm–11pm)',
  'WEDNESDAY – Morning (9am–12pm)',
  'WEDNESDAY – Midday (12pm–2pm)',
  'WEDNESDAY – Afternoon (2pm–6pm)',
  'WEDNESDAY – Night (6pm–11pm)',
  'THURSDAY – Morning (9am–12pm)',
  'THURSDAY – Midday (12pm–2pm)',
  'THURSDAY – Afternoon (2pm–6pm)',
  'THURSDAY – Night (6pm–11pm)',
  'FRIDAY – Morning (9am–12pm)',
  'FRIDAY – Midday (12pm–2pm)',
  'FRIDAY – Afternoon (2pm–6pm)',
  'FRIDAY – Night (6pm–11pm)',
  'SATURDAY – Morning (9am–12pm)',
  'SATURDAY – Midday (12pm–2pm)',
  'SATURDAY – Afternoon (2pm–6pm)',
  'SATURDAY – Evening (6pm–8pm)',
  'SUNDAY – Morning (9am–12pm)',
  'SUNDAY – Midday (12pm–2pm)',
  'SUNDAY – Afternoon (2pm–6pm)',
  'SUNDAY – Evening (6pm–8pm)',
]

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  return lines
    .slice(1)
    .map((line) => {
      const cols = []
      let cur = '', inQ = false
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQ = !inQ
        } else if (line[i] === ',' && !inQ) {
          cols.push(cur.trim())
          cur = ''
        } else {
          cur += line[i]
        }
      }
      cols.push(cur.trim())
      const ts = cols[0] || ''
      const name = cols[1] || ''
      const allSlots = [cols[2] || '', cols[3] || ''].join(', ')
      const slots = allSlots.split(',').map((s) => s.trim()).filter(Boolean)
      return { ts, name, slots }
    })
    .filter((r) => r.name)
}

function computeGames(responses) {
  const players = {}
  SLOTS.forEach((s) => { players[s] = [] })
  responses.forEach((r) => {
    r.slots.forEach((sl) => {
      if (players[sl] !== undefined) players[sl].push(r.name)
    })
  })
  return Object.entries(players)
    .filter(([, names]) => names.length >= 4)
    .sort((a, b) => b[1].length - a[1].length)
}

export default function App() {
  const [responses, setResponses] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)
  const [dotOk, setDotOk] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const resp = await fetch(CSV_URL, { cache: 'no-store' })
      if (!resp.ok) throw new Error('HTTP ' + resp.status)
      const text = await resp.text()
      setResponses(parseCSV(text))
      setLastUpdated(new Date())
      setError(null)
      setDotOk(true)
    } catch {
      setError('Could not load sheet data. Make sure it is published as CSV and publicly accessible.')
      setDotOk(false)
      setLastUpdated(new Date())
    }
  }, [])

  useEffect(() => {
    loadData()
    const id = setInterval(loadData, 10000)
    return () => clearInterval(id)
  }, [loadData])

  const games = computeGames(responses)
  const doubles = games.filter(([, names]) => names.length >= 6)

  const covered = new Set()
  games.forEach(([, names]) => names.forEach((n) => covered.add(n)))

  const sortedResponses = [...responses].sort((a, b) => new Date(a.ts) - new Date(b.ts))

  const updatedLabel = lastUpdated
    ? 'Updated ' + lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Padel – Weekly Availability</h1>
      <p className={styles.subtitle}>
        Live results · form resets every Sunday at 8pm · deadline Tuesday 11:59pm
      </p>

      <div className={styles.topBar}>
        <div className={styles.live}>
          <div className={styles.dot} style={{ background: dotOk ? '#1d9e75' : '#E24B4A' }} />
          Live · auto-refresh every 10s
        </div>
        <span className={styles.updated}>{updatedLabel}</span>
        <button className={styles.btn} onClick={loadData}>Refresh</button>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.metricGrid}>
        <Metric label="Responses" value={responses.length || '—'} />
        <Metric label="Games found" value={games.length || '—'} />
        <Metric label="Double courts" value={doubles.length || '—'} />
        <Metric label="Players covered" value={responses.length ? `${covered.size}/10` : '—'} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Best slots to play</div>
        {games.length === 0 ? (
          <div className={styles.empty}>
            {responses.length === 0 ? 'Loading...' : 'No slot with 4+ players yet'}
          </div>
        ) : (
          games.map(([sl, names], i) => {
            const count = names.length
            const isDouble = count >= 6
            const numCourts = isDouble ? 2 : 1
            return (
              <div key={sl} className={styles.gameCard}>
                <div className={styles.gameRank}>{i + 1}</div>
                <div className={styles.gameInfo}>
                  <div className={styles.gameSlot}>
                    {sl}
                    <span className={`${styles.badge} ${isDouble ? styles.badgeDouble : styles.badgeSingle}`}>
                      {isDouble ? '2 courts' : '1 court'}
                    </span>
                  </div>
                  <div className={styles.gameSub}>{count} players · {names.join(', ')}</div>
                </div>
                <div className={styles.barWrap}>
                  {Array.from({ length: numCourts }, (_, j) => {
                    const courtPlayers = Math.min(4, Math.max(0, count - j * 4))
                    const courtPct = Math.round((courtPlayers / 4) * 100)
                    return (
                      <div key={j} className={styles.courtBar}>
                        <div className={styles.barBg}>
                          <div className={styles.barFill} style={{ width: `${courtPct}%` }} />
                        </div>
                        <div className={styles.courtBarLabel}>{courtPlayers}/4</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      <hr className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Response timestamps</div>
        {sortedResponses.length === 0 ? (
          <div className={styles.empty}>No responses yet</div>
        ) : (
          sortedResponses.map((r, i) => (
            <div key={r.name + r.ts} className={styles.tsRow}>
              <span className={styles.tsIdx}>{i + 1}</span>
              <span className={styles.tsName}>{r.name}</span>
              <span className={styles.tsTime}>{r.ts}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
    </div>
  )
}
