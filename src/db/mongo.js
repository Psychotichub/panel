const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

let db;

async function connectToMongo() {
    try {
        if (!uri) {
            throw new Error('MONGO_URI is not set in .env file. Please check your .env file and ensure MONGO_URI is configured.');
        }
        if (!dbName) {
            throw new Error('DB_NAME is not set in .env file. Please check your .env file and ensure DB_NAME is configured.');
        }
        const client = new MongoClient(uri);
        await client.connect();
        db = client.db(dbName);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call connectToMongo first.');
    }
    return db;
}

module.exports = { connectToMongo, getDb };
