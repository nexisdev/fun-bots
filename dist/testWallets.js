"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const WalletGenerator_1 = require("./WalletGenerator");
const Logger_1 = require("./Logger");
async function main() {
    const logger = new Logger_1.Logger('TestWallets');
    try {
        const rpcUrl = process.env.RPC_URL;
        const privateKey = process.env.PRIVATE_KEY;
        if (!rpcUrl) {
            throw new Error('RPC_URL environment variable is required');
        }
        if (!privateKey) {
            throw new Error('PRIVATE_KEY environment variable is required');
        }
        const generator = new WalletGenerator_1.WalletGenerator(rpcUrl, privateKey);
        // Start continuous operation but stop after a short time for testing
        logger.info('Starting continuous operation for testing...');
        setTimeout(() => {
            generator.stop().catch(error => {
                logger.error(`Error stopping generator: ${error instanceof Error ? error.message : String(error)}`);
            });
        }, 60000); // Run for 1 minute
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
