import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { Logger } from './Logger.js';

dotenv.config();

const logger = new Logger('TestTransfer');

// Create multiple provider instances to distribute load
const createProvider = () => new ethers.providers.JsonRpcProvider('https://evm-testnet.nexis.network');
const PROVIDER_COUNT = 5;
const providers = Array.from({ length: PROVIDER_COUNT }, createProvider);

async function sendTransaction(
    wallet: ethers.Wallet,
    recipientAddress: string,
    nonce: number,
    retryCount = 0
): Promise<string | null> {
    const maxRetries = 5;
    const provider = providers[nonce % PROVIDER_COUNT];
    const connectedWallet = wallet.connect(provider);
    
    try {
        const gasPrice = ethers.utils.parseUnits('20', 'gwei');
        const gasLimit = ethers.BigNumber.from(21000);
        const amount = ethers.utils.parseEther('1.0');

        const tx = {
            from: wallet.address,
            to: recipientAddress,
            value: amount,
            nonce: nonce,
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            chainId: 2370
        };

        const signedTx = await connectedWallet.signTransaction(tx);
        const response = await provider.sendTransaction(signedTx);
        
        // Wait for 1 confirmation to ensure transaction success
        await response.wait(1);
        logger.info(`Transaction confirmed: ${response.hash} (nonce: ${nonce})`);
        return response.hash;
    } catch (error: any) {
        const errorMessage = error.message || error.toString();
        
        if (retryCount < maxRetries) {
            const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
            logger.warn(`Retry ${retryCount + 1} for nonce ${nonce}: ${errorMessage}`);
            await new Promise(resolve => setTimeout(resolve, backoffTime + Math.random() * 1000));
            return sendTransaction(wallet, recipientAddress, nonce, retryCount + 1);
        }
        
        logger.error(`Failed to send transaction to ${recipientAddress} (nonce: ${nonce}): ${errorMessage}`);
        return null;
    }
}

// Helper function to chunk array into smaller arrays
function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

async function processBatch(
    wallet: ethers.Wallet,
    addresses: string[],
    startNonce: number,
    stats: { successful: number; failed: number; startTime: number; total: number }
) {
    const promises = addresses.map((address, index) => {
        const nonce = startNonce + index;
        return sendTransaction(wallet, address, nonce).then(result => {
            if (result) {
                stats.successful++;
            } else {
                stats.failed++;
            }
            
            // Log progress every 10 transactions
            if ((stats.successful + stats.failed) % 10 === 0) {
                const elapsed = (Date.now() - stats.startTime) / 1000;
                const tps = (stats.successful + stats.failed) / elapsed;
                logger.info(`Progress: ${stats.successful + stats.failed}/${stats.total} (${tps.toFixed(2)} TPS)`);
                logger.info(`Success: ${stats.successful}, Failed: ${stats.failed}`);
            }
        });
    });

    await Promise.all(promises);
}

async function main() {
    try {
        // Initialize wallet with the first provider
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, providers[0]);
        
        // Generate recipient addresses
        const recipientCount = 1000;
        const recipientAddresses = Array.from({ length: recipientCount }, () => {
            const randomWallet = ethers.Wallet.createRandom();
            return randomWallet.address;
        });

        // Get starting nonce
        const startNonce = await providers[0].getTransactionCount(wallet.address, 'latest');
        logger.info(`Starting with nonce: ${startNonce}`);
        logger.info(`Wallet address: ${wallet.address}`);
        logger.info(`Total transactions to send: ${recipientCount}`);

        // Track statistics
        const stats = {
            successful: 0,
            failed: 0,
            startTime: Date.now(),
            total: recipientCount
        };

        // Process in chunks of 100 transactions
        const chunks = chunk(recipientAddresses, 100);
        for (let i = 0; i < chunks.length; i++) {
            logger.info(`Processing batch ${i + 1}/${chunks.length}`);
            await processBatch(wallet, chunks[i], startNonce + (i * 100), stats);
            
            // Add delay between batches if not the last batch
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        const totalTime = (Date.now() - stats.startTime) / 1000;
        const finalTps = recipientCount / totalTime;
        
        logger.info('Transfer test completed');
        logger.info(`Total time: ${totalTime.toFixed(2)} seconds`);
        logger.info(`Final TPS: ${finalTps.toFixed(2)}`);
        logger.info(`Successful: ${stats.successful}`);
        logger.info(`Failed: ${stats.failed}`);
        logger.info(`Success rate: ${((stats.successful / recipientCount) * 100).toFixed(2)}%`);
        
    } catch (error: any) {
        logger.error('Fatal error in transfer process:', error.message);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error: Error) => {
    logger.error('Unhandled rejection:', error.message);
    process.exit(1);
});

main().catch((error) => {
    logger.error('Fatal error:', error.message);
    process.exit(1);
}); 