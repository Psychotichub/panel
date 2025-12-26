const mongoose = require('mongoose');
const dailyReportSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    location: { type: String, required: true },
    panelName: { type: String, required: true },
    circuit: { type: String, required: true },
    materialPrice: { type: Number, required: null},
    labourPrice: { type: Number, required: null},
    unit: { type: String, required: true },
    notes: { type: String, default: '' },
    site: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true }
},

{ collection: 'dailyReports' });

// Create compound index for site + company + date for efficient querying
dailyReportSchema.index({ site: 1, company: 1, date: 1 });

const DailyReport = mongoose.model('dailyReports', dailyReportSchema);

module.exports = DailyReport;
