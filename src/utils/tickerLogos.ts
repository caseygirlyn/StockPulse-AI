/**
 * Authoritative Ticker Logo & Domain Resolution Service
 * Ensures accurate brand logos for equities, ETFs, and international listings.
 */

export const KNOWN_TICKER_DOMAINS: Record<string, string> = {
  // Coca-Cola (Fixes tiny generic icon from corporate domain)
  'KO': 'coca-cola.com',
  'COKE': 'coca-cola.com',
  'CCH': 'coca-colaep.com',
  'CCH.L': 'coca-colaep.com',
  'KOF': 'femsa.com',

  // Barclays (Fixes erroneous barc.com fallback)
  'BARC': 'barclays.co.uk',
  'BARC.L': 'barclays.co.uk',
  'BCS': 'barclays.co.uk',

  // Vanguard ETFs (Fixes erroneous vuag.com / vusa.com fallbacks)
  'VUAG': 'vanguard.com',
  'VUAG.L': 'vanguard.com',
  'VUSA': 'vanguard.com',
  'VUSA.L': 'vanguard.com',
  'VOO': 'vanguard.com',
  'VTI': 'vanguard.com',
  'VWRP': 'vanguard.com',
  'VWRP.L': 'vanguard.com',
  'VWRL': 'vanguard.com',
  'VWRL.L': 'vanguard.com',
  'VHYL': 'vanguard.com',
  'VHYL.L': 'vanguard.com',
  'VT': 'vanguard.com',
  'BND': 'vanguard.com',
  'VNQ': 'vanguard.com',
  'VXUS': 'vanguard.com',
  'VGT': 'vanguard.com',
  'VUG': 'vanguard.com',
  'VTV': 'vanguard.com',
  'VEU': 'vanguard.com',
  'VIG': 'vanguard.com',
  'VYM': 'vanguard.com',
  'VCSH': 'vanguard.com',
  'VCIT': 'vanguard.com',
  'BNDX': 'vanguard.com',
  'VXF': 'vanguard.com',
  'VB': 'vanguard.com',
  'VO': 'vanguard.com',
  'VHT': 'vanguard.com',
  'VFH': 'vanguard.com',
  'VAW': 'vanguard.com',
  'VDE': 'vanguard.com',
  'VIS': 'vanguard.com',
  'VNQI': 'vanguard.com',
  'VSS': 'vanguard.com',
  'VPU': 'vanguard.com',
  'VOX': 'vanguard.com',

  // iShares / BlackRock ETFs
  'CSPX': 'ishares.com',
  'CSPX.L': 'ishares.com',
  'CSP1': 'ishares.com',
  'CSP1.L': 'ishares.com',
  'SXR8': 'ishares.com',
  'IVV': 'ishares.com',
  'IUSA': 'ishares.com',
  'IUSA.L': 'ishares.com',
  'INRG': 'ishares.com',
  'INRG.L': 'ishares.com',
  'CNDX': 'ishares.com',
  'EQAC': 'ishares.com',
  'EEM': 'ishares.com',
  'IWM': 'ishares.com',
  'AGG': 'ishares.com',
  'IEFA': 'ishares.com',
  'IEMG': 'ishares.com',
  'IJH': 'ishares.com',
  'IJR': 'ishares.com',
  'TLT': 'ishares.com',
  'SHY': 'ishares.com',
  'IEF': 'ishares.com',
  'LQD': 'ishares.com',
  'HYG': 'ishares.com',

  // Invesco ETFs
  'QQQ': 'invesco.com',
  'QQQM': 'invesco.com',
  'EQQQ': 'invesco.com',
  'EQQQ.L': 'invesco.com',

  // State Street / SPDR ETFs
  'SPY': 'ssga.com',
  'SPYD': 'ssga.com',
  'SPYG': 'ssga.com',
  'GLD': 'ssga.com',
  'XLF': 'ssga.com',
  'XLK': 'ssga.com',
  'XLE': 'ssga.com',
  'XLI': 'ssga.com',
  'XLV': 'ssga.com',
  'XLY': 'ssga.com',
  'XLP': 'ssga.com',
  'XLU': 'ssga.com',
  'XLB': 'ssga.com',
  'XLC': 'ssga.com',
  'XBI': 'ssga.com',
  'KRE': 'ssga.com',

  // Rolls-Royce & Defense
  'RR': 'rolls-royce.com',
  'RR.L': 'rolls-royce.com',
  'RYCEY': 'rolls-royce.com',
  'BA.L': 'baesystems.com',

  // UK & European Equities
  'LLOY': 'lloydsbank.com',
  'LLOY.L': 'lloydsbank.com',
  'LYG': 'lloydsbank.com',
  'NWG': 'natwest.com',
  'NWG.L': 'natwest.com',
  'HSBA': 'hsbc.com',
  'HSBA.L': 'hsbc.com',
  'HSBC': 'hsbc.com',
  'STAN': 'sc.com',
  'STAN.L': 'sc.com',
  'BP': 'bp.com',
  'BP.L': 'bp.com',
  'SHEL': 'shell.com',
  'SHEL.L': 'shell.com',
  'AZN': 'astrazeneca.com',
  'AZN.L': 'astrazeneca.com',
  'GSK': 'gsk.com',
  'GSK.L': 'gsk.com',
  'TSCO': 'tescoplc.com',
  'TSCO.L': 'tescoplc.com',
  'MKS': 'marksandspencer.com',
  'MKS.L': 'marksandspencer.com',
  'JD': 'jdsportsplc.com',
  'JD.L': 'jdsportsplc.com',
  'NEXT': 'nextplc.co.uk',
  'NEXT.L': 'nextplc.co.uk',
  'VOD': 'vodafone.com',
  'VOD.L': 'vodafone.com',
  'BT.A': 'bt.com',
  'BT-A.L': 'bt.com',
  'BT.L': 'bt.com',
  'DGE': 'diageo.com',
  'DGE.L': 'diageo.com',
  'DEO': 'diageo.com',
  'ULVR': 'unilever.com',
  'ULVR.L': 'unilever.com',
  'UL': 'unilever.com',
  'BATS': 'bat.com',
  'BATS.L': 'bat.com',
  'BTI': 'bat.com',
  'RIO': 'riotinto.com',
  'RIO.L': 'riotinto.com',
  'GLEN': 'glencore.com',
  'GLEN.L': 'glencore.com',
  'AAL': 'angloamerican.com',
  'AAL.L': 'angloamerican.com',
  'NG': 'nationalgrid.com',
  'NG.L': 'nationalgrid.com',
  'REL': 'relx.com',
  'REL.L': 'relx.com',
  'LSEG': 'lseg.com',
  'LSEG.L': 'lseg.com',
  'PRU': 'prudentialplc.com',
  'PRU.L': 'prudentialplc.com',
  'AV': 'aviva.com',
  'AV.L': 'aviva.com',
  'LGEN': 'legalandgeneral.com',
  'LGEN.L': 'legalandgeneral.com',
  'WTB': 'whitbread.co.uk',
  'WTB.L': 'whitbread.co.uk',
  'EXPN': 'experian.com',
  'EXPN.L': 'experian.com',

  // Tech, AI & Blue Chips
  'NVDA': 'nvidia.com',
  'AAPL': 'apple.com',
  'MSFT': 'microsoft.com',
  'GOOGL': 'google.com',
  'GOOG': 'google.com',
  'AMZN': 'amazon.com',
  'META': 'meta.com',
  'TSLA': 'tesla.com',
  'AMD': 'amd.com',
  'INTC': 'intel.com',
  'MU': 'micron.com',
  'NFLX': 'netflix.com',
  'DIS': 'thewaltdisneycompany.com',
  'BABA': 'alibaba.com',
  'PLTR': 'palantir.com',
  'ARM': 'arm.com',
  'ASML': 'asml.com',
  'JPM': 'jpmorganchase.com',
  'V': 'visa.com',
  'MA': 'mastercard.com',
  'WMT': 'walmart.com',
  'LLY': 'lilly.com',
  'AVGO': 'broadcom.com',
  'ORCL': 'oracle.com',
  'CSCO': 'cisco.com',
  'ADBE': 'adobe.com',
  'UBER': 'uber.com',
  'SPOT': 'spotify.com',
  'COIN': 'coinbase.com',
  'PYPL': 'paypal.com',
  'BA': 'boeing.com',
  'CAT': 'caterpillar.com',
  'GS': 'goldmansachs.com',
  'MS': 'morganstanley.com',
  'NKE': 'nike.com',
  'SBUX': 'starbucks.com',
  'PEP': 'pepsico.com',
  'COST': 'costco.com',
  'QCOM': 'qualcomm.com',
  'TXN': 'ti.com',
  'SONY': 'sony.com',
  'TSM': 'tsmc.com',
  'CRM': 'salesforce.com',
  'SNOW': 'snowflake.com',
  'NOW': 'servicenow.com',
  'PANW': 'paloaltonetworks.com',
  'CRWD': 'crowdstrike.com',
  'SHOP': 'shopify.com',
  'SQ': 'block.xyz',
  'ABNB': 'airbnb.com',
  'PFE': 'pfizer.com',
  'MRK': 'merck.com',
  'ABBV': 'abbvie.com',
  'JNJ': 'jnj.com',
  'C': 'citigroup.com',
  'WFC': 'wellsfargo.com',
  'AXP': 'americanexpress.com',
  'BLK': 'blackrock.com',
  'SCHW': 'schwab.com',
  'XOM': 'exxonmobil.com',
  'CVX': 'chevron.com',
  'T': 'att.com',
  'VZ': 'verizon.com',
  'F': 'ford.com',
  'GM': 'gm.com',
  'RIVN': 'rivian.com',
  'LCID': 'lucidmotors.com',
  'DE': 'deere.com',
  'MMM': '3m.com',
  'HON': 'honeywell.com',
  'GE': 'geaerospace.com'
};

