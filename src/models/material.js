const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    materialName: { type: String, required: true },
    unit: { type: String, required: true },
    materialPrice: { type: Number, required: true },
    laborPrice: { type: Number, required: true },
    site: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true }
}, { collection: 'materialPrice' }); //collection name is materialPrice from the database

// Create compound index for site + company + materialName for efficient querying
materialSchema.index({ site: 1, company: 1, materialName: 1 }, { unique: true });

const Material = mongoose.model('materialPrice', materialSchema);

module.exports = Material;
