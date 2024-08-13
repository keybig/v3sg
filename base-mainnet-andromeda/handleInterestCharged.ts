import { InterestCharged as InterestChargedEvent } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { InterestCharged } from './generated/schema';

export function handleInterestCharged(event: InterestChargedEvent): void {
    const interestChargedId = event.params.accountId.toString() + '-' + event.transaction.hash.toHex();
  
      let interestCharged = new InterestCharged(interestChargedId);
  
      interestCharged.accountId = event.params.accountId;
      interestCharged.timestamp = event.block.timestamp;
      interestCharged.interest = event.params.interest;
      interestCharged.txHash = event.transaction.hash;
      interestCharged.block = event.block.number;
      
      interestCharged.save();
  }