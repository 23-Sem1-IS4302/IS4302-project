// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./User.sol";

contract PropertyToken is ERC1155, Ownable {
    constructor(address userContractAddr) ERC1155("PropertyToken") Ownable(msg.sender) {
        userContract = User(userContractAddr);
        tokenId = 0;
    }

    User userContract;
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
    uint256[] _pendingPropertyIds;

    mapping(address => uint256[]) _userPropertyIds;

    event RegisterNewProperty(address indexed userAddr, uint256 indexed propertyId);
    event ApproveProperty(address indexed adminAddr, uint256 indexed propertyId);
    event RejectProperty(address indexed adminAddr, uint256 indexed propertyId, string reason);

    modifier onlyAdmin() {
        require(userContract.isAddressAdmin(msg.sender), "Only administrators can access this function");
        _;
    }
    modifier onlyApprovedUser() {
        require(userContract.isAddressApprovedUser(msg.sender), "Only approved user can access this function");
        _;
    }
    modifier havePendingProperties() {
        require(_pendingPropertyIds.length != 0, "No pending properties to approve or reject");
        _;
    }
    modifier validOwnersShares(address[] memory propertyOwners, uint256[] memory shares) {
        require(propertyOwners.length == shares.length, "Owners and shares length do not match");
        require(propertyOwners.length <= 1000, "At most 1000 owners allowed");

        uint256 totalShares = 0;
        for (uint256 i = 0; i < propertyOwners.length; i++) {
            require(userContract.isAddressApprovedUser(propertyOwners[i]), "Some users are not approved");
            totalShares += shares[i];
        }
        require(totalShares == 1000, "Shares sum is not 1000");
        _;
    }

    function registerNewProperty(
        string memory postalCode,
        string memory propertyAddress,
        address[] memory propertyOwners,
        uint256[] memory shares
    ) public onlyApprovedUser validOwnersShares(propertyOwners, shares) {
        propertyDetail memory newProperty = propertyDetail(postalCode, propertyAddress, propertyOwners, shares);
        properties[tokenId] = newProperty;
        _pendingPropertyIds.push(tokenId);

        emit RegisterNewProperty(msg.sender, tokenId);
        tokenId++;
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

    function _getPropertyIdIndex(uint256 propertyId, address propertyOwner) private view returns (uint256) {
        for (uint256 i = 0; i < _userPropertyIds[propertyOwner].length; i++) {
            if (_userPropertyIds[propertyOwner][i] == propertyId) {
                return i;
            }
        }

        // this revert should never be reached
        revert("dummy");
    }

    function _removePropertyIdFromOwner(uint256 propertyId, address propertyOwner) private {
        uint256 index = _getPropertyIdIndex(propertyId, propertyOwner);

        for (uint256 i = index; i < _userPropertyIds[propertyOwner].length - 1; i++) {
            _userPropertyIds[propertyOwner][i] = _userPropertyIds[propertyOwner][i + 1];
        }
        _userPropertyIds[propertyOwner].pop();
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

    function viewProperty(uint256 propertyId) public view returns (propertyDetail memory) {
        return properties[propertyId];
    }

    function approveProperty(uint256 pendingPropertyId) public onlyAdmin havePendingProperties {
        _removePendingProperty(pendingPropertyId);
        propertyDetail memory propertyToMint = properties[pendingPropertyId];

        for (uint256 i = 0; i < propertyToMint.propertyOwners.length; i++) {
            _mint(propertyToMint.propertyOwners[i], pendingPropertyId, propertyToMint.shares[i], "");

            _userPropertyIds[propertyToMint.propertyOwners[i]].push(pendingPropertyId);
        }
        _propertyOwners[pendingPropertyId] = propertyToMint.propertyOwners;
        _propertyShares[pendingPropertyId] = propertyToMint.shares;

        emit ApproveProperty(msg.sender, pendingPropertyId);
    }

    function rejectProperty(uint256 pendingPropertyId, string memory reason) public onlyAdmin havePendingProperties {
        _removePendingProperty(pendingPropertyId);
        delete properties[pendingPropertyId];
        emit RejectProperty(msg.sender, pendingPropertyId, reason);
    }

    function viewPendingProperties() public view onlyAdmin returns (uint256[] memory) {
        return _pendingPropertyIds;
    }

    function isPropertyIdValid(uint256 propertyId) public view returns (bool) {
        return _propertyOwners[propertyId].length != 0;
    }

    function viewUserProperties(address userAddr) public view returns (uint256[] memory) {
        return _userPropertyIds[userAddr];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data) public override {
        require(from != to, "from address is same as to address");
        require(_isOwnerFoundInProperty(id, from), "from is not an owner");

        if (!_isOwnerFoundInProperty(id, to)) {
            // add "to" to the indexOfPropertyOwners if "to" is not part of owner
            _propertyOwners[id].push(to);
            _propertyShares[id].push(value);

            // add this "id" to the owner's propertyIds
            _userPropertyIds[to].push(id);
        } else {
            uint256 toIndex = _getOwnerIndex(id, to);
            _propertyShares[id][toIndex] = _propertyShares[id][toIndex] + value;
        }
        uint256 fromIndex = _getOwnerIndex(id, from);
        _propertyShares[id][fromIndex] = _propertyShares[id][fromIndex] - value;
        if (_propertyShares[id][fromIndex] == 0) {
            // if "from" in property has 0 balance left after the transfer, remove it
            _removeOwnerAndShare(id, from);

            // remove this "id" from _userPropertyIds["from"]
            _removePropertyIdFromOwner(id, from);
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

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public override {
        require(msg.sender == address(0), "Err: this function is not supported at the moment");
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }
}
