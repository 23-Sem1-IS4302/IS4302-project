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

	mapping(address => userDetail) users;

	constructor() Ownable(msg.sender) {}

	function addNewAdmin(
		address adminAddress,
		string memory firstName,
		string memory lastName,
		string memory nationality,
		string memory nationalId,
		string memory residentialAddress
	) public onlyOwner {
		userDetail memory newAdmin = userDetail(firstName, lastName, nationality, nationalId, residentialAddress);
		users[adminAddress] = newAdmin;
	}

	function addNewUser(
		address userAddress,
		string memory firstName,
		string memory lastName,
		string memory nationality,
		string memory nationalId,
		string memory residentialAddress
	) public onlyOwner {
		userDetail memory newUser = userDetail(firstName, lastName, nationality, nationalId, residentialAddress);
		users[userAddress] = newUser;
	}
}
