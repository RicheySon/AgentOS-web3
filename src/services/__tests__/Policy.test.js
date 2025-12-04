const PolicyService = require('../x402/PolicyService');
const MembaseService = require('../memory/MembaseService');
const BlockchainService = require('../blockchain/BlockchainService');

// Mock dependencies
jest.mock('../memory/MembaseService');
jest.mock('../blockchain/BlockchainService');

describe('Policy Service', () => {
    const mockWeb3 = {
        utils: {
            toWei: jest.fn((val) => (parseFloat(val) * 1e18).toString()),
            fromWei: jest.fn((val) => (parseFloat(val) / 1e18).toString())
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        BlockchainService.getWeb3.mockReturnValue(mockWeb3);
        PolicyService.dailyTracking = new Map();
    });

    describe('checkPolicyCompliance', () => {
        it('should approve transaction if no policies violated', async () => {
            const mockTx = {
                amount: '0.1',
                recipient: '0x123',
                action: 'transfer'
            };

            MembaseService.getUserPreferences.mockResolvedValue({});

            const result = await PolicyService.checkPolicyCompliance(mockTx, 'user1');

            expect(result.compliant).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it('should reject if single tx limit exceeded', async () => {
            const mockTx = {
                amount: '2.0',
                recipient: '0x123',
                action: 'transfer'
            };

            MembaseService.getUserPreferences.mockResolvedValue({
                payment_policy: {
                    max_single_tx: '100000000000000000', // 0.1 BNB
                    max_daily_spend: '10000000000000000000'
                }
            });

            const result = await PolicyService.checkPolicyCompliance(mockTx, 'user1');

            expect(result.compliant).toBe(false);
            expect(result.violations.length).toBeGreaterThan(0);
        });

        it('should check allowed addresses', async () => {
            const mockTx = {
                amount: '0.1',
                recipient: '0xnew',
                action: 'transfer'
            };

            MembaseService.getUserPreferences.mockResolvedValue({
                payment_policy: {
                    allowed_addresses: ['0xallowed'],
                    max_single_tx: '10000000000000000000',
                    max_daily_spend: '10000000000000000000'
                }
            });

            const result = await PolicyService.checkPolicyCompliance(mockTx, 'user1');

            expect(result.compliant).toBe(false);
            expect(result.violations.some(v => v.includes('allowlist'))).toBe(true);
        });

        it('should check denied addresses', async () => {
            const mockTx = {
                amount: '0.1',
                recipient: '0xdenied',
                action: 'transfer'
            };

            MembaseService.getUserPreferences.mockResolvedValue({
                payment_policy: {
                    denied_addresses: ['0xdenied'],
                    max_single_tx: '10000000000000000000',
                    max_daily_spend: '10000000000000000000'
                }
            });

            const result = await PolicyService.checkPolicyCompliance(mockTx, 'user1');

            expect(result.compliant).toBe(false);
            expect(result.violations.some(v => v.includes('denylist'))).toBe(true);
        });
    });

    describe('getDailyTransactionCount', () => {
        it('should return daily transaction count', async () => {
            const today = PolicyService.getTodayKey();
            const trackingKey = `user1:${today}`;
            PolicyService.dailyTracking.set(trackingKey, { tx_count: 5 });

            const count = await PolicyService.getDailyTransactionCount('user1');

            expect(count).toBe(5);
        });

        it('should return 0 for users with no transactions', async () => {
            const count = await PolicyService.getDailyTransactionCount('newuser');
            expect(count).toBe(0);
        });
    });

    describe('setSpendingLimit', () => {
        it('should set spending limit', async () => {
            MembaseService.getUserPreferences.mockResolvedValue({});
            MembaseService.storeUserPreference.mockResolvedValue({ success: true });

            const result = await PolicyService.setSpendingLimit('user1', '5.0');

            expect(result.success).toBe(true);
            expect(result.max_daily_spend_bnb).toBe('5.0');
        });
    });

    describe('recordPayment', () => {
        it('should record payment in daily tracking', async () => {
            const payment = {
                amount: '0.5',
                recipient: '0xrecipient',
                action: 'transfer'
            };

            await PolicyService.recordPayment('user1', payment);

            const today = PolicyService.getTodayKey();
            const trackingKey = `user1:${today}`;
            const tracking = PolicyService.dailyTracking.get(trackingKey);

            expect(tracking).toBeDefined();
            expect(tracking.tx_count).toBe(1);
            expect(tracking.payments).toHaveLength(1);
        });
    });

    describe('getPolicy', () => {
        it('should return default policy if none exists', async () => {
            MembaseService.getUserPreferences.mockResolvedValue({});

            const policy = await PolicyService.getPolicy('user1');

            expect(policy).toHaveProperty('max_daily_spend');
            expect(policy).toHaveProperty('max_single_tx');
        });
    });
});
