# 📈 StockPulse AI

**StockPulse AI** is a professional-grade, real-time stock analysis and market intelligence platform. Powered by Google's Gemini 3 series models, it provides institutional-level technical analysis, news sentiment, and actionable investment insights in seconds.

![StockPulse Banner](https://picsum.photos/seed/finance/1200/400)

## ✨ Key Features

- **🚀 Real-Time Analysis**: Get instant reports on any stock ticker using live market data and Google Search grounding.
- **🧠 AI Intelligence**: Deep reasoning powered by Gemini to provide "Buy More", "Hold", or "Sell" recommendations with detailed entry/exit strategies.
- **📊 Chronological Charts**: Interactive price charts with 5-day Moving Averages (MA5), Support, and Resistance levels, sorted for clear trend visualization.
- **📰 Sentiment Tracking**: Real-time news aggregation with AI-powered sentiment analysis (Positive/Negative/Neutral).
- **💼 Portfolio Management**: Save and track multiple positions. Input your average purchase price and shares to track unrealized gains, market value, and total profit.
- **🎯 Centered Interface**: A streamlined, centered analysis form for a focused user experience.
- **🌍 Multi-Currency Support**: Analyze stocks in USD ($), GBP (£), or EUR (€).
- **📱 Responsive Design**: A beautiful, mobile-first interface built with Tailwind CSS and Framer Motion.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Utility-first)
- **Animations**: Framer Motion (via `motion/react`)
- **Charts**: Recharts
- **AI Engine**: Google Gemini 3 (via `@google/genai`)
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

1. **Analyze**: Enter a valid stock ticker (e.g., `NVDA`, `AAPL`, `TSLA`) in the centered search form.
2. **Context**: Provide your average purchase price and the number of shares you hold.
3. **Currency**: Select your preferred currency (USD, GBP, EUR).
4. **Report**: Click **Generate Report** to get a comprehensive AI-driven analysis.
5. **Portfolio**: Save your analysis to your portfolio to track performance over time.

## ⚠️ Disclaimer

Financial analysis provided by StockPulse AI is for informational purposes only. The AI models can occasionally provide inaccurate data. Always consult with a professional financial advisor before making investment decisions. Past performance is not indicative of future results.

---

Built with ❤️ using Google AI Studio.
