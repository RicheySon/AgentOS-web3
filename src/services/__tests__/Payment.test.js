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
        PaymentService.activeSessions = new Map();
        PaymentService.paymentNonces = new Map();
    });

    describe('initializePaymentSession', () => {
        it('should initialize a payment session', async () => {
            const result = await PaymentService.initializePaymentSession('user1', 'transfer');

            expect(result.success).toBe(true);
            expect(result.session_id).toBeDefined();
            expect(result.user_id).toBe('user1');
            expect(result.agent_action).toBe('transfer');
            expect(result.nonce).toBeGreaterThan(0);
        });

        it('should set session expiration', async () => {
            const result = await PaymentService.initializePaymentSession('user1', 'swap');

            expect(result.expires_at).toBeDefined();
            const expiresAt = new Date(result.expires_at);
            expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
        });
    });

    describe('getNextNonce', () => {
        it('should generate and increment nonce', () => {
            const nonce1 = PaymentService.getNextNonce('user1');
            const nonce2 = PaymentService.getNextNonce('user1');

            expect(nonce2).toBe(nonce1 + 1);
        });

        it('should start with random nonce for new users', () => {
            const nonce = PaymentService.getNextNonce('newuser');
            expect(nonce).toBeGreaterThan(0);
        });
    });

    describe('generateSessionId', () => {
        it('should generate unique session IDs', () => {
            const id1 = PaymentService.generateSessionId();
            const id2 = PaymentService.generateSessionId();

            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
        });
    });

    describe('getSession', () => {
        it('should retrieve active session', () => {
            const session = {
                session_id: 'test123',
                user_id: 'user1',
                status: 'active'
            };
            PaymentService.activeSessions.set('test123', session);

            const result = PaymentService.getSession('test123');

            expect(result).toEqual(session);
        });

        it('should return null for non-existent session', () => {
            const result = PaymentService.getSession('nonexistent');
            expect(result).toBeNull();
        });
    });
});
