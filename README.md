# 📈 StockPulse AI

**StockPulse AI** is a professional-grade, real-time stock analysis and market intelligence platform. Powered by Google's Gemini 3.1 Pro, it provides institutional-level technical analysis, news sentiment, and actionable investment insights in seconds.

![StockPulse Banner](https://girlyn.com//images/StockPulseAI.gif)

## ✨ Key Features

- **🚀 Real-Time Analysis**: Get instant reports on any stock ticker using live market data.
- **🧠 AI Intelligence**: Deep reasoning powered by Gemini to provide "Buy More", "Hold", or "Sell" recommendations.
- **📊 Technical Indicators**: Automatic calculation of 5-day Moving Averages (MA5), Support, and Resistance levels.
- **📰 Sentiment Tracking**: Real-time news aggregation with AI-powered sentiment analysis (Positive/Negative/Neutral).
- **💼 Portfolio Tracking**: Input your average purchase price and shares to track unrealized gains, market value, and total profit.
- **🌍 Multi-Currency Support**: Analyze stocks in USD ($), GBP (£), or EUR (€).
- **📱 Responsive Design**: A beautiful, mobile-first interface built with Tailwind CSS and Framer Motion.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **AI Engine**: Google Gemini 3.1 Pro (via `@google/genai`)
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API Key (Get one at [aistudio.google.com](https://aistudio.google.com/))

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

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 📖 Usage

1. Enter a valid stock ticker (e.g., `NVDA`, `AAPL`, `TSLA`).
2. Provide your average purchase price and the number of shares you hold.
3. Select your preferred currency.
4. Click **ANALYZE** to generate a comprehensive report.
5. Watch the live price updates every 30 seconds.

## ⚠️ Disclaimer

Financial analysis provided by StockPulse AI is for informational purposes only. The AI models can occasionally provide inaccurate data. Always consult with a professional financial advisor before making investment decisions. Past performance is not indicative of future results.

---

Built with ❤️ using Google AI Studio.
