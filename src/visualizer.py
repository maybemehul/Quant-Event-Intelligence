import plotly.graph_objects as go


def plot_pivots(df):

    fig = go.Figure()

    # Close price
    fig.add_trace(
        go.Scatter(
            x=df["date"],
            y=df["close"],
            mode="lines",
            name="Close Price"
        )
    )

    # Statistical pivots
    pivots = df[df["is_statistical_pivot"]]

    fig.add_trace(
        go.Scatter(
            x=pivots["date"],
            y=pivots["close"],
            mode="markers",
            name="Statistical Pivot",
            marker=dict(
                size=10,
                symbol="x"
            ),
            customdata=pivots[
                [
                    "daily_return",
                    "volatility",
                    "z_score"
                ]
            ],
            hovertemplate=(
                "<b>Date:</b> %{x}<br>"
                "<b>Close:</b> $%{y:.2f}<br>"
                "<b>Daily Return:</b> %{customdata[0]:.2%}<br>"
                "<b>Volatility:</b> %{customdata[1]:.2%}<br>"
                "<b>Z-Score:</b> %{customdata[2]:.2f}"
                "<extra></extra>"
            )
        )
    )

    fig.update_layout(
        title="Price Movement and Statistical Pivot Points",
        xaxis_title="Date",
        yaxis_title="Price",
        hovermode="x unified"
    )

    fig.show()