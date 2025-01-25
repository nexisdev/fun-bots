"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const WalletGenerator_1 = require("./WalletGenerator");
const Logger_1 = require("./Logger");
const logger = new Logger_1.Logger('Main');
async function main() {
    try {
        const rpcUrl = process.env.RPC_URL;
        const privateKey = process.env.PRIVATE_KEY;
        if (!rpcUrl) {
            throw new Error('RPC_URL environment variable is required');
        }
        if (!privateKey) {
            throw new Error('PRIVATE_KEY environment variable is required');
        }
        logger.info('Starting continuous wallet generation and transaction processing...');
        const generator = new WalletGenerator_1.WalletGenerator(rpcUrl, privateKey);
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT. Gracefully shutting down...');
            await generator.stop();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM. Gracefully shutting down...');
            await generator.stop();
            process.exit(0);
        });
        // Start continuous operation
        await generator.startContinuousOperation();
    }
    catch (error) {
        if (error instanceof Error) {
            logger.error(`Fatal error: ${error.message}`);
        }
        else {
            logger.error('Fatal error: Unknown error occurred');
        }
        process.exit(1);
    }
}
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
