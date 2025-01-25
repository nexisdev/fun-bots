"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const fs_1 = require("fs");
const Logger_js_1 = require("./Logger.js");
const logger = new Logger_js_1.Logger('WalletGenerator');
async function generateWallets(count = 1000) {
    try {
        const wallets = Array.from({ length: count }, () => {
            const wallet = ethers_1.ethers.Wallet.createRandom();
            return wallet.address;
        });
        (0, fs_1.writeFileSync)('./wallets.json', JSON.stringify(wallets, null, 2));
        logger.info(`Generated ${count} wallets and saved to wallets.json`);
    }
    catch (error) {
        logger.error(`Error generating wallets: ${error.message}`);
        process.exit(1);
    }
}
generateWallets();
