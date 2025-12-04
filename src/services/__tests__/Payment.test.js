const PaymentService = require('../x402/PaymentService');
const PolicyService = require('../x402/PolicyService');
const SignatureService = require('../x402/SignatureService');
const BlockchainService = require('../blockchain/BlockchainService');

jest.mock('../x402/PolicyService');
jest.mock('../x402/SignatureService');
jest.mock('../blockchain/BlockchainService');

describe('Payment Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        PaymentService.sessions = new Map();
        PaymentService.nonces = new Map();
    });

    describe('initializeSession', () => {
        it('should initialize a payment session', async () => {
            const result = await PaymentService.initializeSession('user1', '0xagent');

            expect(result.session_id).toBeDefined();
            expect(result.user_id).toBe('user1');
            expect(result.agent_address).toBe('0xagent');
            expect(result.nonce).toBeGreaterThan(0);
            expect(PaymentService.sessions.has(result.session_id)).toBe(true);
        });

        it('should throw error if user_id missing', async () => {
            await expect(PaymentService.initializeSession(null, '0xagent'))
                .rejects.toThrow('User ID required');
        });
    });

    describe('preparePayment', () => {
        it('should prepare payment with valid session', async () => {
            const mockSession = {
                session_id: 'session123',
                user_id: 'user1',
                agent_address: '0xagent',
                nonce: 123,
                created_at: Date.now()
            };
            PaymentService.sessions.set('session123', mockSession);

            PolicyService.checkPolicyCompliance.mockResolvedValue({
                compliant: true,
                violations: []
            });
            SignatureService.generatePaymentSignature.mockResolvedValue({
                signature: '0xsig',
                payload: {},
                message_hash: '0xhash'
            });

            const result = await PaymentService.preparePayment({
                session_id: 'session123',
                amount: '1.0',
                recipient: '0xrecipient',
                action: 'transfer'
            });

            expect(result.prepared).toBe(true);
            expect(result.signature).toBe('0xsig');
        });

        it('should reject payment if policy violated', async () => {
            const mockSession = {
                session_id: 'session123',
                user_id: 'user1',
                agent_address: '0xagent',
                nonce: 123,
                created_at: Date.now()
            };
            PaymentService.sessions.set('session123', mockSession);

            PolicyService.checkPolicyCompliance.mockResolvedValue({
                compliant: false,
                violations: ['Daily limit exceeded']
            });

            await expect(PaymentService.preparePayment({
                session_id: 'session123',
                amount: '1000.0',
                recipient: '0xrecipient',
                action: 'transfer'
            })).rejects.toThrow('Policy violation');
        });

        it('should throw error for invalid session', async () => {
            await expect(PaymentService.preparePayment({
                session_id: 'invalid',
                amount: '1.0',
                recipient: '0xrecipient',
                action: 'transfer'
            })).rejects.toThrow('Invalid session');
        });
    });

    describe('verifyPayment', () => {
        it('should verify valid payment', async () => {
            const mockPayment = {
                session_id: 'session123',
                signature: '0xsig',
                amount: '1.0',
                recipient: '0xrecipient'
            };

            PaymentService.sessions.set('session123', {
                user_id: 'user1',
                nonce: 123
            });

            SignatureService.verifySignature.mockResolvedValue(true);

            const result = await PaymentService.verifyPayment(mockPayment);

            expect(result.valid).toBe(true);
        });

        it('should reject invalid signature', async () => {
            const mockPayment = {
                session_id: 'session123',
                signature: '0xbadsig',
                amount: '1.0',
                recipient: '0xrecipient'
            };

            PaymentService.sessions.set('session123', {
                user_id: 'user1',
                nonce: 123
            });

            SignatureService.verifySignature.mockResolvedValue(false);

            const result = await PaymentService.verifyPayment(mock Payment);

            expect(result.valid).toBe(false);
        });
    });

    describe('getPaymentHistory', () => {
        it('should return payment history for user', async () => {
            const result = await PaymentService.getPaymentHistory('user1');

            expect(Array.isArray(result.payments)).toBe(true);
        });

        it('should limit results', async () => {
            const result = await PaymentService.getPaymentHistory('user1', 5);

            expect(result.limit).toBe(5);
        });
    });

    describe('generatePaymentPreview', () => {
        it('should generate payment preview', async () => {
            BlockchainService.estimateGas.mockResolvedValue({
                gas_limit: '21000',
                gas_price_gwei: '5'
            });

            const result = await PaymentService.generatePaymentPreview({
                amount: '1.0',
                recipient: '0xrecipient',
                action: 'transfer'
            });

            expect(result.amount_bnb).toBe('1.0');
            expect(result).toHaveProperty('total_cost');
        });
    });

    describe('getNonce', () => {
        it('should get and increment nonce', async () => {
            const nonce1 = await PaymentService.getNonce('user1');
            const nonce2 = await PaymentService.getNonce('user1');

            expect(nonce2).toBeGreaterThan(nonce1);
        });

        it('should start from random nonce for new users', async () => {
            const nonce = await PaymentService.getNonce('newuser');
            expect(nonce).toBeGreaterThan(0);
        });
    });

    describe('assessRisk', () => {
        it('should assess transaction risk', async () => {
            const result = await PaymentService.assessRisk({
                amount: '1.0',
                recipient: '0xrecipient'
            });

            expect(result).toHaveProperty('risk_level');
            expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.risk_level);
        });
    });

    describe('session expiration', () => {
        it('should detect expired sessions', async () => {
            const oldSession = {
                session_id: 'old123',
                user_id: 'user1',
                created_at: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
            };
            PaymentService.sessions.set('old123', oldSession);

            await expect(PaymentService.preparePayment({
                session_id: 'old123',
                amount: '1.0',
                recipient: '0xrecipient',
                action: 'transfer'
            })).rejects.toThrow(/session|expired/i);
        });
    });
});