// Known erroneous/broken domains that should always be corrected
const BAD_DOMAINS_MAP: Record<string, string> = {
  'barc.com': 'barclays.co.uk',
  'vuag.com': 'vanguard.com',
  'vusa.com': 'vanguard.com',
  'vwrp.com': 'vanguard.com',
  'vwrl.com': 'vanguard.com',
  'coca-colacompany.com': 'coca-cola.com',
  'cspx.com': 'ishares.com',
  'csp1.com': 'ishares.com',
  'sxr8.com': 'ishares.com'
};

/**
 * Resolves the authoritative domain for a given ticker or company name
 */
export function getAuthoritativeDomain(ticker: string, companyName?: string): string | null {
  const cleanTicker = (ticker || '').trim().toUpperCase();
  if (!cleanTicker) return null;

  // Direct lookup
  if (KNOWN_TICKER_DOMAINS[cleanTicker]) {
    return KNOWN_TICKER_DOMAINS[cleanTicker];
  }

  // Base ticker without exchange suffix (e.g., 'BARC.L' -> 'BARC', 'VUAG.L' -> 'VUAG')
  const baseTicker = cleanTicker.split('.')[0];
  if (KNOWN_TICKER_DOMAINS[baseTicker]) {
    return KNOWN_TICKER_DOMAINS[baseTicker];
  }

  // Keyword heuristic based on company name
  if (companyName) {
    const lowerName = companyName.toLowerCase();
    if (lowerName.includes('coca-cola') || lowerName.includes('coca cola') || lowerName.includes('coke')) {
      return 'coca-cola.com';
    }
    if (lowerName.includes('barclays')) {
      return 'barclays.co.uk';
    }
    if (lowerName.includes('vanguard') || lowerName.includes('s&p 500 ucits etf') || lowerName.includes('ftse all-world')) {
      return 'vanguard.com';
    }
    if (lowerName.includes('ishares') || lowerName.includes('blackrock')) {
      return 'ishares.com';
    }
    if (lowerName.includes('invesco')) {
      return 'invesco.com';
    }
    if (lowerName.includes('rolls-royce') || lowerName.includes('rolls royce')) {
      return 'rolls-royce.com';
    }
    if (lowerName.includes('lloyds')) {
      return 'lloydsbank.com';
    }
    if (lowerName.includes('natwest')) {
      return 'natwest.com';
    }
    if (lowerName.includes('hsbc')) {
      return 'hsbc.com';
    }
    if (lowerName.includes('spdr') || lowerName.includes('state street')) {
      return 'ssga.com';
    }
  }

  return null;
}

