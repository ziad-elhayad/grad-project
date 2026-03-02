const mongoose = require('mongoose');

/**
 * Sales History Model (Materialized View for Forecasting)
 * Aggregates daily/monthly sales for faster processing
 */
const salesHistorySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    quantity: {
        type: Number,
        required: true
    },
    revenue: {
        type: Number,
        required: true
    },
    category: String
}, {
    timestamps: true
});

salesHistorySchema.index({ date: 1, product: 1 });

module.exports = mongoose.model('SalesHistory', salesHistorySchema);
