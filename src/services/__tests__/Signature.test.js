const SignatureService = require('../x402/SignatureService');
const BlockchainService = require('../blockchain/BlockchainService');

// Mock BlockchainService
jest.mock('../blockchain/BlockchainService');

action: 'transfer',
    amount: '1.0',
        recipient: '0xrecipient',
            nonce: 123
            };
amount: '1.0',
    recipient: '0xrecipient',
        nonce: 123,
            timestamp: 1000,
                { type: 'call', target: '0xcontract', data: '0xdata' }
        ];

const result = await SignatureService.createSingleTxSignature(actions);

expect(result.signature).toBeDefined();
expect(result.payload.actions).toHaveLength(2);
    });
});

describe('signContractCall', () => {
    it('should sign contract call', async () => {
        const result = await SignatureService.signContractCall(
            '0xcontract',
            'transfer',
            ['0xto', '100']
        );

        expect(result.signature).toBeDefined();
        expect(result.payload.method).toBe('transfer');
    });
});

describe('decodeSignature', () => {
    it('should decode signature components', () => {
        const sig = '0x' + 'r'.repeat(64) + 's'.repeat(64) + 'v'.repeat(2);
        const result = SignatureService.decodeSignature(sig);

        expect(result).toHaveProperty('r');
        expect(result).toHaveProperty('s');
        expect(result).toHaveProperty('v');
    });
});

describe('verifyExpiration', () => {
    it('should return true for future expiration', () => {
        const payload = { expires: Math.floor(Date.now() / 1000) + 1000 };
        expect(SignatureService.verifyExpiration(payload)).toBe(true);
    });

    it('should return false for past expiration', () => {
        const payload = { expires: Math.floor(Date.now() / 1000) - 1000 };
        expect(SignatureService.verifyExpiration(payload)).toBe(false);
    });
});

describe('verifyNonce', () => {
    it('should verify positive nonce', () => {
        expect(SignatureService.verifyNonce('user1', 123)).toBe(true);
    });

    it('should reject zero or negative nonce', () => {
        expect(SignatureService.verifyNonce('user1', 0)).toBe(false);
        expect(SignatureService.verifyNonce('user1', -1)).toBe(false);
    });
});
});
