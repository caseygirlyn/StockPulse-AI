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
  'NESN': 'nestle.com',
  'NESN.SW': 'nestle.com',
  'NSRGY': 'nestle.com',
  'NOVN': 'novartis.com',
  'NOVN.SW': 'novartis.com',
  'NVS': 'novartis.com',
  'ROG': 'roche.com',
  'ROG.SW': 'roche.com',
  'RO.SW': 'roche.com',
  'RHHBY': 'roche.com',
  'UBSG': 'ubs.com',
  'UBSG.SW': 'ubs.com',
  'UBS': 'ubs.com',
  'ABBN': 'abb.com',
  'ABBN.SW': 'abb.com',
  'ABBNY': 'abb.com',
  'ZURN': 'zurich.com',
  'ZURN.SW': 'zurich.com',
  'ZURVY': 'zurich.com',
  'CFR': 'richemont.com',
  'CFR.SW': 'richemont.com',
  'LONN': 'lonza.com',
  'LONN.SW': 'lonza.com',
  'SIKA': 'sika.com',
  'SIKA.SW': 'sika.com',
  'GIVN': 'givaudan.com',
  'GIVN.SW': 'givaudan.com',
  'ALC': 'alcon.com',
  'ALC.SW': 'alcon.com',
  'SCMN': 'swisscom.ch',
  'SCMN.SW': 'swisscom.ch',
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
  'BT': 'bt.com',
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

  'BA': 'boeing.com',
  'BAESY': 'baesystems.com',
  'LMT': 'lockheedmartin.com',
  'RTX': 'rtx.com',
  'NOC': 'northropgrumman.com',
  'GD': 'gd.com',
  'CAT': 'caterpillar.com',
  'DE': 'deere.com',
  'GE': 'geaerospace.com',
  'GEV': 'gevernova.com',
  'HON': 'honeywell.com',
  'MMM': '3m.com',
  'ETN': 'eaton.com',
  'PH': 'ph.com',
  'EMR': 'emerson.com',
  'ROK': 'rockwellautomation.com',
  'PCAR': 'paccar.com',
  'TDG': 'transdigm.com',
  'CSX': 'csx.com',
  'UNP': 'up.com',
  'NSC': 'nscorp.com',
  'FDX': 'fedex.com',
  'UPS': 'ups.com',
  'DAL': 'delta.com',
  'UAL': 'united.com',
  'LUV': 'southwest.com',

  // Tech, AI & Cloud Leaders
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
  'DIS': 'disney.com',
  'BABA': 'alibaba.com',
  'PLTR': 'palantir.com',
  'ARM': 'arm.com',
  'ASML': 'asml.com',
  'SAP': 'sap.com',
  'SAP.DE': 'sap.com',
  'SMCI': 'supermicro.com',
  'MSTR': 'microstrategy.com',
  'DELL': 'dell.com',
  'ORCL': 'oracle.com',
  'CRM': 'salesforce.com',
  'ADBE': 'adobe.com',
  'SNOW': 'snowflake.com',
  'NOW': 'servicenow.com',
  'PANW': 'paloaltonetworks.com',
  'CRWD': 'crowdstrike.com',
  'NET': 'cloudflare.com',
  'DDOG': 'datadoghq.com',
  'MDB': 'mongodb.com',
  'ZS': 'zscaler.com',
  'FTNT': 'fortinet.com',
  'OKTA': 'okta.com',
  'ESTC': 'elastic.co',
  'DOCU': 'docusign.com',
  'HUBS': 'hubspot.com',
  'TWLO': 'twilio.com',
  'TEAM': 'atlassian.com',
  'WDAY': 'workday.com',
  'ZM': 'zoom.us',
  'CSCO': 'cisco.com',
  'AVGO': 'broadcom.com',
  'QCOM': 'qualcomm.com',
  'TXN': 'ti.com',
  'SONY': 'sony.com',
  'TSM': 'tsmc.com',
  'UBER': 'uber.com',
  'LYFT': 'lyft.com',
  'DASH': 'doordash.com',
  'SPOT': 'spotify.com',
  'SHOP': 'shopify.com',
  'ABNB': 'airbnb.com',
  'RDDT': 'reddit.com',
  'APP': 'applovin.com',
  'RKLB': 'rocketlabusa.com',
  'ASTS': 'ast-science.com',
  'HIMS': 'hims.com',
  'DKNG': 'draftkings.com',
  'PINS': 'pinterest.com',
  'SNAP': 'snap.com',
  'ROKU': 'roku.com',
  'TTD': 'thetradedesk.com',
  'SE': 'sea.com',
  'GRAB': 'grab.com',
  'MELI': 'mercadolibre.com',
  'NU': 'nubank.com.br',
  'PDD': 'pddholdings.com',
  'BIDU': 'baidu.com',
  'NTES': 'netease.com',
  'TCEHY': 'tencent.com',

  // Financials & Wealth
  'JPM': 'jpmorganchase.com',
  'BAC': 'bankofamerica.com',
  'WFC': 'wellsfargo.com',
  'C': 'citigroup.com',
  'GS': 'goldmansachs.com',
  'MS': 'morganstanley.com',
  'BLK': 'blackrock.com',
  'SCHW': 'schwab.com',
  'IBKR': 'interactivebrokers.com',
  'AXP': 'americanexpress.com',
  'V': 'visa.com',
  'MA': 'mastercard.com',
  'PYPL': 'paypal.com',
  'SQ': 'block.xyz',
  'COIN': 'coinbase.com',
  'HOOD': 'robinhood.com',
  'SOFI': 'sofi.com',
  'BRK.A': 'berkshirehathaway.com',
  'BRK.B': 'berkshirehathaway.com',
  'BRK-A': 'berkshirehathaway.com',
  'BRK-B': 'berkshirehathaway.com',
  'BRK': 'berkshirehathaway.com',

  // Consumer & Retail
  'WMT': 'walmart.com',
  'COST': 'costco.com',
  'TGT': 'target.com',
  'HD': 'homedepot.com',
  'LOW': 'lowes.com',
  'PG': 'pg.com',
  'PEP': 'pepsico.com',
  'MCD': 'mcdonalds.com',
  'SBUX': 'starbucks.com',
  'NKE': 'nike.com',
  'LULU': 'lululemon.com',
  'CMG': 'chipotle.com',
  'TJX': 'tjx.com',
  'ROST': 'rossstores.com',
  'YUM': 'yum.com',
  'DPZ': 'dominos.com',
  'MNST': 'monsterenergy.com',
  'KDP': 'keurigdrpepper.com',
  'CL': 'colgatepalmolive.com',
  'EL': 'elcompanies.com',

  // Healthcare & Life Sciences
  'LLY': 'lilly.com',
  'NVO': 'novonordisk.com',
  'JNJ': 'jnj.com',
  'UNH': 'unitedhealthgroup.com',
  'ABBV': 'abbvie.com',
  'MRK': 'merck.com',
  'PFE': 'pfizer.com',
  'TMO': 'thermofisher.com',
  'ABT': 'abbott.com',
  'DHR': 'danaher.com',
  'BMY': 'bms.com',
  'GILD': 'gilead.com',
  'VRTX': 'vrtx.com',
  'REGN': 'regeneron.com',
  'ISRG': 'intuitive.com',
  'MDT': 'medtronic.com',
  'SYK': 'stryker.com',
  'BSX': 'bostonscientific.com',
  'CVS': 'cvs.com',
  'CI': 'thecignagroup.com',
  'ELV': 'elevancehealth.com',

  // Energy & Utilities
  'XOM': 'exxonmobil.com',
  'CVX': 'chevron.com',
  'TTE': 'totalenergies.com',
  'OXY': 'oxy.com',
  'COP': 'conocophillips.com',
  'SLB': 'slb.com',
  'EOG': 'eogresources.com',
  'NEE': 'nexteraenergy.com',
  'SO': 'southerncompany.com',
  'DUK': 'duke-energy.com',
  'T': 'att.com',
  'VZ': 'verizon.com',
  'F': 'ford.com',
  'GM': 'gm.com',
  'RIVN': 'rivian.com',
  'LCID': 'lucidmotors.com',

  // Major Index / ETFs
  'DIA': 'ssga.com',
  'IBIT': 'ishares.com',
  'FBTC': 'fidelity.com',
  'BITO': 'proshares.com',
  'ETHA': 'ishares.com',
  'SMH': 'vaneck.com',
  'SOXX': 'ishares.com',
  'ARKK': 'ark-funds.com',
  'JEPI': 'jpmorgan.com',
  'JEPQ': 'jpmorgan.com',
  'SCHD': 'schwab.com',

  // International & London Stock Exchange Leaders
  'EZJ': 'easyjet.com',
  'EZJ.L': 'easyjet.com',
  'IAG': 'iairgroup.com',
  'IAG.L': 'iairgroup.com',
  'WISE': 'wise.com',
  'WISE.L': 'wise.com',
  'AUTO': 'autotrader.co.uk',
  'AUTO.L': 'autotrader.co.uk',
  'RMV': 'rightmove.co.uk',
  'RMV.L': 'rightmove.co.uk',
  'SBRY': 'sainsburys.co.uk',
  'SBRY.L': 'sainsburys.co.uk',
  'OCDO': 'ocadogroup.com',
  'OCDO.L': 'ocadogroup.com',
  'ABF': 'abf.co.uk',
  'ABF.L': 'abf.co.uk',
  'ENT': 'entaingroup.com',
  'ENT.L': 'entaingroup.com',
  'FLTR': 'flutter.com',
  'FLTR.L': 'flutter.com',
  'CPG': 'compass-group.com',
  'CPG.L': 'compass-group.com',
  'INF': 'informa.com',
  'INF.L': 'informa.com',
  'SMT': 'bailliegifford.com',
  'SMT.L': 'bailliegifford.com',
  'FCIT': 'fandc.com',
  'FCIT.L': 'fandc.com',
  'JAM': 'jpmorgan.com',
  'JAM.L': 'jpmorgan.com'
};

