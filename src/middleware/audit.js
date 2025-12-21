// Simple audit logging middleware helpers per site/company
const { getSiteModels } = require('../models/siteDatabase');

async function logAction(req, site, company, action, resource, resourceId, details = {}) {
  try {
    const { SiteActivityLog } = await getSiteModels(site, company);
    const username = req.user?.username || 'unknown';
    const role = req.user?.role || 'unknown';
    await SiteActivityLog.create({
      username,
      role,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
  } catch (_) {
    // swallow logging errors to not break main flow
  }
}

module.exports = { logAction };


