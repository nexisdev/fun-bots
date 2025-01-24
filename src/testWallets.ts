import 'dotenv/config';
import { WalletGenerator } from './WalletGenerator';
import { Logger } from './Logger';
import { ethers } from 'ethers';

async function main() {
    const logger = new Logger('TestWallets');
    
    try {
        const rpcUrl = process.env.RPC_URL;
        const privateKey = process.env.PRIVATE_KEY;

        if (!rpcUrl) {
            throw new Error('RPC_URL environment variable is required');
        }

        if (!privateKey) {
            throw new Error('PRIVATE_KEY environment variable is required');
        }

        const generator = new WalletGenerator(rpcUrl, privateKey);
        
        // Start continuous operation but stop after a short time for testing
        logger.info('Starting continuous operation for testing...');
        setTimeout(() => {
            generator.stop().catch(error => {
                logger.error(`Error stopping generator: ${error instanceof Error ? error.message : String(error)}`);
            });
        }, 60000); // Run for 1 minute

        await generator.startContinuousOperation();
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Fatal error: ${error.message}`);
        } else {
            logger.error('Fatal error: Unknown error occurred');
        }
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
}); 