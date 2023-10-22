// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./User.sol";
import "./PropertyToken.sol";
import "hardhat/console.sol";

// challenges faced
// 1. (Done) Each object has many logics inside, making integration with different object very difficult, eg, too many depencies among different smart contracts
// 2. (Done) How can I make sure important function mint is only called by another specific contract?
// Ans: Set object contracts' owner to Marketplace and make it the only entry point
// 3. (Suggestion but not implemented) Soulbound token to manage user and admin access to the marketplace? If not enough time, can talk in the future development
// Basically 2 NFTs are needed, one for the admin, the other one for the approved user
// 4. How to mint a property token that is co-shared?
// 5. How to track all tokens that belonged to a user. (extend `safeTransferFrom` and `safeBatchTransferFrom`)
// 6. Given a propertyId, list all addresses and their shares.

contract Marketplace is Ownable {
    constructor(address userContractAddr, address propertyTokenAddr) Ownable(msg.sender) {
        userContract = User(userContractAddr);
        propertyTokenContract = PropertyToken(propertyTokenAddr);
    }

    User userContract;
    PropertyToken propertyTokenContract;

    mapping(address => bool) admins;
    address[] _pendingUsers;
    mapping(address => bool) approvedUsers;
    uint256[] _pendingPropertyIds;

    event AddAdmin(address indexed ownerAddr, address indexed adminAddr);
    event ApproveUser(address indexed adminAddr, address indexed userAddr);
    event RejectUser(address indexed adminAddr, address indexed userAddr, string reason);
    event RegisterNewProperty(address indexed userAddr, uint256 indexed propertyId);
    event ApproveProperty(address indexed adminAddr, address indexed userAddr, uint256 indexed propertyId);
    event RejectProperty(
        address indexed adminAddr,
        address indexed userAddr,
        uint256 indexed propertyId,
        string reason
    );

    // Admin/User management
    // TODO some mechanism to make sure newly added admin is not user, or not needed
    modifier onlyAdmin() {
        require(admins[msg.sender], "Only administrators can access this function");
        _;
    }

    modifier onlyApprovedUser() {
        require(approvedUsers[msg.sender], "Only approved user can access this function");
        _;
    }

    modifier noDuplicateAdmin(address adminAddr) {
        require(!admins[adminAddr], "No duplicate admin allowed");
        _;
    }

    modifier havePendingUsers() {
        require(_pendingUsers.length != 0, "No pending users to approve or reject");
        _;
    }

    modifier havePendingProperties() {
        require(_pendingPropertyIds.length != 0, "No pending properties to approve or reject");
        _;
    }

    function addNewAdmin(
        address adminAddress,
        string memory firstName,
        string memory lastName,
        string memory nationality,
        string memory nationalId,
        string memory residentialAddress
    ) public onlyOwner noDuplicateAdmin(adminAddress) {
        userContract.addNewAdmin(adminAddress, firstName, lastName, nationality, nationalId, residentialAddress);
        admins[adminAddress] = true;
        emit AddAdmin(msg.sender, adminAddress);
    }

    // TODO some mechanism to make sure newly added user is not an admin, or not needed
    function registerNewUser(
        string memory firstName,
        string memory lastName,
        string memory nationality,
        string memory nationalId,
        string memory residentialAddress
    ) public {
        userContract.addNewUser(msg.sender, firstName, lastName, nationality, nationalId, residentialAddress);
        _pendingUsers.push(msg.sender);
    }

    function _removePendingUser(address pendingUserAddr) private {
        for (uint256 i = 0; i < _pendingUsers.length; i++) {
            if (_pendingUsers[i] == pendingUserAddr) {
                (_pendingUsers[i], _pendingUsers[_pendingUsers.length - 1]) = (
                    _pendingUsers[_pendingUsers.length - 1],
                    _pendingUsers[i]
                );
                break;
            }
        }

        if (_pendingUsers[_pendingUsers.length - 1] == pendingUserAddr) {
            _pendingUsers.pop();
        } else {
            revert("User not found in pending list, double check");
        }
    }

    function approveUser(address userAddr) public onlyAdmin havePendingUsers {
        _removePendingUser(userAddr);
        approvedUsers[userAddr] = true;
        emit ApproveUser(msg.sender, userAddr);
    }

    function rejectUser(address userAddr, string memory reason) public onlyAdmin havePendingUsers {
        _removePendingUser(userAddr);
        emit RejectUser(msg.sender, userAddr, reason);
    }

    // TODO later, or do we need it?
    // function viewUserStatus() public view {}

    function viewPendingUsers() public view onlyAdmin returns (address[] memory) {
        return _pendingUsers;
    }

    // Transfer ownership of related contracts for future migration purpos
    function transferPropertyTokenOwnership(address newOwner) public onlyOwner {
        propertyTokenContract.transferOwnership(newOwner);
    }

    function transferUserOwnership(address newOwner) public onlyOwner {
        userContract.transferOwnership(newOwner);
    }

    // TODO later, or do we need it?
    // function viewRegistrationDetails() public view {}

    // Housing management
    function registerNewProperty(string memory postalCode, string memory propertyAddress) public onlyApprovedUser {
        uint256 pendingTokenId = propertyTokenContract.registerNewProperty(msg.sender, postalCode, propertyAddress);

        _pendingPropertyIds.push(pendingTokenId);
        emit RegisterNewProperty(msg.sender, pendingTokenId);
    }

    function _removePendingProperty(uint256 pendingPropertyId) private {
        for (uint256 i = 0; i < _pendingPropertyIds.length; i++) {
            if (_pendingPropertyIds[i] == pendingPropertyId) {
                (_pendingPropertyIds[i], _pendingPropertyIds[_pendingPropertyIds.length - 1]) = (
                    _pendingPropertyIds[_pendingPropertyIds.length - 1],
                    _pendingPropertyIds[i]
                );
                break;
            }
        }

        if (_pendingPropertyIds[_pendingPropertyIds.length - 1] == pendingPropertyId) {
            _pendingPropertyIds.pop();
        } else {
            revert("Property ID not found in pending list, double check");
        }
    }

    function approveProperty(uint256 pendingPropertyId) public onlyAdmin havePendingProperties {
        _removePendingProperty(pendingPropertyId);
        address userAddr = propertyTokenContract.viewProperty(pendingPropertyId).user;
        propertyTokenContract.mintPropertyToken(pendingPropertyId);
        emit ApproveProperty(msg.sender, userAddr, pendingPropertyId);
    }

    function rejectProperty(uint256 pendingPropertyId, string memory reason) public onlyAdmin havePendingProperties {
        _removePendingProperty(pendingPropertyId);
        address userAddr = propertyTokenContract.viewProperty(pendingPropertyId).user;
        emit RejectProperty(msg.sender, userAddr, pendingPropertyId, reason);
    }

    function viewProperty(uint256 propertyId) public view returns (PropertyToken.propertyDetail memory) {
        return propertyTokenContract.viewProperty((propertyId));
    }

    function viewPendingProperties() public view onlyAdmin returns (uint256[] memory) {
        return _pendingPropertyIds;
    }

    // TODO later
    // function viewUserAllProperties(address userAddr) public pure returns (uint256) {
    //     return 123;
    // }

    // Marketplace features
    function listProperty() public {}

    function updateListedProperty() public {}

    function unlistProperty() public {}

    function buyProperty() public payable {}

    function executePropertySale() public {}

    function viewAllListedProperty() public view {}
}
