"use client"
import { useState, useEffect } from "react"

const SETUPS = [
  { id: "lun_1330", day: 1, name: "Lun 13:30", dir: "Long", sl: 10, tp: 20, rr: 2.0, filter: "1er lunes", lots_ch: 40, lots_fu: 40, lots_min: 8, be_wr: 33.3 },
  { id: "lun_1100", day: 1, name: "Lun 11:00", dir: "Long", sl: 20, tp: 40, rr: 2.0, filter: "No 1er lunes", lots_ch: 40, lots_fu: 37, lots_min: 4, be_wr: 33.3 },
  { id: "mar_0800", day: 2, name: "Mar 08:00", dir: "Short", sl: 67, tp: 50, rr: 0.75, filter: "", lots_ch: 15, lots_fu: 11, lots_min: 1, be_wr: 57.3 },
  { id: "mie_0900", day: 3, name: "Mie 09:00", dir: "Short", sl: 30, tp: 23, rr: 0.77, filter: "", lots_ch: 33, lots_fu: 25, lots_min: 3, be_wr: 56.6 },
  { id: "mie_1200", day: 3, name: "Mie 12:00", dir: "Short", sl: 15, tp: 30, rr: 2.0, filter: "", lots_ch: 40, lots_fu: 40, lots_min: 5, be_wr: 33.3 },
  { id: "jue_0830", day: 4, name: "Jue 08:30", dir: "Long", sl: 10, tp: 20, rr: 2.0, filter: "", lots_ch: 40, lots_fu: 40, lots_min: 8, be_wr: 33.3 },
  { id: "vie_0945", day: 5, name: "Vie 09:45", dir: "Long", sl: 13, tp: 20, rr: 1.54, filter: "", lots_ch: 40, lots_fu: 40, lots_min: 6, be_wr: 39.4 },
  { id: "vie_1430", day: 5, name: "Vie 14:30", dir: "Long", sl: 10, tp: 20, rr: 2.0, filter: "Dias 1-7", lots_ch: 40, lots_fu: 40, lots_min: 8, be_wr: 33.3 },
]

