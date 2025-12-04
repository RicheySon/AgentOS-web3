const request = require('supertest');
const express = require('express');
const chainGPTRouter = require('../chainGPT');
const llmService = require('../../services/chainGPT/LLMService');
const auditorService = require('../../services/chainGPT/AuditorService');
const generatorService = require('../../services/chainGPT/GeneratorService');

// Mock services
jest.mock('../../services/chainGPT/LLMService');
jest.mock('../../services/chainGPT/AuditorService');
jest.mock('../../services/chainGPT/GeneratorService');

const app = express();
app.use(express.json());
app.use('/api/chaingpt', chainGPTRouter);

describe('ChainGPT Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/chaingpt/chat', () => {
        it('should process chat request', async () => {
            const mockResponse = { response: 'Hello', tokens_used: 10 };
            llmService.chat.mockResolvedValue(mockResponse);

            const res = await request(app)
                .post('/api/chaingpt/chat')
                .send({ message: 'Hello' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('POST /api/chaingpt/audit', () => {
        it('should audit contract', async () => {
            const mockAudit = { risk_level: 'LOW', vulnerabilities: [] };
            auditorService.auditContract.mockResolvedValue(mockAudit);

            const res = await request(app)
                .post('/api/chaingpt/audit')
                .send({ contractCode: 'contract Test {}' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('POST /api/chaingpt/generate', () => {
        it('should generate contract', async () => {
            const mockContract = { contract_code: 'contract Token {}' };
            generatorService.generateERC20.mockResolvedValue(mockContract);

            const res = await request(app)
                .post('/api/chaingpt/generate')
                .send({ type: 'ERC20', params: {} });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
