import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractABI from '../contracts/TimeBoundBeats.json';
import '../styles/marketplace.css';

const abi = contractABI.abi;

const MyRentals = ({ provider, signer, account, refreshTrigger, contractAddresses }) => {
  const [rentals, setRentals] = useState([]);

  useEffect(() => {
    const fetchRentals = async () => {
      if (provider && signer && account && contractAddresses?.TimeBoundBeats) {
        try {
          const contract = new ethers.Contract(contractAddresses.TimeBoundBeats, abi, signer);
          const userRentals = [];
          
          // Get rentals by iterating through the public rentals array
          let rentalIndex = 0;
          try {
            while (true) {
              try {
                const rental = await contract.rentals(rentalIndex);
                
                // Check if this rental belongs to the current user
                if (rental.renter.toLowerCase() === account.toLowerCase()) {
                  const metadata = await contract.getTitleMetadata(rental.tokenId);
                  const rentedUntilTimestamp = Number(rental.rentedUntil);
                  const currentTimestamp = Math.floor(Date.now() / 1000);
                  const isExpired = rentedUntilTimestamp < currentTimestamp;
                  const rentedUntilDate = new Date(rentedUntilTimestamp * 1000).toLocaleString();
                  
                  userRentals.push({ 
                    tokenId: Number(rental.tokenId),
                    renter: rental.renter,
                    rentedUntil: rentedUntilTimestamp,
                    name: metadata[0],
                    author: metadata[1], 
                    duration: Number(metadata[2]),
                    rentedUntilDate,
                    isExpired
                  });
                }
                
                rentalIndex++;
              } catch (indexError) {
                // End of array reached
                break;
              }
            }
          } catch (error) {
            // Array access error, likely empty or end reached
          }
          
          // Sort rentals: active first, then expired (most recent first within each group)
          const sortedRentals = userRentals.sort((a, b) => {
            if (a.isExpired !== b.isExpired) {
              return a.isExpired ? 1 : -1; // Active rentals first
            }
            return b.rentedUntil - a.rentedUntil; // Most recent first within each group
          });
          
          setRentals(sortedRentals);
        } catch (error) {
          console.error('Error fetching rentals:', error);
          setRentals([]); // Set empty array on error
        }
      }
    };

    fetchRentals();
  }, [provider, signer, account, refreshTrigger, contractAddresses]);

  // Show connect wallet prompt if no account connected
  if (!account) {
    return (
      <div className="my-rentals-container">
        <div className="section-header">
          <h2 className="section-title">My Rentals</h2>
          <p className="section-subtitle">Music titles you're renting and rental history</p>
        </div>
        
        <div className="empty-state">
          <div className="empty-icon">🔗</div>
          <h3>Connect Your Wallet</h3>
          <p>Connect your wallet to view your rental history and active rentals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-rentals-container">
      <div className="section-header">
        <h2 className="section-title">My Rentals</h2>
        <p className="section-subtitle">Music titles you're renting and rental history</p>
      </div>
      
      {rentals.length > 0 ? (
        <div className="rentals-sections">
          {/* Active Rentals Section */}
          {rentals.filter(rental => !rental.isExpired).length > 0 && (
            <div className="rental-section">
              <h3 className="rental-section-title">🎵 Active Rentals</h3>
              <div className="nft-grid">
                {rentals.filter(rental => !rental.isExpired).map((rental, index) => (
                  <div key={`active-${index}`} className="nft-card rented">
                    <div className="nft-image">
                      <div className="nft-placeholder">
                        🎵
                      </div>
                      <div className="rental-badge active">Active</div>
                    </div>
                    
                    <div className="nft-content">
                      <div className="nft-info">
                        <h4 className="nft-title">{rental.name}</h4>
                        <p className="nft-author">by {rental.author}</p>
                        <div className="nft-details">
                          <span className="nft-duration">Duration: {rental.duration}s</span>
                          <span className="nft-token">#{rental.tokenId}</span>
                        </div>
                      </div>
                      
                      <div className="rental-info">
                        <div className="rental-expires active">
                          <strong>Expires:</strong>
                          <span className="expiry-date">{rental.rentedUntilDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expired Rentals Section */}
          {rentals.filter(rental => rental.isExpired).length > 0 && (
            <div className="rental-section">
              <h3 className="rental-section-title">📜 Rental History</h3>
              <div className="nft-grid">
                {rentals.filter(rental => rental.isExpired).map((rental, index) => (
                  <div key={`expired-${index}`} className="nft-card expired">
                    <div className="nft-image">
                      <div className="nft-placeholder expired">
                        🎵
                      </div>
                      <div className="rental-badge expired">Expired</div>
                    </div>
                    
                    <div className="nft-content">
                      <div className="nft-info">
                        <h4 className="nft-title">{rental.name}</h4>
                        <p className="nft-author">by {rental.author}</p>
                        <div className="nft-details">
                          <span className="nft-duration">Duration: {rental.duration}s</span>
                          <span className="nft-token">#{rental.tokenId}</span>
                        </div>
                      </div>
                      
                      <div className="rental-info">
                        <div className="rental-expires expired">
                          <strong>Expired:</strong>
                          <span className="expiry-date">{rental.rentedUntilDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🎧</div>
          <h3>No active rentals</h3>
          <p>Browse the marketplace to rent some music titles!</p>
        </div>
      )}
    </div>
  );
};

export default MyRentals;
