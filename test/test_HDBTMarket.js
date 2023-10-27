const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HDBTMarketPlace", function () {
  async function deployMarketFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, user1, user2] = await ethers.getSigners();

    const HDBT = await ethers.getContractFactory("HDBT");
    const hdbt = await HDBT.deploy();
    const MARKET = await ethers.getContractFactory("HDBTMarketplace");
    const market = await MARKET.deploy(hdbt, ethers.parseEther("0.01"));

    return { hdbt, market, owner, user1, user2 };
  }
  describe("List token", function () {
    it("Item can be listed successfully", async function () {
      const { hdbt, market, owner, user1, user2 } =
        await loadFixture(deployMarketFixture);
      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });
      await hdbt.connect(owner).approveMint(1);
      await expect(
        market.connect(user1).listItem(1, ethers.parseEther("10"), 500)
      )
        .to.emit(market, "ItemListed")
        .withArgs(user1.address, 1, 500, ethers.parseEther("10"));
    });

    it("Cannot list repeatedly", async function () {
      const { hdbt, market, owner, user1, user2 } =
        await loadFixture(deployMarketFixture);
      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });
      await hdbt.connect(owner).approveMint(1);
      await market.connect(user1).listItem(1, ethers.parseEther("10"), 500);
      await expect(
        market.connect(user1).listItem(1, ethers.parseEther("10"), 500)
      ).to.be.revertedWith("Token owned is already listed");
    });

    it("Only owner with enough balance can list", async function () {
      const { hdbt, market, owner, user1, user2 } =
        await loadFixture(deployMarketFixture);
      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });
      await hdbt.connect(owner).approveMint(1);
      await expect(
        market.connect(user2).listItem(1, ethers.parseEther("10"), 500)
      ).to.be.revertedWith("You do not own enough tokens to list this amount");
    });

    it("Cancel listing", async function () {
      const { hdbt, market, owner, user1, user2 } =
        await loadFixture(deployMarketFixture);
      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });
      await hdbt.connect(owner).approveMint(1);
      await market.connect(user1).listItem(1, ethers.parseEther("10"), 500);
      await market.connect(user1).cancelListing(1);
      await expect(
        market.connect(user2).getListingPrice(1, user1.address)
      ).to.be.revertedWith("The listing does not exist");
    });
  });
  describe("Buyer offer", function () {
    it("send offer", async function () {
      const { hdbt, market, owner, user1, user2 } =
        await loadFixture(deployMarketFixture);
      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });
      await hdbt.connect(owner).approveMint(1);
      await market.connect(user1).listItem(1, ethers.parseEther("10"), 500);
      // TODO: continue from here
    });
  });
});
