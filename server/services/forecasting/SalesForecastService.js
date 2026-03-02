const SalesOrder = require('../../models/SalesOrder');
const Product = require('../../models/Product');
const SalesForecast = require('../../models/SalesForecast');
const { linearRegression, weightedMovingAverage } = require('./forecastingUtils');
const moment = require('moment');

class SalesForecastService {
    /**
     * Get historical sales volume and revenue per period
     */
    async getHistoricalSales(months = 12, productId = null) {
        const startDate = moment().subtract(months, 'months').startOf('month').toDate();

        const match = {
            status: { $in: ['confirmed', 'shipped', 'delivered', 'paid'] },
            orderDate: { $gte: startDate }
        };

        if (productId) {
            match['items.product'] = productId;
        }

        const aggregation = await SalesOrder.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        year: { $year: "$orderDate" },
                        month: { $month: "$orderDate" }
                    },
                    totalRevenue: { $sum: "$total" },
                    totalQuantity: { $sum: { $sum: "$items.quantity" } }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        return this._formatAggregationData(aggregation, months);
    }

    /**
     * Generate Sales Forecast for the next N months
     */
    async generateForecast(nextMonths = 3, options = { method: 'moving_average', productId: null }) {
        const historical = await this.getHistoricalSales(12, options.productId);
        const revenueHistory = historical.map(h => h.revenue);
        const quantityHistory = historical.map(h => h.quantity);

        const results = [];
        let currentRevenueData = [...revenueHistory];
        let currentQuantityData = [...quantityHistory];

        for (let i = 1; i <= nextMonths; i++) {
            const period = moment().add(i, 'months').format('YYYY-MM');

            let predictedRevenue;
            let predictedQuantity;

            if (options.method === 'linear_regression') {
                predictedRevenue = linearRegression(currentRevenueData);
                predictedQuantity = linearRegression(currentQuantityData);
            } else {
                predictedRevenue = weightedMovingAverage(currentRevenueData);
                predictedQuantity = weightedMovingAverage(currentQuantityData);
            }

            // Ensure no negative predictions
            predictedRevenue = Math.max(0, predictedRevenue);
            predictedQuantity = Math.max(0, predictedQuantity);

            const forecast = await SalesForecast.findOneAndUpdate(
                { period, product: options.productId, forecast_type: options.method },
                {
                    predicted_value: predictedRevenue,
                    confidence_level: options.method === 'linear_regression' ? 75 : 85,
                    historical_data_points: revenueHistory.length,
                    metadata: {
                        predicted_quantity: predictedQuantity,
                        trend_type: options.method
                    }
                },
                { upsert: true, new: true }
            );

            results.push(forecast);
            currentRevenueData.push(predictedRevenue);
            currentQuantityData.push(predictedQuantity);
        }

        return results;
    }

    /**
     * Helper to fill missing months in aggregation
     */
    _formatAggregationData(aggregation, months) {
        const data = [];
        const start = moment().subtract(months - 1, 'months').startOf('month');

        for (let i = 0; i < months; i++) {
            const current = moment(start).add(i, 'months');
            const match = aggregation.find(a =>
                a._id.year === current.year() && a._id.month === current.month() + 1
            );

            data.push({
                period: current.format('MMM YYYY'),
                revenue: match ? match.totalRevenue : 0,
                quantity: match ? match.totalQuantity : 0,
                year: current.year(),
                month: current.month() + 1
            });
        }
        return data;
    }
}

module.exports = new SalesForecastService();
