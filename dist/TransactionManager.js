"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManager = void 0;
const ethers_1 = require("ethers");
const p_queue_1 = __importDefault(require("p-queue"));
const Logger_1 = require("./Logger");
class TransactionManager {
    constructor(rpcUrl, concurrency = 100) {
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
        this.logger = new Logger_1.Logger('TransactionManager');
        this.queue = new p_queue_1.default({ concurrency });
        this.noncesMap = new Map();
    }
    async initializeNonces(wallets) {
        await Promise.all(wallets.map(async (wallet) => {
            const nonce = await this.provider.getTransactionCount(wallet.address);
            this.noncesMap.set(wallet.address, nonce);
        }));
    }
    getNonceForWallet(address) {
        const nonce = this.noncesMap.get(address) || 0;
        this.noncesMap.set(address, nonce + 1);
        return nonce;
    }
    async sendTransaction(from, to, value) {
        await this.queue.add(async () => {
            try {
                const nonce = this.getNonceForWallet(from.address);
                const gasPrice = await this.provider.getGasPrice();
                const gasLimit = 21000; // Standard ETH transfer gas limit
                const tx = await from.sendTransaction({
                    to,
                    value,
                    gasPrice,
                    gasLimit,
                    nonce
                });
                await tx.wait(1); // Wait for 1 confirmation
                this.logger.info(`Transaction sent: ${tx.hash}`);
            }
            catch (error) {
                const errorMessage = error?.message || 'Unknown error occurred';
                this.logger.error(`Transaction failed: ${errorMessage}`);
                // Decrease nonce on failure to retry later
                const currentNonce = this.noncesMap.get(from.address) || 0;
                this.noncesMap.set(from.address, currentNonce - 1);
                throw error;
            }
        });
    }
    async sendBatchTransactions(wallets, batchSize) {
        const shuffledWallets = [...wallets].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffledWallets.length; i += 2) {
            if (i + 1 >= shuffledWallets.length)
                break;
            const sender = shuffledWallets[i];
            const receiver = shuffledWallets[i + 1];
            // Send a small amount (0.0001 ETH)
            const value = ethers_1.ethers.utils.parseEther("0.0001");
            await this.sendTransaction(sender, receiver.address, value);
            if (i % 1000 === 0) {
                this.logger.info(`Processed ${i} transactions...`);
            }
        }
    }
    getQueueSize() {
        return this.queue.size;
    }
    getPendingCount() {
        return this.queue.pending;
    }
}
exports.TransactionManager = TransactionManager;
