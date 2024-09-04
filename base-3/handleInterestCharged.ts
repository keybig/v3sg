import { log, store } from '@graphprotocol/graph-ts';
import { InterestCharged as InterestChargedEvent } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Account, InterestCharged } from './generated/schema';

export function handleInterestCharged(event: InterestChargedEvent): void {
    const interestChargedId = event.params.accountId.toString() + '-' + event.transaction.hash.toHex();
    const account = Account.load(event.params.accountId.toString())

    if (account == null) {
      log.warning("Account not found for transaction hash {} and accountId {}", [
        event.transaction.hash.toHex(),
        event.params.accountId.toString(),
      ]);
      return;
    }

  
    let interestCharged = new InterestCharged(interestChargedId);
  
    interestCharged.accountId = event.params.accountId;
    interestCharged.timestamp = event.block.timestamp;
    interestCharged.interest = event.params.interest;
    interestCharged.txHash = event.transaction.hash;
    interestCharged.block = event.block.number;
    
    interestCharged.save();

  }

  // type InterestCharged @entity {
  //   id: ID!
  //   timestamp: BigInt!
  //   block: BigInt!
  //   accountId: BigInt!
  //   interest: BigInt!
  //   txHash: Bytes!
  // }