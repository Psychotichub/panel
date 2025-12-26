const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema({
    panelName: { type: String, required: true },
    circuit: { type: String, required: true },
    site: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true }
}, { collection: 'panels' });

// Create compound index for site + company + panelName + circuit for efficient querying
// This ensures the same panel can have different circuits
panelSchema.index({ site: 1, company: 1, panelName: 1, circuit: 1 }, { unique: true });

const Panel = mongoose.model('panels', panelSchema);

module.exports = Panel;

