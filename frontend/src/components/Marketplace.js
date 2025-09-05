import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form } from 'react-bootstrap';
import { ethers } from 'ethers';
import contractABI from '../contracts/TimeBoundBeats.json';
import IERC20ABI from '../contracts/IERC20.json';
import '../styles/marketplace.css';

const abi = contractABI.abi;
const erc20Abi = IERC20ABI.abi;

const Marketplace = ({ provider, signer, account, refreshTrigger, contractAddresses }) => {
  const [allTitles, setAllTitles] = useState([]);
  const [filteredTitles, setFilteredTitles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [rentalDays, setRentalDays] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [pricePerDay, setPricePerDay] = useState(0);

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
  };

  // Search functionality
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredTitles(allTitles);
    } else {
      const filtered = allTitles.filter(title => 
        title.name.toLowerCase().includes(term.toLowerCase()) ||
        title.author.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredTitles(filtered);
    }
  };

  // Cart functionality
  const addToCart = (title) => {
    const isInCart = cart.some(item => item.tokenId === title.tokenId);
    if (!isInCart) {
      setCart([...cart, title]);
    }
  };

  const removeFromCart = (tokenId) => {
    setCart(cart.filter(item => item.tokenId !== tokenId));
  };

  const fetchAllTitles = useCallback(async () => {
    // Don't fetch if contract addresses aren't loaded yet
    if (!contractAddresses?.TimeBoundBeats) {
      console.log('Contract addresses not loaded yet');
      return;
    }

    // Create a read-only provider if wallet is not connected
    if (!provider && !window.ethereum) {
      return;
    }

    try {
      // Use provider for read-only operations
      const readOnlyProvider = provider || new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
      console.log('Using contract address:', contractAddresses.TimeBoundBeats);
      console.log('Using provider network:', await readOnlyProvider.getNetwork());
      
      // First verify the contract exists at this address
      const code = await readOnlyProvider.getCode(contractAddresses.TimeBoundBeats);
      console.log('Contract code length:', code.length);
      if (code === '0x') {
        throw new Error(`No contract deployed at address ${contractAddresses.TimeBoundBeats} on current network`);
      }
      
      const contract = new ethers.Contract(contractAddresses.TimeBoundBeats, abi, readOnlyProvider);
      
      // Get rental fee from contract for price display
      const rentalFee = await contract.rentalFee();
      const dailyPrice = Number(rentalFee) * 24 * 60 * 60; // rentalFee is per second, convert to per day
      setPricePerDay(dailyPrice);
      console.log('Rental fee per second:', rentalFee.toString());
      console.log('Daily price:', dailyPrice);
      
      // Get total supply
      const totalSupply = await contract.totalSupply();
      console.log('Total supply:', totalSupply.toString());
      const allTitles = [];

      // Fetch titles
      for (let i = 0; i < totalSupply; i++) {
        try {
          const tokenId = await contract.tokenByIndex(i);
          const metadata = await contract.titleMetadata(tokenId);
          const owner = await contract.ownerOf(tokenId);
          
          // Show all titles except the ones owned by current user (if logged in)
          const isRentable = !account || owner.toLowerCase() !== account.toLowerCase();
          
          if (isRentable) {
            allTitles.push({
              tokenId: Number(tokenId),
              name: metadata.name,
              author: metadata.author,
              duration: Number(metadata.duration),
              owner: owner
            });
          }
        } catch (error) {
          console.error(`Error fetching title ${i}:`, error);
        }
      }

      const availableTitles = allTitles.filter(title => title);
      if (availableTitles.length > 0) {
        console.log(`Found ${availableTitles.length} available titles for rental`);
        setAllTitles(availableTitles);
        setFilteredTitles(availableTitles);
      }
    } catch (error) {
      console.error('Error fetching all titles:', error);
    }
  }, [contractAddresses?.TimeBoundBeats, provider, account]);

  useEffect(() => {
    fetchAllTitles();
  }, [fetchAllTitles]); // Remove refreshTrigger and contractAddresses to fix dependency warning

  useEffect(() => {
    const calcPrice = async () => {
      if (cart.length === 0 || !provider || !contractAddresses?.TimeBoundBeats) return;
      
      try {
        console.log('Fetching all titles from contract...');
        console.log('Using contract address:', contractAddresses.TimeBoundBeats);
        console.log('Using provider:', provider);
        
        const contract = new ethers.Contract(contractAddresses.TimeBoundBeats, abi, provider);
        console.log('Contract instance created');
        
        // First verify the contract exists at this address
        const code = await provider.getCode(contractAddresses.TimeBoundBeats);
        console.log('Contract code length:', code.length);
        if (code === '0x') {
          throw new Error(`No contract deployed at address ${contractAddresses.TimeBoundBeats}`);
        }
        
        const totalSupply = await contract.totalSupply();
        console.log('Total supply:', totalSupply.toString());
        
        const rentalFee = await contract.rentalFee();
        const daysInSeconds = rentalDays * 24 * 60 * 60;
        const total = cart.length * Number(rentalFee) * daysInSeconds;
        setTotalPrice(total);
      } catch (error) {
        console.error('Error calculating price:', error);
      }
    };

    calcPrice();
  }, [cart, rentalDays, provider, contractAddresses?.TimeBoundBeats]);

  const handleBatchRental = async () => {
    if (!signer) {
      showNotification('Please connect your wallet first.', 'warning');
      return;
    }
    
    if (cart.length === 0) {
      showNotification('Your cart is empty.', 'warning');
      return;
    }

    if (!contractAddresses?.TimeBoundBeats) {
      showNotification('Contract addresses not loaded yet', 'error');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting rental transaction on Sepolia...');
      console.log('Contract addresses:', contractAddresses);
      console.log('Account:', account);
      console.log('Cart:', cart);
      console.log('Rental days:', rentalDays);
      console.log('Total price:', totalPrice);

      const contract = new ethers.Contract(contractAddresses.TimeBoundBeats, abi, signer);
      console.log('Created contract instance');

      const paymentToken = await contract.paymentToken();
      console.log('Payment token address:', paymentToken);
      
      const erc20Contract = new ethers.Contract(paymentToken, erc20Abi, signer);
      console.log('Created ERC20 contract instance');
      
      const daysInSeconds = rentalDays * 24 * 60 * 60;
      const tokenIds = cart.map(item => item.tokenId);
      console.log('Token IDs to rent:', tokenIds);
      console.log('Duration in seconds:', daysInSeconds);

      // Check user's payment token balance
      const balance = await erc20Contract.balanceOf(account);
      console.log('User balance:', ethers.formatUnits(balance, 6), 'USDC');
      console.log('Required amount:', ethers.formatUnits(totalPrice, 6), 'USDC');

      if (balance < totalPrice) {
        throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, 6)} USDC but need ${ethers.formatUnits(totalPrice, 6)} USDC`);
      }
      
      // Check allowance
      const allowance = await erc20Contract.allowance(account, contractAddresses.TimeBoundBeats);
      console.log('Current allowance:', ethers.formatUnits(allowance, 6), 'USDC');
      
      if (allowance < totalPrice) {
        showNotification(`Approving ${ethers.formatUnits(totalPrice, 6)} USDC spending...`, 'info');
        console.log('Sending approval transaction...');
        
        // Estimate gas for approval
        const approvalGasEstimate = await erc20Contract.approve.estimateGas(contractAddresses.TimeBoundBeats, totalPrice);
        console.log('Approval gas estimate:', approvalGasEstimate.toString());
        
        const approvalTx = await erc20Contract.approve(contractAddresses.TimeBoundBeats, totalPrice, {
          gasLimit: approvalGasEstimate * 120n / 100n // Add 20% buffer
        });
        console.log('Approval transaction sent:', approvalTx.hash);
        
        const approvalReceipt = await approvalTx.wait();
        console.log('Approval confirmed in block:', approvalReceipt.blockNumber);
        showNotification('Approval successful! Processing rental...', 'success');
      }
      
      // Use batch rental if multiple titles, single rental if one title
      let transaction;
      if (cart.length > 1) {
        showNotification(`Processing batch rental for ${cart.length} titles...`, 'info');
        console.log('Estimating gas for batch rental...');
        
        const gasEstimate = await contract.rentTitleBatch.estimateGas(tokenIds, daysInSeconds);
        console.log('Batch rental gas estimate:', gasEstimate.toString());
        
        transaction = await contract.rentTitleBatch(tokenIds, daysInSeconds, {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        });
      } else {
        showNotification('Processing rental...', 'info');
        console.log('Estimating gas for single rental...');
        
        const gasEstimate = await contract.rentTitle.estimateGas(tokenIds[0], daysInSeconds);
        console.log('Single rental gas estimate:', gasEstimate.toString());
        
        transaction = await contract.rentTitle(tokenIds[0], daysInSeconds, {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        });
      }
      
      console.log('Rental transaction sent:', transaction.hash);
      const receipt = await transaction.wait();
      console.log('Rental confirmed in block:', receipt.blockNumber);
      
      showNotification(`Successfully rented ${cart.length} title(s) for ${rentalDays} day(s)!`, 'success');
      setCart([]);
      setShowCart(false);
      fetchAllTitles();
    } catch (error) {
      console.error('Detailed error renting titles:', error);
      
      let errorMessage = 'Error processing rental. Please try again.';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees. Please add ETH to your wallet.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user.';
      } else if (error.message.includes('Insufficient balance')) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = `Transaction failed: ${error.reason}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="marketplace-container">
      {/* Notification Bar */}
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          <span className="notification-message">{notification.message}</span>
          <button 
            className="notification-close"
            onClick={() => setNotification({ show: false, message: '', type: '' })}
          >
            ✕
          </button>
        </div>
      )}

      <div className="marketplace-header">
        <h2 className="marketplace-title">Music Licensing Platform</h2>
        <p className="marketplace-subtitle">Discover and license music titles for your events</p>
      </div>

      {/* Search and Cart Controls */}
      <div className="marketplace-controls">
        <div className="search-container">
          <Form.Control
            type="text"
            placeholder="Search by title or artist..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="cart-controls">
          <Button 
            variant="outline-primary" 
            onClick={() => setShowCart(!showCart)}
            className="cart-button"
          >
            🛒 Cart ({cart.length})
          </Button>
        </div>
      </div>

      {/* Shopping Cart */}
      {showCart && (
        <div className="shopping-cart">
          <div className="cart-header">
            <h3>Shopping Cart</h3>
            <Button variant="link" onClick={() => setShowCart(false)}>✕</Button>
          </div>
          
          {cart.length > 0 ? (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <div key={item.tokenId} className="cart-item">
                    <div className="cart-item-info">
                      <strong>{item.name}</strong> by {item.author}
                    </div>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => removeFromCart(item.tokenId)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="cart-summary">
                <div className="rental-period">
                  <label>Rental Period (days):</label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={rentalDays}
                    onChange={(e) => setRentalDays(Number(e.target.value))}
                    className="days-input"
                  />
                </div>
                
                <div className="price-display">
                  <strong>Total Price: {ethers.formatUnits(totalPrice, 6)} USDC</strong>
                </div>
                
                <Button 
                  variant="success" 
                  onClick={handleBatchRental}
                  className="checkout-button"
                  disabled={!signer || isLoading}
                >
                  {isLoading ? 'Processing...' : !signer ? 'Connect Wallet to Rent' : 'Complete Rental'}
                </Button>
              </div>
            </>
          ) : (
            <p>Your cart is empty. Add titles from below!</p>
          )}
        </div>
      )}
      
      {/* Title Grid */}
      {filteredTitles.length > 0 ? (
        <div className="nft-grid">
          {filteredTitles.map((title) => {
            const isInCart = cart.some(item => item.tokenId === title.tokenId);
            return (
              <div key={title.tokenId} className="nft-card">
                <div className="nft-image">
                  <div className="nft-placeholder">
                    🎵
                  </div>
                </div>
                
                <div className="nft-content">
                  <div className="nft-info">
                    <h4 className="nft-title">{title.name}</h4>
                    <p className="nft-author">by {title.author}</p>
                    <div className="nft-details">
                      <span className="nft-duration">Duration: {title.duration}s</span>
                      <span className="nft-token">#{title.tokenId}</span>
                    </div>
                    <div className="nft-price">
                      <strong>{ethers.formatUnits(pricePerDay, 6)} USDC/day</strong>
                    </div>
                  </div>
                  
                  <div className="nft-actions">
                    <Button 
                      variant={isInCart ? "secondary" : "primary"}
                      onClick={() => isInCart ? removeFromCart(title.tokenId) : addToCart(title)}
                      className="add-to-cart-button"
                      disabled={isInCart}
                    >
                      {isInCart ? "In Cart" : "Add to Cart"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🎼</div>
          <h3>{searchTerm ? 'No titles found' : 'No titles available'}</h3>
          <p>{searchTerm ? 'Try different search terms' : 'Check back later for new music titles!'}</p>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