/**
 * Returns a high-res Google Favicon URL for a given domain
 */
export function formatFaviconUrl(domain: string): string {
  const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanDomain}&size=128`;
}

export const CUSTOM_TICKER_LOGOS: Record<string, string> = {
  'KO': '/logos/ko.svg',
  'COKE': '/logos/ko.svg',
};

/**
 * Resolves or repairs a ticker logo URL, ensuring known tickers (Coke, Barclays, VUAG, etc.)
 * point to their verified high-res logos.
 */
export function resolveTickerLogoUrl(ticker: string, currentUrl?: string, companyName?: string): string {
  const cleanTicker = (ticker || '').trim().toUpperCase();
  const baseTicker = cleanTicker.split('.')[0];

  // 1. Direct custom high-fidelity SVG logos (e.g. Coca-Cola's iconic red disc badge)
  if (CUSTOM_TICKER_LOGOS[cleanTicker]) {
    return CUSTOM_TICKER_LOGOS[cleanTicker];
  }
  if (CUSTOM_TICKER_LOGOS[baseTicker]) {
    return CUSTOM_TICKER_LOGOS[baseTicker];
  }
  if (companyName) {
    const lowerName = companyName.toLowerCase();
    if (lowerName.includes('coca-cola') || lowerName.includes('coca cola') || lowerName.includes('coke')) {
      return '/logos/ko.svg';
    }
  }

  // 2. Check if currentUrl uses an erroneous or custom domain
  if (currentUrl) {
    if (currentUrl.startsWith('/logos/')) {
      return currentUrl;
    }
    if (currentUrl.includes('coca-cola') || currentUrl.includes('coca-colacompany')) {
      return '/logos/ko.svg';
    }
    for (const [badDomain, goodDomain] of Object.entries(BAD_DOMAINS_MAP)) {
      if (currentUrl.includes(badDomain)) {
        return formatFaviconUrl(goodDomain);
      }
    }
  }

  // 3. Authoritative domain override
  const authDomain = getAuthoritativeDomain(cleanTicker, companyName);
  if (authDomain) {
    if (authDomain === 'coca-cola.com' || authDomain === 'coca-colacompany.com') {
      return '/logos/ko.svg';
    }
    return formatFaviconUrl(authDomain);
  }

  // If already a valid URL and not known to be bad, keep it
  if (currentUrl && currentUrl.startsWith('http')) {
    return currentUrl;
  }

  // Fallback to baseTicker.com
  return formatFaviconUrl(`${baseTicker.toLowerCase()}.com`);
}

/**
 * Authoritative registry of full official corporate and ETF names.
 * Ensures the full company name is displayed below tickers throughout the app.
 */
export const KNOWN_TICKER_NAMES: Record<string, string> = {
  // Coca-Cola
  'KO': 'The Coca-Cola Company',
  'COKE': 'Coca-Cola Consolidated, Inc.',
  'CCH': 'Coca-Cola Europacific Partners plc',
  'CCH.L': 'Coca-Cola Europacific Partners plc',
  'KOF': 'Coca-Cola FEMSA, S.A.B. de C.V.',

  // Barclays
  'BARC': 'Barclays PLC',
  'BARC.L': 'Barclays PLC',
  'BCS': 'Barclays PLC',

  // Major UK / London Listings
  'HSBA': 'HSBC Holdings plc',
  'HSBA.L': 'HSBC Holdings plc',
  'LGEN': 'Legal & General Group Plc',
  'LGEN.L': 'Legal & General Group Plc',
  'RR': 'Rolls-Royce Holdings plc',
  'RR.L': 'Rolls-Royce Holdings plc',
  'LLOY': 'Lloyds Banking Group plc',
  'LLOY.L': 'Lloyds Banking Group plc',
  'NWG': 'NatWest Group plc',
  'NWG.L': 'NatWest Group plc',
  'BP': 'BP p.l.c.',
  'BP.L': 'BP p.l.c.',
  'SHEL': 'Shell plc',
  'SHEL.L': 'Shell plc',
  'AZN': 'AstraZeneca PLC',
  'AZN.L': 'AstraZeneca PLC',
  'GSK': 'GSK plc',
  'GSK.L': 'GSK plc',
  'RIO': 'Rio Tinto Group',
  'RIO.L': 'Rio Tinto Group',
  'GLEN': 'Glencore plc',
  'GLEN.L': 'Glencore plc',
  'BATS': 'British American Tobacco p.l.c.',
  'BATS.L': 'British American Tobacco p.l.c.',
  'DGE': 'Diageo plc',
  'DGE.L': 'Diageo plc',
  'ULVR': 'Unilever PLC',
  'ULVR.L': 'Unilever PLC',
  'REL': 'RELX PLC',
  'REL.L': 'RELX PLC',
  'LSEG': 'London Stock Exchange Group plc',
  'LSEG.L': 'London Stock Exchange Group plc',
  'VOD': 'Vodafone Group Plc',
  'VOD.L': 'Vodafone Group Plc',
  'BA': 'BAE Systems plc',
  'BA.L': 'BAE Systems plc',
  'TSCO': 'Tesco PLC',
  'TSCO.L': 'Tesco PLC',

  // Vanguard ETFs
  'VUAG': 'Vanguard S&P 500 UCITS ETF (USD) Accumulating',
  'VUAG.L': 'Vanguard S&P 500 UCITS ETF (USD) Accumulating',
  'VUSA': 'Vanguard S&P 500 UCITS ETF (USD) Distributing',
  'VUSA.L': 'Vanguard S&P 500 UCITS ETF (USD) Distributing',
  'VWRP': 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating',
  'VWRP.L': 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating',
  'VWRL': 'Vanguard FTSE All-World UCITS ETF (USD) Distributing',
  'VWRL.L': 'Vanguard FTSE All-World UCITS ETF (USD) Distributing',
  'VHYL': 'Vanguard FTSE All-World High Dividend Yield UCITS ETF',
  'VHYL.L': 'Vanguard FTSE All-World High Dividend Yield UCITS ETF',
  'VOO': 'Vanguard S&P 500 ETF',
  'VTI': 'Vanguard Total Stock Market ETF',
  'VT': 'Vanguard Total World Stock ETF',
  'BND': 'Vanguard Total Bond Market ETF',
  'VNQ': 'Vanguard Real Estate ETF',
  'VXUS': 'Vanguard Total International Stock ETF',
  'VGT': 'Vanguard Information Technology ETF',
  'VUG': 'Vanguard Growth ETF',
  'VTV': 'Vanguard Value ETF',

  // iShares / BlackRock & Invesco
  'CSPX': 'iShares Core S&P 500 UCITS ETF',
  'CSPX.L': 'iShares Core S&P 500 UCITS ETF',
  'IVV': 'iShares Core S&P 500 ETF',
  'IE00B5BMR087': 'iShares Core S&P 500 UCITS ETF',
  'IUSA': 'iShares S&P 500 UCITS ETF',
  'IUSA.L': 'iShares S&P 500 UCITS ETF',
  'INRG': 'iShares Global Clean Energy UCITS ETF',
  'INRG.L': 'iShares Global Clean Energy UCITS ETF',
  'CNX1': 'iShares NASDAQ 100 UCITS ETF',
  'CNX1.L': 'iShares NASDAQ 100 UCITS ETF',
  'EQGB': 'Invesco EQQQ NASDAQ-100 UCITS ETF',
  'EQGB.L': 'Invesco EQQQ NASDAQ-100 UCITS ETF',
  'EQQQ': 'Invesco EQQQ NASDAQ-100 UCITS ETF',
  'EQQQ.L': 'Invesco EQQQ NASDAQ-100 UCITS ETF',
  'QQQ': 'Invesco QQQ Trust',
  'SPY': 'SPDR S&P 500 ETF Trust',
  'DIA': 'SPDR Dow Jones Industrial Average ETF Trust',

  // Mega Tech & AI
  'NVDA': 'NVIDIA Corporation',
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'AMZN': 'Amazon.com, Inc.',
  'GOOGL': 'Alphabet Inc. (Class A)',
  'GOOG': 'Alphabet Inc. (Class C)',
  'META': 'Meta Platforms, Inc.',
  'TSLA': 'Tesla, Inc.',
  'AVGO': 'Broadcom Inc.',
  'AMD': 'Advanced Micro Devices, Inc.',
  'INTC': 'Intel Corporation',
  'QCOM': 'Qualcomm Incorporated',
  'MU': 'Micron Technology, Inc.',
  'ARM': 'Arm Holdings plc',
  'TSM': 'Taiwan Semiconductor Manufacturing Company',
  'ASML': 'ASML Holding N.V.',
  'SMCI': 'Super Micro Computer, Inc.',
  'DELL': 'Dell Technologies Inc.',
  'ORCL': 'Oracle Corporation',
  'CRM': 'Salesforce, Inc.',
  'ADBE': 'Adobe Inc.',
  'PLTR': 'Palantir Technologies Inc.',
  'SNOW': 'Snowflake Inc.',
  'PANW': 'Palo Alto Networks, Inc.',
  'CRWD': 'CrowdStrike Holdings, Inc.',
  'NET': 'Cloudflare, Inc.',
  'DDOG': 'Datadog, Inc.',

  // Financials
  'JPM': 'JPMorgan Chase & Co.',
  'BAC': 'Bank of America Corporation',
  'WFC': 'Wells Fargo & Company',
  'GS': 'The Goldman Sachs Group, Inc.',
  'MS': 'Morgan Stanley',
  'BLK': 'BlackRock, Inc.',
  'V': 'Visa Inc.',
  'MA': 'Mastercard Incorporated',
  'AXP': 'American Express Company',
  'PYPL': 'PayPal Holdings, Inc.',
  'SQ': 'Block, Inc.',
  'COIN': 'Coinbase Global, Inc.',
  'HOOD': 'Robinhood Markets, Inc.',
  'BRK.A': 'Berkshire Hathaway Inc. (Class A)',
  'BRK.B': 'Berkshire Hathaway Inc. (Class B)',
  'BRK-B': 'Berkshire Hathaway Inc. (Class B)',

  // Consumer & Retail
  'WMT': 'Walmart Inc.',
  'COST': 'Costco Wholesale Corporation',
  'TGT': 'Target Corporation',
  'HD': 'The Home Depot, Inc.',
  'LOW': 'Lowe\'s Companies, Inc.',
  'PG': 'The Procter & Gamble Company',
  'PEP': 'PepsiCo, Inc.',
  'MCD': 'McDonald\'s Corporation',
  'SBUX': 'Starbucks Corporation',
  'NKE': 'NIKE, Inc.',
  'DIS': 'The Walt Disney Company',
  'NFLX': 'Netflix, Inc.',
  'SPOT': 'Spotify Technology S.A.',
  'UBER': 'Uber Technologies, Inc.',
  'ABNB': 'Airbnb, Inc.',

  // Healthcare
  'LLY': 'Eli Lilly and Company',
  'NVO': 'Novo Nordisk A/S',
  'JNJ': 'Johnson & Johnson',
  'UNH': 'UnitedHealth Group Incorporated',
  'ABBV': 'AbbVie Inc.',
  'MRK': 'Merck & Co., Inc.',
  'PFE': 'Pfizer Inc.',
  'TMO': 'Thermo Fisher Scientific Inc.',
  'ABT': 'Abbott Laboratories',

  // Energy & Industrial
  'XOM': 'Exxon Mobil Corporation',
  'CVX': 'Chevron Corporation',
  'CAT': 'Caterpillar Inc.',
  'GE': 'GE Aerospace',
  'HON': 'Honeywell International Inc.',
  'LMT': 'Lockheed Martin Corporation',
  'RTX': 'RTX Corporation',
};

/**
 * Resolves the official, clean company or asset name for a ticker.
 * E.g. "KO" -> "The Coca-Cola Company"
 * E.g. "Coca-Cola Company (The)" -> "The Coca-Cola Company"
 * E.g. "BARCLAYS PLC ORD 25P" -> "Barclays PLC"
 */
export function getAuthoritativeCompanyName(ticker: string, candidateName?: string): string {
  const cleanTicker = (ticker || '').trim().toUpperCase();
  const baseTicker = cleanTicker.split('.')[0];

  // 1. Direct authoritative lookup
  if (KNOWN_TICKER_NAMES[cleanTicker]) {
    return KNOWN_TICKER_NAMES[cleanTicker];
  }
  if (KNOWN_TICKER_NAMES[baseTicker]) {
    return KNOWN_TICKER_NAMES[baseTicker];
  }

  // 2. If candidateName is valid and not just the raw ticker
  if (candidateName && candidateName.trim() && candidateName.trim().toUpperCase() !== cleanTicker && candidateName.trim().toUpperCase() !== baseTicker) {
    let name = candidateName.trim();
    
    // Normalize "Company Name (The)" -> "The Company Name"
    if (name.endsWith(' (The)') || name.endsWith(' (THE)')) {
      name = 'The ' + name.slice(0, -6).trim();
    }
    
    // Strip London share suffix clutters like "ORD 25P", "ORD 5P", "ORD 10P", "ORD USD0.25", "REG S"
    name = name.replace(/\s+ORD\s+.*$/i, '');
    name = name.replace(/\s+REG\s+S.*$/i, '');
    name = name.replace(/\s+ADR.*$/i, '');

    // Title case if ALL CAPS
    if (name.length > 4 && name === name.toUpperCase() && !name.includes('ETF')) {
      name = name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      name = name.replace(/\bPlc\b/g, 'PLC').replace(/\bInc\b/g, 'Inc.').replace(/\bLlc\b/g, 'LLC').replace(/\bCorp\b/g, 'Corp.');
    }

    if (name.length > 0) {
      return name;
    }
  }

  // Fallback to cleanTicker
  return cleanTicker;
}
