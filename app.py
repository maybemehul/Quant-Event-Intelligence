import sys

sys.path.append("src")

import streamlit as st
import pandas as pd
import plotly.graph_objects as go

from connectors.csv_connector import CSVConnector
from data_pipeline import run_pipeline
from event_pipeline import generate_events
from evidence_builder import build_evidence
from llm_engine import generate_insight


# =========================================================
# PAGE CONFIG
# =========================================================

st.set_page_config(
    page_title="Market Intelligence",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)


# =========================================================
# CUSTOM CSS
# =========================================================

st.markdown("""
<style>

    /* Main page */
    .block-container {
        padding-top: 2rem;
        padding-bottom: 3rem;
        max-width: 1400px;
    }

    /* Header */
    .main-title {
        font-size: 2.4rem;
        font-weight: 700;
        margin-bottom: 0.2rem;
    }

    .subtitle {
        color: #8b949e;
        font-size: 1rem;
        margin-bottom: 2rem;
    }

    /* KPI cards */
    .kpi-card {
        background: linear-gradient(
            145deg,
            #161b22,
            #0d1117
        );
        border: 1px solid #30363d;
        border-radius: 12px;
        padding: 18px 20px;
        min-height: 115px;
    }

    .kpi-label {
        color: #8b949e;
        font-size: 0.85rem;
        margin-bottom: 8px;
    }

    .kpi-value {
        font-size: 1.8rem;
        font-weight: 650;
    }

    .kpi-description {
        color: #8b949e;
        font-size: 0.75rem;
        margin-top: 5px;
    }

    /* Section headings */
    .section-title {
        font-size: 1.35rem;
        font-weight: 650;
        margin-top: 2rem;
        margin-bottom: 0.8rem;
    }

    /* AI box */
    .ai-box {
        background: linear-gradient(
            145deg,
            #161b22,
            #10151c
        );
        border: 1px solid #30363d;
        border-radius: 14px;
        padding: 24px;
        margin-top: 10px;
    }

    .ai-label {
        color: #58a6ff;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    /* Status badges */
    .badge {
        display: inline-block;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .badge-green {
        background: rgba(46, 160, 67, 0.15);
        color: #3fb950;
    }

    .badge-yellow {
        background: rgba(210, 153, 34, 0.15);
        color: #d29922;
    }

    .badge-red {
        background: rgba(248, 81, 73, 0.15);
        color: #f85149;
    }

    /* Divider */
    .divider {
        border-top: 1px solid #30363d;
        margin: 30px 0;
    }

</style>
""", unsafe_allow_html=True)


# =========================================================
# SIDEBAR
# =========================================================

with st.sidebar:

    st.markdown("## 📈 Market Intelligence")

    st.caption(
        "Statistical event detection & AI-assisted analysis"
    )

    st.divider()

    st.markdown("### Data Source")

    source = st.selectbox(
        "Source",
        ["Local Market Dataset"],
        label_visibility="collapsed"
    )

  

    st.divider()

    st.markdown("### Analytics Engine")

    st.checkbox(
        "Statistical pivots",
        value=True,
        disabled=True
    )

    st.checkbox(
        "CUSUM change detection",
        value=True,
        disabled=True
    )

    st.checkbox(
        "Return analysis",
        value=True,
        disabled=True
    )

    st.checkbox(
        "Volatility analysis",
        value=True,
        disabled=True
    )

    st.divider()

    st.caption(
        "AI layer: Gemini\n"
        "Analytics: Python / Pandas\n"
        "Visualization: Plotly"
    )


# =========================================================
# DATA PIPELINE
# =========================================================

@st.cache_data
def load_data():

    connector = CSVConnector(
        "data/sample_market_data.csv"
    )

    df = connector.fetch("AAPL")

    df = run_pipeline(df)

    events = generate_events(df)

    return df, events


df, events_df = load_data()


# =========================================================
# HEADER
# =========================================================

st.markdown(
    '<div class="main-title">Market Intelligence</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="subtitle">'
    'Detect unusual market behaviour, quantify events, '
    'and generate evidence-grounded AI insights.'
    '</div>',
    unsafe_allow_html=True
)


# =========================================================
# KPI CARDS
# =========================================================

total_days = len(df)
total_events = len(events_df)
change_points = int(df["is_change_point"].sum())

if not events_df.empty:
    highest_score = events_df["event_score"].max()
else:
    highest_score = 0


cols = st.columns(4)

kpis = [
    (
        "TRADING DAYS",
        total_days,
        "Historical observations"
    ),
    (
        "EVENTS DETECTED",
        total_events,
        "Statistically significant"
    ),
    (
        "CUSUM ALERTS",
        change_points,
        "Structural shifts detected"
    ),
    (
        "MAX EVENT SCORE",
        highest_score,
        "Event significance"
    )
]

for col, (label, value, description) in zip(cols, kpis):

    with col:

        st.markdown(
            f"""
            <div class="kpi-card">
                <div class="kpi-label">{label}</div>
                <div class="kpi-value">{value}</div>
                <div class="kpi-description">{description}</div>
            </div>
            """,
            unsafe_allow_html=True
        )


# =========================================================
# PRICE CHART
# =========================================================

st.markdown(
    '<div class="section-title">Price Behaviour</div>',
    unsafe_allow_html=True
)

fig = go.Figure()

fig.add_trace(
    go.Scatter(
        x=df["date"],
        y=df["close"],
        mode="lines",
        name="Close",
        line=dict(width=2)
    )
)


