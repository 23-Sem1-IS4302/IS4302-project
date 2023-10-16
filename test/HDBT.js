const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HDBT", function () {
  async function deployHDBTFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, user1, user2] = await ethers.getSigners();

    const HDBT = await ethers.getContractFactory("HDBT");
    const hdbt = await HDBT.deploy();

    return { hdbt, owner, user1, user2 };
  }

  describe("pending", function () {
    it("Should submit to pendingMapping", async function () {
      const { hdbt, owner, user1 } = await loadFixture(deployHDBTFixture);

      await expect(
        hdbt.connect(user1).mint({ value: ethers.parseUnits("2") })
      ).to.changeEtherBalance(user1, -ethers.parseUnits("2"));
      expect(await hdbt.connect(owner).viewPendings()).to.deep.equal([1]);
    });

    it("Should submit more than once to pendingMapping", async function () {
      const { hdbt, owner, user1 } = await loadFixture(deployHDBTFixture);

      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });
      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });

      expect(await hdbt.connect(owner).viewPendings()).to.deep.equal([1, 2]);
    });

    it("Should not submit if deposit not met", async function () {
      const { hdbt, user1 } = await loadFixture(deployHDBTFixture);

      await expect(
        hdbt.connect(user1).mint({ value: ethers.parseUnits("1") })
      ).to.be.revertedWith("msg.value is not 2 ethers");

      await expect(
        hdbt.connect(user1).mint({ value: ethers.parseUnits("3") })
      ).to.be.revertedWith("msg.value is not 2 ethers");
    });
  });

  describe("Approve Mint", function () {
    it("Should mint token and return deposit once approved", async function () {
      const { hdbt, owner, user1 } = await loadFixture(deployHDBTFixture);

      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });

      await expect(hdbt.connect(owner).approveMint(1)).to.changeEtherBalance(
        user1,
        ethers.parseUnits("2")
      );
      expect(await hdbt.connect(owner).viewPendings()).to.deep.equal([]);
      expect(await hdbt.balanceOf(user1.address, 1)).to.equal(1000);
    });

    it("Should not approve invalid ID", async function () {
      const { hdbt, owner } = await loadFixture(deployHDBTFixture);

      await expect(hdbt.connect(owner).approveMint(1)).to.be.revertedWith(
        "ID not found"
      );
    });

    it("Should not mint the same token again once approved", async function () {
      const { hdbt, owner, user1 } = await loadFixture(deployHDBTFixture);

      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });

      await hdbt.connect(owner).approveMint(1);
      await expect(hdbt.connect(owner).approveMint(1)).to.be.revertedWith(
        "ID not found"
      );
    });
  });

  describe("Tokens transfer", function () {
    it("Should transfer tokens to another user", async function () {
      const { hdbt, owner, user1, user2 } =
        await loadFixture(deployHDBTFixture);

      await hdbt.connect(user1).mint({ value: ethers.parseUnits("2") });
      await hdbt.connect(owner).approveMint(1);
      await hdbt
        .connect(user1)
        .safeTransferFrom(user1.address, user2.address, 1, 100, "0x");

      expect(await hdbt.balanceOf(user1.address, 1)).to.equal(900);
      expect(await hdbt.balanceOf(user2.address, 1)).to.equal(100);
    });
  });
});
