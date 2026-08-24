def calculate_event_score(event, is_change_point):

    score = 0

    # 1. Extreme statistical movement
    if abs(event["pivot_z_score"]) >= 3:
        score += 2

    # 2. Change-point confirmation
    if is_change_point:
        score += 2

    # 3. Strong volume change
    if abs(event["volume_change"]) >= 0.50:
        score += 1

    # 4. Volatility increased
    if event["volatility_shift"] > 0:
        score += 1

    return score