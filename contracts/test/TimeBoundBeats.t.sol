// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/TimeBoundBeats.sol";
import "../src/MockUSDC.sol";

contract TimeBoundBeatsTest is Test {
    TimeBoundBeats public timeBoundBeats;
    MockUSDC public mockUSDC;
    
    address public owner;
    address public user1;
    address public user2;
    address public user3;
    
    // Test constants
    string constant TITLE_NAME = "Kerstins Song";
    string constant AUTHOR = "Kerstin";
    uint256 constant DURATION = 180; // 3 minutes
    uint256 constant RENTAL_DURATION = 86400; // 24 hours
    uint256 constant INITIAL_USDC_BALANCE = 1000 * 10**6; // 1000 USDC
    
    function setUp() public {
        // Set up addresses
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        // Deploy contracts
        timeBoundBeats = new TimeBoundBeats();
        mockUSDC = new MockUSDC();
        
        // Set payment token
        timeBoundBeats.setPaymentToken(address(mockUSDC));
        
        // Give users some USDC for testing
        mockUSDC.mint(user1, INITIAL_USDC_BALANCE);
        mockUSDC.mint(user2, INITIAL_USDC_BALANCE);
        mockUSDC.mint(user3, INITIAL_USDC_BALANCE);
        
        // Set up approvals for rental payments
        vm.prank(user1);
        mockUSDC.approve(address(timeBoundBeats), type(uint256).max);
        
        vm.prank(user2);
        mockUSDC.approve(address(timeBoundBeats), type(uint256).max);
        
        vm.prank(user3);
        mockUSDC.approve(address(timeBoundBeats), type(uint256).max);
    }
    
    // ========== Constructor Tests ==========
    
    function testConstructor() public {
        assertEq(timeBoundBeats.name(), "TimeBoundBeatsNFT");
        assertEq(timeBoundBeats.symbol(), "TBB");
        assertEq(timeBoundBeats.owner(), owner);
        assertEq(timeBoundBeats.rentalFee(), 12);
        assertEq(timeBoundBeats.platformFeeBPS(), 30);
    }
    
    // ========== Minting Tests ==========
    
    function testMintTitle() public {
        vm.prank(user1);
        timeBoundBeats.mintTitle(TITLE_NAME, AUTHOR, DURATION);
        
        // Check ownership
        assertEq(timeBoundBeats.ownerOf(0), user1);
        assertEq(timeBoundBeats.balanceOf(user1), 1);
        
        // Check metadata
        TitleMetadata memory metadata = timeBoundBeats.getTitleMetadata(0);
        assertEq(metadata.name, TITLE_NAME);
        assertEq(metadata.author, AUTHOR);
        assertEq(metadata.duration, DURATION);
        
        // Check author mapping
        uint256[] memory authorTitles = timeBoundBeats.getTitlesByAuthor(AUTHOR);
        assertEq(authorTitles.length, 1);
        assertEq(authorTitles[0], 0);
    }
    
    function testMintMultipleTitles() public {
        vm.startPrank(user1);
        timeBoundBeats.mintTitle("Song 1", AUTHOR, 180);
        timeBoundBeats.mintTitle("Song 2", AUTHOR, 240);
        timeBoundBeats.mintTitle("Song 3", "Different Author", 300);
        vm.stopPrank();
        
        assertEq(timeBoundBeats.balanceOf(user1), 3);
        
        // Check author mapping for Kerstin
        uint256[] memory kerstinTitles = timeBoundBeats.getTitlesByAuthor(AUTHOR);
        assertEq(kerstinTitles.length, 2);
        assertEq(kerstinTitles[0], 0);
        assertEq(kerstinTitles[1], 1);
        
        // Check author mapping for Different Author
        uint256[] memory differentAuthorTitles = timeBoundBeats.getTitlesByAuthor("Different Author");
        assertEq(differentAuthorTitles.length, 1);
        assertEq(differentAuthorTitles[0], 2);
    }
    
    function testMintTitleEvent() public {
        vm.expectEmit(true, false, false, true);
        emit TitleMinted(0, TITLE_NAME, AUTHOR);
        
        vm.prank(user1);
        timeBoundBeats.mintTitle(TITLE_NAME, AUTHOR, DURATION);
    }
    
    // ========== Title Retrieval Tests ==========
    
    function testGetMyTitles() public {
        // Mint titles for user1
        vm.startPrank(user1);
        timeBoundBeats.mintTitle("Song 1", AUTHOR, 180);
        timeBoundBeats.mintTitle("Song 2", AUTHOR, 240);
        vm.stopPrank();
        
        // Mint title for user2
        vm.prank(user2);
        timeBoundBeats.mintTitle("Song 3", "Other Author", 300);
        
        // Check user1's titles
        vm.prank(user1);
        uint256[] memory user1Titles = timeBoundBeats.getMyTitles();
        assertEq(user1Titles.length, 2);
        assertEq(user1Titles[0], 0);
        assertEq(user1Titles[1], 1);
        
        // Check user2's titles
        vm.prank(user2);
        uint256[] memory user2Titles = timeBoundBeats.getMyTitles();
        assertEq(user2Titles.length, 1);
        assertEq(user2Titles[0], 2);
    }
    
    function testGetTitleMetadataInvalidToken() public {
        vm.expectRevert(abi.encodeWithSignature("ERC721NonexistentToken(uint256)", 999));
        timeBoundBeats.getTitleMetadata(999);
    }
    
    // ========== Rental Tests ==========
    
    function testRentTitle() public {
        // User1 mints a title
        vm.prank(user1);
        timeBoundBeats.mintTitle(TITLE_NAME, AUTHOR, DURATION);
        
        // User2 rents the title
        uint256 expectedFee = RENTAL_DURATION * timeBoundBeats.rentalFee();
        uint256 expectedPlatformFee = expectedFee * timeBoundBeats.platformFeeBPS() / 10000;
        uint256 expectedOwnerFee = expectedFee - expectedPlatformFee;
        
        uint256 user1BalanceBefore = mockUSDC.balanceOf(user1);
        uint256 ownerBalanceBefore = mockUSDC.balanceOf(owner);
        uint256 user2BalanceBefore = mockUSDC.balanceOf(user2);
        
        vm.expectEmit(true, true, false, true);
        emit TitleRented(0, user2, block.timestamp + RENTAL_DURATION);
        
        vm.prank(user2);
        timeBoundBeats.rentTitle(0, RENTAL_DURATION);
        
        // Check balances
        assertEq(mockUSDC.balanceOf(user1), user1BalanceBefore + expectedOwnerFee);
        assertEq(mockUSDC.balanceOf(owner), ownerBalanceBefore + expectedPlatformFee);
        assertEq(mockUSDC.balanceOf(user2), user2BalanceBefore - expectedFee);
        
        // Check rental status
        assertTrue(timeBoundBeats.isRenterOf(user2, 0));
        assertFalse(timeBoundBeats.isRenterOf(user1, 0));
        assertFalse(timeBoundBeats.isRenterOf(user3, 0));
    }
    
    function testRentTitleOwnerCannotRent() public {
        // User1 mints a title
        vm.prank(user1);
        timeBoundBeats.mintTitle(TITLE_NAME, AUTHOR, DURATION);
        
        // User1 tries to rent their own title
        vm.expectRevert("You are the owner of this title");
        vm.prank(user1);
        timeBoundBeats.rentTitle(0, RENTAL_DURATION);
    }
    
    function testRentTitleInvalidToken() public {
        vm.expectRevert(abi.encodeWithSignature("ERC721NonexistentToken(uint256)", 999));
        vm.prank(user2);
        timeBoundBeats.rentTitle(999, RENTAL_DURATION);
    }
    
    function testRentTitleNoPaymentToken() public {
        // Deploy new contract without payment token
        TimeBoundBeats newContract = new TimeBoundBeats();
        
        vm.prank(user1);
        newContract.mintTitle(TITLE_NAME, AUTHOR, DURATION);
        
        vm.expectRevert("Payment token not configured");
        vm.prank(user2);
        newContract.rentTitle(0, RENTAL_DURATION);
    }
    
    function testGetMyRentals() public {
        // User1 mints multiple titles
        vm.startPrank(user1);
        timeBoundBeats.mintTitle("Song 1", AUTHOR, 180);
        timeBoundBeats.mintTitle("Song 2", AUTHOR, 240);
        timeBoundBeats.mintTitle("Song 3", AUTHOR, 300);
        vm.stopPrank();
        
        // User2 rents two titles
        vm.startPrank(user2);
        timeBoundBeats.rentTitle(0, RENTAL_DURATION);
        timeBoundBeats.rentTitle(1, RENTAL_DURATION / 2);
        vm.stopPrank();
        
        // Check user2's rentals
        vm.prank(user2);
        Rental[] memory rentals = timeBoundBeats.getMyRentals();
        assertEq(rentals.length, 2);
        assertEq(rentals[0].renter, user2);
        assertEq(rentals[0].tokenId, 0);
        assertEq(rentals[1].renter, user2);
        assertEq(rentals[1].tokenId, 1);
    }
    
    function testRentalExpiry() public {
        // User1 mints a title
        vm.prank(user1);
        timeBoundBeats.mintTitle(TITLE_NAME, AUTHOR, DURATION);
        
        // User2 rents the title for 1 hour
        uint256 shortRentalDuration = 3600; // 1 hour
        vm.prank(user2);
        timeBoundBeats.rentTitle(0, shortRentalDuration);
        
        // Check rental is active
        assertTrue(timeBoundBeats.isRenterOf(user2, 0));
        
        // Fast forward time past rental expiry
        vm.warp(block.timestamp + shortRentalDuration + 1);
        
        // Check rental has expired
        assertFalse(timeBoundBeats.isRenterOf(user2, 0));
        
        // Check getMyRentals returns empty
        vm.prank(user2);
        Rental[] memory rentals = timeBoundBeats.getMyRentals();
        assertEq(rentals.length, 0);
    }
    
    // ========== Owner Function Tests ==========
    
    function testSetPaymentToken() public {
        MockUSDC newToken = new MockUSDC();
        
        vm.expectEmit(true, false, false, false);
        emit PaymentTokenUpdated(address(newToken));
        
        timeBoundBeats.setPaymentToken(address(newToken));
        assertEq(address(timeBoundBeats.paymentToken()), address(newToken));
    }
    
    function testSetPaymentTokenOnlyOwner() public {
        MockUSDC newToken = new MockUSDC();
        
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vm.prank(user1);
        timeBoundBeats.setPaymentToken(address(newToken));
    }
    
    function testSetPaymentTokenInvalidAddress() public {
        vm.expectRevert("Invalid token address");
        timeBoundBeats.setPaymentToken(address(0));
    }
    
    function testSetRentalFee() public {
        uint256 newFee = 24;
        timeBoundBeats.setRentalFee(newFee);
        assertEq(timeBoundBeats.rentalFee(), newFee);
    }
    
    function testSetRentalFeeOnlyOwner() public {
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vm.prank(user1);
        timeBoundBeats.setRentalFee(24);
    }
    
    function testSetRentalFeeZero() public {
        vm.expectRevert("Fee must be greater than 0");
        timeBoundBeats.setRentalFee(0);
    }
    
    function testSetPlatformFeeBPS() public {
        uint256 newFee = 50; // 0.5%
        timeBoundBeats.setPlatformFeeBPS(newFee);
        assertEq(timeBoundBeats.platformFeeBPS(), newFee);
    }
    
    function testSetPlatformFeeBPSOnlyOwner() public {
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        vm.prank(user1);
        timeBoundBeats.setPlatformFeeBPS(50);
    }
    
    function testSetPlatformFeeBPSZero() public {
        vm.expectRevert("Fee must be greater than 0");
        timeBoundBeats.setPlatformFeeBPS(0);
    }
    
    function testSetPlatformFeeBPSTooHigh() public {
        vm.expectRevert("Fee must be less than or equal to 100%");
        timeBoundBeats.setPlatformFeeBPS(10001);
    }
    
    function testSetPlatformFeeBPSMaximum() public {
        timeBoundBeats.setPlatformFeeBPS(10000); // 100%
        assertEq(timeBoundBeats.platformFeeBPS(), 10000);
    }
    
    // ========== Fee Calculation Tests ==========
    
    function testRentalFeeCalculation() public {
        // Test with custom fees
        timeBoundBeats.setRentalFee(100);
        timeBoundBeats.setPlatformFeeBPS(500); // 5%
        
        vm.prank(user1);
        timeBoundBeats.mintTitle(TITLE_NAME, AUTHOR, DURATION);
        
        uint256 rentalDuration = 1000;
        uint256 expectedTotalFee = rentalDuration * 100;
        uint256 expectedPlatformFee = expectedTotalFee * 500 / 10000; // 5%
        uint256 expectedOwnerFee = expectedTotalFee - expectedPlatformFee;
        
        uint256 user1BalanceBefore = mockUSDC.balanceOf(user1);
        uint256 ownerBalanceBefore = mockUSDC.balanceOf(owner);
        uint256 user2BalanceBefore = mockUSDC.balanceOf(user2);
        
        vm.prank(user2);
        timeBoundBeats.rentTitle(0, rentalDuration);
        
        assertEq(mockUSDC.balanceOf(user1), user1BalanceBefore + expectedOwnerFee);
        assertEq(mockUSDC.balanceOf(owner), ownerBalanceBefore + expectedPlatformFee);
        assertEq(mockUSDC.balanceOf(user2), user2BalanceBefore - expectedTotalFee);
    }
    
    // ========== Edge Case Tests ==========
    
    function testMultipleRentalsPerUser() public {
        // User1 mints multiple titles
        vm.startPrank(user1);
        for (uint i = 0; i < 5; i++) {
            timeBoundBeats.mintTitle(
                string(abi.encodePacked("Song ", vm.toString(i))), 
                AUTHOR, 
                DURATION
            );
        }
        vm.stopPrank();
        
        // User2 rents all titles
        vm.startPrank(user2);
        for (uint i = 0; i < 5; i++) {
            timeBoundBeats.rentTitle(i, RENTAL_DURATION);
        }
        vm.stopPrank();
        
        // Check all rentals are active
        for (uint i = 0; i < 5; i++) {
            assertTrue(timeBoundBeats.isRenterOf(user2, i));
        }
        
        // Check getMyRentals returns all 5
        vm.prank(user2);
        Rental[] memory rentals = timeBoundBeats.getMyRentals();
        assertEq(rentals.length, 5);
    }
    
    function testRentSameTitleMultipleTimes() public {
        vm.prank(user1);
        timeBoundBeats.mintTitle(TITLE_NAME, AUTHOR, DURATION);
        
        // User2 rents the title twice
        vm.startPrank(user2);
        timeBoundBeats.rentTitle(0, 3600); // 1 hour
        timeBoundBeats.rentTitle(0, 7200); // 2 hours
        vm.stopPrank();
        
        // Should still show as rented (latest rental should be active)
        assertTrue(timeBoundBeats.isRenterOf(user2, 0));
        
        // Should have 2 rental entries
        vm.prank(user2);
        Rental[] memory rentals = timeBoundBeats.getMyRentals();
        assertEq(rentals.length, 2);
    }
    
    // ========== Gas Optimization Tests ==========
    
    function testGasOptimizationLargeAuthorList() public {
        // Test that getting titles by author with many titles doesn't run out of gas
        vm.startPrank(user1);
        for (uint i = 0; i < 50; i++) {
            timeBoundBeats.mintTitle(
                string(abi.encodePacked("Song ", vm.toString(i))), 
                AUTHOR, 
                DURATION
            );
        }
        vm.stopPrank();
        
        uint256[] memory authorTitles = timeBoundBeats.getTitlesByAuthor(AUTHOR);
        assertEq(authorTitles.length, 50);
    }
    
    // ========== Event Declaration ==========
    
    event PaymentTokenUpdated(address indexed newToken);
    event TitleMinted(uint256 indexed tokenId, string name, string author);
    event RentalFeeUpdated(uint256 newFee);
    event TitleRented(uint256 indexed tokenId, address indexed renter, uint256 rentedUntil);
}
