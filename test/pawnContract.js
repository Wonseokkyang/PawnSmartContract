const { assert } = require("console");

const PawnContract = artifacts.require("Pawn"); //argument must be the contract name

contract('Pawn', (accounts) => {
    it('Should deploy smart contract properly', async () => {
      const pawnContract = await PawnContract.deployed();
      console.log(pawnContract.address);
      Assert.assert(pawnContract.address !== '');
    });

    it('Should set constructed values', async () => {
      const pawnContractInstance = await PawnContract.deployed();
      // console.log(pawnContractInstance.address);

      const getOwner = await pawnContractInstance.getOwner();
      console.log("getOwner", getOwner);
      console.log("accounts[0]", accounts[0]);

      Assert.equal(getOwner,accounts[0]);

      const interestRate = await pawnContractInstance.getInterestRate();
      Assert.equal(interestRate.toNumber(),20);

      var ff = await pawnContractInstance.getFloatFluff();
      var ratePerSecond = (20*ff.toNumber()/100/2592000);
      const irps = await pawnContractInstance.getInterestRatePerSecond();
      // assert(irps.toNumber() === ratePerSecond);
      console.log("ratePerSecond:", ratePerSecond);
      console.log("irps:", irps.toNumber());
    });

    it('Testing user applying for collater by sending ticketCode', async () => {
      const pawnContractInstance = await PawnContract.deployed();
      
      pawnContractInstance.collateralApplication('testTicketCode', {from: accounts[1]});

      Assert.equal(accounts[1], pawnContractInstance.getTicketAddress(accounts[1], {from: accounts[0]}));

    });
    /*
    it('should call a function that depends on a linked library', async () => {
      const metaCoinInstance = await MetaCoin.deployed();
      const metaCoinBalance = (await metaCoinInstance.getBalance.call(accounts[0])).toNumber();
      const metaCoinEthBalance = (await metaCoinInstance.getBalanceInEth.call(accounts[0])).toNumber();
  
      assert.equal(metaCoinEthBalance, 2 * metaCoinBalance, 'Library function returned unexpected function, linkage may be broken');
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
  
  
      assert.equal(accountOneEndingBalance, accountOneStartingBalance - amount, "Amount wasn't correctly taken from the sender");
      assert.equal(accountTwoEndingBalance, accountTwoStartingBalance + amount, "Amount wasn't correctly sent to the receiver");
    });
    */
  });
  