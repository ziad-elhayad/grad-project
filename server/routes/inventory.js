const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const SalesOrder = require('../models/SalesOrder');
const PurchaseOrder = require('../models/PurchaseOrder');
const ProductionOrder = require('../models/ProductionOrder');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/inventory/products
// @desc    Get all products
// @access  Private
router.get('/products', protect, async (req, res) => {
  try {
    const { category, lowStock } = req.query;
    let query = { isActive: true };

    if (category) {
      // Handle category migration: fetch both old and new category names
      if (category === 'final-product') {
        // Fetch both 'finished-good' (old) and 'final-product' (new)
        query.category = { $in: ['finished-good', 'final-product'] };

        // Optionally update old products to new category in background
        Product.updateMany(
          { category: 'finished-good' },
          { $set: { category: 'final-product' } }
        ).catch(err => console.error('Error updating category:', err));
      } else if (category === 'others') {
        // Fetch both 'component' (old) and 'others' (new)
        query.category = { $in: ['component', 'others'] };

        // Optionally update old products to new category in background
        Product.updateMany(
          { category: 'component' },
          { $set: { category: 'others' } }
        ).catch(err => console.error('Error updating category:', err));
      } else {
        query.category = category;
      }
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
    }

    const products = await Product.find(query)
      .populate('supplier', 'name contactPerson')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/inventory/products
// @desc    Create new product
// @access  Private (Inventory, Admin)
router.post('/products', [
  protect,
  authorize('admin', 'manager'),
  body('name').notEmpty().withMessage('Product name is required'),
  body('sku').notEmpty().withMessage('SKU is required'),
  body('category').isIn(['raw-material', 'final-product', 'others']).withMessage('Valid category is required'),
  body('unit').notEmpty().withMessage('Unit is required'),
  body('unitCost').isNumeric().withMessage('Valid unit cost is required')
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

    // Ensure numeric fields are numbers
    const productData = {
      ...req.body,
      currentStock: req.body.currentStock ? Number(req.body.currentStock) : 0,
      minStockLevel: req.body.minStockLevel ? Number(req.body.minStockLevel) : 0,
      maxStockLevel: req.body.maxStockLevel ? Number(req.body.maxStockLevel) : 1000,
      unitCost: Number(req.body.unitCost),
      sellingPrice: req.body.sellingPrice ? Number(req.body.sellingPrice) : undefined
    };

    const product = await Product.create(productData);

    // Check if raw material stock is low and trigger auto PO generation
    if (product.category === 'raw-material' && product.currentStock <= product.minStockLevel && product.supplier) {
      try {
        const schedulerService = require('../services/schedulerService');
        schedulerService.generateAutoPurchaseOrders().catch(err => {
          console.error('Error generating auto POs after product creation:', err);
        });
      } catch (schedError) {
        console.error('Could not load scheduler service:', schedError);
      }
    }

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);

    // Handle duplicate SKU error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A product with this SKU already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/inventory/products/:id
// @desc    Update product
// @access  Private (Inventory, Admin)
router.put('/products/:id', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    // Ensure numeric fields are numbers if they exist in the request body
    const updateData = { ...req.body };
    if (updateData.currentStock !== undefined) updateData.currentStock = Number(updateData.currentStock);
    if (updateData.minStockLevel !== undefined) updateData.minStockLevel = Number(updateData.minStockLevel);
    if (updateData.maxStockLevel !== undefined) updateData.maxStockLevel = Number(updateData.maxStockLevel);
    if (updateData.unitCost !== undefined) updateData.unitCost = Number(updateData.unitCost);
    if (updateData.sellingPrice !== undefined) updateData.sellingPrice = updateData.sellingPrice === '' ? undefined : Number(updateData.sellingPrice);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if raw material stock is low and trigger auto PO generation
    if (product.category === 'raw-material' && product.currentStock <= product.minStockLevel && product.supplier) {
      try {
        const schedulerService = require('../services/schedulerService');
        schedulerService.generateAutoPurchaseOrders().catch(err => {
          console.error('Error generating auto POs after product update:', err);
        });
      } catch (schedError) {
        console.error('Could not load scheduler service:', schedError);
      }
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);

    // Handle duplicate SKU error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A product with this SKU already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/inventory/products/:id/adjust
// @desc    Adjust product stock
// @access  Private (Inventory, Admin)
router.post('/products/:id/adjust', [
  protect,
  authorize('admin', 'manager'),
  body('quantity').isNumeric().withMessage('Valid quantity is required'),
  body('type').isIn(['in', 'out']).withMessage('Type must be in or out'),
  body('notes').notEmpty().withMessage('Notes are required')
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

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const { quantity, type, notes } = req.body;

    // Update stock
    if (type === 'in') {
      product.currentStock += quantity;
    } else {
      if (product.currentStock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock for adjustment'
        });
      }
      product.currentStock -= quantity;
    }

    await product.save();

    // Create inventory transaction
    const transaction = await InventoryTransaction.create({
      product: product._id,
      type,
      quantity,
      unitCost: product.unitCost,
      totalCost: quantity * product.unitCost,
      reference: 'adjustment',
      notes,
      performedBy: req.user.id
    });

    // Check if raw material stock is low and trigger auto PO generation
    if (product.category === 'raw-material' && product.currentStock <= product.minStockLevel && product.supplier) {
      const schedulerService = require('../services/schedulerService');
      schedulerService.generateAutoPurchaseOrders().catch(err => {
        console.error('Error generating auto POs after stock adjustment:', err);
      });
    }

    res.json({
      success: true,
      data: {
        product,
        transaction
      }
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/inventory/transactions
// @desc    Get inventory transactions
// @access  Private
router.get('/transactions', protect, async (req, res) => {
  try {
    const { product, type, startDate, endDate } = req.query;
    let query = {};

    if (product) {
      query.product = product;
    }

    if (type) {
      query.type = type;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await InventoryTransaction.find(query)
      .populate('product', 'name sku')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/inventory/low-stock
// @desc    Get low stock alerts
// @access  Private
router.get('/low-stock', protect, async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$currentStock', '$minStockLevel'] },
      isActive: true
    })
      .populate('supplier', 'name contactPerson email')
      .sort({ currentStock: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/inventory/products/:id
// @desc    Delete product
// @access  Private (Inventory, Admin)
router.delete('/products/:id', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    console.log('Delete product request - User:', req.user?.email, 'Role:', req.user?.role);
    console.log('Product ID:', req.params.id);

    const product = await Product.findById(req.params.id);
    if (!product) {
      console.log('Product not found with ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log('Product found:', product.name);
    console.log('Product ID from DB:', product._id);
    console.log('Requested ID:', req.params.id);
    console.log('IDs match:', product._id.toString() === req.params.id);

    // Check if product is being used in any orders
    console.log('Checking for product usage in orders...');

    try {
      const salesOrders = await SalesOrder.find({
        'items.product': req.params.id
      });
      console.log('Sales orders using this product:', salesOrders.length);

      const purchaseOrders = await PurchaseOrder.find({
        'items.product': req.params.id
      });
      console.log('Purchase orders using this product:', purchaseOrders.length);

      const productionOrders = await ProductionOrder.find({
        $or: [
          { product: req.params.id },
          { 'materials.product': req.params.id }
        ]
      });
      console.log('Production orders using this product:', productionOrders.length);

      if (salesOrders.length > 0 || purchaseOrders.length > 0 || productionOrders.length > 0) {
        console.log('Product in use, switching to soft delete');
        product.isActive = false;
        await product.save();
        return res.json({
          success: true,
          message: 'Product is currently in use by orders. It has been deactivated and hidden from inventory to preserve your records.'
        });
      }

      console.log('Product is safe to delete');
    } catch (orderCheckError) {
      console.error('Error checking order usage:', orderCheckError);
      // Continue with deletion if order check fails
      console.log('Order check failed, proceeding with deletion');
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/inventory/stock-value
// @desc    Get total stock value
// @access  Private
router.get('/stock-value', protect, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });

    const stockValue = products.reduce((total, product) => {
      return total + (product.currentStock * product.unitCost);
    }, 0);

    const stockMetrics = {
      totalValue: stockValue,
      totalProducts: products.length,
      totalItems: products.reduce((sum, product) => sum + product.currentStock, 0),
      averageValue: products.length > 0 ? stockValue / products.length : 0
    };

    res.json({
      success: true,
      data: stockMetrics
    });
  } catch (error) {
    console.error('Get stock value error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
