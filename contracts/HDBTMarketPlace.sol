// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./HDBT.sol";

error AlreadyListed(uint256 tokenId, address owner);

// allow owners to list, unlist, update listing
// allow buyers to get listing for a specific token, send offer, withdraw offer
// record the history of transaction? proceeds (money obtained by seller)
contract HDBTMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 quantity;
        uint256 price;
        address seller;
    }

    // State Variables
    address marketOwner;
    HDBT HDBTContract;
    uint256 commission;
    mapping(uint256 => mapping(address => Listing)) listings_mapping; // tokenid -> (owner -> listing)
    mapping(uint256 => mapping(address => mapping(address => uint256))) offers; //tokenid -> (seller -> (buyer -> offer price))

    // events
    event ItemListed(
        address indexed seller,
        uint256 indexed tokenId,
        uint256 quantity,
        uint256 price
    );
    event ListingCanceled(address owner, uint256 tokenId);
    event OfferSent(
        address seller,
        uint256 tokenId,
        uint256 offer_price,
        address buyer
    );
    event OfferRetracted(address seller, uint256 tokenId, address buyer);

    // constructor
    constructor(address tokenContract, uint256 _commission) {
        HDBTContract = HDBT(tokenContract);
        commission = _commission; // input commission in unit of wei
        marketOwner = msg.sender;
    }

    // function modifiers
    modifier ownsEnough(
        uint256 tokenId,
        address owner,
        uint256 quantity
    ) {
        require(
            HDBTContract.balanceOf(owner, tokenId) >= quantity,
            "You do not own enough tokens to list this amount"
        );
        _;
    }

    modifier validToken(uint256 tokenId) {
        require(tokenId <= HDBTContract.tokenId(), "TokenId is not valid");
        _;
    }

    modifier notListed(uint256 tokenId, address owner) {
        require(
            listings_mapping[tokenId][owner].price == 0,
            "Token owned is already listed"
        );
        _;
    }

    modifier isListed(uint256 tokenId, address seller) {
        require(
            listings_mapping[tokenId][seller].price > 0,
            "The listing does not exist"
        );
        _;
    }

    modifier isOffered(
        uint256 tokenId,
        address seller,
        address buyer
    ) {
        require(
            offers[tokenId][seller][buyer] > 0,
            "You do not have any existing offer for this token and seller"
        );
        _;
    }

    // List tokens
    function listItem(
        uint256 tokenId,
        uint256 price,
        uint256 quantity
    )
        public
        validToken(tokenId)
        ownsEnough(tokenId, msg.sender, quantity)
        notListed(tokenId, msg.sender)
    {
        require(price >= commission, "Price is lower than the lower threshold");
        listings_mapping[tokenId][msg.sender] = Listing(
            quantity,
            price,
            msg.sender
        );
        emit ItemListed(msg.sender, tokenId, quantity, price);
    }

    function cancelListing(
        uint256 tokenId
    ) public isListed(tokenId, msg.sender) {
        delete (listings_mapping[tokenId][msg.sender]);
        emit ListingCanceled(msg.sender, tokenId);
    }

    function sendOffer(
        uint256 tokenId,
        address seller,
        uint256 offer_price
    ) public isListed(tokenId, seller) {
        require(
            msg.sender != seller,
            "You cannot make offer to your own listing!"
        );
        require(
            offer_price >= listings_mapping[tokenId][seller].price,
            "Price offered is lower than listed price"
        );
        offers[tokenId][seller][msg.sender] = offer_price;
        emit OfferSent(seller, tokenId, offer_price, msg.sender);
    }

    function retractOffer(
        uint256 tokenId,
        address seller
    ) public isOffered(tokenId, seller, msg.sender) {
        delete (offers[tokenId][seller][msg.sender]);
        emit OfferRetracted(seller, tokenId, msg.sender);
    }

    function getListing(
        uint256 tokenId,
        address seller
    ) public view isListed(tokenId, seller) returns (Listing memory) {
        return listings_mapping[tokenId][seller];
    }

    // TO-DO: trade func with delay before finalization
}
