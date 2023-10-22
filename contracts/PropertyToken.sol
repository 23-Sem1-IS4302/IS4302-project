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
        address[] propertyOwners;
        uint16[] shares;
        string postalCode;
        string propertyAddress;
    }
    mapping(uint256 => propertyDetail) properties;
    mapping(uint256 => bool) propertyFractionized;

    function registerNewProperty(
        string memory postalCode,
        string memory propertyAddress,
        address[] memory propertyOwners,
        uint16[] memory shares
    ) public onlyOwner returns (uint256) {
        propertyDetail memory newProperty = propertyDetail(propertyOwners, shares, postalCode, propertyAddress);
        properties[tokenId] = newProperty;

        tokenId++;
        return tokenId - 1;
    }

    function mintPropertyToken(uint256 pendingPropertyId) public onlyOwner {
        propertyDetail memory toMintProperty = properties[pendingPropertyId];

        for (uint16 i = 0; i < toMintProperty.propertyOwners.length; i++) {
            _mint(toMintProperty.propertyOwners[i], pendingPropertyId, toMintProperty.shares[i], "");
        }
    }

    function viewProperty(uint256 propertyId) public view returns (propertyDetail memory) {
        return properties[propertyId];
    }
}
