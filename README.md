# 📊 Trading Journal V4

A web-based trading journal built with React that transforms raw broker data into structured trades, advanced analytics, and a comprehensive trade review system for active traders.

---

## 🖥️ Preview

![Preview](./preview.png)

---

## 🚀 Key Features

### 📥 Smart CSV Import (Real Broker Data)

* Supports broker order history CSV
* Filters only **“Filled” executions**
* Handles semicolon-separated files
* Cleans and normalizes raw data automatically

---

### 🔄 Order → Trade Conversion

* Groups multiple fills into a single trade
* Supports:

  * Scaling in
  * Scaling out
* Automatically calculates:

  * Entry time
  * Exit time
  * Average entry/exit price
  * Total PnL
  * Direction (Long / Short)

---

### 🌍 Timezone Normalization

* Converts timestamps from local (NZ) to **New York market time**
* Enables accurate session-based analysis

---

### 💾 Local Data Persistence

* Trades are saved in **localStorage**
* Data remains after refresh
* No backend required

---

### ✏️ Trade Management

* Edit trade details:

  * Setup
  * Notes
  * Grade
  * Mistake tags
  * Emotion tags
  * Rules-followed checklist
* Delete individual trades
* Clean and flexible journaling workflow

---

### 🎯 Advanced Filtering System

Filter your trades by:

* Ticker
* Setup
* Win / Loss / Breakeven
* Date range

All filters dynamically update:

* Trade table
* Dashboard stats
* Charts
* Insights

---

### 📊 Analytics Dashboard

#### 📈 Key Statistics

* Total trades
* Win rate
* Average winner / loser
* Realized RRR
* Profit factor
* Best & worst stock
* Winning & losing streaks
* Average hold time
* Best trading session
* Worst trading session

---

#### 📉 Charts

* Equity curve
* Drawdown
* Performance by day
* Performance by time of day
* Performance by ticker
* Performance by setup

---

### 🧠 Advanced Performance Analysis

#### 📌 Stats by Setup

* Identify your most profitable strategies
* Compare win rate and PnL per setup

#### 📌 Stats by Ticker

* See which stocks you trade best
* Identify weak tickers to avoid

#### 📌 Long vs Short Analysis

* Compare long and short trade performance
* Analyze directional trading bias
* Track win rate and PnL by side

---

### 📝 Trade Review System

#### 🔍 Trade Detail View

* View a detailed summary of each trade
* Inspect entry and exit information
* Review all individual fills and scale-outs

#### 🏆 Trade Grading

* Grade trades using:

  * A+
  * A
  * B
  * C
  * D

#### 🏷️ Mistake Tagging

* Record execution mistakes such as:

  * Late Entry
  * FOMO
  * Overtrading
  * Chasing

#### 😊 Emotion Tracking

* Track emotional states during trades:

  * Calm
  * Hesitant
  * Fearful
  * Confident

#### ✅ Rules Checklist

* Mark whether the trade followed your trading plan

#### 🖼️ Screenshot Upload

* Upload and store chart screenshots
* Preview screenshots directly in the journal

---

### 💡 Smart Insights Engine

Automatically generates insights such as:

* Best and worst setups
* Strongest and weakest tickers
* Risk-to-reward behavior
* Trading session performance
* Performance feedback
* Losing streak warnings

---

## 🛠 Tech Stack

* **React (Vite)**
* **JavaScript**
* **Recharts** (data visualization)
* **PapaParse** (CSV parsing)
* **CSS** (custom styling)
* **FileReader API** (image uploads)

---

## 📁 Project Structure

```txt
src/
  app/
  components/
    dashboard/
    trades/
  features/
  lib/
  styles/
```

---

## ▶️ How to Run

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

---

## 📄 CSV Format

Supports broker order history CSV:

```txt
Date/Time;Symbol;Side;Quantity;Price;Event
```

Only rows with:

```txt
Event = Filled
```

are used.

---

## 🎯 Purpose

This project was built to:

* Analyze real trading performance using broker data
* Identify strengths and weaknesses
* Improve decision-making through data
* Build a structured trading review process
* Develop a professional-grade trading analytics dashboard
* Combine quantitative analytics with qualitative trade reviews

---

## 🧭 Roadmap

### ✅ Version 1

* CSV import
* Trade grouping
* Basic analytics

### ✅ Version 2

* Local storage persistence
* Trade editing & deletion
* Multi-filter system
* Stats by setup & ticker
* Improved insights engine

### ✅ Version 3

* Time-of-day performance analysis
* Session-based analytics (Open / Midday / Power Hour)
* Profit factor
* Long vs short analysis
* Performance charts by ticker and setup
* Average hold time tracking

### ✅ Version 4

* Trade detail view
* Full order breakdown
* Trade grading system
* Mistake tagging
* Emotion tracking
* Rules-followed checklist
* Screenshot upload and preview

### 🔜 Version 5

* Performance by trade grade
* Most common mistake analysis
* Emotion-based analytics
* Rules-followed win rate
* Review scoring dashboard

---

## 👨‍💻 Author

**Ralph Viado**
