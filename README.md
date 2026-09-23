# 📈 StockPulse AI

**StockPulse AI** is a professional-grade, real-time stock analysis and market intelligence platform. Powered by Google's Gemini models and live financial market feeds, it delivers institutional-level technical analysis, Anchored VWAP indicators, a multi-factor trade decision engine, self-healing persistent portfolio tracking, and disciplined risk-reward execution plans.

![StockPulse AI Demo](https://girlyn.com/images/StockPulseAI.gif)

---

## ✨ Key Features

### 🎯 Trade Decision Engine & Execution Ladder
- **Dynamic Trade Decision State**: Clear, high-conviction execution states (**"BUY IN ADD ZONE"**, **"WAIT / HOLD"**, **"DEFEND STOP"**, or **"TRIM / TAKE PROFIT"**) driven by real-time price action and market structure.
- **Adaptive Risk Profile Engine (Aggressive / Moderate / Conservative)**:
  - **Aggressive (Default)**: Specifically configured for growth and momentum investors seeking active **BUY / ACCUMULATION** opportunities. Automatically widens the accumulation corridor to encompass active market price during constructive momentum setups, shallow pullbacks, or breakouts—eliminating overly conservative "HOLD" traps while maintaining disciplined stop losses below structural support.
  - **Moderate**: Balanced institutional risk-reward requiring $\ge 1.8:1$ asymmetry.
  - **Conservative**: Capital preservation posture requiring deep pullbacks into structural support floors.
  - **Interactive Risk Posture Toggle**: Switch risk profiles on the fly directly inside the Trade Decision module with one-click re-analysis.
- **Tactical Parameter Strip**:
  - **9-Factor Signal Score**: Comprehensive institutional score (e.g. `76/100 · 6/9`) with an interactive breakdown modal covering trend alignment, momentum, AVWAP posture, volume profile, valuation multiples, earnings catalysts, financial health, and asymmetric risk/reward.
  - **Capital Allocation Guidance**: Tailored position sizing recommendation (e.g. `5–10%` for aggressive growth, `2–5%` for conservative) aligned with the asset's risk profile.
  - **Investment Horizon**: Suggested holding window (e.g. `14–60 days` or `30–90 days`) for expected catalyst realization.
- **Step-by-Step Execution Ladder & State Machine Table**:
  - Explicit price levels mapped across 6 monitored thresholds: Stop Loss Defense, Add/Entry Zone, Trailing Pivot, Breakout Level, and Multi-Tier Take-Profit targets.
  - Dynamic active state row highlighting with tone-based color coding (emerald for accumulation, blue for breakout, purple for target reached, rose for stop invalidated, amber for defensive reassess).
- **Recommendation Thesis & Asymmetry**: Deep qualitative thesis paired with quantitative asymmetry geometry (e.g. Risk-to-Reward ratio, downside risk vs. upside target).

### 🌙 Pre-Market & After-Hours Market Reaction Tracker
- **Extended-Hours Price Action**: Real-time pre-market and after-hours price quotes, dollar delta, and percentage movement.
- **Session Range Visualizer**: Tracks the active extended-hours session trading range (Session Low – Session High) alongside after-hours volume.
- **Market Hours Awareness Engine**: Automatically detects global exchange open/closed states (`REGULAR`, `PRE`, `POST`, `CLOSED`) based on venue timezones (NYSE, NASDAQ, LSE, SIX, Euronext).
- **Session Reaction Sentiment**: Real-time qualitative assessment of post-earnings or after-hours headline market reactions.

### 📅 Earnings Intelligence & Catalyst Calendar
- **Catalyst Countdown**: Live tracking of upcoming earnings report dates and days-until-earnings countdown.
- **Consensus Estimates**: Consensus EPS and revenue projections with historical year-over-year (YoY) comparison figures.
- **Revision Sentiment & Implied Moves**: Market implied volatility moves for earnings day and analyst consensus revision momentum (bullish, neutral, or cautious).
- **Earnings Risk Factor Briefs**: Key operational risks and catalyst watch points highlighted ahead of corporate releases.

### 📊 Advanced Technicals & Quantitative Charting
- **ATH Anchored VWAP (Volume Weighted Average Price)**: Calculates dynamic anchored VWAP starting from the asset's All-Time High (ATH) to identify institutional supply/demand equilibriums and dynamic support/resistance zones.
- **5-Day Moving Average (MA5)**: Real-time calculation and short-term trend indicator showing whether current price action leads or lags immediate momentum.
- **Interactive Multi-Indicator Charts**: Seamless chronological charts powered by Recharts & D3, plotting live price action, MA5 curves, ATH Anchored VWAP lines, and key support/resistance channels.

### 💼 Resilient & Self-Healing Persistent Portfolio
- **Bi-Directional Self-Healing Sync**: Dual-layer architecture reconciling browser `localStorage` with server-side `data.json`. Positions survive container reboots, cold starts, and session changes without data loss.
- **Atomic Disk Persistence**: High-reliability file staging utilizing temporary staging files, automatic backups (`.bak`), and atomic file renames to prevent corruption during app updates.
- **Tombstone Deletion Protection**: Deleted positions are tracked with tombstone identifiers so background syncs never resurrect intentionally deleted tickers.
- **Actionable AI Badges & Sizing**: Real-time AI execution badges (**AI: Buy**, **AI: Sell Partial [custom %]**, **AI: Sell All**, and **AI: Avoid**) overlaid on holding rows.
- **Consolidated Position Analytics**: Instant aggregation of **Total Market Value**, **Total Cost Basis**, **Unrealized Gain/Loss ($ & %)**, and **Best Performing Asset**.
- **Interactive Position Management**: Add or edit positions with average purchase price, share quantity, base currency, and custom trader notes.
- **Smart Filtering & Sorting**: Filter portfolio views by Gainers, Losers, Bullish signals, or Bearish signals, and toggle between High-Density Table or Card Grid layouts.
- **Real-Time Batch Price Updates**: Background polling engine refreshing prices, day deltas, and valuation totals across all open portfolio holdings simultaneously.
- **Dividend Schedules & Metrics**: Tracks annualized dividend yield, payout rates, and upcoming ex-dividend and payment dates.

### 🔍 Market Watchlist & Opportunities Screener
- **Curated Top 20 Market Opportunities**: Institutional-grade watchlist covering high-conviction market leaders.
- **Sector-Specific Filtering**: Instant multi-sector screening across:
  - *AI & Semiconductors*
  - *Big Tech & Cloud*
  - *High-Growth & Fintech*
  - *Healthcare & Biotech*
  - *Blue Chips & Value*
- **Flexible View Modes**: Switch between responsive Grid Cards and dense institutional Table view with sorting by AI Conviction Score, 24h Change, Upside Potential, and Price.
- **Quick-Glance Telemetry**: View 24h performance, upside potential to target prices, and risk-reward ratings at a glance.
- **One-Click Deep Dive**: Transition instantly from any watchlist card or portfolio row directly into the full technical deep-dive report.

### 🔔 Price Alerts & Breakout Triggers
- **Custom Price Triggers**: Set upper resistance breakout and lower support defense thresholds to monitor critical technical levels.
- **Proactive Visual Indicators**: Real-time alert notifications and status badges highlighting price violations.

### 🌍 Global Exchange Venues & Multi-Currency
- **Multi-Currency Normalization**: Seamlessly analyze and convert assets in **USD ($)**, **GBP (£)**, and **EUR (€)** with real-time FX rate conversion.
- **Global Exchange Coverage**: Full support for US venues (NASDAQ, NYSE), UK securities (London Stock Exchange `.L`), and European markets (`.SW`, `.PA`, etc.).
- **Institutional Dark & Light Themes**: High-contrast dark theme alongside an elegant light theme with persistent preference storage.
- **Authoritative Company Branding**: Vector and high-resolution logo resolution with elegant monogram fallbacks for global assets.

---

## 🔌 API Architecture & Endpoints

StockPulse AI features a lightweight Express.js backend serving live financial data and persisting portfolio states:

| Endpoint | Method | Description |
|---|---|---|
| `/api/stock/:ticker` | `GET` | Full technical analysis, ATH Anchored VWAP, risk-adaptive geometry (`?riskMode=aggressive`), and Gemini market intelligence |
| `/api/price/:ticker` | `GET` | Fast real-time quote, market status, exchange timezone, and day delta |
| `/api/prices` | `GET` / `POST` | Batch price & dividend telemetry for multiple tickers simultaneously |
| `/api/watchlist` | `GET` | Live 20-ticker institutional opportunity feed with 30s in-memory caching |
| `/api/portfolio` | `GET` | Fetch all saved portfolio positions from persistent storage |
| `/api/portfolio` | `POST` | Save or update a portfolio holding with auto-fetching of market details |
| `/api/portfolio/batch` | `POST` | Atomic batch save/update for multi-position portfolio synchronization |
| `/api/portfolio/:ticker` | `DELETE` | Remove a position from persistent storage with tombstone protection |
| `/api/portfolio/reset` | `POST` | Reset portfolio to curated benchmark assets |
| `/api/fx` | `GET` | Live multi-currency foreign exchange rates (USD, GBP, EUR) |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS v4 (Utility-first)
- **Animations**: Motion (via `motion/react`)
- **Charts & Visualizations**: Recharts & D3
- **AI Intelligence**: Google Gemini API via `@google/genai`
- **Backend & Middleware**: Express.js with integrated Vite middleware and esbuild CJS compilation
- **Icons**: Lucide React

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Google Gemini API Key** (Obtain from [Google AI Studio](https://aistudio.google.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/stockpulse-ai.git
   cd stockpulse-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Launch the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

---

## 📖 Usage Workflow

1. **Analyze a Ticker**: Enter any global stock symbol (e.g. `NVDA`, `AAPL`, `RR.L`, `MSFT`) in the search bar.
2. **Review Trade Decision**: Check the active trade decision status (**BUY IN ADD ZONE**, **WAIT / HOLD**, etc.), review the 9-factor signals score, and examine the execution ladder levels.
3. **Inspect Key Levels**: Analyze the **ATH Anchored VWAP**, **MA5**, **Valuation Multiples**, and **Support/Resistance channels**.
4. **Input Position Context (Optional)**: Provide your average purchase price and share quantity to compute real-time holding gains, cost basis, and total market value.
5. **Manage Persistent Portfolio**: Save analyzed positions directly to your portfolio. Positions are persistently synced between your browser and the local server storage with automated backup protection.
6. **Browse Watchlist**: Explore top market opportunities and set price target alerts.

---

## ⚠️ Disclaimer

Financial analyses, ratings, and price targets provided by StockPulse AI are generated for informational and educational purposes only. The platform does not provide individualized investment advice. Always consult a certified financial advisor before executing investment transactions.

---

Built with ❤️ using Google AI Studio.
