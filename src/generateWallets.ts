import { ethers } from 'ethers';
import { writeFileSync } from 'fs';
import { Logger } from './Logger.js';

const logger = new Logger('WalletGenerator');

async function generateWallets(count: number = 1000) {
    try {
        const wallets = Array.from({ length: count }, () => {
            const wallet = ethers.Wallet.createRandom();
            return wallet.address;
        });

        writeFileSync('./wallets.json', JSON.stringify(wallets, null, 2));
        logger.info(`Generated ${count} wallets and saved to wallets.json`);

    } catch (error: any) {
        logger.error(`Error generating wallets: ${error.message}`);
        process.exit(1);
    }
}

generateWallets(); 