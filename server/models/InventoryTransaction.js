const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['in', 'out', 'adjustment'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    required: true
  },
  reference: {
    type: String, // 'purchase', 'sale', 'production', 'adjustment'
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  notes: {
    type: String
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
