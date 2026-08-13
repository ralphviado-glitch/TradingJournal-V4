import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTrades } from "../../lib/tradeService";
import { fetchMarketDays } from "../../lib/marketContextService";
import DashboardContent from "../../features/dashboard/DashboardPage";
import { getRecentTrades } from "../../lib/dashboardOverview";

export default function OverviewPage() {
  const [data, setData] = useState({ trades: [], marketDays: [], loading: true, error: "" });
  useEffect(() => { Promise.all([fetchTrades(), fetchMarketDays()]).then(([trades, marketDays]) => setData({ trades, marketDays, loading: false, error: "" })).catch(() => setData({ trades: [], marketDays: [], loading: false, error: "Dashboard could not be loaded." })); }, []);
  if (data.loading) return <p className="status-message loading">Loading dashboard...</p>;
  if (data.error) return <p className="status-message error">{data.error}</p>;
  const recent = getRecentTrades(data.trades);
  return <div className="page-stack"><header className="app-header"><h1>Dashboard</h1><p>Performance, process trends, and recent activity.</p></header><DashboardContent trades={data.trades} marketDays={data.marketDays} /><section className="ui-card recent-trades-preview"><div className="section-header"><h2>Recent Trades</h2><Link to="/journal">View All in Journal</Link></div>{recent.map((trade) => <article key={trade.id}><span>{trade.trade_date || trade.date} · {trade.ticker} · {trade.direction}</span><span>{trade.review_status || "Not Reviewed"}</span><strong className={Number(trade.pnl) >= 0 ? "result-win" : "result-loss"}>{trade.pnl}</strong><Link to={`/journal?review=${trade.id}`}>View</Link></article>)}{!recent.length ? <p>No trades yet.</p> : null}</section></div>;
}
