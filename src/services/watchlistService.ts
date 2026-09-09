export interface WatchlistItem {
  ticker: string;
  name: string;
  sector: 'AI & Semiconductors' | 'Big Tech & Cloud' | 'High-Growth & Fintech' | 'Healthcare & Biotech' | 'Blue Chips & Value';
  categoryTag: string;
  convictionScore: number; // 0 - 100
  recommendationAction: 'Strong Buy' | 'Buy on Dips' | 'Accumulate' | 'Breakout Watch';
  currentPrice: number;
  previousClose: number;
  priceChange: number;
  priceChangePercent: number;
  currency: string;
  marketCap: string;
  peRatio?: number;
  dividendYield?: number;
  idealEntry: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  trend: 'Bullish' | 'Neutral' | 'Bearish';
  catalysts: string[];
  thesis: string;
  exchange?: string;
  avwapAthStatus?: 'Above AVWAP' | 'Below AVWAP' | 'At Key Support';
}

export const TOP_20_RECOMMENDED_STOCKS: WatchlistItem[] = [
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'AI & Semiconductors',
    categoryTag: 'AI Infrastructure',
    convictionScore: 98,
    recommendationAction: 'Strong Buy',
    currentPrice: 128.50,
    previousClose: 125.80,
    priceChange: 2.70,
    priceChangePercent: 2.15,
    currency: 'USD',
    marketCap: '$3.15T',
    peRatio: 42.5,
    dividendYield: 0.08,
    idealEntry: 124.00,
    stopLoss: 118.00,
    takeProfit: 160.00,
    riskRewardRatio: 3.5,
    trend: 'Bullish',
    catalysts: [
      'Blackwell & Rubin GPU production ramp with multi-quarter backlog',
      'Hyperscaler capex acceleration across Microsoft, Google, Meta, and AWS',
      'Software moat with CUDA ecosystem and NIM enterprise microservices'
    ],
    thesis: 'The undisputed foundational layer of global generative AI and accelerated computing with unassailable ecosystem margins.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Big Tech & Cloud',
    categoryTag: 'Enterprise AI & Cloud',
    convictionScore: 97,
    recommendationAction: 'Strong Buy',
    currentPrice: 425.20,
    previousClose: 421.10,
    priceChange: 4.10,
    priceChangePercent: 0.97,
    currency: 'USD',
    marketCap: '$3.16T',
    peRatio: 34.2,
    dividendYield: 0.75,
    idealEntry: 418.00,
    stopLoss: 398.00,
    takeProfit: 500.00,
    riskRewardRatio: 3.2,
    trend: 'Bullish',
    catalysts: [
      'Azure Cloud accelerating over 30%+ constant currency on AI workload demand',
      'M365 Copilot enterprise seat expansion and premium tiered pricing',
      'Massive cash flows and defensive enterprise recurring software moat'
    ],
    thesis: 'Best-in-class enterprise software ecosystem monetizing AI directly into business workflows and cloud infrastructure.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'TSM',
    name: 'Taiwan Semiconductor Mfg.',
    sector: 'AI & Semiconductors',
    categoryTag: 'Foundry Monopoly',
    convictionScore: 96,
    recommendationAction: 'Strong Buy',
    currentPrice: 178.40,
    previousClose: 174.50,
    priceChange: 3.90,
    priceChangePercent: 2.23,
    currency: 'USD',
    marketCap: '$925B',
    peRatio: 26.8,
    dividendYield: 1.25,
    idealEntry: 172.00,
    stopLoss: 160.00,
    takeProfit: 220.00,
    riskRewardRatio: 3.6,
    trend: 'Bullish',
    catalysts: [
      'Near 90%+ market share in leading-edge 3nm and incoming 2nm wafer nodes',
      'CoWoS advanced packaging capacity doubling through 2025/2026',
      'Pricing power across premier fabless customers (Apple, Nvidia, AMD, Qualcomm)'
    ],
    thesis: 'The sole manufacturing linchpin of advanced global computing trading at an attractive earnings multiple relative to growth.',
    exchange: 'NYSE',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: 'Big Tech & Cloud',
    categoryTag: 'E-Commerce & AWS',
    convictionScore: 95,
    recommendationAction: 'Buy on Dips',
    currentPrice: 188.60,
    previousClose: 186.20,
    priceChange: 2.40,
    priceChangePercent: 1.29,
    currency: 'USD',
    marketCap: '$1.96T',
    peRatio: 38.4,
    idealEntry: 182.50,
    stopLoss: 172.00,
    takeProfit: 230.00,
    riskRewardRatio: 3.4,
    trend: 'Bullish',
    catalysts: [
      'AWS cloud optimization cycle ending, shifting back to multi-year re-acceleration',
      'Inbound logistics network regionalization driving record retail operating margins',
      'High-margin advertising segment growing 20%+ YoY surpassing $50B run-rate'
    ],
    thesis: 'Tremendous free cash flow inflecting as retail fulfillment efficiencies pair with AWS cloud AI infrastructure demand.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Big Tech & Cloud',
    categoryTag: 'AI & Search/Cloud',
    convictionScore: 94,
    recommendationAction: 'Accumulate',
    currentPrice: 166.80,
    previousClose: 165.40,
    priceChange: 1.40,
    priceChangePercent: 0.85,
    currency: 'USD',
    marketCap: '$2.06T',
    peRatio: 22.4,
    dividendYield: 0.48,
    idealEntry: 162.00,
    stopLoss: 154.00,
    takeProfit: 205.00,
    riskRewardRatio: 3.8,
    trend: 'Bullish',
    catalysts: [
      'Deep AI stack vertical integration from custom Ironwood/TPUs to Gemini frontier models',
      'Google Cloud profitability inflection with 28%+ revenue expansion',
      'Undemanding valuation multiple compared to broader mega-cap technology peers'
    ],
    thesis: 'Attractive valuation paired with massive search cash flows, YouTube subscription power, and expanding enterprise cloud margins.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'At Key Support'
  },
  {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    sector: 'AI & Semiconductors',
    categoryTag: 'Custom AI Silicon & Infra',
    convictionScore: 95,
    recommendationAction: 'Strong Buy',
    currentPrice: 158.30,
    previousClose: 154.90,
    priceChange: 3.40,
    priceChangePercent: 2.19,
    currency: 'USD',
    marketCap: '$740B',
    peRatio: 32.1,
    dividendYield: 1.35,
    idealEntry: 152.00,
    stopLoss: 142.00,
    takeProfit: 195.00,
    riskRewardRatio: 3.7,
    trend: 'Bullish',
    catalysts: [
      'Custom ASIC AI silicon design wins with hyperscale Tier-1 cloud titans',
      'Dominant market share in high-speed Ethernet switching (Tomahawk 5 & Jericho3-AI)',
      'VMware recurring subscription transition unlocking massive free cash flow'
    ],
    thesis: 'Essential networking fabric and custom silicon provider capturing high-margin spend across enterprise and AI datacenters.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    sector: 'Big Tech & Cloud',
    categoryTag: 'AI Ads & Social Network',
    convictionScore: 94,
    recommendationAction: 'Strong Buy',
    currentPrice: 512.50,
    previousClose: 504.80,
    priceChange: 7.70,
    priceChangePercent: 1.53,
    currency: 'USD',
    marketCap: '$1.30T',
    peRatio: 25.6,
    dividendYield: 0.39,
    idealEntry: 495.00,
    stopLoss: 468.00,
    takeProfit: 620.00,
    riskRewardRatio: 3.6,
    trend: 'Bullish',
    catalysts: [
      'Advantage+ AI advertising suite delivering industry-leading advertiser ROAS',
      'Llama open-weights leadership driving unprecedented developer and infrastructure adoption',
      '3.2B+ daily active people across Family of Apps providing unbeatable engagement'
    ],
    thesis: 'Unmatched ad-targeting monetization engine generating extraordinary free cash flow and executing disciplined capital returns.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'ASML',
    name: 'ASML Holding N.V.',
    sector: 'AI & Semiconductors',
    categoryTag: 'EUV Lithography Monopoly',
    convictionScore: 93,
    recommendationAction: 'Buy on Dips',
    currentPrice: 840.00,
    previousClose: 825.00,
    priceChange: 15.00,
    priceChangePercent: 1.82,
    currency: 'USD',
    marketCap: '$330B',
    peRatio: 39.2,
    dividendYield: 0.82,
    idealEntry: 810.00,
    stopLoss: 755.00,
    takeProfit: 1050.00,
    riskRewardRatio: 3.5,
    trend: 'Bullish',
    catalysts: [
      '100% monopoly on Extreme Ultraviolet (EUV) and High-NA lithography systems',
      'Global semiconductor fab buildouts across US, Europe, and Asia ramping simultaneously',
      'High-margin installed base service contracts ensuring resilient down-cycle revenue'
    ],
    thesis: 'A true natural monopoly: no advanced semiconductor on Earth can be fabricated without ASML lithography equipment.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Big Tech & Cloud',
    categoryTag: 'Consumer Hardware & Services',
    convictionScore: 92,
    recommendationAction: 'Accumulate',
    currentPrice: 226.40,
    previousClose: 224.80,
    priceChange: 1.60,
    priceChangePercent: 0.71,
    currency: 'USD',
    marketCap: '$3.44T',
    peRatio: 33.8,
    dividendYield: 0.44,
    idealEntry: 220.00,
    stopLoss: 208.00,
    takeProfit: 265.00,
    riskRewardRatio: 3.1,
    trend: 'Bullish',
    catalysts: [
      'Apple Intelligence rollout sparking multi-year iPhone upgrade super-cycle',
      'Services revenue (App Store, iCloud, Payments) surpassing $90B run rate at 74% gross margin',
      'Industry-leading capital allocation with $100B+ annual share buyback program'
    ],
    thesis: 'The stickiest consumer ecosystem in modern commerce, offering defensive cash flow stability and AI device cycle upside.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'PLTR',
    name: 'Palantir Technologies',
    sector: 'High-Growth & Fintech',
    categoryTag: 'Enterprise AI & Defense',
    convictionScore: 93,
    recommendationAction: 'Breakout Watch',
    currentPrice: 32.40,
    previousClose: 31.10,
    priceChange: 1.30,
    priceChangePercent: 4.18,
    currency: 'USD',
    marketCap: '$72B',
    peRatio: 78.5,
    idealEntry: 29.50,
    stopLoss: 26.50,
    takeProfit: 45.00,
    riskRewardRatio: 3.7,
    trend: 'Bullish',
    catalysts: [
      'AIP (Artificial Intelligence Platform) bootcamps driving 55%+ US Commercial customer growth',
      'S&P 500 inclusion and defense/intelligence multi-million dollar contract expansions',
      'Expanding GAAP operating margins and rule-of-40 SaaS leadership'
    ],
    thesis: 'The gold standard for operationalizing generative AI into mission-critical government defense and Fortune 500 operations.',
    exchange: 'NYSE',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'AMD',
    name: 'Advanced Micro Devices',
    sector: 'AI & Semiconductors',
    categoryTag: 'Datacenter & AI Accelerators',
    convictionScore: 91,
    recommendationAction: 'Buy on Dips',
    currentPrice: 154.20,
    previousClose: 151.00,
    priceChange: 3.20,
    priceChangePercent: 2.12,
    currency: 'USD',
    marketCap: '$249B',
    peRatio: 45.0,
    idealEntry: 146.00,
    stopLoss: 135.00,
    takeProfit: 195.00,
    riskRewardRatio: 3.5,
    trend: 'Bullish',
    catalysts: [
      'Instinct MI300X/MI325X and upcoming MI350/MI400 AI accelerator adoption',
      'EPYC server market share gains continuing against legacy x86 server competition',
      'Client PC AI processor leadership with Ryzen AI 300 series architecture'
    ],
    thesis: 'Strongest alternative accelerator provider to Nvidia with high-margin server share gains and compelling long-term upside.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'At Key Support'
  },
  {
    ticker: 'LLY',
    name: 'Eli Lilly and Company',
    sector: 'Healthcare & Biotech',
    categoryTag: 'GLP-1 & Metabolic Medicine',
    convictionScore: 95,
    recommendationAction: 'Strong Buy',
    currentPrice: 948.00,
    previousClose: 932.00,
    priceChange: 16.00,
    priceChangePercent: 1.72,
    currency: 'USD',
    marketCap: '$900B',
    peRatio: 64.0,
    dividendYield: 0.55,
    idealEntry: 915.00,
    stopLoss: 850.00,
    takeProfit: 1200.00,
    riskRewardRatio: 3.6,
    trend: 'Bullish',
    catalysts: [
      'Mounjaro (diabetes) and Zepbound (obesity) expanding into sleep apnea and cardiac indications',
      'Massive manufacturing capacity investments unlocking unprecedented global supply',
      'Donanemab Alzheimer’s regulatory approval broadening breakthrough portfolio'
    ],
    thesis: 'Secular healthcare leader pioneering the largest pharmaceutical drug class in history (GLP-1s) with multi-decade pricing power.',
    exchange: 'NYSE',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'ISRG',
    name: 'Intuitive Surgical Inc.',
    sector: 'Healthcare & Biotech',
    categoryTag: 'Robotic Surgery Monopoly',
    convictionScore: 93,
    recommendationAction: 'Strong Buy',
    currentPrice: 485.50,
    previousClose: 479.20,
    priceChange: 6.30,
    priceChangePercent: 1.31,
    currency: 'USD',
    marketCap: '$172B',
    peRatio: 68.2,
    idealEntry: 465.00,
    stopLoss: 435.00,
    takeProfit: 580.00,
    riskRewardRatio: 3.3,
    trend: 'Bullish',
    catalysts: [
      'Next-generation da Vinci 5 robotic platform launch with 10,000x processing power',
      'High-margin recurring revenue from instruments and accessories surpassing 80% of total mix',
      'Global surgical procedure volume expansion across general surgery, bariatric, and thoracic'
    ],
    thesis: 'Widest economic moat in healthcare: surgeon training, institutional lock-in, and recurring razor-and-blade economics.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'CRWD',
    name: 'CrowdStrike Holdings',
    sector: 'High-Growth & Fintech',
    categoryTag: 'AI Cloud Cybersecurity',
    convictionScore: 90,
    recommendationAction: 'Buy on Dips',
    currentPrice: 288.50,
    previousClose: 282.10,
    priceChange: 6.40,
    priceChangePercent: 2.27,
    currency: 'USD',
    marketCap: '$70B',
    peRatio: 62.5,
    idealEntry: 275.00,
    stopLoss: 250.00,
    takeProfit: 375.00,
    riskRewardRatio: 3.4,
    trend: 'Bullish',
    catalysts: [
      'Single-agent Falcon platform consolidating fragmented legacy security stacks',
      'Charlotte AI automated remediation reducing mean-time-to-respond for security operations',
      'Expanding annual recurring revenue (ARR) surpassing $3.8B+ with 30%+ free cash flow margins'
    ],
    thesis: 'Mission-critical enterprise cloud security leader capitalizing on rising cyber threats and platform consolidation trends.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'At Key Support'
  },
  {
    ticker: 'SPOT',
    name: 'Spotify Technology S.A.',
    sector: 'High-Growth & Fintech',
    categoryTag: 'Global Audio & Subscription',
    convictionScore: 92,
    recommendationAction: 'Strong Buy',
    currentPrice: 345.80,
    previousClose: 338.20,
    priceChange: 7.60,
    priceChangePercent: 2.25,
    currency: 'USD',
    marketCap: '$69B',
    peRatio: 52.0,
    idealEntry: 330.00,
    stopLoss: 305.00,
    takeProfit: 440.00,
    riskRewardRatio: 3.7,
    trend: 'Bullish',
    catalysts: [
      'Demonstrated pricing power with recurring global subscription price increases',
      'Audiobooks and podcast monetization inflecting gross margins toward 30%+',
      '620M+ monthly active users (MAUs) providing unmatched consumer audio distribution'
    ],
    thesis: 'Operating leverage turning point with accelerating free cash flow and pricing power across an unrivaled global subscriber base.',
    exchange: 'NYSE',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'UBER',
    name: 'Uber Technologies Inc.',
    sector: 'High-Growth & Fintech',
    categoryTag: 'Mobility & Delivery Flywheel',
    convictionScore: 92,
    recommendationAction: 'Strong Buy',
    currentPrice: 72.80,
    previousClose: 71.20,
    priceChange: 1.60,
    priceChangePercent: 2.25,
    currency: 'USD',
    marketCap: '$152B',
    peRatio: 32.0,
    idealEntry: 69.50,
    stopLoss: 64.00,
    takeProfit: 95.00,
    riskRewardRatio: 3.6,
    trend: 'Bullish',
    catalysts: [
      'Dual platform network effects between Mobility rides and Delivery orders driving customer LTV',
      'Autonomous vehicle (AV) fleet partnerships (Waymo, Cruise) leveraging Uber customer network',
      '$7B share buyback authorization and rapid free cash flow expansion'
    ],
    thesis: 'Dominant global consumer transportation and logistics layer generating disciplined GAAP profitability and buyback power.',
    exchange: 'NYSE',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Blue Chips & Value',
    categoryTag: 'Fortress Global Banking',
    convictionScore: 94,
    recommendationAction: 'Strong Buy',
    currentPrice: 218.40,
    previousClose: 216.50,
    priceChange: 1.90,
    priceChangePercent: 0.88,
    currency: 'USD',
    marketCap: '$625B',
    peRatio: 12.2,
    dividendYield: 2.20,
    idealEntry: 212.00,
    stopLoss: 198.00,
    takeProfit: 260.00,
    riskRewardRatio: 3.0,
    trend: 'Bullish',
    catalysts: [
      'Fortress balance sheet capturing deposit market share in all macro interest rate environments',
      'Investment banking and capital markets advisory fees rebounding strongly',
      'Best-in-class Return on Tangible Common Equity (ROTCE) above 18-20%'
    ],
    thesis: 'The preeminent global financial institution with unmatched scale, premier technology spend ($15B+), and low credit loss risk.',
    exchange: 'NYSE',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'COST',
    name: 'Costco Wholesale Corp.',
    sector: 'Blue Chips & Value',
    categoryTag: 'Membership Retail Giant',
    convictionScore: 93,
    recommendationAction: 'Accumulate',
    currentPrice: 885.00,
    previousClose: 878.00,
    priceChange: 7.00,
    priceChangePercent: 0.80,
    currency: 'USD',
    marketCap: '$392B',
    peRatio: 51.5,
    dividendYield: 0.52,
    idealEntry: 860.00,
    stopLoss: 815.00,
    takeProfit: 1040.00,
    riskRewardRatio: 3.4,
    trend: 'Bullish',
    catalysts: [
      'Membership fee increase flowing almost entirely to bottom-line net income',
      '93%+ renewal rates highlighting industry-leading customer loyalty and pricing power',
      'Global warehouse expansion runway across high-density international markets'
    ],
    thesis: 'Recession-proof membership model that rewards investors with compounding comparable store sales and special dividends.',
    exchange: 'NASDAQ',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'V',
    name: 'Visa Inc.',
    sector: 'Blue Chips & Value',
    categoryTag: 'Global Payment Duopoly',
    convictionScore: 93,
    recommendationAction: 'Strong Buy',
    currentPrice: 282.50,
    previousClose: 280.10,
    priceChange: 2.40,
    priceChangePercent: 0.86,
    currency: 'USD',
    marketCap: '$575B',
    peRatio: 28.5,
    dividendYield: 0.74,
    idealEntry: 275.00,
    stopLoss: 260.00,
    takeProfit: 340.00,
    riskRewardRatio: 3.3,
    trend: 'Bullish',
    catalysts: [
      'Secular global migration from cash to electronic payments across emerging economies',
      'High-margin value-added services (cybersecurity, fraud protection, analytics) growing 18%+',
      'Exceptional ~55%+ operating profit margins with minimal capital expenditure requirements'
    ],
    thesis: 'Tollbooth on global commerce: earns a fraction of every swipe worldwide without taking credit default risk.',
    exchange: 'NYSE',
    avwapAthStatus: 'Above AVWAP'
  },
  {
    ticker: 'WMT',
    name: 'Walmart Inc.',
    sector: 'Blue Chips & Value',
    categoryTag: 'Omnichannel Retail & Ads',
    convictionScore: 92,
    recommendationAction: 'Accumulate',
    currentPrice: 75.20,
    previousClose: 74.50,
    priceChange: 0.70,
    priceChangePercent: 0.94,
    currency: 'USD',
    marketCap: '$605B',
    peRatio: 30.2,
    dividendYield: 1.10,
    idealEntry: 72.50,
    stopLoss: 68.00,
    takeProfit: 92.00,
    riskRewardRatio: 3.3,
    trend: 'Bullish',
    catalysts: [
      'High-income consumer demographic share gains across grocery and e-commerce',
      'Walmart Connect retail media advertising business generating high-margin profits',
      'Supply chain automation and store fulfillment network reducing operating expense ratios'
    ],
    thesis: 'Omnichannel consumer powerhouse with inflation-resilient foot traffic and rapidly expanding high-margin digital business units.',
    exchange: 'NYSE',
    avwapAthStatus: 'Above AVWAP'
  }
];

export async function fetchMarketWatchlist(currency: string = 'USD', forceRefresh: boolean = false): Promise<WatchlistItem[]> {
  try {
    const url = `/api/watchlist?currency=${encodeURIComponent(currency)}${forceRefresh ? '&forceRefresh=true' : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch live watchlist from backend API, using local curated dataset:', err);
  }
  return TOP_20_RECOMMENDED_STOCKS;
}
