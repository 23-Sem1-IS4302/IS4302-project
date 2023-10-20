// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract HousingMarketplace {
    // READ THIS
    // I am thinking in the OOP style, we could have two objects (User and HouseToken)
    // They provide some basic APIs
    // And all the actions are carried in this HousingMarketplace contract.

    constructor() {
        // the first admin should be introduced
    }

    // Admin/User management
    function addNewAdmin() public {}

    function registerNewUser() public {}

    function approveUser() public {}

    function rejectUser() public {}

    function viewUserStatus() public view {}

    function viewPendingUserList() public view {}

    function viewRegistrationDetails() public view {}

    // Housing management
    function registerNewProperty() public {}

    function approveProperty() public {}

    function rejectProperty() public {}

    function fractionizeProperty() public {}

    function mergePropertyFractions() public {}

    function viewProperty() public view {}

    function viewPendingPropertyList() public view {}

    // Marketplace features

    function listProperty() public {}

    function updateListedProperty() public {}

    function unlistProperty() public {}

    function buyProperty() public payable {}

    function executePropertySale() public {}

    function viewAllListedProperty() public view {}
}
