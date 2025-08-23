import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, ListGroup } from 'react-bootstrap';
import contractABI from '../contracts/TimeBoundBeats.json';
import deploymentAddresses from '../contracts/deployment.json';

const contractAddress = deploymentAddresses.TimeBoundBeats;
const abi = contractABI.abi;

const MyTitles = ({ provider, signer, account }) => {
  const [titles, setTitles] = useState([]);

  useEffect(() => {
    const fetchTitles = async () => {
      if (provider && signer && account) {
        try {
          const contract = new ethers.Contract(contractAddress, abi, signer);
          
          // Debug logging
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
  }, [provider, signer, account]);

  return (
    <Card className="mt-4">
      <Card.Body>
        <Card.Title>My Titles</Card.Title>
        {titles.length > 0 ? (
          <ListGroup>
            {titles.map((title) => (
              <ListGroup.Item key={title.tokenId.toString()}>
                <strong>{title.name}</strong> by {title.author} (Duration: {title.duration.toString()}s)
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <p>You don't own any titles yet.</p>
        )}
      </Card.Body>
    </Card>
  );
};

export default MyTitles;
