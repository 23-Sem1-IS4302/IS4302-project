const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const PROPERTY_ID_0 = 0;
const PROPERTY_ID_1 = 1;
const PROPERTY_ID_2 = 2;
const DEFAULT_SHARE = 1000;

describe("AdminUserManagement", () => {
  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, admin1, user1, user2, user3] = await ethers.getSigners();

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
      .connect(user1)
      .registerNewUser(
        "Sophie",
        "Smith",
        "British",
        "789-01-2345",
        "456 Oak Lane, London, UK",
      );
    await marketplace.connect(admin1).approveUser(user1.address);
    await marketplace
      .connect(user2)
      .registerNewUser(
        "Muhammad",
        "Rahman",
        "Bangladeshi",
        "567-89-0123",
        "321 Cedar Road, Dhaka, Bangladesh",
      );
    await marketplace.connect(admin1).approveUser(user2.address);

    await marketplace
      .connect(user3)
      .registerNewUser(
        "Elena",
        "Petrov",
        "Russian",
        "234-56-7890",
        "987 Birch Street, Moscow, Russia",
      );
    await marketplace.connect(admin1).approveUser(user3.address);

    return {
      marketplace,
      userContract,
      propertyToken,
      owner,
      admin1,
      user1,
      user2,
      user3,
    };
  }

  describe("Property Approval Rejection", () => {
    it("should approve a registered property", async () => {
      const { marketplace, propertyToken, admin1, user1 } =
        await loadFixture(deployFixture);

      expect(
        await marketplace
          .connect(user1)
          .registerNewProperty("573821", "123 Main Street, Los Angeles, CA"),
      )
        .to.emit(marketplace, "RegisterNewProperty")
        .withArgs(user1.address, PROPERTY_ID_0);

      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0]);

      expect(await marketplace.connect(admin1).approveProperty(PROPERTY_ID_0))
        .to.emit(marketplace, "ApproveProperty")
        .withArgs(admin1.address, user1.address, PROPERTY_ID_0);

      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([]);

      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_0),
      ).to.equal(DEFAULT_SHARE);
    });

    it("should approve any property in pending properties", async () => {
      const { marketplace, propertyToken, admin1, user1 } =
        await loadFixture(deployFixture);

      await marketplace
        .connect(user1)
        .registerNewProperty("573821", "123 Main Street, Los Angeles, CA");
      await marketplace
        .connect(user1)
        .registerNewProperty("892467", "321 Cedar Road, Dhaka, Bangladesh");
      await marketplace
        .connect(user1)
        .registerNewProperty("315749", "987 Birch Street, Moscow, Russia");
      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0, PROPERTY_ID_1, PROPERTY_ID_2]);

      await marketplace.connect(admin1).approveProperty(PROPERTY_ID_1);
      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0, PROPERTY_ID_2]);
      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_1),
      ).to.equal(DEFAULT_SHARE);
    });

    it("should revert if no property in pending list to approve", async () => {
      const { marketplace, admin1 } = await loadFixture(deployFixture);

      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([]);
      await expect(
        marketplace.connect(admin1).approveProperty(PROPERTY_ID_1),
      ).to.be.revertedWith("No pending properties to approve or reject");
    });

    it("should revert if property not found in pending list to approve", async () => {
      const { marketplace, admin1, user1 } = await loadFixture(deployFixture);

      await marketplace
        .connect(user1)
        .registerNewProperty("573821", "123 Main Street, Los Angeles, CA");
      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0]);

      await expect(
        marketplace.connect(admin1).approveProperty(PROPERTY_ID_2),
      ).to.be.revertedWith(
        "Property ID not found in pending list, double check",
      );
    });

    it("should reject a property and allow register again to get approved", async () => {
      const { marketplace, propertyToken, admin1, user1 } =
        await loadFixture(deployFixture);

      await marketplace
        .connect(user1)
        .registerNewProperty("573821", "123 Fake Street, Fake State, FA");
      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0]);

      await expect(
        marketplace
          .connect(admin1)
          .rejectProperty(PROPERTY_ID_0, "no fake info"),
      )
        .to.emit(marketplace, "RejectProperty")
        .withArgs(admin1.address, user1.address, PROPERTY_ID_0, "no fake info");

      await marketplace
        .connect(user1)
        .registerNewProperty("573821", "123 Main Street, Los Angeles, CA");
      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_1]);
      expect(await marketplace.connect(admin1).approveProperty(PROPERTY_ID_1))
        .to.emit(marketplace, "ApproveProperty")
        .withArgs(admin1.address, user1.address, PROPERTY_ID_1);
      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_1),
      ).to.equal(DEFAULT_SHARE);
    });
  });

  describe("View all property given an address", () => {
    //
  });

  describe("View all addresses and shares given a propertyId", () => {
    //
  });
});
