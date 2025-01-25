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
exports.WalletGenerator = void 0;
const ethers_1 = require("ethers");
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const Logger_1 = require("./Logger");
class WalletGenerator {
    constructor(rpcUrl, senderPrivateKey) {
        this.INITIAL_FUNDING = "0.01"; // Amount of NZT to send to each new wallet
        this.BATCH_SIZE = 50;
        this.MAX_WALLETS = 30000000; // 30 million wallets
        this.MIN_TPS = 1; // Minimum transactions per second
        this.MAX_TPS = 100; // Maximum transactions per second
        this.isRunning = false;
        this.currentNonce = 0;
        this.processingStarted = false;
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
        this.logger = new Logger_1.Logger('WalletGenerator');
        this.walletStorePath = path.join(__dirname, '../data/wallets.json');
        this.senderWallet = new ethers_1.ethers.Wallet(senderPrivateKey, this.provider);
        // Configure the network
        this.provider.getNetwork().catch(error => {
            if (error instanceof Error) {
                this.logger.error(`Failed to connect to network: ${error.message}`);
            }
            else {
                this.logger.error('Failed to connect to network: Unknown error');
            }
        });
    }
    async getMinimumGasPrice() {
        try {
            // Try to get the next base fee from the network
            const feeData = await this.provider.getFeeData();
            if (feeData.maxFeePerGas) {
                return feeData.maxFeePerGas;
            }
        }
        catch (error) {
            this.logger.warn('Failed to get fee data from network, using fallback gas price');
        }
        // Fallback to a very high gas price if we can't get the network's suggestion
        return ethers_1.ethers.utils.parseUnits('1000', 'gwei'); // 1000 Gwei as fallback
    }
    async getRandomTPS() {
        return Math.floor(Math.random() * (this.MAX_TPS - this.MIN_TPS + 1)) + this.MIN_TPS;
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async fundWallet(address) {
        const MAX_RETRIES = 3;
        const GAS_PRICE = ethers_1.ethers.utils.parseUnits('2000', 'gwei');
        let attempt = 0;
        let lastError = '';
        while (attempt < MAX_RETRIES) {
            try {
                if (attempt > 0) {
                    await this.sleep(3000 + attempt * 2000);
                }
                const tx = await this.senderWallet.sendTransaction({
                    to: address,
                    value: ethers_1.ethers.utils.parseEther(this.INITIAL_FUNDING),
                    nonce: this.currentNonce++,
                    gasLimit: 21000,
                    gasPrice: GAS_PRICE,
                    chainId: 2370
                });
                const confirmations = Math.min(attempt + 1, 3);
                await tx.wait(confirmations);
                this.logger.info(`Successfully funded wallet ${address} with ${this.INITIAL_FUNDING} NZT (gasPrice: 2000 Gwei, confirmations: ${confirmations})`);
                return;
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Attempt ${attempt + 1} failed to fund wallet ${address}: ${lastError}`);
                attempt++;
                // If nonce error, refresh nonce
                if (lastError.includes('nonce')) {
                    this.currentNonce = await this.senderWallet.getTransactionCount();
                }
            }
        }
        throw new Error(`Failed to fund wallet ${address} after ${MAX_RETRIES} attempts: ${lastError}`);
    }
    async processContinuousTransactions(wallets) {
        while (this.isRunning) {
            try {
                const tps = await this.getRandomTPS();
                const batchSize = Math.min(tps, 10); // Process in small batches
                const delayMs = 1000 / tps;
                for (let i = 0; i < wallets.length && this.isRunning; i += batchSize) {
                    const batch = wallets.slice(i, i + batchSize);
                    const promises = batch.map(wallet => this.fundWallet(wallet.address));
                    await Promise.all(promises);
                    await this.sleep(delayMs * batchSize);
                    // Log progress every 1000 transactions
                    if (i % 1000 === 0) {
                        this.logger.info(`Processed ${i} transactions at ${tps} TPS`);
                    }
                }
                // After completing one round, wait a bit before starting next round
                if (this.isRunning) {
                    this.logger.info('Completed one round of transactions, starting next round...');
                    await this.sleep(5000);
                }
            }
            catch (error) {
                this.logger.error(`Error in continuous transaction processing: ${error instanceof Error ? error.message : String(error)}`);
                await this.sleep(10000); // Wait before retrying
            }
        }
    }
    async startContinuousOperation() {
        try {
            const network = await this.provider.getNetwork();
            this.logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
            this.isRunning = true;
            this.currentNonce = await this.senderWallet.getTransactionCount();
            const wallets = [];
            let walletsGenerated = 0;
            // Generate wallets in batches
            while (walletsGenerated < this.MAX_WALLETS && this.isRunning) {
                const batchSize = Math.min(this.BATCH_SIZE, this.MAX_WALLETS - walletsGenerated);
                const newWallets = Array.from({ length: batchSize }, () => ethers_1.ethers.Wallet.createRandom().connect(this.provider));
                wallets.push(...newWallets);
                walletsGenerated += batchSize;
                this.logger.info(`Generated ${walletsGenerated} wallets out of ${this.MAX_WALLETS}`);
                // Store progress periodically
                if (walletsGenerated % 1000 === 0) {
                    await this.storeWallets(wallets);
                }
                // Start processing transactions once we have enough wallets
                if (wallets.length >= 1000 && !this.processingStarted) {
                    this.processingStarted = true;
                    this.processContinuousTransactions(wallets).catch(error => {
                        this.logger.error(`Transaction processing error: ${error instanceof Error ? error.message : String(error)}`);
                    });
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to start continuous operation: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async stop() {
        this.isRunning = false;
        this.logger.info('Stopping continuous operation...');
    }
    async storeWallets(wallets) {
        const walletData = wallets.map(wallet => ({
            address: wallet.address,
            privateKey: wallet.privateKey
        }));
        await node_fs_1.promises.mkdir(path.dirname(this.walletStorePath), { recursive: true });
        await node_fs_1.promises.writeFile(this.walletStorePath, JSON.stringify(walletData, null, 2));
    }
    async loadWallets() {
        try {
            const data = await node_fs_1.promises.readFile(this.walletStorePath, 'utf8');
            const walletData = JSON.parse(data);
            return walletData.map((w) => new ethers_1.ethers.Wallet(w.privateKey, this.provider));
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Error loading wallets: ${error.message}`);
            }
            else {
                this.logger.error('Error loading wallets: Unknown error');
            }
            return [];
        }
    }
}
exports.WalletGenerator = WalletGenerator;
