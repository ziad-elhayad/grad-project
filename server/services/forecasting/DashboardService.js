const SalesForecastService = require('./SalesForecastService');
const FinanceForecastService = require('./FinanceForecastService');
const moment = require('moment');

class ForecastingDashboardService {
    async getDashboardInsights() {
        const salesHistory = await SalesForecastService.getHistoricalSales(12);
        const financeHistory = await FinanceForecastService.getHistoricalFinances(12);

        // Generate forecasts if they don't exist or just to have fresh ones
        const salesForecast = await SalesForecastService.generateForecast(6);
        const financeForecast = await FinanceForecastService.generateForecast(6);

        // Calculate KPIs
        const expectedRevenueNext6 = financeForecast.reduce((sum, f) => sum + f.revenue.predicted_value, 0);
        const expectedProfitNext6 = financeForecast.reduce((sum, f) => sum + f.profit.predicted_value, 0);

        // Last 3 months vs Previous 3 months for growth rate
        const last3Revenue = financeHistory.slice(-3).reduce((sum, h) => sum + h.revenue, 0);
        const prev3Revenue = financeHistory.slice(-6, -3).reduce((sum, h) => sum + h.revenue, 0);
        const growthRate = prev3Revenue > 0 ? ((last3Revenue - prev3Revenue) / prev3Revenue) * 100 : 0;

        // Check for profit alert (threshold: e.g., 5000)
        const PROFIT_THRESHOLD = 5000;
        const alerts = [];
        if (expectedProfitNext6 < PROFIT_THRESHOLD) {
            alerts.push({
                type: 'warning',
                message: `Expected profit for next 6 months ($${expectedProfitNext6.toFixed(2)}) is below the threshold of $${PROFIT_THRESHOLD}.`
            });
        }

        return {
            kpis: {
                expectedRevenue: expectedRevenueNext6,
                expectedNetProfit: expectedProfitNext6,
                salesGrowthRate: growthRate,
                cashFlowStatus: expectedProfitNext6 > 0 ? 'Positive' : 'Critical'
            },
            alerts,
            charts: {
                salesChart: {
                    labels: [...salesHistory.map(h => h.period), ...salesForecast.map(f => moment(f.period, 'YYYY-MM').format('MMM YYYY'))],
                    actual: [...salesHistory.map(h => h.revenue), ...Array(6).fill(null)],
                    forecast: [...Array(11).fill(null), salesHistory[11].revenue, ...salesForecast.map(f => f.predicted_value)]
                },
                financeChart: {
                    labels: [...financeHistory.map(h => h.period), ...financeForecast.map(f => moment(f.period, 'YYYY-MM').format('MMM YYYY'))],
                    revenue: [...financeHistory.map(h => h.revenue), ...financeForecast.map(f => f.revenue.predicted_value)],
                    expenses: [...financeHistory.map(h => h.expense), ...financeForecast.map(f => f.expense.predicted_value)],
                    profit: [...financeHistory.map(h => h.profit), ...financeForecast.map(f => f.profit.predicted_value)]
                }
            }
        };
    }
}

module.exports = new ForecastingDashboardService();
