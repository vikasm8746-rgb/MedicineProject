const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide medicine name'],
      trim: true,
      index: true,
    },
    brand_name: {
      type: String,
      required: [true, 'Please provide brand name'],
      trim: true,
      index: true,
    },
    generic_name: {
      type: String,
      required: [true, 'Please provide generic molecule name'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Please provide medical category'],
      trim: true,
      index: true,
    },
    manufacturer: {
      type: String,
      trim: true,
      default: 'Standard Pharmaceutical',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    usage_info: {
      type: String,
      trim: true,
      default: 'Take as directed by a healthcare professional.',
    },
    requires_prescription: {
      type: Boolean,
      default: false,
    },
    image_url: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound text search index for fast full-text searching
medicineSchema.index({
  name: 'text',
  brand_name: 'text',
  generic_name: 'text',
  category: 'text',
});

module.exports = mongoose.model('Medicine', medicineSchema);
