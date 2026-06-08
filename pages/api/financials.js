// pages/api/financials.js
// Server-side only — no secrets ever reach the browser

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fy = '27', period = 'annual' } = req.body || {};

  // Build date range from FY + period
  const fyStart = parseInt(fy) - 1 + 2000; // FY27 → 2026
  const ranges = {
    annual: { from: `${fyStart}-04-01`, to:   `${fyStart + 1}-03-31` },
    q1:     { from: `${fyStart}-04-01`, to:   `${fyStart}-06-30` },
    q2:     { from: `${fyStart}-07-01`, to:   `${fyStart}-09-30` },
    q3:     { from: `${fyStart}-10-01`, to:   `${fyStart}-12-31` },
    q4:     { from: `${fyStart + 1}-01-01`, to: `${fyStart + 1}-03-31` },
  };
  const { from, to } = ranges[period] || ranges.annual;

  // ── Step 1: Get a fresh Zoho access token using refresh token ─────────────
  let zohoAccessToken;
  try {
    const tokenRes = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(`Zoho token error: ${JSON.stringify(tokenData)}`);
    }
    zohoAccessToken = tokenData.access_token;
  } catch (e) {
    return res.status(500).json({ ok: false, error: `Zoho auth failed: ${e.message}` });
  }

  // ── Step 2: Call Anthropic API with Zoho MCP + access token ───────────────
  const orgId = process.env.ZOHO_ORG_ID || '60038956413';

  const systemPrompt = `You are a financial data extractor for Zoho Books org ${orgId}.
Use the Zoho Books MCP tools to fetch these reports for the period ${from} to ${to}:
1. Profit and Loss
2. Balance Sheet (as of ${to})
3. Cash Flow Statement
4. Sales by Customer (top 10 by billed amount)
5. AR Aging Summary
6. AP Aging Summary

Return ONLY a single valid JSON object. No markdown, no backticks, no explanation whatsoever.
All monetary values in Rs Crore (divide raw rupee values by 10000000, round to 2 decimal places).

JSON structure required:
{
  "rev": <Revenue from operations account 3-01>,
  "cogs": <Total COGS = 4-01 + Modules + MMS + 4-02>,
  "cogs_main": <Cost of Goods Sold 4-01 only>,
  "modules": <Modules line>,
  "mms": <MMS line account 11>,
  "cogs_opex": <Operating Expenses 4-02>,
  "gp": <Gross Profit = rev - cogs>,
  "gp_m": <GP margin % = gp/rev*100>,
  "admin": <Administrative Expenses 4-06>,
  "emp_ben": <Employee benefits expense 4-03>,
  "emp_wages": <Employees Benefit Expenses line>,
  "fin": <Finance costs 4-04>,
  "tax_exp": <Tax Expenses 4-07>,
  "ebit": <Operating Profit>,
  "ebit_m": <EBIT margin %>,
  "ebitda": <ebit + fin>,
  "ebitda_m": <ebitda/rev*100>,
  "pat": <Net Profit>,
  "pat_m": <pat/rev*100>,
  "cash_gross": <sum of all positive bank account balances>,
  "cc_drawn": <Cash Credit IOB 015833000000082 as positive number>,
  "fdr": <Fixed Deposits total>,
  "rec": <Total Trade Receivables net>,
  "adv_cred": <Advance to Creditors>,
  "inventory": <Inventories total>,
  "cwip": <Capital Work in Progress>,
  "intang_udev": <Intangible Assets Under Development total>,
  "fixed_assets": <Net Fixed Assets after accumulated depreciation>,
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
  "nw": <Total Equity = share_cap + sec_prem + retained + curr_earn>,
  "op_cf": <Net cash from Operating Activities>,
  "inv_cf": <Net cash from Investing Activities>,
  "beg_cf": <Beginning Cash Balance>,
  "end_cf": <Ending Cash Balance>,
  "debtor_days": <rec / (rev / days_in_period)>,
  "creditor_days": <trade_pay / (cogs / days_in_period)>,
  "banks": [
    {"name": "full bank name", "num": "account number last 6 digits", "bal": balance_in_cr, "type": "cc or od or current"}
  ],
  "top_clients": [
    {"nm": "client name", "billed": amount_in_cr, "outstanding": amount_in_cr, "sector": "industry sector", "seg": "epc or om or bess"}
  ],
  "ar_aging": {"0_30": amount_cr, "31_60": amount_cr, "61_90": amount_cr, "90_plus": amount_cr},
  "ap_aging": {"0_30": amount_cr, "31_60": amount_cr, "61_90": amount_cr, "90_plus": amount_cr}
}`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':  'mcp-client-2025-04-04',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 2000,
        system:     systemPrompt,
        messages: [{ role: 'user', content: `Fetch Zoho Books org ${orgId} financial data for period ${from} to ${to}. Return only the JSON object, nothing else.` }],
        mcp_servers: [{
          type:                'url',
          url:                 'https://claude-zohobooks.zohomcp.in/mcp/message',
          name:                'zoho-books',
          authorization_token: zohoAccessToken,
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API error: ${anthropicRes.status} — ${errText.slice(0, 200)}`);
    }

    const data = await anthropicRes.json();

    // Extract text — handle both text blocks and mcp_tool_result blocks
    let text = '';
    for (const block of data.content || []) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'mcp_tool_result') {
        for (const inner of block.content || []) {
          if (inner.type === 'text') text += inner.text;
        }
      }
    }

    // Parse JSON — find the outermost { } object in the response
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = clean.indexOf('{');
    const end   = clean.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new Error(`No JSON found in response. Raw: ${clean.slice(0, 300)}`);
    }
    const parsed = JSON.parse(clean.slice(start, end + 1));

    return res.status(200).json({
      ok: true,
      data: parsed,
      from,
      to,
      fetchedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    });

  } catch (e) {
    console.error('financials API error:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
