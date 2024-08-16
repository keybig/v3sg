import { AccountCreated } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Account } from './generated/schema';
import { BigInt } from '@graphprotocol/graph-ts';

export function handleAccountCreated(event: AccountCreated): void {
  const id = event.params.accountId.toString();

  const account = new Account(id);

  account.accountId = event.params.accountId;
  account.owner = event.params.owner;
  // Initialize the additional fields
  account.feesPaid = BigInt.zero();
  account.pnl = BigInt.zero();
  account.totalLiquidations = BigInt.zero();
  account.totalTrades = BigInt.zero();
  account.totalVolume = BigInt.zero();
  account.save();
}

// type Account @entity {
//   id: ID!
//   accountId: BigInt!
//   owner: Bytes!
//   feesPaid: BigInt!
//   pnl: BigInt!
//   totalLiquidations: BigInt!
//   totalTrades: BigInt!
//   totalVolume: BigInt!
//   positions: [Position!] @derivedFrom(field: "account")
//   liquidations: [Liquidation!] @derivedFrom(field: "account")
// }