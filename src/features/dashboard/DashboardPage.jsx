import StatsCards from "../../components/dashboard/StatsCards";
import EquityCurveChart from "../../components/dashboard/EquityCurveChart";
import DrawdownChart from "../../components/dashboard/DrawdownChart";
import PerformanceByDayChart from "../../components/dashboard/PerformanceByDayChart";
import InsightsPanel from "../../components/dashboard/InsightsPanel";
import StatsBySetup from "../../components/dashboard/StatsBySetup";
import StatsByTicker from "../../components/dashboard/StatsByTicker";
import PerformanceByTimeChart from "../../components/dashboard/PerformanceByTimeChart";
import LongVsShortStats from "../../components/dashboard/LongVsShortStats";
import PerformanceByTickerChart from "../../components/dashboard/PerformanceByTickerChart";
import PerformanceBySetupChart from "../../components/dashboard/PerformanceBySetupChart";
import {
  calculateStats,
  buildEquityCurve,
  buildDrawdown,
  buildPerformanceByDay,
  generatePlainEnglishInsights,
  buildStatsBySetup,
  buildStatsByTicker,
  calculateAverageHoldTime,
  buildPerformanceByTimeOfDay,
  getWorstTimeOfDay,
  getBestTimeOfDay,
  calculateProfitFactor,
  buildLongVsShortPerformance,
} from "../../lib/calculations";

function DashboardPage({ trades }) {
  const stats = calculateStats(trades);
  const equityCurveData = buildEquityCurve(trades);
  const drawdownData = buildDrawdown(trades);
  const performanceByDayData = buildPerformanceByDay(trades);
  const insights = generatePlainEnglishInsights(trades);
  const setupStatsData = buildStatsBySetup(trades);
  const tickerStatsData = buildStatsByTicker(trades);
  const averageHoldTime = calculateAverageHoldTime(trades);
  const performanceByTimeData = buildPerformanceByTimeOfDay(trades);
  const worstTimeOfDay = getWorstTimeOfDay(trades);
  const bestTimeOfDay = getBestTimeOfDay(trades);
  const profitFactor = calculateProfitFactor(trades);
  const longVsShortData = buildLongVsShortPerformance(trades);

return (
  <div className="dashboard">
    <h2 style={{ marginBottom: "20px" }}>Dashboard</h2>

    {/* Stats */}
    <StatsCards
      stats={stats}
      averageHoldTime={averageHoldTime}
      bestTimeOfDay={bestTimeOfDay}
      worstTimeOfDay={worstTimeOfDay}
      profitFactor={profitFactor}
    />

    <section className="dashboard-section">
      <StatsBySetup data={setupStatsData} />
    </section>  

    <section className="dashboard-section">
      <StatsByTicker data={tickerStatsData} />
    </section>

    <section className="dashboard-section">
      <PerformanceByTimeChart data={performanceByTimeData} />
    </section>

    <section className="dashboard-section">
      <LongVsShortStats data={longVsShortData} />
    </section>

    <section className="dashboard-section">
      <PerformanceByTickerChart data={tickerStatsData} />
    </section>

    <section className="dashboard-section">
      <PerformanceBySetupChart data={setupStatsData} />
    </section>

    {/* Charts */}
    <section className="dashboard-section">
      <EquityCurveChart data={equityCurveData} />
    </section>

    <section className="dashboard-section">
      <DrawdownChart data={drawdownData} />
    </section>

    <section className="dashboard-section">
      <PerformanceByDayChart data={performanceByDayData} />
    </section>

    {/* Insights */}
    <section className="dashboard-section">
      <InsightsPanel insights={insights} />
    </section>
  </div>
);
}

export default DashboardPage;