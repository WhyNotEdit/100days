'use client'
import { useState, useEffect, useCallback } from 'react'

const DEFAULTS = {
  gaby:  [5,6,10,15,20,21,22,23,25,26,30,35,40,45,50,52,55,60,100],
  dani:  [1,2,3,4,5,10,11,20,25,30,40,45,50,51,55,60,65,70,80,90],
  pablo: []
}
const GOAL = 5050
const DENOMS = [20,10,5,1]
const PEOPLE = ['gaby','dani','pablo']

function billsFor(amount) {
  const r = {20:0,10:0,5:0,1:0}
  let rem = amount
  if(rem>=20){r[20]=Math.floor(rem/20);rem-=r[20]*20}
  if(rem>=10){r[10]=Math.floor(rem/10);rem-=r[10]*10}
  if(rem>=5) {r[5] =Math.floor(rem/5); rem-=r[5]*5}
  r[1]=rem
  return r
}

function calcStats(filled) {
  const saved = filled.reduce((a,b)=>a+b,0)
  const needed = Math.max(0, GOAL-saved)
  const pct = Math.min(100, saved/GOAL*100)
  return { saved, needed, pct }
}

export default function Home() {
  const [tab, setTab] = useState('gaby')
  const [state, setState] = useState({ gaby: DEFAULTS.gaby, dani: DEFAULTS.dani, pablo: DEFAULTS.pablo })
  const [loading, setLoading] = useState({ gaby: true, dani: true, pablo: true })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [cashIn, setCashIn] = useState({ gaby:'', dani:'', pablo:'' })
  const [atmIn, setAtmIn] = useState({ gaby:'', dani:'', pablo:'' })
  const [result, setResult] = useState({ gaby: null, dani: null, pablo: null })
  const [pending, setPending] = useState({ gaby:[], dani:[], pablo:[] })

  const popToast = useCallback((msg) => {
    setToast(msg)
    setShowToast(true)
    setTimeout(()=>setShowToast(false), 2400)
  }, [])

  // Load all people from cloud on mount
  useEffect(()=>{
    PEOPLE.forEach(async (p) => {
      try {
        const res = await fetch(`/api/envelopes?person=${p}`)
        const data = await res.json()
        setState(prev => ({...prev, [p]: data.filled}))
      } catch(e) {
        // fallback to defaults already set
      } finally {
        setLoading(prev => ({...prev, [p]: false}))
      }
    })
  }, [])

  // Poll for updates every 15 seconds (live sync)
  useEffect(()=>{
    const interval = setInterval(async ()=>{
      try {
        const res = await fetch(`/api/envelopes?person=${tab}`)
        const data = await res.json()
        setState(prev => ({...prev, [tab]: data.filled}))
      } catch(e){}
    }, 15000)
    return ()=>clearInterval(interval)
  }, [tab])

  async function toggleEnv(p, n) {
    const arr = [...state[p]]
    const idx = arr.indexOf(n)
    if(idx>=0) arr.splice(idx,1)
    else arr.push(n)

    setState(prev=>({...prev,[p]:arr}))
    setSaving(true)
    try {
      await fetch('/api/envelopes',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({person:p, filled:arr})
      })
      popToast(idx>=0 ? `$${n} unchecked` : `$${n} marked filled ✦`)
    } catch(e){ popToast('Saved locally') }
    setSaving(false)
  }

  function calculate(p) {
    const cv = parseFloat(cashIn[p])||0
    const av = parseFloat(atmIn[p])||0
    const total = cv+av
    if(total<=0){ alert('Enter cash on hand and/or ATM amount!'); return }

    const filledSet = new Set(state[p])
    const open = []
    for(let i=1;i<=100;i++) if(!filledSet.has(i)) open.push(i)
    open.sort((a,b)=>a-b)

    let rem = total
    const toFill = []
    for(const n of open) { if(rem>=n){toFill.push(n);rem-=n} }

    const into = toFill.reduce((a,b)=>a+b,0)
    const leftover = total-into
    const totB = {20:0,10:0,5:0,1:0}
    toFill.forEach(n=>{ const b=billsFor(n); DENOMS.forEach(d=>totB[d]+=b[d]) })

    setPending(prev=>({...prev,[p]:toFill}))
    setResult(prev=>({...prev,[p]:{ total, toFill, into, leftover, totB, cashHand:cv, open }}))
  }

  async function submitFilled(p) {
    const toFill = pending[p]
    if(!toFill||toFill.length===0){ alert('Run the calculator first!'); return }
    const arr = [...state[p]]
    toFill.forEach(n=>{ if(!arr.includes(n)) arr.push(n) })
    setState(prev=>({...prev,[p]:arr}))
    setSaving(true)
    try {
      await fetch('/api/envelopes',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({person:p, filled:arr})
      })
      popToast(`${toFill.length} envelope${toFill.length>1?'s':''} saved to cloud ✦`)
    } catch(e){ popToast('Saved!') }
    setSaving(false)
    setPending(prev=>({...prev,[p]:[]}))
    setResult(prev=>({...prev,[p]:null}))
    setCashIn(prev=>({...prev,[p]:''}))
    setAtmIn(prev=>({...prev,[p]:''}))
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap');
        :root {
          --bg:#0e0c0a; --surface:#141210; --surface2:#1c1916; --surface3:#232019;
          --gold:#c9a84c; --gold-lt:#e2c47a; --gold-dim:#7a6530;
          --cream:#f0e8d8; --cream-dim:#b8ae9e;
          --border:#2a2520; --border-lt:#3d3730;
          --text:#ede5d8; --muted:#7a7268; --white:#faf7f2;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:var(--bg);color:var(--text);font-family:'Jost',sans-serif;font-weight:300;min-height:100vh;padding-bottom:80px;background-image:radial-gradient(ellipse 80% 40% at 50% -10%,rgba(201,168,76,0.07) 0%,transparent 70%)}
        .header{background:var(--surface);border-bottom:1px solid var(--border);padding:20px 24px 0;position:sticky;top:0;z-index:100}
        .eyebrow{font-size:10px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:var(--gold)}
        .app-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:var(--cream);letter-spacing:1px}
        .app-title em{font-style:italic;color:var(--gold-lt)}
        .gold-line{width:40px;height:1px;background:linear-gradient(90deg,var(--gold),transparent);margin:6px 0 14px}
        .tabs{display:flex;border-top:1px solid var(--border)}
        .tab-btn{flex:1;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--muted);font-family:'Jost',sans-serif;font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;padding:12px 0 13px;cursor:pointer;transition:color .2s,border-color .2s}
        .tab-btn.active{color:var(--gold-lt);border-bottom-color:var(--gold)}
        .tab-btn:hover:not(.active){color:var(--cream-dim)}
        .page{display:none;padding:22px 20px}
        .page.active{display:block}
        .hero{text-align:center;padding:28px 20px 16px;position:relative}
        .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 50%,rgba(201,168,76,0.06),transparent);pointer-events:none}
        .hero-amount{font-family:'Cormorant Garamond',serif;font-size:64px;font-weight:300;color:var(--gold-lt);line-height:1;letter-spacing:-1px}
        .hero-amount sup{font-size:28px;vertical-align:top;margin-top:10px;display:inline-block;color:var(--gold)}
        .hero-sub{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-top:6px}
        .loading-pulse{font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--gold-dim);text-align:center;padding:8px;letter-spacing:3px;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        .ornament{text-align:center;color:var(--gold-dim);font-size:12px;letter-spacing:6px;margin:6px 0 16px;opacity:.6}
        .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:2px;overflow:hidden;margin-bottom:20px}
        .stat-cell{background:var(--surface);padding:14px 10px;text-align:center}
        .stat-val{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:400;color:var(--gold-lt);line-height:1}
        .stat-val.cream{color:var(--cream)}
        .stat-val.muted{color:var(--cream-dim)}
        .stat-lbl{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-top:4px}
        .progress-wrap{margin-bottom:24px}
        .progress-meta{display:flex;justify-content:space-between;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
        .progress-meta span:last-child{color:var(--gold)}
        .progress-track{height:1px;background:var(--border-lt);position:relative}
        .progress-fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--gold-dim),var(--gold-lt));transition:width .6s cubic-bezier(.4,0,.2,1)}
        .progress-dot{position:absolute;top:50%;transform:translate(-50%,-50%);width:6px;height:6px;border-radius:50%;background:var(--gold-lt);box-shadow:0 0 8px var(--gold);transition:left .6s cubic-bezier(.4,0,.2,1)}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:2px;margin-bottom:16px;overflow:hidden}
        .card-head{padding:16px 18px 0;display:flex;align-items:baseline;gap:12px;margin-bottom:14px}
        .card-title{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:400;font-style:italic;color:var(--cream);letter-spacing:.5px}
        .card-rule{flex:1;height:1px;background:var(--border)}
        .card-body{padding:0 18px 18px}
        .input-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
        .field label{display:block;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
        .money-wrap{display:flex;align-items:stretch;border:1px solid var(--border-lt);border-radius:1px;background:var(--surface2);transition:border-color .2s}
        .money-wrap:focus-within{border-color:var(--gold-dim)}
        .money-sym{padding:0 10px;display:flex;align-items:center;font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--gold);border-right:1px solid var(--border)}
        input[type=number]{flex:1;border:none;outline:none;background:transparent;color:var(--cream);font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:300;padding:10px 10px;width:100%;-moz-appearance:textfield}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input::placeholder{color:var(--muted)}
        .btn-primary{width:100%;padding:14px;background:transparent;border:1px solid var(--gold-dim);color:var(--gold-lt);font-family:'Jost',sans-serif;font-size:10px;font-weight:500;letter-spacing:4px;text-transform:uppercase;cursor:pointer;transition:background .2s,border-color .2s,color .2s}
        .btn-primary:hover{background:var(--gold);border-color:var(--gold);color:var(--bg)}
        .btn-submit{width:100%;padding:14px;background:var(--gold);border:none;color:var(--bg);font-family:'Jost',sans-serif;font-size:10px;font-weight:600;letter-spacing:4px;text-transform:uppercase;cursor:pointer;margin-top:14px;transition:background .2s}
        .btn-submit:hover{background:var(--gold-lt)}
        .btn-submit:disabled{opacity:.5;cursor:not-allowed}
        .result-divider{height:1px;background:var(--border);margin:16px 0;position:relative}
        .result-divider::after{content:'✦';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--surface);color:var(--gold-dim);padding:0 8px;font-size:10px}
        .result-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
        .res-cell{background:var(--surface2);border:1px solid var(--border);padding:12px;border-radius:1px}
        .res-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
        .res-val{font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--cream)}
        .res-val.gold{color:var(--gold-lt)}
        .sec-eyebrow{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--gold-dim);margin-bottom:10px}
        .bill-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
        .b-chip{border:1px solid var(--gold-dim);border-radius:1px;padding:8px 14px;text-align:center;min-width:72px}
        .b-denom{font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--gold-lt);display:block}
        .b-qty{font-size:10px;color:var(--muted);letter-spacing:1px}
        .b-total{font-size:10px;color:var(--gold);font-weight:500}
        .env-list{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
        .env-row{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:1px;flex-wrap:wrap}
        .env-badge{font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--gold-lt);min-width:38px;border-right:1px solid var(--border);padding-right:10px}
        .env-arrow{color:var(--muted);font-size:11px}
        .env-tags{display:flex;flex-wrap:wrap;gap:4px}
        .bill-tag{font-size:10px;letter-spacing:1px;color:var(--cream-dim);background:var(--surface3);border:1px solid var(--border);border-radius:1px;padding:2px 7px}
        .leftover-note{padding:12px 14px;border:1px solid var(--gold-dim);border-radius:1px;background:rgba(201,168,76,.04);font-size:13px;color:var(--muted);margin-bottom:6px}
        .leftover-note strong{color:var(--gold);font-weight:400}
        .cash-tip{font-size:11px;color:var(--muted);font-style:italic;margin-top:8px;display:block}
        .grid-legend{display:flex;gap:16px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
        .leg-dot{width:8px;height:8px;display:inline-block;margin-right:5px;vertical-align:middle;border-radius:1px}
        .dot-done{background:var(--gold)}
        .dot-open{background:transparent;border:1px solid var(--border-lt)}
        .env-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px}
        .env-cell{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border:1px solid var(--border);border-radius:1px;font-size:9px;font-weight:400;letter-spacing:.5px;color:var(--muted);background:var(--surface2);position:relative;user-select:none;transition:border-color .15s,background .15s,transform .1s;-webkit-tap-highlight-color:transparent}
        .env-cell:active{transform:scale(0.88)}
        .env-cell:hover{border-color:var(--gold-dim);color:var(--cream-dim)}
        .env-cell.done{background:rgba(201,168,76,.1);border-color:var(--gold-dim);color:var(--gold-lt)}
        .ck{position:absolute;top:1px;right:2px;font-size:7px;color:var(--gold);opacity:0}
        .env-cell.done .ck{opacity:1}
        .sync-badge{display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:16px}
        .sync-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);box-shadow:0 0 6px var(--gold);animation:pulse 2s ease-in-out infinite}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:var(--gold);color:var(--bg);font-family:'Jost',sans-serif;font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;padding:12px 24px;border-radius:1px;transition:transform .3s cubic-bezier(.4,0,.2,1);z-index:9999;white-space:nowrap;pointer-events:none}
        .toast.show{transform:translateX(-50%) translateY(0)}
      `}</style>

      {/* HEADER */}
      <div className="header">
        <div className="eyebrow">Savings Journey</div>
        <div className="app-title">100 Envelope <em>Challenge</em></div>
        <div className="gold-line" />
        <div className="tabs">
          {PEOPLE.map(p=>(
            <button key={p} className={`tab-btn${tab===p?' active':''}`} onClick={()=>setTab(p)}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* PAGES */}
      {PEOPLE.map(p=>(
        <div key={p} className={`page${tab===p?' active':''}`}>
          {loading[p] ? (
            <div className="loading-pulse">Loading from cloud ✦</div>
          ) : (
            <PersonPage
              person={p}
              filled={state[p]}
              cashIn={cashIn[p]}
              atmIn={atmIn[p]}
              result={result[p]}
              saving={saving}
              onToggle={(n)=>toggleEnv(p,n)}
              onCashChange={(v)=>setCashIn(prev=>({...prev,[p]:v}))}
              onAtmChange={(v)=>setAtmIn(prev=>({...prev,[p]:v}))}
              onCalculate={()=>calculate(p)}
              onSubmit={()=>submitFilled(p)}
            />
          )}
        </div>
      ))}

      {/* TOAST */}
      <div className={`toast${showToast?' show':''}`}>{toast}</div>
    </>
  )
}

function PersonPage({ person, filled, cashIn, atmIn, result, saving, onToggle, onCashChange, onAtmChange, onCalculate, onSubmit }) {
  const { saved, needed, pct } = calcStats(filled)
  const filledSet = new Set(filled)

  const open = []
  for(let i=1;i<=100;i++) if(!filledSet.has(i)) open.push(i)
  open.sort((a,b)=>a-b)

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <div className="hero-amount"><sup>$</sup>{saved.toLocaleString()}</div>
        <div className="hero-sub">saved toward $5,050</div>
      </div>

      <div className="ornament">— ✦ —</div>

      {/* Sync badge */}
      <div className="sync-badge">
        <span className="sync-dot" />
        <span>Cloud synced — updates across all devices</span>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-cell">
          <div className="stat-val muted">${saved.toLocaleString()}</div>
          <div className="stat-lbl">Saved</div>
        </div>
        <div className="stat-cell">
          <div className="stat-val cream">${needed.toLocaleString()}</div>
          <div className="stat-lbl">Remaining</div>
        </div>
        <div className="stat-cell">
          <div className="stat-val">{filled.length}/100</div>
          <div className="stat-lbl">Filled</div>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-wrap">
        <div className="progress-meta">
          <span>Progress</span>
          <span>{pct.toFixed(1)}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{width:`${pct}%`}} />
          <div className="progress-dot" style={{left:`${pct}%`}} />
        </div>
      </div>

      {/* Calculator */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Cash Calculator</div>
          <div className="card-rule" />
        </div>
        <div className="card-body">
          <div className="input-pair">
            <div className="field">
              <label>Cash on Hand</label>
              <div className="money-wrap">
                <div className="money-sym">$</div>
                <input type="number" placeholder="0" min="0" value={cashIn} onChange={e=>onCashChange(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>ATM Withdrawal</label>
              <div className="money-wrap">
                <div className="money-sym">$</div>
                <input type="number" placeholder="0" min="0" value={atmIn} onChange={e=>onAtmChange(e.target.value)} />
              </div>
            </div>
          </div>
          <button className="btn-primary" onClick={onCalculate}>Calculate My Plan</button>

          {result && (
            <>
              <div className="result-divider" />
              <div className="result-grid">
                <div className="res-cell"><div className="res-label">Total Cash</div><div className="res-val gold">${result.total.toFixed(0)}</div></div>
                <div className="res-cell"><div className="res-label">Envelopes</div><div className="res-val">{result.toFill.length}</div></div>
                <div className="res-cell"><div className="res-label">Into Envelopes</div><div className="res-val">${result.into}</div></div>
                <div className="res-cell"><div className="res-label">Leftover</div><div className="res-val">${result.leftover.toFixed(0)}</div></div>
              </div>

              <div className="sec-eyebrow">Bills to Request from Teller / ATM</div>
              <div className="bill-chips">
                {result.toFill.length === 0
                  ? <span style={{color:'var(--muted)',fontSize:'12px'}}>Not enough for next open envelope (${open[0]||'?'}).</span>
                  : DENOMS.filter(d=>result.totB[d]>0).map(d=>(
                      <div key={d} className="b-chip">
                        <span className="b-denom">${d}</span>
                        <div className="b-qty">{result.totB[d]} bill{result.totB[d]>1?'s':''}</div>
                        <div className="b-total">= ${result.totB[d]*d}</div>
                      </div>
                    ))
                }
                {result.cashHand > 0 && result.toFill.length > 0 && (
                  <span className="cash-tip">Use your ${result.cashHand.toFixed(0)} cash first, then pull the rest from ATM.</span>
                )}
              </div>

              <div className="sec-eyebrow">Stuff Each Envelope With</div>
              <div className="env-list">
                {result.toFill.map(n=>{
                  const b = billsFor(n)
                  const tags = DENOMS.flatMap(d=>Array(b[d]).fill(d)).map((d,i)=>(
                    <span key={i} className="bill-tag">${d}</span>
                  ))
                  return (
                    <div key={n} className="env-row">
                      <div className="env-badge">${n}</div>
                      <span className="env-arrow">→</span>
                      <div className="env-tags">{tags}</div>
                    </div>
                  )
                })}
              </div>

              {result.leftover > 0 && result.toFill.length > 0 && (
                <div className="leftover-note">
                  <strong>${result.leftover.toFixed(0)} remaining</strong>
                  {open[result.toFill.length] ? ` — not enough for the $${open[result.toFill.length]} envelope.` : ''} Set aside for next time.
                </div>
              )}

              <button className="btn-submit" onClick={onSubmit} disabled={saving}>
                {saving ? 'Saving...' : '✦ Mark as Filled & Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Envelope Grid */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Your Envelopes</div>
          <div className="card-rule" />
        </div>
        <div className="card-body">
          <div className="grid-legend">
            <span><span className="leg-dot dot-done" />Filled</span>
            <span><span className="leg-dot dot-open" />Open — tap to toggle</span>
          </div>
          <div className="env-grid">
            {Array.from({length:100},(_,i)=>i+1).map(n=>(
              <div
                key={n}
                className={`env-cell${filledSet.has(n)?' done':''}`}
                onClick={()=>onToggle(n)}
              >
                <span className="ck">✦</span>
                <span>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
