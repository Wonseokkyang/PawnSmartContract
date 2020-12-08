const PawnContract = artifacts.require("pawn.sol");
const LedgerContract = artifacts.require("ledger.sol");

module.exports = function(deployer) {
    deployer.deploy(PawnContract);
    deployer.link(PawnContract, LedgerContract);
        deployer.deploy(LedgerContract);
    //addiional contracts can be deployed here
};