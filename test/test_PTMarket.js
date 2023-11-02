const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PTMarketPlace", function () {
  const PROPERTY_ID_0 = 0;
  const ONE_THOUSAND_SHARES = 1000;
  async function deployMarketFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, admin1, user1, user2] = await ethers.getSigners();

    const User = await ethers.getContractFactory("User");
    const userContract = await User.connect(owner).deploy();
    const userContractAddr = await userContract.getAddress();

    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    const propertyToken =
      await PropertyToken.connect(owner).deploy(userContractAddr);
    const PTAddr = await propertyToken.getAddress();
    const MARKET = await ethers.getContractFactory("PTMarketPlace");
    const market = await MARKET.deploy(
      userContractAddr,
      PTAddr,
      ethers.parseEther("0.01"),
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
    await propertyToken
      .connect(user1)
      .registerNewProperty(
        "573821",
        "123 Main Street, Los Angeles, CA",
        [user1.address],
        [ONE_THOUSAND_SHARES],
      );
    await propertyToken.connect(admin1).approveProperty(PROPERTY_ID_0);

    return {
      userContract,
      propertyToken,
      market,
      owner,
      admin1,
      user1,
      user2,
    };
  }
  //userContract, propertyToken, market, owner, admin1, user1, user2
  describe("List token", function () {
    it("Item can be listed successfully", async function () {
      const { market, user1 } = await loadFixture(deployMarketFixture);
      await expect(
        market
          .connect(user1)
          .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500),
      )
        .to.emit(market, "ItemListed")
        .withArgs(user1.address, PROPERTY_ID_0, 500, ethers.parseEther("10"));
    });

    it("Cannot list repeatedly", async function () {
      const { market, user1 } = await loadFixture(deployMarketFixture);
      await market
        .connect(user1)
        .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500);
      await expect(
        market
          .connect(user1)
          .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500),
      ).to.be.revertedWith("Token owned is already listed");
    });

    it("Only owner with enough balance can list", async function () {
      const { market, user2 } = await loadFixture(deployMarketFixture);
      await expect(
        market
          .connect(user2)
          .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500),
      ).to.be.revertedWith("You do not own enough tokens to list this amount");
    });

    it("Cancel listing", async function () {
      const { market, user1, user2 } = await loadFixture(deployMarketFixture);
      await market
        .connect(user1)
        .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500);
      await market.connect(user1).unlistProperty(PROPERTY_ID_0);
      await expect(
        market.connect(user2).getListingPrice(PROPERTY_ID_0, user1.address),
      ).to.be.revertedWith("The listing does not exist");
    });
  });
  describe("Buyer offer", function () {
    it("send offer", async function () {
      const { market, user1, user2 } = await loadFixture(deployMarketFixture);
      await market
        .connect(user1)
        .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500);
      await expect(
        market
          .connect(user2)
          .sendOffer(PROPERTY_ID_0, user1.address, ethers.parseEther("11")),
      )
        .to.emit(market, "OfferSent")
        .withArgs(
          user1.address,
          PROPERTY_ID_0,
          ethers.parseEther("11"),
          user2.address,
        );
      expect(
        await market.getOfferPrice(PROPERTY_ID_0, user1.address, user2.address),
      ).to.be.equal(ethers.parseEther("11"));
    });

    // it("offer price should be as high as initial price", async function () {
    //   const { userContract, propertyToken, market, owner, admin1, user1, user2 } =
    //     await loadFixture(deployMarketFixture);
    //   await market.connect(user1).listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500);
    //   await expect(
    //     market.connect(user2).sendOffer(PROPERTY_ID_0, user1.address, ethers.parseEther("9"))
    //   )
    //   .to.be.revertedWith("Price offered is lower than listed price");
    // });

    it("retract offer", async function () {
      const { market, user1, user2 } = await loadFixture(deployMarketFixture);
      await market
        .connect(user1)
        .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500);
      await market
        .connect(user2)
        .sendOffer(PROPERTY_ID_0, user1.address, ethers.parseEther("11"));
      await market.connect(user2).retractOffer(PROPERTY_ID_0, user1.address);
      await expect(
        market
          .connect(user2)
          .getOfferPrice(PROPERTY_ID_0, user1.address, user2.address),
      ).to.be.revertedWith("The offer does not exist");
    });
  });

  describe("accept offer and transaction of tokens bought", function () {
    it("accept offer and make payment", async function () {
      const { propertyToken, market, user1, user2 } =
        await loadFixture(deployMarketFixture);
      await market
        .connect(user1)
        .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500);
      await market
        .connect(user2)
        .sendOffer(PROPERTY_ID_0, user1.address, ethers.parseEther("11"));
      await market.connect(user1).acceptOffer(PROPERTY_ID_0, user2.address);
      const marketAddr = await market.getAddress();
      await propertyToken.connect(user1).setApprovalForAll(marketAddr, true);
      expect(
        await market
          .connect(user2)
          .executePropertySale(PROPERTY_ID_0, user1.address, {
            value: ethers.parseEther("11"),
          }),
      ).to.changeEtherBalance(user2, ethers.parseEther("11"));
      expect(await propertyToken.balanceOf(user2, PROPERTY_ID_0)).to.be.equal(
        500,
      );
    });
    it("cannot unlist or send new offers once an offer is accepted (within 7 days)", async function () {
      const { market, user1, user2 } = await loadFixture(deployMarketFixture);
      await market
        .connect(user1)
        .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500);
      await market
        .connect(user2)
        .sendOffer(PROPERTY_ID_0, user1.address, ethers.parseEther("11"));
      await market.connect(user1).acceptOffer(PROPERTY_ID_0, user2.address);
      await expect(
        market.connect(user1).unlistProperty(PROPERTY_ID_0),
      ).to.revertedWith("This listing has a buyer and is in pending state");
      await expect(
        market
          .connect(user2)
          .sendOffer(PROPERTY_ID_0, user1.address, ethers.parseEther("20")),
      ).to.revertedWith("This listing has a buyer and is in pending state");
    });
    it("Can no longer make payment if the deal expires after 7 days", async function () {
      const { propertyToken, market, user1, user2 } =
        await loadFixture(deployMarketFixture);
      await market
        .connect(user1)
        .listProperty(PROPERTY_ID_0, ethers.parseEther("10"), 500);
      await market
        .connect(user2)
        .sendOffer(PROPERTY_ID_0, user1.address, ethers.parseEther("11"));
      await market.connect(user1).acceptOffer(PROPERTY_ID_0, user2.address);
      const marketAddr = await market.getAddress();
      await propertyToken.connect(user1).setApprovalForAll(marketAddr, true);
      await time.increase(3600 * 24 * 8);
      await expect(
        market
          .connect(user2)
          .executePropertySale(PROPERTY_ID_0, user1.address, {
            value: ethers.parseEther("11"),
          }),
      ).to.revertedWith(
        "Only buyer with non-expired deal can call this function",
      );
    });
  });
});
