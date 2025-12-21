const mongoose = require('mongoose');

/**
 * Factory function to create site-specific models
 * @param {string} site - Site name
 * @param {string} company - Company name
 * @returns {Promise<Object>} Object containing all site-specific models
 */
async function createSiteModels(site, company) {
    // Create unique model names for this site to avoid conflicts
    const modelSuffix = `${site}_${company}`.replace(/[^a-zA-Z0-9]/g, '_');

    // Site Configuration Schema
    const siteConfigSchema = new mongoose.Schema({
        siteName: { type: String, required: true },
        companyName: { type: String, required: true },
        settings: {
            currency: { type: String, default: 'USD' },
            timezone: { type: String, default: 'UTC' },
            dateFormat: { type: String, default: 'YYYY-MM-DD' },
            backupFrequency: { type: String, default: 'weekly' }
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }, { collection: 'siteConfig' });

    // Site User Schema
    const siteUserSchema = new mongoose.Schema({
        username: {
            type: String,
            required: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        email: {
            type: String,
            trim: true
        },
        role: {
            type: String,
            enum: ['admin', 'manager', 'user'],
            default: 'user'
        },
        permissions: [{
            type: String,
            enum: ['read', 'write', 'delete', 'admin']
        }],
        isActive: {
            type: Boolean,
            default: true
        },
        lastLogin: {
            type: Date
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }, { collection: 'siteUsers' });

    // Create compound index for username + site + company
    siteUserSchema.index({ username: 1, site: 1, company: 1 }, { unique: true });

    // Site Material Schema (shared across users in the site)
    const siteMaterialSchema = new mongoose.Schema({
        materialName: { type: String, required: true },
        unit: { type: String, required: true },
        materialPrice: { type: Number, required: true },
        laborPrice: { type: Number, required: true },
        category: { type: String, default: 'General' },
        supplier: { type: String },
        isActive: { type: Boolean, default: true },
        createdBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }, { collection: 'siteMaterials' });

    // Site Activity Log Schema
    const siteActivityLogSchema = new mongoose.Schema({
        userId: { type: String, required: true },
        action: { type: String, required: true },
        resource: { type: String, required: true },
        details: { type: mongoose.Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now },
        ipAddress: { type: String },
        userAgent: { type: String }
    }, { collection: 'siteActivityLogs' });

    // Create models using the main connection
    const connection = mongoose.connection;

    // Check if models already exist on this connection
    const SiteConfig = connection.models[`SiteConfig_${modelSuffix}`] || 
                      connection.model(`SiteConfig_${modelSuffix}`, siteConfigSchema);
    
    const SiteUser = connection.models[`SiteUser_${modelSuffix}`] || 
                     connection.model(`SiteUser_${modelSuffix}`, siteUserSchema);
    
    const SiteMaterial = connection.models[`SiteMaterial_${modelSuffix}`] || 
                         connection.model(`SiteMaterial_${modelSuffix}`, siteMaterialSchema);
    
    const SiteActivityLog = connection.models[`SiteActivityLog_${modelSuffix}`] || 
                            connection.model(`SiteActivityLog_${modelSuffix}`, siteActivityLogSchema);

    return {
        SiteConfig,
        SiteUser,
        SiteMaterial,
        SiteActivityLog
    };
}

/**
 * Factory function to create user-specific models
 * @param {string} userId - User ID
 * @param {string} site - Site name
 * @param {string} company - Company name
 * @returns {Promise<Object>} Object containing all user-specific models
 */
async function createUserModels(userId, site, company) {
    // Create unique model names for this user to avoid conflicts
    const modelSuffix = `${userId}_${site}_${company}`.replace(/[^a-zA-Z0-9]/g, '_');

    // User Material Schema
    const userMaterialSchema = new mongoose.Schema({
        materialName: { type: String, required: true },
        unit: { type: String, required: true },
        materialPrice: { type: Number, required: true },
        laborPrice: { type: Number, required: true },
        category: { type: String, default: 'General' },
        supplier: { type: String },
        isActive: { type: Boolean, default: true },
        createdBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }, { collection: 'userMaterials' });

    // User Daily Report Schema
    const userDailyReportSchema = new mongoose.Schema({
        date: { type: Date, required: true },
        materialName: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        location: { type: String },
        notes: { type: String },
        createdBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }, { collection: 'userDailyReports' });

    // User Received Schema
    const userReceivedSchema = new mongoose.Schema({
        date: { type: Date, required: true },
        materialName: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        supplier: { type: String, required: true },
        location: { type: String },
        notes: { type: String },
        createdBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }, { collection: 'userReceived' });

    // User Total Price Schema
    const userTotalPriceSchema = new mongoose.Schema({
        date: { type: Date, required: true },
        materialName: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        materialPrice: { type: Number, required: true },
        laborPrice: { type: Number, required: true },
        materialCost: { type: Number, required: true },
        laborCost: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        location: { type: String },
        notes: { type: String },
        createdBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }, { collection: 'userTotalPrices' });

    // Create models using the main connection
    const connection = mongoose.connection;

    // Check if models already exist on this connection
    const UserMaterial = connection.models[`UserMaterial_${modelSuffix}`] || 
                        connection.model(`UserMaterial_${modelSuffix}`, userMaterialSchema);
    
    const UserDailyReport = connection.models[`UserDailyReport_${modelSuffix}`] || 
                            connection.model(`UserDailyReport_${modelSuffix}`, userDailyReportSchema);
    
    const UserReceived = connection.models[`UserReceived_${modelSuffix}`] || 
                         connection.model(`UserReceived_${modelSuffix}`, userReceivedSchema);
    
    const UserTotalPrice = connection.models[`UserTotalPrice_${modelSuffix}`] || 
                           connection.model(`UserTotalPrice_${modelSuffix}`, userTotalPriceSchema);

    return {
        UserMaterial,
        UserDailyReport,
        UserReceived,
        UserTotalPrice
    };
}

/**
 * Get site models (cached)
 * @param {string} site - Site name
 * @param {string} company - Company name
 * @returns {Promise<Object>} Site models
 */
async function getSiteModels(site, company) {
    return await createSiteModels(site, company);
}

/**
 * Get user models (cached)
 * @param {string} userId - User ID
 * @param {string} site - Site name
 * @param {string} company - Company name
 * @returns {Promise<Object>} User models
 */
async function getUserModels(userId, site, company) {
    return await createUserModels(userId, site, company);
}

module.exports = {
    createSiteModels,
    createUserModels,
    getSiteModels,
    getUserModels
}; 