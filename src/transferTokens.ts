import { config } from 'dotenv';
import { WalletGenerator } from './WalletGenerator';
import { TokenTransfer } from './TokenTransfer';
import { Logger } from './Logger';

config();

async function main() {
    const logger = new Logger('TokenTransfer-Main');
    
    // Load environment variables
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
        throw new Error('Missing required environment variables');
    }

    // Initialize wallet generator to load generated wallets
    const walletGenerator = new WalletGenerator(rpcUrl);
    const wallets = await walletGenerator.loadWallets();

    if (wallets.length === 0) {
        throw new Error('No wallets found. Please generate wallets first.');
    }

    logger.info(`Loaded ${wallets.length} wallet addresses`);

    // Initialize token transfer
    const tokenTransfer = new TokenTransfer(rpcUrl, privateKey);

    // Get wallet addresses
    const walletAddresses = wallets.map(wallet => wallet.address);

    // Generate random amount between 1-1000 for each wallet
    const amounts = walletAddresses.map(() => Math.floor(Math.random() * 1000) + 1);

    // Transfer tokens to each wallet
    for (let i = 0; i < walletAddresses.length; i++) {
        try {
            await tokenTransfer.transferToWallets([walletAddresses[i]], amounts[i]);
            logger.info(`Transferred ${amounts[i]} NZT to wallet ${i + 1}/${walletAddresses.length}`);
        } catch (error: any) {
            logger.error(`Failed to transfer to wallet ${i + 1}: ${error.message}`);
        }
    }

    logger.info('Token transfer process completed');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 