const PreferenceManager = require('../memory/PreferenceManager');
const MembaseService = require('../memory/MembaseService');

// Mock MembaseService
jest.mock('../memory/MembaseService');

describe('Preference Manager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('setPreference', () => {
        it('should set a user preference', async () => {
            MembaseService.storeUserPreference.mockResolvedValue({ success: true });

            const result = await PreferenceManager.setPreference('user1', 'trading', 'risk_tolerance', 'high');

            expect(result.success).toBe(true);
            expect(MembaseService.storeUserPreference).toHaveBeenCalledWith(
                'user1',
                'trading.risk_tolerance',
                'high'
            );
        });
    });

    describe('getPreference', () => {
        it('should retrieve a user preference', async () => {
            const mockPrefs = { 'trading.risk_tolerance': 'high' };
            MembaseService.getUserPreferences.mockResolvedValue(mockPrefs);

            const result = await PreferenceManager.getPreference('user1', 'trading', 'risk_tolerance');

            expect(result).toBe('high');
        });

        it('should return default value if preference not set', async () => {
            MembaseService.getUserPreferences.mockResolvedValue({});

            const result = await PreferenceManager.getPreference('user1', 'trading', 'risk_tolerance');

            expect(result).toBe('medium'); // Default value
        });
    });

    describe('getAllPreferences', () => {
        it('should retrieve all preferences organized by category', async () => {
            const mockPrefs = {
                'trading.risk_tolerance': 'high',
                'security.auto_approve': true
            };
            MembaseService.getUserPreferences.mockResolvedValue(mockPrefs);

            const result = await PreferenceManager.getAllPreferences('user1');

            expect(result.trading.risk_tolerance).toBe('high');
            expect(result.security.auto_approve).toBe(true);
            expect(result.defaults).toBeDefined();
        });
    });

    describe('updateRiskTolerance', () => {
        it('should update risk tolerance', async () => {
            MembaseService.storeUserPreference.mockResolvedValue({ success: true });

            const result = await PreferenceManager.updateRiskTolerance('user1', 'HIGH');

            expect(result.success).toBe(true);
            expect(MembaseService.storeUserPreference).toHaveBeenCalledWith(
                'user1',
                'trading.risk_tolerance',
                'high'
            );
        });

        it('should throw error for invalid risk level', async () => {
            await expect(PreferenceManager.updateRiskTolerance('user1', 'invalid'))
                .rejects.toThrow('Invalid risk level');
        });
    });

    describe('updateGasStrategy', () => {
        it('should update gas strategy', async () => {
            MembaseService.storeUserPreference.mockResolvedValue({ success: true });

            const result = await PreferenceManager.updateGasStrategy('user1', 'FAST');

            expect(result.success).toBe(true);
            expect(MembaseService.storeUserPreference).toHaveBeenCalledWith(
                'user1',
                'trading.gas_strategy',
                'fast'
            );
        });
    });

    describe('updateSlippageTolerance', () => {
        it('should update slippage tolerance', async () => {
            MembaseService.storeUserPreference.mockResolvedValue({ success: true });

            const result = await PreferenceManager.updateSlippageTolerance('user1', 1.5);

            expect(result.success).toBe(true);
            expect(MembaseService.storeUserPreference).toHaveBeenCalledWith(
                'user1',
                'trading.slippage_tolerance',
                1.5
            );
        });

        it('should throw error for invalid slippage', async () => {
            await expect(PreferenceManager.updateSlippageTolerance('user1', 100))
                .rejects.toThrow('Slippage must be between 0.1 and 50');
        });
    });

    describe('resetPreferences', () => {
        it('should reset all preferences', async () => {
            MembaseService.storeUserPreference.mockResolvedValue({ success: true });

            const result = await PreferenceManager.resetPreferences('user1');

            expect(result.success).toBe(true);
            expect(MembaseService.storeUserPreference).toHaveBeenCalledTimes(Object.keys(PreferenceManager.defaultPreferences).length);
        });
    });
});
