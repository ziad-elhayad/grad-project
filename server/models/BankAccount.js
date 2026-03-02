const mongoose = require('mongoose');

/**
 * BankAccount Model
 * Represents Cash or Bank accounts with current balance
 */
const bankAccountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Bank account name is required'],
    trim: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
bankAccountSchema.index({ name: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);

