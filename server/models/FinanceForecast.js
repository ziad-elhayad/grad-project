const mongoose = require('mongoose');

/**
 * Finance Forecast Model
 * Stores predictions for future revenue, expenses, and cash flow
 */
const financeForecastSchema = new mongoose.Schema({
    period: {
        type: String, // e.g., '2026-04'
        required: true
    },
    forecast_type: {
        type: String,
        enum: ['revenue', 'expense', 'profit', 'cash_flow'],
        required: true
    },
    predicted_value: {
        type: Number,
        required: true
    },
    confidence_level: {
        type: Number,
        default: 85
    },
    methodology: {
        type: String,
        default: 'historical_analysis'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

financeForecastSchema.index({ period: 1, forecast_type: 1 });

module.exports = mongoose.model('FinanceForecast', financeForecastSchema);
