const request = require('supertest');
const express = require('express');
const healthRouter = require('../health');
const blockchainService = require('../../services/blockchain/BlockchainService');
const membaseService = require('../../services/memory/MembaseService');

// Mock services
jest.mock('../../services/blockchain/BlockchainService');
jest.mock('../../services/memory/MembaseService');

const app = express();
app.use(express.json());
app.use('/api/health', healthRouter);

describe('Health Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/health/status', () => {
        it('should return health status', async () => {
            blockchainService.isConnected = jest.fn().mockReturnValue(true);
            membaseService.getStats = jest.fn().mockReturnValue({ operations: 0 });

            const res = await request(app)
                .get('/api/health/status');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status');
        });
    });

    describe('GET /api/health/blockchain', () => {
        it('should return blockchain status', async () => {
            blockchainService.getNetworkInfo = jest.fn().mockResolvedValue({
                chainId: 97,
                blockNumber: 123456
            });

            const res = await request(app)
                .get('/api/health/blockchain');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('GET /api/health/memory', () => {
        it('should return memory status', async () => {
            membaseService.getStats = jest.fn().mockReturnValue({
                operations: 100,
                cached_items: 50
            });

            const res = await request(app)
                .get('/api/health/memory');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
