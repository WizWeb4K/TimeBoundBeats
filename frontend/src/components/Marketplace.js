import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Form, Button } from 'react-bootstrap';
import contractABI from '../contracts/TimeBoundBeats.json';
import deploymentAddresses from '../contracts/deployment.json';
import IERC20ABI from '../contracts/IERC20.json';
import '../styles/marketplace.css';

const contractAddress = deploymentAddresses.TimeBoundBeats;
const abi = contractABI.abi;

const Marketplace = ({ provider, signer, account, refreshTrigger }) => {
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

  const fetchAllTitles = async () => {
    // Create a read-only provider if none exists (for wallet-less browsing)
    let readProvider = provider;
    if (!provider && window.ethereum) {
      try {
        readProvider = new ethers.BrowserProvider(window.ethereum);
      } catch (error) {
        console.log('Unable to create read-only provider');
        return;
      }
    } else if (!provider && !window.ethereum) {
      console.log('No wallet or provider available');
      return;
    }

    if (readProvider) {
      try {
        const contract = new ethers.Contract(contractAddress, abi, readProvider);
        const totalSupply = await contract.totalSupply();
        
        // Fetch rental fee for price calculation
        const rentalFee = await contract.rentalFee();
        const dailyPrice = Number(rentalFee) * 24 * 60 * 60; // Convert per-second fee to per-day
        setPricePerDay(dailyPrice);
        
        const titlesData = await Promise.all(
          [...Array(Number(totalSupply)).keys()].map(async (i) => {
            const tokenId = await contract.tokenByIndex(i);
            const metadata = await contract.getTitleMetadata(tokenId);
            const owner = await contract.ownerOf(tokenId);
            return { 
              tokenId: Number(tokenId),
              owner, 
              name: metadata[0],
              author: metadata[1],  
              duration: Number(metadata[2]),
              pricePerDay: dailyPrice
            };
          })
        );
        
        // Filter out user's own titles only if wallet is connected
        const availableTitles = account 
          ? titlesData.filter(title => title.owner.toLowerCase() !== account.toLowerCase())
          : titlesData; // Show all titles if no wallet connected
          
        setAllTitles(availableTitles);
        setFilteredTitles(availableTitles);
      } catch (error) {
        console.error('Error fetching all titles:', error);
      }
    }
  };

  useEffect(() => {
    fetchAllTitles();
  }, [provider, account, refreshTrigger]);

  useEffect(() => {
    const calcPrice = async () => {
      if (cart.length === 0 || !provider) return;
      
      try {
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const rentalFee = await contract.rentalFee();
        const daysInSeconds = rentalDays * 24 * 60 * 60;
        const total = cart.length * Number(rentalFee) * daysInSeconds;
        setTotalPrice(total);
      } catch (error) {
        console.error('Error calculating price:', error);
      }
    };
    calcPrice();
  }, [cart, rentalDays, provider]);

  const handleBatchRental = async () => {
    if (!signer) {
      showNotification('Please connect your wallet first.', 'warning');
      return;
    }
    if (cart.length === 0) {
      showNotification('Please add titles to cart first.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, abi, signer);
      const paymentTokenAddress = await contract.paymentToken();
      const paymentToken = new ethers.Contract(paymentTokenAddress, IERC20ABI.abi, signer);
      
      const daysInSeconds = rentalDays * 24 * 60 * 60;
      const tokenIds = cart.map(item => item.tokenId);
      
      // Check allowance
      const allowance = await paymentToken.allowance(account, contractAddress);
      if (allowance < totalPrice) {
        showNotification(`Approving ${ethers.formatUnits(totalPrice, 6)} MockUSDC spending...`, 'info');
        const approvalTx = await paymentToken.approve(contractAddress, totalPrice);
        await approvalTx.wait();
        showNotification('Approval successful! Processing rental...', 'success');
      }
      
      // Use batch rental if multiple titles, single rental if one title
      let transaction;
      if (cart.length > 1) {
        showNotification(`Processing batch rental for ${cart.length} titles...`, 'info');
        transaction = await contract.rentTitleBatch(tokenIds, daysInSeconds);
      } else {
        showNotification('Processing rental...', 'info');
        transaction = await contract.rentTitle(tokenIds[0], daysInSeconds);
      }
      
      await transaction.wait();
      showNotification(`Successfully rented ${cart.length} title(s) for ${rentalDays} day(s)!`, 'success');
      setCart([]);
      setShowCart(false);
      fetchAllTitles();
    } catch (error) {
      console.error('Error renting titles:', error);
      showNotification('Error processing rental. Please try again.', 'error');
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
                  <strong>Total Price: {ethers.formatUnits(totalPrice, 6)} MockUSDC</strong>
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
