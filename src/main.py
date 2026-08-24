from connectors.csv_connector import CSVConnector

from data_pipeline import run_pipeline
from event_pipeline import generate_events
from evidence_builder import build_evidence
from llm_engine import generate_insight


# -----------------------------
# DATA SOURCE
# -----------------------------

connector = CSVConnector(
    "data/sample_market_data.csv"
)

df = connector.fetch("AAPL")


# -----------------------------
# ANALYTICS PIPELINE
# -----------------------------

df = run_pipeline(df)


# -----------------------------
# EVENT ENGINE
# -----------------------------

events_df = generate_events(df)
if not events_df.empty:

    evidence = build_evidence(
        events_df.iloc[0].to_dict()
    )

    print("\n========== AI EVIDENCE ==========\n")

    print(evidence)

    print("\n========== AI INSIGHT ==========\n")
    print(generate_insight(evidence))
# -----------------------------
# RESULTS
# -----------------------------

print("\n========== DATA ==========\n")

print(df.tail())

print("\n========== EVENTS ==========\n")

if events_df.empty:

    print("No significant events detected.")

else:

    print(
        events_df[
            [
                "pivot_date",
                "pivot_return",
                "pivot_z_score",
                "volume_change",
                "volatility_shift",
                "reversal_ratio",
                "post_pivot_return",
                "is_change_point",
                "event_type",
                "event_score"
            ]
        ]
    )