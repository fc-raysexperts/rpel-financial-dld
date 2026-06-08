// pages/api/financials.js

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fy = '27', period = 'annual' } = req.body || {};
  const fyStart = parseInt(fy) - 1 + 2000;
  const ranges = {
    annual: { from: `${fyStart}-04-01`,     to: `${fyStart + 1}-03-31` },
    q1:     { from: `${fyStart}-04-01`,     to: `${fyStart}-06-30` },
    q2:     { from: `${fyStart}-07-01`,     to: `${fyStart}-09-30` },
    q3:     { from: `${fyStart}-10-01`,     to: `${fyStart}-12-31` },
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

  const zbH = {
    'Authorization': `Zoho-oauthtoken ${token}`,
    'X-com-zoho-books-organizationid': orgId,
  };
  const base = 'https://www.zohoapis.in/books/v3';
  // All Zoho values are in rupees — divide by 1 crore
  const Cr = v => Math.round((parseFloat(v) || 0) / 10000000 * 100) / 100;

  // ── Step 2: Fetch all reports in parallel ─────────────────────────────────
  let pl, bs, cf, cust, custBal;
  try {
    const [plR, bsR, cfR, custR, custBalR] = await Promise.all([
      fetch(`${base}/reports/profitandloss?from_date=${from}&to_date=${to}&cash_based=false`, { headers: zbH }),
      fetch(`${base}/reports/balancesheet?date=${to}&cash_based=false`, { headers: zbH }),
      fetch(`${base}/reports/cashflow?from_date=${from}&to_date=${to}`, { headers: zbH }),
      fetch(`${base}/reports/salesbycustomer?from_date=${from}&to_date=${to}&per_page=200`, { headers: zbH }),
      // customerbalances: confirmed 200, has bcy_balance per customer
      fetch(`${base}/reports/customerbalances?date=${to}&per_page=200`, { headers: zbH }),
    ]);
    [pl, bs, cf, cust, custBal] = await Promise.all([
      plR.json(), bsR.json(), cfR.json(), custR.json(), custBalR.json(),
    ]);
  } catch (e) {
    return res.status(500).json({ ok: false, error: `ZB fetch failed: ${e.message}` });
  }

  // ── Step 3: Parse P&L ─────────────────────────────────────────────────────
  const plSections = pl.profit_and_loss || [];
  const plMap = {};
  for (const section of plSections) {
    for (const tx of section.account_transactions || []) {
      for (const item of tx.account_transactions || [tx]) {
        const key = (item.name || '').trim();
        if (key) plMap[key] = (plMap[key] || 0) + (parseFloat(item.total) || 0);
      }
    }
  }

  const gpSection        = plSections.find(s => s.name === 'Gross Profit');
  const opIncomeSection  = (gpSection?.account_transactions || []).find(t => t.name === 'Operating Income');
  const cogsSection      = (gpSection?.account_transactions || []).find(t => t.name === 'Cost of Goods Sold');
  const opProfitSection  = plSections.find(s => s.name === 'Operating Profit');
  const netProfitSection = plSections.find(s => s.name === 'Net Profit/Loss');

  const rev      = Cr(opIncomeSection?.total || 0);
  const cogs     = Cr(cogsSection?.total || 0);
  const cogsMain = Cr((plMap['Consumption- Project Material GM'] || 0) + (plMap['Consumption- Stores & Consumables'] || 0) + (plMap['Cost of Goods Sold'] || 0));
  const modules  = Cr(plMap['Modules'] || 0);
  const mms      = Cr(plMap['MMS'] || 0);
  const cogsOpex = Cr(
    (plMap['Civil Work GM'] || 0) + (plMap['Erection & Installation Work-GM'] || 0) +
    (plMap['Freight Inward Expenses'] || 0) + (plMap['Consultancy & Technical Fees Project GM'] || 0) +
    (plMap['Module Washing Expenses'] || 0) + (plMap['Security Manpower Expenses_1'] || 0) +
    (plMap['Land Lease Registration Expense'] || 0) + (plMap['Project Approval/ Government Fees'] || 0)
  );
  const gp   = Cr(gpSection?.total || 0);
  const gpM  = rev ? Math.round(gp / rev * 10000) / 100 : 0;
  const fin  = Cr((plMap['Interest on Bank Overdraft & Cash Credit'] || 0) + (plMap['Bank Charges'] || 0) + (plMap['Interest on Car Loan'] || 0));
  const empBen   = Cr((plMap['EPF Employer Contribution'] || 0) + (plMap['ESI Employer Contribution'] || 0) + (plMap['Staff Welfare Expense'] || 0));
  const empWages = Cr((plMap['Salary-Jaipur'] || 0) + (plMap['Salaries and Employee Wages'] || 0));
  const admin    = Cr(
    (plMap['Legal & Professional Charges'] || 0) + (plMap['Software Expenses'] || 0) +
    (plMap['Office Expenses'] || 0) + (plMap['Tour & Travelling Expenses'] || 0) +
    (plMap['Vehicle Running & Maintenance'] || 0) + (plMap['Electricity Expenses'] || 0) +
    (plMap['Internet Expenses'] || 0) + (plMap['Insurance Expenses'] || 0) +
    (plMap['Marketing & Advertisement Expenses'] || 0) + (plMap['Auditor Remuneration'] || 0)
  );
  const taxExp  = Cr(plMap['Income Tax of Earlier Years'] || 0);
  const ebit    = Cr(opProfitSection?.total || 0);
  const ebitM   = rev ? Math.round(ebit / rev * 10000) / 100 : 0;
  const ebitda  = Math.round((ebit + fin) * 100) / 100;
  const ebitdaM = rev ? Math.round(ebitda / rev * 10000) / 100 : 0;
  const pat     = Cr(netProfitSection?.total || 0);
  const patM    = rev ? Math.round(pat / rev * 10000) / 100 : 0;

  // ── Step 4: Parse Balance Sheet ───────────────────────────────────────────
  const bsMap = {};
  const walkBS = (rows) => {
    for (const row of (rows || [])) {
      const key = (row.account_name || row.name || row.label || '').trim();
      if (key) bsMap[key] = parseFloat(row.balance || row.total || row.amount || 0);
      walkBS(row.subaccounts); walkBS(row.child_row); walkBS(row.account_transactions);
    }
  };
  walkBS(Array.isArray(bs.balance_sheet) ? bs.balance_sheet : []);

  const getBs = (...names) => {
    for (const nm of names) {
      const key = Object.keys(bsMap).find(k => k.toLowerCase().includes(nm.toLowerCase()));
      if (key && bsMap[key]) return Cr(Math.abs(bsMap[key]));
    }
    return 0;
  };

  const rec        = getBs('Trade Receivables', 'Accounts Receivable');
  const advCred    = getBs('Advance to Creditors');
  const fdr        = getBs('Fixed Deposits');
  const inventory  = getBs('Inventories', 'Inventory Asset');
  const cwip       = getBs('Capital Work in Progress');
  const intangUdev = getBs('Intangible Asset Under Development');
  const tradePay   = getBs('Trade Payables', 'Accounts Payable');
  const advDebtor  = getBs('Advance from debtors');
  const gstPay     = getBs('GST Payable');
  const statLiab   = getBs('Statutory Liabilities');
  const retMoney   = getBs('Retention Money Payable');
  const secLoan    = getBs('Secured Loan');
  const prov       = getBs('Provisions');
  const shareCap   = getBs('Equity Share Capital');
  const secPrem    = getBs('Securities Premium');
  const retained   = getBs('Retained Earnings');
  const currEarn   = getBs('Current Year Earnings');
  const nw         = Math.round((shareCap + secPrem + retained + currEarn) * 100) / 100;

  const banks = Object.entries(bsMap)
    .filter(([k]) => k.includes('Bank') || k.includes('Cash Credit') || k.includes('Overdraft'))
    .map(([name, val]) => ({
      name, num: (name.match(/\d{6,}/)?.[0] || '').slice(-6),
      bal: Cr(val), type: name.includes('Cash Credit') ? 'cc' : name.includes('Overdraft') ? 'od' : 'current',
    })).filter(b => Math.abs(b.bal) > 0);

  const cashGross  = banks.filter(b => b.bal > 0).reduce((s, b) => s + b.bal, 0);
  const ccDrawn    = Math.abs(banks.find(b => b.type === 'cc')?.bal || 0);
  const debt       = Math.round((ccDrawn + secLoan) * 100) / 100;
  const gearing    = nw ? Math.round(debt / nw * 10000) / 10000 : 0;
  const totalCurA  = getBs('Total Current Assets') || (rec + advCred + fdr + inventory + cashGross);
  const totalCurL  = getBs('Total Current Liabilities') || (tradePay + advDebtor + gstPay + statLiab + ccDrawn + retMoney + prov);
  const totalAssets = getBs('Total Assets') || (totalCurA + cwip + intangUdev);
  const totalLiab   = getBs('Total Liabilities') || totalCurL;
  const cr = totalCurL ? Math.round(totalCurA / totalCurL * 100) / 100 : 0;
  const ic = fin > 0 ? Math.round(ebit / fin * 10) / 10 : 99;

  // ── Step 5: Parse Cash Flow ───────────────────────────────────────────────
  const cfMap = {};
  const walkCF = (rows) => {
    for (const row of (rows || [])) {
      const key = (row.account_name || row.name || row.label || '').trim();
      if (key) cfMap[key] = parseFloat(row.total || row.balance || row.amount || 0);
      walkCF(row.subaccounts); walkCF(row.child_row); walkCF(row.account_transactions);
    }
  };
  walkCF(Array.isArray(cf.cash_flow) ? cf.cash_flow : []);
  const getCF = (...names) => {
    for (const nm of names) {
      const key = Object.keys(cfMap).find(k => k.toLowerCase().includes(nm.toLowerCase()));
      if (key) return Cr(cfMap[key]);
    }
    return 0;
  };
  const opCF  = getCF('operating activities', 'net cash provided by operating');
  const invCF = getCF('investing activities', 'net cash provided by investing');
  const begCF = getCF('beginning cash', 'opening balance');
  const endCF = getCF('ending cash', 'closing balance');

  // ── Step 6: Build customer balance lookup map ─────────────────────────────
  // customerbalances has bcy_balance per customer — positive = they owe us
  const balMap = {};
  for (const cb of (custBal.customerbalances || [])) {
    const bal = parseFloat(cb.bcy_balance || 0);
    if (bal > 0) balMap[cb.customer_id] = bal;
  }

  // ── Step 7: Parse Sales by Customer + merge outstanding ───────────────────
  const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));
  const custRows = cust?.sales || [];
  const topClients = custRows
    .map(c => ({
      nm:          c.customer_name || 'Unknown',
      billed:      Cr(c.sales || 0),
      outstanding: Cr(balMap[c.customer_id] || 0),
      sector:      '—',
      seg:         'epc',
    }))
    .filter(c => c.billed > 0)
    .sort((a, b) => b.billed - a.billed)
    .slice(0, 10);

  const debtorDays = rev && days ? Math.round(rec / (rev / days)) : 0;
  const credDays   = cogs && days ? Math.round(tradePay / (cogs / days)) : 0;

  // ── Step 8: AR aging from customerbalances ────────────────────────────────
  // Zoho Books India API does not expose invoice-level aging buckets via REST.
  // Best available: total outstanding from customerbalances = current receivables.
  // We show total as 0–30 days (current) since we can't age without per-invoice calls.
  const totalOutstanding = (custBal.customerbalances || [])
    .reduce((sum, cb) => sum + Math.max(0, parseFloat(cb.bcy_balance || 0)), 0);
  const arAging = {
    '0_30':    Cr(totalOutstanding),
    '31_60':   0,
    '61_90':   0,
    '90_plus': 0,
    note:      'Total outstanding shown as current — invoice-level aging not available via Zoho API',
  };
  // AP aging: use trade payables from BS as proxy
  const apAging = {
    '0_30':    tradePay,
    '31_60':   0,
    '61_90':   0,
    '90_plus': 0,
    note:      'Total payables shown as current — invoice-level aging not available via Zoho API',
  };

  // ── Return ─────────────────────────────────────────────────────────────────
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
      inventory, cwip, intang_udev: intangUdev,
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
}
