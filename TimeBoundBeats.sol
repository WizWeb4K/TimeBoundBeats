// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

//Type Definition: How does a Title look like
struct Title {
    string name;
    string author;
    uint256 duration;
    address owner;
}

struct Rental {
    address renter;
    uint256 titleIndex;
    uint256 rentedUntil;
}

contract TimeBoundBeats is Ownable {

//Storage Variables
//Array of Title named titles
Title[] public titles;
//Array of Rental named rentals
Rental[] public rentals;

//Mapping of author to array of title indices
mapping (string author => uint256[]) public authorTitles;

// Payment configuration
IERC20 public paymentToken;
uint256 public rentalFee = 10e8;

// Events
event PaymentTokenUpdated(address indexed newToken);
event RentalFeeUpdated(uint256 newFee);

    //Add a title
    function addTitle(string memory _name, string memory _author, uint256 _duration) public {

        Title memory title = Title(_name, _author, _duration, msg.sender);
        titles.push(title);
        authorTitles[_author].push(titles.length - 1);
    }

    //Get all titles
    function getTitles() public view returns (Title[] memory) {
        return titles;
    }   

    //Get titles by author
    function getTitlesByAuthor(string memory _author) public view returns (Title[] memory) {
        uint256[] memory indices = authorTitles[_author];
        Title[] memory _titles = new Title[](indices.length);
        for (uint256 i = 0; i < indices.length; i++) {
            _titles[i] = titles[indices[i]];
        }
        return _titles;
    }    

    //Rent a title
    function rentTitle(uint256 _index, uint256 _rentalDuration) public {
        Title storage title = titles[_index];
        require(title.owner != msg.sender, "You are the owner of this title");
        require(paymentToken != IERC20(address(0)), "Payment token not configured");
        
        // Transfer rental fee
        require(paymentToken.transferFrom(msg.sender, owner(), rentalFee), "Token transfer failed");
        
        Rental memory rental = Rental(msg.sender, _index, block.timestamp + _rentalDuration);
        rentals.push(rental);
        
        emit TitleRented(_index, msg.sender, block.timestamp + _rentalDuration);
    }

    // Owner functions to configure payment settings
    function setPaymentToken(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token address");
        paymentToken = IERC20(_tokenAddress);
        emit PaymentTokenUpdated(_tokenAddress);
    }

    function setRentalFee(uint256 _fee) external onlyOwner {
        require(_fee > 0, "Fee must be greater than 0");
        rentalFee = _fee;
        emit RentalFeeUpdated(_fee);
    }
}