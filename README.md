# 📈 StockPulse AI

**StockPulse AI** is a professional-grade, real-time stock analysis and market intelligence platform. Powered by Google's Gemini models and verified live financial data, it delivers institutional-level technical analysis, Anchored VWAP indicators, portfolio tracking, market watchlists, and actionable investment trade plans.

![StockPulse AI Demo](https://girlyn.com/images/StockPulseAI.gif)

---

## ✨ Key Features

### 🧠 Institutional AI Analysis & Trade Planning
- **Live Search & Grounded Analysis**: Instant, verified market reports on any global stock ticker powered by Google Gemini and live financial feeds.
- **Actionable Verdicts**: Clear **"Buy More"**, **"Hold"**, or **"Sell"** signals accompanied by key catalyst summaries.
- **Calculated Trade Parameters**: Exact target exit prices, disciplined stop loss thresholds, and mathematical Risk-to-Reward (R/R) ratios.
- **Key Support & Resistance**: Automatically identified technical price barriers and support zones.

### 📊 Advanced Technicals & Charting
- **ATH Anchored VWAP (Volume Weighted Average Price)**: Automatically calculates anchored VWAP from the asset's All-Time High (ATH) to gauge whether aggregate post-peak volume is in profit (dynamic support) or underwater (dynamic resistance).
- **5-Day Moving Average (MA5)**: Real-time calculation and visual indicator showing if price action is above or below its short-term trend.
- **Interactive Multi-Indicator Charts**: Seamless chronological charts plotting live price action, MA5 curves, Anchored VWAP lines, and support/resistance channels.

### 💼 Portfolio Tracking & Position Analytics
- **Consolidated Position Cards**: Unified view of **Total Holding Value**, **Unrealized Gain/Loss ($ & %)**, **Cost Basis**, and **Shares Owned**.
- **Portfolio Intelligence**: Track multiple open positions across global markets with best-gainer analytics, total portfolio allocation, and annualized dividend yields.
- **Custom Cost Basis Calculation**: Seamlessly input purchase prices and position sizes to evaluate true investment performance over time.

### 🔍 Market Watchlist & Opportunities Screener
- **Curated Asset Screener**: Discover top market opportunities with categorized industry sectors and market cap filters.
- **Quick-Glance Metrics**: View 24h percentage changes, upside potential to target prices, and risk-reward ratings at a glance.
- **One-Click Deep Dive**: Instantly jump from any watchlist item directly into a full institutional report.

### 🔔 Price Alerts & Risk Monitoring
- **Custom Price Triggers**: Set upper and lower price threshold alerts to monitor breakouts and stop-loss levels.
- **Proactive Notifications**: Real-time status notifications for critical technical events.

### 🌍 Global Currency & Canonical Feeds
- **Multi-Currency Normalization**: Seamlessly analyze and convert assets in **USD ($)**, **GBP (£)**, and **EUR (€)** using live foreign exchange rates.
- **Verified Exchange Venue**: Canonical feed verification indicating live market venues (NASDAQ, NYSE, LSE, Euronext, etc.).
- **Smart Responsive Layout**: Desktop-first layout with high-density metrics and full mobile-friendly touch responsiveness.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Utility-first)
- **Animations**: Motion (via `motion/react`)
- **Charts**: Recharts & D3
- **AI Engine**: Google Gemini (Server-side via `@google/genai`)
- **Backend & Middleware**: Express.js with Vite middleware
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

---

## 📖 Usage Workflow

1. **Analyze a Ticker**: Enter any global stock symbol (e.g. `NVDA`, `AAPL`, `TSLA`, `MSFT`) in the search bar.
2. **Input Position Context (Optional)**: Provide your average purchase price and share quantity to calculate real-time holding gains, cost basis, and total market value.
3. **Select Currency**: Toggle between **USD ($)**, **GBP (£)**, or **EUR (€)** for instant FX conversion.
4. **Inspect Key Levels**: Review the **ATH Anchored VWAP**, **MA5**, **P/E Ratio**, **Dividend Yield**, and **Support/Resistance channels**.
5. **Manage Portfolio**: Add analyzed tickers directly to your persistent portfolio to track performance over time.
6. **Browse Watchlist**: Explore top market opportunities and set price target alerts.

---

## ⚠️ Disclaimer

Financial analyses, ratings, and price targets provided by StockPulse AI are generated for informational purposes only. The platform does not provide individualized financial advice. Always consult a certified financial advisor before executing investment transactions.

---

Built with ❤️ using Google AI Studio.
