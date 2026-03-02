const Transaction = require('../../models/Transaction');
const FinanceForecast = require('../../models/FinanceForecast');
const { weightedMovingAverage } = require('./forecastingUtils');
const moment = require('moment');

class FinanceForecastService {
    /**
     * Get historical financial data
     */
    async getHistoricalFinances(months = 12) {
        const startDate = moment().subtract(months, 'months').startOf('month').toDate();

        const aggregation = await Transaction.aggregate([
            { $match: { date: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" },
                        direction: "$direction"
                    },
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        return this._formatFinancialData(aggregation, months);
    }

    /**
     * Generate Financial Forecast
     */
    async generateForecast(nextMonths = 3) {
        const historical = await this.getHistoricalFinances(12);

        const revenueHistory = historical.map(h => h.revenue);
        const expenseHistory = historical.map(h => h.expense);

        const results = [];
        let currRevenue = [...revenueHistory];
        let currExpense = [...expenseHistory];

        for (let i = 1; i <= nextMonths; i++) {
            const period = moment().add(i, 'months').format('YYYY-MM');

            const predRevenue = Math.max(0, weightedMovingAverage(currRevenue));
            const predExpense = Math.max(0, weightedMovingAverage(currExpense));
            const predProfit = predRevenue - predExpense;

            // Save Revenue Forecast
            const revF = await FinanceForecast.findOneAndUpdate(
                { period, forecast_type: 'revenue' },
                { predicted_value: predRevenue, confidence_level: 80 },
                { upsert: true, new: true }
            );

            // Save Expense Forecast
            const expF = await FinanceForecast.findOneAndUpdate(
                { period, forecast_type: 'expense' },
                { predicted_value: predExpense, confidence_level: 85 },
                { upsert: true, new: true }
            );

            // Save Profit Forecast
            const profitF = await FinanceForecast.findOneAndUpdate(
                { period, forecast_type: 'profit' },
                { predicted_value: predProfit, confidence_level: 75 },
                { upsert: true, new: true }
            );

            results.push({ period, revenue: revF, expense: expF, profit: profitF });
            currRevenue.push(predRevenue);
            currExpense.push(predExpense);
        }

        return results;
    }

    _formatFinancialData(aggregation, months) {
        const data = [];
        const start = moment().subtract(months - 1, 'months').startOf('month');

        for (let i = 0; i < months; i++) {
            const current = moment(start).add(i, 'months');
            const year = current.year();
            const month = current.month() + 1;

            const revenueArr = aggregation.filter(a => a._id.year === year && a._id.month === month && a._id.direction === 'in');
            const expenseArr = aggregation.filter(a => a._id.year === year && a._id.month === month && a._id.direction === 'out');

            const revenue = revenueArr.reduce((sum, item) => sum + item.totalAmount, 0);
            const expense = expenseArr.reduce((sum, item) => sum + item.totalAmount, 0);

            data.push({
                period: current.format('MMM YYYY'),
                revenue,
                expense,
                profit: revenue - expense
            });
        }
        return data;
    }
}

module.exports = new FinanceForecastService();
