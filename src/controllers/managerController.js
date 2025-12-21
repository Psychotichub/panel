const { getSiteModels } = require('../models/siteDatabase');
const User = require('../models/user');

async function getManagerOwnedUsernames(managerId, managerUsername) {
    try {
        // Get all users directly created by this manager
        const directUsers = await User.find({ 'createdBy.id': managerId }).select('username _id role');
        const usernames = directUsers.map(u => u.username);
        
        // Get admins created by this manager
        const adminsCreatedByManager = directUsers.filter(u => u.role === 'admin');
        
        // For each admin created by manager, get users they created
        for (const admin of adminsCreatedByManager) {
            const usersCreatedByAdmin = await User.find({ 'createdBy.id': admin._id }).select('username');
            usernames.push(...usersCreatedByAdmin.map(u => u.username));
        }
        
        // Include the manager themselves
        if (managerUsername) usernames.push(managerUsername);
        
        return Array.from(new Set(usernames));
    } catch (e) {
        console.error('Error getting manager owned usernames:', e);
        return managerUsername ? [managerUsername] : [];
    }
}

// Calculate total prices for a specific site and company
exports.calculateTotalPrices = async (req, res) => {
    try {
        const { site, company, startDate, endDate } = req.query;
        // Validation
        if (!site || !company || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Site, company, start date, and end date are required'
            });
        }

        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Build base date range filter
        const reportFilter = {
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        // If requester is a manager, restrict to data created by the manager or users they created
        let allowedUsernames = [];
        const isManager = req.user?.role === 'manager';
        if (isManager) {
            allowedUsernames = await getManagerOwnedUsernames(req.user.id, req.user.username);
            reportFilter.username = { $in: allowedUsernames };
        }

        // Get daily reports for the date range (and username filter if applied)
        let dailyReports = await siteModels.SiteDailyReport.find(reportFilter);

        // Fallback: if no daily reports, try using precomputed total prices for the range
        let usingPrecomputedTotals = false;
        if (!dailyReports || dailyReports.length === 0) {
            const totalFilter = {
                date: reportFilter.date
            };
            if (reportFilter.username) {
                totalFilter.username = reportFilter.username;
            }
            const totalPrices = await siteModels.SiteTotalPrice.find(totalFilter);
            if (totalPrices && totalPrices.length > 0) {
                usingPrecomputedTotals = true;
                // Map totals into a dailyReports-like shape for unified aggregation
                dailyReports = totalPrices.map(tp => ({
                    materialName: tp.materialName,
                    quantity: tp.quantity,
                    unit: tp.unit,
                    materialPrice: tp.materialPrice,
                    labourPrice: tp.laborPrice, // normalize key
                    totalPrice: tp.totalPrice,
                    materialCost: tp.materialCost,
                    laborCost: tp.laborCost,
                    location: tp.location
                }));
            }
        }

        // Group by material and calculate totals
        const materialTotals = {};
        
        dailyReports.forEach(report => {
            const materialName = report.materialName;
            
            if (!materialTotals[materialName]) {
                materialTotals[materialName] = {
                    materialName: materialName,
                    quantity: 0,
                    unit: report.unit,
                    materialCost: 0,
                    laborCost: 0,
                    totalPrice: 0,
                    location: report.location || 'N/A'
                };
            }
            
            // Add quantities and costs
            materialTotals[materialName].quantity += report.quantity || 0;
            if (usingPrecomputedTotals) {
                materialTotals[materialName].materialCost += report.materialCost || 0;
                materialTotals[materialName].laborCost += report.laborCost || 0;
                materialTotals[materialName].totalPrice += report.totalPrice || 0;
            } else {
                const mPrice = report.materialPrice || 0;
                const lPrice = report.labourPrice || 0;
                materialTotals[materialName].materialCost += mPrice * (report.quantity || 0);
                materialTotals[materialName].laborCost += lPrice * (report.quantity || 0);
                materialTotals[materialName].totalPrice += (mPrice + lPrice) * (report.quantity || 0);
            }
        });

        // Convert to array and calculate summary
        const calculatedTotalPrices = Object.values(materialTotals);
        const grandTotal = calculatedTotalPrices.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalMaterialCost = calculatedTotalPrices.reduce((sum, item) => sum + item.materialCost, 0);
        const totalLaborCost = calculatedTotalPrices.reduce((sum, item) => sum + item.laborCost, 0);

        res.status(200).json({
            success: true,
            calculatedTotalPrices: calculatedTotalPrices,
            summary: {
                totalMaterials: calculatedTotalPrices.length,
                grandTotal: grandTotal,
                totalMaterialCost: totalMaterialCost,
                totalLaborCost: totalLaborCost
            },
            dateRange: {
                start: startDate,
                end: endDate
            },
            site: site,
            company: company
        });

    } catch (error) {
        console.error('❌ Error calculating total prices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate total prices',
            error: error.message
        });
    }
};

