import React, { useState, useEffect } from 'react';
import { Dropdown } from 'react-bootstrap';
import { NETWORKS, getNetworkByChainId, switchToNetwork } from '../config/networks';
import EthereumIcon from './EthereumIcon';

const NetworkSwitcher = ({ currentNetwork, onNetworkChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentChainId, setCurrentChainId] = useState(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkCurrentNetwork = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          console.log('NetworkSwitcher: accounts check', accounts);
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const chainIdNum = parseInt(chainId, 16);
            console.log('NetworkSwitcher: connected to chain', chainIdNum);
            setCurrentChainId(chainIdNum);
            setIsConnected(true);
            
            // Notify parent immediately of current network
            const networkKey = Object.keys(NETWORKS).find(key => NETWORKS[key].chainId === chainIdNum);
            console.log('NetworkSwitcher: Found network key:', networkKey, 'for chain', chainIdNum);
            if (networkKey && onNetworkChange) {
              console.log('NetworkSwitcher: Initial network notification:', networkKey, NETWORKS[networkKey]);
              onNetworkChange(networkKey, NETWORKS[networkKey]);
            } else if (!networkKey) {
              console.log('NetworkSwitcher: No network found for chain', chainIdNum);
            } else if (!onNetworkChange) {
              console.log('NetworkSwitcher: onNetworkChange callback not provided');
            }
          } else {
            console.log('NetworkSwitcher: no accounts, showing default Sepolia');
            setIsConnected(false);
            setCurrentChainId(null);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
          setIsConnected(false);
          setCurrentChainId(null);
        }
      } else {
        console.log('NetworkSwitcher: no ethereum, showing default Sepolia');
        setIsConnected(false);
        setCurrentChainId(null);
      }
      setHasChecked(true);
    };

    checkCurrentNetwork();

    // Listen for account and chain changes
    const handleChainChanged = (chainId) => {
      const chainIdNum = parseInt(chainId, 16);
      console.log('NetworkSwitcher: Chain changed to', chainIdNum);
      setCurrentChainId(chainIdNum);
      
      // Find network and notify parent
      const networkKey = Object.keys(NETWORKS).find(key => NETWORKS[key].chainId === chainIdNum);
      if (networkKey && onNetworkChange) {
        console.log('NetworkSwitcher: Notifying parent of network change:', networkKey);
        onNetworkChange(networkKey, NETWORKS[networkKey]);
      }
    };

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
        setCurrentChainId(null);
      }
    };

    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [onNetworkChange]);

  const handleNetworkSwitch = async (networkKey) => {
    const targetNetwork = NETWORKS[networkKey];
    if (!targetNetwork) return;

    try {
      await switchToNetwork(targetNetwork);
      onNetworkChange && onNetworkChange(networkKey, targetNetwork);
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert(`Failed to switch to ${targetNetwork.name}: ${error.message}`);
    }
  };

  // Remove unused function and variable to fix ESLint warnings

  // Determine which network to show
  let networkToShow;
  if (!isConnected) {
    // Show default Sepolia when not connected
    networkToShow = { logo: 'ethereum', shortName: 'Sepolia', color: '#627eea' };
  } else if (currentNetwork) {
    // Show the current network from parent
    networkToShow = NETWORKS[currentNetwork];
  } else if (currentChainId) {
    // Fallback: find network by chain ID
    const networkKey = Object.keys(NETWORKS).find(key => NETWORKS[key].chainId === currentChainId);
    networkToShow = networkKey ? NETWORKS[networkKey] : { logo: 'ethereum', shortName: 'Unknown', color: '#666' };
  } else {
    // Final fallback
    networkToShow = { logo: 'ethereum', shortName: 'Sepolia', color: '#627eea' };
  }

  // Don't render until we've checked wallet status
  if (!hasChecked) {
    return (
      <div className="network-switcher">
        <div className="dropdown-toggle btn btn-outline-secondary disabled" style={{minWidth: '140px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <EthereumIcon size={16} color="#627eea" />
          <span className="network-name ms-2">Sepolia</span>
        </div>
      </div>
    );
  }

  return (
    <Dropdown className="network-switcher">
      <Dropdown.Toggle variant="outline-secondary" id="network-dropdown" disabled={!isConnected}>
        <span className="network-indicator">
          {networkToShow ? (
            <>
              {networkToShow.logo === 'ethereum' && (
                <EthereumIcon size={16} color={networkToShow.color} />
              )}
              {networkToShow.logo === 'local' && (
                <span className="network-logo" style={{color: networkToShow.color}}>
                  🏠
                </span>
              )}
              <span className="network-name">{networkToShow.shortName}</span>
            </>
          ) : (
            <>
              <EthereumIcon size={16} color="#627eea" />
              <span className="network-name">Sepolia</span>
            </>
          )}
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Header>Switch Network</Dropdown.Header>
        {Object.entries(NETWORKS).map(([key, network]) => (
          <Dropdown.Item
            key={key}
            onClick={() => handleNetworkSwitch(key)}
            active={currentChainId === network.chainId}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span>
                {network.logo === 'ethereum' && (
                  <EthereumIcon size={16} color={network.color} />
                )}
                {network.logo === 'local' && (
                  <span className="network-logo" style={{color: network.color}}>
                    🏠
                  </span>
                )}
                <span className="ms-2">{network.name}</span>
              </span>
              <small className="text-muted">Chain {network.chainId}</small>
            </div>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NetworkSwitcher;
