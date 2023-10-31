const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * This function verifies owners and shares of a property
 * The supplied expectedOwners and expectedShares must match at the same index
 * e.g. If address1 owns 400 and address2 owns 600
 * expectedOwners can be [address1, address2] and expectedShares can be [400, 600]
 * or
 * expectedOwners can be [address2, address1] and expectedShares can be [600, 400]
 *
 * This is not allowed
 * expectedOwners can be [address2, address1] and expectedShares can be [400, 600]
 * as address2 does not own 400, it owns 600
 *
 * @param {string[]} owners: addresses in the response from viewProperty()
 * @param {BigInt[]} shares: shares in the response from viewProperty()
 * @param {string[]} expectedOwners: expected addresses
 * @param {int[]} expectedShares: expected shares in **int** array
 */
function verifyPropertyOwnersShares(
  owners,
  shares,
  expectedOwners,
  expectedShares,
) {
  const expectedSharesBigInt = expectedShares.map((item) => BigInt(item));
  expect(owners).to.include.members(expectedOwners);
  expect(owners.length).to.equal(expectedOwners.length);
  expect(shares).to.include.members(expectedSharesBigInt);
  expect(shares.length).to.equal(shares.length);

  for (let index = 0; index < expectedOwners.length; index++) {
    const expectedOwner = expectedOwners[index];
    const expectedShare = expectedShares[index];

    const indexExpectedOwner = owners.indexOf(expectedOwner);
    expect(shares[indexExpectedOwner]).to.equal(expectedShare);
  }
}

