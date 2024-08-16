import { SettlementStrategyAdded } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { SettlementStrategy } from './generated/schema';

export function handleSettlementStrategyAdded(event: SettlementStrategyAdded): void {
  const id = event.params.strategyId.toString() + '-' + event.params.marketId.toString();
  const strategy = new SettlementStrategy(id);

  strategy.strategyId = event.params.strategyId;
  strategy.marketId = event.params.marketId;

  strategy.strategyType = event.params.strategy.strategyType;
  strategy.settlementDelay = event.params.strategy.settlementDelay;
  strategy.settlementWindowDuration = event.params.strategy.settlementWindowDuration;
  strategy.priceVerificationContract =
    event.params.strategy.priceVerificationContract.toHexString();
  strategy.feedId = event.params.strategy.feedId;
  strategy.settlementReward = event.params.strategy.settlementReward;
  strategy.enabled = !event.params.strategy.disabled;
  strategy.commitmentPriceDelay = event.params.strategy.commitmentPriceDelay;

  strategy.save();
}

// /**
//      * @notice Gets fired when new settlement strategy is added.
//      * @param marketId adds settlement strategy to this specific market.
//      * @param strategy the strategy configuration.
//      * @param strategyId the newly created settlement strategy id.
//      */
// event SettlementStrategyAdded(
//   uint128 indexed marketId,
//   SettlementStrategy.Data strategy,
//   uint256 indexed strategyId
// );

// type SettlementStrategy @entity {
//   id: ID!
//   strategyId: BigInt!
//   marketId: BigInt!
//   enabled: Boolean
//   strategyType: Int
//   settlementDelay: BigInt
//   settlementWindowDuration: BigInt
//   priceVerificationContract: String
//   feedId: Bytes
//   settlementReward: BigInt
//   minimumUsdExchangeAmount: BigInt
//   maxRoundingLoss: BigInt
//   commitmentPriceDelay: BigInt
// }