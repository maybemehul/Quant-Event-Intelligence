# Quant Event Intelligence

An evidence-driven financial analytics system that detects statistically unusual market events, quantifies their characteristics, and uses an LLM to generate human-readable analyst insights.

## Overview

Quant Event Intelligence combines quantitative analysis with generative AI.

Instead of asking an LLM to directly predict market movements, the system first performs deterministic statistical analysis and produces a structured evidence layer. The LLM then interprets that evidence.

This separation keeps the analytical layer transparent and makes the AI output evidence-grounded.

## Architecture

Market Data
    ↓
Connector Layer
    ↓
Feature Engineering
    ↓
Statistical Event Detection
    ↓
Event Analysis & Scoring
    ↓
Evidence Layer
    ↓
Gemini LLM
    ↓
AI Analyst Insight
    ↓
Streamlit Dashboard

## Core Components

### 1. Data Ingestion

The project uses a connector-based architecture for market data.

Currently implemented:

- Local CSV market data connector
- Alpha Vantage integration

The connector abstraction allows additional institutional data providers to be added without changing the downstream analytics pipeline.

Potential future integrations include:

- S&P Capital IQ
- LSEG Workspace

These are treated as provider-specific connectors rather than tightly coupling the analytics engine to a single data source.

### 2. Feature Engineering

The system derives quantitative features from OHLCV market data:

- Daily returns
- Rolling mean
- Rolling volatility
- Z-score
- Volume changes

Daily return:

r_t = (P_t / P_{t-1}) - 1

Rolling volatility is calculated using the standard deviation of recent returns.

### 3. Statistical Event Detection

The system identifies unusual market behaviour using multiple signals:

- Statistical pivot detection
- Return anomalies
- Z-score thresholds
- Volatility changes
- Volume changes
- CUSUM-based change-point detection

This allows the system to distinguish isolated shocks from potentially persistent behavioural changes.

### 4. Event Analysis

For every detected event, the system compares market behaviour before and after the event.

Metrics include:

- Pre-event average return
- Post-event average return
- Return shift
- Volume change
- Volatility shift
- Same-direction persistence
- Reversal ratio
- Post-event return

Events are subsequently classified into categories such as:

- Reversal
- Continuation
- Isolated Shock

### 5. Event Scoring

Events receive a quantitative score based on the strength of their statistical characteristics.

The score provides a compact measure of event significance and can be used to rank detected events.

### 6. Evidence Layer

Before reaching the LLM, the system converts the quantitative analysis into a structured evidence object.

Example:

{
    "event_date": "2026-06-02",
    "return": -0.06,
    "z_score": -4.13,
    "volume_change": 0.128,
    "volatility_shift": 0.0052,
    "reversal_ratio": 0.6,
    "post_event_return": -0.003,
    "change_point": false,
    "event_type": "Reversal",
    "event_score": 3
}

This creates a clean boundary between deterministic analytics and generative AI.

### 7. LLM Analyst Layer

Gemini receives the structured statistical evidence and generates an analyst-style interpretation.

The LLM is explicitly instructed to:

- Use only supplied evidence
- Avoid inventing causes
- Distinguish statistical evidence from speculation
- Explain the detected event
- Interpret post-event behaviour

The LLM therefore acts as an interpretation layer rather than the source of the financial signal.

## Dashboard

The Streamlit dashboard provides:

- Market overview
- Trading-day statistics
- Detected event count
- CUSUM alerts
- Maximum event score
- Price and event visualization
- Event analysis table
- Interactive event selection
- AI-generated analyst insights
- Expandable statistical evidence

## Tech Stack

Python  
Pandas  
NumPy  
Requests  
Plotly  
Streamlit  
Google Gemini API  
Alpha Vantage API

## Project Structure

    Quant-Event-Intelligence/
    │
    ├── app.py
    ├── requirements.txt
    ├── data/
    │   └── sample_market_data.csv
    │
    ├── src/
    │   ├── connectors/
    │   ├── data_processor.py
    │   ├── feature_engineering.py
    │   ├── pivot_detector.py
    │   ├── pivot_analysis.py
    │   ├── change_point_detector.py
    │   ├── event_engine.py
    │   ├── evidence_builder.py
    │   ├── llm_engine.py
    │   └── ...
    │
    ├── .env.example
    ├── .gitignore
    └── README.md

## Installation

Clone the repository:

    git clone https://github.com/maybemehul/Quant-Event-Intelligence.git

Move into the project:

    cd Quant-Event-Intelligence

Create a virtual environment:

    python -m venv .venv

Activate it on Windows:

    .venv\Scripts\activate

Install dependencies:

    pip install -r requirements.txt

## Environment Variables

Create a `.env` file in the project root.

Add:

    ALPHAVANTAGE_API_KEY=your_key
    GEMINI_API_KEY=your_key

Never commit `.env` to GitHub.

## Running the Dashboard

Run:

    streamlit run app.py

The application will open locally in your browser.

## Design Philosophy

The central design principle is:

    Detect → Quantify → Evidence → Interpret

The statistical engine determines what happened.

The evidence layer explains why the event is significant.

The LLM converts that evidence into an analyst-readable interpretation.

This prevents the LLM from becoming an opaque black-box signal generator.

## Future Improvements

- Live multi-provider market data ingestion
- S&P Capital IQ connector
- LSEG Workspace connector
- Additional market and fundamental datasets
- News/event correlation
- Sector-level event analysis
- Cross-asset event detection
- Persistent event database
- Backtesting framework
- Automated event monitoring

## Disclaimer

This project is intended for research and educational purposes.

It provides analytical interpretations of historical market data and does not constitute investment advice.