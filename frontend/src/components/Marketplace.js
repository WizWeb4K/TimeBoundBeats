import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, ListGroup, Form, Button } from 'react-bootstrap';
import contractABI from '../contracts/TimeBoundBeats.json';
import deploymentAddresses from '../contracts/deployment.json';
import IERC20ABI from '../contracts/IERC20.json';

const contractAddress = deploymentAddresses.TimeBoundBeats;
const abi = contractABI.abi;

const Marketplace = ({ provider, signer, account }) => {
  const [allTitles, setAllTitles] = useState([]);
  const [rentalDuration, setRentalDuration] = useState({});

  const fetchAllTitles = async () => {
    if (provider) {
      try {
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const totalSupply = await contract.totalSupply();
        const titlesData = await Promise.all(
          [...Array(Number(totalSupply)).keys()].map(async (i) => {
            const tokenId = await contract.tokenByIndex(i);
            const metadata = await contract.getTitleMetadata(tokenId);
            const owner = await contract.ownerOf(tokenId);
            return { 
              tokenId: Number(tokenId), // Convert BigInt to number
              owner, 
              name: metadata[0],        // name is at index 0
              author: metadata[1],      // author is at index 1  
              duration: Number(metadata[2]) // duration is at index 2, convert BigInt
            };
          })
        );
        setAllTitles(titlesData.filter(title => title.owner.toLowerCase() !== account?.toLowerCase()));
      } catch (error) {
        console.error('Error fetching all titles:', error);
      }
    }
  };

  useEffect(() => {
    fetchAllTitles();
  }, [provider, account, fetchAllTitles]);

  const handleRent = async (tokenId) => {
    if (!signer) {
      alert('Please connect your wallet first.');
      return;
    }
    const duration = rentalDuration[tokenId];
    if (!duration || duration <= 0) {
        alert('Please enter a valid rental duration.');
        return;
    }

    try {
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      // Get payment token address and create payment token contract
      const paymentTokenAddress = await contract.paymentToken();
      const paymentToken = new ethers.Contract(paymentTokenAddress, IERC20ABI.abi, signer);
      
      // Calculate rental cost
      const rentalFee = await contract.rentalFee();
      const totalCost = rentalFee * ethers.getBigInt(duration);
      
      // Check allowance
      const allowance = await paymentToken.allowance(account, contractAddress);
      if (allowance < totalCost) {
        alert(`Please approve MockUSDC spending first. Approving ${ethers.formatUnits(totalCost, 6)} MOCKUSDC...`);
        const approvalTx = await paymentToken.approve(contractAddress, totalCost);
        await approvalTx.wait();
        alert('Approval successful! Now proceeding with rental...');
      }
      
      const transaction = await contract.rentTitle(tokenId, duration);
      await transaction.wait();
      alert('Title rented successfully!');
      fetchAllTitles(); // Refresh list after renting
    } catch (error) {
      console.error('Error renting title:', error);
      alert('Error renting title. See console for details.');
    }
  };

  const handleDurationChange = (tokenId, value) => {
    setRentalDuration(prev => ({ ...prev, [tokenId]: value }));
  }

  return (
    <Card className="mt-4">
      <Card.Body>
        <Card.Title>Marketplace</Card.Title>
        {allTitles.length > 0 ? (
          <ListGroup>
            {allTitles.map((title) => (
              <ListGroup.Item key={title.tokenId.toString()} className="d-flex justify-content-between align-items-center">
                <div>
                    <strong>{title.name}</strong> by {title.author} (Duration: {title.duration.toString()}s)
                </div>
                <div className="d-flex align-items-center">
                    <Form.Control
                        type="number"
                        placeholder="Duration in seconds"
                        className="me-2"
                        style={{ width: '180px' }}
                        onChange={(e) => handleDurationChange(title.tokenId, e.target.value)}
                    />
                    <Button variant="success" onClick={() => handleRent(title.tokenId)}>Rent</Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <p>No titles available for rent.</p>
        )}
      </Card.Body>
    </Card>
  );
};

export default Marketplace;
