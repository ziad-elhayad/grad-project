const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import Sub-Module Services
const SalesForecastService = require('../services/forecasting/SalesForecastService');
const FinanceForecastService = require('../services/forecasting/FinanceForecastService');
const DashboardService = require('../services/forecasting/DashboardService');
const ReportingService = require('../services/forecasting/ReportingService');
const DataIntegrationService = require('../services/forecasting/DataIntegrationService');

/**
 * @section DATA INTEGRATION
 * @route   POST /api/forecast/sync
 */
router.post('/sync', [protect, authorize('admin', 'manager')], async (req, res) => {
    try {
        await DataIntegrationService.syncHistory();
        res.json({ success: true, message: 'Forecasting history synchronized successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sync failed: ' + error.message });
    }
});

/**
 * @section SUB-MODULE 1: FORECASTING DASHBOARD
 * @route   GET /api/forecast/dashboard
 */
router.get('/dashboard', [protect, authorize('admin', 'manager')], async (req, res) => {
    try {
        const insights = await DashboardService.getDashboardInsights();
        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        console.error('Forecasting Dashboard Error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving forecasting dashboard data' });
    }
});

/**
 * @section SUB-MODULE 2: FINANCE FORECASTING
 * @route   GET /api/forecast/finance
 */
router.get('/finance', [protect, authorize('admin', 'manager')], async (req, res) => {
    try {
        const history = await FinanceForecastService.getHistoricalFinances(12);
        const forecast = await FinanceForecastService.generateForecast(6);

        res.json({
            success: true,
            data: { history, forecast }
        });
    } catch (error) {
        console.error('Finance Forecasting Error:', error);
        res.status(500).json({ success: false, message: 'Error generating finance forecast' });
    }
});

/**
 * @section SUB-MODULE 3: SALES FORECASTING
 * @route   GET /api/forecast/sales
 */
router.get('/sales', [protect, authorize('admin', 'manager')], async (req, res) => {
    try {
        const { method = 'moving_average', productId = null } = req.query;
        const history = await SalesForecastService.getHistoricalSales(12, productId);
        const forecast = await SalesForecastService.generateForecast(6, { method, productId });

        res.json({
            success: true,
            data: { history, forecast }
        });
    } catch (error) {
        console.error('Sales Forecasting Error:', error);
        res.status(500).json({ success: false, message: 'Error generating sales forecast' });
    }
});

/**
 * @section SUB-MODULE 4: FORECASTING REPORTS
 * @route   GET /api/forecast/reports
 * @route   POST /api/forecast/reports/generate
 */
router.get('/reports', [protect, authorize('admin', 'manager')], async (req, res) => {
    try {
        const reports = await ReportingService.getReports();
        res.json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving reports' });
    }
});

router.post('/reports/generate', [protect, authorize('admin', 'manager')], async (req, res) => {
    try {
        const report = await ReportingService.generateComprehensiveReport(req.user.id);
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Report Generation Error:', error);
        res.status(500).json({ success: false, message: 'Error generating report' });
    }
});

router.get('/reports/:id/export', [protect, authorize('admin', 'manager')], async (req, res) => {
    try {
        const workbook = await ReportingService.exportToExcel(req.params.id, req.user);

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + `ForecastReport_${req.params.id}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Excel Export Error:', error);
        res.status(500).json({ success: false, message: 'Error exporting to Excel' });
    }
});

module.exports = router;
