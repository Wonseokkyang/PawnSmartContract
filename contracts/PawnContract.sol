//SPDX-License-Identifier: UNLICENSED
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

pragma solidity >=0.7.0 <0.8.0;

import "./LedgerContract.sol";

contract Pawn is Base {
    uint8 idCount; //independent collateral ID's 
    uint8 interestRate;
    uint interestRatePerSecond;
    uint floatFluff;
    Ledger _ledger; //ledger contract is 'owned' by Pawn contarct
    mapping(string => address payable) applicationQueue; //list of collateral to be approved
    mapping(address => Debt) internal borrowers; 
    
    struct Debt {
        address debtor;
        Collateral[] items; //pawned collateral
        uint runningDebt;
        uint runningMax; //max debt before requisition
        uint time;
    }
    struct Collateral {
        uint8 id;
        string ticketCode;
        uint256 value; //appraised value of collateral
        bool siezed;
    }
    
    event Value(uint interestRatePerSecond);
    
    constructor() {
        owner = msg.sender;
        idCount = 1;
        interestRate = 20;  //percent
        floatFluff = 1000000000000000;
        //2592000 = number of seconds in 30 days
        interestRatePerSecond = (((interestRate*floatFluff)/100)/2592000); 
        _ledger = new Ledger();
    }
    
    // External functions
    // fallback function automatically repays debt
    receive() external payable {
        payOffDebt();
    }
    
    // The idea, the pawnee goes into the store to get an item evaluated and receives
    // a ticket with a code they can use to find the value of the item they offered
    // as collateral and receive the ether loan to their address.
    function collateralApplication(string memory ticketCode) external {
        applicationQueue[ticketCode] = msg.sender;
    }
    
    // Loaner appraises value and adds ticketCode to the list of collateral
    // Only give out loans if the borrower's running debt is < 1/4 their maxDebt
    function evaluateCollateral(string memory ticketCode) external payable isOwner {
        //Checks to make sure borrower has submitted their address for payment
        address payable borrower = applicationQueue[ticketCode];
        require(borrower != address(0), 
            "Ticket code does not exist in queue yet."
        );
        require(
            (borrowers[borrower].runningDebt == 0) || 
            (borrowers[borrower].runningDebt <= borrowers[borrower].runningMax/4),
            "The borrower owes too much to get more loans."
        );
        
        uint appraisedValue = msg.value;
        
        // Define new collateral item
        Collateral memory newCollateral = Collateral(
            idCount,
            ticketCode,
            appraisedValue,
            false
        );
        
        // Add new collateral item to borrower's list of collaterals and update debt info
        if (borrowers[borrower].runningDebt == 0) { //this is first collateral for borrower
            borrowers[borrower].debtor = borrower;
            borrowers[borrower].items.push(newCollateral);
            borrowers[borrower].runningDebt += newCollateral.value;
            borrowers[borrower].runningMax += newCollateral.value * 2;
            borrowers[borrower].time = block.timestamp;
        } else { //borrower already has some collateral
            borrowers[borrower].items.push(newCollateral);
            borrowers[borrower].runningDebt += newCollateral.value;
            borrowers[borrower].runningMax += newCollateral.value * 2;
        }

        // Remove ticket from queue
        delete applicationQueue[ticketCode];
        
        // Send the loan to address on file
        require(msg.sender.balance >= msg.value, 
            "Not enough currency for the loan."
        );
        borrower.transfer(msg.value);
        
        // Add to ledger for bookkeeping
        _ledger.addBorrower(borrower, msg.value);
        _ledger.addCollateral(borrower, ticketCode);
        idCount++;
    }
    
    // Public functions
    function updateDebtBorrower(address payable borrowerAddress) public isOwner returns(uint) {
        updateDebt(borrowerAddress);
        return(borrowers[borrowerAddress].runningDebt);
    }

    // Pays off debt amount according to sender's address.
    // Collateral(s) only get released when ALL the debt is paid off.
    // Return: remaining debt amount
    function payOffDebt() public payable returns(uint) {
        // Update debt value before paying
        uint remainingDebt;
        bool seize;
        (remainingDebt, seize) = updateDebt(msg.sender);
        
        // The runnign debt has gone over 2x intital loan value
        if (seize)
            seizeCollateral(msg.sender);

        if (msg.value > remainingDebt) { // Debt paid off in full
            remainingDebt = 0;
            //function to release all collateral on list and ledger
            releaseCollateral(msg.sender);
            
            // release borrower from list
            delete borrowers[msg.sender];
            //function to write down collateral release
            // // // // //
            // Change is kept by pawnshop owner
        } else { // Some debt still remaining
            borrowers[msg.sender].runningDebt -= msg.value;
            remainingDebt -= msg.value;
        }
        //function to log debt payment
        _ledger.recordPayment(msg.sender, msg.value, remainingDebt);
        
        return (remainingDebt);
    }
    
    // Given an address, update/calculate running debt with current time
    // Return: Updated running debt after interest calculation and
    //  true if debt has gone over limit || false otherwise
    function updateDebt(address payable borrower) internal returns (uint, bool) {
        // Check for debt existance
        require(borrowers[borrower].runningDebt > 0, "This address has no debt.");

        // Calculate current running debt at time of payment
        uint updatedDebt = borrowers[borrower].runningDebt;
        
        //if borrower's assets are already requisitioned, stop calculating interest
        if (borrowers[borrower].items[0].siezed == true){
            return(updatedDebt, false);
        } else { //calculate normally
            uint deltaSeconds = 2595000; //for testing and demo (30 days)
        
            // uint deltaSeconds = borrowers[borrower].time - block.timestamp;
            updatedDebt += deltaSeconds * interestRatePerSecond * updatedDebt / floatFluff;
            borrowers[borrower].runningDebt = updatedDebt;
            borrowers[borrower].time = block.timestamp;
        
            // If debt is > 2*debt, true flag to requisition items
            if (borrowers[borrower].runningDebt > borrowers[borrower].runningMax)
                return (updatedDebt, true);
            else 
                return(updatedDebt, false);
        }
    }
    
    // Function to log the requisition of all collateral from borrower -> owner
    function seizeCollateral(address payable borrower) internal {
        for(uint i=0; i < borrowers[borrower].items.length; i++) {
            if (borrowers[borrower].items[i].siezed == false) {
                _ledger.transferItem(borrower, owner, borrowers[borrower].items[i].ticketCode);   
                borrowers[borrower].items[i].siezed = true;
            }
        }
    }
    
    // Function to log the release of all collateral from owner -> borrower
    function releaseCollateral(address payable borrower) internal {
        for(uint i=0; i < borrowers[borrower].items.length; i++) {
            if (borrowers[borrower].items[i].siezed == true) {
                _ledger.transferItem(owner, borrower, borrowers[borrower].items[i].ticketCode);   
                borrowers[borrower].items[i].siezed = false;
            }
        }
    }
    
    // Override virtual function to call selfdestruct on ledger as well
    function destroy() public isOwner virtual override {
        _ledger.destroy();
        selfdestruct(owner);
    }
    
    // Public view functions
    function getOwner() public view returns(address) { return(owner); }
    
    function getInterestRate() public view returns(uint) { return(interestRate); }
    
    function getTicketAddress(string memory ticketCode) public view returns(address) {
        return applicationQueue[ticketCode];
    }
    
    function getRunningDebt(address borrowerAddress) public view returns(uint) {
        return(borrowers[borrowerAddress].runningDebt);
    }
}