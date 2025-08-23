import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Tabs, Tab } from 'react-bootstrap';
import Wallet from './components/Wallet';
import Mint from './components/Mint';
import MyTitles from './components/MyTitles';
import MyRentals from './components/MyRentals';
import Marketplace from './components/Marketplace';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);

  return (
    <Container className="mt-5">
      <Row className="mb-3">
        <Col>
          <h1>TimeBoundBeats</h1>
        </Col>
        <Col>
          <Wallet 
            setProvider={setProvider} 
            setSigner={setSigner} 
            setAccount={setAccount} 
            account={account} 
          />
        </Col>
      </Row>
      <Tabs defaultActiveKey="marketplace" id="main-tabs" className="mb-3">
        <Tab eventKey="marketplace" title="Marketplace">
          <Marketplace provider={provider} signer={signer} account={account} />
        </Tab>
        <Tab eventKey="mint" title="Mint">
          <Mint signer={signer} />
        </Tab>
        <Tab eventKey="my-titles" title="My Titles">
          <MyTitles provider={provider} signer={signer} account={account} />
        </Tab>
        <Tab eventKey="my-rentals" title="My Rentals">
          <MyRentals provider={provider} signer={signer} account={account} />
        </Tab>
      </Tabs>
    </Container>
  );
}

export default App;
