import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchTrades } from "../../lib/tradeService";
import { calculateCumulativePnl, summarizePerformance } from "../../lib/performanceCalendar";
import { getRecentTrades } from "../../lib/dashboardOverview";
import { getAuthoritativePnl } from "../../lib/tradePnl";
import { PerformanceCalendar } from "../calendar/CalendarPage";
import Card from "../../components/ui/Card";

const money = (value) => `${Number(value) >= 0 ? "+" : "-"}$${Math.abs(Number(value || 0)).toFixed(2)}`;

export function PerformanceOverview({ trades = [] }) {
  const stats = useMemo(() => summarizePerformance(trades), [trades]);
  const curve = useMemo(() => calculateCumulativePnl(trades), [trades]);
  const recent = useMemo(() => getRecentTrades(trades, 5), [trades]);
  if (!trades.length) return <Card className="dashboard-empty"><h2>No trade data yet.</h2><p>Import trades in Journal to begin tracking performance.</p><Link className="ui-button ui-button-primary" to="/journal">Go to Journal</Link></Card>;
  const kpis = [["Net P&L", money(stats.netPnl)], ["Profit Factor", stats.profitFactor == null ? "—" : stats.profitFactor], ["Win Rate", `${stats.winRate}%`], ["Average Winner", money(stats.averageWinner)], ["Average Loser", money(stats.averageLoser)], ["Total Trades", stats.totalTrades]];
  return <div className="performance-dashboard">
    <section className="dashboard-kpi-grid">{kpis.map(([label, value]) => <Card key={label} className="dashboard-kpi"><span>{label}</span><strong>{value}</strong></Card>)}</section>
    <section className="dashboard-main-grid"><Card className="dashboard-chart-card"><div className="section-header"><div><h2>Cumulative Net P&amp;L</h2><p>Authoritative realized performance by trading date.</p></div></div><div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={curve}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} /><YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} /><Tooltip formatter={(value) => money(value)} /><Line type="monotone" dataKey="cumulativePnl" stroke="var(--positive)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Card>
      <Card className="win-rate-card"><h2>Trade Win Rate</h2><div className="win-rate-ring" style={{ "--win-rate": `${stats.winRate * 3.6}deg` }}><strong>{stats.winRate}%</strong></div><div className="win-rate-counts"><span className="result-win">{stats.wins} Wins</span><span className="result-loss">{stats.losses} Losses</span><span>{stats.breakeven} Breakeven</span></div></Card></section>
    <section className="dashboard-lower-grid"><Card><div className="section-header"><h2>Current Month</h2><Link to="/calendar">View Full Calendar →</Link></div><PerformanceCalendar trades={trades} compact /></Card>
      <Card className="recent-trades-preview"><div className="section-header"><h2>Recent Trades</h2><Link to="/journal">View All in Journal</Link></div>{recent.map((trade) => { const pnl = getAuthoritativePnl(trade); return <article key={trade.id}><span>{trade.trade_date || trade.date}<br /><strong>{trade.ticker}</strong> · {trade.direction}</span><span>{trade.review_status || "Not Reviewed"}</span><strong className={Number(pnl) >= 0 ? "result-win" : "result-loss"}>{money(pnl)}</strong><Link to={`/journal?review=${trade.id}`}>View</Link></article>; })}</Card></section>
  </div>;
}

export default function OverviewPage() {
  const [data, setData] = useState({ trades: [], loading: true, error: "" });
  useEffect(() => { fetchTrades().then((trades) => setData({ trades, loading: false, error: "" })).catch(() => setData({ trades: [], loading: false, error: "Dashboard could not be loaded." })); }, []);
  if (data.loading) return <p className="status-message loading">Loading dashboard...</p>;
  if (data.error) return <p className="status-message error">{data.error}</p>;
  return <div className="page-stack"><header className="app-header"><h1>Dashboard</h1><p>Your performance at a glance.</p></header><PerformanceOverview trades={data.trades} /></div>;
}
