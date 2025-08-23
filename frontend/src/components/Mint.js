import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Form, Button, Card } from 'react-bootstrap';
import contractABI from '../contracts/TimeBoundBeats.json';
import deploymentAddresses from '../contracts/deployment.json';

const contractAddress = deploymentAddresses.TimeBoundBeats;
const abi = contractABI.abi;

const Mint = ({ signer }) => {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [duration, setDuration] = useState('');

  const handleMint = async (e) => {
    e.preventDefault();
    if (!signer) {
      alert('Please connect your wallet first.');
      return;
    }

    try {
      const contract = new ethers.Contract(contractAddress, abi, signer);
      const transaction = await contract.mintTitle(name, author, duration);
      await transaction.wait();
      alert('Title minted successfully!');
      setName('');
      setAuthor('');
      setDuration('');
    } catch (error) {
      console.error('Error minting title:', error);
      alert('Error minting title. See console for details.');
    }
  };

  return (
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
          <Button variant="primary" type="submit">
            Mint Title
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default Mint;
