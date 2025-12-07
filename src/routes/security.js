const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// In-memory storage for security settings (in production, use database)
const spendCaps = new Map();
const allowDenyLists = new Map();

/**
 * GET /api/security/spend-caps
 * Get spend caps for a wallet
 */
router.get('/spend-caps', async (req, res) => {
    try {
        const { wallet } = req.query;

        if (!wallet) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address required'
            });
        }

        const caps = spendCaps.get(wallet.toLowerCase()) || [];

        res.json({
            success: true,
            caps
        });
    } catch (error) {
        logger.error('Get spend caps error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/security/spend-caps
 * Add a spend cap
 */
router.post('/spend-caps', async (req, res) => {
    try {
        const { wallet, type, limit } = req.body;

        if (!wallet || !type || !limit) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const cap = {
            id: `cap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            limit,
            current: '0',
            createdAt: new Date().toISOString()
        };

        const walletCaps = spendCaps.get(wallet.toLowerCase()) || [];
        walletCaps.push(cap);
        spendCaps.set(wallet.toLowerCase(), walletCaps);

        logger.info('Spend cap added', { wallet, type, limit });

        res.json({
            success: true,
            cap
        });
    } catch (error) {
        logger.error('Add spend cap error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/security/spend-caps/:id
 * Remove a spend cap
 */
router.delete('/spend-caps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { wallet } = req.query;

        if (!wallet) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address required'
            });
        }

        const walletCaps = spendCaps.get(wallet.toLowerCase()) || [];
        const filtered = walletCaps.filter(cap => cap.id !== id);
        spendCaps.set(wallet.toLowerCase(), filtered);

        logger.info('Spend cap removed', { wallet, id });

        res.json({
            success: true
        });
    } catch (error) {
        logger.error('Remove spend cap error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/security/allow-deny-lists
 * Get allow/deny lists for a wallet
 */
router.get('/allow-deny-lists', async (req, res) => {
    try {
        const { wallet } = req.query;

        if (!wallet) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address required'
            });
        }

        const lists = allowDenyLists.get(wallet.toLowerCase()) || [];

        res.json({
            success: true,
            lists
        });
    } catch (error) {
        logger.error('Get allow/deny lists error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/security/allow-deny-lists
 * Add address to allow/deny list
 */
router.post('/allow-deny-lists', async (req, res) => {
    try {
        const { wallet, address, type, reason } = req.body;

        if (!wallet || !address || !type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const entry = {
            id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            address: address.toLowerCase(),
            type,
            reason: reason || '',
            createdAt: new Date().toISOString()
        };

        const walletLists = allowDenyLists.get(wallet.toLowerCase()) || [];
        walletLists.push(entry);
        allowDenyLists.set(wallet.toLowerCase(), walletLists);

        logger.info('Address added to list', { wallet, address, type });

        res.json({
            success: true,
            entry
        });
    } catch (error) {
        logger.error('Add to list error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/security/allow-deny-lists/:id
 * Remove address from list
 */
router.delete('/allow-deny-lists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { wallet } = req.query;

        if (!wallet) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address required'
            });
        }

        const walletLists = allowDenyLists.get(wallet.toLowerCase()) || [];
        const filtered = walletLists.filter(entry => entry.id !== id);
        allowDenyLists.set(wallet.toLowerCase(), filtered);

        logger.info('Address removed from list', { wallet, id });

        res.json({
            success: true
        });
    } catch (error) {
        logger.error('Remove from list error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/security/verify-transaction
 * Verify transaction against security policies
 */
router.post('/verify-transaction', async (req, res) => {
    try {
        const { wallet, to, amount, type } = req.body;

        if (!wallet || !to) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const warnings = [];
        let blocked = false;

        // Check deny list
        const lists = allowDenyLists.get(wallet.toLowerCase()) || [];
        const denied = lists.find(entry => entry.type === 'deny' && entry.address === to.toLowerCase());
        if (denied) {
            blocked = true;
            warnings.push({
                severity: 'critical',
                message: `Address ${to} is on your deny list: ${denied.reason}`
            });
        }

        // Check spend caps
        const caps = spendCaps.get(wallet.toLowerCase()) || [];
        for (const cap of caps) {
            const current = parseFloat(cap.current);
            const limit = parseFloat(cap.limit);
            const txAmount = parseFloat(amount || 0);

            if (current + txAmount > limit) {
                warnings.push({
                    severity: 'high',
                    message: `Transaction would exceed ${cap.type} spend cap (${current + txAmount}/${limit} USDC)`
                });
            }
        }

        res.json({
            success: true,
            allowed: !blocked,
            warnings,
            riskScore: blocked ? 100 : warnings.length * 20
        });
    } catch (error) {
        logger.error('Verify transaction error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
