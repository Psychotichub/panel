const { getSiteModels } = require('../models/siteDatabase');

// Get all total prices for the user's site
const getTotalPrices = async (req, res) => {
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        const totalPrices = await siteModels.SiteTotalPrice.find();
        res.status(200).json(totalPrices);
    } catch (error) {
        console.error('Error getting total prices:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add new total prices for the user's site
const addTotalPrice = async (req, res) => {
    try {
        const { materials } = req.body;

        if (!materials || !Array.isArray(materials) || materials.length === 0) {
            return res.status(400).json({ message: 'Invalid materials data.' });
        }

        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Process each material to add pricing information
        const processedMaterials = await Promise.all(materials.map(async (material) => {
            // Find the material in the site-specific database to get pricing
            const materialData = await siteModels.SiteMaterial.findOne({ 
                materialName: material.materialName 
            });
            
            if (!materialData) {
                throw new Error(`Material '${material.materialName}' not found in site database`);
            }
            
            // Calculate costs and total price
            const materialCost = material.quantity * materialData.materialPrice;
            const laborCost = material.quantity * materialData.laborPrice;
            const totalPrice = materialCost + laborCost;
            
            // Add pricing information to the total price record
            return {
                ...material,
                username: req.user.username,
                materialPrice: materialData.materialPrice,
                laborPrice: materialData.laborPrice,
                materialCost: materialCost,
                laborCost: laborCost,
                totalPrice: totalPrice
            };
        }));
        
        // Create new total prices in site-specific database
        const savedMaterials = await siteModels.SiteTotalPrice.insertMany(processedMaterials);
        try {
            const { logAction } = require('../middleware/audit');
            for (const it of savedMaterials) {
                await logAction(req, req.user.site, req.user.company, 'create', 'totalPrice', it._id, { materialName: it.materialName, quantity: it.quantity, unit: it.unit, totalPrice: it.totalPrice });
            }
        } catch (_) { void 0; }
        res.status(201).json(savedMaterials);
    } catch (error) {
        console.error('Error saving total prices:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Update an existing total price for the user's site
const updateTotalPrice = async (req, res) => {
    const { date, materialName, quantity, materialPrice, laborPrice, materialCost, laborCost, totalPrice, location, notes } = req.body;
    const { id } = req.params;

    if (!date || !materialName || !quantity || !materialPrice || !laborPrice) {
        return res.status(400).json({ message: 'Invalid input' });
    }

    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Find and update the total price by ID in site-specific database
        const updatedTotalPrice = await siteModels.SiteTotalPrice.findByIdAndUpdate(
            id,
            { date, materialName, quantity, materialPrice, laborPrice, materialCost, laborCost, totalPrice, location, notes },
            { new: true, runValidators: true }
        );

        if (!updatedTotalPrice) {
            return res.status(404).json({ message: 'Total price not found' });
        }

        try {
            const { logAction } = require('../middleware/audit');
            await logAction(req, req.user.site, req.user.company, 'update', 'totalPrice', updatedTotalPrice._id, { materialName, quantity, unit: updatedTotalPrice.unit, totalPrice });
        } catch (_) { void 0; }
        res.status(200).json(updatedTotalPrice);
    } catch (error) {
        console.error('Error updating total price:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete an existing total price for the user's site
const deleteTotalPrice = async (req, res) => {
    const { id } = req.params;

    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        const deletedTotalPrice = await siteModels.SiteTotalPrice.findByIdAndDelete(id);

        if (!deletedTotalPrice) {
            return res.status(404).json({ message: 'Total price not found' });
        }

        res.status(204).end();
    } catch (error) {
        console.error('Error deleting total price:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get total prices by date for the user's site
const getTotalPricesByDate = async (req, res) => {
    const { date } = req.params;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        const totalPrices = await siteModels.SiteTotalPrice.find({ 
            date: new Date(date).toLocaleDateString('en-CA').split('T')[0] 
        });
        res.status(200).json(totalPrices);
    } catch (error) {
        console.error('Error getting total prices by date:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get total prices by date range for the user's site
const getTotalPricesByDateRange = async (req, res) => {
    const { start, end } = req.query;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        const totalPrices = await siteModels.SiteTotalPrice.find({
            date: {
                $gte: new Date(start).toISOString(),
                $lte: new Date(end).toISOString()
            }
        });
        res.status(200).json(totalPrices);
    } catch (error) {
        console.error('Error getting total prices by date range:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Calculate total price for the user's site
const calculateTotalPrice = async (req, res) => {
    try {
        const { materials } = req.body;

        if (!materials || !Array.isArray(materials) || materials.length === 0) {
            return res.status(400).json({ message: 'Invalid materials data.' });
        }

        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Process each material to add pricing information
        const processedMaterials = await Promise.all(materials.map(async (material) => {
            // Find the material in the site-specific database to get pricing
            const materialData = await siteModels.SiteMaterial.findOne({ 
                materialName: material.materialName 
            });
            
            if (!materialData) {
                throw new Error(`Material '${material.materialName}' not found in site database`);
            }
            
            // Calculate costs and total price
            const materialCost = material.quantity * materialData.materialPrice;
            const laborCost = material.quantity * materialData.laborPrice;
            const totalPrice = materialCost + laborCost;
            
            // Add pricing information to the total price record
            return {
                ...material,
                materialPrice: materialData.materialPrice,
                laborPrice: materialData.laborPrice,
                materialCost: materialCost,
                laborCost: laborCost,
                totalPrice: totalPrice
            };
        }));
        
        // Create new total prices in site-specific database
        const savedMaterials = await siteModels.SiteTotalPrice.insertMany(processedMaterials);
        res.status(201).json(savedMaterials);
    } catch (error) {
        console.error('Error calculating total price:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

module.exports = { 
    getTotalPrices, 
    addTotalPrice, 
    updateTotalPrice, 
    deleteTotalPrice, 
    getTotalPricesByDate, 
    getTotalPricesByDateRange,
    calculateTotalPrice
}; 