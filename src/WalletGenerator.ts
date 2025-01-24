import { ethers } from 'ethers';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Logger } from './Logger';

export class WalletGenerator {
    private provider: ethers.providers.JsonRpcProvider;
    private logger: Logger;
    private walletStorePath: string;
    private senderWallet: ethers.Wallet;
    private readonly BATCH_SIZE = 100000; // 100k wallets per batch
    private readonly TRANSACTIONS_PER_DAY = 300000; // 300k transactions per day
    private readonly TPS = Math.ceil(this.TRANSACTIONS_PER_DAY / (24 * 60 * 60)); // ~3.47 TPS
    private readonly MIN_AMOUNT = 0.001; // 0.001 NZT
    private readonly MAX_AMOUNT = 0.1; // 0.1 NZT
    private isRunning = false;
    private currentNonce = 0;
    private processingStarted = false;

    constructor(rpcUrl: string, senderPrivateKey: string) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.logger = new Logger('WalletGenerator');
        this.walletStorePath = path.join(__dirname, '../data/wallets.json');
        this.senderWallet = new ethers.Wallet(senderPrivateKey, this.provider);
    }

    private getRandomAmount(): string {
        const amount = Math.random() * (this.MAX_AMOUNT - this.MIN_AMOUNT) + this.MIN_AMOUNT;
        return amount.toFixed(6); // 6 decimal places
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async fundWallet(address: string): Promise<void> {
        const MAX_RETRIES = 3;
        const GAS_PRICE = ethers.utils.parseUnits('2000', 'gwei');
        let attempt = 0;
        let lastError = '';

        while (attempt < MAX_RETRIES) {
            try {
                if (attempt > 0) {
                    await this.sleep(3000 + attempt * 2000);
                }

                const tx = await this.senderWallet.sendTransaction({
                    to: address,
                    value: ethers.utils.parseEther(this.getRandomAmount()),
                    nonce: this.currentNonce++,
                    gasLimit: 21000,
                    gasPrice: GAS_PRICE,
                    chainId: 2370
                });
                
                const confirmations = Math.min(attempt + 1, 3);
                await tx.wait(confirmations);
                this.logger.info(`Successfully funded wallet ${address} with random amount (gasPrice: 2000 Gwei, confirmations: ${confirmations})`);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Attempt ${attempt + 1} failed to fund wallet ${address}: ${lastError}`);
                attempt++;
                
                if (lastError.includes('nonce')) {
                    this.currentNonce = await this.senderWallet.getTransactionCount();
                }
            }
        }

        throw new Error(`Failed to fund wallet ${address} after ${MAX_RETRIES} attempts: ${lastError}`);
    }

    private async processContinuousTransactions(wallets: ethers.Wallet[]): Promise<void> {
        const delayBetweenTx = Math.floor(1000 / this.TPS); // Milliseconds between transactions

        while (this.isRunning) {
            try {
                for (let i = 0; i < wallets.length && this.isRunning; i++) {
                    // Select a random recipient that's not the sender
                    const recipientIndex = (i + Math.floor(Math.random() * (wallets.length - 1)) + 1) % wallets.length;
                    const sender = wallets[i];
                    const recipient = wallets[recipientIndex];

                    try {
                        const amount = this.getRandomAmount();
                        const tx = await sender.sendTransaction({
                            to: recipient.address,
                            value: ethers.utils.parseEther(amount),
                            gasLimit: 21000,
                            gasPrice: ethers.utils.parseUnits('2000', 'gwei'),
                            chainId: 2370
                        });

                        await tx.wait(1);
                        this.logger.info(`Transferred ${amount} NZT from ${sender.address} to ${recipient.address}`);
                    } catch (error) {
                        this.logger.warn(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
                    }

                    await this.sleep(delayBetweenTx);

                    // Log progress every 1000 transactions
                    if (i % 1000 === 0) {
                        this.logger.info(`Processed ${i} transactions at ${this.TPS} TPS`);
                    }
                }

                // After completing one round, wait a bit before starting next round
                if (this.isRunning) {
                    this.logger.info('Completed one round of transactions, starting next round...');
                    await this.sleep(5000);
                }
            } catch (error) {
                this.logger.error(`Error in continuous transaction processing: ${error instanceof Error ? error.message : String(error)}`);
                await this.sleep(10000); // Wait before retrying
            }
        }
    }

    async startContinuousOperation(): Promise<void> {
        try {
            const network = await this.provider.getNetwork();
            this.logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
            
            this.isRunning = true;
            this.currentNonce = await this.senderWallet.getTransactionCount();
            
            // First, generate the full batch of wallets
            const wallets: ethers.Wallet[] = [];
            this.logger.info(`Generating ${this.BATCH_SIZE} wallets...`);
            
            for (let i = 0; i < this.BATCH_SIZE; i++) {
                const wallet = ethers.Wallet.createRandom().connect(this.provider);
                wallets.push(wallet);
                
                if (i % 1000 === 0) {
                    this.logger.info(`Generated ${i} wallets out of ${this.BATCH_SIZE}`);
                    await this.storeWallets(wallets); // Store progress periodically
                }
            }
            
            this.logger.info(`Completed generating ${this.BATCH_SIZE} wallets`);
            await this.storeWallets(wallets);

            // Fund all wallets with initial amounts
            this.logger.info('Starting initial funding of wallets...');
            for (let i = 0; i < wallets.length; i += 10) {
                const batch = wallets.slice(i, i + 10);
                const promises = batch.map(wallet => this.fundWallet(wallet.address));
                await Promise.all(promises);
                await this.sleep(3000); // Wait 3 seconds between batches
            }

            // Start continuous transaction processing
            this.logger.info('Starting continuous transaction processing...');
            await this.processContinuousTransactions(wallets);
        } catch (error) {
            this.logger.error(`Failed to start continuous operation: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    async stop(): Promise<void> {
        this.isRunning = false;
        this.logger.info('Stopping continuous operation...');
    }

    private async storeWallets(wallets: ethers.Wallet[]): Promise<void> {
        const walletData = wallets.map(wallet => ({
            address: wallet.address,
            privateKey: wallet.privateKey
        }));

        await fs.mkdir(path.dirname(this.walletStorePath), { recursive: true });
        await fs.writeFile(
            this.walletStorePath,
            JSON.stringify(walletData, null, 2)
        );
    }

    async loadWallets(): Promise<ethers.Wallet[]> {
        try {
            const data = await fs.readFile(this.walletStorePath, 'utf8');
            const walletData = JSON.parse(data);
            return walletData.map((w: { privateKey: string }) => 
                new ethers.Wallet(w.privateKey, this.provider)
            );
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Error loading wallets: ${error.message}`);
            } else {
                this.logger.error('Error loading wallets: Unknown error');
            }
            return [];
        }
    }
} 