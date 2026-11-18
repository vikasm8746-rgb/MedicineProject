const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    pharmacy_id: {
      type: mongoose.Schema.Types.Mixed, // Supports numeric ID or ObjectId
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
      min: 0,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0.0,
    },
    expiry_date: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2), // 2 years default
    },
    availability_status: {
      type: String,
      enum: ['Available', 'Low Stock', 'Out of Stock'],
      default: 'Available',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Auto-update availability_status before saving
inventorySchema.pre('save', function () {
  if (this.quantity <= 0) {
    this.availability_status = 'Out of Stock';
  } else if (this.quantity <= 10) {
    this.availability_status = 'Low Stock';
  } else {
    this.availability_status = 'Available';
  }
});

module.exports = mongoose.model('Inventory', inventorySchema);
