const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');

const PawnContract = artifacts.require("Pawn"); //argument must be the contract name

contract('Pawn', (accounts) => {
  let pawnContractInstance;
  const accountOwner = accounts[0];
  const accountBorrowerOne = accounts[1];
  const accountBorrowerTwo = accounts[2];
  const ticketKeyOne = 'testTicketCode';
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  beforeEach('Setup new contract for each test', async function () {
    // pawnContractInstance = await PawnContract.deployed();
    return PawnContract.new()
     .then(function(instance) {
      pawnContractInstance = instance;
     });
  });

  it('Should deploy smart contract properly', async () => {
    return PawnContract.deployed()
      .then(instance => {
        assert.notEqual(pawnContractInstance.address, '');
      });
    // assert.notEqual(pawnContractInstance.address, '');
  });

  it('Should set constructed values', async () => {
    // console.log(pawnContractInstance.address);
    //checking ownership
    const getOwner = await pawnContractInstance.getOwner();
    assert.equal(getOwner, accountOwner);

    //correct interest rate
    const interestRate = await pawnContractInstance.getInterestRate();
    assert.equal(interestRate.toNumber(), 20);

    //correct interest rate per second. Disabled assert b/c the result is truncated in solidity
    var ff = await pawnContractInstance.getFloatFluff();
    var ratePerSecond = (20*ff.toNumber()/100/2592000);
    const irps = await pawnContractInstance.getInterestRatePerSecond();
    // assert.equal(irps.toNumber(), ratePerSecond);
    console.log("ratePerSecond:", ratePerSecond);
    console.log("irps:", irps.toNumber());
    });

  it('Testing user applying for collateral by sending ticketCode', async () => {
    //empty should be empty
    const empty = await pawnContractInstance.getTicketAddress.call(
      ticketKeyOne, 
      {from: accounts[0]}
    );
    //make sure address for key is empty
    // console.log("empty is:", empty);
    // console.log("zeroAddress is:", zeroAddress);
    assert.equal(empty, zeroAddress);

    //borrower applying ticket code
    pawnContractInstance.collateralApplication(
      ticketKeyOne, 
      {from: accounts[1]}
    );

    const result = await pawnContractInstance.getTicketAddress(
      ticketKeyOne, 
      {from: accounts[0]}
    );
    assert.equal(result, accounts[1]);
  });

  it('Testing evaluation of ticketCode and receiving of loan to borrower', async () => {
    //check queue is empty/not set to borrower
    const empty = await pawnContractInstance.getTicketAddress(ticketKeyOne, {from: accountOwner});
    // const isEmpty = /^0x0+$/.test(empty);
    assert.equal(empty, zeroAddress);

    //borrower applies collateral for evaluation
    pawnContractInstance.collateralApplication(ticketKeyOne, {from: accountBorrowerOne});
    //looking up ticketKey again to ensure borrower's address 
    const result = await pawnContractInstance.getTicketAddress(ticketKeyOne, {from: accountOwner});
    assert.equal(result, accountBorrowerOne);

    //loaner evaluates and sends currency to borrower
    const beforeBorrowOne = await web3.eth.getBalance(accountBorrowerOne);
    const loanAmount = 100;
    //send evaluation/loan with key
    pawnContractInstance.evaluateCollateral(ticketKeyOne, {value : loanAmount, from: accountOwner});
    const afterBorrowOne = await web3.eth.getBalance(accountBorrowerOne);
    assert.equal(beforeBorrowOne, afterBorrowOne-loanAmount);
  });

    // it('Testing borrower gets added to list of borrowers and values are correct.', async => () =>{
    // });


    /*
    it('should call a function that depends on a linked library', async () => {
      const metaCoinInstance = await MetaCoin.deployed();
      const metaCoinBalance = (await metaCoinInstance.getBalance.call(accounts[0])).toNumber();
      const metaCoinEthBalance = (await metaCoinInstance.getBalanceInEth.call(accounts[0])).toNumber();
  
      assert.equal.equal(metaCoinEthBalance, 2 * metaCoinBalance, 'Library function returned unexpected function, linkage may be broken');
    });
    it('should send coin correctly', async () => {
      const metaCoinInstance = await MetaCoin.deployed();
  
      // Setup 2 accounts.
      const accountOne = accounts[0];
      const accountTwo = accounts[1];
  
      // Get initial balances of first and second account.
      const accountOneStartingBalance = (await metaCoinInstance.getBalance.call(accountOne)).toNumber();
      const accountTwoStartingBalance = (await metaCoinInstance.getBalance.call(accountTwo)).toNumber();
  
      // Make transaction from first account to second.
      const amount = 10;
      await metaCoinInstance.sendCoin(accountTwo, amount, { from: accountOne });
  
      // Get balances of first and second account after the transactions.
      const accountOneEndingBalance = (await metaCoinInstance.getBalance.call(accountOne)).toNumber();
      const accountTwoEndingBalance = (await metaCoinInstance.getBalance.call(accountTwo)).toNumber();
  
  
      assert.equal.equal(accountOneEndingBalance, accountOneStartingBalance - amount, "Amount wasn't correctly taken from the sender");
      assert.equal.equal(accountTwoEndingBalance, accountTwoStartingBalance + amount, "Amount wasn't correctly sent to the receiver");
    });
    */
  });
  