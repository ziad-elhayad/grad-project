const express = require('express');
const { body, validationResult } = require('express-validator');
const SalesOrder = require('../models/SalesOrder');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const ProductionOrder = require('../models/ProductionOrder');
const InventoryTransaction = require('../models/InventoryTransaction');
const Employee = require('../models/Employee');
const Invoice = require('../models/Invoice');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sales/orders
// @desc    Get all sales orders
// @access  Private
router.get('/orders', protect, async (req, res) => {
  try {
    const { status, customer } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    if (customer) {
      query.customer = customer;
    }

    const orders = await SalesOrder.find(query)
      .populate('customer', 'name email company')
      .populate('salesRep', 'employeeId user')
      .populate('items.product', 'name sku')
      .populate('productionOrder', 'orderNumber status')
      .sort({ orderDate: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get sales orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/sales/orders
// @desc    Create new sales order
// @access  Private (Sales, Admin)
router.post('/orders', [
  protect,
  authorize('admin', 'manager'),
  body('customer').isMongoId().withMessage('Valid customer ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').custom((value) => {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      throw new Error('Valid quantity greater than 0 is required');
    }
    return true;
  }),
  body('items.*.unitPrice').custom((value) => {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      throw new Error('Valid unit price is required');
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

    const { customer, items, deliveryDate, notes } = req.body;

    // Generate unique order number
    // Find the highest existing order number
    const lastOrder = await SalesOrder.findOne().sort({ orderNumber: -1 });
    let orderNumber;
    
    if (lastOrder && lastOrder.orderNumber) {
      // Extract the number from the last order number (e.g., "SO0005" -> 5)
      const lastNumber = parseInt(lastOrder.orderNumber.replace('SO', '')) || 0;
      orderNumber = `SO${String(lastNumber + 1).padStart(4, '0')}`;
    } else {
      // No existing orders, start with SO0001
      orderNumber = 'SO0001';
    }
    
    // Double-check uniqueness (in case of race condition)
    const existing = await SalesOrder.findOne({ orderNumber });
    if (existing) {
      // If somehow it exists, find the next available number
      let counter = 1;
      let isUnique = false;
      while (!isUnique && counter < 1000) {
        const testNumber = `SO${String(parseInt(orderNumber.replace('SO', '')) + counter).padStart(4, '0')}`;
        const testExisting = await SalesOrder.findOne({ orderNumber: testNumber });
        if (!testExisting) {
          orderNumber = testNumber;
          isUnique = true;
        }
        counter++;
      }
      
      if (!isUnique) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate unique order number'
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const total = item.quantity * item.unitPrice;
      subtotal += total;
      return {
        ...item,
        total
      };
    });

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    // Check inventory availability
    for (const item of processedItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      if (product.currentStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Required: ${item.quantity}, Available: ${product.currentStock}`
        });
      }
    }

    // Find employee record for the user
    let employee = await Employee.findOne({ user: req.user.id });
    
    // Handle deliveryDate - convert string to Date if provided
    let parsedDeliveryDate = null;
    if (deliveryDate) {
      parsedDeliveryDate = new Date(deliveryDate);
      if (isNaN(parsedDeliveryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid delivery date format'
        });
      }
    }
    
    // Create sales order
    const salesOrder = await SalesOrder.create({
      orderNumber,
      customer,
      items: processedItems,
      subtotal,
      tax,
      total,
      deliveryDate: parsedDeliveryDate,
      salesRep: employee ? employee._id : null,
      notes: notes || ''
    });

    await salesOrder.populate('customer', 'name email company');
    await salesOrder.populate('items.product', 'name sku');

    // Generate invoice number
    const lastInvoice = await Invoice.findOne().sort({ invoiceNumber: -1 });
    let invoiceNumber;
    
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.replace('INV', '')) || 0;
      invoiceNumber = `INV${String(lastNumber + 1).padStart(4, '0')}`;
    } else {
      invoiceNumber = 'INV0001';
    }

    // Calculate due date (30 days from invoice date)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Get customer payment terms if available
    const customerData = await Customer.findById(customer);
    const paymentTerms = customerData?.paymentTerms || 'Net 30';

    // Create invoice with product names
    const invoiceItems = await Promise.all(
      processedItems.map(async (item) => {
        const product = await Product.findById(item.product);
        return {
          product: item.product,
          productName: product?.name || 'Unknown Product',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        };
      })
    );

    const invoice = await Invoice.create({
      invoiceNumber,
      salesOrder: salesOrder._id,
      customer: customer,
      items: invoiceItems,
      subtotal,
      tax,
      total,
      dueDate,
      paymentTerms,
      status: 'sent',
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      data: salesOrder
    });
  } catch (error) {
    console.error('Create sales order error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   PUT /api/sales/orders/:id/confirm
// @desc    Confirm sales order
// @access  Private (Sales, Admin)
router.put('/orders/:id/confirm', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    if (salesOrder.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Sales order is not in pending status'
      });
    }

    // Check inventory again
    for (const item of salesOrder.items) {
      const product = await Product.findById(item.product);
      if (product.currentStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Required: ${item.quantity}, Available: ${product.currentStock}`
        });
      }
    }

    // Update inventory - reduce stock for all items and create transaction records
    for (const item of salesOrder.items) {
      const product = await Product.findByIdAndUpdate(
        item.product,
        { $inc: { currentStock: -item.quantity } },
        { new: true }
      );

      // Create inventory transaction record
      await InventoryTransaction.create({
        product: item.product,
        type: 'out',
        quantity: item.quantity,
        unitCost: product.unitCost,
        totalCost: item.quantity * product.unitCost,
        reference: 'sale',
        referenceId: salesOrder._id,
        notes: `Sales order ${salesOrder.orderNumber} - ${item.quantity} units sold`
      });

      // Check if raw material stock is low and trigger auto PO generation
      if (product.category === 'raw-material' && product.currentStock <= product.minStockLevel && product.supplier) {
        const schedulerService = require('../services/schedulerService');
        schedulerService.generateAutoPurchaseOrders().catch(err => {
          console.error('Error generating auto POs after sales confirmation:', err);
        });
      }
    }

    // Update status
    salesOrder.status = 'confirmed';
    await salesOrder.save();

    // Check if production is needed
    const needsProduction = [];
    for (const item of salesOrder.items) {
      const product = await Product.findById(item.product);
      if (product.category === 'final-product' && product.currentStock < item.quantity) {
        needsProduction.push({
          product: item.product,
          quantity: item.quantity
        });
      }
    }

    // Create production orders if needed
    if (needsProduction.length > 0) {
      for (const prod of needsProduction) {
        const product = await Product.findById(prod.product);
        const orderCount = await ProductionOrder.countDocuments();
        const orderNumber = `PO${String(orderCount + 1).padStart(4, '0')}`;

        const productionOrder = await ProductionOrder.create({
          orderNumber,
          product: prod.product,
          quantity: prod.quantity,
          salesOrder: salesOrder._id,
          status: 'pending'
        });

        salesOrder.productionOrder = productionOrder._id;
        await salesOrder.save();
      }
    }

    await salesOrder.populate('customer', 'name email company');
    await salesOrder.populate('items.product', 'name sku');
    await salesOrder.populate('productionOrder', 'orderNumber status');

    res.json({
      success: true,
      data: salesOrder
    });
  } catch (error) {
    console.error('Confirm sales order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/sales/orders/:id/ship
// @desc    Ship sales order
// @access  Private (Sales, Admin)
router.put('/orders/:id/ship', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    if (salesOrder.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Sales order must be confirmed before shipping'
      });
    }

    // Update status
    salesOrder.status = 'shipped';
    await salesOrder.save();

    await salesOrder.populate('customer', 'name email company');
    await salesOrder.populate('items.product', 'name sku');

    res.json({
      success: true,
      data: salesOrder
    });
  } catch (error) {
    console.error('Ship sales order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sales/revenue
// @desc    Get sales revenue metrics
// @access  Private
router.get('/revenue', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { status: { $in: ['confirmed', 'shipped', 'delivered'] } };

    if (startDate && endDate) {
      query.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await SalesOrder.find(query);
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const orderCount = orders.length;

    const revenue = {
      totalRevenue,
      orderCount,
      averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
      period: {
        startDate: startDate || 'all time',
        endDate: endDate || 'all time'
      }
    };

    res.json({
      success: true,
      data: revenue
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sales/customers-report
// @desc    Get customer analytics report
// @access  Private
router.get('/customers-report', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { status: { $in: ['confirmed', 'shipped', 'delivered'] } };

    if (startDate && endDate) {
      query.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await SalesOrder.find(query)
      .populate('customer', 'name email company')
      .populate('items.product', 'name sku');

    // Calculate customer metrics
    const customerMap = new Map();
    orders.forEach(order => {
      const customerId = order.customer._id.toString();
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          name: order.customer.name,
          email: order.customer.email,
          company: order.customer.company,
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: order.orderDate
        });
      }
      const customer = customerMap.get(customerId);
      customer.orderCount += 1;
      customer.totalSpent += order.total;
      if (order.orderDate > customer.lastOrderDate) {
        customer.lastOrderDate = order.orderDate;
      }
    });

    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const activeCustomers = customerMap.size;

    res.json({
      success: true,
      data: {
        activeCustomers,
        topCustomers
      }
    });
  } catch (error) {
    console.error('Get customers report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sales/products-report
// @desc    Get product sales analytics report
// @access  Private
router.get('/products-report', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { status: { $in: ['confirmed', 'shipped', 'delivered'] } };

    if (startDate && endDate) {
      query.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await SalesOrder.find(query)
      .populate('items.product', 'name sku category');

    // Calculate product metrics
    const productMap = new Map();
    orders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.product._id.toString();
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            name: item.product.name,
            sku: item.product.sku,
            category: item.product.category,
            quantitySold: 0,
            revenue: 0
          });
        }
        const product = productMap.get(productId);
        product.quantitySold += item.quantity;
        product.revenue += item.total;
      });
    });

    const topProducts = Array.from(productMap.values())
      .map(product => ({
        ...product,
        averagePrice: product.quantitySold > 0 ? product.revenue / product.quantitySold : 0
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    const topProduct = topProducts[0] || null;

    res.json({
      success: true,
      data: {
        topProducts,
        topProduct
      }
    });
  } catch (error) {
    console.error('Get products report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sales/trends
// @desc    Get sales trends and patterns
// @access  Private
router.get('/trends', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { status: { $in: ['confirmed', 'shipped', 'delivered'] } };

    if (startDate && endDate) {
      query.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await SalesOrder.find(query);

    // Group by month
    const monthlyData = {};
    orders.forEach(order => {
      const month = order.orderDate.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month: new Date(order.orderDate.getFullYear(), order.orderDate.getMonth()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: 0,
          orders: 0
        };
      }
      monthlyData[month].revenue += order.total;
      monthlyData[month].orders += 1;
    });

    const monthlyRevenue = Object.values(monthlyData).sort((a, b) => 
      new Date(a.month) - new Date(b.month)
    );

    res.json({
      success: true,
      data: {
        monthlyRevenue
      }
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sales/export/:type
// @desc    Export sales data to CSV
// @access  Private
router.get('/export/:type', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    let query = { status: { $in: ['confirmed', 'shipped', 'delivered'] } };

    if (startDate && endDate) {
      query.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await SalesOrder.find(query)
      .populate('customer', 'name email company')
      .populate('items.product', 'name sku');

    let csvData = '';
    let filename = '';

    switch (type) {
      case 'sales':
        csvData = 'Order Number,Customer,Total,Status,Order Date,Items\n';
        orders.forEach(order => {
          const items = order.items.map(item => `${item.product.name} (${item.quantity})`).join('; ');
          csvData += `${order.orderNumber},"${order.customer.name}",${order.total},${order.status},${order.orderDate.toISOString().split('T')[0]},"${items}"\n`;
        });
        filename = 'sales-orders.csv';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/sales/orders/:id
// @desc    Delete sales order
// @access  Private (Sales, Admin)
router.delete('/orders/:id', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    await SalesOrder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Sales order deleted successfully'
    });
  } catch (error) {
    console.error('Delete sales order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sales/invoices
// @desc    Get all invoices
// @access  Private
router.get('/invoices', protect, async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('customer', 'name email company')
      .populate('salesOrder', 'orderNumber')
      .sort({ invoiceDate: -1 });

    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sales/invoices/:orderId
// @desc    Get invoice by sales order ID
// @access  Private
router.get('/invoices/:orderId', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ salesOrder: req.params.orderId })
      .populate('customer', 'name email company phone address')
      .populate('salesOrder', 'orderNumber orderDate deliveryDate')
      .populate('items.product', 'name sku');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this sales order'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/sales/invoices/:id/mark-paid
// @desc    Mark sales invoice as paid
// @access  Private
router.put('/invoices/:id/mark-paid', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already marked as paid'
      });
    }

    // Update invoice status
    invoice.status = 'paid';
    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice marked as paid',
      data: invoice
    });
  } catch (error) {
    console.error('Mark invoice paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