if not events_df.empty:

    event_dates = pd.to_datetime(
        events_df["pivot_date"]
    )

    event_prices = []

    for date in event_dates:

        row = df[df["date"] == date]

        if not row.empty:
            event_prices.append(
                row.iloc[0]["close"]
            )

    fig.add_trace(
        go.Scatter(
            x=event_dates,
            y=event_prices,
            mode="markers",
            name="Detected Event",
            marker=dict(
                size=11,
                symbol="x"
            )
        )
    )


fig.update_layout(

    height=430,

    margin=dict(
        l=20,
        r=20,
        t=20,
        b=20
    ),

    hovermode="x unified",

    xaxis=dict(
        title="",
        showgrid=False
    ),

    yaxis=dict(
        title="Price",
        gridcolor="#30363d"
    ),

    legend=dict(
        orientation="h",
        yanchor="bottom",
        y=1.02,
        xanchor="right",
        x=1
    ),

    paper_bgcolor="rgba(0,0,0,0)",

    plot_bgcolor="rgba(0,0,0,0)"
)

st.plotly_chart(
    fig,
    use_container_width=True
)


# =========================================================
# MARKET SIGNAL
# =========================================================

st.markdown(
    '<div class="section-title">Market Signal</div>',
    unsafe_allow_html=True
)

if not events_df.empty:

    latest_event = events_df.iloc[-1]

    signal_col1, signal_col2, signal_col3 = st.columns(3)

    with signal_col1:

        st.metric(
            "Latest Event",
            latest_event["event_type"]
        )

    with signal_col2:

        st.metric(
            "Event Score",
            latest_event["event_score"]
        )

    with signal_col3:

        st.metric(
            "Post-Event Return",
            f"{latest_event['post_pivot_return']:.2%}"
        )

else:

    st.info(
        "No significant market events detected."
    )


# =========================================================
# EVENTS
# =========================================================

st.markdown(
    '<div class="section-title">Detected Events</div>',
    unsafe_allow_html=True
)

if not events_df.empty:

    display_df = events_df[
        
        [
            "pivot_date",
            "pivot_return",
            "pivot_z_score",
            "volume_change",
            "volatility_shift",
            "reversal_ratio",
            "post_pivot_return",
            "event_type",
            "event_score"
        ]
    ].copy()
    display_df["pivot_return"] = (display_df["pivot_return"] * 100).round(2).astype(str) + "%"
    display_df["volume_change"] = (display_df["volume_change"] * 100).round(2).astype(str) + "%"
    display_df["volatility_shift"] = (display_df["volatility_shift"] * 100).round(2).astype(str) + "%"
    display_df["reversal_ratio"] = (display_df["reversal_ratio"] * 100).round(0).astype(str) + "%"
    display_df["post_pivot_return"] = (display_df["post_pivot_return"] * 100).round(2).astype(str) + "%"

    display_df["pivot_date"] = pd.to_datetime(display_df["pivot_date"]).dt.strftime("%d %b %Y")

    display_df.columns = [
        "Date",
        "Return",
        "Z-Score",
        "Volume Δ",
        "Volatility Δ",
        "Reversal Ratio",
        "Post Return",
        "Event",
        "Score"
    ]

    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True
    )

else:

    st.info("No events detected.")


# =========================================================
# AI ANALYST
# =========================================================

st.markdown(
    '<div class="section-title">AI Analyst</div>',
    unsafe_allow_html=True
)

st.caption(
    "Gemini interprets the statistical evidence generated by the analytics engine."
)


if not events_df.empty:

    selected_event = st.selectbox(

        "Select an event",

        range(len(events_df)),

        format_func=lambda x:
            f"{pd.to_datetime(events_df.iloc[x]['pivot_date']).strftime('%d %b %Y')}  •  "
            f"{events_df.iloc[x]['event_type']}  •  "
            f"Score {events_df.iloc[x]['event_score']}",

        label_visibility="collapsed"
    )


    event = events_df.iloc[
        selected_event
    ].to_dict()


    if st.button(
        "Generate AI Insight",
        type="primary",
        use_container_width=False
    ):

        with st.spinner(
            "Gemini is analysing the event..."
        ):

            evidence = build_evidence(
                event
            )

            insight = generate_insight(
                evidence
            )


        st.markdown(
            """
            <div class="ai-box">
                <div class="ai-label">
                    AI-GENERATED ANALYSIS
                </div>
            """,
            unsafe_allow_html=True
        )

        st.write(insight)

        st.markdown(
            "</div>",
            unsafe_allow_html=True
        )


        with st.expander(
            "View statistical evidence"
        ):

            st.json(evidence)


# =========================================================
# METHODOLOGY
# =========================================================

st.markdown(
    '<div class="divider"></div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="section-title">How the system works</div>',
    unsafe_allow_html=True
)

method_cols = st.columns(4)

methods = [
    (
        "01",
        "Data",
        "Market price and volume observations"
    ),
    (
        "02",
        "Detection",
        "Returns, volatility, pivots and CUSUM"
    ),
    (
        "03",
        "Evidence",
        "Quantified event characteristics"
    ),
    (
        "04",
        "AI",
        "Evidence-grounded interpretation"
    )
]

for col, (number, title, description) in zip(
    method_cols,
    methods
):

    with col:

        st.markdown(
            f"""
            **{number} — {title}**

            {description}
            """
        )


st.caption(
    "This system provides analytical interpretation, not investment advice."
)