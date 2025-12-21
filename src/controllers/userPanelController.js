const { getSiteModels } = require('../models/siteDatabase');

// Get all panels for the user's site
const getPanels = async (req, res) => {
    try {
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        const panels = await siteModels.SitePanel.find();
        res.json(panels);
    } catch (error) {
        console.error('Error getting panels:', error);
        res.status(500).json({ message: error.message });
    }
};

// Add a new panel for the user's site (admin only)
const addPanel = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Access denied. Only site administrators can add panels.'
        });
    }

    const { panelName, circuit } = req.body;

    if (!panelName || !circuit) {
        return res.status(400).json({ message: 'Panel name and circuit are required.' });
    }

    try {
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        
        // Check for exact combination of panelName + circuit
        const existingCombo = await siteModels.SitePanel.findOne({ panelName, circuit });

        if (existingCombo) {
            return res.status(400).json({ 
                message: 'This combination of panel name and circuit already exists in this site.' 
            });
        }

        const panel = new siteModels.SitePanel({
            panelName,
            circuit,
            createdBy: req.user.username || null
        });
        await panel.save();
        res.status(201).json(panel);
    } catch (error) {
        console.error('Error adding panel:', error);
        res.status(500).json({ message: error.message });
    }
};

// Check if a panel exists for the user's site
const checkPanelExists = async (req, res) => {
    const { panelName } = req.params;
    try {
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        const panel = await siteModels.SitePanel.findOne({ panelName });
        res.json({ exists: !!panel });
    } catch (error) {
        console.error('Error checking panel existence:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update a panel for the user's site (admin only)
const updatePanel = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Access denied. Only site administrators can update panels.'
        });
    }

    const { originalPanelName, panelName, circuit } = req.body;

    if (!panelName || !circuit || !originalPanelName) {
        return res.status(400).json({ message: 'Invalid input.' });
    }

    try {
        const siteModels = await getSiteModels(req.user.site, req.user.company);

        if (panelName !== originalPanelName) {
            const existingPanel = await siteModels.SitePanel.findOne({ panelName });
            if (existingPanel) {
                return res.status(400).json({ message: 'Panel name already exists in this site.' });
            }
        }

        const updatedPanel = await siteModels.SitePanel.findOneAndUpdate(
            { panelName: originalPanelName },
            { panelName, circuit },
            { new: true }
        );

        if (!updatedPanel) {
            return res.status(404).json({ message: 'Panel not found in this site.' });
        }

        res.json(updatedPanel);
    } catch (error) {
        console.error('Error updating panel:', error);
        res.status(500).json({ message: error.message });
    }
};

// Delete a panel for the user's site (admin only)
const deletePanel = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Access denied. Only site administrators can delete panels.'
        });
    }

    const { panelName } = req.params;
    try {
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        await siteModels.SitePanel.findOneAndDelete({ panelName });
        res.status(200).json({ message: 'Panel deleted successfully' });
    } catch (error) {
        console.error('Error deleting panel:', error);
        res.status(500).json({ message: error.message });
    }
};

// Search for a panel by name in the user's site
const searchPanel = async (req, res) => {
    const { panelName } = req.params;
    try {
        const siteModels = await getSiteModels(req.user.site, req.user.company);
        const panel = await siteModels.SitePanel.findOne({ panelName });
        if (panel) {
            res.json(panel);
        } else {
            res.status(404).json({ message: 'Panel not found.' });
        }
    } catch (error) {
        console.error('Error searching panel:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPanels,
    addPanel,
    updatePanel,
    deletePanel,
    checkPanelExists,
    searchPanel
};

