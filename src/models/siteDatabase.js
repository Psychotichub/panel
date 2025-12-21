const mongoose = require('mongoose');

// Cache for database connections and models
const siteConnections = new Map();
const siteModels = new Map();

/**
 * Get or create a database connection for a specific site
 * @param {string} site - Site name
 * @param {string} company - Company name
 * @returns {Promise<mongoose.Connection>} Database connection
 */
async function getSiteConnection(site, company) {
  const dbName = `${site}_${company}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  if (siteConnections.has(dbName)) {
    return siteConnections.get(dbName);
  }

  try {
    // Create new connection for this site
    const connection = mongoose.createConnection(
      process.env.MONGO_URI || 'mongodb://localhost:27017',
      {
        dbName: dbName
      }
    );

    // Store connection in cache
    siteConnections.set(dbName, connection);
    return connection;
  } catch (error) {
    console.error(`❌ Failed to connect to site database ${dbName}:`, error);
    throw error;
  }
}

/**
 * Create site-specific models
 * @param {string} site - Site name
 * @param {string} company - Company name
 * @returns {Promise<Object>} Object containing all site-specific models
 */
async function createSiteModels(site, company) {
  const dbName = `${site}_${company}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // Check if models already exist for this site
  if (siteModels.has(dbName)) {
    return siteModels.get(dbName);
  }

  const connection = await getSiteConnection(site, company);
  
  // User Schema for this site
  const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
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
      enum: ['admin', 'user'],
      default: 'user'
    },
    site: {
      type: String,
      required: true
    },
    company: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

  // Daily Report Schema for this site
  const dailyReportSchema = new mongoose.Schema({
    username: { type: String, required: true },
    date: { type: Date, required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    location: { type: String },
    panelName: { type: String, required: true },
    circuit: { type: String, required: true },
    materialPrice: { type: Number, required: true },
    labourPrice: { type: Number, required: true },
    unit: { type: String, required: true },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  // Material Schema for this site
  const materialSchema = new mongoose.Schema({
    materialName: { type: String, required: true, unique: true },
    unit: { type: String, required: true },
    materialPrice: { type: Number, required: true },
    laborPrice: { type: Number, required: true },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  // Received Schema for this site
  const receivedSchema = new mongoose.Schema({
    username: { type: String, required: true },
    date: { type: Date, required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    supplier: { type: String, required: true },
    location: { type: String },
    notes: { type: String },
    unit: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  // Total Price Schema for this site
  const totalPriceSchema = new mongoose.Schema({
    username: { type: String, required: true },
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
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  // Panel Schema for this site
  const panelSchema = new mongoose.Schema({
    panelName: { type: String, required: true },
    circuit: { type: String, required: true },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  // Create compound index for panelName + circuit combination to ensure uniqueness
  panelSchema.index({ panelName: 1, circuit: 1 }, { unique: true });

  // Keep updatedAt in sync on updates
  panelSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
  });

  // Activity Log Schema for this site
  const activityLogSchema = new mongoose.Schema({
    username: { type: String, required: true },
    role: { type: String },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    resource: { type: String, required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String }
  });

  // Monthly Report Schema for this site
  const monthlyReportSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    materialName: { type: String, required: true },
    totalQuantity: { type: Number, required: true },
    totalMaterialCost: { type: Number, required: true },
    totalLaborCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    unit: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  // Create models using the site-specific connection with unique names
  const modelSuffix = dbName.replace(/[^a-zA-Z0-9]/g, '_');
  
  const SiteUser = connection.models[`SiteUser_${modelSuffix}`] || 
                   connection.model(`SiteUser_${modelSuffix}`, userSchema);
  
  const SiteDailyReport = connection.models[`SiteDailyReport_${modelSuffix}`] || 
                          connection.model(`SiteDailyReport_${modelSuffix}`, dailyReportSchema);
  
  const SiteMaterial = connection.models[`SiteMaterial_${modelSuffix}`] || 
                       connection.model(`SiteMaterial_${modelSuffix}`, materialSchema);
  
  const SiteReceived = connection.models[`SiteReceived_${modelSuffix}`] || 
                       connection.model(`SiteReceived_${modelSuffix}`, receivedSchema);
  
  const SiteTotalPrice = connection.models[`SiteTotalPrice_${modelSuffix}`] || 
                         connection.model(`SiteTotalPrice_${modelSuffix}`, totalPriceSchema);
  
  const SiteMonthlyReport = connection.models[`SiteMonthlyReport_${modelSuffix}`] || 
                            connection.model(`SiteMonthlyReport_${modelSuffix}`, monthlyReportSchema);

  const SiteActivityLog = connection.models[`SiteActivityLog_${modelSuffix}`] ||
                          connection.model(`SiteActivityLog_${modelSuffix}`, activityLogSchema);

  const SitePanel = connection.models[`SitePanel_${modelSuffix}`] ||
                    connection.model(`SitePanel_${modelSuffix}`, panelSchema);

  const models = {
    SiteUser,
    SiteDailyReport,
    SiteMaterial,
    SiteReceived,
    SiteTotalPrice,
    SiteMonthlyReport,
    SiteActivityLog,
    SitePanel,
    connection
  };

  // Cache the models
  siteModels.set(dbName, models);
  
  return models;
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
 * Close all site connections
 */
async function closeAllSiteConnections() {
  for (const [dbName, connection] of siteConnections) {
    try {
      await connection.close();
    } catch (error) {
      console.error(`❌ Error closing connection to ${dbName}:`, error);
    }
  }
  siteConnections.clear();
  siteModels.clear();
}

module.exports = {
  getSiteConnection,
  createSiteModels,
  getSiteModels,
  closeAllSiteConnections
}; 