export default function Dashboard() {
  const [tab, setTab] = useState("hoy")
  const [trades, setTrades] = useState([])
  const [historical, setHistorical] = useState([])
  const [accounts, setAccounts] = useState([])
  const [cash, setCash] = useState(0)
  const [payouts, setPayouts] = useState(0)
  const [todayResult, setTodayResult] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/historical_trades.json")
      .then(r => r.json())
      .then(data => { setHistorical(data); setLoading(false); })
      .catch(() => setLoading(false))
    const saved = localStorage.getItem("tradingData")
    if (saved) {
      const data = JSON.parse(saved)
      setTrades(data.trades || [])
      setAccounts(data.accounts || [])
      setCash(data.cash || 0)
      setPayouts(data.payouts || 0)
    }
  }, [])

  const save = (nt, na, nc, np) => {
    localStorage.setItem("tradingData", JSON.stringify({ trades: nt, accounts: na, cash: nc, payouts: np }))
  }

  const today = new Date()
  const dayOfWeek = today.getDay()
  const dayOfMonth = today.getDate()
  const isFirstMonday = dayOfWeek === 1 && dayOfMonth <= 7
  const isWeek1 = dayOfMonth <= 7

  const todaySetups = SETUPS.filter(s => {
    if (s.day !== dayOfWeek) return false
    if (s.filter === "1er lunes" && !isFirstMonday) return false
    if (s.filter === "No 1er lunes" && isFirstMonday) return false
    if (s.filter === "Dias 1-7" && !isWeek1) return false
    return true
  })

  const getStats = (setupId) => {
    const data = [...historical, ...trades]
    const st = data.filter(t => t.setupId === setupId)
    const tp = st.filter(t => t.result === "TP").length
    const sl = st.filter(t => t.result === "SL").length
    const total = tp + sl
    const wr = total > 0 ? tp / total : 0
    const setup = SETUPS.find(s => s.id === setupId)
    const ev = total > 0 ? (tp * setup.rr - sl) / total : 0
    return { tp, sl, total, wr, ev }
  }

  const getRollingStatus = (setupId) => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const allData = [...historical, ...trades]
    const relevant = allData.filter(t => t.setupId === setupId && new Date(t.date) >= sixMonthsAgo)
    if (relevant.length < 5) return { wr: null, active: true, count: relevant.length }
    const tp = relevant.filter(t => t.result === "TP").length
    const wr = tp / relevant.length
    return { wr, active: wr >= 0.30, count: relevant.length }
  }

  const addTrade = (setupId, result) => {
    const setup = SETUPS.find(s => s.id === setupId)
    const newTrade = { id: Date.now(), date: today.toISOString().split("T")[0], setupId, setupName: setup.name, result }
    const newTrades = [...trades, newTrade]
    setTrades(newTrades)
    save(newTrades, accounts, cash, payouts)
    setTodayResult({ ...todayResult, [setupId]: result })
  }

  const addAccount = () => {
    const newAcc = { id: Date.now(), type: "challenge", equity: 0, status: "active", created: today.toISOString().split("T")[0] }
    const newAccounts = [...accounts, newAcc]
    setAccounts(newAccounts)
    setCash(cash - 130)
    save(trades, newAccounts, cash - 130, payouts)
  }

  const addPayout = () => {
    setPayouts(payouts + 1)
    setCash(cash + 1800)
    save(trades, accounts, cash + 1800, payouts + 1)
  }

  const styles = {
    container: { maxWidth: 1000, margin: "0 auto", padding: 16 },
    header: { textAlign: "center", marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 700, color: "#fff" },
    subtitle: { color: "#888", fontSize: 14 },
    tabs: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" },
    tab: (active) => ({ padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? "#3b82f6" : "#1f1f2e", color: "#fff", fontSize: 13 }),
    card: { background: "#16161f", borderRadius: 12, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#fff" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #2a2a3a" },
    badge: (color) => ({ padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: color, color: "#fff" }),
    btn: (color) => ({ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: color, color: "#fff", fontSize: 12, fontWeight: 600, marginLeft: 6 }),
    stat: { textAlign: "center", padding: 12 },
    statValue: { fontSize: 22, fontWeight: 700, color: "#3b82f6" },
    statLabel: { fontSize: 11, color: "#888" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: { textAlign: "left", padding: "8px 4px", borderBottom: "1px solid #333", color: "#888" },
    td: { padding: "8px 4px", borderBottom: "1px solid #222" },
  }

  if (loading) return <div style={{ ...styles.container, textAlign: "center", paddingTop: 100 }}>Cargando...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Trading Dashboard</div>
        <div style={styles.subtitle}>6M mensual - WR 30% - {today.toLocaleDateString("es-AR")}</div>
      </div>
      <div style={styles.tabs}>
        {["hoy", "rolling", "cuentas", "historial", "stats", "setups"].map(t => (
          <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      {tab === "hoy" && (
        <div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Trades de hoy</div>
            {todaySetups.length === 0 ? <div style={{ color: "#888" }}>No hay trades hoy</div> : todaySetups.map(s => {
              const status = getRollingStatus(s.id)
              const result = todayResult[s.id]
              return (
                <div key={s.id} style={styles.row}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.name} {s.dir}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>SL {s.sl} / TP {s.tp} - {s.lots_ch} MNQ</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {!status.active && <span style={styles.badge("#ef4444")}>PAUSADO</span>}
                    {status.active && !result && (<><button style={styles.btn("#22c55e")} onClick={() => addTrade(s.id, "TP")}>TP</button><button style={styles.btn("#ef4444")} onClick={() => addTrade(s.id, "SL")}>SL</button></>)}
                    {result && <span style={styles.badge(result === "TP" ? "#22c55e" : "#ef4444")}>{result}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Resumen</div>
            <div style={styles.grid}>
              <div style={styles.stat}><div style={{ ...styles.statValue, color: cash >= 0 ? "#22c55e" : "#ef4444" }}>${cash.toLocaleString()}</div><div style={styles.statLabel}>Cash</div></div>
              <div style={styles.stat}><div style={styles.statValue}>{accounts.length}</div><div style={styles.statLabel}>Cuentas</div></div>
              <div style={styles.stat}><div style={styles.statValue}>{payouts}</div><div style={styles.statLabel}>Payouts</div></div>
              <div style={styles.stat}><div style={styles.statValue}>{trades.length}</div><div style={styles.statLabel}>Trades 2026</div></div>
            </div>
          </div>
        </div>
      )}
      {tab === "rolling" && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Rolling 6M (WR 30%+)</div>
          {SETUPS.map(s => {
            const status = getRollingStatus(s.id)
            return (
              <div key={s.id} style={styles.row}>
                <div><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 12, color: "#888" }}>{status.count} trades - BE {s.be_wr}%</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{status.wr !== null ? (status.wr * 100).toFixed(1) + "%" : "N/A"}</span>
                  <span style={styles.badge(status.active ? "#22c55e" : "#ef4444")}>{status.active ? "ACTIVO" : "PAUSADO"}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {tab === "cuentas" && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Cuentas</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button style={styles.btn("#3b82f6")} onClick={addAccount}>+ Challenge ($130)</button>
            <button style={styles.btn("#22c55e")} onClick={addPayout}>+ Payout ($1800)</button>
          </div>
          {accounts.length === 0 ? <div style={{ color: "#888" }}>No hay cuentas</div> : accounts.map(a => (
            <div key={a.id} style={styles.row}>
              <div><div style={{ fontWeight: 600 }}>Cuenta #{a.id.toString().slice(-4)}</div><div style={{ fontSize: 12, color: "#888" }}>{a.type} - {a.created}</div></div>
              <span style={styles.badge("#22c55e")}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
      {tab === "historial" && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Historial 2026 ({trades.length})</div>
          {trades.length === 0 ? <div style={{ color: "#888" }}>No hay trades</div> : [...trades].reverse().slice(0, 50).map(t => (
            <div key={t.id} style={styles.row}>
              <div><div style={{ fontWeight: 600 }}>{t.setupName}</div><div style={{ fontSize: 12, color: "#888" }}>{t.date}</div></div>
              <span style={styles.badge(t.result === "TP" ? "#22c55e" : "#ef4444")}>{t.result}</span>
            </div>
          ))}
        </div>
      )}
      {tab === "stats" && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Stats (2015-2026)</div>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Setup</th><th style={styles.th}>Trades</th><th style={styles.th}>WR</th><th style={styles.th}>EV</th></tr></thead>
            <tbody>
              {SETUPS.map(s => {
                const stats = getStats(s.id)
                return (
                  <tr key={s.id}>
                    <td style={styles.td}>{s.name}</td>
                    <td style={styles.td}>{stats.total}</td>
                    <td style={styles.td}>{(stats.wr * 100).toFixed(1)}%</td>
                    <td style={{ ...styles.td, color: stats.ev >= 0 ? "#22c55e" : "#ef4444" }}>{stats.ev >= 0 ? "+" : ""}{stats.ev.toFixed(2)}R</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 12, fontSize: 12, color: "#888" }}>Total: {historical.length + trades.length} trades</div>
        </div>
      )}
      {tab === "setups" && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Configuracion</div>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Setup</th><th style={styles.th}>SL</th><th style={styles.th}>TP</th><th style={styles.th}>CH</th><th style={styles.th}>FU</th><th style={styles.th}>MIN</th></tr></thead>
            <tbody>
              {SETUPS.map(s => (
                <tr key={s.id}>
                  <td style={styles.td}>{s.name}</td>
                  <td style={styles.td}>{s.sl}</td>
                  <td style={styles.td}>{s.tp}</td>
                  <td style={styles.td}>{s.lots_ch}</td>
                  <td style={styles.td}>{s.lots_fu}</td>
                  <td style={styles.td}>{s.lots_min}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 16, fontSize: 12, color: "#888" }}>CH=Challenge FU=Funded MIN=Dias minimos</div>
        </div>
      )}
    </div>
  )
}
