// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract User is Ownable, AccessControl {
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant APPROVED_USER = keccak256("APPROVED_USER");
    bytes32 public constant PENDING_USER = keccak256("PENDING_USER");

    struct userDetail {
        string firstName;
        string lastName;
        string nationality;
        string nationalId;
        string residentialAddress;
    }

    constructor() Ownable(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    mapping(address => userDetail) users;

    event AddAdmin(address indexed ownerAddr, address indexed adminAddr);
    event UserRegistration(address indexed userAddr);
    event ApproveUser(address indexed adminAddr, address indexed userAddr);
    event RejectUser(address indexed adminAddr, address indexed userAddr, string reason);

    modifier noDuplicateAdmin(address adminAddr) {
        require(!hasRole(ADMIN, adminAddr), "No duplicate admin allowed");
        _;
    }

    modifier noDuplicateUser(address userAddr) {
        require(!hasRole(APPROVED_USER, userAddr), "No duplicate user allowed");
        require(!hasRole(PENDING_USER, userAddr), "No duplicate user allowed");
        _;
    }

    modifier onlyPendingUser(address userAddr) {
        require(hasRole(PENDING_USER, userAddr), "Not a pending user");
        _;
    }

    function addNewAdmin(
        address adminAddress,
        string memory firstName,
        string memory lastName,
        string memory nationality,
        string memory nationalId,
        string memory residentialAddress
    ) public onlyRole(DEFAULT_ADMIN_ROLE) noDuplicateAdmin(adminAddress) {
        userDetail memory newAdmin = userDetail(firstName, lastName, nationality, nationalId, residentialAddress);
        users[adminAddress] = newAdmin;
        _grantRole(ADMIN, adminAddress);
        emit AddAdmin(msg.sender, adminAddress);
    }

    function registerNewUser(
        string memory firstName,
        string memory lastName,
        string memory nationality,
        string memory nationalId,
        string memory residentialAddress
    ) public noDuplicateUser(msg.sender) {
        userDetail memory newUser = userDetail(firstName, lastName, nationality, nationalId, residentialAddress);
        users[msg.sender] = newUser;
        _grantRole(PENDING_USER, msg.sender);
        emit UserRegistration(msg.sender);
    }

    function approveUser(address userAddr) public onlyRole(ADMIN) onlyPendingUser(userAddr) {
        _revokeRole(PENDING_USER, userAddr);
        _grantRole(APPROVED_USER, userAddr);
        emit ApproveUser(msg.sender, userAddr);
    }

    function rejectUser(address userAddr, string memory reason) public onlyRole(ADMIN) onlyPendingUser(userAddr) {
        _revokeRole(PENDING_USER, userAddr);
        delete users[userAddr];
        emit RejectUser(msg.sender, userAddr, reason);
    }

    function isAddressAdmin(address address_) public view returns (bool) {
        return hasRole(ADMIN, address_);
    }

    function isAddressApprovedUser(address address_) public view returns (bool) {
        return hasRole(APPROVED_USER, address_);
    }
}
