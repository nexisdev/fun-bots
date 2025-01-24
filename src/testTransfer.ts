import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { Logger } from './Logger.js';

dotenv.config();

const logger = new Logger('TestTransfer');

async function main() {
    const provider = new ethers.providers.JsonRpcProvider('https://evm-testnet.nexis.network');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    
    // Higher initial gas price (15 Gwei)
    const initialGasPrice = ethers.utils.parseUnits('15', 'gwei');
    const gasLimit = ethers.BigNumber.from(21000);
    const amount = ethers.utils.parseEther('1.0');
    
    const recipientAddresses = Array.from({ length: 100 }, () => {
        const wallet = ethers.Wallet.createRandom();
        return wallet.address;
    });

    const batchSize = 2; // Further reduced batch size
    const batches = Math.ceil(recipientAddresses.length / batchSize);
    let globalNonce = await provider.getTransactionCount(wallet.address, 'latest');
    
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        logger.info(`Processing batch ${batchIndex + 1}/${batches}`);
        const batch = recipientAddresses.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
        
        for (const recipientAddress of batch) {
            let attempts = 0;
            const maxAttempts = 15;
            let currentGasPrice = initialGasPrice;
            let lastTx: any = null;
            let success = false;
            
            while (attempts < maxAttempts && !success) {
                try {
                    // Get latest nonce from chain
                    const latestNonce = await provider.getTransactionCount(wallet.address, 'latest');
                    // Use the higher of our tracked nonce or chain nonce
                    const nonce = Math.max(globalNonce, latestNonce);
                    
                    logger.info(`Sending transaction to ${recipientAddress} with nonce ${nonce}`);
                    
                    lastTx = {
                        from: wallet.address,
                        to: recipientAddress,
                        value: amount,
                        nonce: nonce,
                        gasPrice: currentGasPrice,
                        gasLimit: gasLimit,
                        chainId: 2370
                    };

                    // Wait for provider to be ready
                    await provider.ready;
                    
                    const signedTx = await wallet.signTransaction(lastTx);
                    const response = await provider.sendTransaction(signedTx);
                    
                    // Wait for transaction confirmation with timeout
                    const receipt = await Promise.race([
                        response.wait(1),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
                        )
                    ]);
                    
                    logger.info(`Transaction confirmed: ${response.hash}`);
                    globalNonce = nonce + 1;
                    success = true;
                    
                } catch (error: any) {
                    attempts++;
                    const errorMessage = error.message || error.toString();
                    
                    if (attempts === maxAttempts) {
                        logger.error(`Error in sendTransaction to ${recipientAddress}: ${errorMessage}`);
                        logger.error(`Transaction details: ${JSON.stringify({
                            from: wallet.address,
                            to: recipientAddress,
                            value: ethers.utils.formatEther(amount) + ' NZT',
                            nonce: lastTx?.nonce?.toString(),
                            gasPrice: ethers.utils.formatUnits(currentGasPrice, 'gwei') + ' gwei',
                            gasLimit: gasLimit.toString(),
                            chainId: 2370
                        }, null, 2)}`);
                        break;
                    }

                    // Increase gas price by 50% each attempt
                    currentGasPrice = currentGasPrice.mul(15).div(10);
                    
                    // Calculate delay with jitter
                    const baseDelay = Math.pow(2, attempts) * 1000;
                    const jitter = Math.floor(Math.random() * 1000);
                    const delay = baseDelay + jitter;
                    
                    // Check if we need to refresh the nonce
                    if (errorMessage.includes('nonce')) {
                        // Force nonce refresh on next attempt
                        globalNonce = await provider.getTransactionCount(wallet.address, 'latest');
                        logger.warn(`Nonce mismatch detected, refreshed to ${globalNonce}`);
                    }
                    
                    logger.warn(`Attempt ${attempts} failed, retrying in ${delay}ms: ${errorMessage}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    // Reconnect provider if network error
                    if (error.code === 'NETWORK_ERROR') {
                        const newProvider = new ethers.providers.JsonRpcProvider('https://evm-testnet.nexis.network');
                        await newProvider.ready;
                        wallet.connect(newProvider);
                    }
                }
            }
            
            // Add small delay between transactions in the same batch
            if (!success) {
                // If transaction failed, wait longer before next attempt
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Longer delay between batches (10 seconds)
        if (batchIndex < batches - 1) {
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
}

main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
}); 