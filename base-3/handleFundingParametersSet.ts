import { FundingParametersSet } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Market } from './generated/schema';

export function handleFundingParametersSet(event: FundingParametersSet): void {
  const id = event.params.marketId.toString();
  const market = Market.load(id);

  if (market) {
    market.maxFundingVelocity = event.params.maxFundingVelocity;
    market.skewScale = event.params.skewScale;
    market.save();
  }
}

// type Market @entity {
//   id: ID!
//   perpsMarketId: BigInt!
//   marketName: String
//   marketSymbol: String
//   price: BigInt
//   skew: BigInt
//   size: BigInt
//   sizeDelta: BigInt
//   currentFundingRate: BigInt
//   currentFundingVelocity: BigInt
//   interestRate: BigInt
//   feedId: Bytes
//   maxFundingVelocity: BigInt
//   skewScale: BigInt
//   lockedOiPercent: BigInt
//   marketOwner: String
//   owner: String
//   initialMarginRatioD18: BigInt
//   maintenanceMarginRatioD18: BigInt
//   liquidationRewardRatioD18: BigInt
//   maxSecondsInLiquidationWindow: BigInt
//   minimumPositionMargin: BigInt
//   maxLiquidationLimitAccumulationMultiplier: BigInt
//   makerFee: BigInt
//   takerFee: BigInt
//   factoryInitialized: Boolean
//   #new
//   positions: [Position!] @derivedFrom(field: "market")
//   liquidations: [Liquidation!] @derivedFrom(field: "market")
//   }