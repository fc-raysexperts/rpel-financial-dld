// pages/api/financials.js
// Server-side only — API key never reaches the browser

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fy = '27', period = 'annual', segment = 'all' } = req.body || {};

  // Build date range from FY + period
  const fyStart = parseInt(fy) - 1 + 2000; // FY27 → 2026
  const ranges = {
    annual: { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` },
    q1:     { from: `${fyStart}-04-01`, to: `${fyStart}-06-30` },
    q2:     { from: `${fyStart}-07-01`, to: `${fyStart}-09-30` },
    q3:     { from: `${fyStart}-10-01`, to: `${fyStart}-12-31` },
    q4:     { from: `${fyStart + 1}-01-01`, to: `${fyStart + 1}-03-31` },
  };
  const { from, to } = ranges[period] || ranges.annual;

  const systemPrompt = `You are a financial data extractor for Zoho Books org 60038956413.
Use the Zoho Books MCP tools to fetch the following reports for the period ${from} to ${to}:
1. Profit and Loss report
2. Balance Sheet (as of ${to})
3. Cash Flow Statement
4. Sales by Customer (top 10 by amount)
5. AR Aging Summary
6. AP Aging Summary

Extract values and return ONLY a valid JSON object — no markdown, no backticks, no explanation.
All monetary values in Rs Crore (divide raw paise/rupee values by 10000000, round to 2 decimals).

Required JSON structure:
{
  "rev": <Revenue from operations, account 3-01>,
  "cogs": <Total Cost of Goods Sold = 4-01 + Modules + MMS + 4-02>,
  "cogs_main": <Cost of Goods Sold 4-01 only>,
  "modules": <Modules line>,
  "mms": <MMS line>,
  "cogs_opex": <Operating Expenses 4-02>,
  "gp": <Gross Profit = rev - cogs>,
  "gp_m": <GP margin % = gp/rev*100>,
  "admin": <Administrative Expenses 4-06>,
  "emp_ben": <Employee benefits expense 4-03>,
  "emp_wages": <Employees Benefit Expenses (no code)>,
  "fin": <Finance costs 4-04>,
  "tax_exp": <Tax Expenses 4-07>,
  "ebit": <Operating Profit>,
  "ebit_m": <EBIT margin %>,
  "ebitda": <EBIT + Finance costs>,
  "ebitda_m": <EBITDA margin %>,
  "pat": <Net Profit/Loss>,
  "pat_m": <PAT margin %>,
  "cash_gross": <sum of all positive bank balances>,
  "cc_drawn": <Cash Credit IOB 015833000000082 absolute value>,
  "fdr": <Fixed Deposits>,
  "rec": <Total Accounts Receivable / Trade Receivables>,
  "adv_cred": <Advance to Creditors>,
  "inventory": <Inventories - Project Material GM + Inventory Asset>,
  "cwip": <Capital Work in Progress>,
  "intang_udev": <Intangible Asset Under Development total>,
  "fixed_assets": <Net Fixed Assets after depreciation>,
  "total_cur_assets": <Total Current Assets>,
  "total_assets": <Total Assets>,
  "trade_pay": <Total Trade Payables / Accounts Payable>,
  "adv_debtor": <Advance from debtors>,
  "gst_pay": <GST Payable>,
  "stat_liab": <Statutory Liabilities>,
  "ret_money": <Retention Money Payable>,
  "sec_loan": <Secured Loan>,
  "prov": <Provisions>,
  "total_cur_liab": <Total Current Liabilities>,
  "total_liab": <Total Liabilities>,
  "share_cap": <Equity Share Capital>,
  "sec_prem": <Securities Premium>,
  "retained": <Retained Earnings>,
  "curr_earn": <Current Year Earnings>,
  "nw": <Total Equity/Net Worth>,
  "op_cf": <Net cash from Operating Activities>,
  "inv_cf": <Net cash from Investing Activities>,
  "beg_cf": <Beginning Cash Balance>,
  "end_cf": <Ending Cash Balance>,
  "debtor_days": <calculated: rec / (rev/period_days) where period_days = days in period>,
  "creditor_days": <calculated: trade_pay / (cogs/period_days)>,
  "banks": [{"name": "bank name", "num": "account number", "bal": balance_in_cr, "type": "cc|od|current"}],
  "top_clients": [{"nm": "client name", "billed": amount_in_cr, "outstanding": amount_in_cr, "sector": "sector"}],
  "ar_aging": {"0_30": amount, "31_60": amount, "61_90": amount, "90_plus": amount},
  "ap_aging": {"0_30": amount, "31_60": amount, "61_90": amount, "90_plus": amount}
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Fetch Zoho Books financial data for org 60038956413, period ${from} to ${to}. Return only the JSON object.` }],
        mcp_servers: [{ type: 'url', url: 'https://claude-zohobooks.zohomcp.in/mcp/message', name: 'zoho-books' }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
    const data = await response.json();

    // Extract text from response (handle mcp_tool_result blocks too)
    let text = '';
    for (const block of data.content || []) {
      if (block.type === 'text') text += block.text;
      if (block.type === 'mcp_tool_result') {
        for (const inner of block.content || []) {
          if (inner.type === 'text') text += inner.text;
        }
      }
    }

    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Find JSON object in response
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON in response');
    const parsed = JSON.parse(clean.slice(start, end + 1));

    return res.status(200).json({ ok: true, data: parsed, from, to, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('financials API error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
