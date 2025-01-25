import { ethers } from 'ethers';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from './Logger';

export class WalletGenerator {
    private provider: ethers.providers.JsonRpcProvider;
    private logger: Logger;
    private walletStorePath: string;

    constructor(rpcUrl: string) {
        this.provider = new ethers.providers.JsonRpcProvider({
            url: rpcUrl,
            headers: {
                "Content-Type": "application/json"
            },
            timeout: 30000
        });
        this.logger = new Logger('WalletGenerator');
        this.walletStorePath = path.join(__dirname, '../data/wallets.json');

        // Configure the network
        this.provider.getNetwork().catch(error => {
            this.logger.error(`Failed to connect to network: ${error.message}`);
        });
    }

    async generateWallets(count: number): Promise<ethers.Wallet[]> {
        // Wait for provider to be ready
        try {
            const network = await this.provider.getNetwork();
            this.logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
        } catch (error: any) {
            this.logger.error(`Failed to connect to network: ${error.message}`);
            throw error;
        }

        const wallets: ethers.Wallet[] = [];
        
        for (let i = 0; i < count; i++) {
            const wallet = ethers.Wallet.createRandom().connect(this.provider);
            wallets.push(wallet);
            
            if (i % 1000 === 0) {
                this.logger.info(`Generated ${i} wallets...`);
            }
        }

        await this.storeWallets(wallets);
        return wallets;
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
            return walletData.map((w: any) => 
                new ethers.Wallet(w.privateKey, this.provider)
            );
        } catch (error) {
            this.logger.error('Error loading wallets:', error);
            return [];
        }
    }
} 