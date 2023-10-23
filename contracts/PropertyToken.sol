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
        string postalCode;
        string propertyAddress;
        address[] propertyOwners;
        uint256[] shares;
    }
    mapping(uint256 => propertyDetail) properties;
    mapping(uint256 => address[]) _propertyOwners;
    mapping(uint256 => uint256[]) _propertyShares;

    function registerNewProperty(
        string memory postalCode,
        string memory propertyAddress,
        address[] memory propertyOwners,
        uint256[] memory shares
    ) public onlyOwner returns (uint256) {
        propertyDetail memory newProperty = propertyDetail(postalCode, propertyAddress, propertyOwners, shares);
        properties[tokenId] = newProperty;
        _propertyOwners[tokenId] = propertyOwners;
        _propertyShares[tokenId] = shares;

        tokenId++;
        return tokenId - 1;
    }

    function _isOwnerFoundInProperty(uint256 propertyId, address propertyOwner) private view returns (bool) {
        for (uint256 i = 0; i < _propertyOwners[propertyId].length; i++) {
            if (_propertyOwners[propertyId][i] == propertyOwner) {
                return true;
            }
        }
        return false;
    }

    function _getOwnerIndex(uint256 propertyId, address propertyOwner) private view returns (uint256) {
        assert(_isOwnerFoundInProperty(propertyId, propertyOwner));
        for (uint256 i = 0; i < _propertyOwners[propertyId].length; i++) {
            if (_propertyOwners[propertyId][i] == propertyOwner) {
                return i;
            }
        }

        // this revert should never be reached
        revert("dummy");
    }

    function _removeOwnerAndShare(uint256 propertyId, address ownerToRemove) private {
        uint256 index = _getOwnerIndex(propertyId, ownerToRemove);

        for (uint256 i = index; i < _propertyOwners[propertyId].length - 1; i++) {
            _propertyOwners[propertyId][i] = _propertyOwners[propertyId][i + 1];
            _propertyShares[propertyId][i] = _propertyShares[propertyId][i + 1];
        }

        _propertyOwners[propertyId].pop();
        _propertyShares[propertyId].pop();
    }

    function mintPropertyToken(uint256 pendingPropertyId) public onlyOwner {
        for (uint256 i = 0; i < _propertyOwners[pendingPropertyId].length; i++) {
            _mint(_propertyOwners[pendingPropertyId][i], pendingPropertyId, _propertyShares[pendingPropertyId][i], "");
        }
    }

    function viewProperty(uint256 propertyId) public view returns (propertyDetail memory) {
        return properties[propertyId];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data) public override {
        require(from != to, "from address is same as to address");
        require(_isOwnerFoundInProperty(id, from), "from is not an owner");

        // add "to" to the indexOfPropertyOwners if "to" is not part of owner
        if (!_isOwnerFoundInProperty(id, to)) {
            _propertyOwners[id].push(to);
            _propertyShares[id].push(value);
        } else {
            uint256 toIndex = _getOwnerIndex(id, to);
            _propertyShares[id][toIndex] = _propertyShares[id][toIndex] + value;
        }
        // if from has 0 balance left after the transfer, remove it
        uint256 fromIndex = _getOwnerIndex(id, from);
        _propertyShares[id][fromIndex] = _propertyShares[id][fromIndex] - value;
        if (_propertyShares[id][fromIndex] == 0) {
            _removeOwnerAndShare(id, from);
        }
        // reconstruct the propertyDetail struct
        propertyDetail memory oldProperty = properties[id];
        propertyDetail memory newProperty = propertyDetail(
            oldProperty.postalCode,
            oldProperty.propertyAddress,
            _propertyOwners[id],
            _propertyShares[id]
        );
        properties[id] = newProperty;

        super.safeTransferFrom(from, to, id, value, data);
    }

    // TODO might consider disable this function
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public override {
        // if from has no balance left, remove it
        // always adda to the to
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }
}
