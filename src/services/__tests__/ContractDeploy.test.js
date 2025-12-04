const ContractDeployService = require('../blockchain/ContractDeployService');
const BlockchainService = require('../blockchain/BlockchainService');

// Mock dependencies
jest.mock('../blockchain/BlockchainService');

describe('ContractDeployService', () => {
    let mockWeb3;
    let mockContract;
    let mockDeploy;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Web3 structure
        mockDeploy = {
            estimateGas: jest.fn().mockResolvedValue(2000000),
            encodeABI: jest.fn().mockReturnValue('0xencodedABI')
        };

        mockContract = {
            deploy: jest.fn().mockReturnValue(mockDeploy)
        };

        mockWeb3 = {
            eth: {
                Contract: jest.fn().mockReturnValue(mockContract),
                accounts: {
                    signTransaction: jest.fn().mockResolvedValue({
                        rawTransaction: '0xrawTx'
                    })
                },
                sendSignedTransaction: jest.fn().mockResolvedValue({
                    status: true,
                    contractAddress: '0xdeployedAddress',
                    transactionHash: '0xhash',
                    blockNumber: 12345,
                    from: '0xdeployer',
                    gasUsed: 1500000
                }),
                getTransactionCount: jest.fn().mockResolvedValue(10),
                getCode: jest.fn().mockResolvedValue('0xbytecode'),
                getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
                getBlockNumber: jest.fn().mockResolvedValue(12345)
            },
            utils: {
                fromWei: jest.fn((val) => (parseFloat(val) / 1e18).toString()),
                toWei: jest.fn((val) => (parseFloat(val) * 1e18).toString())
            }
        };

        BlockchainService.getWeb3.mockReturnValue(mockWeb3);
        BlockchainService.getAccount.mockReturnValue({
            address: '0xdeployer',
            privateKey: '0xkey'
        });
        BlockchainService.getGasPrice.mockResolvedValue({
            wei: '5000000000',
            gwei: '5'
        });
        BlockchainService.validateAddress.mockReturnValue(true);
        BlockchainService.chainId = 56;

        // Re-initialize service to get fresh mockWeb3
        // Since ContractDeployService is a singleton instantiated on require, 
        // we might need to manually update its web3 property if it caches it in constructor.
        // Looking at the code: constructor() { this.web3 = blockchainService.getWeb3(); }
        // So we need to update it.
        ContractDeployService.web3 = mockWeb3;
    });

    describe('deployContract', () => {
        const bytecode = '0x123456';
        const abi = [];

        it('should deploy contract successfully', async () => {
            const result = await ContractDeployService.deployContract(bytecode, abi);

            expect(result.status).toBe('success');
            expect(result.contract_address).toBe('0xdeployedAddress');
            expect(result.tx_hash).toBe('0xhash');
            expect(mockWeb3.eth.Contract).toHaveBeenCalledWith(abi);
            expect(mockContract.deploy).toHaveBeenCalledWith({
                data: bytecode,
                arguments: []
            });
            expect(mockWeb3.eth.sendSignedTransaction).toHaveBeenCalledWith('0xrawTx');
        });

        it('should add 0x to bytecode if missing', async () => {
            await ContractDeployService.deployContract('123456', abi);

            expect(mockContract.deploy).toHaveBeenCalledWith(expect.objectContaining({
                data: '0x123456'
            }));
        });

        it('should use provided gas limit', async () => {
            await ContractDeployService.deployContract(bytecode, abi, [], 5000000);

            expect(mockWeb3.eth.accounts.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ gas: '5000000' }),
                expect.any(String)
            );
        });

        it('should estimate gas if not provided', async () => {
            await ContractDeployService.deployContract(bytecode, abi);

            expect(mockDeploy.estimateGas).toHaveBeenCalled();
            // 2000000 * 1.2 = 2400000
            expect(mockWeb3.eth.accounts.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ gas: '2400000' }),
                expect.any(String)
            );
        });

        it('should use default gas if estimation fails', async () => {
            mockDeploy.estimateGas.mockRejectedValue(new Error('Estimation failed'));

            await ContractDeployService.deployContract(bytecode, abi);

            expect(mockWeb3.eth.accounts.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ gas: '3000000' }),
                expect.any(String)
            );
        });

        it('should throw error if deployment fails', async () => {
            mockWeb3.eth.sendSignedTransaction.mockResolvedValue({
                status: false,
                contractAddress: null
            });

            await expect(ContractDeployService.deployContract(bytecode, abi))
                .rejects.toThrow('Contract deployment failed');
        });
    });

    describe('verifyDeployment', () => {
        it('should verify deployed contract', async () => {
            const result = await ContractDeployService.verifyDeployment('0xcontract');

            expect(result.is_deployed).toBe(true);
            expect(result.contract_address).toBe('0xcontract');
            expect(result.code_size).toBeGreaterThan(2);
            expect(result.balance_bnb).toBe('1');
        });

        it('should throw error for invalid address', async () => {
            BlockchainService.validateAddress.mockReturnValue(false);

            await expect(ContractDeployService.verifyDeployment('invalid'))
                .rejects.toThrow('Invalid contract address format');
        });

        it('should return false if no code at address', async () => {
            mockWeb3.eth.getCode.mockResolvedValue('0x');

            const result = await ContractDeployService.verifyDeployment('0xcontract');

            expect(result.is_deployed).toBe(false);
            expect(result.message).toContain('No contract found');
        });
    });

    describe('deployFromSolidity', () => {
        it('should throw not implemented error', async () => {
            await expect(ContractDeployService.deployFromSolidity('code', 'name'))
                .rejects.toThrow('Solidity compilation not implemented');
        });
    });

    describe('estimateDeploymentCost', () => {
        it('should estimate deployment cost', async () => {
            const result = await ContractDeployService.estimateDeploymentCost('0xcode', []);

            expect(result.estimated_gas).toBe('2000000');
            expect(result.estimated_cost_bnb).toBeDefined();
            expect(mockDeploy.estimateGas).toHaveBeenCalled();
        });
    });

    describe('getContractCreationTx', () => {
        it('should return placeholder message', async () => {
            const result = await ContractDeployService.getContractCreationTx('0xcontract');

            expect(result.message).toContain('requires external indexer');
        });

        it('should throw error for invalid address', async () => {
            BlockchainService.validateAddress.mockReturnValue(false);

            await expect(ContractDeployService.getContractCreationTx('invalid'))
                .rejects.toThrow('Invalid contract address format');
        });
    });

    describe('batchDeploy', () => {
        it('should deploy multiple contracts', async () => {
            const contracts = [
                { bytecode: '0x1', abi: [] },
                { bytecode: '0x2', abi: [] }
            ];

            const result = await ContractDeployService.batchDeploy(contracts);

            expect(result.successful).toBe(2);
            expect(result.failed).toBe(0);
            expect(result.results).toHaveLength(2);
        });

        it('should handle failures in batch', async () => {
            // Mock deployContract to fail for the second contract
            // We can spy on the method we are testing, but since it calls itself, 
            // we need to be careful. 
            // Actually, batchDeploy calls this.deployContract.
            // We can spy on ContractDeployService.deployContract.

            const originalDeploy = ContractDeployService.deployContract;
            ContractDeployService.deployContract = jest.fn()
                .mockResolvedValueOnce({ status: 'success' })
                .mockRejectedValueOnce(new Error('Deploy failed'));

            const contracts = [
                { bytecode: '0x1', abi: [] },
                { bytecode: '0x2', abi: [] }
            ];

            const result = await ContractDeployService.batchDeploy(contracts);

            expect(result.successful).toBe(1);
            expect(result.failed).toBe(1);
            expect(result.errors).toHaveLength(1);

            // Restore
            ContractDeployService.deployContract = originalDeploy;
        });
    });
});
