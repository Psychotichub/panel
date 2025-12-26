/**
 * Migration Script: Update Panel Indexes
 * 
 * This script:
 * 1. Drops the old unique index on panelName alone
 * 2. Creates a new compound unique index on panelName + circuit
 * 
 * Run this once to fix the database indexes
 */

const { getSiteModels } = require('../models/siteDatabase');
require('dotenv').config();

async function migratePanelIndexes(site, company) {
    try {
        console.log(`\n🔄 Migrating panel indexes for ${site}_${company}...`);
        
        const siteModels = await getSiteModels(site, company);
        const collection = siteModels.SitePanel.collection;
        
        // Get existing indexes
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes.map(idx => idx.name));
        
        // Drop the old panelName_1 unique index if it exists
        try {
            await collection.dropIndex('panelName_1');
            console.log('✅ Dropped old index: panelName_1');
        } catch (error) {
            if (error.code === 27) {
                console.log('ℹ️  Index panelName_1 does not exist (already dropped or never created)');
            } else {
                throw error;
            }
        }
        
        // Ensure the compound index exists
        try {
            await collection.createIndex(
                { panelName: 1, circuit: 1 }, 
                { unique: true, name: 'panelName_circuit_unique' }
            );
            console.log('✅ Created compound index: panelName_circuit_unique');
        } catch (error) {
            if (error.code === 85 || error.code === 86) {
                console.log('ℹ️  Compound index already exists');
            } else {
                throw error;
            }
        }
        
        // Verify final indexes
        const finalIndexes = await collection.indexes();
        console.log('Final indexes:', finalIndexes.map(idx => idx.name));
        console.log('✅ Migration completed successfully!\n');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Main execution
async function main() {
    // Get site and company from command line arguments or use defaults
    const site = process.argv[2] || process.env.SITE || 'arsi';
    const company = process.argv[3] || process.env.COMPANY || 'sion solution srl';
    
    console.log('='.repeat(60));
    console.log('Panel Index Migration Script');
    console.log('='.repeat(60));
    console.log(`Site: ${site}`);
    console.log(`Company: ${company}`);
    
    try {
        await migratePanelIndexes(site, company);
        console.log('\n✨ All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { migratePanelIndexes };

