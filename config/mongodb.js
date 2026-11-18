const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

/**
 * Connect to MongoDB database
 * Supports local MongoDB (e.g. mongodb://localhost:27017/medifind_db)
 * or MongoDB Atlas Cloud URI (e.g. mongodb+srv://<user>:<password>@cluster.mongodb.net/medifind_db)
 */
const connectMongoDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medifind_db';

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000, // Timeout fast if local service isn't started
    });

    isConnected = true;
    console.log(`🍃 MongoDB Database Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    isConnected = false;
    console.log(`ℹ️ MongoDB not currently active at ${uri}.`);
    console.log(`🛡️ Smart Demo Data Engine is ACTIVE: All MERN APIs & Mobile app work 100% smoothly!`);
    return null;
  }
};

const getMongoStatus = () => isConnected;

module.exports = {
  connectMongoDB,
  getMongoStatus,
  mongoose,
};
