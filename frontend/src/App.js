import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Tabs, Tab } from 'react-bootstrap';
import Wallet from './components/Wallet';
import Mint from './components/Mint';
import MyTitles from './components/MyTitles';
import MyRentals from './components/MyRentals';
import Marketplace from './components/Marketplace';
import NetworkSwitcher from './components/NetworkSwitcher';
import { NETWORKS, getContractAddresses, loadLocalDeployment } from './config/networks';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddresses, setContractAddresses] = useState(null);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Load contract addresses when network changes
  useEffect(() => {
    const loadContracts = async () => {
      console.log('App: Loading contracts for network:', currentNetwork);
      
      if (currentNetwork === 'local') {
        // Load local deployment addresses
        console.log('App: Loading local deployment...');
        const deployment = await loadLocalDeployment();
        console.log('App: Local deployment result:', deployment);
        if (deployment) {
          const addresses = {
            TimeBoundBeats: deployment.TimeBoundBeats,
            PaymentToken: deployment.MockUSDC || deployment.PaymentToken
          };
          console.log('App: Setting local contract addresses:', addresses);
          setContractAddresses(addresses);
        } else {
          console.log('App: No local deployment found');
        }
      } else if (currentNetwork) {
        // Use hardcoded addresses for other networks
        console.log('App: Loading addresses for network:', currentNetwork);
        const addresses = getContractAddresses(currentNetwork);
        console.log('App: Retrieved addresses:', addresses);
        setContractAddresses(addresses);
      } else {
        console.log('App: No current network set, skipping contract loading');
      }
    };

    if (currentNetwork) {
      loadContracts();
    }
  }, [currentNetwork]);

  // Handle network changes from NetworkSwitcher
  const handleNetworkChange = (networkKey, networkConfig) => {
    console.log('App: handleNetworkChange called with:', networkKey, networkConfig);
    setCurrentNetwork(networkKey);
    console.log('Network switched to:', networkConfig.name);
  };

  // Detect current network on component mount
  useEffect(() => {
    const detectNetwork = async () => {
      if (window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const chainIdNum = parseInt(chainId, 16);
          console.log('App: Detected chain ID:', chainIdNum);
          
          const networkKey = Object.keys(NETWORKS).find(key => NETWORKS[key].chainId === chainIdNum);
          if (networkKey) {
            console.log('App: Setting network to:', networkKey, NETWORKS[networkKey]);
            setCurrentNetwork(networkKey);
          } else {
            console.log('App: Unknown network for chain ID:', chainIdNum);
          }
        } catch (error) {
          console.error('Error detecting network:', error);
        }
      }
    };

    detectNetwork();
  }, []);

  return (
    <Container className="mt-5">
      <Row className="mb-3">
        <Col>
          <h1>TimeBoundBeats</h1>
        </Col>
        <Col className="d-flex justify-content-end align-items-center gap-3">
          <NetworkSwitcher 
            currentNetwork={currentNetwork}
            onNetworkChange={handleNetworkChange}
          />
          <Wallet 
            setProvider={setProvider} 
            setSigner={setSigner} 
            setAccount={setAccount} 
            account={account} 
          />
        </Col>
      </Row>
      <Tabs defaultActiveKey="marketplace" id="main-tabs" className="mb-3">
        <Tab eventKey="marketplace" title="🎧 Marketplace">
          <Marketplace 
            provider={provider} 
            signer={signer} 
            account={account} 
            refreshTrigger={refreshTrigger}
            contractAddresses={contractAddresses}
          />
        </Tab>
        <Tab eventKey="my-rentals" title="📜 My Rentals">
          <MyRentals 
            provider={provider} 
            signer={signer} 
            account={account} 
            refreshTrigger={refreshTrigger}
            contractAddresses={contractAddresses}
          />
        </Tab>
        <Tab eventKey="mint" title="🎤 Mint Titles">
          <Mint 
            signer={signer} 
            onMintSuccess={triggerRefresh}
            contractAddresses={contractAddresses}
          />
          {/* Debug info */}
          <div style={{padding: '10px', fontSize: '12px', color: '#666', borderTop: '1px solid #eee', marginTop: '20px'}}>
            <strong>Debug Info:</strong><br/>
            Current Network: {currentNetwork}<br/>
            Contract Addresses: {contractAddresses ? JSON.stringify(contractAddresses) : 'null'}<br/>
            TimeBoundBeats Address: {contractAddresses?.TimeBoundBeats || 'not set'}
          </div>
        </Tab>
        <Tab eventKey="my-titles" title="🎵 My Titles">
          <MyTitles 
            provider={provider} 
            signer={signer} 
            account={account} 
            refreshTrigger={refreshTrigger}
            contractAddresses={contractAddresses}
          />
        </Tab>
      </Tabs>
    </Container>
  );
}

export default App;
