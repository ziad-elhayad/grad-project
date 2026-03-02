const mongoose = require('mongoose');

/**
 * Sales Forecast Model
 * Stores predictions for future sales volume and revenue
 */
const salesForecastSchema = new mongoose.Schema({
    period: {
        type: String, // e.g., '2026-04'
        required: true
    },
    forecast_type: {
        type: String,
        enum: ['moving_average', 'linear_regression', 'ai_ml'],
        default: 'moving_average'
    },
    predicted_value: {
        type: Number,
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product' // Optional: forecast per product or total sales
    },
    confidence_level: {
        type: Number, // 0 to 100
        default: 80
    },
    historical_data_points: {
        type: Number
    },
    metadata: {
        seasonality_factor: Number,
        trend_type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for quick lookup by period
salesForecastSchema.index({ period: 1, forecast_type: 1 });

module.exports = mongoose.model('SalesForecast', salesForecastSchema);
