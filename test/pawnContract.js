const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');

const PawnContract = artifacts.require("Pawn"); //argument must be the contract name

contract('Pawn', (accounts) => {
  let pawnContractInstance;

  beforeEach('setup contract for each test', async function () {
    pawnContractInstance = await PawnContract.deployed();
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

    const getOwner = await pawnContractInstance.getOwner();

    assert.equal(getOwner,accounts[0]);

    const interestRate = await pawnContractInstance.getInterestRate();
    assert.equal(interestRate.toNumber(),20);

    var ff = await pawnContractInstance.getFloatFluff();
    var ratePerSecond = (20*ff.toNumber()/100/2592000);
    const irps = await pawnContractInstance.getInterestRatePerSecond();
    // assert.equal(irps.toNumber(), ratePerSecond);
    console.log("ratePerSecond:", ratePerSecond);
    console.log("irps:", irps.toNumber());
    });

  it('Testing user applying for collateral by sending ticketCode', async () => {
    const empty = pawnContractInstance.getTicketAddress.call('testTicketCode', {from: accounts[0]});
    console.log(empty);
    assert.notEqual(empty, 0);

    //borrower applying ticket code
    pawnContractInstance.collateralApplication('testTicketCode', {from: accounts[1]});

    const result = pawnContractInstance.getTicketAddress('testTicketCode', {from: accounts[0]});
    assert.equal(result.valueOf(), accounts[1]);
  });

  it('Testing collateral evaluation of ticketCode and receiving of loan to borrower', async () => {
    //setup accounts
    const accountOwner = accounts[0];
    const borrowerOne = accounts[1];

    //check queue is empty/not set to borrower
    const empty = pawnContractInstance.getTicketAddress('testTicketCode', {from: accountOwner});
    const emptyAddress = /^0x0+$/.test(empty);

    console.log("Testing empty testTicketCode");
    console.log(emptyAddress);
    console.log(empty);
    assert.equal(emptyAddress, empty.valueOf());

    //borrower applies collateral for evaluation
    pawnContractInstance.collateralApplication('testTicketCode', {from: borrowerOne});

    const result = pawnContractInstance.getTicketAddress('testTicketCode', {from: accountOwner});
    console.log("result", result);
    console.log(empty);
    assert.equal(result.valueOf(), borrowerOne);

    //loaner evaluates and sends currency to borrower
    const beforeBorrow = await web3.eth.getBalance(borrowerOne);
    const loanAmount = 100;
    pawnContractInstance.evaluateCollateral('testTicketCode', {value : loanAmount, from: accountOwner});
    const afterBorrow = await web3.eth.getBalance(borrowerOne);
    assert.equal(beforeBorrow, afterBorrow-loanAmount);
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
  