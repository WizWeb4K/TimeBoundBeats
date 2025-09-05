import React, { useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button, ButtonGroup } from 'react-bootstrap';
import { DEFAULT_NETWORK, switchToNetwork } from '../config/networks';

const Wallet = ({ setProvider, setSigner, setAccount, account }) => {

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    
    // Clear saved connection state
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAccount');
    
    console.log('Wallet disconnected');
  }, [setProvider, setSigner, setAccount]);

  const connectWallet = useCallback(async (requestPermission = true) => {
    if (window.ethereum) {
      try {
        let accounts;
        
        if (requestPermission) {
          // Request permission to connect
          accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        } else {
          // Use existing connection
          accounts = await window.ethereum.request({ method: 'eth_accounts' });
        }
        
        if (accounts.length === 0) {
          throw new Error('No accounts found');
        }

        // First switch to the correct network
        await switchToNetwork(DEFAULT_NETWORK);
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        // Verify we're on the correct network
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== DEFAULT_NETWORK.chainId) {
          throw new Error(`Wrong network. Expected ${DEFAULT_NETWORK.chainId}, got ${network.chainId}`);
        }
        
        setProvider(provider);
        setSigner(signer);
        setAccount(address);
        
        // Save connection state
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAccount', address);
        
        console.log(`Connected to ${address} on network ${network.chainId}`);
      } catch (error) {
        console.error('Error connecting to wallet:', error);
        alert(`Connection failed: ${error.message}`);
        
        // Clear any saved state on error
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAccount');
      }
    } else {
      alert('Please install MetaMask!');
    }
  }, [setProvider, setSigner, setAccount]);

  // Auto-connect on component mount if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      const wasConnected = localStorage.getItem('walletConnected');
      const savedAccount = localStorage.getItem('walletAccount');
      
      console.log('Auto-connect check:', { wasConnected, savedAccount });
      
      if (wasConnected === 'true' && savedAccount && window.ethereum) {
        try {
          // Check if accounts are still connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          console.log('Available accounts:', accounts);
          
          // Compare addresses case-insensitively (Ethereum addresses are case-insensitive)
          const accountFound = accounts.some(account => account.toLowerCase() === savedAccount.toLowerCase());
          
          if (accounts.length > 0 && accountFound) {
            console.log('Auto-connecting to saved account:', savedAccount);
            await connectWallet(false); // Don't request permission again
          } else {
            // Clear saved state if no longer connected
            console.log('Account not found in MetaMask, clearing saved state');
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAccount');
          }
        } catch (error) {
          console.log('Auto-connect failed:', error);
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('walletAccount');
        }
      }
    };
    
    // Set up event listeners for account changes
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnectWallet();
      } else {
        // User switched accounts
        const newAccount = accounts[0];
        const savedAccount = localStorage.getItem('walletAccount');
        if (newAccount !== savedAccount) {
          // Account changed, reconnect with new account
          connectWallet(false);
        }
      }
    };

    const handleChainChanged = () => {
      // Reload the page when chain changes for simplicity
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    
    autoConnect();

    // Cleanup event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [connectWallet, disconnectWallet]);

  return (
    <div className="d-flex justify-content-end align-items-center">
      {account ? (
        <ButtonGroup>
          <Button variant="outline-success" disabled>
            Connected: {account.substring(0, 6)}...{account.substring(38)}
          </Button>
          <Button variant="outline-danger" onClick={disconnectWallet}>
            Disconnect
          </Button>
        </ButtonGroup>
      ) : (
        <Button variant="primary" onClick={() => connectWallet(true)}>
          Connect Wallet
        </Button>
      )}
    </div>
  );
};

export default Wallet;
