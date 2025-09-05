// Network configuration for TimeBoundBeats DApp
export const NETWORKS = {
  local: {
    name: 'Local Anvil',
    shortName: 'Local',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    logo: 'local',
    color: '#f59e0b',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: null, // No block explorer for local network
    contracts: {
      // These will be loaded from deployment.json for local
      TimeBoundBeats: null,
      PaymentToken: null
    }
  },
  sepolia: {
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/demo', // Public RPC
    logo: 'ethereum',
    color: '#627eea',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://sepolia.etherscan.io',
    contracts: {
      TimeBoundBeats: '0x06a2A3Ae5FB0410F2A9019F9853Df900e6BCEb0D',
      PaymentToken: '0x3aAA12F45c281DDcaa123612483Dc159c2CEc6B7'
    }
  }
};

// Default network for development
export const DEFAULT_NETWORK = NETWORKS.sepolia;

// Get network configuration by chain ID
export const getNetworkByChainId = (chainId) => {
  const networkKey = Object.keys(NETWORKS).find(key => NETWORKS[key].chainId === chainId);
  return networkKey ? NETWORKS[networkKey] : null;
};

// Get contract addresses for a specific network
export const getContractAddresses = (networkKey) => {
  console.log('getContractAddresses called with:', networkKey);
  console.log('Available networks:', Object.keys(NETWORKS));
  
  const network = NETWORKS[networkKey];
  console.log('Found network:', network);
  
  if (!network) {
    console.warn(`Network ${networkKey} not found`);
    return null;
  }
  
  console.log('Returning contracts:', network.contracts);
  return network.contracts;
};

// Load contract addresses for local network from deployment.json
export const loadLocalDeployment = async () => {
  try {
    const response = await fetch('/contracts/deployment.json');
    if (!response.ok) {
      throw new Error('deployment.json not found');
    }
    const deployment = await response.json();
    return {
      TimeBoundBeats: deployment.TimeBoundBeats,
      PaymentToken: deployment.PaymentToken
    };
  } catch (error) {
    console.log('Local deployment.json not found - using placeholder addresses');
    // Return placeholder addresses for local development
    return {
      TimeBoundBeats: '0x0000000000000000000000000000000000000000',
      PaymentToken: '0x0000000000000000000000000000000000000000'
    };
  }
};

// Helper function to switch to the correct network
export const switchToNetwork = async (targetNetwork) => {
  if (!window.ethereum) {
    throw new Error('No wallet detected');
  }

  const chainIdHex = `0x${targetNetwork.chainId.toString(16)}`;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: targetNetwork.name,
            rpcUrls: [targetNetwork.rpcUrl],
            nativeCurrency: targetNetwork.nativeCurrency,
            blockExplorerUrls: targetNetwork.blockExplorer ? [targetNetwork.blockExplorer] : null,
          }],
        });
      } catch (addError) {
        throw addError;
      }
    } else {
      throw switchError;
    }
  }
};
