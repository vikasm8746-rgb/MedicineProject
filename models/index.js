const { connectMongoDB, getMongoStatus, mongoose } = require('../config/mongodb');
const User = require('./User');
const Pharmacy = require('./Pharmacy');
const Medicine = require('./Medicine');
const Inventory = require('./Inventory');
const Reservation = require('./Reservation');
const Favorite = require('./Favorite');

module.exports = {
  connectMongoDB,
  getMongoStatus,
  mongoose,
  User,
  Pharmacy,
  Medicine,
  Inventory,
  Reservation,
  Favorite,
};
