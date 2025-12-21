const { getSiteModels } = require('../models/siteDatabase');

// Get all materials for the user's site
const getMaterials = async (req, res) => {
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        const materials = await siteModels.SiteMaterial.find();
        res.json(materials);
    } catch (error) {
        console.error('Error getting materials:', error);
        res.status(500).json({ message: error.message });
    }
};

// Add a new material for the user's site (Admin only)
const addMaterial = async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            message: 'Access denied. Only site administrators can add materials with pricing information.' 
        });
    }

    const { materialName, unit, materialPrice, laborPrice } = req.body;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Check if material exists in the same site
        const existingMaterial = await siteModels.SiteMaterial.findOne({ materialName });
        
        if (existingMaterial) {
            return res.status(400).json({ message: 'Material already exists in this site.' });
        }

        const material = new siteModels.SiteMaterial({ 
            materialName, 
            unit, 
            materialPrice, 
            laborPrice,
            createdBy: req.user.username || null
        });
        await material.save();
        res.status(201).json(material);
    } catch (error) {
        console.error('Error adding material:', error);
        res.status(500).json({ message: error.message });
    }
};

// Check if a material exists for the user's site
const checkMaterialExists = async (req, res) => {
    const { materialName } = req.params;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Check if material exists in the user's site
        const material = await siteModels.SiteMaterial.findOne({ materialName });
        res.json({ exists: !!material });
    } catch (error) {
        console.error('Error checking material existence:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update a material for the user's site (Admin only)
const updateMaterial = async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            message: 'Access denied. Only site administrators can update materials with pricing information.' 
        });
    }

    const { originalMaterialName, materialName, unit, materialPrice, laborPrice } = req.body;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);

        // Check if the new material name already exists in the same site
        if (materialName !== originalMaterialName) {
            const existingMaterial = await siteModels.SiteMaterial.findOne({ materialName });
            if (existingMaterial) {
                return res.status(400).json({ message: 'Material name already exists in this site.' });
            }
        }

        // Ensure createdBy exists for legacy records
        const existing = await siteModels.SiteMaterial.findOne({ materialName: originalMaterialName });
        const updateData = { materialName, unit, materialPrice, laborPrice };
        if (existing && (!existing.createdBy || existing.createdBy === '')) {
            updateData.createdBy = req.user.username || existing.createdBy;
        }
        const material = await siteModels.SiteMaterial.findOneAndUpdate(
            { materialName: originalMaterialName },
            updateData,
            { new: true }
        );
        
        if (!material) {
            return res.status(404).json({ message: 'Material not found in this site.' });
        }
        
        // If material name changed, update it in all related collections
        if (materialName !== originalMaterialName) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 Cascading material name update`);
            console.log(`   Old name: "${originalMaterialName}"`);
            console.log(`   New name: "${materialName}"`);
            console.log(`${'='.repeat(60)}\n`);
            
            try {
                // Update in Daily Reports
                const dailyReportUpdate = await siteModels.SiteDailyReport.updateMany(
                    { materialName: originalMaterialName },
                    { $set: { materialName: materialName } }
                );
                console.log(`✅ Updated ${dailyReportUpdate.modifiedCount} daily reports`);
                
                // Update in Received Materials
                const receivedUpdate = await siteModels.SiteReceived.updateMany(
                    { materialName: originalMaterialName },
                    { $set: { materialName: materialName } }
                );
                console.log(`✅ Updated ${receivedUpdate.modifiedCount} received records`);
                
                // Update in Total Prices
                const totalPriceUpdate = await siteModels.SiteTotalPrice.updateMany(
                    { materialName: originalMaterialName },
                    { $set: { materialName: materialName } }
                );
                console.log(`✅ Updated ${totalPriceUpdate.modifiedCount} total price records`);
                
                // Update in Monthly Reports
                const monthlyReportUpdate = await siteModels.SiteMonthlyReport.updateMany(
                    { materialName: originalMaterialName },
                    { $set: { materialName: materialName } }
                );
                console.log(`✅ Updated ${monthlyReportUpdate.modifiedCount} monthly reports`);
                
                const totalUpdated = 
                    dailyReportUpdate.modifiedCount + 
                    receivedUpdate.modifiedCount + 
                    totalPriceUpdate.modifiedCount +
                    monthlyReportUpdate.modifiedCount;
                
                console.log(`\n${'='.repeat(60)}`);
                console.log(`✨ Cascading update completed!`);
                console.log(`   Total records updated: ${totalUpdated}`);
                console.log(`${'='.repeat(60)}\n`);
            } catch (cascadeError) {
                console.error('❌ Error during cascading update:', cascadeError);
                // Don't fail the main update if cascade fails, just log it
            }
        }
        
        res.json(material);
    } catch (error) {
        console.error('Error updating material:', error);
        res.status(500).json({ message: error.message });
    }
};

// Delete a material for the user's site (Admin only)
const deleteMaterial = async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            message: 'Access denied. Only site administrators can delete materials.' 
        });
    }

    const { materialName } = req.params;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        await siteModels.SiteMaterial.findOneAndDelete({ materialName });
        res.status(200).json({ message: 'Material deleted successfully' });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ message: error.message });
    }
};

// Search for a material by name in the user's site
const searchMaterial = async (req, res) => {
    const { materialName } = req.params;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        const material = await siteModels.SiteMaterial.findOne({ materialName });
        if (material) {
            res.json(material);
        } else {
            res.status(404).json({ message: 'Material not found.' });
        }
    } catch (error) {
        console.error('Error searching material:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    checkMaterialExists,
    searchMaterial
}; 