def detect_cusum(df, threshold=5, drift=0.5):

    df = df.copy()

    positive_sum = 0
    negative_sum = 0

    change_points = []

    for i, row in df.iterrows():

        z = row["z_score"]

        if z != z:
            continue

        positive_sum = max(
            0,
            positive_sum + z - drift
        )

        negative_sum = min(
            0,
            negative_sum + z + drift
        )

        if positive_sum >= threshold:

            change_points.append(i)
            positive_sum = 0

        elif negative_sum <= -threshold:

            change_points.append(i)
            negative_sum = 0

    df["is_change_point"] = False

    df.loc[
        change_points,
        "is_change_point"
    ] = True

    return df