def analyze_pivot(df, pivot_index, window=5):

    start = max(0, pivot_index - window)
    end = min(len(df), pivot_index + window + 1)

    pivot = df.iloc[pivot_index]

    before = df.iloc[start:pivot_index]
    after = df.iloc[pivot_index + 1:end]

    before_avg_return = before["daily_return"].mean()
    after_avg_return = after["daily_return"].mean()

    before_avg_volume = before["volume"].mean()
    after_avg_volume = after["volume"].mean()

    before_avg_volatility = before["volatility"].mean()
    after_avg_volatility = after["volatility"].mean()

    # Change in average return
    return_shift = after_avg_return - before_avg_return

    # Change in volume
    if before_avg_volume != 0:
        volume_change = (
            (after_avg_volume - before_avg_volume)
            / before_avg_volume
        )
    else:
        volume_change = None

    # Change in volatility
    volatility_shift = (
        after_avg_volatility - before_avg_volatility
    )

    # ------------------------------------------------
    # PERSISTENCE- did the following day move in the same direction
    # ------------------------------------------------

    pivot_direction = -1 if pivot["daily_return"] < 0 else 1

    if not after.empty:

        same_direction_days = (
            (after["daily_return"] * pivot_direction) > 0
        ).sum()

        persistence_ratio = (
            same_direction_days / len(after)
        )
        opposite_direction_days = ((after["daily_return"] * pivot_direction) < 0).sum()
        reversal_ratio = (opposite_direction_days / len(after))
        post_pivot_return = ((1 + after["daily_return"]).prod() - 1)
        if persistence_ratio >= 0.6:
            event_type = "Continuation"
        elif reversal_ratio >= 0.6:
            event_type = "Reversal"
        else:
            vent_type = "Mixed / Unclear"

    else:

        same_direction_days = 0
        persistence_ratio = 0

    # ------------------------------------------------
    # CLASSIFICATION
    # ------------------------------------------------

    if persistence_ratio >= 0.6:

        behavior_change = "Persistent Movement"

    else:

        behavior_change = "Possible Isolated Shock / Reversal"

    analysis = {

        "pivot_date": pivot["date"],
        "pivot_close": pivot["close"],
        "pivot_return": pivot["daily_return"],
        "pivot_z_score": pivot["z_score"],
        "pivot_volatility": pivot["volatility"],

        "before_avg_return": before_avg_return,
        "after_avg_return": after_avg_return,
        "return_shift": return_shift,

        "before_avg_volume": before_avg_volume,
        "after_avg_volume": after_avg_volume,
        "volume_change": volume_change,

        "before_avg_volatility": before_avg_volatility,
        "after_avg_volatility": after_avg_volatility,
        "volatility_shift": volatility_shift,

        "same_direction_days": same_direction_days,
        "persistence_ratio": persistence_ratio,

        "opposite_direction_days": opposite_direction_days,
        "reversal_ratio": reversal_ratio,
        "post_pivot_return": post_pivot_return,
        "event_type": event_type
    }

    return analysis