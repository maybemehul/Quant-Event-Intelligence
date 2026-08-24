import pandas as pd

from pivot_analysis import analyze_pivot
from event_engine import calculate_event_score


def generate_events(df):

    events = []

    pivot_indices = df.index[
        df["is_statistical_pivot"]
    ].tolist()

    for index in pivot_indices:

        event = analyze_pivot(df, index)

        is_change_point = df.loc[
            index,
            "is_change_point"
        ]

        event_score = calculate_event_score(
            event,
            is_change_point
        )

        event["is_change_point"] = is_change_point
        event["event_score"] = event_score

        events.append(event)

    return pd.DataFrame(events)