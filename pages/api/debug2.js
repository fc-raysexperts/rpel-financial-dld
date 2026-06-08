// pages/api/debug2.js — temporary, delete after fixing
export default async function handler(req, res) {
  const orgId = process.env.ZOHO_ORG_ID || '60038956413';
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
    return res.status(500).json({ error: `auth failed: ${e.message}` });
  }

  const zbH = {
    'Authorization': `Zoho-oauthtoken ${token}`,
    'X-com-zoho-books-organizationid': orgId,
  };
  const base = 'https://www.zohoapis.in/books/v3';

  // Fetch all 3 problem endpoints and show their raw keys + first row
  const [custR, arR, apR] = await Promise.all([
    fetch(`${base}/reports/salesbycustomer?from_date=2026-04-01&to_date=2026-04-30&per_page=25&sort_column=sales_amount&sort_order=D`, { headers: zbH }),
    fetch(`${base}/reports/agedreceivables?date=2026-04-30`, { headers: zbH }),
    fetch(`${base}/reports/agedpayables?date=2026-04-30`, { headers: zbH }),
  ]);
  const [cust, ar, ap] = await Promise.all([custR.json(), arR.json(), apR.json()]);

  return res.status(200).json({
    cust_top_keys: Object.keys(cust),
    cust_first_row: (cust.sales_by_customer || cust.report_rows || Object.values(cust)[1] || [])[0] || 'empty',
    cust_row_count: (cust.sales_by_customer || cust.report_rows || []).length,
    ar_top_keys: Object.keys(ar),
    ar_first_row: (ar.aged_receivables || ar.report_rows || Object.values(ar)[1] || [])[0] || 'empty',
    ap_top_keys: Object.keys(ap),
    ap_first_row: (ap.aged_payables || ap.report_rows || Object.values(ap)[1] || [])[0] || 'empty',
  });
}
