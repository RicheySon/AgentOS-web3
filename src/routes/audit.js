const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const auditService = require('../services/audit/AuditService');
const logger = require('../utils/logger');

/**
 * @route   GET /api/audit/log
 * @desc    Get audit trail with filters
 * @access  Public
 */
router.get('/log', asyncHandler(async (req, res) => {
    const {
        user_id,
        action_type,
        entity_type,
        start_date,
        end_date,
        status,
        limit = 100
    } = req.query;

    const filters = {
        user_id,
        action_type,
        entity_type,
        start_date,
        end_date,
        status,
        limit: parseInt(limit)
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key =>
        filters[key] === undefined && delete filters[key]
    );

    const auditTrail = await auditService.getAuditTrail(filters);

    res.json({
        success: true,
        data: {
            filters,
            count: auditTrail.length,
            entries: auditTrail
        },
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   GET /api/audit/report
 * @desc    Generate compliance report
 * @access  Public
 */
router.get('/report', asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;

    const dateRange = {};
    if (start_date) dateRange.start_date = start_date;
    if (end_date) dateRange.end_date = end_date;

    const report = await auditService.generateComplianceReport(dateRange);

    res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   GET /api/audit/user/:userId
 * @desc    Get user-specific audit trail
 * @access  Public
 */
router.get('/user/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 100 } = req.query;

    const auditTrail = await auditService.getUserAuditTrail(userId, parseInt(limit));

    res.json({
        success: true,
        data: {
            user_id: userId,
            count: auditTrail.length,
            entries: auditTrail
        },
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   GET /api/audit/transaction/:txHash
 * @desc    Get transaction audit details
 * @access  Public
 */
router.get('/transaction/:txHash', asyncHandler(async (req, res) => {
    const { txHash } = req.params;

    const auditEntry = await auditService.getTransactionAudit(txHash);

    if (!auditEntry) {
        return res.status(404).json({
            success: false,
            error: 'Transaction audit entry not found'
        });
    }

    res.json({
        success: true,
        data: auditEntry,
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   POST /api/audit/log-action
 * @desc    Manually log an action
 * @access  Public
 */
router.post('/log-action', asyncHandler(async (req, res) => {
    const { actionType, entityId, userId, changes, metadata } = req.body;

    if (!actionType || !entityId || !userId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: actionType, entityId, userId'
        });
    }

    const auditEntry = await auditService.logAction(
        actionType,
        entityId,
        userId,
        changes || {},
        metadata || {}
    );

    res.json({
        success: true,
        data: auditEntry,
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   POST /api/audit/log-transaction
 * @desc    Log transaction
 * @access  Public
 */
router.post('/log-transaction', asyncHandler(async (req, res) => {
    const { txHash, details, userId } = req.body;

    if (!txHash || !details || !userId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: txHash, details, userId'
        });
    }

    const auditEntry = await auditService.logTransaction(txHash, details, userId);

    res.json({
        success: true,
        data: auditEntry,
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   POST /api/audit/log-policy-change
 * @desc    Log policy change
 * @access  Public
 */
router.post('/log-policy-change', asyncHandler(async (req, res) => {
    const { policyId, oldValue, newValue, userId } = req.body;

    if (!policyId || !userId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: policyId, userId'
        });
    }

    const auditEntry = await auditService.logPolicyChange(
        policyId,
        oldValue,
        newValue,
        userId
    );

    res.json({
        success: true,
        data: auditEntry,
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   POST /api/audit/log-auth
 * @desc    Log authentication event
 * @access  Public
 */
router.post('/log-auth', asyncHandler(async (req, res) => {
    const { userId, eventType, metadata } = req.body;

    if (!userId || !eventType) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: userId, eventType'
        });
    }

    const auditEntry = await auditService.logAuthEvent(
        userId,
        eventType,
        metadata || {}
    );

    res.json({
        success: true,
        data: auditEntry,
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   GET /api/audit/statistics
 * @desc    Get audit statistics
 * @access  Public
 */
router.get('/statistics', asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;

    const logs = await auditService.getAuditTrail({
        start_date,
        end_date,
        limit: 10000
    });

    const statistics = auditService.generateStatistics(logs);

    res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   GET /api/audit/action-types
 * @desc    Get breakdown by action type
 * @access  Public
 */
router.get('/action-types', asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;

    const logs = await auditService.getAuditTrail({
        start_date,
        end_date,
        limit: 10000
    });

    const actionBreakdown = auditService.groupByActionType(logs);

    // Format for response
    const formatted = Object.entries(actionBreakdown).map(([type, entries]) => ({
        action_type: type,
        count: entries.length,
        success_count: entries.filter(e => e.status === 'SUCCESS').length,
        failed_count: entries.filter(e => e.status === 'FAILED').length
    }));

    res.json({
        success: true,
        data: {
            total_types: formatted.length,
            breakdown: formatted
        },
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   GET /api/audit/user-activity
 * @desc    Get user activity summary
 * @access  Public
 */
router.get('/user-activity', asyncHandler(async (req, res) => {
    const { start_date, end_date, limit = 100 } = req.query;

    const logs = await auditService.getAuditTrail({
        start_date,
        end_date,
        limit: parseInt(limit) * 10
    });

    const userActivity = auditService.groupByUser(logs);

    // Sort by total actions
    const sorted = Object.values(userActivity)
        .sort((a, b) => b.total_actions - a.total_actions)
        .slice(0, parseInt(limit));

    res.json({
        success: true,
        data: {
            total_users: Object.keys(userActivity).length,
            users: sorted
        },
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   GET /api/audit/anomalies
 * @desc    Get detected anomalies
 * @access  Public
 */
router.get('/anomalies', asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;

    const logs = await auditService.getAuditTrail({
        start_date,
        end_date,
        limit: 10000
    });

    const anomalies = auditService.identifyAnomalies(logs);

    res.json({
        success: true,
        data: {
            count: anomalies.length,
            anomalies
        },
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   GET /api/audit/export
 * @desc    Export audit logs
 * @access  Public
 */
router.get('/export', asyncHandler(async (req, res) => {
    const {
        user_id,
        action_type,
        start_date,
        end_date,
        format = 'json'
    } = req.query;

    const logs = await auditService.getAuditTrail({
        user_id,
        action_type,
        start_date,
        end_date,
        limit: 10000
    });

    if (format === 'csv') {
        // Convert to CSV
        const csv = convertToCSV(logs);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
        res.send(csv);
    } else {
        // Return JSON
        res.json({
            success: true,
            data: {
                count: logs.length,
                logs
            },
            timestamp: new Date().toISOString()
        });
    }
}));

/**
 * @route   GET /api/audit/entry/:id
 * @desc    Get specific audit entry by ID
 * @access  Public
 */
router.get('/entry/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Try cache first
    let entry = auditService.getCachedEntry(id);

    if (!entry) {
        // Query from storage
        const results = await auditService.getAuditTrail({ limit: 1000 });
        entry = results.find(e => e.id === id);
    }

    if (!entry) {
        return res.status(404).json({
            success: false,
            error: 'Audit entry not found'
        });
    }

    res.json({
        success: true,
        data: entry,
        timestamp: new Date().toISOString()
    });
}));

/**
 * Helper: Convert logs to CSV
 */
function convertToCSV(logs) {
    if (logs.length === 0) return '';

    const headers = [
        'ID',
        'Timestamp',
        'Action Type',
        'Entity Type',
        'Entity ID',
        'User ID',
        'Status',
        'IP Address'
    ];

    const rows = logs.map(log => [
        log.id,
        log.timestamp,
        log.action_type,
        log.entity_type,
        log.entity_id,
        log.user_id,
        log.status,
        log.ip_address
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
}

module.exports = router;
