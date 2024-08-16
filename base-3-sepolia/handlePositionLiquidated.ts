import { PositionLiquidated as PositionLiquidatedEvent } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Liquidation, Account, Market, Position, OpenPosition } from './generated/schema';
import { BigInt, log, store } from '@graphprotocol/graph-ts';

export function handlePositionLiquidated(event: PositionLiquidatedEvent): void {
  const id =
    event.params.marketId.toString() +
    '-' +
    event.params.accountId.toString() +
    '-' +
    event.block.timestamp.toString();  

  const account = Account.load(event.params.accountId.toString());
  const market = Market.load(event.params.marketId.toString());

  if (!account || !market) {
    return; // If either account or market doesn't exist, we return early
  }

  // Create a new Liquidation entity
  const liquidation = new Liquidation(id);

  // Populate the Liquidation entity fields
  liquidation.accountId = event.params.accountId;
  liquidation.account = account.id;
  liquidation.marketId = event.params.marketId;
  liquidation.market = market.id;
  liquidation.timestamp = event.block.timestamp;
  liquidation.amountLiquidated = event.params.amountLiquidated;
  liquidation.notionalAmount = event.params.amountLiquidated.abs().times(market.price).div(BigInt.fromI32(10).pow(18));
  liquidation.marketPrice = market.price;
  liquidation.currentPositionSize = event.params.currentPositionSize;
  liquidation.liquidationType = event.params.currentPositionSize.isZero() ? "FULL" : "PARTIAL"
  liquidation.transactionHash = event.transaction.hash;
  liquidation.save();

  // Load Open Position
  const openPositionId = event.params.marketId.toString() + '-' + event.params.accountId.toString();
  const openPosition = OpenPosition.load(openPositionId);

  // Check if Open Position is bull
  if (openPosition === null || openPosition.position === null) {
    log.warning('Position entity not found for positionId {}', [openPositionId]);
    return;
  }

  // Load Liquidated Position
  let position = Position.load(openPosition.position)
  if (position !== null) {
    position.isLiquidated = true;
    position.liquidation = liquidation.id;
    position.isOpen = false;
    position.status = "LIQUIDATED";
    position.save();
    store.remove('OpenPosition', openPosition.id);
    account.totalLiquidations = account.totalLiquidations.plus(BigInt.fromI32(1));
    account.save()
  }

  liquidation.save();
}