// Known erroneous/broken domains that should always be corrected
const BAD_DOMAINS_MAP: Record<string, string> = {
  'barc.com': 'barclays.co.uk',
  'bac.com': 'bankofamerica.com',
  'hood.com': 'robinhood.com',
  'vuag.com': 'vanguard.com',
  'vusa.com': 'vanguard.com',
  'vwrp.com': 'vanguard.com',
  'vwrl.com': 'vanguard.com',
  'coca-colacompany.com': 'coca-cola.com',
  'thewaltdisneycompany.com': 'disney.com',
  'cspx.com': 'ishares.com',
  'csp1.com': 'ishares.com',
  'sxr8.com': 'ishares.com',
  'mcd.com': 'mcdonalds.com',
  'hd.com': 'homedepot.com',
  'low.com': 'lowes.com',
  'tgt.com': 'target.com',
  'nvo.com': 'novonordisk.com',
  'unh.com': 'unitedhealthgroup.com',
  'lmt.com': 'lockheedmartin.com',
  'smci.com': 'supermicro.com',
  'mstr.com': 'microstrategy.com',
  'net.com': 'cloudflare.com',
  'ddog.com': 'datadoghq.com',
  'rklb.com': 'rocketlabusa.com',
  'asts.com': 'ast-science.com'
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

/**
 * Returns an ordered array of candidate logo URLs (custom SVG, Google Favicon, DuckDuckGo, Unavatar)
 * to provide a robust fallback chain if a CDN or network service fails.
 */
export function getTickerLogoCandidates(ticker: string, currentUrl?: string, companyName?: string): string[] {
  const cleanTicker = (ticker || '').trim().toUpperCase();
  const baseTicker = cleanTicker.split('.')[0];
  const candidates: string[] = [];

  // 1. Custom SVG logos (highest fidelity)
  if (CUSTOM_TICKER_LOGOS[cleanTicker]) {
    candidates.push(CUSTOM_TICKER_LOGOS[cleanTicker]);
  }
  if (CUSTOM_TICKER_LOGOS[baseTicker] && !candidates.includes(CUSTOM_TICKER_LOGOS[baseTicker])) {
    candidates.push(CUSTOM_TICKER_LOGOS[baseTicker]);
  }
  if (companyName) {
    const lowerName = companyName.toLowerCase();
    if (lowerName.includes('coca-cola') || lowerName.includes('coke')) {
      if (!candidates.includes('/logos/ko.svg')) candidates.push('/logos/ko.svg');
    }
    if (lowerName.includes('oracle')) {
      if (!candidates.includes('/logos/orcl.svg')) candidates.push('/logos/orcl.svg');
    }
  }

  // 2. Authoritative domain resolution
  const authDomain = getAuthoritativeDomain(cleanTicker, companyName) || `${baseTicker.toLowerCase()}.com`;
  if (authDomain) {
    const cleanDomain = authDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    // Primary: Google Favicon service (high-resolution)
    candidates.push(`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanDomain}&size=128`);
    // Secondary fallback: Unavatar
    candidates.push(`https://unavatar.io/${cleanDomain}?fallback=false`);
  }

  // 3. User or feed-provided URL
  if (currentUrl && currentUrl.startsWith('http') && !candidates.includes(currentUrl)) {
    candidates.push(currentUrl);
  }

  return candidates;
}

export const CUSTOM_TICKER_LOGOS: Record<string, string> = {
  'KO': '/logos/ko.svg',
  'COKE': '/logos/ko.svg',
  'ORCL': '/logos/orcl.svg',
  'ORACLE': '/logos/orcl.svg',
};

export interface TickerTheme {
  gradient: string;
  text: string;
  ring: string;
  accent: string;
  name: string;
}

export const TICKER_PALETTES: TickerTheme[] = [
  // 0: Deep Sapphire
  {
    gradient: 'from-blue-600 via-indigo-700 to-slate-950',
    text: 'text-blue-50',
    ring: 'ring-blue-400/30',
    accent: 'bg-blue-400',
    name: 'Sapphire',
  },
  // 1: Emerald Cyber
  {
    gradient: 'from-emerald-600 via-teal-700 to-emerald-950',
    text: 'text-emerald-50',
    ring: 'ring-emerald-400/30',
    accent: 'bg-emerald-400',
    name: 'Emerald',
  },
  // 2: Royal Violet
  {
    gradient: 'from-violet-600 via-purple-700 to-slate-950',
    text: 'text-violet-50',
    ring: 'ring-purple-400/30',
    accent: 'bg-purple-400',
    name: 'Violet',
  },
  // 3: Radiant Amber / Ochre
  {
    gradient: 'from-amber-600 via-orange-700 to-stone-950',
    text: 'text-amber-50',
    ring: 'ring-amber-400/30',
    accent: 'bg-amber-400',
    name: 'Amber',
  },
  // 4: Crimson Ruby
  {
    gradient: 'from-rose-600 via-red-700 to-stone-950',
    text: 'text-rose-50',
    ring: 'ring-rose-400/30',
    accent: 'bg-rose-400',
    name: 'Ruby',
  },
  // 5: Electric Cyan
  {
    gradient: 'from-cyan-600 via-blue-700 to-slate-950',
    text: 'text-cyan-50',
    ring: 'ring-cyan-400/30',
    accent: 'bg-cyan-400',
    name: 'Cyan',
  },
  // 6: Obsidian Carbon
  {
    gradient: 'from-neutral-700 via-zinc-800 to-neutral-950',
    text: 'text-zinc-100',
    ring: 'ring-zinc-400/30',
    accent: 'bg-zinc-400',
    name: 'Carbon',
  },
  // 7: Deep Cobalt
  {
    gradient: 'from-sky-600 via-blue-800 to-slate-950',
    text: 'text-sky-50',
    ring: 'ring-sky-400/30',
    accent: 'bg-sky-400',
    name: 'Cobalt',
  },
  // 8: Warm Copper
  {
    gradient: 'from-orange-600 via-amber-800 to-neutral-950',
    text: 'text-orange-50',
    ring: 'ring-orange-400/30',
    accent: 'bg-orange-400',
    name: 'Copper',
  },
  // 9: Vivid Magenta
  {
    gradient: 'from-fuchsia-600 via-pink-700 to-slate-950',
    text: 'text-fuchsia-50',
    ring: 'ring-fuchsia-400/30',
    accent: 'bg-fuchsia-400',
    name: 'Magenta',
  },
  // 10: Forest Jade
  {
    gradient: 'from-teal-600 via-emerald-800 to-slate-950',
    text: 'text-teal-50',
    ring: 'ring-teal-400/30',
    accent: 'bg-teal-400',
    name: 'Jade',
  },
  // 11: Midnight Indigo
  {
    gradient: 'from-slate-700 via-indigo-900 to-black',
    text: 'text-indigo-100',
    ring: 'ring-indigo-400/30',
    accent: 'bg-indigo-400',
    name: 'Indigo',
  },
];

export function getTickerTheme(ticker: string): TickerTheme {
  const clean = (ticker || '').trim().toUpperCase();
  if (!clean) return TICKER_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TICKER_PALETTES.length;
  return TICKER_PALETTES[index];
}

/**
 * Resolves or repairs a ticker logo URL, ensuring known tickers (Coke, Oracle, Barclays, VUAG, etc.)
 * point to their verified high-res logos.
 */
export function resolveTickerLogoUrl(ticker: string, currentUrl?: string, companyName?: string): string {
  const cleanTicker = (ticker || '').trim().toUpperCase();
  const baseTicker = cleanTicker.split('.')[0];

  // 1. Direct custom high-fidelity SVG logos (e.g. Coca-Cola, Oracle)
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
    if (lowerName.includes('oracle')) {
      return '/logos/orcl.svg';
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
    if (currentUrl.includes('oracle.com') || cleanTicker === 'ORCL') {
      return '/logos/orcl.svg';
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
  'BT': 'BT Group plc',
  'BT.L': 'BT Group plc',
  'BT-A.L': 'BT Group plc',
  'BT.A': 'BT Group plc',
  'BT.A.L': 'BT Group plc',
  'BTA.L': 'BT Group plc',
  'BTGOF': 'BT Group plc',

  // Swiss Equities (SIX Swiss Exchange)
  'NESN': 'Nestlé S.A.',
  'NESN.SW': 'Nestlé S.A.',
  'NSRGY': 'Nestlé S.A. (ADR)',
  'NOVN': 'Novartis AG',
  'NOVN.SW': 'Novartis AG',
  'NVS': 'Novartis AG (ADR)',
  'ROG': 'Roche Holding AG',
  'ROG.SW': 'Roche Holding AG',
  'RO.SW': 'Roche Holding AG',
  'RHHBY': 'Roche Holding AG (ADR)',
  'UBSG': 'UBS Group AG',
  'UBSG.SW': 'UBS Group AG',
  'UBS': 'UBS Group AG',
  'ABBN': 'ABB Ltd',
  'ABBN.SW': 'ABB Ltd',
  'ABBNY': 'ABB Ltd (ADR)',
  'ZURN': 'Zurich Insurance Group AG',
  'ZURN.SW': 'Zurich Insurance Group AG',
  'ZURVY': 'Zurich Insurance Group AG (ADR)',
  'CFR': 'Compagnie Financière Richemont SA',
  'CFR.SW': 'Compagnie Financière Richemont SA',
  'LONN': 'Lonza Group AG',
  'LONN.SW': 'Lonza Group AG',
  'SIKA': 'Sika AG',
  'SIKA.SW': 'Sika AG',
  'GIVN': 'Givaudan SA',
  'GIVN.SW': 'Givaudan SA',
  'ALC': 'Alcon Inc.',
  'ALC.SW': 'Alcon Inc.',
  'SCMN': 'Swisscom AG',
  'SCMN.SW': 'Swisscom AG',

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
  'SAP': 'SAP SE',
  'SAP.DE': 'SAP SE',
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
  'RTX': 'RTX Corporation'
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
