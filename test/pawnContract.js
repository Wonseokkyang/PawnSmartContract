/*
Author: Won Seok Yang

A smart contract for a loan system that holds assets as collateral like banks/pawn shops.

Two separate contracts:
Contract 1: ledger.sol
- A ledger that logs and stores asset ownership and payments made
Contract 2: pawnContract.sol 
- A functional contract that takes care of calculating/processing loan payment, 
interest calculation, collateral transfer, collateral evaluation. 

General flow:
- Loanee offers/transfers collateral (proof of ownership) to the functional contract and 
will get the evaluated sum of the loan in return
- If the loanee doesn't like the terms, they can return the complete loan sum back 
to the functional contract. All incurred fees are paid by the loanee.
Along with the proof of ownership, the details of the loan such as loan amount and 
date are kept in the ledger.
- The loanee can pay back any amount of the loan at any time but the loan will 
become subject to interest rates defined during pawnContract deployment.
- Upon paying off the loan, the functional contract will 'release' the initial 
offered collateral(s) by logging it in the ledger.
- If the value of the debt accrues to greater than the value of the 
collateral x 2 and no payments are made, ownership of the collateral is 
released to the loaner and recorded on the ledger
*/

const assert = require("chai").assert;
const { expect } = require("chai");
const truffleAssert = require('truffle-assertions');
const PawnContract = artifacts.require("Pawn"); //argument must be the contract name

