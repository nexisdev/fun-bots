import { ethers } from 'ethers';
import { Logger } from './Logger.js';
import axios from 'axios';

interface TransactionReceipt {
    status: string;
    transactionHash: string;
    blockNumber: string;
    blockHash: string;
    gasUsed: string;
}

interface TransactionBatch {
    transactions: any[];
    startNonce: number;
}

export class TokenTransfer {
    private readonly provider: ethers.providers.JsonRpcProvider;
    private readonly senderWallet: ethers.Wallet;
    private readonly logger: Logger;
    private readonly GAS_PRICE_PREMIUM = 1.1; // 10% premium over base gas price
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000; // 1 second
    private readonly CONFIRMATION_BLOCKS = 1;
    private readonly BATCH_SIZE = 100; // Number of transactions per batch
    private readonly MAX_CONCURRENT = 50; // Maximum concurrent RPC calls
    private limiter: any;

    constructor(
        rpcUrl: string,
        privateKey: string
    ) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.logger = new Logger('TokenTransfer');
        this.senderWallet = new ethers.Wallet(privateKey, this.provider);
        
        // Initialize rate limiter
        this.initializeLimiter();
    }

    private async initializeLimiter() {
        const pLimit = (await import('p-limit')).default;
        this.limiter = pLimit(this.MAX_CONCURRENT);
    }

    private async getGasPrice(): Promise<string> {
        try {
            const gasPrice = await this.provider.getGasPrice();
            const premiumGasPrice = gasPrice.mul(Math.floor(this.GAS_PRICE_PREMIUM * 100)).div(100);
            return premiumGasPrice.toHexString();
        } catch (error: any) {
            this.logger.error(`Failed to get gas price: ${error.message}`);
            return ethers.utils.parseUnits('3', 'gwei').toHexString(); // Fallback to 3 Gwei
        }
    }

    private async sendTransactionWithRetry(transaction: any, recipientAddress: string, retryCount = 0): Promise<string | null> {
        try {
            // Create a properly formatted transaction
            const tx = {
                to: recipientAddress,
                value: transaction.value,
                nonce: transaction.nonce,
                gasLimit: ethers.BigNumber.from(21000),
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
        } catch (error: any) {
            if (retryCount < this.MAX_RETRIES && error.message.includes('too cheap')) {
                this.logger.warn(`Transaction too cheap, retrying with higher gas price for ${recipientAddress}`);
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.sendTransactionWithRetry(transaction, recipientAddress, retryCount + 1);
            }

            this.logger.error(`Error in sendTransaction to ${recipientAddress}: ${error.message}`);
            throw error;
        }
    }

    private prepareBatches(targetWallets: string[], amountPerWallet: number, startNonce: number): TransactionBatch[] {
        const batches: TransactionBatch[] = [];
        let currentBatch: any[] = [];
        let currentNonce = startNonce;

        for (let i = 0; i < targetWallets.length; i++) {
            const amountInWei = ethers.utils.parseEther(amountPerWallet.toString());
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

    private async processBatch(batch: TransactionBatch): Promise<void> {
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
                } catch (error: any) {
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
        } catch (error: any) {
            this.logger.error(`Batch failed: ${error.message}`);
            throw error;
        }
    }

    async transferToWallets(targetWallets: string[], amountPerWallet: number): Promise<void> {
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
        } catch (error: any) {
            this.logger.error(`Transfer process failed: ${error.message}`);
            throw error;
        }
    }
} 