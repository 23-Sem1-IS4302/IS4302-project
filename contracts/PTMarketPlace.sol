// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./User.sol";
import "./PropertyToken.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

// allow owners to list, unlist, update listing
// allow buyers to get listing for a specific token, send offer, withdraw offer
// record the history of transaction? proceeds (money obtained by seller)
contract PTMarketPlace is Ownable, ReentrancyGuard {
    uint constant WAIT_PERIOD = 7 days;
    struct Listing {
        uint256 quantity;
        uint256 price; // this is the initial price set by seller
        address seller;
        uint256 proceeds; // this is the price paid by actual buyer after accepting an offer
        address buyer;
        uint curDealExpireAt; // after seller accepts the offer, buyer will need to make payment within 7 days, otherwise cancelled
        mapping(address => uint256) offers; //seller => offer price
    }

    // State Variables
    User userContract;
    PropertyToken PTContract;
    uint256 commission;
    mapping(uint256 => mapping(address => Listing)) listings_mapping; // tokenid -> (seller -> listing)
    //assumption: Each seller can only have 1 listing for a certain token at a time
    // mapping(uint256 => mapping(address => mapping(address => uint256))) offers; //tokenid -> (seller -> (buyer -> offer price))
    // events
    event ItemListed(address indexed seller, uint256 indexed tokenId, uint256 quantity, uint256 price);
    event ListingCanceled(address owner, uint256 tokenId);
    event OfferSent(address seller, uint256 tokenId, uint256 offer_price, address buyer);
    event OfferRetracted(address seller, uint256 tokenId, address buyer);
    event OfferAccepted(address seller, uint256 tokenId, address buyer, uint expiryTime);
    event TokenSold(address seller, uint256 tokenId, address buyer);

    // constructor
    constructor(address userContractAddr, address propertyTokenAddr, uint256 _commission) Ownable(msg.sender) {
        userContract = User(userContractAddr);
        PTContract = PropertyToken(propertyTokenAddr);
        commission = _commission;
    }

    // function modifiers
    modifier onlyApprovedUser() {
        require(userContract.isAddressApprovedUser(msg.sender), "Only approved user can access this function");
        _;
    }

    modifier ownsEnough(
        uint256 tokenId,
        address owner,
        uint256 quantity
    ) {
        require(PTContract.balanceOf(owner, tokenId) >= quantity, "You do not own enough tokens to list this amount");
        _;
    }

    modifier validToken(uint256 tokenId) {
        require(PTContract.isPropertyIdValid(tokenId), "TokenId is not valid");
        _;
    }

    modifier notListed(uint256 tokenId, address owner) {
        require(listings_mapping[tokenId][owner].price == 0, "Token owned is already listed");
        _;
    }

    modifier isListed(uint256 tokenId, address seller) {
        require(listings_mapping[tokenId][seller].price > 0, "The listing does not exist");
        _;
    }

    modifier isOffered(
        uint256 tokenId,
        address seller,
        address buyer
    ) {
        require(listings_mapping[tokenId][seller].offers[buyer] > 0, "The offer does not exist");
        _;
    }

    modifier isNotBought(uint256 tokenId, address seller) {
        require(
            block.timestamp > listings_mapping[tokenId][seller].curDealExpireAt,
            "This listing has a buyer and is in pending state"
        );
        _;
    }

    modifier onlyBuyer(
        uint256 tokenId,
        address seller,
        address buyer
    ) {
        require(
            listings_mapping[tokenId][seller].buyer == buyer &&
                listings_mapping[tokenId][seller].curDealExpireAt > block.timestamp,
            "Only buyer with non-expired deal can call this function"
        );
        _;
    }

    // List tokens
    function listProperty(
        uint256 tokenId,
        uint256 price,
        uint256 quantity
    )
        public
        onlyApprovedUser
        validToken(tokenId)
        ownsEnough(tokenId, msg.sender, quantity)
        notListed(tokenId, msg.sender)
    {
        require(price >= commission, "Price cannot be lower than the commission");
        Listing storage new_listing = listings_mapping[tokenId][msg.sender];
        new_listing.quantity = quantity;
        new_listing.price = price;
        new_listing.seller = msg.sender;
        emit ItemListed(msg.sender, tokenId, quantity, price);
    }

    function unlistProperty(uint256 tokenId) public isListed(tokenId, msg.sender) isNotBought(tokenId, msg.sender) {
        delete (listings_mapping[tokenId][msg.sender]);
        emit ListingCanceled(msg.sender, tokenId);
    }

    function getListingPrice(
        uint256 tokenId,
        address seller
    ) public view isListed(tokenId, seller) returns (uint256 price) {
        return listings_mapping[tokenId][seller].price;
    }

    function sendOffer(
        uint256 tokenId,
        address seller,
        uint256 offer_price
    ) public onlyApprovedUser isListed(tokenId, seller) isNotBought(tokenId, seller) {
        require(msg.sender != seller, "You cannot make offer to your own listing!");
        require(offer_price >= listings_mapping[tokenId][seller].price, "Price offered is lower than listed price");
        listings_mapping[tokenId][seller].offers[msg.sender] = offer_price;
        emit OfferSent(seller, tokenId, offer_price, msg.sender);
    }

    function retractOffer(uint256 tokenId, address seller) public isOffered(tokenId, seller, msg.sender) {
        delete (listings_mapping[tokenId][seller].offers[msg.sender]);
        emit OfferRetracted(seller, tokenId, msg.sender);
    }

    function getOfferPrice(
        uint256 tokenId,
        address seller,
        address buyer
    ) public view isListed(tokenId, seller) isOffered(tokenId, seller, buyer) returns (uint256) {
        return listings_mapping[tokenId][seller].offers[buyer];
    }

    // seller will call this function to accept an offer and buyer will have 7 days to pay
    // if the buyer does not pay the amount within 7 days, the deal shall be cancelled and sellers can choose from other offers
    function acceptOffer(
        uint256 tokenId,
        address buyer
    ) public isListed(tokenId, msg.sender) isOffered(tokenId, msg.sender, buyer) isNotBought(tokenId, msg.sender) {
        uint256 offer_price = listings_mapping[tokenId][msg.sender].offers[buyer];
        listings_mapping[tokenId][msg.sender].proceeds = offer_price;
        listings_mapping[tokenId][msg.sender].buyer = buyer;
        listings_mapping[tokenId][msg.sender].curDealExpireAt = block.timestamp + WAIT_PERIOD;
        emit OfferAccepted(msg.sender, tokenId, buyer, block.timestamp + WAIT_PERIOD);
    }

    // Buyer will call this function to pay the proceeds
    function executePropertySale(
        uint256 tokenId,
        address seller
    ) public payable nonReentrant isListed(tokenId, seller) onlyBuyer(tokenId, seller, msg.sender) {
        uint256 proceeds = listings_mapping[tokenId][seller].proceeds;
        uint256 quantity = listings_mapping[tokenId][seller].quantity;
        require(msg.value >= proceeds, "Ether paid should be equal or higher than the price");
        PTContract.safeTransferFrom(seller, msg.sender, tokenId, quantity, "0x0"); // will need the seller to call setApprovalForAll(marketAddr, true)
        payable(msg.sender).transfer(msg.value - proceeds); // return extra ether paid
        payable(seller).transfer(proceeds - commission); // marketplace contract will keep the commission
        emit TokenSold(seller, tokenId, msg.sender);
        // delete listing and offers
        delete (listings_mapping[tokenId][seller]);
    }
}
