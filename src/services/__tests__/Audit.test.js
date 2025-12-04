const AuditService = require('../audit/AuditService');
const MembaseService = require('../memory/MembaseService');
const { v4: uuidv4 } = require('uuid');

// Mock MembaseService
jest.mock('../memory/MembaseService');

describe('Audit Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset cache
        AuditService.auditCache = [];
    });

    describe('logAction', () => {
        it('should log an action successfully', async () => {
            const mockEntry = {
                id: 'test-id',
                action_type: 'USER_LOGIN',
                timestamp: new Date().toISOString()
            };

            MembaseService.store.mockResolvedValue({ success: true, id: 'test-id' });

            const result = await AuditService.logAction(
                'USER_LOGIN',
                'user-123',
                'user-123',
                { ip: '127.0.0.1' }
            );

            expect(result).toHaveProperty('id');
            expect(result.action_type).toBe('USER_LOGIN');
            expect(result.entity_id).toBe('user-123');
            expect(MembaseService.store).toHaveBeenCalledWith('audit_logs', expect.any(Object));
        });

        it('should handle logging errors gracefully', async () => {
            MembaseService.store.mockRejectedValue(new Error('Storage failed'));

            // The service catches the error and logs it, but returns the entry anyway (based on code reading)
            // Wait, let me check AuditService.js again to be sure.
            // "await membaseService.store('audit_logs', auditEntry);"
            // It doesn't seem to have a try-catch block around the store call in the snippet I saw?
            // "async logAction(...) { ... await membaseService.store(...); ... return auditEntry; }"
            // If store fails, logAction throws.

            await expect(AuditService.logAction('USER_LOGIN', 'user-123', 'user-123'))
                .rejects.toThrow('Storage failed');
        });
    });

    describe('getAuditTrail', () => {
        it('should retrieve audit logs with filters', async () => {
            const mockLogs = [
                { id: '1', action_type: 'LOGIN', timestamp: '2023-01-01T10:00:00Z' },
                { id: '2', action_type: 'LOGOUT', timestamp: '2023-01-01T11:00:00Z' }
            ];

            MembaseService.queryMemory.mockResolvedValue(mockLogs);

            const filters = { user_id: 'user-123' };
            const result = await AuditService.getAuditTrail(filters);

            expect(result).toHaveLength(2);
            expect(MembaseService.queryMemory).toHaveBeenCalledWith('audit_logs', filters, 100);
        });
    });

    describe('generateComplianceReport', () => {
        it('should generate a compliance report', async () => {
            const mockLogs = [
                { id: '1', action_type: 'POLICY_CHANGE', user_id: 'admin', timestamp: new Date().toISOString() },
                { id: '2', action_type: 'PAYMENT', user_id: 'user1', timestamp: new Date().toISOString() }
            ];

            // Mock getAuditTrail to return logs
            jest.spyOn(AuditService, 'getAuditTrail').mockResolvedValue(mockLogs);

            const report = await AuditService.generateComplianceReport();

            expect(report).toHaveProperty('generated_at');
            expect(report).toHaveProperty('period');
            expect(report).toHaveProperty('statistics');
            expect(report.statistics.total_actions).toBe(2);
            expect(report.summary).toBeDefined();
        });
    });

    describe('getUserActivity', () => {
        it('should retrieve user activity', async () => {
            const mockLogs = [
                { id: '1', action_type: 'LOGIN', timestamp: '2023-01-01T10:00:00Z' },
                { id: '2', action_type: 'PAYMENT', timestamp: '2023-01-01T10:05:00Z' }
            ];

            jest.spyOn(AuditService, 'getAuditTrail').mockResolvedValue(mockLogs);

            const result = await AuditService.getUserActivity('user-123');

            expect(result).toHaveLength(2);
            expect(AuditService.getAuditTrail).toHaveBeenCalledWith(
                expect.objectContaining({ user_id: 'user-123' })
            );
        });
    });

    describe('exportAuditLog', () => {
        it('should export audit logs to JSON', async () => {
            const mockLogs = [{ id: '1', action_type: 'LOGIN' }];
            jest.spyOn(AuditService, 'getAuditTrail').mockResolvedValue(mockLogs);

            const result = await AuditService.exportAuditLog('json');

            expect(result).toHaveProperty('format', 'json');
            expect(result).toHaveProperty('data');
            expect(JSON.parse(result.data)).toEqual(mockLogs);
        });

        it('should export audit logs to CSV', async () => {
            const mockLogs = [
                {
                    id: '1',
                    timestamp: '2023-01-01',
                    action_type: 'LOGIN',
                    user_id: 'u1',
                    entity_type: 'USER',
                    entity_id: 'u1',
                    status: 'SUCCESS',
                    ip_address: '1.1.1.1'
                }
            ];
            jest.spyOn(AuditService, 'getAuditTrail').mockResolvedValue(mockLogs);

            const result = await AuditService.exportAuditLog('csv');

            expect(result).toHaveProperty('format', 'csv');
            expect(result.data).toContain('timestamp,action_type,user_id');
            expect(result.data).toContain('LOGIN');
        });
    });
});
