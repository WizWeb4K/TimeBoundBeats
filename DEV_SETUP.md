# TimeBoundBeats Development Environment

## Quick Start

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- [Node.js](https://nodejs.org/) (v16 or higher)
- MetaMask, Rabby, or compatible wallet

### 1. Initial Setup
```bash
# Setup contract environment
cd contracts && cp .env.example .env && cd ..

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Start Development Environment

#### Option A: Individual Commands
```bash
# Terminal 1: Start Anvil (Fresh Network)
npm run anvil

# Terminal 2: Deploy contracts (wait for Anvil to start)
npm run deploy:local

# Terminal 3: Start frontend
npm run frontend
```

#### Option B: All-in-One (requires concurrently)
```bash
npm install -g concurrently
npm run dev:full
```

### 3. Configure Wallet (MetaMask/Rabby)

#### **Add Local Network:**
- Network Name: `Local Anvil`
- RPC URL: `http://localhost:8545`
- Chain ID: `31337`
- Currency Symbol: `ETH`

#### **Import Anvil Test Accounts (Seed Phrase Method):**
Use this seed phrase to import all 10 Anvil test accounts:
```
test test test test test test test test test test test junk
```

**Account Roles:**
- **Account #0** (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`): Contract owner, receives platform fees
- **Accounts #1-9**: Regular users for testing rentals
- **All accounts** receive 1000 MockUSDC automatically during deployment

#### **Add MockUSDC Token:**
After deployment, add the MockUSDC token to your wallet:
- **Token Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3` *(predictable address)*
- **Symbol**: `MOCKUSDC`
- **Decimals**: `6`

## Contract Addresses (Predictable on Fresh Network)

**TimeBoundBeats**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`  
**MockUSDC**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

*These addresses are consistent on every fresh Anvil deployment.*

Deployment info is also saved to:
- `frontend/src/contracts/deployment.json`
- `contracts/broadcast/DeployTimeBoundBeats.s.sol/31337/run-latest.json`

## Environment Configuration

The `.env` file is located in the `contracts/` directory since it's only needed for Foundry operations:
- **Location**: `contracts/.env`
- **Template**: `contracts/.env.example`
- **Contents**: Private key and optional API keys for contract deployment

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run anvil` | Start local Arbitrum fork |
| `npm run deploy:local` | Deploy contracts to local network |
| `npm run compile` | Compile contracts |
| `npm run test:contracts` | Run contract tests |
| `npm run frontend` | Start React frontend |

## Testing Workflow

### 1. Test Contract Functions
```bash
# Mint a title NFT
cast send <TIMEBOUND_BEATS_ADDRESS> "mintTitle(string,string,uint256)" "My Song" "Artist" 180 --private-key $PRIVATE_KEY --rpc-url http://localhost:8545

# Get mock USDC for testing rentals
cast send <MOCK_USDC_ADDRESS> "faucet(uint256)" 1000000000 --private-key $PRIVATE_KEY --rpc-url http://localhost:8545

# Approve USDC spending
cast send <MOCK_USDC_ADDRESS> "approve(address,uint256)" <TIMEBOUND_BEATS_ADDRESS> 1000000000 --private-key $PRIVATE_KEY --rpc-url http://localhost:8545

# Rent a title (different account needed)
cast send <TIMEBOUND_BEATS_ADDRESS> "rentTitle(uint256,uint256)" 0 86400 --private-key <OTHER_PRIVATE_KEY> --rpc-url http://localhost:8545
```

### 2. Frontend Testing
1. Visit `http://localhost:3000`
2. Connect MetaMask to local network
3. Interact with your deployed contracts

## Troubleshooting

### Common Issues

**Anvil not starting:**
- Check if port 8545 is already in use: `lsof -i :8545`
- Kill existing process: `kill -9 <PID>`

**Deployment fails:**
- Ensure Anvil is running on localhost:8545
- Check that `.env` file exists with correct PRIVATE_KEY

**MetaMask connection issues:**
- Reset MetaMask account data for local network
- Ensure you're connected to the correct network (Chain ID: 31337)

**Frontend can't find contracts:**
- Verify `deployment.json` exists in `frontend/src/contracts/`
- Check console for network connection errors

### Reset Development Environment
```bash
# Stop all processes
pkill -f anvil

# Clean and restart
rm -rf contracts/broadcast contracts/cache contracts/out
npm run anvil
# In new terminal:
npm run deploy:local
```

### Environment Variables
All environment configuration is handled in the `contracts/` directory:
```bash
# Setup environment (first time only)
cd contracts && cp .env.example .env

# Edit with your values if needed
# Default Anvil private key works for local development
```

## Project Structure
```
.
├── contracts/               # Smart contracts (Foundry)
│   ├── src/                # Contract source files
│   ├── script/             # Deployment scripts
│   ├── test/               # Contract tests
│   └── foundry.toml        # Foundry configuration
├── frontend/               # React frontend
│   ├── src/
│   │   ├── config/         # Network configurations
│   │   └── contracts/      # Contract ABIs and addresses
│   └── package.json
├── .env.example            # Environment template
└── package.json            # Root package with dev scripts
```

## Next Steps

1. **Add More Test Accounts:** Import additional Anvil accounts for multi-user testing
2. **Contract Verification:** Set up Arbiscan API key for mainnet deployment
3. **Frontend Integration:** Update frontend components to use the new network configuration
4. **Testing Suite:** Expand contract tests with Foundry test framework

## Useful Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Anvil Documentation](https://book.getfoundry.sh/reference/anvil/)
- [Arbitrum Developer Docs](https://docs.arbitrum.io/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
