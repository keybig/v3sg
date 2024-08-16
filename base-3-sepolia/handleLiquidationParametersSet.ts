import { LiquidationParametersSet } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Market } from './generated/schema';

export function handleLiquidationParametersSet(event: LiquidationParametersSet): void {
  const id = event.params.marketId.toString();
  const market = Market.load(id);

  if (market) {
    market.initialMarginRatioD18 = event.params.initialMarginRatioD18;
    market.maintenanceMarginRatioD18 = event.params.maintenanceMarginRatioD18;
    market.minimumInitialMarginRatioD18 = event.params.maintenanceMarginRatioD18
    market.flagRewardRatioD18 = event.params.flagRewardRatioD18;
    market.minimumPositionMargin = event.params.minimumPositionMargin;

    market.save();
  }
}

  //   /**
  //    * @notice Gets fired when liquidation parameters are updated.
  //    * @param marketId udpates funding parameters to this specific market.
  //    * @param initialMarginRatioD18 the initial margin ratio (as decimal with 18 digits precision).
  //    * @param maintenanceMarginRatioD18 the maintenance margin ratio (as decimal with 18 digits precision).
  //    * @param flagRewardRatioD18 the flag reward ratio (as decimal with 18 digits precision).
  //    * @param minimumPositionMargin the minimum position margin.
  //    */
  //   event LiquidationParametersSet(
  //     uint128 indexed marketId,
  //     uint256 initialMarginRatioD18,
  //     uint256 maintenanceMarginRatioD18,
  //     uint256 minimumInitialMarginRatioD18,
  //     uint256 flagRewardRatioD18,
  //     uint256 minimumPositionMargin
  // );
