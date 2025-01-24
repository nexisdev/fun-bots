# Server Status Report - 103.106.59.91
Last checked: January 19, 2025 05:46:21 UTC

## Blockchain Status

### EVM Chain Details
- Chain ID: 2370 (0x942)
- Network Name: Nexis Network Testnet
- Currency Symbol: NZT
- RPC Endpoint: `https://evm-testnet.nexis.network`
- WebSocket Endpoint: `ws://103.106.59.91:8546`
- Block Explorer: `https://evm-testnet.nexscan.io`

### Network Configuration
- Minimum Gas Price: 21000 wei
- Block Time: ~400ms
- Consensus: Proof of Stake (PoS)
- EVM Version: London
- Chain Compatibility: Ethereum

### MetaMask Configuration
```json
{
  "chainId": "0x942",
  "chainName": "Nexis Network Testnet",
  "nativeCurrency": {
    "name": "Nexis Token",
    "symbol": "NZT",
    "decimals": 18
  },
  "rpcUrls": ["http://103.106.59.91:8545"],
  "blockExplorerUrls": ["https://evm-testnet.nexscan.io"]
}
```

### Stake Information
- Active Stake: 999,999.99771712 NZT
- Vote Account: 4vgrbGuRrAw5XUhDn6zQzq9UX7eGTe29TFKhDwcUMoNR
- Stake Authority: 7NoEDXF5LmkGNwFBcWYcjnp87Tq9tr2wWRZqDi9Jjk99
- Withdraw Authority: 7NoEDXF5LmkGNwFBcWYcjnp87Tq9tr2wWRZqDi9Jjk99

### Supply Information
- Total Supply: 1,001,000,002.1069719 NZT
- Circulating Supply: 1,001,000,002.1069719 NZT
- Non-Circulating Supply: 0 NZT

## Active Services

### Nexis Validator Service
- Status: **Active (Running)**
- Uptime: 10 hours
- Memory Usage: 25.9GB
- CPU Time: 15h 5min
- Tasks: 685
- Service enabled at boot: Yes

### Other Critical Services
- nginx: Active (Web Server)
- ssh: Active (SSH Server)
- systemd-networkd: Active (Network Configuration)
- systemd-resolved: Active (DNS Resolution)

## System Resources

### Memory Usage
- Total Memory: 251GB
- Used: 4.1GB
- Free: 186GB
- Buffer/Cache: 61GB
- Available: 245GB
- Swap Used: 14MB of 8GB

### CPU Load
- Load Average: 1.41, 1.74, 1.70
- CPU Usage: 2.3% user, 0.2% system, 97.4% idle
- Total Tasks: 582 (1 running, 581 sleeping)

### Disk Usage
- Root Partition (/): 76GB used of 1.8TB (5%)
- Additional Storage (/storage): 2.0TB available (0% used)
- Temporary Storage (tmpfs): Multiple mounts with minimal usage

### Active Sessions
- tmux sessions: 1 active (bridge, created Jan 19 18:26:56)
- Connected users: 4

## Network Services Status
The following ports are in use:
- 8899: Validator RPC
- 8545: EVM Bridge
- 8001: Validator Gossip
- 9900: Faucet
- 80/443: Web Server (nginx)
- 22: SSH

## API Endpoints

### Native Chain RPC (Port 8899)
Base URL: `https://evm-testnet.nexis.network`
- GET /health
- POST / (JSON-RPC 2.0)

Available Methods:
```plaintext
# Blockchain Information
- getBlockHeight
- getBlock
- getBlockProduction
- getBlocks
- getBlockTime
- getEpochInfo
- getEpochSchedule
- getGenesisHash
- getSlot
- getSlotLeader
- getSlotLeaders

# Account & Token Information
- getAccountInfo
- getBalance
- getTokenAccountBalance
- getTokenAccountsByDelegate
- getTokenAccountsByOwner
- getTokenLargestAccounts
- getTokenSupply

# Transaction Operations
- getTransaction
- getSignatureStatuses
- getRecentBlockhash
- sendTransaction
- simulateTransaction

# Stake & Vote Information
- getStakeActivation
- getVoteAccounts
- getInflationGovernor
- getInflationRate
- getInflationReward

# Program Information
- getProgramAccounts
- getMultipleAccounts
```

### EVM Bridge RPC (Port 8545)
Base URL: `http://103.106.59.91:8545`
```plaintext
# Standard Ethereum JSON-RPC Methods
- eth_chainId
- eth_blockNumber
- eth_getBalance
- eth_getTransactionCount
- eth_getBlockByHash
- eth_getBlockByNumber
- eth_getTransactionByHash
- eth_sendRawTransaction
- eth_call
- eth_estimateGas
- eth_gasPrice
- eth_getCode
- eth_getLogs
- eth_getStorageAt
- net_version
- web3_clientVersion

# Pub/Sub Methods (WebSocket)
- eth_subscribe
- eth_unsubscribe
```

### WebSocket Endpoints
- Native Chain: `ws://103.106.59.91:8900`
- EVM Chain: `ws://103.106.59.91:8546`

## Overall Health Status
✅ System is healthy:
- All critical services are running
- Memory usage is optimal
- Disk space is sufficient
- CPU load is normal
- Network services are operational
