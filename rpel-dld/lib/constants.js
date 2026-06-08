// ── CRISIL BENCHMARKS (source: CRISIL rating documents only) ─────────────────
export const CRISIL = {
  ebitdaMargin:  { trigger: 22,   label: 'EBITDA Margin',    unit: '%',  dir: 'up',   note: 'Upgrade trigger >22%' },
  nca:           { trigger: 37,   label: 'Net Cash Accruals', unit: 'Cr', dir: 'up',   note: 'Upgrade trigger >₹37 Cr' },
  interestCover: { trigger: 5,    label: 'Interest Coverage', unit: 'x',  dir: 'up',   note: 'Minimum >5x' },
  gearing:       { trigger: 1.0,  label: 'Gearing',           unit: 'x',  dir: 'down', note: 'Maximum <1.0x' },
  currentRatio:  { trigger: 1.2,  label: 'Current Ratio',     unit: 'x',  dir: 'up',   note: 'Minimum >1.2x' },
  debtorDays:    { trigger: 90,   label: 'Debtor Days',       unit: 'd',  dir: 'down', note: 'Target <90 days' },
  gcaDays:       { trigger: 230,  label: 'Gross WC Days',     unit: 'd',  dir: 'down', note: 'Downgrade trigger >230 days' },
  dscr:          { trigger: 1.2,  label: 'DSCR',              unit: 'x',  dir: 'up',   note: 'Minimum >1.2x' },
  debtEbitda:    { trigger: 3.0,  label: 'Debt/EBITDA',       unit: 'x',  dir: 'down', note: 'Maximum <3.0x' },
  roce:          { trigger: 20,   label: 'ROCE',              unit: '%',  dir: 'up',   note: 'Target >20%' },
  roe:           { trigger: 15,   label: 'ROE',               unit: '%',  dir: 'up',   note: 'Target >15%' },
  patMargin:     { trigger: 15,   label: 'PAT Margin',        unit: '%',  dir: 'up',   note: 'Target >15%' },
  // Upward scenario from latest CRISIL doc
  ncaUpgrade:    { trigger: 120,  label: 'NCA (upgrade path)', unit: 'Cr', dir: 'up',  note: 'Upward scenario >₹120 Cr' },
};

// ── HISTORICAL AUDITED DATA (CRISIL verified) ─────────────────────────────────
export const HIST = {
  FY24: {
    rev: 44.3, ebitda: 5.4, ebitdaM: 12.18, pat: 2.8, patM: 6.3,
    nca: 4.0, ic: 19.7, gearing: 0.09, cr: 4.1, debtorDays: 112,
    nw: 12.0, debt: 0.9, totalAssets: 18.0,
  },
  FY25: {
    rev: 133.5, ebitda: 38.9, ebitdaM: 29.11, pat: 25.9, patM: 19.4,
    nca: 27.9, ic: 57.9, gearing: 0.09, cr: 3.76, debtorDays: 112,
    nw: 75.0, debt: 6.5, totalAssets: 97.8, roce: 65.2, roe: 49.3,
  },
  FY26: {
    rev: 404.0, ebitda: 82.6, ebitdaM: 20.43, pat: 79.2, patM: 19.6,
    nca: 80.4, ic: 40.7, gearing: 0.14, cr: 1.77, debtorDays: 67,
    nw: 182.35, debt: 25.7, totalAssets: 296.1, roce: 56.0, roe: 61.5,
    dscr: 38.0, grossWcDays: 156, netWcDays: 76,
  },
};

