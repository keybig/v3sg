import { CollateralModified as CollateralModifiedEvent } from "./generated/PerpsMarketProxy/PerpsMarketProxy";
import { Account, CollateralModified } from "./generated/schema";
import { BigInt, log } from "@graphprotocol/graph-ts";

export function handleCollateralModified(event: CollateralModifiedEvent): void {
  const id =
    event.params.accountId.toString() +
    "-" +
    event.block.number.toString() +
    "-" +
    event.logIndex.toString();

  const collateralModified = new CollateralModified(id);

  collateralModified.accountId = event.params.accountId;
  collateralModified.timestamp = event.block.timestamp;
  collateralModified.synthMarketId = event.params.synthMarketId;
  collateralModified.amount = event.params.amountDelta;
  collateralModified.sender = event.params.sender;
  collateralModified.transactionHash = event.transaction.hash;

  // Determine the action type based on the amountDelta
  if (event.params.amountDelta.gt(BigInt.fromI32(0))) {
    collateralModified.actionType = "DEPOSIT";
  } else {
    collateralModified.actionType = "WITHDRAWAL";
  }

  collateralModified.save();

  // Verify account
  let account = Account.load(event.params.accountId.toString());

  if (account) {
    account.totalMargin = account.totalMargin.plus(event.params.amountDelta);
    account.save();
  } else {
    log.error("Account not found for accountId: {}", [
      event.params.accountId.toString(),
    ]);
  }
}

// type CollateralModified @entity {
//   id: ID!
//   timestamp: BigInt!
//   accountId: BigInt!
//   synthMarketId: BigInt!
//   amount: BigInt!
//   sender: Bytes!
//   transactionHash: Bytes!
// }
