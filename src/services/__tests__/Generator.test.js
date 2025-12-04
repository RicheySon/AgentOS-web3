const GeneratorService = require('../chainGPT/GeneratorService');
const LLMService = require('../chainGPT/LLMService');

// Mock LLMService
jest.mock('../chainGPT/LLMService');

describe('Generator Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateERC20', () => {
        it('should generate ERC20 token contract', async () => {
            const mockResponse = {
                response: '```solidity\ncontract MyToken {}\n```',
                tokens_used: 500,
                model_used: 'gpt-4'
            };

            LLMService.chat.mockResolvedValue(mockResponse);

            const params = {
                name: 'TestToken',
                symbol: 'TST',
                decimals: 18,
                totalSupply: '1000000',
                mintable: true,
                burnable: false
            };

            const result = await GeneratorService.generateERC20(params);

            expect(result.contract_code).toBeDefined();
            expect(result.abi).toBeInstanceOf(Array);
            expect(result.token_info.name).toBe('TestToken');
            expect(result.constructor_params).toBeDefined();
            expect(LLMService.chat).toHaveBeenCalled();
        });

        it('should handle generation errors', async () => {
            LLMService.chat.mockRejectedValue(new Error('API error'));

            await expect(GeneratorService.generateERC20({}))
                .rejects.toThrow('Failed to generate ERC20 contract');
        });
    });

    describe('generateERC721', () => {
        it('should generate ERC721 NFT contract', async () => {
            const mockResponse = {
                response: '```solidity\ncontract MyNFT {}\n```',
                tokens_used: 600,
                model_used: 'gpt-4'
            };

            LLMService.chat.mockResolvedValue(mockResponse);

            const params = {
                name: 'TestNFT',
                symbol: 'TNFT',
                baseURI: 'ipfs://',
                maxSupply: '10000'
            };

            const result = await GeneratorService.generateERC721(params);

            expect(result.contract_code).toBeDefined();
            expect(result.abi).toBeInstanceOf(Array);
            expect(result.nft_info.name).toBe('TestNFT');
            expect(result.tokens_used).toBe(600);
        });
    });

    describe('generateSwapContract', () => {
        it('should generate token swap contract', async () => {
            const mockResponse = {
                response: 'contract Swap {}',
                tokens_used: 700,
                model_used: 'gpt-4'
            };

            LLMService.chat.mockResolvedValue(mockResponse);

            const result = await GeneratorService.generateSwapContract('USDT', 'BNB');

            expect(result.contract_code).toBe('contract Swap {}');
            expect(result.swap_info.fromToken).toBe('USDT');
            expect(result.swap_info.toToken).toBe('BNB');
        });
    });

    describe('generateTransferContract', () => {
        it('should generate transfer contract', async () => {
            const mockResponse = {
                response: 'contract Transfer {}',
                tokens_used: 400,
                model_used: 'gpt-4'
            };

            LLMService.chat.mockResolvedValue(mockResponse);

            const result = await GeneratorService.generateTransferContract();

            expect(result.contract_code).toBe('contract Transfer {}');
            expect(result.contract_info.type).toBe('transfer_contract');
            expect(result.abi).toBeDefined();
        });
    });

    describe('extractCode', () => {
        it('should extract code from markdown', () => {
            const input = '```solidity\ncontract Test {}\n```';
            const result = GeneratorService.extractCode(input);
            expect(result).toBe('contract Test {}');
        });

        it('should handle plain code', () => {
            const input = 'contract Test {}';
            const result = GeneratorService.extractCode(input);
            expect(result).toBe('contract Test {}');
        });
    });

    describe('generateERC20ABI', () => {
        it('should generate standard ERC20 ABI', () => {
            const abi = GeneratorService.generateERC20ABI({});
            expect(abi).toBeInstanceOf(Array);
            expect(abi.some(item => item.name === 'transfer')).toBe(true);
        });

        it('should include mint function for mintable tokens', () => {
            const abi = GeneratorService.generateERC20ABI({ mintable: true });
            expect(abi.some(item => item.name === 'mint')).toBe(true);
        });

        it('should include burn function for burnable tokens', () => {
            const abi = GeneratorService.generateERC20ABI({ burnable: true });
            expect(abi.some(item => item.name === 'burn')).toBe(true);
        });
    });
});
