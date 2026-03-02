const mongoose = require('mongoose');

/**
 * Transaction Model
 * Records all financial transactions (invoice payments and expenses)
 */
const transactionSchema = new mongoose.Schema({
  sourceType: {
    type: String,
    enum: ['invoice', 'expense'],
    required: [true, 'Source type is required']
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceModel'
  },
  sourceModel: {
    type: String,
    enum: ['Invoice', 'PurchaseInvoice', 'Expense'],
    required: true
  },
  direction: {
    type: String,
    enum: ['in', 'out'],
    required: [true, 'Transaction direction is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: [true, 'Bank account is required']
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
transactionSchema.index({ bankAccount: 1, date: -1 });
transactionSchema.index({ sourceType: 1, sourceId: 1 });
transactionSchema.index({ date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);

