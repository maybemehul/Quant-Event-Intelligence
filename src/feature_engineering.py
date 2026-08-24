def add_features(df):

    df = df.copy()

    # Daily percentage return
    df["daily_return"] = df["close"].pct_change()

    # Previous 20 trading days' average return
    df["rolling_mean"] = (
        df["daily_return"]
        .rolling(20)
        .mean()
        .shift(1)
    )

    # Previous 20 trading days' volatility
    df["volatility"] = (
        df["daily_return"]
        .rolling(20)
        .std()
        .shift(1)
    )

    # Statistical distance from recent behavior
    df["z_score"] = (
        (df["daily_return"] - df["rolling_mean"])
        / df["volatility"]
    )

    return df