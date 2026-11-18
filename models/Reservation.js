const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: true,
      index: true,
    },
    pharmacy_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    medicine_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Completed'],
      default: 'Pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);
