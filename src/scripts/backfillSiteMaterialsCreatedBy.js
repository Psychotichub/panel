/*
 Backfill script for SiteMaterial documents to add missing createdBy and createdAt.

 Usage examples:
   node src/scripts/backfillSiteMaterialsCreatedBy.js --site "Arsi" --company "Sion Solution SRL" --createdBy "Psychotic" --createdAt "2024-10-01"
   node src/scripts/backfillSiteMaterialsCreatedBy.js --site "Arsi" --company "Sion Solution SRL" --id 67b63776578a42f88dff6488 --createdBy "Psychotic" --createdAt "2024-10-01"

 Notes:
 - Only sets fields if they are missing. Existing values are preserved.
 - If --id is provided, only that material is updated; otherwise all lacking createdBy/createdAt are processed.
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

function toISODate(dateStr) {
  // Accept YYYY-MM-DD or any parsable date string, default to UTC midnight
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

(async () => {
  const { site, company, createdBy = 'Psychotic', createdAt, id } = parseArgs();

  if (!site || !company) {
    console.error('Missing required args: --site and --company');
    process.exit(1);
  }

  const createdAtDate = createdAt ? toISODate(createdAt) : null;
  if (createdAt && !createdAtDate) {
    console.error('Invalid --createdAt date. Use YYYY-MM-DD.');
    process.exit(1);
  }

  try {
    const { SiteMaterial } = await getSiteModels(site, company);

    const filter = id
      ? { _id: new mongoose.Types.ObjectId(id) }
      : {
          $or: [
            { createdBy: { $exists: false } },
            { createdBy: null },
            { createdBy: '' },
            ...(createdAtDate
              ? [{ createdAt: { $exists: false } }, { createdAt: null }]
              : []),
          ],
        };

    const candidates = await SiteMaterial.find(filter).lean();
    console.log(`Found ${candidates.length} material(s) to update in site=${site}, company=${company}`);

    let updated = 0;
    for (const mat of candidates) {
      const update = {};
      if (!mat.createdBy) update.createdBy = createdBy;
      if (createdAtDate && !mat.createdAt) update.createdAt = createdAtDate;
      if (createdAtDate && !mat.updatedAt) update.updatedAt = createdAtDate;

      if (Object.keys(update).length === 0) continue;

      await SiteMaterial.updateOne({ _id: mat._id }, { $set: update });
      updated += 1;
    }

    console.log(`Updated ${updated} material(s).`);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    await closeAllSiteConnections().catch(() => {});
  }
})();