// Get materials for a specific site and company
exports.getSiteMaterials = async (req, res) => {
    try {
        const { site, company } = req.query;
        
        // Validation
        if (!site || !company) {
            return res.status(400).json({
                success: false,
                message: 'Site and company are required'
            });
        }

        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Apply manager ownership filter if needed
        let materialsFilter = {};
        if (req.user?.role === 'manager') {
            const allowedUsernames = await getManagerOwnedUsernames(req.user.id, req.user.username);
            materialsFilter = { createdBy: { $in: allowedUsernames } };
        }

        // Get materials for the site
        const materials = await siteModels.SiteMaterial
            .find(materialsFilter)
            .sort({ materialName: 1 });

        res.status(200).json({
            success: true,
            materials: materials,
            site: site,
            company: company
        });

    } catch (error) {
        console.error('❌ Error getting site materials:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get site materials',
            error: error.message
        });
    }
};

// Get site statistics
exports.getSiteStatistics = async (req, res) => {
    try {
        const { site, company } = req.query;
        
        // Validation
        if (!site || !company) {
            return res.status(400).json({
                success: false,
                message: 'Site and company are required'
            });
        }

        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Build filters for manager ownership if needed
        let dailyReportsFilter = {};
        let materialsFilterCount = {};
        let receivedFilter = {};
        let totalPricesFilter = {};
        if (req.user?.role === 'manager') {
            const allowedUsernames = await getManagerOwnedUsernames(req.user.id, req.user.username);
            dailyReportsFilter = { username: { $in: allowedUsernames } };
            materialsFilterCount = { createdBy: { $in: allowedUsernames } };
            receivedFilter = { username: { $in: allowedUsernames } };
            totalPricesFilter = { username: { $in: allowedUsernames } };
        }

        // Get counts for different collections
        const dailyReportsCount = await siteModels.SiteDailyReport.countDocuments(dailyReportsFilter);
        const materialsCount = await siteModels.SiteMaterial.countDocuments(materialsFilterCount);
        const receivedItemsCount = await siteModels.SiteReceived.countDocuments(receivedFilter);
        const totalPricesCount = await siteModels.SiteTotalPrice.countDocuments(totalPricesFilter);
        const monthlyReportsCount = await siteModels.SiteMonthlyReport.countDocuments();



        res.status(200).json({
            success: true,
            statistics: {
                dailyReports: dailyReportsCount,
                materials: materialsCount,
                receivedItems: receivedItemsCount,
                totalPrices: totalPricesCount,
                monthlyReports: monthlyReportsCount
            },
            site: site,
            company: company
        });

    } catch (error) {
        console.error('❌ Error getting site statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get site statistics',
            error: error.message
        });
    }
}; 

// Get site activity logs (simple view for manager dashboard)
exports.getSiteActivityLogs = async (req, res) => {
    try {
        const { site, company, limit = 50 } = req.query;
        if (!site || !company) {
            return res.status(400).json({ success: false, message: 'Site and company are required' });
        }
        const siteModels = await getSiteModels(site, company);

        const logFilter = {};
        // Managers can view only their tree; admins can view all
        if (req.user?.role === 'manager') {
            const allowedUsernames = await getManagerOwnedUsernames(req.user.id, req.user.username);
            logFilter.username = { $in: allowedUsernames };
        }

        const logs = await siteModels.SiteActivityLog
            .find(logFilter)
            .sort({ timestamp: -1 })
            .limit(Math.max(1, Math.min(500, Number(limit))))
            .lean();

        res.status(200).json({ success: true, logs });
    } catch (error) {
        console.error('❌ Error getting site activity logs:', error);
        res.status(500).json({ success: false, message: 'Failed to get activity logs', error: error.message });
    }
};