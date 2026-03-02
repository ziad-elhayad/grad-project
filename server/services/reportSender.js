const ExcelJS = require('exceljs');
const User = require('../models/User');
const emailService = require('./emailService');

/**
 * Report Sender Service
 * Handles finding managers, generating Excel reports, and sending emails
 */
class ReportSenderService {
  /**
   * Find manager by module
   * @param {string} module - Module name ('sales' or 'purchasing')
   * @returns {Promise<Object>} - Manager user object
   * @throws {Error} - If manager not found
   */
  async findManager(module) {
    try {
      // Map module to department
      const departmentMap = {
        'sales': 'Sales',
        'purchasing': 'Purchasing'
      };

      const department = departmentMap[module.toLowerCase()];
      if (!department) {
        throw new Error(`Invalid module: ${module}. Must be 'sales' or 'purchasing'`);
      }

      // Find manager with role='manager' and matching department
      const manager = await User.findOne({
        role: 'manager',
        department: department,
        isActive: true
      }).select('name email');

      if (!manager) {
        throw new Error(`No ${department} manager found. Please create a manager user with role='manager' and department='${department}'`);
      }

      if (!manager.email) {
        throw new Error(`${department} manager found but has no email address`);
      }

      return manager;
    } catch (error) {
      console.error(`Error finding ${module} manager:`, error);
      throw error;
    }
  }

  /**
   * Convert report data to Excel buffer
   * @param {string} module - Module name ('sales' or 'purchasing')
   * @param {Array} reportData - Array of report records
   * @returns {Promise<Buffer>} - Excel file buffer
   */
  async generateExcelBuffer(module, reportData) {
    try {
      if (!Array.isArray(reportData) || reportData.length === 0) {
        throw new Error('reportData must be a non-empty array');
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`${module} Report`);

      // Get headers from first record
      const headers = Object.keys(reportData[0]);
      
      // Add header row
      worksheet.addRow(headers);

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data rows
      reportData.forEach(record => {
        const row = worksheet.addRow(headers.map(header => record[header] || ''));
        
        // Format date columns if they exist
        headers.forEach((header, index) => {
          const cell = row.getCell(index + 1);
          if (header.toLowerCase().includes('date') && cell.value) {
            if (cell.value instanceof Date) {
              cell.value = cell.value.toISOString().split('T')[0];
            }
          }
        });
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Error generating Excel buffer:', error);
      throw error;
    }
  }

  /**
   * Send report email to manager
   * @param {string} module - Module name ('sales' or 'purchasing')
   * @param {Array} reportData - Array of report records
   * @returns {Promise<Object>} - Result object with success status and message
   */
  async sendReport(module, reportData) {
    try {
      // Find the manager
      const manager = await this.findManager(module);

      // Generate Excel buffer
      const excelBuffer = await this.generateExcelBuffer(module, reportData);

      // Send email with attachment
      const moduleName = module.charAt(0).toUpperCase() + module.slice(1);
      await emailService.sendEmail({
        to: manager.email,
        subject: `New ${moduleName} Report`,
        text: `Attached is the latest ${moduleName} report.`,
        html: `<p>Attached is the latest <strong>${moduleName} Report</strong>.</p>`,
        attachment: {
          filename: `${module}-report.xlsx`,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      return {
        success: true,
        message: `Email sent successfully to ${manager.name} (${manager.email})`
      };
    } catch (error) {
      console.error(`Error sending ${module} report:`, error);
      return {
        success: false,
        message: error.message || `Failed to send ${module} report`
      };
    }
  }
}

module.exports = new ReportSenderService();

