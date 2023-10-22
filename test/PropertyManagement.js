const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AdminUserManagement", () => {
  const PROPERTY_ID_0 = 0;
  const PROPERTY_ID_1 = 1;
  const PROPERTY_ID_2 = 2;
  const ONE_THOUSAND_SHARES = 1000;

  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, admin1, user1, user2, user3, notApprovedUser] =
      await ethers.getSigners();

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
      notApprovedUser,
    };
  }

  describe("Property Approval Rejection", () => {
    it("should approve a registered property", async () => {
      const { marketplace, propertyToken, admin1, user1 } =
        await loadFixture(deployFixture);

      expect(
        await marketplace
          .connect(user1)
          .registerNewProperty(
            "573821",
            "123 Main Street, Los Angeles, CA",
            [user1.address],
            [ONE_THOUSAND_SHARES],
          ),
      )
        .to.emit(marketplace, "RegisterNewProperty")
        .withArgs(user1.address, PROPERTY_ID_0);

      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0]);

      expect(await marketplace.connect(admin1).approveProperty(PROPERTY_ID_0))
        .to.emit(marketplace, "ApproveProperty")
        .withArgs(admin1.address, PROPERTY_ID_0);

      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([]);

      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_0),
      ).to.equal(ONE_THOUSAND_SHARES);
    });

    it("should approve any property in pending properties", async () => {
      const { marketplace, propertyToken, admin1, user1 } =
        await loadFixture(deployFixture);

      await marketplace
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      await marketplace
        .connect(user1)
        .registerNewProperty(
          "892467",
          "321 Cedar Road, Dhaka, Bangladesh",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      await marketplace
        .connect(user1)
        .registerNewProperty(
          "315749",
          "987 Birch Street, Moscow, Russia",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0, PROPERTY_ID_1, PROPERTY_ID_2]);

      await marketplace.connect(admin1).approveProperty(PROPERTY_ID_1);
      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0, PROPERTY_ID_2]);
      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_1),
      ).to.equal(ONE_THOUSAND_SHARES);
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
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
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
        .registerNewProperty(
          "573821",
          "123 Fake Street, Fake State, FA",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0]);

      await expect(
        marketplace
          .connect(admin1)
          .rejectProperty(PROPERTY_ID_0, "no fake info"),
      )
        .to.emit(marketplace, "RejectProperty")
        .withArgs(admin1.address, PROPERTY_ID_0, "no fake info");

      await marketplace
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      expect(
        await marketplace.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_1]);
      expect(await marketplace.connect(admin1).approveProperty(PROPERTY_ID_1))
        .to.emit(marketplace, "ApproveProperty")
        .withArgs(admin1.address, PROPERTY_ID_1);
      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_1),
      ).to.equal(ONE_THOUSAND_SHARES);
    });

    it("should mint property to more than 1 owners", async () => {
      const { marketplace, propertyToken, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await marketplace
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address, user2.address, user3.address],
          [300, 300, 400],
        );
      await marketplace.connect(admin1).approveProperty(PROPERTY_ID_0);

      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_0),
      ).to.equal(300);
      expect(
        await propertyToken.balanceOf(user2.address, PROPERTY_ID_0),
      ).to.equal(300);
      expect(
        await propertyToken.balanceOf(user3.address, PROPERTY_ID_0),
      ).to.equal(400);
    });

    it("should not register the property if owners and shares size are not equal", async () => {
      const { marketplace, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await expect(
        marketplace
          .connect(user1)
          .registerNewProperty(
            "573821",
            "123 Main Street, Los Angeles, CA",
            [user1.address, user2.address, user3.address],
            [300, 300],
          ),
      ).to.be.revertedWith("Owners and shares length do not match");
    });

    it("should not register the property if one user is not approved", async () => {
      const { marketplace, user1, notApprovedUser } =
        await loadFixture(deployFixture);

      await expect(
        marketplace
          .connect(user1)
          .registerNewProperty(
            "573821",
            "123 Main Street, Los Angeles, CA",
            [user1.address, notApprovedUser.address],
            [500, 500],
          ),
      ).to.be.revertedWith("Some users are not approved");
    });

    it("should not register the property if shares sum is not 1000", async () => {
      const { marketplace, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await expect(
        marketplace
          .connect(user1)
          .registerNewProperty(
            "573821",
            "123 Main Street, Los Angeles, CA",
            [user1.address, user2.address, user3.address],
            [300, 300, 401],
          ),
      ).to.be.revertedWith("Shares sum is not 1000");
      await expect(
        marketplace
          .connect(user1)
          .registerNewProperty(
            "573821",
            "123 Main Street, Los Angeles, CA",
            [user1.address, user2.address, user3.address],
            [333, 333, 333],
          ),
      ).to.be.revertedWith("Shares sum is not 1000");
    });
  });

  describe("View all property given an address", () => {
    //
  });

  describe("View all addresses and shares given a propertyId", () => {
    //
  });
});
