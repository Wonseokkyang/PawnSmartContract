//SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.7.0 <0.8.0;

contract Base{
    address payable public owner;

    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    // Modifier 
    modifier isOwner() {
        require(msg.sender == owner, "Caller is not ledger owner.");
        _;
    }    
    
    // Destructor
    function destroy() virtual public isOwner {
        selfdestruct(owner);
    }
}


// Stores asset information (ownership, interest rate, original value, debt value)
contract Ledger is Base {
    // Events
    event EntryCreate(
        uint indexed date,
        address indexed from,
        uint loan_amount,
        uint loan_cap
        );
        
    event EntryCreateCollateral(
        uint indexed date,
        address indexed from,
        string indexed collateralID
        );
        
    event EntryTransfer(
        uint indexed date,
        address indexed from,
        address to,
        string indexed collateralID
        );
        
    event LogPayment(
        uint indexed date,
        address indexed from,
        uint paying,
        uint remaining
        );

    // Functions
    // Appends new entry to ledger
    function addBorrower(address from, uint loan_amount) public isOwner {
        uint loan_cap = loan_amount * 2;
        emit EntryCreate(block.timestamp, from, loan_amount, loan_cap);
    }
    
    //Append new collateral entry to ledger
    function addCollateral(address from, string memory collateralID) public isOwner {
        emit EntryCreateCollateral(block.timestamp, from, collateralID);
    }
    
    // Log debt payment
    function recordPayment(address from, uint amount, uint remaining) public isOwner{
        emit LogPayment(block.timestamp, from, amount, remaining);
    }
    
    // Log asset transfer
    function transferItem(address from, address to, string memory collateralID) public isOwner{
        emit EntryTransfer(block.timestamp, from, to, collateralID);
    }
}