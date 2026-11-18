const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: true,
      index: true,
    },
    medicine_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Medicine',
      default: null,
    },
    pharmacy_id: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Pharmacy',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('Favorite', favoriteSchema);
