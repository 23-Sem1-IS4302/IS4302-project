const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Admin and User Management", () => {
  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [
      owner,
      notAddedAdmin,
      admin1,
      admin2,
      user1,
      user2,
      user3,
      newOwner,
    ] = await ethers.getSigners();

    const User = await ethers.getContractFactory("User");
    const userContract = await User.connect(owner).deploy();
    const userContractAddr = await userContract.getAddress();

    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    const propertyToken = await PropertyToken.connect(owner).deploy();
    const propertyTokenAddr = await propertyToken.getAddress();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.connect(owner).deploy(
      userContractAddr,
      propertyTokenAddr,
    );
    const marketplaceAddr = await marketplace.getAddress();

    await userContract.connect(owner).transferOwnership(marketplaceAddr);
    await propertyToken.connect(owner).transferOwnership(marketplaceAddr);
    await marketplace
      .connect(owner)
      .addNewAdmin(
        admin1.address,
        "Emily",
        "Johnson",
        "American",
        "123-45-6789",
        "123 Main Street, Los Angeles, CA",
      );

    await marketplace
      .connect(owner)
      .addNewAdmin(
        admin2.address,
        "David",
        "Martinez",
        "Mexican",
        "456-78-9012",
        "789 Elm Avenue, Mexico City",
      );

    return {
      marketplace,
      userContract,
      propertyToken,
      owner,
      notAddedAdmin,
      admin1,
      admin2,
      user1,
      user2,
      user3,
      newOwner,
    };
  }

  describe("Contracts ownership management", () => {
    it("should deploy contract and set contract owner properly", async () => {
      const { marketplace, userContract, propertyToken, owner } =
        await loadFixture(deployFixture);

      const marketplaceAddrress = await marketplace.getAddress();

      expect(await marketplace.owner()).to.equal(owner.address);
      expect(await userContract.owner()).to.equal(marketplaceAddrress);
      expect(await propertyToken.owner()).to.equal(marketplaceAddrress);
    });

    it("should transfer contracts for migration purpose", async () => {
      const { marketplace, userContract, propertyToken, owner, newOwner } =
        await loadFixture(deployFixture);

      await marketplace.connect(owner).transferPropertyTokenOwnership(newOwner);
      await marketplace.connect(owner).transferUserOwnership(newOwner);

      expect(await userContract.owner()).to.equal(newOwner.address);
      expect(await propertyToken.owner()).to.equal(newOwner.address);
    });
  });

  describe("Admin management", () => {
    it("should add new admin", async () => {
      const { marketplace, owner, notAddedAdmin } =
        await loadFixture(deployFixture);

      expect(
        await marketplace
          .connect(owner)
          .addNewAdmin(
            notAddedAdmin.address,
            "Emily",
            "Johnson",
            "American",
            "123-45-6789",
            "123 Main Street, Los Angeles, CA",
          ),
      )
        .to.emit(marketplace, "AddAdmin")
        .withArgs(owner.address, notAddedAdmin.address);
    });

    it("should not add new admin with the same address", async () => {
      const { marketplace, owner, notAddedAdmin } =
        await loadFixture(deployFixture);
      await marketplace
        .connect(owner)
        .addNewAdmin(
          notAddedAdmin.address,
          "Emily",
          "Johnson",
          "American",
          "123-45-6789",
          "123 Main Street, Los Angeles, CA",
        );

      await expect(
        marketplace
          .connect(owner)
          .addNewAdmin(
            notAddedAdmin.address,
            "David",
            "Martinez",
            "Mexican",
            "456-78-9012",
            "789 Elm Avenue, Mexico City",
          ),
      ).to.be.revertedWith("No duplicate admin allowed");
    });
  });

  describe("User management", () => {
    it("should approve a registered user", async () => {
      const { marketplace, admin1, admin2, user1 } =
        await loadFixture(deployFixture);

      await marketplace
        .connect(user1)
        .registerNewUser(
          "Sophie",
          "Smith",
          "British",
          "789-01-2345",
          "456 Oak Lane, London, UK",
        );

      expect(
        await marketplace.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([user1.address]);

      expect(await marketplace.connect(admin2).approveUser(user1.address))
        .to.emit(marketplace, "ApproveUser")
        .withArgs(admin2.address, user1.address);

      expect(
        await marketplace.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([]);
    });

    it("should approve any user in pending users", async () => {
      const { marketplace, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await marketplace
        .connect(user1)
        .registerNewUser(
          "Sophie",
          "Smith",
          "British",
          "789-01-2345",
          "456 Oak Lane, London, UK",
        );
      await marketplace
        .connect(user2)
        .registerNewUser(
          "Muhammad",
          "Rahman",
          "Bangladeshi",
          "567-89-0123",
          "321 Cedar Road, Dhaka, Bangladesh",
        );
      await marketplace
        .connect(user3)
        .registerNewUser(
          "Elena",
          "Petrov",
          "Russian",
          "234-56-7890",
          "987 Birch Street, Moscow, Russia",
        );

      expect(
        await marketplace.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([user1.address, user2.address, user3.address]);

      await expect(marketplace.connect(admin1).approveUser(user2.address))
        .to.emit(marketplace, "ApproveUser")
        .withArgs(admin1.address, user2.address);
      expect(
        await marketplace.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([user1.address, user3.address]);
    });

    it("should revert if no user in pending list to approve", async () => {
      const { marketplace, admin1, user1 } = await loadFixture(deployFixture);

      await expect(
        marketplace.connect(admin1).approveUser(user1.address),
      ).to.be.revertedWith("No pending users to approve or reject");
    });

    it("should revert if user not found in pending list to approve", async () => {
      const { marketplace, admin1, user1, user2 } =
        await loadFixture(deployFixture);

      await marketplace
        .connect(user1)
        .registerNewUser(
          "Sophie",
          "Smith",
          "British",
          "789-01-2345",
          "456 Oak Lane, London, UK",
        );
      await expect(
        marketplace.connect(admin1).approveUser(user2.address),
      ).to.be.revertedWith("User not found in pending list, double check");
    });

    it("should reject a user and allow to register again to get approved", async () => {
      const { marketplace, admin1, user1 } = await loadFixture(deployFixture);

      await marketplace
        .connect(user1)
        .registerNewUser(
          "FakeFirstName",
          "FakeSecondName",
          "FakeNation",
          "234-56-7890",
          "987 Fake Street, FakeCapital, FakeNation",
        );
      await expect(
        marketplace.connect(admin1).rejectUser(user1.address, "no fake info"),
      )
        .to.emit(marketplace, "RejectUser")
        .withArgs(admin1.address, user1.address, "no fake info");
      expect(
        await marketplace.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([]);

      await marketplace
        .connect(user1)
        .registerNewUser(
          "Sophie",
          "Smith",
          "British",
          "789-01-2345",
          "456 Oak Lane, London, UK",
        );
      await expect(marketplace.connect(admin1).approveUser(user1.address))
        .to.emit(marketplace, "ApproveUser")
        .withArgs(admin1.address, user1.address);
    });
  });
});
