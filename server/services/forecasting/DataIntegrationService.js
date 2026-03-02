const SalesOrder = require('../../models/SalesOrder');
const Transaction = require('../../models/Transaction');
const SalesHistory = require('../../models/SalesHistory');
const FinancialRecord = require('../../models/FinancialRecord');

class DataIntegrationService {
    /**
     * Sycnhronizes materialized history collections with actual business records
     */
    async syncHistory() {
        console.log('Starting Forecasting Data Sync...');

        // 1. Sync Sales History
        await SalesHistory.deleteMany({}); // Clear old history for full sync
        const salesAggregation = await SalesOrder.aggregate([
            { $match: { status: { $in: ['confirmed', 'shipped', 'delivered', 'paid'] } } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                        product: "$items.product"
                    },
                    totalQty: { $sum: "$items.quantity" },
                    totalRev: { $sum: "$items.total" }
                }
            }
        ]);

        const historyRecords = salesAggregation.map(s => ({
            date: new Date(s._id.date),
            product: s._id.product,
            quantity: s.totalQty,
            revenue: s.totalRev
        }));
        await SalesHistory.insertMany(historyRecords);

        // 2. Sync Financial Records
        await FinancialRecord.deleteMany({});
        const transRecords = await Transaction.find({});
        const finRecords = transRecords.map(t => ({
            date: t.date,
            type: t.direction === 'in' ? 'revenue' : 'expense',
            amount: t.amount,
            category: t.sourceType,
            source: t.sourceModel
        }));
        await FinancialRecord.insertMany(finRecords);

        console.log('Forecasting Data Sync Completed.');
    }
}

module.exports = new DataIntegrationService();
