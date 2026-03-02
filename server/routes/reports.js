const express = require('express');
const { body, validationResult } = require('express-validator');
const reportService = require('../services/reportService');
const schedulerService = require('../services/schedulerService');
const reportSender = require('../services/reportSender');
const { protect, authorize } = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// @route   GET /api/reports/test
// @desc    Test endpoint without authentication
// @access  Public
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Reports API is working',
    timestamp: new Date().toISOString()
  });
});


// @route   POST /api/reports/trigger-auto-pos
// @desc    Manually trigger automatic purchase order generation
// @access  Private (Manager, Admin)
router.post('/trigger-auto-pos', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    await schedulerService.triggerAutoPurchaseOrders();
    
    res.json({
      success: true,
      message: 'Automatic purchase order generation triggered successfully'
    });
  } catch (error) {
    console.error('Trigger auto POs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger automatic purchase order generation'
    });
  }
});

// @route   GET /api/reports/status
// @desc    Get scheduler status
// @access  Private (Manager, Admin)
router.get('/status', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const status = schedulerService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get scheduler status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status'
    });
  }
});


// @route   GET /api/reports/generate/:type
// @desc    Generate report data for specific type
// @access  Private (Manager, Admin)
router.get('/generate/:type', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    let reportData;
    
    switch (type) {
      case 'sales':
        reportData = await reportService.fetchSalesReport(startDate, endDate);
        break;
      case 'purchasing':
        reportData = await reportService.fetchPurchasingReport(startDate, endDate);
        break;
      case 'inventory':
        reportData = await reportService.fetchInventoryReport(startDate, endDate);
        break;
      case 'manufacturing':
        reportData = await reportService.fetchManufacturingReport(startDate, endDate);
        break;
      case 'crm':
        reportData = await reportService.fetchCRMReport(startDate, endDate);
        break;
      case 'scm':
        reportData = await reportService.fetchSCMReport(startDate, endDate);
        break;
      case 'hr':
        reportData = await reportService.fetchHRReport(startDate, endDate);
        break;
      case 'combined':
        const salesData = await reportService.fetchSalesReport(startDate, endDate);
        const purchasingData = await reportService.fetchPurchasingReport(startDate, endDate);
        reportData = { salesData, purchasingData };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type. Use: sales, purchasing, inventory, manufacturing, crm, scm, hr, or combined'
        });
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// @route   GET /api/reports/export/:type
// @desc    Export report data to Excel
// @access  Private (Manager, Admin)
router.get('/export/:type', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Fetch report data
    let reportData;
    switch (type) {
      case 'sales':
        reportData = await reportService.fetchSalesReport(startDate, endDate);
        break;
      case 'purchasing':
        reportData = await reportService.fetchPurchasingReport(startDate, endDate);
        break;
      case 'inventory':
        reportData = await reportService.fetchInventoryReport(startDate, endDate);
        break;
      case 'manufacturing':
        reportData = await reportService.fetchManufacturingReport(startDate, endDate);
        break;
      case 'crm':
        reportData = await reportService.fetchCRMReport(startDate, endDate);
        break;
      case 'scm':
        reportData = await reportService.fetchSCMReport(startDate, endDate);
        break;
      case 'hr':
        reportData = await reportService.fetchHRReport(startDate, endDate);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type. Use: sales, purchasing, inventory, manufacturing, crm, scm, or hr'
        });
    }

    // Generate Excel workbook
    let workbook;
    switch (type) {
      case 'sales':
        workbook = await reportService.generateSalesExcel(reportData, startDate, endDate);
        break;
      case 'purchasing':
        workbook = await reportService.generatePurchasingExcel(reportData, startDate, endDate);
        break;
      case 'inventory':
        workbook = await reportService.generateInventoryExcel(reportData, startDate, endDate);
        break;
      case 'manufacturing':
        workbook = await reportService.generateManufacturingExcel(reportData, startDate, endDate);
        break;
      case 'crm':
        workbook = await reportService.generateCRMExcel(reportData, startDate, endDate);
        break;
      case 'scm':
        workbook = await reportService.generateSCMExcel(reportData, startDate, endDate);
        break;
      case 'hr':
        workbook = await reportService.generateHRExcel(reportData, startDate, endDate);
        break;
    }

    // Set response headers
    const filename = `${type}-report-${startDate}-to-${endDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report'
    });
  }
});

// @route   POST /api/reports/send
// @desc    Send report to module manager via email
// @access  Private (Manager, Admin)
router.post('/send', [
  protect,
  authorize('admin', 'manager'),
  body('module').isIn(['sales', 'purchasing', 'inventory', 'manufacturing', 'crm', 'scm', 'hr']).withMessage('Module must be one of: sales, purchasing, inventory, manufacturing, crm, scm, hr'),
  body('reportData').isArray().withMessage('reportData must be an array'),
  body('reportData').custom((value) => {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error('reportData must be a non-empty array');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { module, reportData } = req.body;

    // Send report via email
    const result = await reportSender.sendReport(module, reportData);

    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Email sent'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to send email'
      });
    }
  } catch (error) {
    console.error('Send report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send report'
    });
  }
});

module.exports = router;
