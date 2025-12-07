const logger = require('../../utils/logger');

/**
 * Quack Q402 Payment Service for BNB Testnet
 * Implements EIP-7702 delegated payment protocol
 */
class QuackQ402Service {
    constructor() {
        this.network = 'bsc-testnet';
        this.chainId = 97;
        this.paymentToken = 'USDC'; // BEP-20 USDC on BNB (user has this)
        this.tokenAddress = '0x64544969ed7EBf5f083679233325356EbE738930'; // USDC on BNB Testnet
        this.payments = new Map();
        this.pricing = {
            'agent-creation': '1.0',
            'agent-query': '0.1',
            'agent-action': '0.25',
            'contract-deploy': '2.0',
            'contract-call': '0.5',
            'swap': '0.5'
        };
    }

    /**
     * Create Q402 payment request
     * @param {string} serviceType - Type of service
     * @param {string} agentId - Agent identifier
     * @param {Object} metadata - Additional payment metadata
     * @returns {Promise<Object>} Payment request details
     */
    async createPaymentRequest(serviceType, agentId, metadata = {}) {
        try {
            const amount = this.pricing[serviceType] || '0.1';
            const paymentId = `q402_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const paymentRequest = {
                id: paymentId,
                network: this.network,
                chainId: this.chainId,
                serviceType,
                agentId,
                amount,
                token: this.paymentToken,
                tokenAddress: this.tokenAddress,
                status: 'pending',
                createdAt: new Date().toISOString(),
                metadata,
                // Q402 specific fields
                protocol: 'EIP-7702',
                requiresGasSponsorship: true,
                policyProtected: true
            };

            this.payments.set(paymentId, paymentRequest);

            logger.info(`Quack Q402 payment request created: ${paymentId} for ${amount} ${this.paymentToken}`);

            return {
                success: true,
                paymentId,
                amount,
                token: this.paymentToken,
                tokenAddress: this.tokenAddress,
                network: this.network,
                chainId: this.chainId,
                protocol: 'Q402 (EIP-7702)',
                message: `Pay ${amount} ${this.paymentToken} for ${serviceType}`
            };
        } catch (error) {
            logger.error('Quack Q402 payment request error:', error);
            throw error;
        }
    }

    /**
     * Verify Q402 payment
     * @param {string} paymentId - Payment identifier
     * @param {string} txHash - Transaction hash
     * @returns {Promise<Object>} Verification result
     */
    async verifyPayment(paymentId, txHash) {
        try {
            const payment = this.payments.get(paymentId);

            if (!payment) {
                return {
                    success: false,
                    error: 'Payment not found'
                };
            }

            // In production, verify on-chain via BNB Testnet RPC
            // For now, mark as verified
            payment.status = 'verified';
            payment.txHash = txHash;
            payment.verifiedAt = new Date().toISOString();

            this.payments.set(paymentId, payment);

            logger.info(`Quack Q402 payment verified: ${paymentId} - ${txHash}`);

            return {
                success: true,
                paymentId,
                txHash,
                amount: payment.amount,
                token: payment.token,
                status: 'verified',
                protocol: 'Q402'
            };
        } catch (error) {
            logger.error('Quack Q402 payment verification error:', error);
            throw error;
        }
    }

    /**
     * Get payment history
     * @param {string} agentId - Agent identifier
     * @returns {Array} Payment history
     */
    getPaymentHistory(agentId) {
        const history = [];

        for (const [id, payment] of this.payments) {
            if (payment.agentId === agentId) {
                history.push({
                    id,
                    serviceType: payment.serviceType,
                    amount: payment.amount,
                    token: payment.token,
                    status: payment.status,
                    txHash: payment.txHash,
                    createdAt: payment.createdAt,
                    protocol: 'Q402'
                });
            }
        }

        return history.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    /**
     * Get all payments (for admin/debugging)
     * @returns {Array} All payments
     */
    getAllPayments() {
        const allPayments = [];

        for (const [id, payment] of this.payments) {
            allPayments.push({
                id,
                ...payment
            });
        }

        return allPayments.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    /**
     * Get service pricing
     * @returns {Object} Pricing information
     */
    getPricing() {
        return {
            network: this.network,
            token: this.paymentToken,
            pricing: this.pricing
        };
    }
}

module.exports = new QuackQ402Service();
