// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract HDBT is ERC1155, Ownable, Pausable {
    uint256 tokenId;
    uint256 public constant DEPOSIT = 2 ether;

    uint256[] pendings;
    mapping(uint256 => address) pendingMapping;

    constructor() ERC1155("HDBT") Ownable(msg.sender) {
        tokenId = 0;
    }

    modifier enoughDeposit() {
        require(msg.value == DEPOSIT, "msg.value is not 2 ethers");
        _;
    }

    /**
     * Only owner
     * pause will deactivate contract functionalities
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * Only owner
     * unpause will re-activate contract functionalities
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    // TODO add AccessControl here later
    function mint() public payable whenNotPaused enoughDeposit {
        tokenId++;
        pendingMapping[tokenId] = msg.sender;
        pendings.push(tokenId);
    }

    function viewPendings() public view onlyOwner returns (uint256[] memory) {
        return pendings;
    }

    function _removeFromPendings(uint256 pendingTokenId) private {
        for (uint i = 0; i < pendings.length - 1; i++) {
            if (pendings[i] == pendingTokenId) {
                pendings[i] = pendings[pendings.length - 1];
                break;
            }
        }
        pendings.pop();
    }

    function approveMint(
        uint256 pendingTokenId
    ) public whenNotPaused onlyOwner {
        require(pendingMapping[pendingTokenId] != address(0), "ID not found");

        _mint(pendingMapping[pendingTokenId], pendingTokenId, 1000, "");
        _removeFromPendings(pendingTokenId);
        payable(pendingMapping[pendingTokenId]).transfer(2 ether);
        delete pendingMapping[pendingTokenId];
    }

    // TODO reject the mint
    // TODO user should be able to view all IDs and shares they hold given an address input
}
