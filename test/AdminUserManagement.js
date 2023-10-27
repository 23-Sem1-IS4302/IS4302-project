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
    const propertyToken =
      await PropertyToken.connect(owner).deploy(userContractAddr);
    const propertyTokenAddr = await propertyToken.getAddress();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.connect(owner).deploy(
      userContractAddr,
      propertyTokenAddr,
    );

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

      expect(await marketplace.owner()).to.equal(owner.address);
      expect(await userContract.owner()).to.equal(owner.address);
      expect(await propertyToken.owner()).to.equal(owner.address);
    });
  });

  describe("Admin management", () => {
    it("should add new admin", async () => {
      const { userContract, owner, notAddedAdmin } =
        await loadFixture(deployFixture);

      expect(
        await userContract
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
        .to.emit(userContract, "AddAdmin")
        .withArgs(owner.address, notAddedAdmin.address);
    });

    it("should not add new admin with the same address", async () => {
      const { userContract, owner, notAddedAdmin } =
        await loadFixture(deployFixture);

      await userContract
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
        userContract
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
      const { userContract, admin1, admin2, user1 } =
        await loadFixture(deployFixture);

      await userContract
        .connect(user1)
        .registerNewUser(
          "Sophie",
          "Smith",
          "British",
          "789-01-2345",
          "456 Oak Lane, London, UK",
        );

      expect(
        await userContract.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([user1.address]);

      expect(await userContract.connect(admin2).approveUser(user1.address))
        .to.emit(userContract, "ApproveUser")
        .withArgs(admin2.address, user1.address);

      expect(
        await userContract.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([]);
    });

    it("should approve any user in pending users", async () => {
      const { userContract, admin1, user1, user2, user3 } =
        await loadFixture(deployFixture);

      await userContract
        .connect(user1)
        .registerNewUser(
          "Sophie",
          "Smith",
          "British",
          "789-01-2345",
          "456 Oak Lane, London, UK",
        );
      await userContract
        .connect(user2)
        .registerNewUser(
          "Muhammad",
          "Rahman",
          "Bangladeshi",
          "567-89-0123",
          "321 Cedar Road, Dhaka, Bangladesh",
        );
      await userContract
        .connect(user3)
        .registerNewUser(
          "Elena",
          "Petrov",
          "Russian",
          "234-56-7890",
          "987 Birch Street, Moscow, Russia",
        );

      expect(
        await userContract.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([user1.address, user2.address, user3.address]);

      await expect(userContract.connect(admin1).approveUser(user2.address))
        .to.emit(userContract, "ApproveUser")
        .withArgs(admin1.address, user2.address);
      expect(
        await userContract.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([user1.address, user3.address]);
    });

    it("should revert if no user in pending list to approve", async () => {
      const { userContract, admin1, user1 } = await loadFixture(deployFixture);

      await expect(
        userContract.connect(admin1).approveUser(user1.address),
      ).to.be.revertedWith("No pending users to approve or reject");
    });

    it("should revert if user not found in pending list to approve", async () => {
      const { userContract, admin1, user1, user2 } =
        await loadFixture(deployFixture);

      await userContract
        .connect(user1)
        .registerNewUser(
          "Sophie",
          "Smith",
          "British",
          "789-01-2345",
          "456 Oak Lane, London, UK",
        );
      await expect(
        userContract.connect(admin1).approveUser(user2.address),
      ).to.be.revertedWith("User not found in pending list, double check");
    });

    it("should reject a user and allow to register again to get approved", async () => {
      const { userContract, admin1, user1 } = await loadFixture(deployFixture);

      await userContract
        .connect(user1)
        .registerNewUser(
          "FakeFirstName",
          "FakeSecondName",
          "FakeNation",
          "234-56-7890",
          "987 Fake Street, FakeCapital, FakeNation",
        );
      await expect(
        userContract.connect(admin1).rejectUser(user1.address, "no fake info"),
      )
        .to.emit(userContract, "RejectUser")
        .withArgs(admin1.address, user1.address, "no fake info");
      expect(
        await userContract.connect(admin1).viewPendingUsers(),
      ).to.deep.equal([]);

      await userContract
        .connect(user1)
        .registerNewUser(
          "Sophie",
          "Smith",
          "British",
          "789-01-2345",
          "456 Oak Lane, London, UK",
        );
      await expect(userContract.connect(admin1).approveUser(user1.address))
        .to.emit(userContract, "ApproveUser")
        .withArgs(admin1.address, user1.address);
    });
  });
});
