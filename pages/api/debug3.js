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

  const custUrl = `${base}/reports/salesbycustomer?from_date=2026-04-01&to_date=2026-04-30&per_page=25`;
  const arUrl   = `${base}/reports/araging?from_date=2026-04-01&to_date=2026-04-30`;
  const apUrl   = `${base}/reports/apaging?from_date=2026-04-01&to_date=2026-04-30`;

  const [custR, arR, apR] = await Promise.all([
    fetch(custUrl, { headers: zbH }),
    fetch(arUrl,   { headers: zbH }),
    fetch(apUrl,   { headers: zbH }),
  ]);
  const [cust, ar, ap] = await Promise.all([custR.json(), arR.json(), apR.json()]);

  return res.status(200).json({
    cust: { status: custR.status, keys: Object.keys(cust), first_row: (cust.sales_by_customer || cust.contact_receivables || Object.values(cust)[1] || [])[0] || cust },
    ar:   { status: arR.status,   keys: Object.keys(ar),   first_row: (ar.ar_aging || ar.aged_receivables || ar.report_rows || Object.values(ar)[1] || [])[0] || ar },
    ap:   { status: apR.status,   keys: Object.keys(ap),   first_row: (ap.ap_aging || ap.aged_payables || ap.report_rows || Object.values(ap)[1] || [])[0] || ap },
  });
}
