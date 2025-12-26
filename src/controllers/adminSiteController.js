const { getSiteModels } = require('../models/siteDatabase');
const User = require('../models/user');

// Get all users from all sites in the database
const getSiteUsers = async (req, res) => {
    try {
        // Using main database for user listing; site/company from req.user not needed here
        // Get all users from the main database
        const users = await User.find({}).select('-password');
        
        // Group users by site and company
        const siteUsers = [];
        const allSites = new Set();
        
        users.forEach(user => {
            if (user.site && user.company) {
                const siteKey = `${user.site}_${user.company}`;
                allSites.add(siteKey);
                
                siteUsers.push({
                    username: user.username,
                    site: user.site,
                    company: user.company,
                    role: user.role,
                    database: `${user.site}_${user.company}`,
                    data: {
                        materials: 0,
                        dailyReports: 0,
                        receivedItems: 0,
                        totalPrices: 0
                    },
                    databaseSize: 0,
                    note: 'Site-specific database will be created when first accessed'
                });
            }
        });
        
        res.status(200).json({
            success: true,
            users: siteUsers,
            totalUsers: siteUsers.length,
            sites: Array.from(allSites)
        });
        
    } catch (error) {
        console.error('❌ Error getting site users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get site users',
            error: error.message
        });
    }
};

// Get materials for a specific site
const getSiteMaterials = async (req, res) => {
    try {
        const { site, company } = req.query;
        
        if (!site || !company) {
            return res.status(400).json({
                success: false,
                message: 'Site and company are required'
            });
        }
        
        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Get all materials for the site
        const materials = await siteModels.SiteMaterial.find().sort({ materialName: 1 });
        
        res.status(200).json({
            success: true,
            materials: materials,
            site: site,
            company: company,
            totalMaterials: materials.length
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

// Get daily reports for a specific site
const getSiteDailyReports = async (req, res) => {
    try {
        const { site, company, startDate, endDate } = req.query;
        
        if (!site || !company) {
            return res.status(400).json({
                success: false,
                message: 'Site and company are required'
            });
        }
        
        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Build query
        const query = {};
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        // Get daily reports for the site
        const dailyReports = await siteModels.SiteDailyReport.find(query).sort({ date: -1 });
        
        res.status(200).json({
            success: true,
            dailyReports: dailyReports,
            site: site,
            company: company,
            totalReports: dailyReports.length,
            dateRange: { startDate, endDate }
        });
        
    } catch (error) {
        console.error('❌ Error getting site daily reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get site daily reports',
            error: error.message
        });
    }
};

// Get received items for a specific site
const getSiteReceivedItems = async (req, res) => {
    try {
        const { site, company, startDate, endDate } = req.query;

        if (!site || !company) {
            return res.status(400).json({
                success: false,
                message: 'Site and company are required'
            });
        }
        
        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Build query
        const query = {};
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        // Get received items for the site
        const receivedItems = await siteModels.SiteReceived.find(query).sort({ date: -1 });
        
        res.status(200).json({
            success: true,
            receivedItems: receivedItems,
            site: site,
            company: company,
            totalItems: receivedItems.length,
            dateRange: { startDate, endDate }
        });
        
    } catch (error) {
        console.error('❌ Error getting site received items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get site received items',
            error: error.message
        });
    }
};

// Get total prices for a specific site
const getSiteTotalPrices = async (req, res) => {
    try {
        const { site, company, startDate, endDate } = req.query;
        
        if (!site || !company) {
            return res.status(400).json({
                success: false,
                message: 'Site and company are required'
            });
        }
        
        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Build query
        const query = {};
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        // Get total prices for the site
        const totalPrices = await siteModels.SiteTotalPrice.find(query).sort({ date: -1 });
        
        res.status(200).json({
            success: true,
            totalPrices: totalPrices,
            site: site,
            company: company,
            totalRecords: totalPrices.length,
            dateRange: { startDate, endDate }
        });
        
    } catch (error) {
        console.error('❌ Error getting site total prices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get site total prices',
            error: error.message
        });
    }
};

// Calculate total prices for a specific site and date range
const calculateSiteTotalPrices = async (req, res) => {
    try {
        const { site, company, startDate, endDate } = req.query;
        
        if (!site || !company || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Site, company, start date, and end date are required'
            });
        }
        
        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Get daily reports for the date range
        const dailyReports = await siteModels.SiteDailyReport.find({
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        });
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
            materialTotals[materialName].materialCost += (report.materialPrice || 0) * (report.quantity || 0);
            materialTotals[materialName].laborCost += (report.labourPrice || 0) * (report.quantity || 0);
            materialTotals[materialName].totalPrice += ((report.materialPrice || 0) + (report.labourPrice || 0)) * (report.quantity || 0);
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
        console.error('❌ Error calculating site total prices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate site total prices',
            error: error.message
        });
    }
};

// Get site statistics
const getSiteStatistics = async (req, res) => {
    try {
        const { site, company } = req.query;
        
        console.log('🔍 Getting site statistics:', { site, company });
        
        if (!site || !company) {
            return res.status(400).json({
                success: false,
                message: 'Site and company are required'
            });
        }
        
        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Get counts for different collections
        const dailyReportsCount = await siteModels.SiteDailyReport.countDocuments();
        const materialsCount = await siteModels.SiteMaterial.countDocuments();
        const receivedItemsCount = await siteModels.SiteReceived.countDocuments();
        const totalPricesCount = await siteModels.SiteTotalPrice.countDocuments();
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

// Get user data for a specific user
const getUserData = async (req, res) => {
    try {
        const { username, site, company } = req.query;
        
        console.log('🔍 Getting user data:', { username, site, company });
        
        if (!username || !site || !company) {
            return res.status(400).json({
                success: false,
                message: 'Username, site, and company are required'
            });
        }
        
        // Get site-specific models
        const siteModels = await getSiteModels(site, company);
        
        // Get user's data from the site database
        const materials = await siteModels.SiteMaterial.find({ createdBy: username });
        const dailyReports = await siteModels.SiteDailyReport.find({ username: username });
        const receivedItems = await siteModels.SiteReceived.find({ username: username });
        const totalPrices = await siteModels.SiteTotalPrice.find({ username: username });
        
        console.log(`📊 User data for ${username} in ${site}_${company}:`, {
            materials: materials.length,
            dailyReports: dailyReports.length,
            receivedItems: receivedItems.length,
            totalPrices: totalPrices.length
        });
        
        res.status(200).json({
            success: true,
            userData: {
                username: username,
                site: site,
                company: company,
                materials: materials,
                dailyReports: dailyReports,
                receivedItems: receivedItems,
                totalPrices: totalPrices
            },
            summary: {
                materials: materials.length,
                dailyReports: dailyReports.length,
                receivedItems: receivedItems.length,
                totalPrices: totalPrices.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error getting user data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user data',
            error: error.message
        });
    }
};

module.exports = {
    getSiteUsers,
    getSiteMaterials,
    getSiteDailyReports,
    getSiteReceivedItems,
    getSiteTotalPrices,
    calculateSiteTotalPrices,
    getSiteStatistics,
    getUserData
}; 