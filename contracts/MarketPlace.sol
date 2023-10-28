// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./User.sol";
import "./PropertyToken.sol";

// challenges faced
// 1. (Done) Each object has many logics inside, making integration with different object very difficult, eg, too many dependencies among different smart contracts
// 2. (Done) How can I make sure important function like mint is only called by another specific contract?
// Ans: Set object contracts' owner to Marketplace and make it the only entry point

// 3. (Suggestion but not implemented) Soulbound token to manage user and admin access to the marketplace? If not enough time, can talk in the future development
// Basically 2 NFTs are needed, one for the admin, the other one for the approved user

// 4. (Done) How to mint a property token that is co-shared?
// It turns out ERC1155's mint function to the same token ID can be called multiple times
// So the total balance of total is not fixed after calling the _mint() function
// hence _mint() should be called carefully

// 5. (Done) How to track all tokens that belong to a user. (extend `safeTransferFrom` and disable `safeBatchTransferFrom`)

// 6. (Done) Given a propertyId, list all addresses and their shares.

// 7. (Done) Member "push" is not available in address[] memory outside of storage. So an array in struct cannot be modified once declared, as it has memory modifier

// 8. (Done) Dynamic arrays cannot be returned, it has to be memory type

contract Marketplace is Ownable {
    constructor(address userContractAddr, address propertyTokenAddr) Ownable(msg.sender) {
        userContract = User(userContractAddr);
        propertyTokenContract = PropertyToken(propertyTokenAddr);
    }

    User userContract;
    PropertyToken propertyTokenContract;

    // TODO later, or do we need it?
    // function viewUserStatus() public view {}

    // TODO later, or do we need it?
    // function viewRegistrationDetails() public view {}

    // Marketplace features
    function listProperty() public {}

    function updateListedProperty() public {}

    function unlistProperty() public {}

    function buyProperty() public payable {}

    function executePropertySale() public {}

    function viewAllListedProperty() public view {}
}
