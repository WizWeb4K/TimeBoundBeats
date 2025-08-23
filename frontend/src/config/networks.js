// Network configuration for TimeBoundBeats DApp
export const NETWORKS = {
  local: {
    name: 'Local Anvil (Arbitrum Fork)',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: null, // No block explorer for local network
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arbitrum-one.publicnode.com',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://arbiscan.io',
  }
};

// Default network for development
export const DEFAULT_NETWORK = NETWORKS.local;

// Contract addresses will be loaded from deployment.json
export const loadContractAddresses = async () => {
  try {
    const response = await fetch('/contracts/deployment.json');
    const deployment = await response.json();
    return deployment;
  } catch (error) {
    console.warn('Could not load deployment.json, using placeholder addresses');
    return {
      TimeBoundBeats: '0x0000000000000000000000000000000000000000',
      MockUSDC: '0x0000000000000000000000000000000000000000',
      network: 'local',
      chainId: 31337
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
