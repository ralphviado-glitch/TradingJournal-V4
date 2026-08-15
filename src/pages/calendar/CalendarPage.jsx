import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTrades } from "../../lib/tradeService";
import { calculateMonthlyPerformance, calculateWeeklyPerformance, getMonthGrid } from "../../lib/performanceCalendar";
import { getAuthoritativePnl } from "../../lib/tradePnl";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const money = (value) => `${Number(value) >= 0 ? "+" : "-"}$${Math.abs(Number(value || 0)).toFixed(2)}`;
const monthId = (year, month) => `${year}-${String(month + 1).padStart(2, "0")}`;

export function PerformanceCalendar({ trades = [], initialYear, initialMonth, compact = false, onSelectDay }) {
  const now = new Date(); const [cursor, setCursor] = useState({ year: initialYear ?? now.getUTCFullYear(), month: initialMonth ?? now.getUTCMonth() });
  const monthly = useMemo(() => calculateMonthlyPerformance(trades, monthId(cursor.year, cursor.month)), [trades, cursor]);
  const weeks = useMemo(() => getMonthGrid(cursor.year, cursor.month, monthly.daily), [cursor, monthly.daily]);
  const weekly = useMemo(() => calculateWeeklyPerformance(weeks), [weeks]);
  const move = (amount) => setCursor(({ year, month }) => { const date = new Date(Date.UTC(year, month + amount, 1)); return { year: date.getUTCFullYear(), month: date.getUTCMonth() }; });
  const title = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(cursor.year, cursor.month, 1)));
  return <div className={`performance-calendar ${compact ? "calendar-compact" : ""}`}>
    <div className="calendar-header"><Button variant="secondary" aria-label="Previous month" onClick={() => move(-1)}>‹</Button><h2>{title}</h2><Button variant="secondary" aria-label="Next month" onClick={() => move(1)}>›</Button></div>
    <div className="calendar-weekdays">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-body">{weeks.map((week, weekIndex) => <div className="calendar-week" key={`week-${weekIndex}`}>
      <div className="calendar-days">{week.map((cell, dayIndex) => cell ? <button type="button" key={cell.date} className={`calendar-day ${cell.performance?.state || "empty"}`} onClick={() => cell.performance && onSelectDay?.(cell.performance)} disabled={!cell.performance} aria-label={`${cell.date}${cell.performance ? ` ${money(cell.performance.netPnl)}` : " no trades"}`}><span className="calendar-date">{cell.day}</span>{cell.performance ? <><strong>{money(cell.performance.netPnl)}</strong>{!compact ? <small>{cell.performance.totalTrades} trade{cell.performance.totalTrades === 1 ? "" : "s"}<br />{cell.performance.wins}W · {cell.performance.losses}L</small> : null}</> : null}</button> : <span className="calendar-day outside" key={`blank-${dayIndex}`} />)}</div>
      {!compact ? <aside className="calendar-week-summary"><span>Week {weekly[weekIndex].week}</span><strong className={weekly[weekIndex].netPnl >= 0 ? "result-win" : "result-loss"}>{money(weekly[weekIndex].netPnl)}</strong><small>{weekly[weekIndex].totalTrades} trades</small></aside> : null}
    </div>)}</div>
    {!compact ? <div className="calendar-month-summary">{[["Days Traded", monthly.daysTraded], ["Green Days", monthly.greenDays], ["Red Days", monthly.redDays], ["Monthly Net P&L", money(monthly.netPnl)], ["Average Day", money(monthly.averageDailyPnl)], ["Total Trades", monthly.totalTrades], ["Win Rate", `${monthly.winRate}%`]].map(([label, value]) => <Card key={label}><span>{label}</span><strong>{value}</strong></Card>)}</div> : null}
  </div>;
}

function DailyDetail({ day, onClose }) {
  if (!day) return null;
  return <Modal title={`Trading Day · ${day.date}`} onClose={onClose}><div className="daily-detail">
    <div className="daily-detail-kpis">{[["Net P&L", money(day.netPnl)], ["Gross P&L", money(day.grossPnl)], ["Fees", day.fees == null ? "N/A" : money(-day.fees)], ["Trades", day.totalTrades], ["Wins / Losses", `${day.wins} / ${day.losses}`], ["Win Rate", `${day.winRate}%`], ["Average Trade", money(day.averageTrade)], ["Best Trade", day.bestTrade ? money(day.bestTrade.pnl) : "N/A"], ["Worst Trade", day.worstTrade ? money(day.worstTrade.pnl) : "N/A"]].map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div>
    <div className="daily-trade-list">{day.trades.map((trade) => <article key={trade.id}><span><strong>{trade.ticker}</strong> · {trade.direction}</span><strong className={Number(getAuthoritativePnl(trade)) >= 0 ? "result-win" : "result-loss"}>{money(getAuthoritativePnl(trade))}</strong><span>{trade.review_status || "Not Reviewed"}</span><Link to={`/journal?review=${trade.id}`}>View Trade</Link></article>)}</div>
  </div></Modal>;
}

export default function CalendarPage() {
  const [state, setState] = useState({ trades: [], loading: true, error: "" }); const [selectedDay, setSelectedDay] = useState(null);
  useEffect(() => { fetchTrades().then((trades) => setState({ trades, loading: false, error: "" })).catch(() => setState({ trades: [], loading: false, error: "Calendar could not be loaded." })); }, []);
  if (state.loading) return <p className="status-message loading">Loading calendar...</p>;
  if (state.error) return <p className="status-message error">{state.error}</p>;
  return <div className="page-stack"><header className="app-header"><h1>Calendar</h1><p>Daily, weekly, and monthly trading performance.</p></header><Card><PerformanceCalendar trades={state.trades} onSelectDay={setSelectedDay} /></Card><DailyDetail day={selectedDay} onClose={() => setSelectedDay(null)} /></div>;
}
