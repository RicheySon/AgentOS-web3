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
        PolicyService.policies = new Map();
    });

    describe('getDefaultPolicy', () => {
        it('should return default policy', () => {
            const policy = PolicyService.getDefaultPolicy();

            expect(policy).toHaveProperty('max_daily_spend');
            expect(policy).toHaveProperty('max_single_tx');
            expect(policy).toHaveProperty('daily_tx_limit');
            expect(policy.daily_tx_limit).toBe(100);
        });
    });

    describe('storePolicy', () => {
        it('should store policy successfully', async () => {
            MembaseService.storeUserPreference.mockResolvedValue({ success: true });

            const policy = { max_daily_spend: '5000000000000000000' };
            const result = await PolicyService.storePolicy('user1', policy);

            expect(result.success).toBe(true);
            expect(result.policy).toEqual(policy);
            expect(MembaseService.storeUserPreference).toHaveBeenCalledWith('user1', 'payment_policy', policy);
        });
    });

    describe('getPolicy', () => {
        it('should return cached policy if available', async () => {
            const mockPolicy = { max_daily_spend: '1000000000000000000' };
            PolicyService.policies.set('user1', mockPolicy);

            const policy = await PolicyService.getPolicy('user1');

            expect(policy).toBe(mockPolicy);
            expect(MembaseService.getUserPreferences).not.toHaveBeenCalled();
        });

        it('should fetch and cache policy from storage', async () => {
            const mockPolicy = { max_daily_spend: '2000000000000000000' };
            MembaseService.getUserPreferences.mockResolvedValue({ payment_policy: mockPolicy });

            const policy = await PolicyService.getPolicy('user1');

            expect(policy).toEqual(mockPolicy);
            expect(PolicyService.policies.has('user1')).toBe(true);
        });

        it('should return default policy if none exists', async () => {
            MembaseService.getUserPreferences.mockResolvedValue({});

            const policy = await PolicyService.getPolicy('user1');

            expect(policy).toHaveProperty('max_daily_spend');
            expect(policy).toHaveProperty('daily_tx_limit');
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

    describe('getDailySpending', () => {
        it('should return daily spending', async () => {
            const today = PolicyService.getTodayKey();
            const trackingKey = `user1:${today}`;
            PolicyService.dailyTracking.set(trackingKey, { spent_wei: '500000000000000000' });

            const spent = await PolicyService.getDailySpending('user1');

            expect(spent).toBe('500000000000000000');
        });

        it('should return 0 for users with no spending', async () => {
            const spent = await PolicyService.getDailySpending('newuser');
            expect(spent).toBe('0');
        });
    });

    describe('getTodayKey', () => {
        it('should return today date key', () => {
            const key = PolicyService.getTodayKey();
            const today = new Date();
            const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            expect(key).toBe(expected);
        });
    });

    describe('setSpendingLimit', () => {
        it('should set spending limit', async () => {
            MembaseService.getUserPreferences.mockResolvedValue({});
            MembaseService.storeUserPreference.mockResolvedValue({ success: true });

            const result = await PolicyService.setSpendingLimit('user1', '5.0');

            expect(result.success).toBe(true);
            expect(result.max_daily_spend_bnb).toBe('5.0');
            expect(mockWeb3.utils.toWei).toHaveBeenCalledWith('5.0', 'ether');
        });
    });

    describe('clearOldTracking', () => {
        it('should clear old tracking data', () => {
            const today = PolicyService.getTodayKey();
            PolicyService.dailyTracking.set(`user1:${today}`, { tx_count: 5 });
            PolicyService.dailyTracking.set('user1:2020-01-01', { tx_count: 10 });

            PolicyService.clearOldTracking();

            expect(PolicyService.dailyTracking.has(`user1:${today}`)).toBe(true);
            expect(PolicyService.dailyTracking.has('user1:2020-01-01')).toBe(false);
        });
    });

    describe('recordTransaction', () => {
        it('should record transaction in daily tracking', async () => {
            const payment = {
                amount: '0.5',
                user: 'user1'
            };

            await PolicyService.recordPayment('user1', payment);

            const today = PolicyService.getTodayKey();
            const trackingKey = `user1:${today}`;
            const tracking = PolicyService.dailyTracking.get(trackingKey);

            expect(tracking).toBeDefined();
            expect(tracking.tx_count).toBeGreaterThan(0);
        });
    });
});
