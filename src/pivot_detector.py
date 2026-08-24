def detect_statistical_pivots(df, z_threshold=3):
    df = df.copy()

    df["is_statistical_pivot"] = (df["z_score"].abs() >= z_threshold)

    return df