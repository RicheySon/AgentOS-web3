const request = require('supertest');
const express = require('express');
const x402Router = require('../x402');

jest.mock('../../services/x402/PaymentService');
jest.mock('../../services/x402/PolicyService');
jest.mock('../../services/x402/SignatureService');

const app = express();
app.use(express.json());
app.use('/api', x402Router);

app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        success: false,
        error: err.message
    });
});

describe('x402 Payment Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/payment/prepare', () => {
        it('should prepare payment', async () => {
            const PaymentService = require('../../services/x402/PaymentService');

            PaymentService.preparePayment = jest.fn().mockResolvedValue({
                success: true,
                payment: { amount: '1', recipient: '0x123' },
                gas_estimate: { gas_limit: 21000 }
            });

            const response = await request(app)
                .post('/api/payment/prepare')
                .send({
                    amount: '1',
                    recipient: '0x1234567890123456789012345678901234567890',
                    metadata: { user_id: 'user123' }
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /api/policy/set-limit', () => {
        it('should set spending limit', async () => {
            const PolicyService = require('../../services/x402/PolicyService');

            PolicyService.setSpendingLimit = jest.fn().mockResolvedValue({
                success: true,
                max_daily_spend_bnb: '10'
            });

            const response = await request(app)
                .post('/api/policy/set-limit')
                .send({
                    userId: 'user123',
                    limitBNB: '10'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });
});
