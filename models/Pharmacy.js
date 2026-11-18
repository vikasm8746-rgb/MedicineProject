const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.Mixed, // Supports numeric ID or ObjectId
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide pharmacy name'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Please provide pharmacy address'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide pharmacy phone number'],
      trim: true,
    },
    opening_hours: {
      type: String,
      default: '08:00 AM - 10:00 PM',
    },
    latitude: {
      type: Number,
      default: 12.9716, // Default Bengaluru coordinates
    },
    longitude: {
      type: Number,
      default: 77.5946,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    is_verified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('Pharmacy', pharmacySchema);
