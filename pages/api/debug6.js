// pages/api/debug6.js — temporary
export default async function handler(req, res) {
  const orgId = process.env.ZOHO_ORG_ID || '60038956413';
  let token;
  try {
    const t = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ZOHO_CLIENT_ID,
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

  const r = await fetch(`${base}/reports/customerbalances?date=2026-04-30`, { headers: zbH });
  const data = await r.json();
  const rows = data.customerbalances || [];

  return res.status(200).json({
    total_rows: rows.length,
    first_row_keys: rows[0] ? Object.keys(rows[0]) : [],
    first_row: rows[0] || {},
    second_row: rows[1] || {},
    // Also show vendor balances endpoint
  });
}
