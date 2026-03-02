const mongoose = require('mongoose');

/**
 * Financial Record Model (Materialized View for Forecasting)
 */
const financialRecordSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    type: {
        type: String, // revenue, expense
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    category: String,
    source: String
}, {
    timestamps: true
});

financialRecordSchema.index({ date: 1, type: 1 });

module.exports = mongoose.model('FinancialRecord', financialRecordSchema);
