import { ethers } from 'ethers';
import PQueue from 'p-queue';
import { Logger } from './Logger';

export class TransactionManager {
    private provider: ethers.providers.JsonRpcProvider;
    private logger: Logger;
    private queue: PQueue;
    private noncesMap: Map<string, number>;

    constructor(rpcUrl: string, concurrency: number = 100) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.logger = new Logger('TransactionManager');
        this.queue = new PQueue({ concurrency });
        this.noncesMap = new Map();
    }

    async initializeNonces(wallets: ethers.Wallet[]): Promise<void> {
        await Promise.all(
            wallets.map(async (wallet) => {
                const nonce = await this.provider.getTransactionCount(wallet.address);
                this.noncesMap.set(wallet.address, nonce);
            })
        );
    }

    private getNonceForWallet(address: string): number {
        const nonce = this.noncesMap.get(address) || 0;
        this.noncesMap.set(address, nonce + 1);
        return nonce;
    }

    async sendTransaction(
        from: ethers.Wallet,
        to: string,
        value: ethers.BigNumber
    ): Promise<void> {
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
            } catch (error: any) {
                const errorMessage = error?.message || 'Unknown error occurred';
                this.logger.error(`Transaction failed: ${errorMessage}`);
                // Decrease nonce on failure to retry later
                const currentNonce = this.noncesMap.get(from.address) || 0;
                this.noncesMap.set(from.address, currentNonce - 1);
                throw error;
            }
        });
    }

    async sendBatchTransactions(
        wallets: ethers.Wallet[],
        batchSize: number
    ): Promise<void> {
        const shuffledWallets = [...wallets].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < shuffledWallets.length; i += 2) {
            if (i + 1 >= shuffledWallets.length) break;

            const sender = shuffledWallets[i];
            const receiver = shuffledWallets[i + 1];
            
            // Send a small amount (0.0001 ETH)
            const value = ethers.utils.parseEther("0.0001");
            
            await this.sendTransaction(sender, receiver.address, value);

            if (i % 1000 === 0) {
                this.logger.info(`Processed ${i} transactions...`);
            }
        }
    }

    getQueueSize(): number {
        return this.queue.size;
    }

    getPendingCount(): number {
        return this.queue.pending;
    }
} 