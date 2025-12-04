const AuditorService = require('../chainGPT/AuditorService');
const LLMService = require('../chainGPT/LLMService');

// Mock LLMService
jest.mock('../chainGPT/LLMService');

describe('Auditor Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('auditContract', () => {
        it('should perform full contract audit', async () => {
            const mockCode = 'contract Test {}';
            const mockResponse = {
                response: `VULNERABILITIES:
- Reentrancy attack [Severity: HIGH]
RISK LEVEL: HIGH
GAS OPTIMIZATION:
- Use calldata instead of memory
BEST PRACTICES:
- Add natspec comments
RECOMMENDATIONS:
- Implement reentrancy guard
CODE QUALITY: Good structure`,
                tokens_used: 500,
                model_used: 'gpt-4'
            };

            LLMService.chat.mockResolvedValue(mockResponse);

            const result = await AuditorService.auditContract(mockCode);

            expect(result.vulnerabilities).toHaveLength(1);
            expect(result.risk_level).toBe('HIGH');
            expect(result.gas_optimization).toHaveLength(1);
            expect(result.tokens_used).toBe(500);
            expect(LLMService.chat).toHaveBeenCalled();
        });

        it('should handle audit errors', async () => {
            LLMService.chat.mockRejectedValue(new Error('API error'));

            await expect(AuditorService.auditContract('code'))
                .rejects.toThrow('Failed to audit contract');
        });
    });

    describe('checkSecurity', () => {
        it('should perform security scan', async () => {
            const mockResponse = {
                response: 'Reentrancy (CRITICAL) in withdraw function',
                tokens_used: 300,
                model_used: 'gpt-4'
            };

            LLMService.chat.mockResolvedValue(mockResponse);

            const result = await AuditorService.checkSecurity('contract {}');

            expect(result.vulnerabilities_found).toBeGreaterThanOrEqual(0);
            expect(result.scan_type).toBe('security_focused');
            expect(result.risk_level).toBeDefined();
        });
    });

    describe('findVulnerabilities', () => {
        it('should find and categorize vulnerabilities', async () => {
            const mockResponse = {
                response: JSON.stringify({
                    name: 'Reentrancy',
                    severity: 'CRITICAL',
                    location: 'withdraw()',
                    description: 'Reentrancy vulnerability',
                    impact: 'Funds can be drained',
                    fix: 'Use ReentrancyGuard'
                }),
                tokens_used: 400,
                model_used: 'gpt-4'
            };

            LLMService.chat.mockResolvedValue(mockResponse);

            const result = await AuditorService.findVulnerabilities('contract {}');

            expect(result.total_found).toBeGreaterThanOrEqual(0);
            expect(result).toHaveProperty('critical_count');
            expect(result).toHaveProperty('high_count');
            expect(result.risk_level).toBeDefined();
        });
    });

    describe('getAuditReport', () => {
        it('should generate formatted audit report', async () => {
            const mockResponse = {
                response: `VULNERABILITIES:
- Test vulnerability [Severity: MEDIUM]
RISK LEVEL: MEDIUM
GAS OPTIMIZATION:
- Optimize loops
BEST PRACTICES:
- Use events
RECOMMENDATIONS:
- Fix vulnerability
CODE QUALITY: Acceptable`,
                tokens_used: 600,
                model_used: 'gpt-4'
            };

            LLMService.chat.mockResolvedValue(mockResponse);

            const result = await AuditorService.getAuditReport('contract {}');

            expect(result.title).toBe('Smart Contract Security Audit Report');
            expect(result.executive_summary).toBeDefined();
            expect(result.detailed_findings).toBeDefined();
            expect(result.conclusion).toBeDefined();
        });
    });

    describe('parseAuditResponse', () => {
        it('should parse audit response correctly', () => {
            const response = `VULNERABILITIES:
- Reentrancy [Severity: HIGH]
- Overflow [Severity: MEDIUM]
RISK LEVEL: HIGH
GAS OPTIMIZATION:
- Use unchecked
BEST PRACTICES:
- Add events
RECOMMENDATIONS:
- Fix issues
CODE QUALITY: Good`;

            const result = AuditorService.parseAuditResponse(response);

            expect(result.vulnerabilities).toHaveLength(2);
            expect(result.risk_level).toBe('HIGH');
            expect(result.gas_optimization).toHaveLength(1);
        });
    });

    describe('calculateRiskLevel', () => {
        it('should return CRITICAL for critical vulnerabilities', () => {
            const vulns = [{ severity: 'CRITICAL' }];
            expect(AuditorService.calculateRiskLevel(vulns)).toBe('CRITICAL');
        });

        it('should return HIGH for multiple high severity', () => {
            const vulns = [{ severity: 'HIGH' }, { severity: 'HIGH' }];
            expect(AuditorService.calculateRiskLevel(vulns)).toBe('HIGH');
        });

        it('should return MEDIUM for medium severity', () => {
            const vulns = [{ severity: 'MEDIUM' }];
            expect(AuditorService.calculateRiskLevel(vulns)).toBe('MEDIUM');
        });

        it('should return LOW for no critical issues', () => {
            const vulns = [];
            expect(AuditorService.calculateRiskLevel(vulns)).toBe('LOW');
        });
    });
});
