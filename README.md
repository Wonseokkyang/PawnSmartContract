# PawnSmartContract

Author: Won Seok Yang

A smart contract for a loan system that holds assets as collateral like banks/pawn shops.

Two separate contracts:
## Contract 1: Ledger.sol
- A ledger that logs and stores asset ownership and payments made
## Contract 2: PawnContract.sol 
- A functional contract that takes care of calculating/processing loan payment, 
interest calculation, collateral transfer, collateral evaluation. 

## General flow:
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
