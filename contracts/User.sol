// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract User is Ownable {
    struct userDetail {
        string firstName;
        string lastName;
        string nationality;
        string nationalId;
        string residentialAddress;
    }

    constructor() Ownable(msg.sender) {}

    mapping(address => userDetail) users;
    mapping(address => bool) admins;
    address[] _pendingUsers;
    mapping(address => bool) approvedUsers;

    event AddAdmin(address indexed ownerAddr, address indexed adminAddr);
    event ApproveUser(address indexed adminAddr, address indexed userAddr);
    event RejectUser(address indexed adminAddr, address indexed userAddr, string reason);

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

    function addNewAdmin(
        address adminAddress,
        string memory firstName,
        string memory lastName,
        string memory nationality,
        string memory nationalId,
        string memory residentialAddress
    ) public onlyOwner noDuplicateAdmin(adminAddress) {
        userDetail memory newAdmin = userDetail(firstName, lastName, nationality, nationalId, residentialAddress);
        users[adminAddress] = newAdmin;
        admins[adminAddress] = true;
        emit AddAdmin(msg.sender, adminAddress);
    }

    function registerNewUser(
        string memory firstName,
        string memory lastName,
        string memory nationality,
        string memory nationalId,
        string memory residentialAddress
    ) public {
        userDetail memory newUser = userDetail(firstName, lastName, nationality, nationalId, residentialAddress);
        users[msg.sender] = newUser;
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

    function viewPendingUsers() public view onlyAdmin returns (address[] memory) {
        return _pendingUsers;
    }

    function isAddressAdmin(address address_) public view returns (bool) {
        return admins[address_];
    }

    function isAddressApprovedUser(address address_) public view returns (bool) {
        return approvedUsers[address_];
    }
}
