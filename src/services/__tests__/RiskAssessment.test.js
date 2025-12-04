const RiskAssessmentService = require('../risk/RiskAssessmentService');
const BlockchainService = require('../blockchain/BlockchainService');
const MembaseService = require('../memory/MembaseService');

// Mock dependencies
jest.mock('../blockchain/BlockchainService');
jest.mock('../memory/MembaseService');
jest.mock('../x402/PolicyService', () => ({
    getDailyTransactionCount: jest.fn()
}));

describe('Risk Assessment Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        RiskAssessmentService.gasHistory = [];
        RiskAssessmentService.knownBadAddresses = new Set(['0x0000000000000000000000000000000000000000']);
    });

    describe('assessTransaction', () => {
        it('should assess a safe transaction as LOW risk', async () => {
            const mockTx = {
                amount: '0.1',
                user_id: 'user1',
                recipient: '0x123',
                from: '0x456',
                gas_estimate: { gas_price_gwei: '5', estimated_cost_wei: '1000' }
            };

            BlockchainService.getGasPrice.mockResolvedValue({ gwei: '5' });
            MembaseService.queryMemory.mockResolvedValue([]); // No history
            BlockchainService.getWeb3.mockReturnValue({
                utils: { toWei: jest.fn().mockReturnValue('100000000000000000'), fromWei: jest.fn().mockReturnValue('0.1') }
            });
            BlockchainService.getBalance.mockResolvedValue({ balance_wei: '1000000000000000000', balance_bnb: '1.0' });
            require('../x402/PolicyService').getDailyTransactionCount.mockResolvedValue(10);

            const result = await RiskAssessmentService.assessTransaction(mockTx);

            expect(result.risk_level).toBe('LOW');
            expect(result.can_execute).toBe(true);
        });

        it('should assess a critical risk transaction', async () => {
            const mockTx = {
                amount: '0.1',
                user_id: 'user1',
                recipient: '0x0000000000000000000000000000000000000000', // Bad address
                from: '0x456',
                gas_estimate: { gas_price_gwei: '5' }
            };

            const result = await RiskAssessmentService.assessTransaction(mockTx);

            expect(result.risk_level).toBe('CRITICAL');
            expect(result.can_execute).toBe(false);
        });
    });

    describe('checkGasPrice', () => {
        it('should detect high gas price', async () => {
            BlockchainService.getGasPrice.mockResolvedValue({ gwei: '5' });
            RiskAssessmentService.gasHistory = [5, 5, 5]; // Avg 5

            const gasEstimate = { gas_price_gwei: '10' }; // 10 > 5 * 1.5

            const risk = await RiskAssessmentService.checkGasPrice(gasEstimate);

            expect(risk).not.toBeNull();
            expect(risk.type).toBe('high_gas_price');
        });
    });

    describe('checkAmount', () => {
        it('should detect unusual amount', async () => {
            const history = [
                { amount: '0.1' },
                { amount: '0.1' }
            ];
            MembaseService.queryMemory.mockResolvedValue(history);

            const risk = await RiskAssessmentService.checkAmount('1.0', 'user1'); // 1.0 > 0.1 * 2

            expect(risk).not.toBeNull();
            expect(risk.type).toBe('unusual_amount');
        });
    });

    describe('checkBalance', () => {
        it('should detect insufficient balance', async () => {
            BlockchainService.getWeb3.mockReturnValue({
                utils: {
                    toWei: jest.fn().mockReturnValue('1000000000000000000'), // 1 BNB
                    fromWei: jest.fn().mockReturnValue('1.0')
                }
            });
            BlockchainService.getBalance.mockResolvedValue({ balance_wei: '500000000000000000', balance_bnb: '0.5' }); // 0.5 BNB

            const risk = await RiskAssessmentService.checkBalance('0x123', '1.0', { estimated_cost_wei: '0' });

            expect(risk).not.toBeNull();
            expect(risk.type).toBe('insufficient_balance');
        });
    });

    describe('checkTransactionFrequency', () => {
        it('should detect high frequency', async () => {
            require('../x402/PolicyService').getDailyTransactionCount.mockResolvedValue(51);

            const risk = await RiskAssessmentService.checkTransactionFrequency('user1');

            expect(risk).not.toBeNull();
            expect(risk.type).toBe('high_frequency');
        });
    });

    describe('checkSuspiciousPatterns', () => {
        it('should detect round numbers', async () => {
            const risks = await RiskAssessmentService.checkSuspiciousPatterns({ amount: '100' });
            expect(risks).toHaveLength(1);
            expect(risks[0].type).toBe('round_number');
        });
    });
});
