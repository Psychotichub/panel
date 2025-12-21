const mongoose = require('mongoose');

async function connectToMongoose() {
    try {
        const uri = process.env.MONGO_URI;
        const dbName = process.env.DB_NAME;
        await mongoose.connect(uri, { dbName: dbName });
    } catch (error) {
        console.error('Error connecting to MongoDB with Mongoose:', error);
        process.exit(1);
    }
}

module.exports = { connectToMongoose };
