import { config } from 'dotenv';
import { WalletGenerator } from './WalletGenerator';
import { Logger } from './Logger';

config();

async function main() {
    const logger = new Logger('TestWallets');
    const rpcUrl = process.env.RPC_URL;

    if (!rpcUrl) {
        throw new Error('RPC_URL not found in environment variables');
    }

    const walletGenerator = new WalletGenerator(rpcUrl);
    
    // Generate a smaller batch of 10 wallets for testing
    logger.info('Generating test wallets...');
    const wallets = await walletGenerator.generateWallets(10);
    logger.info(`Generated ${wallets.length} test wallets`);
    
    // Display the wallet addresses
    wallets.forEach((wallet, index) => {
        logger.info(`Wallet ${index + 1}: ${wallet.address}`);
    });
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 