import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractABI from '../contracts/TimeBoundBeats.json';
import '../styles/marketplace.css';

const abi = contractABI.abi;

const MyTitles = ({ provider, signer, account, refreshTrigger, contractAddresses }) => {
  const [titles, setTitles] = useState([]);

  useEffect(() => {
    const fetchTitles = async () => {
      if (provider && signer && account && contractAddresses?.TimeBoundBeats) {
        try {
          console.log('MyTitles: Using contract address:', contractAddresses.TimeBoundBeats);
          console.log('MyTitles: Account:', account);
          
          // First verify the contract exists at this address
          const code = await signer.provider.getCode(contractAddresses.TimeBoundBeats);
          console.log('MyTitles: Contract code length:', code.length);
          if (code === '0x') {
            throw new Error(`No contract deployed at address ${contractAddresses.TimeBoundBeats} on current network`);
          }
          
          const contract = new ethers.Contract(contractAddresses.TimeBoundBeats, abi, signer);
          console.log('Fetching titles for account:', account);
          
          // Check if user owns any tokens first
          const balance = await contract.balanceOf(account);
          console.log('User balance:', balance.toString());
          
          if (Number(balance) > 0) {
            console.log('User has tokens, calling getMyTitles()');
            const ownedTokenIds = await contract.getMyTitles();
            console.log('Owned token IDs:', ownedTokenIds);
            
            const titlesData = await Promise.all(
              ownedTokenIds.map(async (tokenId) => {
                console.log('Processing tokenId:', tokenId, typeof tokenId);
                const metadata = await contract.getTitleMetadata(tokenId);
                console.log('Metadata for token', tokenId, ':', metadata);
                return { 
                  tokenId: Number(tokenId), // Convert BigInt to number
                  name: metadata[0],        // name is at index 0
                  author: metadata[1],      // author is at index 1  
                  duration: Number(metadata[2]) // duration is at index 2, convert BigInt
                };
              })
            );
            console.log('Final titles data:', titlesData);
            setTitles(titlesData);
          } else {
            console.log('User has no tokens, setting empty array');
            setTitles([]); // User owns no tokens
          }
        } catch (error) {
          console.error('Error fetching titles:', error);
          setTitles([]); // Set empty array on error
        }
      } else {
        console.log('Provider, signer, or account not available:', { provider: !!provider, signer: !!signer, account });
      }
    };

    fetchTitles();
  }, [provider, signer, account, refreshTrigger, contractAddresses]);

  // Show connect wallet prompt if no account connected
  if (!account) {
    return (
      <div className="my-titles-container">
        <div className="section-header">
          <h2 className="section-title">My Titles</h2>
          <p className="section-subtitle">Music titles you own</p>
        </div>
        
        <div className="empty-state">
          <div className="empty-icon">🔗</div>
          <h3>Connect Your Wallet</h3>
          <p>Connect your wallet to view your owned music titles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-titles-container">
      <div className="section-header">
        <h2 className="section-title">My Titles</h2>
        <p className="section-subtitle">Music titles you own</p>
      </div>
      
      {titles.length > 0 ? (
        <div className="nft-grid">
          {titles.map((title) => (
            <div key={title.tokenId} className="nft-card owned">
              <div className="nft-image">
                <div className="nft-placeholder">
                  🎵
                </div>
                <div className="owner-badge">Owned</div>
              </div>
              
              <div className="nft-content">
                <div className="nft-info">
                  <h4 className="nft-title">{title.name}</h4>
                  <p className="nft-author">by {title.author}</p>
                  <div className="nft-details">
                    <span className="nft-duration">Duration: {title.duration}s</span>
                    <span className="nft-token">#{title.tokenId}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🎼</div>
          <h3>No titles owned</h3>
          <p>Mint your first music title to get started!</p>
        </div>
      )}
    </div>
  );
};

export default MyTitles;
