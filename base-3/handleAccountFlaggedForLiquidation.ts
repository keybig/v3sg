import { AccountFlaggedForLiquidation as AccountFlaggedForLiquidationEvent } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { AccountFlaggedForLiquidation, Account } from './generated/schema';
import { log } from '@graphprotocol/graph-ts';

export function handleAccountFlaggedForLiquidation(event: AccountFlaggedForLiquidationEvent): void {
  // Create a unique ID for this event, typically using the transaction hash and log index
  let id = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  
  // Load the Account entity, or log an error if it doesn't exist
  let account = Account.load(event.params.accountId.toString());
  if (account == null) {
    log.error('Account not found for accountId: {}', [event.params.accountId.toString()]);
    return;
  }
  
  // Create a new AccountFlaggedForLiquidation entity
  let liquidationFlag = new AccountFlaggedForLiquidation(id);
  liquidationFlag.account = account.id;  // Link to the Account entity
  liquidationFlag.accountId = event.params.accountId;
  liquidationFlag.availableMargin = event.params.availableMargin;
  liquidationFlag.requiredMaintenanceMargin = event.params.requiredMaintenanceMargin;
  liquidationFlag.liquidationReward = event.params.liquidationReward;
  liquidationFlag.flagReward = event.params.flagReward;
  liquidationFlag.timestamp = event.block.timestamp;
  liquidationFlag.transactionHash = event.transaction.hash;

  // Save the entity to the store
  liquidationFlag.save();
}

// type AccountFlaggedForLiquidation @entity {
//   id: ID!
//   account: Account!
//   accountId: BigInt!
//   availableMargin: BigInt!
//   requiredMaintenanceMargin: BigInt!
//   liquidationReward: BigInt!
//   flagReward: BigInt!
//   timestamp: BigInt!
//   transactionHash: Bytes!
// }
