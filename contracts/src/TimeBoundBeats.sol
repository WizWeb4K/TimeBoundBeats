// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

struct TitleMetadata {
    string name;
    string author;
    uint256 duration;
}

struct Rental {
    address renter;
    uint256 tokenId;
    uint256 rentedUntil;
}

contract TimeBoundBeats is ERC721Enumerable, Ownable {
    using SafeERC20 for IERC20;
    
    // Counter for token IDs
    uint256 private _tokenIdCounter;
    
    // Mapping from token ID to title metadata
    mapping(uint256 => TitleMetadata) public titleMetadata;
    
    // Mapping of author to array of token IDs
    mapping(string => uint256[]) public authorTitles;
    
    // Array of active rentals
    Rental[] public rentals;
    
    // Payment configuration
    IERC20 public paymentToken;
    uint256 public rentalFee = 12; // 1 USDC/d per title; 86.400 s/d;  1 USDC = 1000000; 1000000/86400 = 11.57 = 12
    uint256 public platformFeeBPS = 30; // 0.3% von rentalFee
    
    // Events
    event PaymentTokenUpdated(address indexed newToken);
    event TitleMinted(uint256 indexed tokenId, string name, string author);
    event RentalFeeUpdated(uint256 newFee);
    event TitleRented(uint256 indexed tokenId, address indexed renter, uint256 rentedUntil);

    constructor() ERC721("TimeBoundBeatsNFT", "TBB") Ownable(msg.sender){}
    // Override required functions by both parent contracts
    
    // Mint a new title NFT
    function mintTitle(string memory _name, string memory _author, uint256 _duration) public {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        
        titleMetadata[tokenId] = TitleMetadata(_name, _author, _duration);
        authorTitles[_author].push(tokenId);
        
        emit TitleMinted(tokenId, _name, _author);
    }
    
    // Get all titles owned by the caller
    function getMyTitles() public view returns (uint256[] memory) {
        uint256 ownedCount = balanceOf(msg.sender);
        uint256[] memory result = new uint256[](ownedCount);
        
        for (uint256 i = 0; i < ownedCount; i++) {
            result[i] = tokenOfOwnerByIndex(msg.sender, i);
        }
        
        return result;
    }
    
    // Get titles by author
    function getTitlesByAuthor(string memory _author) public view returns (uint256[] memory) {
        return authorTitles[_author];
    }
    
    // Get title metadata
    function getTitleMetadata(uint256 _tokenId) public view returns (TitleMetadata memory) {
        // ownerOf will revert if token doesn't exist, so no need for explicit check
        ownerOf(_tokenId);
        return titleMetadata[_tokenId];
    }
    
    // Rent a title
    function rentTitle(uint256 _tokenId, uint256 _rentalDuration) public {
        // ownerOf will revert if token doesn't exist, so no need for explicit check
        require(ownerOf(_tokenId) != msg.sender, "You are the owner of this title");
        require(paymentToken != IERC20(address(0)), "Payment token not configured");
        
        uint256 totalFee = _rentalDuration * rentalFee;
        // Calculate platform fee
        uint256 platformFee = totalFee * platformFeeBPS / 10000;
        // Calculate titleOwner fee
        uint256 titleOwnerFee = totalFee - platformFee;
        
        // Transfer platform fee
        paymentToken.safeTransferFrom(msg.sender, owner(), platformFee);
        // Transfer titleOwner fee
        paymentToken.safeTransferFrom(msg.sender, ownerOf(_tokenId), titleOwnerFee);
        
        Rental memory rental = Rental(msg.sender, _tokenId, block.timestamp + _rentalDuration);
        rentals.push(rental);
        
        emit TitleRented(_tokenId, msg.sender, block.timestamp + _rentalDuration);
    }
    
    // Owner functions to configure payment settings
    function setPaymentToken(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token address");
        paymentToken = IERC20(_tokenAddress);
        emit PaymentTokenUpdated(_tokenAddress);
    }

    // rentalFee = fee per rental second per title
    function setRentalFee(uint256 _fee) external onlyOwner {
        require(_fee > 0, "Fee must be greater than 0");
        // ggf. obergrenze festsetzen
        rentalFee = _fee;
    }

    function setPlatformFeeBPS(uint256 _fee) external onlyOwner {
        require(_fee > 0, "Fee must be greater than 0");
        require(_fee <= 10000, "Fee must be less than or equal to 100%");
        platformFeeBPS = _fee;
    }
    
    function isRenterOf(address _renter, uint256 _tokenId) public view returns (bool) {
        for (uint256 i = 0; i < rentals.length; i++) {
            if (rentals[i].renter == _renter && 
                rentals[i].tokenId == _tokenId && 
                rentals[i].rentedUntil >= block.timestamp) {
                return true;
            }
        }
        return false;
    }
    
    // Get all active rentals for a renter
    function getMyRentals() public view returns (Rental[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < rentals.length; i++) {
            if (rentals[i].renter == msg.sender && rentals[i].rentedUntil >= block.timestamp) {
                count++;
            }
        }
        
        Rental[] memory result = new Rental[](count);
        uint256 resultIndex = 0;
        for (uint256 i = 0; i < rentals.length; i++) {
            if (rentals[i].renter == msg.sender && rentals[i].rentedUntil >= block.timestamp) {
                result[resultIndex] = rentals[i];
                resultIndex++;
            }
        }
        
        return result;
    }

}

/* Example usage:
1. Mint a title NFT:
   mintTitle("Kerstins Song", "Kerstin", 180)

2. Rent a title NFT:
   rentTitle(1, 86400) // Rent token ID 1 for 24 hours

3. Check rental status:
   isRenterOf(0xUserAddress, 1) // Check if user has rented token ID 1
*/