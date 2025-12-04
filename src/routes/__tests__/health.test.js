const request = require('supertest');
const express = require('express');
const healthRouter = require('../health');

const app = express();
app.use(express.json());
app.use('/api/health', healthRouter);

describe('Health Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/health', () => {
        it('should return health status', async () => {
            const res = await request(app)
                .get('/api/health');

            expect([200, 503]).toContain(res.status); // 200 if connected, 503 if not
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('blockchain');
        });
    });

    describe('GET /api/health/live', () => {
        it('should return liveness status', async () => {
            const res = await request(app)
                .get('/api/health/live');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('alive');
            expect(res.body.alive).toBe(true);
        });
    });

    describe('GET /api/health/ready', () => {
        it('should return readiness status', async () => {
            const res = await request(app)
                .get('/api/health/ready');

            expect([200, 503]).toContain(res.status);
            expect(res.body).toHaveProperty('ready');
        });
    });
});