describe("Property Management", () => {
  const PROPERTY_ID_0 = BigInt(0);
  const PROPERTY_ID_1 = BigInt(1);
  const PROPERTY_ID_2 = BigInt(2);
  const ONE_THOUSAND_SHARES = 1000;

  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, admin1, user1, user2, user3, notApprovedUser] =
      await ethers.getSigners();

    const User = await ethers.getContractFactory("User");
    const userContract = await User.connect(owner).deploy();
    const userContractAddr = await userContract.getAddress();

    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    const propertyToken =
      await PropertyToken.connect(owner).deploy(userContractAddr);

    await userContract
      .connect(owner)
      .addNewAdmin(
        admin1.address,
        "Emily",
        "Johnson",
        "American",
        "123-45-6789",
        "123 Main Street, Los Angeles, CA",
      );

    await userContract
      .connect(user1)
      .registerNewUser(
        "Sophie",
        "Smith",
        "British",
        "789-01-2345",
        "456 Oak Lane, London, UK",
      );
    await userContract.connect(admin1).approveUser(user1.address);
    await userContract
      .connect(user2)
      .registerNewUser(
        "Muhammad",
        "Rahman",
        "Bangladeshi",
        "567-89-0123",
        "321 Cedar Road, Dhaka, Bangladesh",
      );
    await userContract.connect(admin1).approveUser(user2.address);

    await userContract
      .connect(user3)
      .registerNewUser(
        "Elena",
        "Petrov",
        "Russian",
        "234-56-7890",
        "987 Birch Street, Moscow, Russia",
      );
    await userContract.connect(admin1).approveUser(user3.address);

    return {
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
      const { propertyToken, admin1, user1 } = await loadFixture(deployFixture);

      expect(
        await propertyToken
          .connect(user1)
          .registerNewProperty(
            "573821",
            "123 Main Street, Los Angeles, CA",
            [user1.address],
            [ONE_THOUSAND_SHARES],
          ),
      )
        .to.emit(propertyToken, "RegisterNewProperty")
        .withArgs(user1.address, PROPERTY_ID_0);

      expect(
        await propertyToken.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0]);

      expect(await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0))
        .to.emit(propertyToken, "ApproveProperty")
        .withArgs(admin1.address, PROPERTY_ID_0);

      expect(
        await propertyToken.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([]);

      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_0),
      ).to.equal(ONE_THOUSAND_SHARES);
      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.deep.equal([PROPERTY_ID_0]);
    });

    it("should returns propertyId as valid only after approval", async () => {
      const { propertyToken, admin1, user1 } = await loadFixture(deployFixture);

      expect(
        await propertyToken
          .connect(user1)
          .registerNewProperty(
            "573821",
            "123 Main Street, Los Angeles, CA",
            [user1.address],
            [ONE_THOUSAND_SHARES],
          ),
      )
        .to.emit(propertyToken, "RegisterNewProperty")
        .withArgs(user1.address, PROPERTY_ID_0);

      expect(await propertyToken.isPropertyIdValid(PROPERTY_ID_0)).to.equal(
        false,
      );

      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0);

      expect(await propertyToken.isPropertyIdValid(PROPERTY_ID_0)).to.equal(
        true,
      );
    });

    it("should approve any property in pending properties", async () => {
      const { propertyToken, admin1, user1 } = await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "892467",
          "321 Cedar Road, Dhaka, Bangladesh",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "315749",
          "987 Birch Street, Moscow, Russia",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      expect(
        await propertyToken.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0, PROPERTY_ID_1, PROPERTY_ID_2]);

      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_1);
      expect(
        await propertyToken.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0, PROPERTY_ID_2]);
      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_1),
      ).to.equal(ONE_THOUSAND_SHARES);
    });

    it("should revert if no property in pending list to approve", async () => {
      const { propertyToken, admin1 } = await loadFixture(deployFixture);

      expect(
        await propertyToken.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([]);
      await expect(
        propertyToken.connect(admin1).approveProperty(PROPERTY_ID_1),
      ).to.be.revertedWith("No pending properties to approve or reject");
    });

    it("should revert if property not found in pending list to approve", async () => {
      const { propertyToken, admin1, user1 } = await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      expect(
        await propertyToken.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0]);

      await expect(
        propertyToken.connect(admin1).approveProperty(PROPERTY_ID_2),
      ).to.be.revertedWith(
        "Property ID not found in pending list, double check",
      );
    });

    it("should reject a property and allow register again to get approved", async () => {
      const { propertyToken, admin1, user1 } = await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Fake Street, Fake State, FA",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      expect(
        await propertyToken.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_0]);
      const [posrtalCode, address, propertyOwners, shares] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      expect(posrtalCode).to.equal("573821");
      expect(address).to.equal("123 Fake Street, Fake State, FA");
      expect(propertyOwners).to.deep.equal([user1.address]);
      expect(shares).to.deep.equal([ONE_THOUSAND_SHARES]);

      await expect(
        propertyToken
          .connect(admin1)
          .rejectProperty(PROPERTY_ID_0, "no fake info"),
      )
        .to.emit(propertyToken, "RejectProperty")
        .withArgs(admin1.address, PROPERTY_ID_0, "no fake info");
      const [posrtalCode1, address1, propertyOwners1, shares1] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      expect(posrtalCode1).to.equal("");
      expect(address1).to.equal("");
      expect(propertyOwners1).to.deep.equal([]);
      expect(shares1).to.deep.equal([]);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address],
          [ONE_THOUSAND_SHARES],
        );
      expect(
        await propertyToken.connect(admin1).viewPendingProperties(),
      ).to.deep.equal([PROPERTY_ID_1]);
      expect(await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_1))
        .to.emit(propertyToken, "ApproveProperty")
        .withArgs(admin1.address, PROPERTY_ID_1);
      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_1),
      ).to.equal(ONE_THOUSAND_SHARES);
    });

    it("should mint property to more than 1 owners", async () => {
      const { propertyToken, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address, user2.address, user3.address],
          [300, 300, 400],
        );
      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0);

      expect(
        await propertyToken.balanceOf(user1.address, PROPERTY_ID_0),
      ).to.equal(300);
      expect(
        await propertyToken.balanceOf(user2.address, PROPERTY_ID_0),
      ).to.equal(300);
      expect(
        await propertyToken.balanceOf(user3.address, PROPERTY_ID_0),
      ).to.equal(400);

      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.deep.equal([PROPERTY_ID_0]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.deep.equal([PROPERTY_ID_0]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.deep.equal([PROPERTY_ID_0]);
    });

    it("should not register the property if owners and shares size are not equal", async () => {
      const { propertyToken, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await expect(
        propertyToken
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
      const { propertyToken, user1, notApprovedUser } =
        await loadFixture(deployFixture);

      await expect(
        propertyToken
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
      const { propertyToken, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await expect(
        propertyToken
          .connect(user1)
          .registerNewProperty(
            "573821",
            "123 Main Street, Los Angeles, CA",
            [user1.address, user2.address, user3.address],
            [300, 300, 401],
          ),
      ).to.be.revertedWith("Shares sum is not 1000");
      await expect(
        propertyToken
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

  describe("View all addresses and shares given a propertyId", () => {
    it("should have correct owners and shares after approval", async () => {
      const { propertyToken, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address, user2.address, user3.address],
          [250, 350, 400],
        );
      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0);

      const [dummy1, dummy2, propertyOwners, shares] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      const expectedOwners = [user1.address, user2.address, user3.address];
      const expectedShares = [250, 350, 400];

      verifyPropertyOwnersShares(
        propertyOwners,
        shares,
        expectedOwners,
        expectedShares,
      );
    });

    it("should show the new owner after the transfer", async () => {
      const { propertyToken, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address, user2.address],
          [300, 700],
        );
      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0);
      await propertyToken
        .connect(user2)
        .safeTransferFrom(
          user2.address,
          user3.address,
          PROPERTY_ID_0,
          300,
          "0x",
        );

      const [dummy1, dummy2, propertyOwners, shares] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      const expectedOwners = [user1.address, user2.address, user3.address];
      const expectedShares = [300, 400, 300];

      verifyPropertyOwnersShares(
        propertyOwners,
        shares,
        expectedOwners,
        expectedShares,
      );

      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.deep.equal([PROPERTY_ID_0]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.deep.equal([PROPERTY_ID_0]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.deep.equal([PROPERTY_ID_0]);
    });

    it("should remove owner after transfer all shares", async () => {
      const { propertyToken, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address, user2.address],
          [300, 700],
        );
      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0);
      await propertyToken
        .connect(user2)
        .safeTransferFrom(
          user2.address,
          user3.address,
          PROPERTY_ID_0,
          700,
          "0x",
        );

      const [dummy1, dummy2, propertyOwners, shares] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      const expectedOwners = [user1.address, user3.address];
      const expectedShares = [300, 700];
      verifyPropertyOwnersShares(
        propertyOwners,
        shares,
        expectedOwners,
        expectedShares,
      );
      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.deep.equal([PROPERTY_ID_0]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.deep.equal([]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.deep.equal([PROPERTY_ID_0]);

      await propertyToken
        .connect(user1)
        .safeTransferFrom(
          user1.address,
          user3.address,
          PROPERTY_ID_0,
          300,
          "0x",
        );
      const [dummy11, dummy12, propertyOwners1, shares1] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      const expectedOwners1 = [user3.address];
      const expectedShares1 = [1000];

      verifyPropertyOwnersShares(
        propertyOwners1,
        shares1,
        expectedOwners1,
        expectedShares1,
      );

      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.deep.equal([]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.deep.equal([]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.deep.equal([PROPERTY_ID_0]);
    });

    it("should revert if owner starting the transfer not found in the property", async () => {
      const { propertyToken, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address, user2.address],
          [300, 700],
        );
      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0);
      await expect(
        propertyToken
          .connect(user2)
          .safeTransferFrom(
            user3.address,
            user2.address,
            PROPERTY_ID_0,
            700,
            "0x",
          ),
      ).to.be.revertedWith("from is not an owner");
    });

    it("should revert if transfer invalid shares", async () => {
      const { propertyToken, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address, user2.address],
          [300, 700],
        );
      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0);
      await expect(
        propertyToken
          .connect(user2)
          .safeTransferFrom(
            user2.address,
            user3.address,
            PROPERTY_ID_0,
            701,
            "0x",
          ),
      ).to.be.revertedWithPanic();
    });

    it("should show owners, shares and properties correctly after multiple shares transfers", async () => {
      const { propertyToken, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "573821",
          "123 Main Street, Los Angeles, CA",
          [user1.address, user2.address, user3.address],
          [200, 300, 500],
        );
      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0);
      var [dummy1, dummy2, propertyOwners0, shares0] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      verifyPropertyOwnersShares(
        propertyOwners0,
        shares0,
        [user1.address, user2.address, user3.address],
        [200, 300, 500],
      );
      await propertyToken
        .connect(user1)
        .registerNewProperty(
          "892467",
          "321 Cedar Road, Dhaka, Bangladesh",
          [user1.address, user2.address, user3.address],
          [300, 400, 300],
        );
      await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_1);
      var [dummy1, dummy2, propertyOwners1, shares1] =
        await propertyToken.viewProperty(PROPERTY_ID_1);
      verifyPropertyOwnersShares(
        propertyOwners1,
        shares1,
        [user1.address, user2.address, user3.address],
        [300, 400, 300],
      );
      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);

      // user3 transfer to user1 PROPERTY_ID_1 300
      await propertyToken
        .connect(user3)
        .safeTransferFrom(
          user3.address,
          user1.address,
          PROPERTY_ID_1,
          300,
          "0x",
        );
      var [dummy1, dummy2, propertyOwners0, shares0] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      verifyPropertyOwnersShares(
        propertyOwners0,
        shares0,
        [user1.address, user2.address, user3.address],
        [200, 300, 500],
      );
      var [dummy1, dummy2, propertyOwners1, shares1] =
        await propertyToken.viewProperty(PROPERTY_ID_1);
      verifyPropertyOwnersShares(
        propertyOwners1,
        shares1,
        [user1.address, user2.address],
        [600, 400],
      );
      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.include.members([PROPERTY_ID_0]);

      // user2 transfer to user3 PROPERTY_ID_1 200
      await propertyToken
        .connect(user2)
        .safeTransferFrom(
          user2.address,
          user3.address,
          PROPERTY_ID_1,
          200,
          "0x",
        );
      var [dummy1, dummy2, propertyOwners0, shares0] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      verifyPropertyOwnersShares(
        propertyOwners0,
        shares0,
        [user1.address, user2.address, user3.address],
        [200, 300, 500],
      );
      var [dummy1, dummy2, propertyOwners1, shares1] =
        await propertyToken.viewProperty(PROPERTY_ID_1);
      verifyPropertyOwnersShares(
        propertyOwners1,
        shares1,
        [user1.address, user2.address, user3.address],
        [600, 200, 200],
      );
      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);

      // user2 transfer to user3 PROPERTY_ID_0 300
      await propertyToken
        .connect(user2)
        .safeTransferFrom(
          user2.address,
          user3.address,
          PROPERTY_ID_0,
          300,
          "0x",
        );
      var [dummy1, dummy2, propertyOwners0, shares0] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      verifyPropertyOwnersShares(
        propertyOwners0,
        shares0,
        [user1.address, user3.address],
        [200, 800],
      );
      var [dummy1, dummy2, propertyOwners1, shares1] =
        await propertyToken.viewProperty(PROPERTY_ID_1);
      verifyPropertyOwnersShares(
        propertyOwners1,
        shares1,
        [user1.address, user2.address, user3.address],
        [600, 200, 200],
      );
      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.include.members([PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);

      // user3 transfer to user1 PROPERTY_ID_0 100
      await propertyToken
        .connect(user3)
        .safeTransferFrom(
          user3.address,
          user1.address,
          PROPERTY_ID_0,
          100,
          "0x",
        );
      var [dummy1, dummy2, propertyOwners0, shares0] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      verifyPropertyOwnersShares(
        propertyOwners0,
        shares0,
        [user1.address, user3.address],
        [300, 700],
      );
      var [dummy1, dummy2, propertyOwners1, shares1] =
        await propertyToken.viewProperty(PROPERTY_ID_1);
      verifyPropertyOwnersShares(
        propertyOwners1,
        shares1,
        [user1.address, user2.address, user3.address],
        [600, 200, 200],
      );
      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.include.members([PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);

      // user1 transfer to user2 PROPERTY_ID_1 100
      await propertyToken
        .connect(user1)
        .safeTransferFrom(
          user1.address,
          user2.address,
          PROPERTY_ID_1,
          100,
          "0x",
        );
      var [dummy1, dummy2, propertyOwners0, shares0] =
        await propertyToken.viewProperty(PROPERTY_ID_0);
      verifyPropertyOwnersShares(
        propertyOwners0,
        shares0,
        [user1.address, user3.address],
        [300, 700],
      );
      var [dummy1, dummy2, propertyOwners1, shares1] =
        await propertyToken.viewProperty(PROPERTY_ID_1);
      verifyPropertyOwnersShares(
        propertyOwners1,
        shares1,
        [user1.address, user2.address, user3.address],
        [500, 300, 200],
      );
      expect(
        await propertyToken.viewUserProperties(user1.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user2.address),
      ).to.include.members([PROPERTY_ID_1]);
      expect(
        await propertyToken.viewUserProperties(user3.address),
      ).to.include.members([PROPERTY_ID_0, PROPERTY_ID_1]);
    });
  });
});
