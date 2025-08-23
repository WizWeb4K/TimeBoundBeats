import React from 'react';
import { ethers } from 'ethers';
import { Button } from 'react-bootstrap';
import { DEFAULT_NETWORK, switchToNetwork } from '../config/networks';

const Wallet = ({ setProvider, setSigner, setAccount, account }) => {

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
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
        console.log(`Connected to ${address} on network ${network.chainId}`);
      } catch (error) {
        console.error('Error connecting to wallet:', error);
        alert(`Connection failed: ${error.message}`);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  return (
    <div className="d-flex justify-content-end mb-3">
      {account ? (
        <Button variant="outline-success" disabled>Connected: {account.substring(0, 6)}...{account.substring(38)}</Button>
      ) : (
        <Button onClick={connectWallet}>Connect Wallet</Button>
      )}
    </div>
  );
};

export default Wallet;
