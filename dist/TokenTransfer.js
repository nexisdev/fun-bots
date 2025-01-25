"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenTransfer = void 0;
const ethers_1 = require("ethers");
const Logger_js_1 = require("./Logger.js");
class TokenTransfer {
    constructor(rpcUrl, privateKey) {
        this.GAS_PRICE_PREMIUM = 1.1; // 10% premium over base gas price
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000; // 1 second
        this.CONFIRMATION_BLOCKS = 1;
        this.BATCH_SIZE = 100; // Number of transactions per batch
        this.MAX_CONCURRENT = 50; // Maximum concurrent RPC calls
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
        this.logger = new Logger_js_1.Logger('TokenTransfer');
        this.senderWallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
        // Initialize rate limiter
        this.initializeLimiter();
    }
    async initializeLimiter() {
        const pLimit = (await Promise.resolve().then(() => __importStar(require('p-limit')))).default;
        this.limiter = pLimit(this.MAX_CONCURRENT);
    }
    async getGasPrice() {
        try {
            const gasPrice = await this.provider.getGasPrice();
            const premiumGasPrice = gasPrice.mul(Math.floor(this.GAS_PRICE_PREMIUM * 100)).div(100);
            return premiumGasPrice.toHexString();
        }
        catch (error) {
            this.logger.error(`Failed to get gas price: ${error.message}`);
            return ethers_1.ethers.utils.parseUnits('3', 'gwei').toHexString(); // Fallback to 3 Gwei
        }
    }
    async sendTransactionWithRetry(transaction, recipientAddress, retryCount = 0) {
        try {
            // Create a properly formatted transaction
            const tx = {
                to: recipientAddress,
                value: transaction.value,
                nonce: transaction.nonce,
                gasLimit: ethers_1.ethers.BigNumber.from(21000),
                gasPrice: await this.getGasPrice(),
                chainId: 2370
            };
            // Sign and send the transaction
            const txResponse = await this.senderWallet.sendTransaction(tx);
            this.logger.info(`Transaction sent: ${txResponse.hash}`);
            // Wait for confirmation
            const receipt = await txResponse.wait(this.CONFIRMATION_BLOCKS);
            this.logger.info(`Transaction confirmed in block ${receipt.blockNumber}`);
            return txResponse.hash;
        }
        catch (error) {
            if (retryCount < this.MAX_RETRIES && error.message.includes('too cheap')) {
                this.logger.warn(`Transaction too cheap, retrying with higher gas price for ${recipientAddress}`);
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.sendTransactionWithRetry(transaction, recipientAddress, retryCount + 1);
            }
            this.logger.error(`Error in sendTransaction to ${recipientAddress}: ${error.message}`);
            throw error;
        }
    }
    prepareBatches(targetWallets, amountPerWallet, startNonce) {
        const batches = [];
        let currentBatch = [];
        let currentNonce = startNonce;
        for (let i = 0; i < targetWallets.length; i++) {
            const amountInWei = ethers_1.ethers.utils.parseEther(amountPerWallet.toString());
            const transaction = {
                to: targetWallets[i],
                value: amountInWei,
                nonce: currentNonce++
            };
            currentBatch.push(transaction);
            if (currentBatch.length === this.BATCH_SIZE || i === targetWallets.length - 1) {
                batches.push({
                    transactions: currentBatch,
                    startNonce: currentNonce - currentBatch.length
                });
                currentBatch = [];
            }
        }
        return batches;
    }
    async processBatch(batch) {
        if (!this.limiter) {
            await this.initializeLimiter();
        }
        const sendPromises = batch.transactions.map(tx => {
            return this.limiter(async () => {
                try {
                    this.logger.info(`Preparing to send transaction to ${tx.to} with nonce ${tx.nonce}`);
                    const txHash = await this.sendTransactionWithRetry(tx, tx.to);
                    this.logger.info(`Transaction sent successfully with hash: ${txHash}`);
                    return txHash;
                }
                catch (error) {
                    this.logger.error(`Failed to send transaction to ${tx.to}: ${error.message}`);
                    throw error;
                }
            });
        });
        try {
            await Promise.all(sendPromises);
            this.logger.info(`Batch completed successfully with ${batch.transactions.length} transactions`);
            // Add delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (error) {
            this.logger.error(`Batch failed: ${error.message}`);
            throw error;
        }
    }
    async transferToWallets(targetWallets, amountPerWallet) {
        try {
            // Initialize limiter if not already initialized
            if (!this.limiter) {
                await this.initializeLimiter();
            }
            // Get starting nonce
            const currentNonce = await this.provider.getTransactionCount(this.senderWallet.address, 'latest');
            this.logger.info(`Starting nonce: ${currentNonce}`);
            // Prepare transaction batches
            const batches = this.prepareBatches(targetWallets, amountPerWallet, currentNonce);
            this.logger.info(`Prepared ${batches.length} batches of transactions`);
            // Process batches sequentially to maintain nonce order
            for (const batch of batches) {
                await this.processBatch(batch);
                this.logger.info(`Completed batch ${batches.indexOf(batch) + 1}/${batches.length}`);
            }
            this.logger.info('All transfers completed');
        }
        catch (error) {
            this.logger.error(`Transfer process failed: ${error.message}`);
            throw error;
        }
    }
}
exports.TokenTransfer = TokenTransfer;
