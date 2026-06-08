// pages/api/debug3.js — temporary, delete after fixing
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

  // Show full raw response + exact URL used for each endpoint
  const custUrl = `${base}/reports/salesbycustomer?from_date=2026-04-01&to_date=2026-04-30&per_page=25&sort_column=sales_amount&sort_order=D`;
  const arUrl   = `${base}/reports/agedreceivables?date=2026-04-30`;
  const apUrl   = `${base}/reports/agedpayables?date=2026-04-30`;

  const [custR, arR, apR] = await Promise.all([
    fetch(custUrl,  { headers: zbH }),
    fetch(arUrl,    { headers: zbH }),
    fetch(apUrl,    { headers: zbH }),
  ]);

  const [cust, ar, ap] = await Promise.all([
    custR.json(), arR.json(), apR.json()
  ]);

  return res.status(200).json({
    cust: { url: custUrl, status: custR.status, raw: cust },
    ar:   { url: arUrl,   status: arR.status,   raw: ar   },
    ap:   { url: apUrl,   status: apR.status,   raw: ap   },
  });
}
