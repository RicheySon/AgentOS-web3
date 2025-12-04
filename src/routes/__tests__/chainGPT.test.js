const request = require('supertest');
const express = require('express');
const chainGPTRouter = require('../chainGPT');
const chainGPTController = require('../../controllers/chainGPTController');

// Mock controller
jest.mock('../../controllers/chainGPTController');

const app = express();
app.use(express.json());
app.use('/api/ai', chainGPTRouter);

describe('ChainGPT Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/ai/chat', () => {
        it('should process chat request', async () => {
            chainGPTController.chat = jest.fn((req, res) => {
                res.status(200).json({ success: true, response: 'Hello' });
            });

            const res = await request(app)
                .post('/api/ai/chat')
                .send({ prompt: 'Hello' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('POST /api/ai/audit-contract', () => {
        it('should audit contract', async () => {
            chainGPTController.auditContract = jest.fn((req, res) => {
                res.status(200).json({ success: true, riskLevel: 'LOW' });
            });

            const res = await request(app)
                .post('/api/ai/audit-contract')
                .send({ contractCode: 'contract Test {}' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('POST /api/ai/generate/erc20', () => {
        it('should generate ERC20 contract', async () => {
            chainGPTController.generateERC20 = jest.fn((req, res) => {
                res.status(200).json({ success: true, contract: 'contract Token {}' });
            });

            const res = await request(app)
                .post('/api/ai/generate/erc20')
                .send({ name: 'TestToken' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
