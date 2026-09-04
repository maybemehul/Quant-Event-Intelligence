import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  ArrowDown,
  ChevronRight,
  Loader2,
  Plus,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

type StockData = {
  symbol: string
  price: number
  change: number
  change_percent: number
  change_since_check: number
  previous_check: string | null
  volume: number
  latest_trading_day: string
  score: number
  priority: string
  reasons: string[]
  z_score: number
  volume_ratio: number
  volatility: number
}

type Stock = {
  id: number
  symbol: string
}

type HistoryPoint = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function App() {
  const [newStock, setNewStock] = useState("")
  const [adding, setAdding] = useState(false)
  const [backendStatus, setBackendStatus] = useState("Checking...")
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)

  const [marketData, setMarketData] = useState<
    Record<string, StockData>
  >({})

  const [lastChecked, setLastChecked] = useState<string | null>(
    null
  )

  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSymbol, setAiSymbol] = useState<string | null>(null)

  const [chartSymbol, setChartSymbol] = useState<string | null>(null)
  const [chartHistory, setChartHistory] = useState<HistoryPoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartRange, setChartRange] = useState("1M")

  const [stockErrors, setStockErrors] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    fetch("https://smart-market-watch.onrender.com/health")
      .then((response) => response.json())
      .then((data) => setBackendStatus(data.status))
      .catch(() => setBackendStatus("Offline"))
  }, [])

  useEffect(() => {
    fetch("https://smart-market-watch.onrender.com/watchlist")
      .then((response) => response.json())
      .then((data) => {
        setStocks(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (stocks.length === 0) {
      setLoading(false)
      return
    }

    const checkWatchlist = async () => {
      try {
        const lastCheckedResponse = await fetch(
          "https://smart-market-watch.onrender.com/last-checked"
        )

        const lastCheckedData =
          await lastCheckedResponse.json()

        setLastChecked(lastCheckedData.last_checked)

        for (const stock of stocks) {
          try {
            const response = await fetch(
              `https://smart-market-watch.onrender.com/check/${stock.symbol}`,
              {
                method: "POST",
              }
            )

            if (!response.ok) {
              const errorData =
                await response.json().catch(() => null)

              setStockErrors((current) => ({
                ...current,
                [stock.symbol]:
                  errorData?.detail ||
                  "Market data unavailable",
              }))

              continue
            }

            const data = await response.json()

            setStockErrors((current) => {
              const updated = { ...current }
              delete updated[stock.symbol]
              return updated
            })

            setMarketData((current) => ({
              ...current,
              [stock.symbol]: {
                ...data,
                symbol: stock.symbol,
                
              },
            }))
          } catch (error) {
            console.error(
              `${stock.symbol} request error:`,
              error
            )

            setStockErrors((current) => ({
              ...current,
              [stock.symbol]:
                "Market data unavailable",
            }))
          }
        }

        await fetch(
          "https://smart-market-watch.onrender.com/last-checked",
          {
            method: "POST",
          }
        )
      } finally {
        setLoading(false)
      }
    }

    checkWatchlist()
  }, [stocks])

  useEffect(() => {
    if (!chartSymbol) return

    const loadHistory = async () => {
      setChartLoading(true)

      try {
        const response = await fetch(
          `https://smart-market-watch.onrender.com/history/${chartSymbol}`
        )

        if (!response.ok) {
          throw new Error("Unable to load history")
        }

        const data = await response.json()

        setChartHistory(data.history)
      } catch (error) {
        console.error(
          "Chart history error:",
          error
        )

        setChartHistory([])
      } finally {
        setChartLoading(false)
      }
    }

    loadHistory()
  }, [chartSymbol])

  const highestPriority = Object.values(
    marketData
  ).reduce(
    (highest, current) =>
      !highest ||
      current.score > highest.score
        ? current
        : highest,
    null as StockData | null
  )

  const meaningfulChanges = Object.values(
    marketData
  ).filter(
    (stock) =>
      Math.abs(stock.change_since_check) >= 2
  ).length

  const getPriorityStyles = (priority: string) => {
  switch (priority) {
    case "High":
      return {
        badge: "bg-[#542530] text-[#FFE58A]",
        card: "border-[#542530]/20 bg-[#FFF1F3]",
        icon: "bg-[#542530] text-[#FFE58A]",
        label: "High attention",
      }

    case "Medium":
      return {
        badge: "bg-[#FFE58A] text-[#542530]",
        card: "border-[#E5C85A]/40 bg-[#FFFBEA]",
        icon: "bg-[#FFE58A] text-[#542530]",
        label: "Worth checking",
      }

    default:
      return {
        badge: "bg-[#FCEEF0] text-[#9B737A]",
        card: "border-[#542530]/10 bg-white",
        icon: "bg-[#F7C9D0] text-[#542530]",
        label: "Normal activity",
      }
  }
}
  const scrollTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
  }

  const openStock = (symbol: string) => {
    setChartSymbol(symbol)
    setChartRange("1M")

    setTimeout(() => {
      scrollTo("stock-intelligence")
    }, 50)
  }

  const addStock = async () => {
    if (!newStock.trim()) return

    setAdding(true)

    try {
      const response = await fetch(
        "https://smart-market-watch.onrender.com/watchlist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol:
              newStock.trim().toUpperCase(),
          }),
        }
      )

      if (response.ok) {
        const added = await response.json()

        setStocks((current) => [
          ...current,
          added,
        ])

        setNewStock("")
      }
    } finally {
      setAdding(false)
    }
  }

  const removeStock = async (
    symbol: string
  ) => {
    const response = await fetch(
      `https://smart-market-watch.onrender.com/watchlist/${symbol}`,
      {
        method: "DELETE",
      }
    )

    if (response.ok) {
      setStocks((current) =>
        current.filter(
          (stock) =>
            stock.symbol !== symbol
        )
      )

      setMarketData((current) => {
        const updated = { ...current }
        delete updated[symbol]
        return updated
      })

      setStockErrors((current) => {
        const updated = { ...current }
        delete updated[symbol]
        return updated
      })

      if (aiSymbol === symbol) {
        setAiInsight(null)
        setAiSymbol(null)
      }

      if (chartSymbol === symbol) {
        setChartSymbol(null)
        setChartHistory([])
      }
    }
  }

  const understandChange = async (
  symbol: string
) => {
  setAiLoading(true)
  setAiInsight(null)
  setAiSymbol(symbol)

  try {
    const response = await fetch(
      `https://smart-market-watch.onrender.com/ai-insight/${symbol}`,
      {
        method: "POST",
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          "Unable to generate AI insight"
      )
    }

    if (!data?.insight) {
      throw new Error(
        "Gemini returned an empty response."
      )
    }

    setAiInsight(data.insight)

    setTimeout(() => {
      scrollTo("ai-analyst")
    }, 100)

  } catch (error) {
    console.error(
      "AI insight error:",
      error
    )

    
    setAiInsight(
      "AI Analyst is temporarily unavailable. Your quantitative market analysis is still available."
    )

    setTimeout(() => {
      scrollTo("ai-analyst")
    }, 100)

  } finally {
    setAiLoading(false)
  }
}

  const renderBoldText = (
    text: string
  ) => {
    const cleaned = text
      .replace(/\*\*(.*?)\*\*/g, "|||BOLD|||$1|||/BOLD|||")
      .replace(/\*(.*?)\*/g, "|||BOLD|||$1|||/BOLD|||")

    const parts = cleaned.split(
      /(\|\|\|BOLD\|\|\|.*?\|\|\|\/BOLD\|\|\|)/
    )

    return parts.map(
      (part, index) => {
        if (
          part.startsWith(
            "|||BOLD|||"
          )
        ) {
          const boldText = part
            .replace(
              "|||BOLD|||",
              ""
            )
            .replace(
              "|||/BOLD|||",
              ""
            )

          return (
            <strong
              key={index}
              className="font-semibold text-[#542530]"
            >
              {boldText}
            </strong>
          )
        }

        return (
          <span key={index}>
            {part}
          </span>
        )
      }
    )
  }

  const renderInsight = (
    text: string
  ) => {
    const lines = text
      .replace(/\r/g, "")
      .split("\n")
      .map((line) =>
        line
          .replace(/^#{1,6}\s*/, "")
          .trim()
      )
      .filter(Boolean)

    return (
      <div className="space-y-7">

        {lines.map(
          (originalLine, index) => {

            let line = originalLine

            /*
              REMOVE MARKDOWN BULLET SYMBOLS
            */

            const bulletMatch =
              line.match(
                /^[-•*]\s+(.*)$/
              )

            if (bulletMatch) {
              line = bulletMatch[1]

              return (
                <div
                  key={index}
                  className="flex items-start gap-3 pl-12"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D77F8B]" />

                  <p className="text-sm leading-7 text-[#73505A]">
                    {renderBoldText(
                      line
                    )}
                  </p>
                </div>
              )
            }

            /*
              NUMBERED SECTION HEADINGS

              Handles:
              1. What Happened
              2. Why...
              3. ...
            */

            const numberedMatch =
              line.match(
                /^(\d+)\.\s+(.*)$/
              )

            if (numberedMatch) {
              const number =
                numberedMatch[1]

              const title =
                numberedMatch[2]
                  .replace(
                    /^[-•*]\s*/,
                    ""
                  )
                  .replace(
                    /^\*(.*?)\*$/,
                    "$1"
                  )
                  .replace(
                    /\*\*/g,
                    ""
                  )
                  .trim()

              return (
                <div
                  key={index}
                  className="flex items-start gap-4"
                >

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#542530] text-sm font-semibold text-[#FFE58A]">
                    {number}
                  </div>

                  <h3 className="pt-2 text-base font-semibold leading-6 text-[#542530]">
                    {renderBoldText(
                      title
                    )}
                  </h3>

                </div>
              )
            }

            /*
              CLEAN STANDALONE MARKDOWN EMPHASIS

              Example:
              *Statistical Evidence:*
              **Statistical Evidence:**
            */

            const standaloneBold =
              line.match(
                /^\*\*(.*?)\*\*$/
              )

            if (standaloneBold) {
              return (
                <p
                  key={index}
                  className="pl-12 text-sm font-semibold leading-7 text-[#542530]"
                >
                  {
                    standaloneBold[1]
                  }
                </p>
              )
            }

            const standaloneItalic =
              line.match(
                /^\*(.*?)\*$/
              )

            if (standaloneItalic) {
              return (
                <p
                  key={index}
                  className="pl-12 text-sm font-semibold leading-7 text-[#542530]"
                >
                  {
                    standaloneItalic[1]
                  }
                </p>
              )
            }

            /*
              NORMAL PARAGRAPH
            */

            return (
              <p
                key={index}
                className="pl-12 text-sm leading-7 text-[#73505A]"
              >
                {renderBoldText(
                  line
                    .replace(
                      /^[-•*]\s*/,
                      ""
                    )
                )}
              </p>
            )
          }
        )}

      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF7F8] text-[#542530]">

      {/* NAVBAR */}

      <header className="sticky top-0 z-50 border-b border-[#542530]/10 bg-[#FFF7F8]/90 backdrop-blur-xl">

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">

          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="flex items-center gap-3"
          >

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#542530] text-[#FFE58A]">
              <Activity
                size={18}
                strokeWidth={2.5}
              />
            </div>

            <div className="text-left">

              <div className="text-sm font-semibold tracking-tight">
                Market Watch
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-[#9B737A]">

                <span className="h-1.5 w-1.5 rounded-full bg-[#79A85E]" />

                {backendStatus ===
                "healthy"
                  ? "System operational"
                  : backendStatus}

              </div>

            </div>

          </button>

          <nav className="hidden items-center gap-8 text-sm text-[#9B737A] md:flex">

            <button
              onClick={() =>
                scrollTo("watchlist")
              }
              className="transition hover:text-[#542530]"
            >
              Watchlist
            </button>

            <button
              onClick={() =>
                scrollTo("intelligence")
              }
              className="transition hover:text-[#542530]"
            >
              Intelligence
            </button>

            <button
              onClick={() =>
                scrollTo("method")
              }
              className="transition hover:text-[#542530]"
            >
              How it works
            </button>

          </nav>

          <button
            onClick={() =>
              scrollTo("watchlist")
            }
            className="rounded-lg bg-[#FFE58A] px-4 py-2 text-xs font-semibold text-[#542530] shadow-sm transition hover:bg-[#FFDD67]"
          >
            + Add stock
          </button>

        </div>

      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-[#542530]/10">

        <div className="absolute right-[-8%] top-[-20%] h-[600px] w-[600px] rounded-full bg-[#F7C9D0] opacity-60 blur-3xl" />

        <div className="absolute bottom-[-25%] left-[-10%] h-[450px] w-[450px] rounded-full bg-[#FFE58A] opacity-35 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 lg:px-8 lg:pb-32 lg:pt-32">

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
            className="max-w-3xl"
          >

            <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#9B737A]">

              <span className="h-px w-8 bg-[#9B737A]" />

              Your market, without the noise

            </div>

            <h1 className="text-5xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">

              Know what changed.

              <br />

              <span className="text-[#D77F8B]">
                Know what matters.
              </span>

            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-[#9B737A] sm:text-lg">
              Market Watch monitors the stocks you care about
              and surfaces the movements worth your attention —
              instead of making you check everything yourself.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">

              <button
                onClick={() =>
                  scrollTo("watchlist")
                }
                className="flex items-center gap-2 rounded-lg bg-[#FFE58A] px-5 py-3 text-sm font-semibold text-[#542530] shadow-sm transition hover:bg-[#FFDD67]"
              >
                Start tracking
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() =>
                  scrollTo("method")
                }
                className="rounded-lg border border-[#542530]/15 bg-white/70 px-5 py-3 text-sm font-medium text-[#542530] transition hover:bg-white"
              >
                See how it works
              </button>

            </div>

          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              delay: 0.2,
            }}
            className="mt-20 overflow-hidden rounded-3xl border border-[#542530]/10 bg-white/85 shadow-[0_20px_60px_rgba(84,37,48,0.08)]"
          >

            <div className="flex items-center justify-between border-b border-[#542530]/10 px-5 py-4">

              <div>

                <p className="text-sm font-semibold">
                  Your watchlist
                </p>

                <p className="mt-1 text-xs text-[#9B737A]">
                  Live market intelligence
                </p>

              </div>

              <div className="flex items-center gap-2 text-xs text-[#9B737A]">

                <span className="h-1.5 w-1.5 rounded-full bg-[#79A85E]" />

                Connected

              </div>

            </div>

            <div className="grid md:grid-cols-3">

              {stocks.slice(0, 3).map(
                (stock, index) => {

                  const data =
                    marketData[
                      stock.symbol
                    ]

                  return (
                    <button
                      key={stock.id}
                      onClick={() =>
                        openStock(
                          stock.symbol
                        )
                      }
                      className={`p-7 text-left transition hover:bg-[#FFF7F8] ${
                        index !== 0
                          ? "border-t border-[#542530]/10 md:border-l md:border-t-0"
                          : ""
                      }`}
                    >

                      <div className="flex items-center justify-between">

                        <span className="text-sm font-semibold">
                          {stock.symbol}
                        </span>

                        {data && (
                          <span
                            className={
                              data.change_since_check >
                              0
                                ? "text-[#628C4C]"
                                : data.change_since_check <
                                  0
                                ? "text-[#C45D68]"
                                : "text-[#9B737A]"
                            }
                          >
                            {data.change_since_check >
                            0
                              ? "+"
                              : ""}
                            {
                              data.change_since_check
                            }%
                          </span>
                        )}

                      </div>

                      <div className="mt-6 text-3xl font-semibold tracking-tight">

                        {data
                          ? `$${data.price.toFixed(2)}`
                          : stockErrors[
                              stock.symbol
                            ]
                          ? "Unavailable"
                          : "Loading..."}

                      </div>

                      <div className="mt-2 text-xs text-[#B88D94]">

                        {stockErrors[
                          stock.symbol
                        ]
                          ? "Check the ticker symbol"
                          : "Since your last check"}

                      </div>

                    </button>
                  )
                }
              )}

              {stocks.length === 0 && (

                <div className="p-10 text-sm text-[#9B737A] md:col-span-3">
                  Add your first stock below.
                </div>

              )}

            </div>

          </motion.div>

        </div>

        <div className="flex justify-center pb-8 text-[#B88D94]">
          <ArrowDown
            size={18}
            className="animate-bounce"
          />
        </div>

      </section>

      {/* WATCHLIST */}

      <section
        id="watchlist"
        className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24 lg:px-8 lg:py-32"
      >

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.2,
          }}
        >

          <p className="text-xs uppercase tracking-[0.2em] text-[#9B737A]">
            Your watchlist
          </p>

          <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">

            <div>

              <h2 className="text-4xl font-semibold tracking-[-0.04em]">

                Keep an eye on
                <br />

                <span className="text-[#D77F8B]">
                  what matters.
                </span>

              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-[#9B737A]">
                Add the stocks you care about. Market Watch
                keeps their latest state ready for your next
                visit.
              </p>

            </div>

            <div className="flex gap-2">

              <input
                value={newStock}
                onChange={(e) =>
                  setNewStock(
                    e.target.value.toUpperCase()
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    addStock()
                }}
                placeholder="AAPL"
                className="w-28 rounded-lg border border-[#542530]/15 bg-white/80 px-3 py-2.5 text-sm text-[#542530] outline-none placeholder:text-[#C49AA1] focus:border-[#542530]/30"
              />

              <button
                onClick={addStock}
                disabled={
                  adding ||
                  !newStock.trim()
                }
                className="flex items-center gap-2 rounded-lg bg-[#FFE58A] px-4 py-2.5 text-sm font-semibold text-[#542530] shadow-sm transition hover:bg-[#FFDD67] disabled:opacity-40"
              >

                <Plus size={15} />

                {adding
                  ? "Adding..."
                  : "Add"}

              </button>

            </div>

          </div>

          <div className="mt-12 overflow-hidden rounded-3xl border border-[#542530]/10 bg-white/80 shadow-[0_15px_45px_rgba(84,37,48,0.05)]">

            <div className="hidden grid-cols-[1fr_180px_180px_100px] border-b border-[#542530]/10 px-6 py-3 text-[10px] uppercase tracking-wider text-[#B88D94] md:grid">

              <span>Stock</span>
              <span>Price</span>
              <span>Since last check</span>
              <span />

            </div>

            {loading ? (

              <div className="p-8 text-sm text-[#9B737A]">
                Loading your watchlist...
              </div>

            ) : stocks.length === 0 ? (

              <div className="p-12 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7C9D0] text-[#542530]">
                  <TrendingUp size={22} />
                </div>

                <p className="mt-5 text-sm font-semibold">
                  Your watchlist is empty.
                </p>

                <p className="mt-1 text-xs text-[#9B737A]">
                  Add a ticker above to start tracking.
                </p>

              </div>

            ) : (

              stocks.map(
                (stock, index) => {

                  const data =
                    marketData[
                      stock.symbol
                    ]

                  return (
                    <motion.div
                      key={stock.id}
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      whileInView={{
                        opacity: 1,
                        y: 0,
                      }}
                      viewport={{
                        once: true,
                      }}
                      transition={{
                        delay:
                          index * 0.05,
                      }}
                      className="grid gap-4 border-b border-[#542530]/10 px-6 py-6 last:border-0 md:grid-cols-[1fr_180px_180px_100px] md:items-center"
                    >

                      <button
                        onClick={() =>
                          openStock(
                            stock.symbol
                          )
                        }
                        className="flex items-center gap-4 text-left transition hover:opacity-70"
                      >

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7C9D0] text-xs font-semibold text-[#542530]">
                          {stock.symbol.slice(
                            0,
                            2
                          )}
                        </div>

                        <div>

                          <p className="text-sm font-semibold">
                            {stock.symbol}
                          </p>

                          <p className="mt-1 text-xs text-[#B88D94]">
                            View intelligence →
                          </p>

                        </div>

                      </button>

                      <div>

                        <p className="text-sm font-semibold">

                          {data
                            ? `$${data.price.toFixed(2)}`
                            : stockErrors[
                                stock.symbol
                              ]
                            ? "Unavailable"
                            : "Loading..."}

                        </p>

                        <p className="mt-1 text-xs text-[#B88D94]">

                          {stockErrors[
                            stock.symbol
                          ]
                            ? "Check the ticker symbol"
                            : "Current price"}

                        </p>

                      </div>

                      <div>

                        {data ? (

                          <>
                            <p
                              className={`text-sm font-semibold ${
                                data.change_since_check >
                                0
                                  ? "text-[#628C4C]"
                                  : data.change_since_check <
                                    0
                                  ? "text-[#C45D68]"
                                  : "text-[#9B737A]"
                              }`}
                            >

                              {data.change_since_check >
                              0
                                ? "+"
                                : ""}

                              {
                                data.change_since_check
                              }%

                            </p>

                            <p className="mt-1 text-xs text-[#B88D94]">
                              Since last check
                            </p>

                          </>

                        ) : (

                          <span className="text-xs text-[#B88D94]">
                            Loading...
                          </span>

                        )}

                      </div>

                      <button
                        onClick={() =>
                          removeStock(
                            stock.symbol
                          )
                        }
                        className="flex items-center gap-1 text-xs text-[#B88D94] transition hover:text-[#C45D68]"
                      >

                        <X size={13} />
                        Remove

                      </button>

                    </motion.div>
                  )
                }
              )

            )}

          </div>

        </motion.div>

      </section>

      {/* INTELLIGENCE */}

      <section
        id="intelligence"
        className="scroll-mt-20 border-y border-[#542530]/10 bg-[#F7C9D0]/45"
      >

        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">

          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.2,
            }}
          >

            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#9B737A]">
              <Sparkles size={14} />
              Market intelligence
            </div>

            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">

              You haven't checked in.

              <br />

              <span className="text-[#D77F8B]">
                Here's what changed.
              </span>

            </h2>

            <p className="mt-5 max-w-xl text-sm leading-6 text-[#9B737A]">
              Market Watch filters ordinary market noise and
              surfaces the movements that are statistically
              worth your attention.
            </p>

          </motion.div>

          <div className="mt-14 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">

            <motion.div
              initial={{
                opacity: 0,
                y: 25,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.15,
              }}
              className="overflow-hidden rounded-3xl border border-[#542530]/10 bg-white shadow-[0_20px_60px_rgba(84,37,48,0.08)]"
            >

              {!highestPriority ? (

                <div className="flex min-h-[430px] items-center justify-center">

                  <div className="text-center">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7C9D0] text-[#542530]">
                      <TrendingUp size={23} />
                    </div>

                    <p className="mt-5 text-sm font-semibold">
                      Your market is quiet.
                    </p>

                    <p className="mt-2 max-w-xs text-xs leading-5 text-[#9B737A]">
                      Add a stock to your watchlist and Market Watch
                      will start looking for meaningful changes.
                    </p>

                  </div>

                </div>

              ) : (

                <>

                  <div className="flex items-center justify-between border-b border-[#542530]/10 px-7 py-6 lg:px-9">

                    <div>

                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#B88D94]">
                        Highest priority
                      </p>

                      <div className="mt-2 flex items-center gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7C9D0] text-xs font-semibold text-[#542530]">
                          {highestPriority.symbol.slice(
                            0,
                            2
                          )}
                        </div>

                        <h3 className="text-lg font-semibold">
                          {highestPriority.symbol}
                        </h3>

                      </div>

                    </div>

                    <span
  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
    getPriorityStyles(
      highestPriority.priority
    ).badge
  }`}
>
  {getPriorityStyles(
    highestPriority.priority
  ).label}
</span>

                  </div>

                  <div className="px-7 pb-8 pt-10 lg:px-9">

                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#B88D94]">
                      Change since your last check
                    </p>

                    <div className="mt-4 flex items-baseline gap-3">

                      <span className="text-6xl font-semibold tracking-[-0.055em] text-[#542530]">

                        {highestPriority.change_since_check >
                        0
                          ? "+"
                          : ""}

                        {
                          highestPriority.change_since_check
                        }%

                      </span>

                    </div>

                    <div className="mt-10 grid grid-cols-3 border-y border-[#542530]/10">

                      <div className="py-5">

                        <p className="text-[10px] uppercase tracking-wider text-[#B88D94]">
                          Z-score
                        </p>

                        <p className="mt-2 text-xl font-semibold">
                          {
                            highestPriority.z_score
                          }σ
                        </p>

                        <p className="mt-1 text-[10px] text-[#B88D94]">
                          vs recent baseline
                        </p>

                      </div>

                      <div className="border-l border-[#542530]/10 py-5 pl-5">

                        <p className="text-[10px] uppercase tracking-wider text-[#B88D94]">
                          Volume
                        </p>

                        <p className="mt-2 text-xl font-semibold">
                          {
                            highestPriority.volume_ratio
                          }×
                        </p>

                        <p className="mt-1 text-[10px] text-[#B88D94]">
                          normal activity
                        </p>

                      </div>

                      <div className="border-l border-[#542530]/10 py-5 pl-5">

                        <p className="text-[10px] uppercase tracking-wider text-[#B88D94]">
                          Score
                        </p>

                        <p className="mt-2 text-xl font-semibold">
                          {
                            highestPriority.score
                          }
                        </p>

                        <p className="mt-1 text-[10px] text-[#B88D94]">
                          significance
                        </p>

                      </div>

                    </div>

                    <div
  className={`mt-7 rounded-2xl border p-5 ${
    getPriorityStyles(
      highestPriority.priority
    ).card
  }`}
>

                      <div className="flex items-start gap-3">

                        <div
  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
    getPriorityStyles(
      highestPriority.priority
    ).icon
  }`}
