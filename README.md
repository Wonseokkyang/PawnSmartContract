# PawnSmartContract

Author: Won Seok Yang

A smart contract for a loan system that holds assets as collateral like banks/pawn shops.

### To run:
deploy ./contracts/PawnContract.Sol

Two separate contracts:
## Contract 1: Ledger.sol
- A ledger that logs and stores asset ownership and payments made
## Contract 2: PawnContract.sol 
- A functional contract that takes care of: 
  - calculating/processing loan payment 
  - interest calculation
  - collateral requisition/release
  - collateral evaluation
  - updating loans

## General flow:
- Loanee offers/transfers collateral (proof of ownership) to the functional contract
- The contract owner evaluates the collateral, offers a loan, and the ledger logs this transaction
- Each loan collects interest over time with a debt limit of 2x the inital loan
  - Once this threshold is reached, any/all collateral gets requisitioned to the contract owner and logged
  - Once the loan is paid off, any/all collateral gets released to the borrower and logged
  
##### Key notes:
- Along with the proof of ownership, the details of the loan such as loan amount, transactions, 
assets, borrowers, etc. are kept in the ledger.
- If the loanee doesn't like the terms of the loan, they can return the complete loan sum back 
to the functional contract to release their collateral. All incurred fees are paid by the loanee.
- The loanee can pay back any amount of the loan at any time but the loan will 
become subject to interest rates defined during pawnContract deployment.
- The debt is updated whenever a payment is made to the loan but can be updated manually.
- The loanee can offer up any many collateral assets as they like as long as their current debt is below 1/2 of their total loan. This is to prevent borrowers from repeatedly taking out loans without repayment.

<br />
Tested using Truffle

### Functions:
- collaterApplication(<string>*ticketCode*) <br/>
Allows borrowers to give unique <string>*ticketCode* to add their address to an application queue for the contract owner to evaluate.  <br/>
  <br/>
- destroy() *locked to owner* <br/>
Destroys deployed PawnContract as well as linked Ledger contract, returning any remaining ether in the account to the owner. Only the contract owner can call this function. <br/>
  <br/>
- evaluateCollateral(<string>*ticketCode*)  **payable**, *locked to owner* <br/>
This function is locked to the address who deployed the contract. When the contract owner provides a <string>*ticketCode* along with ether, the function will attempt to find the address associated with the unique collateral identifier and pay that address. If the transaction completed successfully, the transaction is logged onto the ledger. <br/>
If no address is associated with *ticketCode*, function reverts. <br/>
If the address associated with *ticketCode* already has a loan out, this function checks to ensure the total debt of the borrower half of the initial loan. <br/>
If the above conditions are not triggered- a new account is created for new borrowers or in the case of existing borrowers, the new collateral is appended to the list of existing collateral for the borrower, loan/debt values updated and the borrower's application is removed from the queue.  <br/>
  <br/>
- receive() *external*, **payable** <br/>
Default fallback function when ether is sent to this contract. This function calls *payOffDebt()*. <br/>
  <br/>
- payOffDebt() *external*, **payable** <br/>
When this function is provided with ether, it automatically registers the address calling it and pays off any associated debt. On successful transaction, the transaction is logged onto the ledger and the function returns the remaining debt to the caller.  <br/>
  <br/>
- updateDebt(*<address>*) <br/>
This function is used to update debt values belonging to *<address>*. If the *<address>* is not associated with any loans, the call reverts to it's previous state. It is triggered whenever a payment is made or can additionally be called manually. If a debtor's collateral has already been siezed/requisitioned, the debt does not get updated. Returns updated debt value.  <br/>
  <br/>
- siezeCollateral(*<address>*) *internal* <br/>
This is an internal function that is only called from payOffDebt(). When triggered due to a loan reaching over a threshold, this function requisitions all collateral from a borrower and logs it onto the ledger.  <br/>
  <br/>
- releaseCollateral(*<address>*) *internal* <br/>
This is an internal function that is only called from payOffDebt(). This function gets triggered when a borrower succesfully pays off all debt. Any siezed/requisitioned collateral gets released back to the original owner. This transaction gets logged onto the ledger.  <br/>
 <br/>
- get*() <br/>
Functions for assisting in truffle unit/integration tests.
  
