from feature_engineering import add_features
from pivot_detector import detect_statistical_pivots
from change_point_detector import detect_cusum


def run_pipeline(df):

    # 1. Create analytical features
    df = add_features(df)

    # 2. Detect statistically unusual price movements
    df = detect_statistical_pivots(df)

    # 3. Detect structural changes in the series
    df = detect_cusum(df)

    return df