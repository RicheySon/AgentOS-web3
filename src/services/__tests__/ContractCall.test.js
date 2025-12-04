const ContractCallService = require('../blockchain/ContractCallService');
const BlockchainService = require('../blockchain/BlockchainService');

// Mock dependencies
jest.mock('../blockchain/BlockchainService');

describe('ContractCallService', () => {
    let mockWeb3;
    let mockContract;
    let mockMethod;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Web3 structure
        mockMethod = {
            call: jest.fn().mockResolvedValue('result'),
            estimateGas: jest.fn().mockResolvedValue(100000),
            encodeABI: jest.fn().mockReturnValue('0xencoded')
        };

        mockContract = {
            methods: {
                testMethod: jest.fn().mockReturnValue(mockMethod),
                viewMethod: jest.fn().mockReturnValue(mockMethod)
            },
            getPastEvents: jest.fn().mockResolvedValue([
                {
                    event: 'TestEvent',
                    blockNumber: 123,
                    transactionHash: '0xhash',
                    returnValues: { arg: 'val' },
                    logIndex: 0
                }
            ])
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
                    transactionHash: '0xhash',
                    blockNumber: 12345,
                    gasUsed: 100000,
                    logs: []
                }),
                getTransactionCount: jest.fn().mockResolvedValue(10),
                abi: {
                    decodeParameters: jest.fn().mockReturnValue({ param: 'value' }),
                    decodeLog: jest.fn().mockReturnValue({ arg: 'val' })
                }
            },
            utils: {
                fromWei: jest.fn((val) => (parseFloat(val) / 1e18).toString()),
                toWei: jest.fn((val) => (parseFloat(val) * 1e18).toString()),
                keccak256: jest.fn().mockReturnValue('0xhash')
            }
        };

        BlockchainService.getWeb3.mockReturnValue(mockWeb3);
        BlockchainService.getAccount.mockReturnValue({
            address: '0xsender',
            privateKey: '0xkey'
        });
        BlockchainService.getGasPrice.mockResolvedValue({
            wei: '5000000000',
            gwei: '5'
        });
        BlockchainService.validateAddress.mockReturnValue(true);
        BlockchainService.chainId = 56;

        ContractCallService.web3 = mockWeb3;
    });

    describe('callContractMethod', () => {
        it('should call contract method successfully', async () => {
            const result = await ContractCallService.callContractMethod('0xcontract', 'testMethod', [], []);

            expect(result.result).toBe('result');
            expect(result.call_type).toBe('read');
            expect(mockContract.methods.testMethod).toHaveBeenCalled();
            expect(mockMethod.call).toHaveBeenCalled();
        });

        it('should throw error for invalid address', async () => {
            BlockchainService.validateAddress.mockReturnValue(false);

            await expect(ContractCallService.callContractMethod('invalid', 'method', [], []))
                .rejects.toThrow('Invalid contract address format');
        });

        it('should throw error if method not found', async () => {
            await expect(ContractCallService.callContractMethod('0xcontract', 'unknown', [], []))
                .rejects.toThrow('Method \'unknown\' not found');
        });
    });

    describe('writeContractMethod', () => {
        it('should execute write transaction successfully', async () => {
            const result = await ContractCallService.writeContractMethod('0xcontract', 'testMethod', [], []);

            expect(result.status).toBe('success');
            expect(result.tx_hash).toBe('0xhash');
            expect(result.call_type).toBe('write');
            expect(mockWeb3.eth.sendSignedTransaction).toHaveBeenCalled();
        });

        it('should estimate gas and add buffer', async () => {
            await ContractCallService.writeContractMethod('0xcontract', 'testMethod', [], []);

            expect(mockMethod.estimateGas).toHaveBeenCalled();
            expect(mockWeb3.eth.accounts.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ gas: '120000' }), // 100000 * 1.2
                expect.any(String)
            );
        });

        it('should handle value transfer', async () => {
            await ContractCallService.writeContractMethod('0xcontract', 'testMethod', [], [], '1.0');

            expect(mockWeb3.utils.toWei).toHaveBeenCalledWith('1.0', 'ether');
        });
    });

    describe('getContractState', () => {
        it('should get contract state for specified methods', async () => {
            const result = await ContractCallService.getContractState('0xcontract', [], ['testMethod']);

            expect(result.state.testMethod).toBe('result');
            expect(result.methods_called).toBe(1);
        });

        it('should use view methods if none specified', async () => {
            const abi = [{
                type: 'function',
                name: 'viewMethod',
                stateMutability: 'view',
                inputs: []
            }];

            const result = await ContractCallService.getContractState('0xcontract', abi);

            expect(result.state.viewMethod).toBe('result');
        });

        it('should handle method errors gracefully', async () => {
            mockMethod.call.mockRejectedValue(new Error('Call failed'));

            const result = await ContractCallService.getContractState('0xcontract', [], ['testMethod']);

            expect(result.state.testMethod).toEqual({ error: 'Call failed' });
        });
    });

    describe('batchCall', () => {
        it('should execute batch calls', async () => {
            const calls = [
                { methodName: 'testMethod', params: [] },
                { methodName: 'testMethod', params: [] }
            ];

            const result = await ContractCallService.batchCall('0xcontract', calls, []);

            expect(result.successful).toBe(2);
            expect(result.results).toHaveLength(2);
        });

        it('should handle failures in batch', async () => {
            // Spy on callContractMethod
            const originalCall = ContractCallService.callContractMethod;
            ContractCallService.callContractMethod = jest.fn()
                .mockResolvedValueOnce({ result: 'success' })
                .mockRejectedValueOnce(new Error('Failed'));

            const calls = [
                { methodName: 'm1' },
                { methodName: 'm2' }
            ];

            const result = await ContractCallService.batchCall('0xcontract', calls, []);

            expect(result.successful).toBe(1);
            expect(result.failed).toBe(1);

            ContractCallService.callContractMethod = originalCall;
        });
    });

    describe('getContractEvents', () => {
        it('should get past events', async () => {
            const result = await ContractCallService.getContractEvents('0xcontract', []);

            expect(result.events_count).toBe(1);
            expect(result.events[0].event).toBe('TestEvent');
            expect(mockContract.getPastEvents).toHaveBeenCalledWith('allEvents', expect.any(Object));
        });

        it('should get specific event', async () => {
            await ContractCallService.getContractEvents('0xcontract', [], 'TestEvent');

            expect(mockContract.getPastEvents).toHaveBeenCalledWith('TestEvent', expect.any(Object));
        });
    });

    describe('encodeFunctionCall', () => {
        it('should encode function call', () => {
            const result = ContractCallService.encodeFunctionCall('testMethod', [], []);

            expect(result.encoded_data).toBe('0xencoded');
        });

        it('should throw error if method not found', () => {
            expect(() => ContractCallService.encodeFunctionCall('unknown', [], []))
                .toThrow('Method \'unknown\' not found');
        });
    });

    describe('decodeFunctionCall', () => {
        it('should decode function call', () => {
            const abi = [{
                type: 'function',
                name: 'testMethod',
                inputs: [{ type: 'uint256' }]
            }];

            // Mock keccak256 to match slice
            mockWeb3.utils.keccak256.mockReturnValue('0x12345678');

            // Data: methodId (0x12345678) + params
            const data = '0x12345678' + '0'.repeat(64);

            const result = ContractCallService.decodeFunctionCall(data, abi);

            expect(result.method).toBe('testMethod');
            expect(mockWeb3.eth.abi.decodeParameters).toHaveBeenCalled();
        });

        it('should throw error if method not found', () => {
            mockWeb3.utils.keccak256.mockReturnValue('0xother');
            const abi = [{
                type: 'function',
                name: 'testMethod',
                inputs: []
            }];

            expect(() => ContractCallService.decodeFunctionCall('0x12345678', abi))
                .toThrow('Method not found in ABI');
        });
    });

    describe('parseEvents', () => {
        it('should parse events from receipt', () => {
            const receipt = {
                logs: [{
                    topics: ['0xhash'],
                    data: '0xdata'
                }]
            };
            const abi = [{
                type: 'event',
                name: 'TestEvent',
                inputs: []
            }];

            mockWeb3.utils.keccak256.mockReturnValue('0xhash');

            const events = ContractCallService.parseEvents(receipt, abi);

            expect(events).toHaveLength(1);
            expect(events[0].event).toBe('TestEvent');
        });
    });
});
