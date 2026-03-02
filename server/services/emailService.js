const nodemailer = require('nodemailer');

/**
 * Email Service for ERP System
 * Handles sending emails with attachments using Nodemailer
 */
class EmailService {
  constructor() {
    // Create transporter using environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    console.log("Using SMTP host:", process.env.SMTP_HOST);
  }

  /**
   * Send email with attachment
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Email text content
   * @param {string} options.html - Email HTML content (optional)
   * @param {Object} options.attachment - Attachment object { filename, content, contentType }
   * @returns {Promise<Object>} - Nodemailer result
   */
  async sendEmail({ to, subject, text, html, attachment }) {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in config.env');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to,
        subject,
        text,
        html: html || text
      };

      // Add attachment if provided
      if (attachment) {
        mailOptions.attachments = [{
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }];
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}:`, result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Provide helpful error messages for SMTP authentication issues
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        throw new Error('SMTP authentication failed. Check SMTP credentials in .env');
      }
      
      throw error;
    }
  }

  /**
   * Test email connection
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.error('SMTP credentials not configured');
        return false;
      }
      
      await this.transporter.verify();
      console.log('✓ Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('✗ Email service connection failed:', error.message);
      
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        console.error('SMTP authentication failed. Check SMTP credentials in .env');
      }
      
      return false;
    }
  }
}

module.exports = new EmailService();

