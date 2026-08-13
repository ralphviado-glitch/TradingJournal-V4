import Button from "../ui/Button";
import { buildReviewQueue, getTradeReviewCompleteness } from "../../lib/workflow/reviewCompleteness";
import { getDailyCompletion } from "../../lib/workflow/dailyCompletion";

function money(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : "-"}$${Math.abs(amount).toFixed(2)}`;
}

export default function DailyCompletion({ date, trades, onReview }) {
  const metrics = getDailyCompletion(trades);
  const queue = buildReviewQueue(trades);
  return <>
    <section className={`today-card daily-completion-card status-${metrics.status.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="section-header compact"><div><p className="eyebrow">Daily Review / Completion</p><h2>{date}</h2></div><strong>{metrics.status === "Complete" ? "Trading Day Reviewed" : metrics.status}</strong></div>
      <div className="daily-completion-grid">
        <p><strong>Trades</strong><span>{metrics.totalTrades}</span></p><p><strong>Net P&amp;L</strong><span>{money(metrics.netPnl)}</span></p>
        <p><strong>Reviews</strong><span>{metrics.reviewComplete} / {metrics.totalTrades}</span></p><p><strong>Excursions</strong><span>{metrics.excursionCalculated} / {metrics.totalTrades}</span></p>
        <p><strong>Watchlist Matches</strong><span>{metrics.watchlistMatches} / {metrics.totalTrades}</span></p><p><strong>Rule Reviews</strong><span>{metrics.ruleReviews} / {metrics.totalTrades}</span></p>
      </div>
      {queue.length ? <Button onClick={() => onReview(queue[0])}>Review Remaining Trade{queue.length === 1 ? "" : "s"}</Button> : null}
    </section>
    {queue.length ? <section className="today-card"><div className="section-header compact"><div><p className="eyebrow">Review Queue</p><h2>Trades Needing Review</h2></div><span>Oldest incomplete first</span></div><div className="review-queue-list">{queue.map((trade) => { const review = getTradeReviewCompleteness(trade); return <article className="review-queue-item" key={trade.id}><div><h3>{trade.ticker}</h3><p>{trade.trade_date || trade.date} · {money(trade.pnl)}</p></div><div><strong>{review.percentage}% reviewed</strong><p>Missing: {review.missingFields.join(", ")}</p></div><Button variant="secondary" onClick={() => onReview(trade)}>Review</Button></article>; })}</div></section> : null}
  </>;
}
