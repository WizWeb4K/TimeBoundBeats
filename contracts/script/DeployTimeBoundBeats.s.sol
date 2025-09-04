// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/TimeBoundBeats.sol";
import "../src/MockUSDC.sol";

contract DeployTimeBoundBeats is Script {
    // Known USDC addresses on different networks
    mapping(uint256 => address) public usdcAddresses;
    
    function setUp() public {
        // Mainnet USDC
        usdcAddresses[1] = 0xa0b86a33e6441B0d88d3c2f71c5c27Bd4d3bc0EF;
        // Sepolia USDC
        usdcAddresses[11155111] = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
        // Arbitrum One USDC
        usdcAddresses[42161] = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        // Polygon USDC
        usdcAddresses[137] = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 chainId = block.chainid;
        
        console.log("=== TimeBoundBeats Deployment Script ===");
        console.log("Chain ID:", chainId);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        vm.startBroadcast(deployerPrivateKey);
        
        address paymentTokenAddress;
        
        // Deploy or use existing USDC based on network
        if (usdcAddresses[chainId] != address(0)) {
            // Use existing USDC on this network
            paymentTokenAddress = usdcAddresses[chainId];
            console.log("Using existing USDC at:", paymentTokenAddress);
        } else {
            // Deploy MockUSDC for testnets or local development
            console.log("Deploying MockUSDC for testing...");
            MockUSDC mockUSDC = new MockUSDC();
            paymentTokenAddress = address(mockUSDC);
            console.log("MockUSDC deployed to:", paymentTokenAddress);
            
            // If this is local development (Anvil), distribute tokens
            if (chainId == 31337) {
                console.log("Distributing MockUSDC to Anvil addresses...");
                distributeToAnvilAddresses(mockUSDC);
            }
        }
        
        // Deploy TimeBoundBeats contract
        console.log("Deploying TimeBoundBeats contract...");
        TimeBoundBeats timeBoundBeats = new TimeBoundBeats();
        console.log("TimeBoundBeats deployed to:", address(timeBoundBeats));
        
        // Configure the contract
        console.log("Configuring TimeBoundBeats...");
        timeBoundBeats.setPaymentToken(paymentTokenAddress);
        console.log("Payment token set to:", paymentTokenAddress);
        
        // Set initial rental fee (12 per second = ~1 USDC per day)
        timeBoundBeats.setRentalFee(12);
        console.log("Rental fee set to: 12 (~1 USDC/day)");
        
        // Set platform fee to 0.3% (30 basis points)
        timeBoundBeats.setPlatformFeeBPS(30);
        console.log("Platform fee set to: 30 BPS (0.3%)");
        
        vm.stopBroadcast();
        
        // Deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Network:", getNetworkName(chainId));
        console.log("Chain ID:", chainId);
        console.log("TimeBoundBeats:", address(timeBoundBeats));
        console.log("Payment Token:", paymentTokenAddress);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        // Verification instructions
        if (chainId != 31337) {
            console.log("\n=== Verification Commands ===");
            console.log("Verify TimeBoundBeats:");
            console.log("forge verify-contract", address(timeBoundBeats), "src/TimeBoundBeats.sol:TimeBoundBeats --chain-id", chainId);
            
            if (usdcAddresses[chainId] == address(0)) {
                console.log("Verify MockUSDC:");
                console.log("forge verify-contract", paymentTokenAddress, "src/MockUSDC.sol:MockUSDC --chain-id", chainId);
            }
        }
        
        // Save deployment addresses to network-specific file for frontend
        string memory networkName = getNetworkSlug(chainId);
        string memory fileName = string(abi.encodePacked("deployments-", networkName, ".json"));
        
        string memory deploymentInfo = string(abi.encodePacked(
            '{\n',
            '  "chainId": ', vm.toString(chainId), ',\n',
            '  "network": "', getNetworkName(chainId), '",\n',
            '  "contracts": {\n',
            '    "TimeBoundBeats": "', vm.toString(address(timeBoundBeats)), '",\n',
            '    "PaymentToken": "', vm.toString(paymentTokenAddress), '"\n',
            '  },\n',
            '  "config": {\n',
            '    "rentalFee": 12,\n',
            '    "platformFeeBPS": 30\n',
            '  },\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "deployer": "', vm.toString(vm.addr(deployerPrivateKey)), '"\n',
            '}'
        ));
        
        vm.writeFile(fileName, deploymentInfo);
        console.log(string(abi.encodePacked("\nDeployment info saved to ", fileName)));
    }
    
    function distributeToAnvilAddresses(MockUSDC mockUSDC) internal {
        address[10] memory anvilAddresses = [
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
            0x90F79bf6EB2c4f870365E785982E1f101E93b906,
            0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,
            0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc,
            0x976EA74026E726554dB657fA54763abd0C3a0aa9,
            0x14dC79964da2C08b23698B3D3cc7Ca32193d9955,
            0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f,
            0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
        ];
        
        uint256 distributionAmount = 1000 * 10**6; // 1000 USDC with 6 decimals
        
        for (uint256 i = 0; i < anvilAddresses.length; i++) {
            mockUSDC.mint(anvilAddresses[i], distributionAmount);
        }
        console.log("Distributed 1000 MockUSDC to each Anvil address");
    }
    
    function getNetworkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "Ethereum Mainnet";
        if (chainId == 11155111) return "Sepolia Testnet";
        if (chainId == 5) return "Goerli Testnet";
        if (chainId == 137) return "Polygon Mainnet";
        if (chainId == 42161) return "Arbitrum One";
        if (chainId == 10) return "Optimism";
        if (chainId == 31337) return "Local Anvil";
        return "Unknown Network";
    }
    
    function getNetworkSlug(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "mainnet";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 5) return "goerli";
        if (chainId == 137) return "polygon";
        if (chainId == 42161) return "arbitrum";
        if (chainId == 10) return "optimism";
        if (chainId == 31337) return "anvil";
        return "unknown";
    }
}
