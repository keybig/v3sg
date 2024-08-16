import { SettlementStrategySet } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { SettlementStrategy } from './generated/schema';

export function handleSettlementStrategySet(event: SettlementStrategySet): void {
  // Generate the ID using strategyId and marketId, similar to the creation event
  const id = event.params.strategyId.toString() + '-' + event.params.marketId.toString();
  
  // Load the existing SettlementStrategy entity using the generated ID
  let strategy = SettlementStrategy.load(id);

  // If the strategy doesn't exist, log an error and return
  if (!strategy) {
    return
  }

  // Update the entity's fields with the new data from the event
  strategy.strategyType = event.params.strategy.strategyType;
  strategy.settlementDelay = event.params.strategy.settlementDelay;
  strategy.settlementWindowDuration = event.params.strategy.settlementWindowDuration;
  strategy.priceVerificationContract = event.params.strategy.priceVerificationContract.toHexString();
  strategy.feedId = event.params.strategy.feedId;
  strategy.settlementReward = event.params.strategy.settlementReward;
  strategy.enabled = !event.params.strategy.disabled;
  strategy.commitmentPriceDelay = event.params.strategy.commitmentPriceDelay;

  // Save the updated entity back to the store
  strategy.save();
}