// ── ZB VERIFIED ACTUALS — FY27 Apr 2026 (from Excel export) ──────────────────
// These are the confirmed figures used as cache/fallback
export const ZB27_CACHE = {
  // P&L
  rev: 134.79,
  cogs_main: 78.89, modules: 22.67, mms: 2.39, cogs_opex: 4.37,
  cogs: 108.32,
  gp: 26.47, gpM: 19.64,
  admin: 0.78, empWages: 0.10, empBen: 0.97, security: 0.17,
  fin: 0.38,
  taxExp: -1.08,
  ebit: 24.16, ebitM: 17.93,
  ebitda: 24.55, ebitdaM: 18.21,
  pat: 24.17, patM: 17.93,
  // Balance Sheet — Assets
  cashGross: 1.93,
  ccDrawn: 52.01,
  cashNet: -50.47,
  fdr: 35.47,
  rec: 88.64,
  advCred: 144.50,
  inventory: 35.27,
  cwip: 43.05,
  intangUdev: 21.45,
  fixedAssets: 86.89,
  totalCurAssets: 296.29,
  totalAssets: 383.19,
  // Balance Sheet — Liabilities
  tradePay: 29.35,
  advDebtor: 109.65,
  gstPay: 14.60,
  statLiab: 15.70,
  retMoney: 5.12,
  secLoan: 1.61,
  prov: 1.54,
  totalCurLiab: 179.78,
  totalLiab: 179.78,
  // Balance Sheet — Equity
  shareCap: 5.39,
  secPrem: 47.79,
  retained: 126.01,
  currEarn: 24.17,
  nw: 203.36,
  // Derived ratios
  debt: 53.62,
  gearing: 0.2637,
  cr: 1.65,
  ic: 63.2,
  // Cash Flow
  begCF: -27.80,
  opCF: -16.60,
  invCF: -6.07,
  endCF: -50.47,
  // Bank accounts (from Balance Sheet)
  banks: [
    { name: 'CC — Indian Overseas Bank', num: '015833000000082', bal: -52.01, type: 'cc' },
    { name: 'Current — HDFC Bank',        num: '05862560002088',  bal: 0.12,  type: 'current' },
    { name: 'Current — HDFC Bank',        num: '50200100161491',  bal: 0.85,  type: 'current' },
    { name: 'Current — IOB',              num: '015802000004426', bal: 0.57,  type: 'current' },
    { name: 'Current — Axis Bank',        num: '914020052760071', bal: 0.09,  type: 'current' },
    { name: 'OD — ICICI Bank',            num: '728505000247',    bal: -0.40, type: 'od' },
    { name: 'Current — Kotak',            num: '2911329324',      bal: 0.02,  type: 'current' },
    { name: 'Current — SBI',              num: '37592900478',     bal: 0.002, type: 'current' },
    { name: 'CSR Account — IOB',          num: '015802000004461', bal: 0.18,  type: 'current' },
  ],
  fetchedAt: 'ZB Excel — Apr 2026 (cached)',
  isLive: false,
};

