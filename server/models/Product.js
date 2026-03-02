const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['raw-material', 'final-product', 'others'],
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  currentStock: {
    type: Number,
    default: 0
  },
  minStockLevel: {
    type: Number,
    default: 0
  },
  maxStockLevel: {
    type: Number,
    default: 1000
  },
  unitCost: {
    type: Number,
    required: true
  },
  sellingPrice: {
    type: Number
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});
module.exports = mongoose.model('Product', productSchema);
