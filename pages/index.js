import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { CRISIL, HIST, ZB27_CACHE, PROJECTS, OM_PROJECTS, OB } from '../lib/constants';

// ── Helpers ──────────────────────────────────────────────────────────────────
const C = (v, d = 2) => v == null ? '—' : `₹${Number(v).toFixed(d)} Cr`;
const P = (v, d = 2) => v == null ? '—' : `${Number(v).toFixed(d)}%`;
const X = (v, d = 2) => v == null ? '—' : `${Number(v).toFixed(d)}x`;
const sN = (v, fb = 0) => (typeof v === 'number' && !isNaN(v)) ? v : fb;

function statusColor(val, trigger, dir) {
  const good = dir === 'up' ? val >= trigger : val <= trigger;
  const warn = dir === 'up' ? val >= trigger * 0.85 : val <= trigger * 1.15;
  if (good) return 'var(--g)';
  if (warn) return 'var(--a)';
  return 'var(--r)';
}
function statusTag(val, trigger, dir) {
  const good = dir === 'up' ? val >= trigger : val <= trigger;
  const warn = dir === 'up' ? val >= trigger * 0.85 : val <= trigger * 1.15;
  if (good) return 'tg tg-g';
  if (warn) return 'tg tg-a';
  return 'tg tg-r';
}
function statusLabel(val, trigger, dir) {
  const good = dir === 'up' ? val >= trigger : val <= trigger;
  const warn = dir === 'up' ? val >= trigger * 0.85 : val <= trigger * 1.15;
  if (good) return '✓ On track';
  if (warn) return '⚠ Watch';
  return '✗ Below trigger';
}

