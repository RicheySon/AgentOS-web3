const PolicyService = require('../x402/PolicyService');
const MembaseService = require('../memory/MembaseService');
const BlockchainService = require('../blockchain/BlockchainService');
const SignatureService = require('../x402/SignatureService');

// Mock dependencies
jest.mock('../memory/MembaseService');
jest.mock('../blockchain/BlockchainService');
jest.mock('../x402/SignatureService');

describe('Policy Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkPolicyCompliance', () => {
        it('should approve transaction if no policies violated', async () => {
            const mockTx = {
                amount: '0.1',
                recipient: '0x123',
                action: 'transfer'
            };

            MembaseService.getUserPreferences.mockResolvedValue({});
            BlockchainService.getWeb3.mockReturnValue({
                utils: {
                    toWei: jest.fn().mockReturnValue('100000000000000000'),
                    fromWei: jest.fn().mockReturnValue('0.1')
                }
            });

            const result = await PolicyService.checkPolicyCompliance(mockTx, 'user1');

            expect(result.compliant).toBe(true);
        });

        it('should reject if single tx limit exceeded', async () => {
            const mockTx = {
                amount: '2.0',
                recipient: '0x123',
                action: 'transfer'
            };

            MembaseService.getUserPreferences.mockResolvedValue({
                'payment_policy': {
                    max_daily_spend: '10000000000000000000', // 10 BNB
                    max_single_tx: '100000000000000000' // 0.1 BNB
                }
            });
            BlockchainService.getWeb3.mockReturnValue({
                utils: {
                    toWei: jest.fn().mockReturnValue('2000000000000000000'), // 2 BNB
                    fromWei: jest.fn().mockReturnValue('0.1')
                }
            });

            // Mock daily spending to be 0
            PolicyService.dailyTracking = new Map();

            const result = await PolicyService.checkPolicyCompliance(mockTx, 'user1');

            expect(result.compliant).toBe(false);
            expect(result.violations[0]).toContain('single transaction limit');
        });
    });

    describe('getDailyTransactionCount', () => {
        it('should return daily transaction count', async () => {
            const today = PolicyService.getTodayKey();
            const trackingKey = `user1:${today}`;
            PolicyService.dailyTracking.set(trackingKey, { tx_count: 3 });

            const count = await PolicyService.getDailyTransactionCount('user1');

            expect(count).toBe(3);
        });
    });

    describe('setSpendingLimit', () => {
        it('should set spending limit', async () => {
            MembaseService.getUserPreferences.mockResolvedValue({});
            MembaseService.storeUserPreference.mockResolvedValue({ success: true });
            BlockchainService.getWeb3.mockReturnValue({
                utils: { toWei: jest.fn().mockReturnValue('5000000000000000000') }
            });

            const result = await PolicyService.setSpendingLimit('user1', '5.0');

            expect(result.success).toBe(true);
            expect(result.max_daily_spend_bnb).toBe('5.0');
        });
    });
});
