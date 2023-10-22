// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PropertyToken is ERC1155, Ownable {
    constructor() ERC1155("PropertyToken") Ownable(msg.sender) {
        tokenId = 0;
    }

    uint256 tokenId;

    struct propertyDetail {
        address user;
        string postalCode;
        string propertyAddress;
    }
    mapping(uint256 => propertyDetail) properties;
    mapping(uint256 => bool) propertyFractionized;

    function registerNewProperty(
        address user,
        string memory postalCode,
        string memory propertyAddress
    ) public onlyOwner returns (uint256) {
        propertyDetail memory newProperty = propertyDetail(user, postalCode, propertyAddress);
        properties[tokenId] = newProperty;

        tokenId++;
        return tokenId - 1;
    }

    function mintPropertyToken(uint256 pendingPropertyId) public onlyOwner {
        propertyDetail memory toMintProperty = properties[pendingPropertyId];
        _mint(toMintProperty.user, pendingPropertyId, 1000, "");
    }

    function viewProperty(uint256 propertyId) public view returns (propertyDetail memory) {
        return properties[propertyId];
    }
}