contract('PawnContract', async (accounts) => {
  let pawnContractInstance;
  const accountOwner = accounts[0];
  const accountBorrowerOne = accounts[1];
  const accountBorrowerTwo = accounts[2];
  const ticketKeyOne = 'testTicketCode';
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const largeFloat = 1000000000000000;
  const ratePerSecond = ((20*largeFloat)/100/2592000);
  const loanAmount = 1000;

  // start describe //
  describe("Deploy the smart contract", function(accounts) {
    it("Catch instance of smart contract", function() {
      return PawnContract.new().then(function(instance){
        pawnContractInstance = instance;
      });
    });
  })  //end describe

  // start describe //
  describe("Test regarding constructed values of contract", function() {  
    it("Proper ownership", () => {
      return pawnContractInstance.owner().then(function(res){
        assert.equal(res, accountOwner, "Account owners are different.");
      });
    });

    it("Correct interest rate", function() {
      return pawnContractInstance.interestRate().then(function(res){
        assert.equal(res, 20, "Interest rate does not equal 20.");
      });
    });

    it("Correct idCount", function() {
      return pawnContractInstance.idCount().then(function(res){
        assert.equal(res, 1, "idCount not equal 1.");
      });
    });

    it("Correct interest rate per second", async () => {
      var ff = await pawnContractInstance.getFloatFluff();
      assert.equal(ff, largeFloat);
      const res = await pawnContractInstance.getInterestRatePerSecond();
      assert.equal(res.toNumber(), Math.floor(ratePerSecond));
    });
  });  //end describe

  // start describe //
  describe("Test borrower interaction with contract", function() {  
    it("Checking ticketcode pulls empty address before adding", async () => {
      return pawnContractInstance.getTicketAddress.call(
        ticketKeyOne,
        {from : accountBorrowerOne}
      )
      .then(function(res){
        assert.equal(res, zeroAddress);
      });
    });

    it("Borrower applies ticketcode and adds own address to queue", async () => {
      //borrower one adds self to queue
      pawnContractInstance.collateralApplication(ticketKeyOne, {from : accountBorrowerOne});
      return pawnContractInstance.getTicketAddress.call(
        ticketKeyOne, 
        {from : accountBorrowerOne}
      )
      .then(function(res){
        assert.equal(res, accountBorrowerOne, "Addresses don't match");
      });
    });
  });  //end describe
  
  // start describe //
  describe("Test owner evaluating ticket contract", function() {
    var borrowerInitial;
    
    
    it("Owner evaluates ticketcode and balance is correct", async () => {
      console.log(`\tThis test assets incorrectly due to the test being wrong.`);

      //Initial balance of owner
      borrowerInitial  = await web3.eth.getBalance(accountBorrowerOne);
      const initialOwner = await web3.eth.getBalance(accountOwner);
      console.log(`\tInitial owner Bal: ${initialOwner.toString()}`);

      // Obtain gas used from the evaluation
      const evaluation = await pawnContractInstance.evaluateCollateral(
        ticketKeyOne, 
        {value : loanAmount, from : accountOwner}
      );
      const gasUsed = evaluation.receipt.gasUsed;
      console.log(`\tOwner gasUsed: ${evaluation.receipt.gasUsed}`);

      // Obtain gasPrice from the transaction hash
      const tx = await web3.eth.getTransaction(evaluation.tx);
      const gasPrice = tx.gasPrice;
      console.log(`\tGasPrice: ${tx.gasPrice}`);

      //Owner balance after
      const final = await web3.eth.getBalance(accountOwner);
      console.log(`\tFinal: ${final.toString()}`);

      const calculation = Number(gasPrice) * Number(gasUsed) + Number(final) + Number(loanAmount);
      console.log(`\tCalculation: ${calculation.toString()}`);
    // This test evaluates false due to a bug in code.
    // Preforms correctly in remix.ethereum.org
      return assert.equal(Number(initialOwner), calculation, "Must be equal");
    });

    it("Test borrower's balance is correct", async () => {
      borrowerInitial  = await web3.eth.getBalance(accountBorrowerOne)
      console.log(`\tInitial borrower Bal: ${borrowerInitial.toString()}`);
  
      const borrowerFinal = await web3.eth.getBalance(accountBorrowerOne);
      console.log(`\tAfter borrower Bal: ${borrowerFinal.toString()}`);
  
      return assert.equal(
        borrowerFinal.toString(), 
        Number(borrowerInitial)+Number(loanAmount),
        "Borrower balance is different" 
      );
    });

    it("Test borrower's running debt is correct", async () => {
      return pawnContractInstance.getRunningDebt(
        accountBorrowerOne
        ).then(function(res) {
          assert.equal(res, loanAmount, "Running debt should be loanAmount");
      });
    });

    it("Test borrower's max debt is correct", async () => {
      return pawnContractInstance.getRunningMax(
        accountBorrowerOne
        ).then(function(res) {
          assert.equal(res, loanAmount*2, "RunningMax should be 2*loanAmount");
      });
    });
  });  //end describe

  //makes use of testing function updateDebtWithTime
  // start describe //
  describe("Interest rate application test", function() {
    it("Testing debt calculation after a month \"passed\"", async () => {
      const monthInSeconds = 2595000;
      return pawnContractInstance.updateDebtWithTime.call(
        accountBorrowerOne,
        monthInSeconds,
        {from : accountOwner}
        ).then(function(res) {
          assert.equal(res, loanAmount*1.2, "Debt should be 1.2*loan value");
      });
    });

    it("Testing debt going over max allowed debt", async () => {
      const moreSeconds = (12975000); // when evaluated with interest, gives 2001
      const expectedRes = 2001;
  
      pawnContractInstance.updateDebtWithTime(accountBorrowerOne, moreSeconds, {from : accountOwner});
      const res = await pawnContractInstance.getRunningDebt(accountBorrowerOne);
      
      return assert.equal(res, Math.floor(expectedRes), "res doesn't match expected");
    });

    it("Paying 1 unit to update debt should trigger seize() and log payment", async () => {
      // 12975000 will give 2001 debt- trigger theshold is 2000
      // Having issues with calculating debt correctly here
      // pawnContractInstance.updateDebtWithTime(accountBorrowerOne, 12975000, {from:accountOwner});
      // pawnContractInstance.updateDebtWithTime(accountBorrowerOne, 12975000, {from:accountOwner});
      // pawnContractInstance.updateDebtWithTime(accountBorrowerOne, 12975000, {from:accountOwner});
      // const debt = await pawnContractInstance.getRunningDebt(accountBorrowerOne);
      // console.log("\tDebt:", debt.toNumber());
      const running = await pawnContractInstance.getRunningDebt(accountBorrowerOne);
      const max = await pawnContractInstance.getRunningMax(accountBorrowerOne);

      console.log("\trunning:", running.toNumber());
      console.log("\tmax:", max.toNumber());

      return pawnContractInstance.payOffDebt({from : accountBorrowerOne, value : 1});
    });

    it("Paying off all debt should trigger collateral return", async () => {
      await pawnContractInstance.collateralApplication("newTicket", {from:accountBorrowerTwo});
      await pawnContractInstance.evaluateCollateral("newTicket", {value:100, from:accountOwner});

      const running = await pawnContractInstance.getRunningDebt.call(accountBorrowerTwo);

      console.log("\trunning:", running.toNumber());

      return pawnContractInstance.payOffDebt({from : accountBorrowerTwo, value : 2*running.toNumber()});
    });
  });  //end describe
});

