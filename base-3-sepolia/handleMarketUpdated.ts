import { MarketUpdated as MarketUpdatedEvent } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Market, MarketUpdated } from './generated/schema';

export function handleMarketUpdated(event: MarketUpdatedEvent): void {
  const id = event.params.marketId.toString();
  const market = Market.load(id);

  if (!market) {
    return;
  }

  market.price = event.params.price;
  market.skew = event.params.skew;
  market.size = event.params.size;
  market.sizeDelta = event.params.sizeDelta;
  market.currentFundingRate = event.params.currentFundingRate;
  market.currentFundingVelocity = event.params.currentFundingVelocity;
  market.interestRate = event.params.interestRate;

  market.save();

  // create MarketUpdated entity
  const marketUpdatedId =
    event.params.marketId.toString() +
    '-' +
    event.block.number.toString() +
    '-' +
    event.logIndex.toString();

  let marketUpdated = new MarketUpdated(marketUpdatedId);

  marketUpdated.timestamp = event.block.timestamp;
  marketUpdated.marketId = event.params.marketId;
  marketUpdated.price = event.params.price;
  marketUpdated.skew = event.params.skew;
  marketUpdated.size = event.params.size;
  marketUpdated.sizeDelta = event.params.sizeDelta;
  marketUpdated.currentFundingRate = event.params.currentFundingRate;
  marketUpdated.currentFundingVelocity = event.params.currentFundingVelocity;

  marketUpdated.save();
}

// type MarketUpdated @entity {
//   id: ID!
//   timestamp: BigInt!
//   marketId: BigInt!
//   price: BigInt!
//   skew: BigInt!
//   size: BigInt!
//   sizeDelta: BigInt!
//   currentFundingRate: BigInt!
//   currentFundingVelocity: BigInt!
// }
  //   /**
  //    * @notice Gets fired when the size of a market is updated by new orders or liquidations.
  //    * @param marketId Id of the market used for the trade.
  //    * @param price Price at the time of this event.
  //    * @param skew Market skew at the time of the trade. Positive values mean more longs.
  //    * @param size Size of the entire market after settlement.
  //    * @param sizeDelta Change in market size during this update.
  //    * @param currentFundingRate The current funding rate of this market (0.001 = 0.1% per day)
  //    * @param currentFundingVelocity The current rate of change of the funding rate (0.001 = +0.1% per day)
  //    * @param interestRate Current supermarket interest rate based on updated market OI.
  //    */
  //   event MarketUpdated(
  //     uint128 marketId,
  //     uint256 price,
  //     int256 skew,
  //     uint256 size,
  //     int256 sizeDelta,
  //     int256 currentFundingRate,
  //     int256 currentFundingVelocity,
  //     uint128 interestRate
  // );