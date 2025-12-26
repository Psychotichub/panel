const User = require('../models/user');
const { getSiteModels } = require('../models/siteDatabase');

// Get user's own company and site details
exports.getUserSiteDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get site-specific models
    const siteModels = await getSiteModels(user.site, user.company);
    
    // Get statistics from site-specific database
    const siteStats = await getSiteStatistics(siteModels);
    
    res.status(200).json({
      success: true,
      userDetails: {
        username: user.username,
        role: user.role,
        site: user.site,
        company: user.company,
        createdAt: user.createdAt
      },
      siteStatistics: siteStats
    });
  } catch (error) {
    console.error('Get user site details error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Helper function to get site statistics from site-specific database
async function getSiteStatistics(siteModels) {
  try {
    const dailyReportsCount = await siteModels.SiteDailyReport.countDocuments();
    const materialsCount = await siteModels.SiteMaterial.countDocuments();
    const receivedItemsCount = await siteModels.SiteReceived.countDocuments();
    const totalPricesCount = await siteModels.SiteTotalPrice.countDocuments();
    const monthlyReportsCount = await siteModels.SiteMonthlyReport.countDocuments();

    return {
      dailyReports: dailyReportsCount,
      materials: materialsCount,
      receivedItems: receivedItemsCount,
      totalPrices: totalPricesCount,
      monthlyReports: monthlyReportsCount
    };
  } catch (error) {
    console.error('Error getting site statistics:', error);
    return {
      dailyReports: 0,
      materials: 0,
      receivedItems: 0,
      totalPrices: 0,
      monthlyReports: 0
    };
  }
} 