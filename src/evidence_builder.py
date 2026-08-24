def build_evidence(event):

    return {
        "event_date": str(event["pivot_date"]),
        "return": round(event["pivot_return"], 4),
        "z_score": round(event["pivot_z_score"], 2),
        "volume_change": round(event["volume_change"], 4),
        "volatility_shift": round(event["volatility_shift"], 4),
        "reversal_ratio": round(event["reversal_ratio"], 2),
        "post_event_return": round(event["post_pivot_return"], 4),
        "change_point": bool(event["is_change_point"]),
        "event_type": event["event_type"],
        "event_score": event["event_score"]
    }