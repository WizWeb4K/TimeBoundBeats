import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Form, Button, Card } from 'react-bootstrap';
import contractABI from '../contracts/TimeBoundBeats.json';

const abi = contractABI.abi;

const Mint = ({ signer, onMintSuccess, contractAddresses }) => {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [duration, setDuration] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
  };

  const handleMint = async (e) => {
    e.preventDefault();
    
    if (!signer) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    console.log('Mint: Contract addresses received:', contractAddresses);
    console.log('Mint: TimeBoundBeats address:', contractAddresses?.TimeBoundBeats);

    if (!contractAddresses?.TimeBoundBeats) {
      showNotification('Contract addresses not loaded yet', 'error');
      console.error('Mint: Contract addresses missing or TimeBoundBeats address is null/undefined');
      return;
    }

    if (contractAddresses.TimeBoundBeats === '0x0000000000000000000000000000000000000000') {
      showNotification('Invalid contract address (zero address)', 'error');
      console.error('Mint: Contract address is zero address');
      return;
    }

    setIsLoading(true);
    try {
      showNotification('Creating new title...', 'info');
      console.log('Mint: Creating contract with address:', contractAddresses.TimeBoundBeats);
      const contract = new ethers.Contract(contractAddresses.TimeBoundBeats, abi, signer);
      console.log('Mint: Contract created, calling mintTitle with:', { name, author, duration });
      const transaction = await contract.mintTitle(name, author, duration);
      console.log('Mint: Transaction sent:', transaction.hash);
      await transaction.wait();
      console.log('Mint: Transaction confirmed');
      showNotification('Title minted successfully!', 'success');
      
      // Reset form
      setName('');
      setAuthor('');
      setDuration('');
      
      // Notify parent to refresh data
      if (onMintSuccess) {
        onMintSuccess();
      }
    } catch (error) {
      console.error('Error minting title:', error);
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mint-container">
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

      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Mint a New Title</Card.Title>
            <Form onSubmit={handleMint}>
              <Form.Group className="mb-3">
                <Form.Label>Title Name</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter title name"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Author</Form.Label>
                <Form.Control
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Duration (in seconds)</Form.Label>
                <Form.Control
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Enter duration in seconds"
                  required
                />
              </Form.Group>
              <Button 
                variant="primary" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Minting...' : 'Mint Title'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    );
  };

export default Mint;
