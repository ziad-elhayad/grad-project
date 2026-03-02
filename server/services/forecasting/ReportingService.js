const ForecastReport = require('../../models/ForecastReport');
const SalesForecastService = require('./SalesForecastService');
const FinanceForecastService = require('./FinanceForecastService');
const moment = require('moment');
const ExcelJS = require('exceljs');

class ForecastingReportingService {
    async generateComprehensiveReport(userId) {
        const salesData = await SalesForecastService.getHistoricalSales(12);
        const financeData = await FinanceForecastService.getHistoricalFinances(12);

        const salesForecast = await SalesForecastService.generateForecast(6);
        const financeForecast = await FinanceForecastService.generateForecast(6);

        // Validation for empty records
        const hasHistory = financeData.length > 0 || salesData.length > 0;

        const reportData = {
            financialHistory: financeData.map(fd => ({
                month: fd.period,
                revenue: fd.revenue || 0,
                expense: fd.expense || 0,
                profit: fd.profit || 0
            })),
            financialForecast: financeForecast.map(ff => ({
                month: moment(ff.period, 'YYYY-MM').format('MMM YYYY'),
                revenue: ff.revenue?.predicted_value || 0,
                expense: ff.expense?.predicted_value || 0,
                profit: ff.profit?.predicted_value || 0
            })),
            salesHistory: salesData.map(sd => ({
                month: sd.period,
                units: sd.quantity || 0,
                revenue: sd.revenue || 0
            })),
            salesForecast: salesForecast.map(sf => ({
                month: moment(sf.period, 'YYYY-MM').format('MMM YYYY'),
                units: sf.metadata?.predicted_quantity || 0,
                revenue: sf.predicted_value || 0,
                method: sf.forecast_type,
                confidence: sf.confidence_level
            })),
            salesInsights: {
                topHistoricalMonth: salesData.length > 0 ? [...salesData].sort((a, b) => b.revenue - a.revenue)[0] : null,
                projectedGrowth: (salesForecast.length > 0 && salesData.length > 0 && salesData[salesData.length - 1].revenue !== 0)
                    ? ((salesForecast[0].predicted_value / salesData[salesData.length - 1].revenue) - 1) * 100
                    : 0
            }
        };

        const totalForecastRevenue = reportData.financialForecast.reduce((sum, f) => sum + f.revenue, 0);

        const report = new ForecastReport({
            title: `Forecasting Analysis - ${moment().format('MMMM YYYY')}`,
            report_type: 'comprehensive_intelligence',
            period_start: moment().subtract(12, 'months').toDate(),
            period_end: moment().add(6, 'months').toDate(),
            data: reportData,
            summary_insights: [
                `Projected revenue for next 6 months: $${totalForecastRevenue.toFixed(2)}`,
                `Average expected growth rate: ${reportData.salesInsights.projectedGrowth.toFixed(2)}%`,
                `Financial health status: ${reportData.financialForecast.every(f => f.profit > 0) ? 'Healthy' : 'Caution Required'}`,
                hasHistory ? "Based on 12 months of historical data." : "Warning: Generated with minimal historical data."
            ],
            generated_by: userId
        });

        await report.save();
        return report;
    }

    async getReports() {
        return await ForecastReport.find().sort({ created_at: -1 }).limit(10);
    }

    async exportToExcel(reportId, user) {
        const report = await ForecastReport.findById(reportId);
        if (!report) throw new Error('Report not found');

        const workbook = new ExcelJS.Workbook();
        const isAdmin = user?.role === 'admin';
        const isFinance = isAdmin || user?.department === 'Finance';
        const isSales = isAdmin || user?.department === 'Sales';

        // 1. Finance Worksheet - Only for Finance or Admin
        if (isFinance) {
            const financeSheet = workbook.addWorksheet('Financial Forecast');
            financeSheet.columns = [
                { header: 'Period', key: 'month', width: 20 },
                { header: 'Revenue ($)', key: 'rev', width: 15 },
                { header: 'Expenses ($)', key: 'exp', width: 15 },
                { header: 'Net Profit ($)', key: 'profit', width: 15 },
                { header: 'Status', key: 'type', width: 15 }
            ];
            financeSheet.getRow(1).font = { bold: true };

            report.data.financialHistory?.forEach(d => {
                financeSheet.addRow({ month: d.month, rev: d.revenue, exp: d.expense, profit: d.profit, type: 'HISTORICAL' });
            });
            report.data.financialForecast?.forEach(f => {
                financeSheet.addRow({ month: f.month, rev: f.revenue, exp: f.expense, profit: f.profit, type: 'PREDICTED' });
            });
        }

        // 2. Sales Worksheet - Only for Sales or Admin
        if (isSales) {
            const salesSheet = workbook.addWorksheet('Sales Forecast');
            salesSheet.columns = [
                { header: 'Period', key: 'month', width: 20 },
                { header: 'Units Predicted', key: 'units', width: 15 },
                { header: 'Expected Revenue ($)', key: 'rev', width: 20 },
                { header: 'Technique', key: 'method', width: 20 },
                { header: 'Confidence (%)', key: 'conf', width: 15 },
                { header: 'Status', key: 'type', width: 15 }
            ];
            salesSheet.getRow(1).font = { bold: true };

            report.data.salesHistory?.forEach(d => {
                salesSheet.addRow({ month: d.month, units: d.units, rev: d.revenue, method: 'Actual', conf: 100, type: 'HISTORICAL' });
            });
            report.data.salesForecast?.forEach(f => {
                salesSheet.addRow({ month: f.month, units: Math.round(f.units), rev: f.revenue, method: f.method, conf: f.confidence, type: 'PREDICTED' });
            });
        }

        return workbook;
    }
}

module.exports = new ForecastingReportingService();
