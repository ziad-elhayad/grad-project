const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    type: Date
  },
  checkOut: {
    type: Date
  },
  workingHours: {
    type: Number,
    default: 0
  },
  overtime: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    default: 'present'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Calculate working hours before saving
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const diffInMs = this.checkOut - this.checkIn;
    this.workingHours = Math.round((diffInMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    
    // Calculate overtime (assuming 8 hours is standard)
    if (this.workingHours > 8) {
      this.overtime = Math.round((this.workingHours - 8) * 100) / 100; // Round to 2 decimal places
    } else {
      this.overtime = 0;
    }
  } else if (this.isModified('checkOut') && !this.checkOut) {
    // If checkout is removed, reset working hours and overtime
    this.workingHours = 0;
    this.overtime = 0;
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
