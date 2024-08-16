import { OrderSettled as OrderSettledEvent } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Position, OpenPosition, Account, InterestCharged, OrderSettled, Market } from "./generated/schema";
import { BigInt, log, store } from "@graphprotocol/graph-ts";

export function handleOrderSettled(event: OrderSettledEvent): void {

  // Create or load the OrderSettled entity
  const orderSettledId = event.params.marketId.toString() + '-' + event.params.accountId.toString() + '-' + event.block.timestamp.toString();
  const orderSettled = new OrderSettled(orderSettledId);

  // Verify account
  let account = Account.load(event.params.accountId.toString());
  if (account === null) {
    log.error('Account not found for accountId: {}', [orderSettled.account.toString()]);
    return;
  }

  // check if valid market
  let market = Market.load(event.params.marketId.toString());
  if (market == null) {
    log.warning('Market entity not found for marketId {}', [event.params.marketId.toString()]);
    return;
  }

  // Set OrderSettled entity fields
  orderSettled.timestamp = event.block.timestamp;
  orderSettled.marketId = event.params.marketId;
  orderSettled.market = market.id;
  orderSettled.accountId = event.params.accountId;
  orderSettled.fillPrice = event.params.fillPrice;
  orderSettled.accruedFunding = event.params.accruedFunding;
  orderSettled.sizeDelta = event.params.sizeDelta;
  orderSettled.newSize = event.params.newSize;
  orderSettled.totalFees = event.params.totalFees;
  orderSettled.referralFees = event.params.referralFees;
  orderSettled.collectedFees = event.params.collectedFees;
  orderSettled.settlementReward = event.params.settlementReward;
  orderSettled.trackingCode = event.params.trackingCode;
  orderSettled.settler = event.params.settler;
  orderSettled.transactionHash = event.transaction.hash;
  orderSettled.account = event.params.accountId.toString();

  // Load any associated interest charges
  const interestChargedItem = InterestCharged.load(event.params.accountId.toString() + '-' + event.transaction.hash.toHex());
  if (interestChargedItem !== null) {
    orderSettled.interestCharged = interestChargedItem.interest;
  }

  // Load the OpenPosition entity using the accountId and marketId
  const openPositionId = event.params.marketId.toString() + '-' + event.params.accountId.toString();

  let openPositionEntity = OpenPosition.load(openPositionId);
  if (openPositionEntity == null) {
    openPositionEntity = new OpenPosition(openPositionId);
  }

  let positionEntity = Position.load(orderSettledId);
  

  if (positionEntity == null) {
  

    // If no open position, create a new Position entity
    positionEntity = new Position(orderSettledId);
    positionEntity.market = market.id;
    positionEntity.account = account.id;
    positionEntity.isOpen = true;
    positionEntity.isLiquidated = false;
    positionEntity.openTimestamp = event.block.timestamp;
    positionEntity.size = event.params.sizeDelta;
    positionEntity.entryPrice = event.params.fillPrice;
    positionEntity.averageEntryPrice = event.params.fillPrice;
    positionEntity.totalTrades = BigInt.fromI32(1); // Starting with one trade
    positionEntity.realizedPnl = BigInt.zero(); // Initialize realized PnL
    positionEntity.totalFees = event.params.totalFees;
    positionEntity.accruedFunding = event.params.accruedFunding;
    positionEntity.trackingCode = event.params.trackingCode;
    positionEntity.pnlWithFeesPaid = BigInt.zero().minus(event.params.totalFees);

    // Save the new Position entity
    positionEntity.save();

    // Create a new OpenPosition entity
    openPositionEntity.position = positionEntity.id;
    openPositionEntity.save();
  } else {
    // Update the Position entity with the new trade
    positionEntity.size = positionEntity.size.plus(event.params.sizeDelta);
    positionEntity.totalTrades = positionEntity.totalTrades.plus(BigInt.fromI32(1));
    positionEntity.totalFees = positionEntity.totalFees.plus(event.params.totalFees);
    positionEntity.accruedFunding = positionEntity.accruedFunding.plus(event.params.accruedFunding);
    positionEntity.pnlWithFeesPaid = positionEntity.realizedPnl.minus(positionEntity.totalFees);
    positionEntity.realizedPnl = positionEntity.realizedPnl.plus(event.params.pnl);

    // If the newSize is zero, this means the position is being closed
    if (event.params.newSize.isZero()) {
      positionEntity.isOpen = false;
      positionEntity.closeTimestamp = event.block.timestamp;
      positionEntity.exitPrice = event.params.fillPrice;

      // Optionally, remove the OpenPosition entity
      store.remove('OpenPosition', openPositionEntity.id);
    }

    // Save the updated Position entity
    positionEntity.save();
  }

  // Link the OrderSettled to the Position
  orderSettled.position = positionEntity.id;

  // Save the OrderSettled entity
  orderSettled.save();
}
