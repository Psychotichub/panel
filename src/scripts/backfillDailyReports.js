/*
 Backfill daily reports to include username, createdAt/updatedAt aligned to date,
 and material/labour prices fetched from site materials.

 Usage:
   node src/scripts/backfillDailyReports.js --site "Arsi" --company "Sion Solution SRL" --username "Psychotic"
   node src/scripts/backfillDailyReports.js --site "Arsi" --company "Sion Solution SRL" --id 67b9dad6e65b253c111c2983 --username "Psychotic"

 Notes:
 - Only fills missing fields; existing values are preserved.
 - createdAt/updatedAt will be set exactly to the report's 'date' if they are missing.
 - materialPrice is taken from SiteMaterial.materialPrice; labourPrice from SiteMaterial.laborPrice (note spelling).
*/

require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const { getSiteModels, closeAllSiteConnections } = require('../models/siteDatabase');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      out[key] = value;
    }
  }
  return out;
}

(async () => {
  const { site, company, username = 'Psychotic', id } = parseArgs();
  if (!site || !company) {
    console.error('Missing required args: --site and --company');
    process.exit(1);
  }

  try {
    const { SiteDailyReport, SiteMaterial } = await getSiteModels(site, company);

    const filter = id
      ? { _id: new mongoose.Types.ObjectId(id) }
      : {
          $or: [
            { username: { $exists: false } },
            { username: null },
            { username: '' },
            { materialPrice: { $exists: false } },
            { labourPrice: { $exists: false } },
            { createdAt: { $exists: false } },
            { updatedAt: { $exists: false } },
          ],
        };

    const candidates = await SiteDailyReport.find(filter).lean();
    console.log(`Found ${candidates.length} daily report(s) to backfill in site=${site}, company=${company}`);

    let updated = 0;
    for (const rep of candidates) {
      const update = {};

      // Username
      if (!rep.username) update.username = username;

      // createdAt/updatedAt from date
      if (rep.date) {
        const dateVal = new Date(rep.date);
        if (!rep.createdAt) update.createdAt = dateVal;
        if (!rep.updatedAt) update.updatedAt = dateVal;
      }

      // Prices from materials
      if (rep.materialName && (rep.materialPrice == null || rep.labourPrice == null)) {
        const mat = await SiteMaterial.findOne({ materialName: rep.materialName }).lean();
        if (mat) {
          if (rep.materialPrice == null && typeof mat.materialPrice === 'number') {
            update.materialPrice = mat.materialPrice;
          }
          if (rep.labourPrice == null && typeof mat.laborPrice === 'number') {
            update.labourPrice = mat.laborPrice; // note spelling difference
          }
        }
      }

      if (Object.keys(update).length === 0) continue;

      await SiteDailyReport.updateOne({ _id: rep._id }, { $set: update });
      updated += 1;
    }

    console.log(`Updated ${updated} daily report(s).`);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    await closeAllSiteConnections().catch(() => {});
  }
})();


