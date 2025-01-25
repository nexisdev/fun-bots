import { config } from 'dotenv';
import { WalletGenerator } from './WalletGenerator';
import { TransactionManager } from './TransactionManager';
import { Logger } from './Logger';
import { ethers } from 'ethers';

config();

const WALLET_BATCH_SIZE = 100000;
const WALLET_GENERATION_INTERVAL = 10 * 60 * 1000; // 10 minutes
const TRANSACTIONS_PER_DAY = 10000000;
const TRANSACTIONS_PER_BATCH = Math.floor(TRANSACTIONS_PER_DAY / (24 * 6)); // Divided into 10-minute intervals

async function main() {
    const logger = new Logger('Main');
    const rpcUrl = process.env.RPC_URL;

    if (!rpcUrl) {
        throw new Error('RPC_URL not found in environment variables');
    }

    const walletGenerator = new WalletGenerator(rpcUrl);
    const transactionManager = new TransactionManager(rpcUrl);

    // Initial wallet generation
    logger.info('Starting initial wallet generation...');
    let wallets = await walletGenerator.generateWallets(WALLET_BATCH_SIZE);
    logger.info(`Generated initial ${WALLET_BATCH_SIZE} wallets`);

    // Initialize nonces for all wallets
    await transactionManager.initializeNonces(wallets);

    // Set up periodic wallet generation
    setInterval(async () => {
        try {
            logger.info('Generating new batch of wallets...');
            const newWallets = await walletGenerator.generateWallets(WALLET_BATCH_SIZE);
            wallets = [...wallets, ...newWallets];
            await transactionManager.initializeNonces(newWallets);
            logger.info(`Generated ${WALLET_BATCH_SIZE} new wallets. Total wallets: ${wallets.length}`);
        } catch (error: any) {
            logger.error(`Error in wallet generation: ${error?.message || 'Unknown error'}`);
        }
    }, WALLET_GENERATION_INTERVAL);

    // Set up transaction processing
    const processTransactions = async () => {
        try {
            logger.info('Starting transaction batch...');
            await transactionManager.sendBatchTransactions(wallets, TRANSACTIONS_PER_BATCH);
            logger.info(`Completed transaction batch of ${TRANSACTIONS_PER_BATCH} transactions`);
        } catch (error: any) {
            logger.error(`Error in transaction processing: ${error?.message || 'Unknown error'}`);
        }
    };

    // Initial transaction processing
    await processTransactions();

    // Set up periodic transaction processing
    setInterval(processTransactions, WALLET_GENERATION_INTERVAL);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 