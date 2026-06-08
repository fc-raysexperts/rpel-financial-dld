// pages/api/financials.js
// Calls Zoho Books REST API directly — no MCP needed, fully reliable

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fy = '27', period = 'annual' } = req.body || {};

  // Build date range
  const fyStart = parseInt(fy) - 1 + 2000;
  const ranges = {
    annual: { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` },
    q1:     { from: `${fyStart}-04-01`, to: `${fyStart}-06-30` },
    q2:     { from: `${fyStart}-07-01`, to: `${fyStart}-09-30` },
    q3:     { from: `${fyStart}-10-01`, to: `${fyStart}-12-31` },
    q4:     { from: `${fyStart + 1}-01-01`, to: `${fyStart + 1}-03-31` },
  };
  const { from, to } = ranges[period] || ranges.annual;
  const orgId = process.env.ZOHO_ORG_ID || '60038956413';

  // ── Step 1: Get fresh Zoho access token ───────────────────────────────────
  let token;
  try {
    const t = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      }),
    });
    const td = await t.json();
    if (!td.access_token) throw new Error(JSON.stringify(td));
    token = td.access_token;
  } catch (e) {
    return res.status(500).json({ ok: false, error: `Zoho auth failed: ${e.message}` });
  }

  const zbHeaders = {
    'Authorization': `Zoho-oauthtoken ${token}`,
    'X-com-zoho-books-organizationid': orgId,
  };
  const base = 'https://www.zohoapis.in/books/v3';

  // ── Step 2: Fetch all reports in parallel ─────────────────────────────────
  try {
    const [plRes, bsRes, cfRes, custRes, arRes, apRes] = await Promise.all([
      // P&L
      fetch(`${base}/reports/profitandloss?from_date=${from}&to_date=${to}&cash_based=false`, { headers: zbHeaders }),
      // Balance Sheet
      fetch(`${base}/reports/balancesheet?date=${to}&cash_based=false`, { headers: zbHeaders }),
      // Cash Flow
      fetch(`${base}/reports/cashflow?from_date=${from}&to_date=${to}`, { headers: zbHeaders }),
      // Sales by Customer (top 25)
      fetch(`${base}/reports/salesbycustomer?from_date=${from}&to_date=${to}&per_page=25&sort_column=sales_amount&sort_order=D`, { headers: zbHeaders }),
      // AR Aging
      fetch(`${base}/reports/agedreceivables?date=${to}`, { headers: zbHeaders }),
      // AP Aging
      fetch(`${base}/reports/agedpayables?date=${to}`, { headers: zbHeaders }),
    ]);

    const [pl, bs, cf, cust, ar, ap] = await Promise.all([
      plRes.json(), bsRes.json(), cfRes.json(),
      custRes.json(), arRes.json(), apRes.json(),
    ]);

    // ── Step 3: Parse P&L ─────────────────────────────────────────────────
    const Cr = v => Math.round((parseFloat(v) || 0) / 100000 * 100) / 100;
    const findPL = (data, ...names) => {
      const rows = data?.profitandloss?.report_rows || [];
      const flat = [];
      const walk = (arr) => arr.forEach(r => { flat.push(r); if (r.child_row) walk(r.child_row); });
      walk(rows);
      for (const nm of names) {
        const hit = flat.find(r => (r.label || '').toLowerCase().includes(nm.toLowerCase()));
        if (hit) return Cr(hit.total || hit.amount || 0);
      }
      return 0;
    };

    const rev      = findPL(pl, 'revenue from operations', 'operating income');
    const cogsMain = findPL(pl, 'cost of goods sold', 'cogs');
    const modules  = findPL(pl, 'modules');
    const mms      = findPL(pl, 'mms');
    const cogsOpex = findPL(pl, 'operating expenses', '4-02');
    const cogs     = Math.round((cogsMain + modules + mms + cogsOpex) * 100) / 100;
    const gp       = Math.round((rev - cogs) * 100) / 100;
    const gpM      = rev ? Math.round(gp / rev * 10000) / 100 : 0;
    const admin    = findPL(pl, 'administrative expenses', '4-06');
    const empBen   = findPL(pl, 'employee benefits expense', '4-03');
    const empWages = findPL(pl, 'employees benefit expenses', 'salary');
    const fin      = findPL(pl, 'finance costs', '4-04');
    const taxExp   = findPL(pl, 'tax expenses', '4-07');
    const pat      = findPL(pl, 'net profit', 'net loss', 'profit after tax');
    const ebit     = Math.round((gp - admin - empBen - empWages - fin - taxExp) * 100) / 100;
    const ebitM    = rev ? Math.round(ebit / rev * 10000) / 100 : 0;
    const ebitda   = Math.round((ebit + fin) * 100) / 100;
    const ebitdaM  = rev ? Math.round(ebitda / rev * 10000) / 100 : 0;
    const patM     = rev ? Math.round(pat / rev * 10000) / 100 : 0;

    // ── Step 4: Parse Balance Sheet ───────────────────────────────────────
    const findBS = (data, ...names) => {
      const sections = data?.balance_sheet?.report_rows || [];
      const flat = [];
      const walk = (arr) => arr.forEach(r => { flat.push(r); if (r.child_row) walk(r.child_row); });
      walk(sections);
      for (const nm of names) {
        const hit = flat.find(r => (r.label || '').toLowerCase().includes(nm.toLowerCase()));
        if (hit) return Cr(hit.total || hit.amount || 0);
      }
      return 0;
    };

    const rec          = findBS(bs, 'trade receivables', 'accounts receivable');
    const advCred      = findBS(bs, 'advance to creditors');
    const fdr          = findBS(bs, 'fixed deposits');
    const inventory    = findBS(bs, 'inventories', 'inventory asset');
    const cwip         = findBS(bs, 'capital work in progress', 'cwip');
    const intangUdev   = findBS(bs, 'intangible asset under development');
    const fixedAssets  = findBS(bs, 'plant & machinery', 'property, plant');
    const totalCurA    = findBS(bs, 'total current assets', 'total for current assets');
    const totalAssets  = findBS(bs, 'total assets', 'total for assets');
    const tradePay     = findBS(bs, 'trade payables', 'accounts payable');
    const advDebtor    = findBS(bs, 'advance from debtors');
    const gstPay       = findBS(bs, 'gst payable');
    const statLiab     = findBS(bs, 'statutory liabilities');
    const retMoney     = findBS(bs, 'retention money');
    const secLoan      = findBS(bs, 'secured loan');
    const prov         = findBS(bs, 'provisions');
    const totalCurL    = findBS(bs, 'total current liabilities', 'total for current liabilities');
    const totalLiab    = findBS(bs, 'total liabilities', 'total for liabilities');
    const shareCap     = findBS(bs, 'equity share capital', 'share capital');
    const secPrem      = findBS(bs, 'securities premium');
    const retained     = findBS(bs, 'retained earnings');
    const currEarn     = findBS(bs, 'current year earnings', 'net profit');
    const nw           = Math.round((shareCap + secPrem + retained + currEarn) * 100) / 100;

    // Bank accounts from BS
    const bsFlat = [];
    const walkBS = (arr) => arr.forEach(r => { bsFlat.push(r); if (r.child_row) walkBS(r.child_row); });
    walkBS(bs?.balance_sheet?.report_rows || []);
    const bankRows = bsFlat.filter(r => {
      const l = (r.label || '').toLowerCase();
      return l.includes('bank') || l.includes('cash credit') || l.includes('overdraft') || l.includes('current a/c');
    });
    const banks = bankRows.slice(0, 10).map(r => {
      const l = r.label || '';
      const bal = Cr(r.total || r.amount || 0);
      const type = l.toLowerCase().includes('cash credit') ? 'cc' : l.toLowerCase().includes('overdraft') ? 'od' : 'current';
      return { name: l, num: (l.match(/\d{6,}/)?.[0] || '').slice(-6), bal, type };
    });
    const cashGross = banks.filter(b => b.bal > 0).reduce((s, b) => s + b.bal, 0);
    const ccDrawn   = Math.abs(banks.find(b => b.type === 'cc')?.bal || 0);
    const debt      = Math.round((ccDrawn + secLoan) * 100) / 100;
    const gearing   = nw ? Math.round(debt / nw * 10000) / 10000 : 0;
    const cr        = totalCurL ? Math.round(totalCurA / totalCurL * 100) / 100 : 0;
    const ic        = fin > 0 ? Math.round(ebit / fin * 10) / 10 : 99;

    // ── Step 5: Parse Cash Flow ───────────────────────────────────────────
    const findCF = (data, ...names) => {
      const rows = data?.cash_flow?.report_rows || [];
      const flat = [];
      const walk = (arr) => arr.forEach(r => { flat.push(r); if (r.child_row) walk(r.child_row); });
      walk(rows);
      for (const nm of names) {
        const hit = flat.find(r => (r.label || '').toLowerCase().includes(nm.toLowerCase()));
        if (hit) return Cr(hit.total || hit.amount || 0);
      }
      return 0;
    };
    const opCF  = findCF(cf, 'operating activities', 'net cash provided by operating');
    const invCF = findCF(cf, 'investing activities', 'net cash provided by investing');
    const begCF = findCF(cf, 'beginning cash', 'opening balance');
    const endCF = findCF(cf, 'ending cash', 'closing balance');

    // ── Step 6: Parse Customers ───────────────────────────────────────────
    const custRows = cust?.sales_by_customer || cust?.report_rows || [];
    const days = Math.round((new Date(to) - new Date(from)) / 86400000);
    const topClients = custRows.slice(0, 10).map(c => ({
      nm:          c.customer_name || c.label || 'Unknown',
      billed:      Cr(c.sales_amount || c.total || 0),
      outstanding: Cr(c.outstanding_receivable_amount || c.balance || 0),
      sector:      '—',
      seg:         'epc',
    }));
    const debtorDays  = rev && days ? Math.round(rec / (rev / days)) : 0;
    const credDays    = cogs && days ? Math.round(tradePay / (cogs / days)) : 0;

    // ── Step 7: Parse AR/AP Aging ─────────────────────────────────────────
    const parseAging = (data, key) => {
      const rows = data?.[key]?.report_rows || data?.report_rows || [];
      const flat = [];
      const walk = (arr) => arr.forEach(r => { flat.push(r); if (r.child_row) walk(r.child_row); });
      walk(rows);
      const tot = flat.find(r => (r.label || '').toLowerCase().includes('total'));
      return {
        '0_30':    Cr(tot?.columns?.[0]?.amount || 0),
        '31_60':   Cr(tot?.columns?.[1]?.amount || 0),
        '61_90':   Cr(tot?.columns?.[2]?.amount || 0),
        '90_plus': Cr(tot?.columns?.[3]?.amount || 0),
      };
    };
    const arAging = parseAging(ar, 'aged_receivables');
    const apAging = parseAging(ap, 'aged_payables');

    // ── Return final JSON ─────────────────────────────────────────────────
    return res.status(200).json({
      ok: true,
      fetchedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      from, to,
      data: {
        rev, cogs, cogs_main: cogsMain, modules, mms, cogs_opex: cogsOpex,
        gp, gp_m: gpM, admin, emp_ben: empBen, emp_wages: empWages,
        fin, tax_exp: taxExp, ebit, ebit_m: ebitM, ebitda, ebitda_m: ebitdaM,
        pat, pat_m: patM,
        cash_gross: cashGross, cc_drawn: ccDrawn, fdr, rec, adv_cred: advCred,
        inventory, cwip, intang_udev: intangUdev, fixed_assets: fixedAssets,
        total_cur_assets: totalCurA, total_assets: totalAssets,
        trade_pay: tradePay, adv_debtor: advDebtor, gst_pay: gstPay,
        stat_liab: statLiab, ret_money: retMoney, sec_loan: secLoan, prov,
        total_cur_liab: totalCurL, total_liab: totalLiab,
        share_cap: shareCap, sec_prem: secPrem, retained, curr_earn: currEarn, nw,
        debt, gearing, cr, ic,
        op_cf: opCF, inv_cf: invCF, beg_cf: begCF, end_cf: endCF,
        debtor_days: debtorDays, creditor_days: credDays,
        banks, top_clients: topClients, ar_aging: arAging, ap_aging: apAging,
      },
    });

  } catch (e) {
    console.error('ZB fetch error:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
