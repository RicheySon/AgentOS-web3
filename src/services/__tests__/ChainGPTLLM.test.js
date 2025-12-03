const axios = require('axios');
const LLMService = require('../chainGPT/LLMService');

jest.mock('axios');

describe('ChainGPT LLM Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        LLMService.cache.clear();
    });

    describe('chat', () => {
        it('should successfully make a chat request', async () => {
            const mockResponse = {
                data: {
                    response: 'This is a test response',
                    model: 'gpt-4',
                    tokens_used: 50
                }
            };

            axios.post.mockResolvedValue(mockResponse);

            const result = await LLMService.chat('Hello, how are you?');

            expect(result).toEqual(mockResponse.data);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/chat'),
                expect.objectContaining({
                    prompt: 'Hello, how are you?'
                }),
                expect.any(Object)
            );
        });

        it('should handle API errors gracefully', async () => {
            axios.post.mockRejectedValue(new Error('API Error'));

            const result = await LLMService.chat('Test prompt');

            expect(result).toHaveProperty('error');
            expect(result.response).toContain('temporarily unavailable');
        });

        it('should handle rate limiting (429)', async () => {
            const error = new Error('Rate limited');
            error.response = { status: 429 };
            axios.post.mockRejectedValue(error);

            const result = await LLMService.chat('Test prompt');

            expect(result).toHaveProperty('error');
            expect(result.response).toContain('rate limit');
        });

        it('should use cache for repeated requests', async () => {
            const mockResponse = {
                data: { response: 'Cached response' }
            };

            axios.post.mockResolvedValue(mockResponse);

            // First call
            await LLMService.chat('Same prompt');

            // Second call (should use cache)
            const result = await LLMService.chat('Same prompt');

            expect(axios.post).toHaveBeenCalledTimes(1);
            expect(result.response).toBe('Cached response');
        });
    });

    describe('analyzeContract', () => {
        it('should analyze smart contract code', async () => {
            const mockResponse = {
                data: {
                    analysis: {
                        functionality: 'ERC20 token',
                        security_issues: [],
                        gas_optimization: ['Use immutable for constants'],
                        quality_score: 85
                    }
                }
            };

            axios.post.mockResolvedValue(mockResponse);

            const contractCode = 'pragma solidity ^0.8.0; contract Token {}';
            const result = await LLMService.analyzeContract(contractCode);

            expect(result).toHaveProperty('functionality');
            expect(result).toHaveProperty('security_issues');
            expect(result.quality_score).toBe(85);
        });

        it('should handle empty contract code', async () => {
            await expect(LLMService.analyzeContract('')).rejects.toThrow('Contract code is required');
        });
    });

    describe('generateSmartContract', () => {
        it('should generate smart contract from description', async () => {
            const mockResponse = {
                data: {
                    contract_code: 'pragma solidity ^0.8.0; contract Generated {}',
                    explanation: 'This is a generated contract'
                }
            };

            axios.post.mockResolvedValue(mockResponse);

            const result = await LLMService.generateSmartContract('Create an ERC20 token');

            expect(result).toHaveProperty('contract_code');
            expect(result).toHaveProperty('explanation');
            expect(result.contract_code).toContain('pragma solidity');
        });
    });

    describe('conversation', () => {
        it('should maintain conversation history', async () => {
            const mockResponse = {
                data: { response: 'Response to message 2' }
            };

            axios.post.mockResolvedValue(mockResponse);

            const messages = [
                { role: 'user', content: 'Message 1' },
                { role: 'assistant', content: 'Response 1' },
                { role: 'user', content: 'Message 2' }
            ];

            const result = await LLMService.conversation(messages);

            expect(result.response).toBe('Response to message 2');
            expect(axios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({ role: 'user' })
                    ])
                }),
                expect.any(Object)
            );
        });
    });

    describe('clearCache', () => {
        it('should clear the cache', () => {
            LLMService.cache.set('test-key', 'test-value');
            expect(LLMService.cache.size).toBe(1);

            LLMService.clearCache();

            expect(LLMService.cache.size).toBe(0);
        });
    });
});