// ── Modal Content Registry ────────────────────────────────────────────────────
function modalContent(key, d) {
  const z = d;
  const modals = {
    revenue: {
      t: 'Revenue from Operations',
      s: 'ZB P&L Account 3-01 — Operating Income',
      body: () => (
        <div>
          <div className="g3" style={{ marginBottom: 14 }}>
            <div className="mc"><div className="mc-l">FY27 YTD</div><div className="mc-v">{C(z.rev)}</div></div>
            <div className="mc"><div className="mc-l">FY26 Full Year</div><div className="mc-v">{C(HIST.FY26.rev)}</div></div>
            <div className="mc"><div className="mc-l">FY25 Full Year</div><div className="mc-v">{C(HIST.FY25.rev)}</div></div>
          </div>
          <div className="nb">Revenue = Total Operating Income (account 3-01). Discount line (₹0.0002 Cr) included. COGS and Op.Exp are deducted to arrive at Gross Profit — not added.</div>
          <table className="tbl"><thead><tr><th>FY</th><th>Revenue</th><th>YoY Growth</th></tr></thead>
          <tbody>
            <tr><td>FY24</td><td>{C(HIST.FY24.rev)}</td><td>—</td></tr>
            <tr><td>FY25</td><td>{C(HIST.FY25.rev)}</td><td className="up">+201.4%</td></tr>
            <tr><td>FY26</td><td>{C(HIST.FY26.rev)}</td><td className="up">+202.6%</td></tr>
            <tr className="tot"><td>FY27 YTD</td><td>{C(z.rev)}</td><td>—</td></tr>
          </tbody></table>
        </div>
      ),
    },
    ebitda: {
      t: 'EBITDA — Earnings Before Interest, Tax, Depreciation & Amortisation',
      s: 'Computed: Operating Profit + Finance Costs',
      body: () => (
        <div>
          <div className="g4" style={{ marginBottom: 14 }}>
            <div className="mc"><div className="mc-l">EBITDA</div><div className="mc-v">{C(z.ebitda)}</div></div>
            <div className="mc"><div className="mc-l">EBITDA Margin</div><div className="mc-v" style={{ color: statusColor(sN(z.ebitdaM, z.ebitda_m), 22, 'up') }}>{P(z.ebitdaM || z.ebitda_m)}</div></div>
            <div className="mc"><div className="mc-l">CRISIL Trigger</div><div className="mc-v">&gt;22%</div><div className="mc-s">Upgrade condition</div></div>
            <div className="mc"><div className="mc-l">Gap to trigger</div><div className="mc-v wa">{P(22 - sN(z.ebitdaM || z.ebitda_m, 18.21))} below</div></div>
          </div>
          <div className="alrt amber"><div className="alrt-dot"/><div className="alrt-b"><strong>EBITDA margin below CRISIL upgrade trigger of 22%.</strong><br/>Current {P(z.ebitdaM || z.ebitda_m)} vs FY26 {P(HIST.FY26.ebitdaM)}. CRISIL expects margins to stabilise at 20-22% over medium term per latest rating rationale.</div></div>
          <table className="tbl"><thead><tr><th>FY</th><th>Revenue</th><th>EBITDA</th><th>Margin</th></tr></thead>
          <tbody>
            <tr><td>FY24</td><td>{C(HIST.FY24.rev)}</td><td>{C(HIST.FY24.ebitda)}</td><td>{P(HIST.FY24.ebitdaM)}</td></tr>
            <tr><td>FY25</td><td>{C(HIST.FY25.rev)}</td><td>{C(HIST.FY25.ebitda)}</td><td>{P(HIST.FY25.ebitdaM)}</td></tr>
            <tr><td>FY26</td><td>{C(HIST.FY26.rev)}</td><td>{C(HIST.FY26.ebitda)}</td><td>{P(HIST.FY26.ebitdaM)}</td></tr>
            <tr className="tot"><td>FY27 YTD</td><td>{C(z.rev)}</td><td>{C(z.ebitda)}</td><td>{P(z.ebitdaM || z.ebitda_m)}</td></tr>
          </tbody></table>
        </div>
      ),
    },
    nw: {
      t: 'Net Worth — Total Equity',
      s: 'Share Capital + Securities Premium + Retained Earnings + Current Year Earnings',
      body: () => (
        <div>
          <div className="g4" style={{ marginBottom: 14 }}>
            <div className="mc"><div className="mc-l">Share Capital</div><div className="mc-v">{C(z.share_cap || z.shareCap)}</div></div>
            <div className="mc"><div className="mc-l">Securities Premium</div><div className="mc-v">{C(z.sec_prem || z.secPrem)}</div></div>
            <div className="mc"><div className="mc-l">Retained Earnings</div><div className="mc-v">{C(z.retained)}</div></div>
            <div className="mc"><div className="mc-l">Current Year P&L</div><div className="mc-v">{C(z.curr_earn || z.currEarn)}</div></div>
          </div>
          <div className="split"><div className="split-a"><div className="split-l">Total Net Worth</div><div className="split-v">{C(z.nw)}</div></div>
          <div className="split-b"><div className="split-l">FY26 Net Worth</div><div className="split-v">{C(HIST.FY26.nw)}</div></div></div>
        </div>
      ),
    },
    ob: {
      t: 'Order Book',
      s: 'Source: Order_Book.xlsx — as of Apr 2026',
      body: () => (
        <div>
          <div className="g4" style={{ marginBottom: 14 }}>
            <div className="mc"><div className="mc-l">Total Order Book</div><div className="mc-v">{C(OB.total)}</div></div>
            <div className="mc"><div className="mc-l">Active EPC</div><div className="mc-v">{C(OB.active)}</div></div>
            <div className="mc"><div className="mc-l">Govt BESS (RVUNL+NTPC)</div><div className="mc-v">{C(OB.govt)}</div></div>
            <div className="mc"><div className="mc-l">Total DC Capacity</div><div className="mc-v">{OB.dcMwp} MWp</div></div>
          </div>
          <table className="tbl"><thead><tr><th>Project</th><th>Location</th><th>DC (MWp)</th><th>BESS (MWh)</th><th>Value (Cr)</th><th>Segment</th></tr></thead>
          <tbody>{PROJECTS.filter(p => !p.govtOnly).map(p => (
            <tr key={p.id}><td>{p.nm}</td><td>{p.loc}</td><td>{p.dc || '—'}</td><td>{p.bess || '—'}</td><td>{C(p.val)}</td><td><span className={`tg tg-${p.seg === 'bess' ? 'p' : p.seg === 'parks' ? 'b' : 'g'}`}>{p.seg.toUpperCase()}</span></td></tr>
          ))}</tbody></table>
        </div>
      ),
    },
    bs: {
      t: 'Balance Sheet Summary',
      s: 'ZB Balance Sheet — as of period end',
      body: () => (
        <div>
          <div className="g2" style={{ marginBottom: 14 }}>
            <div className="card"><div className="sh">Assets</div>
              {[['Trade Receivables', C(z.rec)], ['Advance to Creditors', C(z.adv_cred || z.advCred)], ['Fixed Deposits', C(z.fdr)], ['Inventories', C(z.inventory)], ['CWIP', C(z.cwip)], ['Intangibles UDev', C(z.intang_udev || z.intangUdev)], ['Net Fixed Assets', C(z.fixed_assets || z.fixedAssets)], ['Total Current Assets', C(z.total_cur_assets || z.totalCurAssets)], ['Total Assets', C(z.total_assets || z.totalAssets)]].map(([k,v]) => (
                <div className="rr" key={k}><span className="rn">{k}</span><span className="rv">{v}</span></div>
              ))}
            </div>
            <div className="card"><div className="sh">Liabilities & Equity</div>
              {[['Trade Payables', C(z.trade_pay || z.tradePay)], ['Advance from Debtors', C(z.adv_debtor || z.advDebtor)], ['GST Payable', C(z.gst_pay || z.gstPay)], ['Statutory Liabilities', C(z.stat_liab || z.statLiab)], ['Retention Money', C(z.ret_money || z.retMoney)], ['Secured Loan (CC drawn)', C(z.cc_drawn || z.ccDrawn)], ['Total Current Liab.', C(z.total_cur_liab || z.totalCurLiab)], ['Total Liabilities', C(z.total_liab || z.totalLiab)], ['Net Worth', C(z.nw)]].map(([k,v]) => (
                <div className="rr" key={k}><span className="rn">{k}</span><span className="rv">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  };
  return modals[key] || null;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RPELDLD() {
  const [tab, setTab] = useState('ov');
  const [seg, setSeg] = useState('all');
  const [fy, setFy] = useState('27');
  const [period, setPeriod] = useState('annual');
  const [data, setData] = useState(ZB27_CACHE);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [status, setStatus] = useState({ text: 'Cached: ZB Excel Apr 2026', cls: 'pa' });
  const chartsRef = useRef({});

  const pLabel = () => {
    const p = { annual: 'Full Year', q1: 'Q1 Apr–Jun', q2: 'Q2 Jul–Sep', q3: 'Q3 Oct–Dec', q4: 'Q4 Jan–Mar' };
    return `FY${fy} ${p[period] || period}`;
  };

  const fetchLive = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setStatus({ text: 'Fetching from Zoho Books…', cls: 'pa' });
    try {
      const res = await fetch('/api/financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fy, period, segment: seg }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        const d = { ...ZB27_CACHE, ...json.data, isLive: true, fetchedAt: new Date().toLocaleString('en-IN') };
        setData(d);
        setStatus({ text: `✓ Live — ${d.fetchedAt}`, cls: 'pg' });
      } else {
        throw new Error(json.error || 'API error');
      }
    } catch (e) {
      setStatus({ text: `Cached (fetch failed: ${e.message.slice(0, 40)})`, cls: 'pa' });
    } finally {
      setLoading(false);
    }
  }, [fy, period, seg, loading]);

  const d = data;
  const ebitdaM = sN(d.ebitdaM || d.ebitda_m, 18.21);
  const patM = sN(d.patM || d.pat_m, 17.93);
  const gearing = sN(d.gearing, 0.2637);
  const cr = sN(d.cr, 1.65);
  const ic = sN(d.ic, 63.2);
  const nca = sN(d.pat, 24.17);
  const nw = sN(d.nw, 203.36);
  const rec = sN(d.rec, 88.64);
  const ccDrawn = sN(d.cc_drawn || d.ccDrawn, 52.01);
  const totalAssets = sN(d.total_assets || d.totalAssets, 383.19);
  const debt = sN(d.debt, 53.62);
  const debtorDays = sN(d.debtor_days || d.debtorDays, 67);
  const roce = d.nw ? Math.round((sN(d.ebit || d.ebit_m * d.rev / 100, 24.16)) / (totalAssets - sN(d.total_liab || d.totalLiab, 179.78)) * 100 * 10) / 10 : 11.9;
  const roe = d.nw ? Math.round(sN(d.pat, 24.17) / nw * 100 * 10) / 10 : 11.9;

  // ── Tab: Overview ──────────────────────────────────────────────────────────
  const TabOv = () => (
    <div>
      <div className="sh">Key performance — {pLabel()} <span className="pill pp" style={{ fontSize: 9 }}>ZB Live</span></div>
      <div className="g4">
        {[
          ['Revenue', C(d.rev), 'Account 3-01 Operating Income', null, null, 'revenue'],
          ['Gross Profit', C(d.gp), P(d.gp_m || d.gpM) + ' GP margin', null, null, 'revenue'],
          ['EBITDA', C(d.ebitda), P(ebitdaM) + ' margin', ebitdaM >= 22 ? '✓ Above CRISIL trigger' : '⚠ Below 22% trigger', ebitdaM >= 22 ? 'up' : 'wa', 'ebitda'],
          ['PAT', C(d.pat), P(patM) + ' margin', null, null, 'ebitda'],
        ].map(([lbl, val, sub, delta, dcls, mk]) => (
          <div key={lbl} className="mc ck" onClick={() => setModal(mk)}>
            <span className="mc-i">🔍</span>
            <div className="mc-l">{lbl}</div>
            <div className="mc-v">{val}</div>
            {sub && <div className="mc-s">{sub}</div>}
            {delta && <div className={`mc-d ${dcls}`}>{delta}</div>}
          </div>
        ))}
      </div>
      <div className="g4">
        {[
          ['Net Worth', C(nw), 'Total equity', `FY26: ${C(HIST.FY26.nw)}`, '', 'nw'],
          ['NCA (≈PAT)', C(nca), '~PAT · CRISIL trigger >₹37 Cr', nca >= 37 ? '✓ Above trigger' : '⚠ Below ₹37 Cr', nca >= 37 ? 'up' : 'wa', 'ebitda'],
          ['ROCE', P(roce, 1), 'Return on Capital Employed', roce >= 20 ? '✓ Above 20%' : '⚠ Below 20%', roce >= 20 ? 'up' : 'wa', 'nw'],
          ['ROE', P(roe, 1), 'Return on Equity', roe >= 15 ? '✓ Above 15%' : '⚠ Below 15%', roe >= 15 ? 'up' : 'wa', 'nw'],
        ].map(([lbl, val, sub, delta, dcls, mk]) => (
          <div key={lbl} className="mc ck" onClick={() => setModal(mk)}>
            <span className="mc-i">🔍</span>
            <div className="mc-l">{lbl}</div>
            <div className="mc-v">{val}</div>
            {sub && <div className="mc-s">{sub}</div>}
            {delta && <div className={`mc-d ${dcls}`}>{delta}</div>}
          </div>
        ))}
      </div>
      <div className="g4">
        {[
          ['Trade Receivables', C(rec), 'ZB Balance Sheet', null, null, 'bs'],
          ['Advance to Creditors', C(d.adv_cred || d.advCred), 'Supplier advances — watch', null, 'wa', 'bs'],
          ['CWIP', C(d.cwip), 'Capital Work in Progress', null, null, 'bs'],
          ['Total Assets', C(totalAssets), 'ZB Balance Sheet total', null, null, 'bs'],
        ].map(([lbl, val, sub, delta, dcls, mk]) => (
          <div key={lbl} className="mc ck" onClick={() => setModal(mk)}>
            <span className="mc-i">🔍</span>
            <div className="mc-l">{lbl}</div>
            <div className="mc-v">{val}</div>
            {sub && <div className="mc-s">{sub}</div>}
            {delta && <div className={`mc-d ${dcls || ''}`}>{delta}</div>}
          </div>
        ))}
      </div>
      <div className="sh">FY27 vs FY26 CRISIL snapshot <span className="pill pp" style={{ fontSize: 9 }}>Actuals vs Audited</span></div>
      <div className="g2">
        <div className="card">
          {[['Revenue', `${C(d.rev)} vs ${C(HIST.FY26.rev)} FY26`], ['EBITDA margin', `${P(ebitdaM)} vs ${P(HIST.FY26.ebitdaM)} FY26`], ['PAT margin', `${P(patM)} vs ${P(HIST.FY26.patM)} FY26`], ['CRISIL EBITDA trigger', '>22% — currently ' + P(ebitdaM)]].map(([k, v]) => (
            <div className="rr" key={k}><span className="rn">{k}</span><span className="rv">{v}</span></div>
          ))}
        </div>
        <div className="card">
          {[['Net Worth', `${C(nw)} vs ${C(HIST.FY26.nw)} FY26`], ['Gearing', `${gearing.toFixed(2)}x vs ${HIST.FY26.gearing}x FY26`], ['Interest Coverage', `${ic.toFixed(1)}x vs ${HIST.FY26.ic}x FY26`], ['Current Ratio', `${cr.toFixed(2)}x vs ${HIST.FY26.cr}x FY26`]].map(([k, v]) => (
            <div className="rr" key={k}><span className="rn">{k}</span><span className="rv">{v}</span></div>
          ))}
        </div>
      </div>
      <div className="g2">
        <div className="card ck" onClick={() => setModal('ob')}>
          <div className="sh">Order book <span className="pill pp" style={{ fontSize: 9 }}>🔍 From Order_Book.xlsx</span></div>
          {[['Total order book', `₹${OB.total} Cr`], ['Active EPC', `₹${OB.active} Cr`], ['Govt BESS (RVUNL+NTPC)', `₹${OB.govt} Cr`], ['Total DC capacity', `${OB.dcMwp} MWp`]].map(([k, v]) => (
            <div className="rr" key={k}><span className="rn">{k}</span><span className="rv">{v}</span></div>
          ))}
        </div>
        <div className="card">
          <div className="sh">CRISIL rating status</div>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 400, color: 'var(--g)', lineHeight: 1 }}>BBB / Stable</div>
            <div style={{ fontSize: 12, color: 'var(--mt)', marginTop: 6 }}>Upgraded from BBB− · Sep 2025 → Jun 2026</div>
            <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 4 }}>₹75 Cr facility · Indian Overseas Bank</div>
          </div>
          <div className="alrt amber" style={{ marginTop: 8 }}><div className="alrt-dot"/><div className="alrt-b"><strong>Next upgrade watch:</strong> EBITDA &gt;22% sustained + NCA &gt;₹120 Cr</div></div>
        </div>
      </div>
    </div>
  );

  // ── Tab: Financials ────────────────────────────────────────────────────────
  const TabFi = () => (
    <div>
      <div className="sh">Profit & Loss — {pLabel()}</div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Line item</th><th>ZB Account</th><th>FY27 YTD</th><th>FY26</th><th>FY25</th><th>% Rev</th></tr></thead>
            <tbody>
              {[
                ['Revenue from operations', '3-01', d.rev, HIST.FY26.rev, HIST.FY25.rev, true],
                ['Total COGS', '4-01+Mod+MMS+4-02', d.cogs, null, null, false],
                ['  └ Main COGS (4-01)', '4-01', d.cogs_main, null, null, false],
                ['  └ Modules', '', d.modules, null, null, false],
                ['  └ MMS', '11', d.mms, null, null, false],
                ['  └ Op.Exp COGS', '4-02', d.cogs_opex, null, null, false],
                ['Gross Profit', '', d.gp, null, null, true],
                ['Admin Expenses', '4-06', d.admin, null, null, false],
                ['Employee Benefits', '4-03', d.emp_ben, null, null, false],
                ['Finance Costs', '4-04', d.fin, null, null, false],
                ['EBIT (Operating Profit)', '', d.ebit, null, null, true],
                ['EBITDA', '', d.ebitda, HIST.FY26.ebitda, HIST.FY25.ebitda, true],
                ['Net Profit / PAT', '', d.pat, HIST.FY26.pat, HIST.FY25.pat, true],
              ].map(([nm, ac, v, v26, v25, bold]) => (
                <tr key={nm} className={bold ? 'tot' : ''}>
                  <td style={{ fontWeight: bold ? 600 : 400 }}>{nm}</td>
                  <td style={{ color: 'var(--ht)', fontSize: 10 }}>{ac}</td>
                  <td><strong>{C(v)}</strong></td>
                  <td>{v26 != null ? C(v26) : '—'}</td>
                  <td>{v25 != null ? C(v25) : '—'}</td>
                  <td style={{ color: 'var(--mt)' }}>{v && d.rev ? P(v / d.rev * 100) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="sh">Margin summary</div>
      <div className="g4">
        {[['Gross Margin', d.gp_m || d.gpM, 'GP / Revenue', null, null],
          ['EBITDA Margin', ebitdaM, 'EBITDA / Revenue', '>22% CRISIL trigger', 22],
          ['EBIT Margin', d.ebit_m || d.ebitM, 'EBIT / Revenue', null, null],
          ['PAT Margin', patM, 'PAT / Revenue', '>15% CRISIL preferred', 15],
        ].map(([lbl, val, sub, note, trig]) => (
          <div key={lbl} className="mc ck" onClick={() => setModal('ebitda')}>
            <div className="mc-l">{lbl}</div>
            <div className="mc-v" style={{ color: trig ? statusColor(sN(val), trig, 'up') : 'var(--tx)' }}>{P(val)}</div>
            <div className="mc-s">{sub}</div>
            {note && <div className={`mc-d ${sN(val) >= (trig || 0) ? 'up' : 'wa'}`}>{note}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Tab: Ratios ────────────────────────────────────────────────────────────
  const TabRa = () => {
    const gauges = [
      { key: 'ebitdaMargin', val: ebitdaM, max: 35 },
      { key: 'nca', val: nca, max: 150 },
      { key: 'interestCover', val: ic, max: 80 },
      { key: 'gearing', val: gearing, max: 2 },
      { key: 'currentRatio', val: cr, max: 5 },
      { key: 'debtorDays', val: debtorDays, max: 200 },
      { key: 'patMargin', val: patM, max: 35 },
      { key: 'roce', val: roce, max: 80 },
      { key: 'roe', val: roe, max: 80 },
      { key: 'debtEbitda', val: debt / sN(d.ebitda, 24.55), max: 5 },
    ];
    return (
      <div>
        <div className="sh">CRISIL ratio scorecard — {pLabel()} <span className="pill pp" style={{ fontSize: 9 }}>Benchmarks from CRISIL documents only</span></div>
        <div className="g4" style={{ marginBottom: 14 }}>
          {gauges.map(({ key, val, max }) => {
            const c = CRISIL[key];
            if (!c) return null;
            const pct = Math.min(100, Math.max(0, (val / max) * 100));
            const tPct = Math.min(100, Math.max(0, (c.trigger / max) * 100));
            const col = statusColor(val, c.trigger, c.dir);
            return (
              <div key={key} className="gc">
                <div className="gc-l">{c.label}</div>
                <div className="gc-v" style={{ color: col }}>{val.toFixed(c.unit === 'd' ? 0 : 2)}{c.unit}</div>
                <div className="gc-bar">
                  <div className="gc-fill" style={{ width: `${pct}%`, background: col }}/>
                  <div className="gc-marker" style={{ left: `${tPct}%` }}/>
                </div>
                <div className="gc-foot">
                  <span>{c.dir === 'up' ? 'Min' : 'Max'} {c.trigger}{c.unit}</span>
                  <span className={`tg ${statusTag(val, c.trigger, c.dir)}`}>{statusLabel(val, c.trigger, c.dir)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="sh">Historical ratio table</div>
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Metric</th><th>FY24</th><th>FY25</th><th>FY26</th><th>FY27 YTD</th><th>CRISIL Benchmark</th></tr></thead>
              <tbody>
                {[
                  ['EBITDA Margin', P(HIST.FY24.ebitdaM), P(HIST.FY25.ebitdaM), P(HIST.FY26.ebitdaM), P(ebitdaM), '>22%'],
                  ['PAT Margin', P(HIST.FY24.patM), P(HIST.FY25.patM), P(HIST.FY26.patM), P(patM), '>15%'],
                  ['NCA (₹ Cr)', C(HIST.FY24.nca), C(HIST.FY25.nca), C(HIST.FY26.nca), C(nca), '>₹37 Cr'],
                  ['Interest Coverage', X(HIST.FY24.ic), X(HIST.FY25.ic), X(HIST.FY26.ic), X(ic), '>5x'],
                  ['Gearing', X(HIST.FY24.gearing), X(HIST.FY25.gearing), X(HIST.FY26.gearing), X(gearing), '<1.0x'],
                  ['Current Ratio', X(HIST.FY24.cr), X(HIST.FY25.cr), X(HIST.FY26.cr), X(cr), '>1.2x'],
                  ['Debtor Days', `${HIST.FY24.debtorDays}d`, `${HIST.FY25.debtorDays}d`, `${HIST.FY26.debtorDays}d`, `${debtorDays.toFixed(0)}d`, '<90 days'],
                ].map(([metric, ...vals]) => (
                  <tr key={metric}><td>{metric}</td>{vals.map((v, i) => <td key={i}>{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── Tab: Operations ────────────────────────────────────────────────────────
  const TabOp = () => {
    const banks = d.banks || ZB27_CACHE.banks;
    return (
      <div>
        <div className="sh">Equity breakdown</div>
        <div className="g4">
          {[['Share Capital', C(d.share_cap || d.shareCap)], ['Securities Premium', C(d.sec_prem || d.secPrem)], ['Retained Earnings', C(d.retained)], ['Current Year P&L', C(d.curr_earn || d.currEarn)]].map(([k, v]) => (
            <div key={k} className="mc"><div className="mc-l">{k}</div><div className="mc-v">{v}</div></div>
          ))}
        </div>
        <div className="sh">Working capital components</div>
        <div className="g4">
          {[
            ['Trade Receivables', C(d.rec || rec), 'Debtors', 'tg-a'],
            ['Advance to Creditors', C(d.adv_cred || d.advCred), 'Supplier advances', 'tg-a'],
            ['Inventories', C(d.inventory), 'Project material + inventory', 'tg-b'],
            ['Trade Payables', C(d.trade_pay || d.tradePay), 'Creditors', 'tg-g'],
            ['Advance from Debtors', C(d.adv_debtor || d.advDebtor), 'Customer advances', 'tg-g'],
            ['GST Payable', C(d.gst_pay || d.gstPay), 'Net GST liability', 'tg-a'],
            ['Statutory Liabilities', C(d.stat_liab || d.statLiab), 'TDS, PF, ESI etc.', 'tg-a'],
            ['Retention Money', C(d.ret_money || d.retMoney), 'Payable on completion', 'tg-b'],
          ].map(([lbl, val, sub, tc]) => (
            <div key={lbl} className="mc"><div className="mc-l">{lbl}</div><div className="mc-v">{val}</div><div className="mc-s">{sub}</div></div>
          ))}
        </div>
        <div className="sh">Cash flow — {pLabel()}</div>
        <div className="g4">
          {[
            ['Beginning Cash', C(d.beg_cf || d.begCF), 'Period opening', d.beg_cf < 0 ? 'dn' : 'up'],
            ['Operating CF', C(d.op_cf || d.opCF), 'From operations', (d.op_cf || d.opCF) >= 0 ? 'up' : 'dn'],
            ['Investing CF', C(d.inv_cf || d.invCF), 'CWIP + PPE capex', 'wa'],
            ['Ending Cash', C(d.end_cf || d.endCF), 'Period closing', d.end_cf < 0 ? 'dn' : 'up'],
          ].map(([lbl, val, sub, cls]) => (
            <div key={lbl} className="mc"><div className="mc-l">{lbl}</div><div className={`mc-v ${cls}`}>{val}</div><div className="mc-s">{sub}</div></div>
          ))}
        </div>
        <div className="sh">Bank accounts — live positions</div>
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Bank / Account</th><th>Account No.</th><th>Type</th><th>Balance (Cr)</th><th>Status</th></tr></thead>
            <tbody>{banks.map((b, i) => (
              <tr key={i}>
                <td>{b.name}</td>
                <td className="font-mono" style={{ fontSize: 11 }}>{b.num}</td>
                <td><span className={`tg ${b.type === 'cc' ? 'tg-r' : b.type === 'od' ? 'tg-a' : 'tg-b'}`}>{b.type?.toUpperCase()}</span></td>
                <td style={{ color: b.bal < 0 ? 'var(--r)' : 'var(--g)', fontWeight: 600 }}>{C(Math.abs(b.bal))}</td>
                <td><span className={`tg ${b.bal < 0 ? 'tg-r' : 'tg-g'}`}>{b.bal < 0 ? 'Drawn' : 'Credit'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="sh">CWIP & intangibles</div>
        <div className="g4">
          {[['CWIP', C(d.cwip), 'Solar parks under construction', 'wa'], ['Intangibles UDev', C(d.intang_udev || d.intangUdev), 'Dev rights + software', 'wa'], ['Net Fixed Assets', C(d.fixed_assets || d.fixedAssets), 'PPE net of depreciation', ''], ['FDRs', C(d.fdr), 'Fixed deposits (incl. pledged BGs)', '']].map(([lbl, val, sub, cls]) => (
            <div key={lbl} className="mc"><div className="mc-l">{lbl}</div><div className={`mc-v ${cls}`}>{val}</div><div className="mc-s">{sub}</div></div>
          ))}
        </div>
      </div>
    );
  };

  // ── Tab: Projects ──────────────────────────────────────────────────────────
  const TabPr = () => {
    const segFilter = seg === 'all' ? PROJECTS : PROJECTS.filter(p => seg === 'bess' ? p.hasBESS : p.seg === seg);
    const fyFilter = fy === '24' ? [] : fy === '26' ? segFilter.filter(p => p.introFY === '26') : segFilter;
    return (
      <div>
        <div className="sh">Active projects & parks — {pLabel()} <span className="pill pp" style={{ fontSize: 9 }}>Segment: {seg.toUpperCase()}</span></div>
        {fy === '24' && <div className="nb">No projects on record for FY24 period — order book began FY26.</div>}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>#</th><th>Project</th><th>Location</th><th>DC (MWp)</th><th>BESS (MWh)</th><th>Value</th><th>Segment</th><th>FY Added</th></tr></thead>
              <tbody>{fyFilter.map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--ht)' }}>{p.id}</td>
                  <td style={{ fontWeight: 500 }}>{p.nm}</td>
                  <td>{p.loc}</td>
                  <td>{p.dc || '—'}</td>
                  <td>{p.bess || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{C(p.val)}</td>
                  <td><span className={`tg ${p.govtOnly ? 'tg-b' : p.hasBESS ? 'tg-p' : p.seg === 'parks' ? 'tg-b' : 'tg-g'}`}>{p.govtOnly ? 'GOVT' : p.seg.toUpperCase()}</span></td>
                  <td>FY{p.introFY}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="tot"><td colSpan={3}>Total ({fyFilter.length} projects)</td><td>{fyFilter.reduce((a, p) => a + p.dc, 0).toFixed(1)}</td><td>{fyFilter.reduce((a, p) => a + p.bess, 0).toFixed(0)}</td><td>{C(fyFilter.reduce((a, p) => a + p.val, 0))}</td><td colSpan={2}/></tr></tfoot>
            </table>
          </div>
        </div>
        <div className="sh">O&M portfolio — {OM_PROJECTS.length} completed sites</div>
        <div className="g4">
          {OM_PROJECTS.map(p => (
            <div key={p.nm} className="mc">
              <div className="mc-l">{p.nm}</div>
              <div className="mc-v" style={{ fontSize: 14 }}>{p.mw}</div>
              <div className="mc-s">~{p.annualUnits} lakh units/yr</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Tab: Clients ───────────────────────────────────────────────────────────
  const TabCl = () => {
    const clients = d.top_clients || d.tc || ZB27_CACHE.tc || [];
    return (
      <div>
        <div className="sh">Top clients — {pLabel()} <span className="pill pp" style={{ fontSize: 9 }}>Live from ZB Sales by Customer</span></div>
        <div className="card" style={{ marginBottom: 14 }}>
          <table className="tbl">
            <thead><tr><th>Client</th><th>Sector</th><th>Billed (Cr)</th><th>Outstanding (Cr)</th><th>% of Revenue</th><th>Segment</th></tr></thead>
            <tbody>{clients.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{c.nm || c.name}</td>
                <td>{c.sector || c.s || '—'}</td>
                <td>{C(c.billed || c.b)}</td>
                <td style={{ color: (c.outstanding || c.o) > 0 ? 'var(--a)' : 'var(--g)', fontWeight: 600 }}>{C(c.outstanding || c.o)}</td>
                <td>{d.rev ? P((c.billed || c.b) / d.rev * 100) : '—'}</td>
                <td><span className={`tg tg-${(c.seg || c.segment) === 'bess' ? 'p' : (c.seg || c.segment) === 'om' ? 'b' : 'g'}`}>{((c.seg || c.segment) || 'epc').toUpperCase()}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="sh">Receivables health — {pLabel()}</div>
        <div className="g4">
          {(() => {
            const totalOutstanding = (d.top_clients || []).reduce((s, c) => s + sN(c.outstanding), 0);
            const totalBilled      = (d.top_clients || []).reduce((s, c) => s + sN(c.billed), 0);
            const collectionPct    = totalBilled > 0 ? Math.round((totalBilled - totalOutstanding) / totalBilled * 100) : 0;
            const dDays            = sN(d.debtor_days || d.debtorDays, 67);
            const top1Pct          = d.rev && (d.top_clients || [])[0] ? Math.round(sN((d.top_clients || [])[0].billed) / d.rev * 100) : 0;
            const top3Pct          = d.rev ? Math.round((d.top_clients || []).slice(0,3).reduce((s,c) => s + sN(c.billed), 0) / d.rev * 100) : 0;
            return [
              { lbl: 'Total Outstanding', val: C(totalOutstanding), sub: 'Live from ZB customer balances', cls: totalOutstanding > 100 ? 'wa' : '' },
              { lbl: 'Debtor Days', val: `${dDays}d`, sub: `CRISIL trigger <90d`, cls: dDays <= 90 ? 'up' : 'wa' },
              { lbl: 'Top Client Concentration', val: `${top1Pct}%`, sub: `${(d.top_clients||[])[0]?.nm?.split(' ')[0] || '—'} of revenue`, cls: top1Pct > 30 ? 'wa' : '' },
              { lbl: 'Top 3 Concentration', val: `${top3Pct}%`, sub: 'Top 3 clients of revenue', cls: top3Pct > 60 ? 'wa' : '' },
            ].map(({ lbl, val, sub, cls }) => (
              <div key={lbl} className="mc">
                <div className="mc-l">{lbl}</div>
                <div className={`mc-v ${cls}`}>{val}</div>
                <div className="mc-s">{sub}</div>
              </div>
            ));
          })()}
        </div>
        <div className="sh">Supplier concentration — Waaree risk</div>
        <div className="alrt amber"><div className="alrt-dot"/><div className="alrt-b"><strong>Waaree Energies concentration:</strong> 63.3% of top-10 supplier purchases in FY26 (₹182.7 Cr of ₹288.7 Cr). Any supply disruption directly impacts project delivery timelines and margins.</div></div>
      </div>
    );
  };

  // ── Tab: Advisory ──────────────────────────────────────────────────────────
  const TabAd = () => (
    <div>
      <div className="sh">CRISIL upgrade triggers — current status</div>
      <div className="g2">
        {[
          { label: 'EBITDA Margin >22% sustained', val: ebitdaM, trigger: 22, dir: 'up', note: `Current ${P(ebitdaM)} vs trigger 22%. Gap: ${P(22 - ebitdaM)} below. CRISIL expects 20–22% medium term.` },
          { label: 'NCA >₹120 Cr (upward scenario)', val: nca, trigger: 120, dir: 'up', note: `YTD NCA ${C(nca)} vs upgrade path ₹120 Cr. FY26 NCA was ₹80.4 Cr (2.17x old trigger of ₹37 Cr).` },
          { label: 'Revenue growth + WC discipline', val: debtorDays, trigger: 90, dir: 'down', note: `Debtor days ${debtorDays.toFixed(0)}d. Strong at below 90d trigger. Scale ₹1,257 Cr order book without stretching WC.` },
          { label: 'Gearing <1.0x', val: gearing, trigger: 1.0, dir: 'down', note: `Current ${gearing.toFixed(2)}x — well below 1.0x trigger. Negligible leverage risk.` },
        ].map(({ label, val, trigger, dir, note }) => {
          const good = dir === 'up' ? val >= trigger : val <= trigger;
          return (
            <div key={label} className={`alrt ${good ? 'green' : 'amber'}`} style={{ cursor: 'default' }}>
              <div className="alrt-dot"/>
              <div className="alrt-b"><strong>{label}</strong><br/>{note}</div>
            </div>
          );
        })}
      </div>
      <div className="sh">Downgrade watch items</div>
      {[
        { sev: 'red', h: 'BG sub-limit utilisation near-full', b: 'Bank Guarantee sub-limit (₹50 Cr of ₹75 Cr facility) was at 98.2% in Jan 2026. CRISIL monitors CC+BG combined utilisation. Request limit enhancement — application already submitted.' },
        { sev: 'amber', h: 'Pending income tax demand ₹20.48 Cr (AY 2022-23)', b: 'Matter before CIT(Appeals). If crystallised, reduces net worth by ~10% and requires significant cash outflow. Maintain provision or disclose adequately to CRISIL.' },
        { sev: 'amber', h: 'GCA days trend — watch for >230 day downgrade trigger', b: `Gross WC Days was ~156 in FY26. CRISIL downgrade trigger is >230 days. Scale-up in FY27 must not stretch working capital significantly.` },
        { sev: 'amber', h: 'Advance to creditors ₹144.5 Cr — supplier advance concentration', b: 'Large supplier advances stretch GCA days. Negotiate BG-backed credit terms with top 5 suppliers (esp. Waaree) to release cash.' },
        { sev: 'blue', h: 'CWIP ₹43 Cr + Intangibles UDev ₹21.45 Cr — pre-revenue assets', b: 'Total ₹64.5 Cr locked in solar park development. Once commissioned, these generate recurring tariff income significantly de-risking business model. Present commissioning timeline to CRISIL.' },
        { sev: 'blue', h: 'Soltown Infra RPT disclosure', b: 'Soltown Infra (4th largest FY26 customer, ₹29.1 Cr) — CRISIL will ask for arm\'s-length evidence and commercial rationale. Prepare receivable ageing and contract terms.' },
      ].map(({ sev, h, b }) => (
        <div key={h} className={`alrt ${sev}`}><div className="alrt-dot"/><div className="alrt-b"><strong>{h}</strong><br/>{b}</div></div>
      ))}
    </div>
  );

  // ── Tab: Trend ─────────────────────────────────────────────────────────────
  const TabTr = () => (
    <div>
      <div className="sh">3-year trend + FY27 YTD</div>
      <div className="g2">
        <div className="card">
          <div className="sh">Revenue & PAT (₹ Cr)</div>
          <div className="ch-lg">
            <TrendChart
              labels={['FY24', 'FY25', 'FY26', 'FY27 YTD']}
              datasets={[
                { label: 'Revenue', data: [HIST.FY24.rev, HIST.FY25.rev, HIST.FY26.rev, d.rev], borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.08)', fill: true },
                { label: 'PAT', data: [HIST.FY24.pat, HIST.FY25.pat, HIST.FY26.pat, d.pat], borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.08)', fill: true },
              ]}
            />
          </div>
        </div>
        <div className="card">
          <div className="sh">EBITDA Margin & PAT Margin (%)</div>
          <div className="ch-lg">
            <TrendChart
              labels={['FY24', 'FY25', 'FY26', 'FY27 YTD']}
              datasets={[
                { label: 'EBITDA Margin %', data: [HIST.FY24.ebitdaM, HIST.FY25.ebitdaM, HIST.FY26.ebitdaM, ebitdaM], borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,.08)', fill: true },
                { label: 'PAT Margin %', data: [HIST.FY24.patM, HIST.FY25.patM, HIST.FY26.patM, patM], borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,.08)', fill: true },
              ]}
              refLine={22}
              refLabel="CRISIL 22% trigger"
            />
          </div>
        </div>
        <div className="card">
          <div className="sh">Gearing & Current Ratio</div>
          <div className="ch-lg">
            <TrendChart
              labels={['FY24', 'FY25', 'FY26', 'FY27 YTD']}
              datasets={[
                { label: 'Gearing (x)', data: [HIST.FY24.gearing, HIST.FY25.gearing, HIST.FY26.gearing, gearing], borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,.08)', fill: true },
                { label: 'Current Ratio (x)', data: [HIST.FY24.cr, HIST.FY25.cr, HIST.FY26.cr, cr], borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.08)', fill: true },
              ]}
            />
          </div>
        </div>
        <div className="card">
          <div className="sh">Net Worth (₹ Cr)</div>
          <div className="ch-lg">
            <TrendChart
              labels={['FY24', 'FY25', 'FY26', 'FY27 YTD']}
              datasets={[{ label: 'Net Worth', data: [HIST.FY24.nw || 12, HIST.FY25.nw, HIST.FY26.nw, nw], borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.1)', fill: true }]}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Chart component ────────────────────────────────────────────────────────
  function TrendChart({ labels, datasets, refLine, refLabel }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    useEffect(() => {
      if (!canvasRef.current) return;
      let Chart;
      try { Chart = require('chart.js/auto'); } catch { return; }
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: datasets.map(ds => ({ ...ds, tension: 0.35, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2 })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 12 } },
            annotation: refLine ? {
              annotations: { line1: { type: 'line', yMin: refLine, yMax: refLine, borderColor: 'rgba(220,38,38,.4)', borderWidth: 1.5, borderDash: [4, 4], label: { content: refLabel, enabled: true, font: { size: 10 } } } }
            } : {},
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
            y: { grid: { color: '#f3f4f6' }, ticks: { font: { family: 'DM Sans', size: 11 } } },
          },
        },
      });
      return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    }, [labels, datasets, refLine, refLabel]);
    return <canvas ref={canvasRef} />;
  }

  // ── Tab map ────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'ov', label: '📊 Overview',         C: TabOv  },
    { id: 'fi', label: '💰 Financials',        C: TabFi  },
    { id: 'ra', label: '📐 Ratios',            C: TabRa  },
    { id: 'op', label: '🏦 Operations',        C: TabOp  },
    { id: 'pr', label: '☀️ Projects',          C: TabPr  },
    { id: 'cl', label: '🤝 Clients',           C: TabCl  },
    { id: 'ad', label: '💡 Advisory',          C: TabAd  },
    { id: 'tr', label: '📈 Trend',             C: TabTr  },
  ];
  const ActiveTab = TABS.find(t => t.id === tab)?.C || TabOv;
  const mc = modal ? modalContent(modal, d) : null;

  return (
    <>
      <Head>
        <title>RPEL Financial Command Centre</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
      </Head>

      {/* Header */}
      <div className="hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--g)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 400 }}>Rays Power Experts Ltd.</div>
            <div style={{ fontSize: 10, color: 'var(--mt)' }}>Financial Command Centre · Org 60038956413 · <span id="ts">{d.fetchedAt || 'Cached'}</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span className="pill pg">CRISIL BBB / Stable</span>
          <span className="pill pb">{pLabel()}</span>
          <span className={`pill ${status.cls}`}>{status.text}</span>
          <button className="rbtn" onClick={fetchLive} disabled={loading}>
            <span className={loading ? 'spin' : ''}>↻</span> {loading ? 'Fetching…' : 'Refresh live data'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="ctrl">
        <span className="cl">FY</span>
        <select value={fy} onChange={e => setFy(e.target.value)}>
          <option value="27">FY 2026–27</option>
          <option value="26">FY 2025–26</option>
          <option value="25">FY 2024–25</option>
          <option value="24">FY 2023–24</option>
        </select>
        <span className="cl">Period</span>
        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="annual">Annual (Full Year)</option>
          <option value="q1">Q1 (Apr–Jun)</option>
          <option value="q2">Q2 (Jul–Sep)</option>
          <option value="q3">Q3 (Oct–Dec)</option>
          <option value="q4">Q4 (Jan–Mar)</option>
        </select>
        <div className="dvd"/>
        <span className="cl">Segment</span>
        {['all', 'epc', 'parks', 'om', 'bess'].map(s => (
          <button key={s} className={`seg${seg === s ? ' on' : ''}`} onClick={() => setSeg(s)}>
            {{ all: 'All', epc: 'EPC', parks: 'Solar Parks', om: 'O&M', bess: 'BESS' }[s]}
          </button>
        ))}
        <span className={`pill ${fy === '27' ? 'pg' : 'pb'}`} style={{ marginLeft: 'auto', fontSize: 10 }}>{pLabel()} · {fy === '27' ? 'Live' : 'Historical'}</span>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Body */}
      <div className="bdy"><ActiveTab /></div>

      {/* Footer */}
      <div className="foot">
        <span>Source: Zoho Books Reports Centre · P&L · Balance Sheet · Cash Flow · 6 reports · Org 60038956413</span>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="fbt" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>

      {/* Modal */}
      {modal && mc && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <div className="modal-hdr">
              <div><div className="modal-t">{mc.t}</div><div className="modal-s">{mc.s}</div></div>
              <button className="modal-x" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">{mc.body()}</div>
          </div>
        </div>
      )}
    </>
  );
}
