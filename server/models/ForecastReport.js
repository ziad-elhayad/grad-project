const mongoose = require('mongoose');

/**
 * Forecast Report Model
 * Stores generated analytical reports for summary and export
 */
const forecastReportSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    report_type: {
        type: String,
        enum: ['sales_detailed', 'finance_comprehensive', 'comparison_actual_vs_forecast', 'comprehensive_intelligence'],
        required: true
    },
    period_start: {
        type: Date,
        required: true
    },
    period_end: {
        type: Date,
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    summary_insights: [String],
    generated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ForecastReport', forecastReportSchema);