// ── ORDER BOOK (from Order_Book.xlsx) ─────────────────────────────────────────
export const PROJECTS = [
  { id:1,  nm:'Wonder Cement Ph.2',    loc:'Nimbahera',   dc:18.5,  bess:25,   val:113.80, seg:'bess',   introFY:'26', hasBESS:true,  govtOnly:false },
  { id:2,  nm:'Inox Air Ph.2',         loc:'Kalol',       dc:5.5,   bess:10,   val:43.20,  seg:'bess',   introFY:'26', hasBESS:true,  govtOnly:false },
  { id:3,  nm:'BKT Industries',        loc:'Chopanki',    dc:7.2,   bess:5,    val:28.11,  seg:'bess',   introFY:'26', hasBESS:true,  govtOnly:false },
  { id:4,  nm:'Saville',               loc:'Bhiwadi',     dc:4.8,   bess:5,    val:22.40,  seg:'bess',   introFY:'26', hasBESS:true,  govtOnly:false },
  { id:5,  nm:'ASK',                   loc:'Neemrana',    dc:6.0,   bess:10,   val:31.50,  seg:'bess',   introFY:'26', hasBESS:true,  govtOnly:false },
  { id:6,  nm:'Uttam Strips',          loc:'Palwal',      dc:22.0,  bess:20,   val:87.40,  seg:'bess',   introFY:'26', hasBESS:true,  govtOnly:false },
  { id:7,  nm:'Soni International',    loc:'Jodhpur',     dc:3.5,   bess:3,    val:16.20,  seg:'bess',   introFY:'26', hasBESS:true,  govtOnly:false },
  { id:8,  nm:'Lords Chloro Ph.2',     loc:'Kota',        dc:8.0,   bess:8,    val:38.70,  seg:'bess',   introFY:'26', hasBESS:true,  govtOnly:false },
  { id:9,  nm:'Miracle Coro Plast',    loc:'Bhiwadi',     dc:3.2,   bess:0,    val:10.10,  seg:'epc',    introFY:'27', hasBESS:false, govtOnly:false },
  { id:10, nm:'Alliance Polysacks',    loc:'Neemrana',    dc:2.8,   bess:0,    val:9.82,   seg:'epc',    introFY:'27', hasBESS:false, govtOnly:false },
  { id:11, nm:'Raksha Bars',           loc:'Bhiwadi',     dc:2.0,   bess:0,    val:6.85,   seg:'epc',    introFY:'27', hasBESS:false, govtOnly:false },
  { id:12, nm:'Ravi Surya Dev.',       loc:'Lunkaransar', dc:2.08,  bess:0,    val:6.14,   seg:'epc',    introFY:'27', hasBESS:false, govtOnly:false },
  { id:13, nm:'Diligent Pinkcity',     loc:'Jaipur',      dc:1.2,   bess:0,    val:3.85,   seg:'epc',    introFY:'27', hasBESS:false, govtOnly:false },
  { id:14, nm:'Shree Ananta Homes',    loc:'Bhamatsar',   dc:0.3,   bess:0,    val:0.90,   seg:'epc',    introFY:'27', hasBESS:false, govtOnly:false },
  { id:15, nm:'Metallic Rolls',        loc:'Bhamatsar',   dc:0.52,  bess:0,    val:1.53,   seg:'epc',    introFY:'27', hasBESS:false, govtOnly:false },
  { id:16, nm:'JSW',                   loc:'Pugal',       dc:72.5,  bess:0,    val:203.73, seg:'parks',  introFY:'27', hasBESS:false, govtOnly:false },
  { id:17, nm:'Wonder Cement Ph.3',    loc:'SS Nagar',    dc:75.0,  bess:0,    val:210.75, seg:'parks',  introFY:'27', hasBESS:false, govtOnly:false },
  { id:18, nm:'RVUNL (Govt BESS)',     loc:'Heerapura',   dc:0,     bess:150,  val:238.68, seg:'all',    introFY:'27', hasBESS:false, govtOnly:true  },
  { id:19, nm:'NTPC (Govt BESS)',      loc:'Surpura',     dc:0,     bess:100,  val:156.00, seg:'all',    introFY:'27', hasBESS:false, govtOnly:true  },
];

export const OM_PROJECTS = [
  { nm:'Brys Hotels',          mw:'~1.2 MW', annualUnits:28  },
  { nm:'SLD 2nd',              mw:'~0.8 MW', annualUnits:19  },
  { nm:'NAMDEV',               mw:'~0.5 MW', annualUnits:12  },
  { nm:'QUALITY GUMS',         mw:'~0.6 MW', annualUnits:14  },
  { nm:'SHREE BALAJI',         mw:'~0.8 MW', annualUnits:19  },
  { nm:'Wonder Cement Ph.1',   mw:'~8.0 MW', annualUnits:180 },
  { nm:'DESAI',                mw:'~0.4 MW', annualUnits:10  },
  { nm:'BOROSIL',              mw:'~2.5 MW', annualUnits:58  },
  { nm:'VIBRANT',              mw:'~0.6 MW', annualUnits:14  },
  { nm:'Hind Chemisales',      mw:'~0.5 MW', annualUnits:12  },
  { nm:'UDYOG MANDIR',         mw:'~0.4 MW', annualUnits:10  },
  { nm:'Vishnu Vivek Marbles', mw:'~0.3 MW', annualUnits:7   },
  { nm:'Aman Hospitality',     mw:'~1.5 MW', annualUnits:35  },
  { nm:'RAHUL INDUCTION',      mw:'~0.5 MW', annualUnits:12  },
  { nm:'KEY STONE',            mw:'~1.2 MW', annualUnits:28  },
];

// Order book summary
export const OB = {
  total:   1256.98,
  active:   862.30,
  govt:     394.68,
  bessVal:  381.31,
  dcMwp:    236.10,
};
