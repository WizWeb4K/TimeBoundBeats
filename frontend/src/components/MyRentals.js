import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, ListGroup } from 'react-bootstrap';
import contractABI from '../contracts/TimeBoundBeats.json';
import deploymentAddresses from '../contracts/deployment.json';

const contractAddress = deploymentAddresses.TimeBoundBeats;
const abi = contractABI.abi;

const MyRentals = ({ provider, signer, account }) => {
  const [rentals, setRentals] = useState([]);

  useEffect(() => {
    const fetchRentals = async () => {
      if (provider && signer && account) {
        try {
          const contract = new ethers.Contract(contractAddress, abi, signer);
          const myRentals = await contract.getMyRentals();
          
          if (myRentals.length > 0) {
            const rentalsData = await Promise.all(
              myRentals.map(async (rental) => {
                const metadata = await contract.getTitleMetadata(rental.tokenId);
                const rentedUntilDate = new Date(Number(rental.rentedUntil) * 1000).toLocaleString();
                return { 
                  tokenId: Number(rental.tokenId),
                  renter: rental.renter,
                  rentedUntil: Number(rental.rentedUntil),
                  name: metadata[0],
                  author: metadata[1], 
                  duration: Number(metadata[2]),
                  rentedUntilDate 
                };
              })
            );
            setRentals(rentalsData);
          } else {
            setRentals([]); // User has no active rentals
          }
        } catch (error) {
          console.error('Error fetching rentals:', error);
          setRentals([]); // Set empty array on error
        }
      }
    };

    fetchRentals();
  }, [provider, signer, account]);

  return (
    <Card className="mt-4">
      <Card.Body>
        <Card.Title>My Rentals</Card.Title>
        {rentals.length > 0 ? (
          <ListGroup>
            {rentals.map((rental) => (
              <ListGroup.Item key={rental.tokenId.toString()}>
                <strong>{rental.name}</strong> by {rental.author} (Rented until: {rental.rentedUntilDate})
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <p>You have no active rentals.</p>
        )}
      </Card.Body>
    </Card>
  );
};

export default MyRentals;
