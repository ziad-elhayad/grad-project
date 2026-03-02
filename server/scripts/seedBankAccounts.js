/**
 * Seed Bank Accounts Script
 * Creates initial bank accounts if they don't exist
 * 
 * Usage: node server/scripts/seedBankAccounts.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../config.env') });

const BankAccount = require('../models/BankAccount');

const seedBankAccounts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Check if accounts already exist
    const existingAccounts = await BankAccount.find();
    
    if (existingAccounts.length > 0) {
      console.log('Bank accounts already exist:');
      existingAccounts.forEach(acc => {
        console.log(`  - ${acc.name}: ${acc.balance} EGP`);
      });
      await mongoose.connection.close();
      return;
    }

    // Create initial bank accounts
    const accounts = await BankAccount.create([
      { name: 'Cash', balance: 0 },
      { name: 'Bank Account', balance: 0 }
    ]);

    console.log('✅ Bank accounts created successfully:');
    accounts.forEach(acc => {
      console.log(`  - ${acc.name}: ${acc.balance} EGP`);
    });

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding bank accounts:', error);
    process.exit(1);
  }
};

// Run the seed function
seedBankAccounts();

