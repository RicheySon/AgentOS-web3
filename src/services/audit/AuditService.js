const membaseService = require('../memory/MembaseService');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AuditService {
    constructor() {
        this.auditLogs = new Map(); // In-memory cache for recent logs
        this.maxCacheSize = 1000;
    }

    /**
     * Log action
     * @param {string} actionType - Type of action
     * @param {string} entityId - Entity identifier
     * @param {string} userId - User identifier
     * @param {Object} changes - Changes made
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Audit entry
     */
    async logAction(actionType, entityId, userId, changes = {}, metadata = {}) {
        try {
            const auditEntry = {
                id: uuidv4(),
                timestamp: new Date().toISOString(),
                action_type: actionType,
                entity_type: this.getEntityType(actionType),
                entity_id: entityId,
                user_id: userId,
                agent_id: metadata.agent_id || process.env.BNB_WALLET_ADDRESS,
                details: {
                    changes,
                    ...metadata
                },
                ip_address: metadata.ip_address || 'unknown',
                user_agent: metadata.user_agent || 'unknown',
                status: metadata.status || 'SUCCESS',
                error_message: metadata.error_message || null
            };

            // Store in Membase
            await membaseService.store('audit_logs', auditEntry);

            // Cache recent logs
            this.cacheAuditEntry(auditEntry);

            logger.info('Action logged', {
                actionType,
                entityId,
                userId,
                status: auditEntry.status
            });

            return auditEntry;
        } catch (error) {
            logger.error('Log action error:', error.message);
            throw new Error(`Failed to log action: ${error.message}`);
        }
    }

    /**
     * Log transaction
     * @param {string} txHash - Transaction hash
     * @param {Object} details - Transaction details
     * @param {string} userId - User identifier
     * @returns {Promise<Object>} Audit entry
     */
    async logTransaction(txHash, details, userId) {
        try {
            const actionType = this.getTransactionActionType(details.action);

            const auditEntry = await this.logAction(
                actionType,
                txHash,
                userId,
                {
                    from: details.from,
                    to: details.to || details.recipient,
                    amount: details.amount,
                    token: details.token || 'BNB',
                    gas_used: details.gas_used,
                    gas_cost: details.gas_cost_bnb,
                    status: details.status
                },
                {
                    agent_id: details.agent_id,
                    block_number: details.block_number,
                    network: 'BNB Testnet',
                    chain_id: 97,
                    status: details.status === 'success' ? 'SUCCESS' : 'FAILED'
                }
            );

            logger.info('Transaction logged', { txHash, userId });

            return auditEntry;
        } catch (error) {
            logger.error('Log transaction error:', error.message);
            throw new Error(`Failed to log transaction: ${error.message}`);
        }
    }

    /**
     * Log policy change
     * @param {string} policyId - Policy identifier
     * @param {any} oldValue - Old value
     * @param {any} newValue - New value
     * @param {string} userId - User identifier
     * @returns {Promise<Object>} Audit entry
     */
    async logPolicyChange(policyId, oldValue, newValue, userId) {
        try {
            const auditEntry = await this.logAction(
                'POLICY_CHANGE',
                policyId,
                userId,
                {
                    old_value: oldValue,
                    new_value: newValue,
                    field: policyId
                },
                {
                    change_type: 'policy_update'
                }
            );

            logger.info('Policy change logged', { policyId, userId });

            return auditEntry;
        } catch (error) {
            logger.error('Log policy change error:', error.message);
            throw new Error(`Failed to log policy change: ${error.message}`);
        }
    }

    /**
     * Log authentication event
     * @param {string} userId - User identifier
     * @param {string} eventType - Auth event type (login/logout/failed)
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Audit entry
     */
    async logAuthEvent(userId, eventType, metadata = {}) {
        try {
            const auditEntry = await this.logAction(
                'AUTH',
                userId,
                userId,
                {
                    event_type: eventType,
                    timestamp: new Date().toISOString()
                },
                {
                    ...metadata,
                    status: eventType === 'failed' ? 'FAILED' : 'SUCCESS'
                }
            );

            logger.info('Auth event logged', { userId, eventType });

            return auditEntry;
        } catch (error) {
            logger.error('Log auth event error:', error.message);
            throw new Error(`Failed to log auth event: ${error.message}`);
        }
    }

    /**
     * Log address list change
     * @param {string} userId - User identifier
     * @param {string} listType - List type (allow/deny)
     * @param {string} address - Address added/removed
     * @param {string} action - Action (add/remove)
     * @returns {Promise<Object>} Audit entry
     */
    async logAddressListChange(userId, listType, address, action) {
        try {
            const actionType = listType === 'allow' ? 'ADDRESS_ALLOW' : 'ADDRESS_BLOCK';

            const auditEntry = await this.logAction(
                actionType,
                address,
                userId,
                {
                    list_type: listType,
                    address,
                    action,
                    timestamp: new Date().toISOString()
                }
            );

            logger.info('Address list change logged', { userId, listType, address, action });

            return auditEntry;
        } catch (error) {
            logger.error('Log address list change error:', error.message);
            throw new Error(`Failed to log address list change: ${error.message}`);
        }
    }

    /**
     * Get audit trail
     * @param {Object} filters - Query filters
     * @returns {Promise<Array>} Audit entries
     */
    async getAuditTrail(filters = {}) {
        try {
            const {
                user_id,
                action_type,
                entity_type,
                start_date,
                end_date,
                status,
                limit = 100
            } = filters;

            // Build query filters
            const queryFilters = {};
            if (user_id) queryFilters.user_id = user_id;
            if (action_type) queryFilters.action_type = action_type;
            if (entity_type) queryFilters.entity_type = entity_type;
            if (status) queryFilters.status = status;

            // Query from Membase
            let results = await membaseService.queryMemory('audit_logs', queryFilters, limit * 2);

            // Filter by date range if specified
            if (start_date || end_date) {
                results = results.filter(entry => {
                    const entryDate = new Date(entry.timestamp);
                    if (start_date && entryDate < new Date(start_date)) return false;
                    if (end_date && entryDate > new Date(end_date)) return false;
                    return true;
                });
            }

            // Sort by timestamp descending
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Limit results
            results = results.slice(0, limit);

            logger.info('Audit trail retrieved', {
                filters,
                count: results.length
            });

            return results;
        } catch (error) {
            logger.error('Get audit trail error:', error.message);
            throw new Error(`Failed to get audit trail: ${error.message}`);
        }
    }

    /**
     * Generate compliance report
     * @param {Object} dateRange - Date range for report
     * @returns {Promise<Object>} Compliance report
     */
    async generateComplianceReport(dateRange = {}) {
        try {
            const { start_date, end_date } = dateRange;

            // Default to last 30 days if not specified
            const endDate = end_date ? new Date(end_date) : new Date();
            const startDate = start_date
                ? new Date(start_date)
                : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Get all audit logs in range
            const logs = await this.getAuditTrail({
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                limit: 10000
            });

            // Generate statistics
            const stats = this.generateStatistics(logs);

            // Group by action type
            const actionBreakdown = this.groupByActionType(logs);

            // Group by user
            const userActivity = this.groupByUser(logs);

            // Identify anomalies
            const anomalies = this.identifyAnomalies(logs);

            // Generate summary
            const summary = this.generateSummary(logs, stats);

            const report = {
                report_id: uuidv4(),
                generated_at: new Date().toISOString(),
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
                },
                summary,
                statistics: stats,
                action_breakdown: actionBreakdown,
                user_activity: userActivity,
                anomalies,
                total_entries: logs.length
            };

            logger.info('Compliance report generated', {
                period: report.period,
                totalEntries: logs.length
            });

            return report;
        } catch (error) {
            logger.error('Generate compliance report error:', error.message);
            throw new Error(`Failed to generate compliance report: ${error.message}`);
        }
    }

    /**
     * Get user audit trail
     * @param {string} userId - User identifier
     * @param {number} limit - Result limit
     * @returns {Promise<Array>} User audit entries
     */
    async getUserAuditTrail(userId, limit = 100) {
        try {
            return await this.getAuditTrail({ user_id: userId, limit });
        } catch (error) {
            logger.error('Get user audit trail error:', error.message);
            throw new Error(`Failed to get user audit trail: ${error.message}`);
        }
    }

    /**
     * Get transaction audit details
     * @param {string} txHash - Transaction hash
     * @returns {Promise<Object|null>} Transaction audit entry
     */
    async getTransactionAudit(txHash) {
        try {
            const results = await membaseService.queryMemory(
                'audit_logs',
                { entity_id: txHash },
                1
            );

            return results.length > 0 ? results[0] : null;
        } catch (error) {
            logger.error('Get transaction audit error:', error.message);
            throw new Error(`Failed to get transaction audit: ${error.message}`);
        }
    }

    /**
     * Generate statistics from logs
     * @param {Array} logs - Audit logs
     * @returns {Object} Statistics
     */
    generateStatistics(logs) {
        const stats = {
            total_actions: logs.length,
            successful_actions: logs.filter(l => l.status === 'SUCCESS').length,
            failed_actions: logs.filter(l => l.status === 'FAILED').length,
            unique_users: new Set(logs.map(l => l.user_id)).size,
            action_types: {},
            entity_types: {},
            daily_activity: {}
        };

        // Count by action type
        logs.forEach(log => {
            stats.action_types[log.action_type] = (stats.action_types[log.action_type] || 0) + 1;
            stats.entity_types[log.entity_type] = (stats.entity_types[log.entity_type] || 0) + 1;

            // Daily activity
            const date = log.timestamp.split('T')[0];
            stats.daily_activity[date] = (stats.daily_activity[date] || 0) + 1;
        });

        return stats;
    }

    /**
     * Group logs by action type
     * @param {Array} logs - Audit logs
     * @returns {Object} Grouped logs
     */
    groupByActionType(logs) {
        const grouped = {};

        logs.forEach(log => {
            if (!grouped[log.action_type]) {
                grouped[log.action_type] = [];
            }
            grouped[log.action_type].push(log);
        });

        return grouped;
    }

    /**
     * Group logs by user
     * @param {Array} logs - Audit logs
     * @returns {Object} User activity
     */
    groupByUser(logs) {
        const users = {};

        logs.forEach(log => {
            if (!users[log.user_id]) {
                users[log.user_id] = {
                    user_id: log.user_id,
                    total_actions: 0,
                    action_types: {},
                    first_action: log.timestamp,
                    last_action: log.timestamp
                };
            }

            const user = users[log.user_id];
            user.total_actions++;
            user.action_types[log.action_type] = (user.action_types[log.action_type] || 0) + 1;

            if (new Date(log.timestamp) < new Date(user.first_action)) {
                user.first_action = log.timestamp;
            }
            if (new Date(log.timestamp) > new Date(user.last_action)) {
                user.last_action = log.timestamp;
            }
        });

        return users;
    }

    /**
     * Identify anomalies in logs
     * @param {Array} logs - Audit logs
     * @returns {Array} Anomalies
     */
    identifyAnomalies(logs) {
        const anomalies = [];

        // Check for high failure rate
        const failedLogs = logs.filter(l => l.status === 'FAILED');
        if (failedLogs.length > logs.length * 0.1) {
            anomalies.push({
                type: 'high_failure_rate',
                severity: 'medium',
                message: `High failure rate: ${failedLogs.length}/${logs.length} (${((failedLogs.length / logs.length) * 100).toFixed(1)}%)`,
                count: failedLogs.length
            });
        }

        // Check for unusual activity patterns
        const userActivity = this.groupByUser(logs);
        Object.values(userActivity).forEach(user => {
            if (user.total_actions > 100) {
                anomalies.push({
                    type: 'high_activity',
                    severity: 'low',
                    message: `User ${user.user_id} has unusually high activity: ${user.total_actions} actions`,
                    user_id: user.user_id,
                    count: user.total_actions
                });
            }
        });

        return anomalies;
    }

    /**
     * Generate summary
     * @param {Array} logs - Audit logs
     * @param {Object} stats - Statistics
     * @returns {Object} Summary
     */
    generateSummary(logs, stats) {
        return {
            total_actions: stats.total_actions,
            success_rate: ((stats.successful_actions / stats.total_actions) * 100).toFixed(1) + '%',
            unique_users: stats.unique_users,
            most_common_action: Object.entries(stats.action_types)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
            busiest_day: Object.entries(stats.daily_activity)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        };
    }

    /**
     * Get entity type from action type
     * @param {string} actionType - Action type
     * @returns {string} Entity type
     */
    getEntityType(actionType) {
        const mapping = {
            TRANSFER: 'TRANSACTION',
            SWAP: 'TRANSACTION',
            DEPLOY: 'CONTRACT',
            CALL: 'CONTRACT',
            AUTH: 'USER',
            POLICY_CHANGE: 'POLICY',
            ADDRESS_ALLOW: 'POLICY',
            ADDRESS_BLOCK: 'POLICY'
        };
        return mapping[actionType] || 'UNKNOWN';
    }

    /**
     * Get transaction action type
     * @param {string} action - Transaction action
     * @returns {string} Action type
     */
    getTransactionActionType(action) {
        const mapping = {
            transfer: 'TRANSFER',
            swap: 'SWAP',
            deploy: 'DEPLOY',
            call: 'CALL'
        };
        return mapping[action] || 'TRANSFER';
    }

    /**
     * Cache audit entry
     * @param {Object} entry - Audit entry
     */
    cacheAuditEntry(entry) {
        this.auditLogs.set(entry.id, entry);

        // Maintain cache size
        if (this.auditLogs.size > this.maxCacheSize) {
            const firstKey = this.auditLogs.keys().next().value;
            this.auditLogs.delete(firstKey);
        }
    }

    /**
     * Get cached audit entry
     * @param {string} id - Entry ID
     * @returns {Object|null} Audit entry
     */
    getCachedEntry(id) {
        return this.auditLogs.get(id) || null;
    }
}

module.exports = new AuditService();
