// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract UserRegistration {
    
    enum userRole { Admin, User }
    enum userStatus { Pending, Approved, Rejected }
    
    uint256 public userId = 0;
    uint256 public adminId = 0;

    mapping(uint256 => userDetails) administratorList;
    mapping(address => uint256) administratorAddrToIdList;
    mapping(uint256 => address) administratorIdToAddrList;

    mapping(address => uint256) userAddrToIdList;
    mapping(uint256 => address) userIdToAddrList;
    mapping(uint256 => userDetails) public userList;

    //user's id => admin address, used to track which admin updated status of user - only valid for Approved and Rejected status
    mapping(uint256 => address)  userStatusLastUpdatedAdmin;

    struct userDetails {
        string firstName;
        string lastName;
        string nationality;
        string nationalId;
        string residentialAddress;
        userRole role;
        uint256 userGivenId;
        userStatus status;
    }

    //To initialise first administrator
    constructor(
        string memory _firstName,
        string memory _lastName,
        string memory _nationality,
        string memory _nationalId,
        string memory _residentialAddress) {
            adminId++;
            uint256 newAdminId = adminId;
            userDetails memory newAdmin = userDetails(
                _firstName,
                _lastName,
                _nationality,
                _nationalId,
                _residentialAddress,
                userRole.Admin,
                newAdminId,
                userStatus.Approved
            );
            administratorList[newAdminId] = newAdmin;
            administratorAddrToIdList[tx.origin] = newAdminId;
            administratorIdToAddrList[newAdminId] = tx.origin;
        }

    modifier adminAccessOnly (address adminAddress) {
        uint256 _adminId = administratorAddrToIdList[adminAddress];
        require(_adminId != 0, "Only administrators can access this function");
        _;
    }

    modifier userRegistrationCheck(address addr) {
        uint256 _userId = userAddrToIdList[addr];
        require (_userId == 0, "User already has an existing registration");
        _;
    }

    modifier userRegistrationStatusCheck(address addr) {
        uint256 _userId = userAddrToIdList[addr];
        require (_userId != 0, "User has no existing registration");
        _;
    }

    modifier adminRegisteredUserCheck(uint256 _userId) {
        address userAddr = userIdToAddrList[_userId]; 
        require (userAddr != address(0), "No such user found");
        _;
    }

    // modifier pendingUserCheckById(uint _userId) {
    //     userDetails memory user = userList[_userId];
    //     require(user.status == userStatus.Pending, "User is not pending approval based on ID" );
    //     _;
    // }

    // modifier pendingUserCheckByAddr(address userAddress) {
    //     uint256 _userId = userAddrToIdList[userAddress];
    //     userDetails memory user = userList[_userId];
    //     require(user.status == userStatus.Pending, "User is not pending approval based on address" );
    //     _;
    // }

    // modifier approvedUserCheckById(uint _userId) {
    //     userDetails memory user = userList[_userId];
    //     require(user.status == userStatus.Approved, "User has not been approved based on ID" );
    //     _;
    // }

    // modifier approvedUserCheckByAddr(address userAddress) {
    //     uint256 _userId = userAddrToIdList[userAddress];
    //     userDetails memory user = userList[_userId];
    //     require(user.status == userStatus.Approved, "User has not been approved based on address" );
    //     _;
    // }

    // modifier rejectedUserCheckById(uint _userId) {
    //     userDetails memory user = userList[_userId];
    //     require(user.status == userStatus.Rejected , "User has not been rejected based on ID" );
    //     _;
    // }

    // modifier rejectedUserCheckByAddr(address userAddress) {
    //     uint256 _userId = userAddrToIdList[userAddress];
    //     userDetails memory user = userList[_userId];
    //     require(user.status == userStatus.Rejected, "User has not been rejected based on address" );
    //     _;
    // }

    function addNewAdministrator (
        address newAdminAddress,
        string memory _firstName,
        string memory _lastName,
        string memory _nationality,
        string memory _nationalId,
        string memory _residentialAddress
        ) public adminAccessOnly(tx.origin) returns(uint256) {
            adminId++;
            uint256 newAdminId = adminId;
            userDetails memory newAdmin = userDetails(
                _firstName,
                _lastName,
                _nationality,
                _nationalId,
                _residentialAddress,
                userRole.User,
                newAdminId,
                userStatus.Approved
            );
            administratorAddrToIdList[newAdminAddress] = newAdminId;
            administratorList[adminId] = newAdmin;
            administratorIdToAddrList[newAdminId] = newAdminAddress;
            return newAdminId;
    }

    function newUserRegistration ( 
        string memory _firstName,
        string memory _lastName,
        string memory _nationality,
        string memory _nationalId,
        string memory _residentialAddress
        ) public userRegistrationCheck(tx.origin) returns(uint256) {
            userId++;
            uint256 newUserId = userId;
            userDetails memory newUser = userDetails(
                _firstName,
                _lastName,
                _nationality,
                _nationalId,
                _residentialAddress,
                userRole.User,
                newUserId,
                userStatus.Pending
            );
            userAddrToIdList[tx.origin] = newUserId;
            userIdToAddrList[newUserId] = tx.origin;
            userList[newUserId] = newUser;
            return newUserId;
    }

    //This function is for user's who are rejected to re-register with new application
    // function rejectedUserReRegistration () public rejectedUserCheckByAddr(tx.origin) {

    // }

    // TODO
    // Modifier that ensure that admin cannot update their own created user account - unique key can be nationalId + nationality

    function approveUser (uint256 _userId) public adminAccessOnly(tx.origin) adminRegisteredUserCheck(_userId) {
        userDetails storage user = userList[_userId];
        user.status = userStatus.Approved;
    }

    function rejectUser (uint256 _userId) public adminAccessOnly(tx.origin) adminRegisteredUserCheck(_userId) {
        userDetails storage user = userList[_userId];
        user.status = userStatus.Rejected;
    }

    function adminCheckUserStatus (uint256 _userId) public view adminAccessOnly(tx.origin) adminRegisteredUserCheck(_userId) returns (string memory) {
        userDetails memory user = userList[_userId];
        if(user.status == userStatus.Pending) {
            return "User is in pending list";
        } else if (user.status == userStatus.Rejected) {
            return "User has been rejected";
        } else {
            return "User has been approved";
        }
    }

    function adminCheckPendingUserList () public view adminAccessOnly(tx.origin) returns (userDetails[] memory) {
        userDetails[] memory pendingList = new userDetails[] (userId);
        uint256 pendingListIdx = 0;
        for (uint256 i = 1; i < userId; i++) {
            userDetails memory user = userList[i];
            if(user.status == userStatus.Pending) {
                pendingList[pendingListIdx] = user;
                pendingListIdx++;
            }
        }
        return pendingList;
    }

    function userCheckRegistrationDetails () public view userRegistrationStatusCheck(tx.origin) returns(string memory) {
        uint256 _userId = userAddrToIdList[tx.origin];
        userDetails memory user = userList[_userId];
        if(user.status == userStatus.Pending) {
            return "You are in pending list";
        } else if (user.status == userStatus.Rejected) {
            return "You have been rejected";
        } else {
            return "You have been approved";
        }
    }

}
