// This is an example test file. Hardhat will run every *.js file in `test/`,
// so feel free to add new ones.

// Hardhat tests are normally written with Mocha and Chai.

// We import Chai to use its asserting functions here.
const {expect} = require("chai");

// We use `loadFixture` to share common setups (or fixtures) between tests.
// Using this simplifies your tests and makes them run faster, by taking
// advantage of Hardhat Network's snapshot functionality.
const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {ethers} = require("hardhat");

// `describe` is a Mocha function that allows you to organize your tests.
// Having your tests organized makes debugging them easier. All Mocha
// functions are available in the global scope.
//
// `describe` receives the name of a section of your test suite, and a
// callback. The callback must define the tests of that section. This callback
// can't be an async function.
describe("Token contract", function () {
    // We define a fixture to reuse the same setup in every test. We use
    // loadFixture to run this setup once, snapshot that state, and reset Hardhat
    // Network to that snapshot in every test.
    async function deployTokenFixture() {
        // Get the Signers here.
        const [owner, addr1, addr2] = await ethers.getSigners();

        // To deploy our contract, we just have to call ethers.deployContract and await
        // its waitForDeployment() method, which happens once its transaction has been
        // mined.
        let hardhatToken = await ethers.deployContract("Token");
        await hardhatToken.waitForDeployment();
        const txHash = hardhatToken.deploymentTransaction().hash;
        const receipt = await ethers.provider.getTransactionReceipt(txHash);
        hardhatToken = hardhatToken.attach(receipt.contractAddress);
        // Fixtures can return anything you consider useful for your tests
        return {hardhatToken, owner, addr1, addr2};
    }

    // You can nest describe calls to create subsections.
    describe("Deployment", function () {
        // `it` is another Mocha function. This is the one you use to define each
        // of your tests. It receives the test name, and a callback function.
        //
        // If the callback function is async, Mocha will `await` it.
        it("Should set the right owner", async function () {
            // We use loadFixture to setup our environment, and then assert that
            // things went well
            const {hardhatToken, owner} = await deployTokenFixture();

            // `expect` receives a value and wraps it in an assertion object. These
            // objects have a lot of utility methods to assert values.

            // This test expects the owner variable stored in the contract to be
            // equal to our Signer's owner.
            expect(await hardhatToken.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const {hardhatToken, owner} = await deployTokenFixture();
            const ownerBalance = await hardhatToken.balanceOf(owner.address);
            expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
        });
    });

    describe("Transactions", function () {
        it("Should emit Transfer events", async function () {
            const {hardhatToken, owner, addr1, addr2} = await deployTokenFixture();

            // Transfer 50 tokens from owner to addr1
            await expect(hardhatToken.transfer(addr1.address, 50))
                .to.emit(hardhatToken, "Transfer")
                .withArgs(owner.address, addr1.address, 50);

            // Transfer 50 tokens from addr1 to addr2
            // We use .connect(signer) to send a transaction from another account
            await expect(hardhatToken.connect(addr1).transfer(addr2.address, 50))
                .to.emit(hardhatToken, "Transfer")
                .withArgs(addr1.address, addr2.address, 50);
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const {hardhatToken, owner, addr1} = await deployTokenFixture();
            const initialOwnerBalance = await hardhatToken.balanceOf(owner.address);

            // Try to send 1 token from addr1 (0 tokens) to owner.
            // `require` will evaluate false and revert the transaction.
            await expect(
                hardhatToken.connect(addr1).transfer(owner.address, 1)
            ).to.be.revertedWith("Not enough tokens");

            // Owner balance shouldn't have changed.
            expect(await hardhatToken.balanceOf(owner.address)).to.equal(
                initialOwnerBalance
            );
        });

        it("Test transaction assemble", async function () {
            const {hardhatToken, owner, addr1} = await deployTokenFixture();

            const method = hardhatToken.interface.getFunction("transfer");
            const callData = hardhatToken.interface.encodeFunctionData(method, [owner.address, 1]);
            const tx = await owner.sendTransaction({to: hardhatToken,
                data: callData,
                // gasPrice: 77015174000,
                gasLimit: 1000888});
            // const tx = await ethers.provider.getTransaction(tx.hash);
            expect(tx.gasLimit).to.equal(1000888n);
            // expect(tx.gasPrice).to.equal(77015174000n);

            const tx2 = await owner.sendTransaction({to: hardhatToken,
                data: callData,
                maxPriorityFeePerGas: 770151733000n,
                maxFeePerGas: 1000000000000n,
                // value: 188n,
                gasLimit: 1000866n});
            expect(tx2.gasLimit).to.equal(1000866n);
            expect(tx2.maxPriorityFeePerGas).to.equal(770151733000n);
            expect(tx2.maxFeePerGas).to.equal(1000000000000n);
            // expect(tx2.value).to.equal(188n);
        });
    });
});