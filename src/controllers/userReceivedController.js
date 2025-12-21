const { getSiteModels } = require('../models/siteDatabase');

// Get all received items for the user's site
const getReceivedItems = async (req, res) => {
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        const receivedItems = await siteModels.SiteReceived.find();
        res.status(200).json(receivedItems);
    } catch (error) {
        console.error('Error getting received items:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add new received items for the user's site
const addReceivedItem = async (req, res) => {
    const { materials } = req.body;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
        return res.status(400).json({ message: 'Invalid input' });
    }

    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Attach username and create new received items in site-specific database
        const itemsWithUser = materials.map(m => {
            const item = { ...m, username: req.user.username };
            if (m.date) {
                const d = new Date(m.date);
                item.createdAt = d;
                item.updatedAt = d;
            }
            return item;
        });
        const newReceivedItems = await siteModels.SiteReceived.insertMany(itemsWithUser);
        try {
            const { logAction } = require('../middleware/audit');
            for (const it of newReceivedItems) {
                await logAction(req, req.user.site, req.user.company, 'create', 'received', it._id, { materialName: it.materialName, quantity: it.quantity, unit: it.unit });
            }
        } catch (_) { void 0; }
        res.status(201).json(newReceivedItems);
    } catch (error) {
        console.error('Error adding received items:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update an existing received item for the user's site
const updateReceivedItem = async (req, res) => {
    const { date, materialName, quantity, supplier, notes, location } = req.body;
    const { id } = req.params;

    if (!date || !materialName || !quantity || !supplier) {
        return res.status(400).json({ message: 'Invalid input' });
    }

    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Find and update the received item by ID in site-specific database
        const updatedReceivedItem = await siteModels.SiteReceived.findByIdAndUpdate(
            id,
            { date, materialName, quantity, supplier, notes, location },
            { new: true, runValidators: true }
        );

        if (!updatedReceivedItem) {
            return res.status(404).json({ message: 'Received item not found' });
        }

        try {
            const { logAction } = require('../middleware/audit');
            await logAction(req, req.user.site, req.user.company, 'update', 'received', updatedReceivedItem._id, { materialName, quantity, unit: updatedReceivedItem.unit });
        } catch (_) { void 0; }
        res.status(200).json(updatedReceivedItem);
    } catch (error) {
        console.error('Error updating received item:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete an existing received item for the user's site
const deleteReceivedItem = async (req, res) => {
    const { id } = req.params;

    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        const deletedReceivedItem = await siteModels.SiteReceived.findByIdAndDelete(id);

        if (!deletedReceivedItem) {
            return res.status(404).json({ message: 'Received item not found' });
        }

        res.status(204).end();
    } catch (error) {
        console.error('Error deleting received item:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get received items by date for the user's site
const getReceivedItemsByDate = async (req, res) => {
    const { date } = req.params;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Fetch received items by date from site-specific database
        const receivedItems = await siteModels.SiteReceived.find({ 
            date: new Date(date).toLocaleDateString('en-CA').split('T')[0] 
        });
        res.status(200).json(receivedItems);
    } catch (error) {
        console.error('Error getting received items by date:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get received items by date range for the user's site
const getReceivedItemsByDateRange = async (req, res) => {
    const { start, end } = req.query;
    try {
        // Get site-specific models
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Fetch received items by date range from site-specific database
        const receivedItems = await siteModels.SiteReceived.find({
            date: {
                $gte: new Date(start).toISOString(),
                $lte: new Date(end).toISOString()
            }
        });
        res.status(200).json(receivedItems);
    } catch (error) {
        console.error('Error getting received items by date range:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { 
    getReceivedItems, 
    addReceivedItem, 
    updateReceivedItem, 
    deleteReceivedItem, 
    getReceivedItemsByDate, 
    getReceivedItemsByDateRange 
}; 