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
import MistakeAnalysis from "../../components/dashboard/MistakeAnalysis";
import ImprovementSuggestions from "../../components/dashboard/ImprovementSuggestions";
import WeeklySummary from "../../components/dashboard/WeeklySummary";
import PerformanceByGradeChart from "../../components/dashboard/PerformanceByGradeChart";
import MonthlySummary from "../../components/dashboard/MonthlySummary";
import RuleBuilder from "../../components/dashboard/RuleBuilder";
import AvoidList from "../../components/dashboard/AvoidList";
import NextWeekFocus from "../../components/dashboard/NextWeekFocus";
import EventPerformanceInsights from "../../components/dashboard/EventPerformanceInsights";
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
  buildMistakeAnalysis,
  generateImprovementSuggestions,
  buildPerformanceByGrade,
  generateWeeklySummary,
  generateMonthlySummary,
  generateRulesFromWinners,
  generateAvoidListFromLosers,
  generateNextWeekFocus,
  getPerformanceByEventType,
} from "../../lib/calculations";

function DashboardPage({ trades = [], marketDays = [] }) {
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
  const mistakeAnalysisData = buildMistakeAnalysis(trades);
  const improvementSuggestions = generateImprovementSuggestions(trades);
  const weeklySummary = generateWeeklySummary(trades);
  const gradePerformanceData = buildPerformanceByGrade(trades);
  const monthlySummary = generateMonthlySummary(trades);
  const winnerRules = generateRulesFromWinners(trades);
  const avoidList = generateAvoidListFromLosers(trades);
  const nextWeekFocus = generateNextWeekFocus(trades);
  const eventPerformanceInsights = getPerformanceByEventType(trades, marketDays);

return (
  <div className="dashboard">
    <StatsCards
      stats={stats}
      averageHoldTime={averageHoldTime}
      bestTimeOfDay={bestTimeOfDay}
      worstTimeOfDay={worstTimeOfDay}
      profitFactor={profitFactor}
    />

    {!trades.length ? <p className="empty-state">No trades yet. Import trades from Journal to populate your performance overview.</p> : <>
      <div className="dashboard-primary-grid">
        <section className="dashboard-section"><EquityCurveChart data={equityCurveData} /></section>
        <section className="dashboard-section"><DrawdownChart data={drawdownData} /></section>
        <section className="dashboard-section"><PerformanceByDayChart data={performanceByDayData} /></section>
        <section className="dashboard-section"><PerformanceByTimeChart data={performanceByTimeData} /></section>
      </div>
      <section className="dashboard-section"><InsightsPanel insights={insights} /></section>
      <details className="dashboard-more"><summary>More Performance Details</summary><div className="dashboard-secondary-grid">
        <section><StatsBySetup data={setupStatsData} /></section><section><StatsByTicker data={tickerStatsData} /></section>
        <section><LongVsShortStats data={longVsShortData} /></section><section><PerformanceByTickerChart data={tickerStatsData} /></section>
        <section><PerformanceBySetupChart data={setupStatsData} /></section><section><PerformanceByGradeChart data={gradePerformanceData} /></section>
        <section><WeeklySummary summary={weeklySummary} /></section><section><MonthlySummary summary={monthlySummary} /></section>
        <section><RuleBuilder rules={winnerRules} /></section><section><AvoidList items={avoidList} /></section>
        <section><NextWeekFocus focus={nextWeekFocus} /></section><section><MistakeAnalysis data={mistakeAnalysisData} /></section>
        <section><ImprovementSuggestions suggestions={improvementSuggestions} /></section><section><EventPerformanceInsights data={eventPerformanceInsights} /></section>
      </div></details>
    </>}


  </div>
);
}

export default DashboardPage;
