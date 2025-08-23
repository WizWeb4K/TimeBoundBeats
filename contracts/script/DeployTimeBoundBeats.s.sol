// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/TimeBoundBeats.sol";
import "../src/MockUSDC.sol";

contract DeployTimeBoundBeats is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockUSDC for testing
        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed to:", address(mockUSDC));
        
        // Deploy TimeBoundBeats contract
        TimeBoundBeats timeBoundBeats = new TimeBoundBeats();
        console.log("TimeBoundBeats deployed to:", address(timeBoundBeats));
        
        // Set the payment token to MockUSDC
        timeBoundBeats.setPaymentToken(address(mockUSDC));
        console.log("Payment token set to MockUSDC");
        
        // Distribute 1000 USDC to each default Anvil address
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
        
        console.log("Distributing 1000 USDC to Anvil addresses...");
        for (uint256 i = 0; i < anvilAddresses.length; i++) {
            mockUSDC.mint(anvilAddresses[i], distributionAmount);
        }
        console.log("USDC distribution complete");
        
        vm.stopBroadcast();
        
        console.log("=== Deployment Summary ===");
        console.log("Network: Local Anvil (Chain ID: 31337)");
        console.log("TimeBoundBeats:", address(timeBoundBeats));
        console.log("MockUSDC:", address(mockUSDC));
    }
}
