const { getSiteModels } = require('../models/siteDatabase');

// Get all daily reports for the user's site
const getDailyReports = async (req, res) => {
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        const dailyReports = await siteModels.SiteDailyReport.find();
        res.status(200).json(dailyReports);
    } catch (error) {
        console.error('Error getting daily reports:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add new daily reports for the user's site
const addDailyReport = async (req, res) => {
    const { materials } = req.body;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
        return res.status(400).json({ message: 'Invalid input' });
    }

    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Process each material to add pricing information
        const processedMaterials = await Promise.all(materials.map(async (material) => {
            // Find the material in the site-specific database to get pricing
            const materialData = await siteModels.SiteMaterial.findOne({ 
                materialName: material.materialName 
            });
            
            if (!materialData) {
                throw new Error(`Material '${material.materialName}' not found in site database`);
            }
            
            // Add pricing information to the daily report
            const report = {
                ...material,
                username: req.user.username,
                materialPrice: materialData.materialPrice,
                labourPrice: materialData.laborPrice
            };
            // Align createdAt/updatedAt to the provided date
            if (material.date) {
                const d = new Date(material.date);
                report.createdAt = d;
                report.updatedAt = d;
            }
            return report;
        }));
        
        // Create new daily report documents in site-specific database
        const newDailyReports = await siteModels.SiteDailyReport.insertMany(processedMaterials);
        // Audit log
        try {
            const { logAction } = require('../middleware/audit');
            for (const r of newDailyReports) {
                await logAction(req, req.user.site, req.user.company, 'create', 'dailyReport', r._id, { materialName: r.materialName, quantity: r.quantity, unit: r.unit });
            }
        } catch (_) { void 0; }
        res.status(201).json(newDailyReports);
    } catch (error) {
        console.error('Error adding daily reports:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Update an existing daily report for the user's site
const updateDailyReport = async (req, res) => {
    const { date, materialName, quantity, notes, location } = req.body;
    const { id } = req.params;

    if (!date || !materialName || !quantity || !location) {
        return res.status(400).json({ message: 'Invalid input' });
    }

    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Find the material to get pricing information
        const materialData = await siteModels.SiteMaterial.findOne({ materialName });
        if (!materialData) {
            return res.status(400).json({ message: `Material '${materialName}' not found` });
        }
        
        // Find and update the daily report by ID in site-specific database
        const updatedDailyReport = await siteModels.SiteDailyReport.findByIdAndUpdate(
            id,
            { 
                date, 
                materialName, 
                quantity, 
                notes, 
                location,
                username: req.user.username,
                materialPrice: materialData.materialPrice,
                labourPrice: materialData.laborPrice
            },
            { new: true, runValidators: true }
        );

        if (!updatedDailyReport) {
            return res.status(404).json({ message: 'Daily report not found' });
        }

        // Audit log
        try {
            const { logAction } = require('../middleware/audit');
            await logAction(req, req.user.site, req.user.company, 'update', 'dailyReport', updatedDailyReport._id, { materialName, quantity, unit: updatedDailyReport.unit });
        } catch (_) { void 0; }
        res.status(200).json(updatedDailyReport);
    } catch (error) {
        console.error('Error updating daily report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete an existing daily report for the user's site
const deleteDailyReport = async (req, res) => {
    const { id } = req.params;

    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        const deletedDailyReport = await siteModels.SiteDailyReport.findByIdAndDelete(id);

        if (!deletedDailyReport) {
            return res.status(404).json({ message: 'Daily report not found' });
        }

        res.status(204).end();
    } catch (error) {
        console.error('Error deleting daily report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get daily reports by date for the user's site
const getDailyReportsByDate = async (req, res) => {
    const { date } = req.params;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Fetch daily reports by date from site-specific database
        const dailyReports = await siteModels.SiteDailyReport.find({ 
            date: new Date(date).toLocaleDateString('en-CA').split('T')[0] 
        });
        res.status(200).json(dailyReports);
    } catch (error) {
        console.error('Error getting daily reports by date:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get daily reports by date range for the user's site
const getDailyReportsByDateRange = async (req, res) => {
    const { start, end } = req.query;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Fetch daily reports by date range from site-specific database
        const dailyReports = await siteModels.SiteDailyReport.find({
            date: {
                $gte: new Date(start).toISOString(),
                $lte: new Date(end).toISOString()
            }
        });
        res.status(200).json(dailyReports);
    } catch (error) {
        console.error('Error getting daily reports by date range:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { 
    getDailyReports, 
    addDailyReport, 
    updateDailyReport, 
    deleteDailyReport, 
    getDailyReportsByDate, 
    getDailyReportsByDateRange 
}; 