>
                          <Activity size={14} />
                        </div>

                        <div>

                          <p className="text-xs font-semibold text-[#542530]">
                            {highestPriority.score >=
                            70
                              ? "This movement deserves your attention."
                              : highestPriority.score >=
                                40
                              ? "This movement is worth watching."
                              : "Nothing major stands out."}
                          </p>

                          <p className="mt-2 text-xs leading-5 text-[#9B737A]">

                            {highestPriority.reasons.length >
                            0
                              ? highestPriority.reasons.join(
                                  " • "
                                )
                              : "Price and trading activity remain within their recent normal range."}

                          </p>

                        </div>

                      </div>

                    </div>

                    <button
                      onClick={() =>
                        understandChange(
                          highestPriority.symbol
                        )
                      }
                      disabled={aiLoading}
                      className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFE58A] px-5 py-3.5 text-sm font-semibold text-[#542530] shadow-sm transition hover:bg-[#FFDD67] disabled:cursor-wait disabled:opacity-70"
                    >

                      {aiLoading ? (

                        <>
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                          Analyst is thinking...
                        </>

                      ) : (

                        <>
                          <Sparkles size={15} />
                          Understand this change
                          <ChevronRight size={15} />
                        </>

                      )}

                    </button>

                  </div>

                </>

              )}

            </motion.div>

            <div className="grid gap-4">

              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                className="rounded-3xl border border-[#542530]/10 bg-white p-7 shadow-sm"
              >

                <p className="text-xs text-[#B88D94]">
                  Meaningful changes
                </p>

                <p className="mt-4 text-5xl font-semibold tracking-[-0.04em]">
                  {meaningfulChanges}
                </p>

                <p className="mt-5 text-xs leading-5 text-[#9B737A]">
                  Stocks flagged by the market-change engine based on unusual movement and trading activity.
                </p>

              </motion.div>

              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                className="rounded-3xl border border-[#542530]/10 bg-[#FFE58A]/70 p-7 shadow-sm"
              >

                <p className="text-xs text-[#80631F]">
                  Last checked
                </p>

                <p className="mt-4 text-3xl font-semibold tracking-tight text-[#542530]">

                  {lastChecked
                    ? new Date(
                        lastChecked
                      ).toLocaleTimeString(
                        [],
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )
                    : "First visit"}

                </p>

                <p className="mt-5 text-xs leading-5 text-[#80631F]">
                  Your next visit becomes the comparison point,
                  so you'll see what changed while you were away.
                </p>

              </motion.div>

              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                className="rounded-3xl border border-[#542530]/10 bg-white p-7 shadow-sm"
              >

                <div className="flex items-center gap-2">

                  <span className="h-2 w-2 rounded-full bg-[#79A85E]" />

                  <p className="text-xs font-semibold">
                    Watchlist status
                  </p>

                </div>

                <div className="mt-5 space-y-3">

                  {stocks.slice(0, 3).map(
                    (stock) => {

                      const data =
                        marketData[
                          stock.symbol
                        ]

                      return (
                        <div
                          key={stock.id}
                          className="flex items-center justify-between"
                        >

                          <span className="text-xs font-medium">
                            {stock.symbol}
                          </span>

                          <span className="text-xs text-[#9B737A]">

                            {data
                              ? `${
                                  data.change_since_check >
                                  0
                                    ? "+"
                                    : ""
                                }${data.change_since_check}%`
                              : stockErrors[
                                  stock.symbol
                                ]
                              ? "Unavailable"
                              : "Loading..."}

                          </span>

                        </div>
                      )
                    }
                  )}

                </div>

              </motion.div>

            </div>

          </div>

        </div>

      </section>

      {/* AI ANALYST */}

      {aiSymbol && (

        <section
          id="ai-analyst"
          className="border-t border-[#542530]/10 bg-[#FFF7F8]"
        >

          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">

            <motion.div
              initial={{
                opacity: 0,
                y: 25,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
              }}
              className="overflow-hidden rounded-3xl border border-[#D9B84A]/50 bg-white shadow-[0_20px_60px_rgba(84,37,48,0.08)]"
            >

              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-[#542530]/10 bg-[#FFE58A] px-7 py-6 lg:px-9">

                <div className="flex items-center gap-4">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#542530] text-[#FFE58A]">
                    <Sparkles size={18} />
                  </div>

                  <div>

                    <h2 className="text-base font-semibold text-[#542530]">
                      AI Analyst
                    </h2>

                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#80631F]">
                      Evidence-grounded insight
                    </p>

                  </div>

                </div>

                <span className="rounded-full bg-[#542530] px-4 py-1.5 text-[11px] font-semibold text-[#FFE58A]">
                  {aiSymbol}
                </span>

              </div>

              {/* BODY */}

              <div className="bg-white px-7 py-8 lg:px-9 lg:py-10">

                {aiLoading ? (

                  <div className="flex min-h-[220px] items-center justify-center">

                    <div className="text-center">

                      <Loader2
                        size={24}
                        className="mx-auto animate-spin text-[#542530]"
                      />

                      <p className="mt-4 text-sm font-semibold text-[#542530]">
                        Analyst is thinking...
                      </p>

                      <p className="mt-2 text-xs text-[#9B737A]">
                        Interpreting the statistical evidence.
                      </p>

                    </div>

                  </div>

                ) : aiInsight ? (

                  renderInsight(aiInsight)

                ) : (

                  <p className="text-sm text-[#9B737A]">
                    No insight available yet.
                  </p>

                )}

              </div>

              {/* FOOTER */}

              <div className="border-t border-[#542530]/10 bg-[#FFE58A] px-7 py-5 lg:px-9">

                <p className="text-[11px] text-[#80631F]">
                  Generated from Market Watch's statistical evidence.
                  Not financial advice.
                </p>

              </div>

            </motion.div>

          </div>

        </section>

      )}

      {/* STOCK INTELLIGENCE */}

      <section
        id="stock-intelligence"
        className="scroll-mt-20 border-t border-[#542530]/10 bg-white/50"
      >

        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">

          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.2,
            }}
          >

            <p className="text-xs uppercase tracking-[0.2em] text-[#9B737A]">
              Stock intelligence
            </p>

            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">

              See the move.

              <br />

              <span className="text-[#D77F8B]">
                Not just the number.
              </span>

            </h2>

            <p className="mt-5 max-w-xl text-sm leading-6 text-[#9B737A]">
              Explore the price history behind the signals Market Watch
              uses to decide whether a movement deserves your attention.
            </p>

          </motion.div>

          {stocks.length > 0 && (

            <motion.div
              initial={{
                opacity: 0,
                y: 25,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.15,
              }}
              transition={{
                delay: 0.1,
              }}
              className="mt-12 overflow-hidden rounded-3xl border border-[#542530]/10 bg-white shadow-[0_20px_60px_rgba(84,37,48,0.07)]"
            >

              <div className="flex flex-col gap-5 border-b border-[#542530]/10 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">

                <div className="flex flex-wrap gap-2">

                  {stocks.map((stock) => (

                    <button
                      key={stock.id}
                      onClick={() => {
                        setChartSymbol(
                          stock.symbol
                        )
                        setChartRange("1M")
                      }}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        chartSymbol ===
                        stock.symbol
                          ? "bg-[#542530] text-[#FFE58A]"
                          : "bg-[#FCEEF0] text-[#9B737A] hover:bg-[#F7DDE1] hover:text-[#542530]"
                      }`}
                    >
                      {stock.symbol}
                    </button>

                  ))}

                </div>

                <div className="flex gap-1 rounded-lg bg-[#FFF7F8] p-1">

                  {["1D", "1W", "1M"].map(
                    (range) => (

                      <button
                        key={range}
                        onClick={() =>
                          setChartRange(
                            range
                          )
                        }
                        className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                          chartRange ===
                          range
                            ? "bg-white text-[#542530] shadow-sm"
                            : "text-[#9B737A]"
                        }`}
                      >
                        {range}
                      </button>

                    )
                  )}

                </div>

              </div>

              {!chartSymbol && (

                <div className="flex min-h-[420px] items-center justify-center">

                  <div className="text-center">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7C9D0] text-[#542530]">
                      <TrendingUp size={23} />
                    </div>

                    <p className="mt-5 text-sm font-semibold">
                      Select a stock
                    </p>

                    <p className="mt-2 text-xs text-[#9B737A]">
                      Choose a ticker above to explore its movement.
                    </p>

                  </div>

                </div>

              )}

              {chartSymbol && (

                <>

                  <div className="flex flex-col gap-6 px-6 pb-2 pt-8 lg:flex-row lg:items-end lg:justify-between lg:px-8">

                    <div>

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7C9D0] text-xs font-semibold text-[#542530]">
                          {chartSymbol.slice(
                            0,
                            2
                          )}
                        </div>

                        <div>

                          <p className="text-lg font-semibold">
                            {chartSymbol}
                          </p>

                          <p className="text-xs text-[#B88D94]">
                            Historical price
                          </p>

                        </div>

                      </div>

                    </div>

                    {marketData[
                      chartSymbol
                    ] && (

                      <div className="flex items-end gap-4">

                        <div>

                          <p className="text-3xl font-semibold tracking-tight">
                            $
                            {marketData[
                              chartSymbol
                            ].price.toFixed(2)}
                          </p>

                          <p className="mt-1 text-xs text-[#B88D94]">
                            Current price
                          </p>

                        </div>

                        <div
                          className={`pb-1 text-sm font-semibold ${
                            marketData[
                              chartSymbol
                            ].change_percent >
                            0
                              ? "text-[#628C4C]"
                              : marketData[
                                  chartSymbol
                                ].change_percent <
                                0
                              ? "text-[#C45D68]"
                              : "text-[#9B737A]"
                          }`}
                        >

                          {marketData[
                            chartSymbol
                          ].change_percent >
                          0
                            ? "+"
                            : ""}

                          {
                            marketData[
                              chartSymbol
                            ].change_percent
                          }%

                          <span className="ml-1 font-normal text-[#B88D94]">
                            today
                          </span>

                        </div>

                      </div>

                    )}

                  </div>

                  <div className="px-4 pb-6 pt-8 lg:px-8">

                    {chartLoading ? (

                      <div className="flex h-[380px] items-center justify-center">

                        <div className="text-center">

                          <Loader2
                            size={22}
                            className="mx-auto animate-spin text-[#9B737A]"
                          />

                          <p className="mt-3 text-xs text-[#9B737A]">
                            Loading price history...
                          </p>

                        </div>

                      </div>

                    ) : chartHistory.length >
                      0 ? (

                      <div className="h-[380px] w-full">

                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                        >

                          <AreaChart
                            data={chartHistory
                              .slice(
                                chartRange ===
                                  "1D"
                                  ? -2
                                  : chartRange ===
                                    "1W"
                                  ? -7
                                  : -30
                              )
                              .map(
                                (
                                  point
                                ) => ({
                                  ...point,
                                  displayDate:
                                    new Date(
                                      point.date
                                    ).toLocaleDateString(
                                      "en-US",
                                      {
                                        month:
                                          "short",
                                        day:
                                          "numeric",
                                      }
                                    ),
                                })
                              )}
                            margin={{
                              top: 10,
                              right: 10,
                              left: 0,
                              bottom: 0,
                            }}
                          >

                            <defs>

                              <linearGradient
                                id="priceGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >

                                <stop
                                  offset="0%"
                                  stopColor="#F7C9D0"
                                  stopOpacity={
                                    0.55
                                  }
                                />

                                <stop
                                  offset="100%"
                                  stopColor="#F7C9D0"
                                  stopOpacity={
                                    0.05
                                  }
                                />

                              </linearGradient>

                            </defs>

                            <XAxis
                              dataKey="displayDate"
                              tick={{
                                fill: "#B88D94",
                                fontSize: 10,
                              }}
                              tickLine={
                                false
                              }
                              axisLine={
                                false
                              }
                              minTickGap={
                                35
                              }
                            />

                            <YAxis
                              domain={[
                                "auto",
                                "auto",
                              ]}
                              tick={{
                                fill: "#B88D94",
                                fontSize: 10,
                              }}
                              tickLine={
                                false
                              }
                              axisLine={
                                false
                              }
                              width={55}
                              tickFormatter={(
                                value
                              ) =>
                                `$${value}`
                              }
                            />

                            <Tooltip
                              contentStyle={{
                                borderRadius:
                                  "12px",
                                border:
                                  "1px solid rgba(84,37,48,0.1)",
                                backgroundColor:
                                  "#ffffff",
                                boxShadow:
                                  "0 10px 30px rgba(84,37,48,0.10)",
                                fontSize:
                                  "12px",
                              }}
                              labelStyle={{
                                color:
                                  "#9B737A",
                                marginBottom:
                                  "4px",
                              }}
                              formatter={(
                                value
                              ) => [
                                `$${Number(
                                  value
                                ).toFixed(
                                  2
                                )}`,
                                "Price",
                              ]}
                            />

                            <Area
                              type="monotone"
                              dataKey="close"
                              stroke="#542530"
                              strokeWidth={
                                2.5
                              }
                              fill="url(#priceGradient)"
                              dot={false}
                              activeDot={{
                                r: 5,
                                fill: "#542530",
                              }}
                            />

                          </AreaChart>

                        </ResponsiveContainer>

                      </div>

                    ) : (

                      <div className="flex h-[380px] items-center justify-center text-sm text-[#9B737A]">
                        No historical data available.
                      </div>

                    )}

                  </div>

                </>

              )}

            </motion.div>

          )}

        </div>

      </section>

      {/* HOW IT WORKS */}

      <section
        id="method"
        className="scroll-mt-20 mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32"
      >

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          className="max-w-2xl"
        >

          <p className="text-xs uppercase tracking-[0.2em] text-[#9B737A]">
            How it works
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">

            Not every movement

            <br />

            <span className="text-[#D77F8B]">
              deserves your attention.
            </span>

          </h2>

          <p className="mt-5 text-sm leading-6 text-[#9B737A]">
            Market Watch combines market movement, historical
            behaviour and trading activity to decide whether
            something is actually unusual.
          </p>

        </motion.div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-[#542530]/10 bg-[#542530]/10 md:grid-cols-5">

          {[
            {
              number: "01",
              title: "Market data",
              text: "Collect the latest price and volume information.",
            },
            {
              number: "02",
              title: "Baseline",
              text: "Compare today's behaviour with recent history.",
            },
            {
              number: "03",
              title: "Signal",
              text: "Measure unusual price and volume behaviour.",
            },
            {
              number: "04",
              title: "Significance",
              text: "Score the movement based on multiple signals.",
            },
            {
              number: "05",
              title: "Explanation",
              text: "Turn the evidence into an analyst-style insight.",
            },
          ].map(
            (step, index) => (

              <motion.div
                key={step.number}
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  delay:
                    index * 0.08,
                }}
                className="bg-white p-7"
              >

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7C9D0] text-xs font-semibold text-[#542530]">
                  {step.number}
                </div>

                <h3 className="mt-10 text-sm font-semibold">
                  {step.title}
                </h3>

                <p className="mt-3 text-xs leading-5 text-[#9B737A]">
                  {step.text}
                </p>

              </motion.div>

            )
          )}

        </div>

      </section>

      {/* FINAL CTA */}

      <section className="border-t border-[#542530]/10 bg-[#F7C9D0]/40">

        <div className="mx-auto max-w-5xl px-6 py-28 text-center lg:py-36">

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
          >

            <p className="text-xs uppercase tracking-[0.2em] text-[#9B737A]">
              Market Watch
            </p>

            <h2 className="mt-5 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">

              Stop checking everything.

              <br />

              <span className="text-[#D77F8B]">
                Check what changed.
              </span>

            </h2>

            <button
              onClick={() =>
                scrollTo("watchlist")
              }
              className="mt-10 inline-flex items-center gap-2 rounded-lg bg-[#FFE58A] px-6 py-3.5 text-sm font-semibold text-[#542530] shadow-sm transition hover:bg-[#FFDD67]"
            >

              Open your watchlist
              <ChevronRight size={16} />

            </button>

          </motion.div>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="border-t border-[#542530]/10 bg-[#F3D9DC]">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 py-8 text-xs text-[#9B737A] md:flex-row lg:px-8">

          <div>
            Market Watch — meaningful market intelligence.
          </div>

          <div className="flex items-center gap-5">

            <span>
              Data may be delayed.
            </span>

            <span>
              Not financial advice.
            </span>

          </div>

        </div>

      </footer>

    </div>
  )
}

export default App
