const request = require('supertest');
const express = require('express');
const memoryRouter = require('../memory');
const membaseService = require('../../services/memory/MembaseService');
const conversationManager = require('../../services/memory/ConversationManager');
const preferenceManager = require('../../services/memory/PreferenceManager');

// Mock dependencies
jest.mock('../../services/memory/MembaseService');
jest.mock('../../services/memory/ConversationManager');
jest.mock('../../services/memory/PreferenceManager');

const app = express();
app.use(express.json());
app.use('/api/memory', memoryRouter);

describe('Memory Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/memory/conversation/:agentId', () => {
        it('should retrieve conversation history', async () => {
            const mockHistory = [{ user_message: 'Hi' }];
            membaseService.getConversationHistory.mockResolvedValue(mockHistory);

            const res = await request(app)
                .get('/api/memory/conversation/agent1');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.messages).toEqual(mockHistory);
        });
    });

    describe('POST /api/memory/conversation/init', () => {
        it('should initialize conversation', async () => {
            const mockResult = { success: true, agent_id: 'agent1' };
            conversationManager.initializeConversation.mockResolvedValue(mockResult);

            const res = await request(app)
                .post('/api/memory/conversation/init')
                .send({ agentId: 'agent1', userId: 'user1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual(mockResult);
        });
    });

    describe('POST /api/memory/save-message', () => {
        it('should save message', async () => {
            const mockResult = { success: true };
            conversationManager.addMessage.mockResolvedValue(mockResult);

            const res = await request(app)
                .post('/api/memory/save-message')
                .send({ agentId: 'agent1', message: 'Hi', role: 'user' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('GET /api/memory/conversation/:agentId/context', () => {
        it('should retrieve context', async () => {
            const mockContext = [{ role: 'user', content: 'Hi' }];
            conversationManager.getContext.mockResolvedValue(mockContext);

            const res = await request(app)
                .get('/api/memory/conversation/agent1/context');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.messages).toEqual(mockContext);
        });
    });

    describe('GET /api/memory/preferences/:userId', () => {
        it('should retrieve user preferences', async () => {
            const mockPrefs = { trading: {}, defaults: {} };
            preferenceManager.getAllPreferences.mockResolvedValue(mockPrefs);

            const res = await request(app)
                .get('/api/memory/preferences/user1');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.preferences).toEqual(mockPrefs);
        });
    });

    describe('POST /api/memory/set-preference', () => {
        it('should set preference', async () => {
            const mockResult = { success: true };
            preferenceManager.setPreference.mockResolvedValue(mockResult);

            const res = await request(app)
                .post('/api/memory/set-preference')
                .send({ userId: 'user1', category: 'trading', key: 'risk', value: 'high' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('GET /api/memory/contracts', () => {
        it('should list contracts', async () => {
            const mockContracts = [{ name: 'Token', created_at: '2023' }];
            membaseService.queryMemory.mockResolvedValue(mockContracts);

            const res = await request(app)
                .get('/api/memory/contracts');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.contracts).toHaveLength(1);
        });
    });

    describe('POST /api/memory/store-contract', () => {
        it('should store contract', async () => {
            const mockResult = { success: true };
            membaseService.storeContractTemplate.mockResolvedValue(mockResult);

            const res = await request(app)
                .post('/api/memory/store-contract')
                .send({ name: 'Token', code: 'code', abi: [] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
