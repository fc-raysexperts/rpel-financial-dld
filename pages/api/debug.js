// pages/api/debug.js
// Temporary endpoint — shows raw Zoho API response so we can fix field names
// DELETE THIS FILE after fixing financials.js

export default async function handler(req, res) {
  const orgId = process.env.ZOHO_ORG_ID || '60038956413';

  // Get token
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
    return res.status(500).json({ step: 'auth_failed', error: e.message });
  }

  const zbHeaders = {
    'Authorization': `Zoho-oauthtoken ${token}`,
    'X-com-zoho-books-organizationid': orgId,
  };
  const base = 'https://www.zohoapis.in/books/v3';

  // Fetch ONLY P&L for April 2026 — just to see the raw structure
  try {
    const plRes = await fetch(
      `${base}/reports/profitandloss?from_date=2026-04-01&to_date=2026-04-30&cash_based=false`,
      { headers: zbHeaders }
    );
    const pl = await plRes.json();
    return res.status(200).json({
      token_ok: true,
      pl_status: plRes.status,
      pl_keys: Object.keys(pl),
      pl_raw: pl,
    });
  } catch (e) {
    return res.status(500).json({ step: 'fetch_failed', error: e.message });
  }
}
