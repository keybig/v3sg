import { OrderSettled as OrderSettledEvent } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Position, OpenPosition, Account, InterestCharged, OrderSettled, Order, Market } from "./generated/schema";
import { BigInt, log, store } from "@graphprotocol/graph-ts";

export function handleOrderSettled(event: OrderSettledEvent): void {

    const orderId = event.params.marketId.toString() + '-' + event.params.accountId.toString() + '-' + event.block.timestamp.toString();
    const orderSettled = new OrderSettled(orderId);

  
    orderSettled.transactionHash = event.transaction.hash;
    orderSettled.accountId = event.params.accountId;
    orderSettled.account = event.params.accountId.toString();
    orderSettled.accruedFunding = event.params.accruedFunding;
    orderSettled.collectedFees = event.params.collectedFees;
    orderSettled.fillPrice = event.params.fillPrice;
    orderSettled.marketId = event.params.marketId;
    orderSettled.timestamp = event.block.timestamp;
    orderSettled.totalFees = event.params.totalFees;
    orderSettled.trackingCode = event.params.trackingCode;
    orderSettled.settlementReward = event.params.settlementReward;
    orderSettled.sizeDelta = event.params.sizeDelta;
    orderSettled.newSize = event.params.newSize;
    orderSettled.referralFees = event.params.referralFees;
    orderSettled.settler = event.params.settler;
    orderSettled.transactionHash = event.transaction.hash;
  
    let interestChargedItem = InterestCharged.load(
      event.params.accountId.toString() + '-' + event.transaction.hash.toHex(),
    );
    if (interestChargedItem !== null) {
      orderSettled.interestCharged = interestChargedItem.interest;
    }



  // Create a unique ID for the position using marketId, accountId, and the current timestamp
  const positionId = event.params.marketId.toString() + '-' + event.params.accountId.toString() + '-' + event.block.timestamp.toString();

  // Load Account
  const account = Account.load(event.params.accountId.toString())
  if (account === null) {
    log.error('Account not found for accountId: {}', [orderSettled.account.toString()]);
    return;
  }

  // Load the OpenPositions entity using the accountId and marketId
  const openPositionId = event.params.marketId.toString() + '-' + event.params.accountId.toString();
  let openPositionEntity = OpenPosition.load(openPositionId);

  let positionEntity: Position;

  if (openPositionEntity == null) {
    // If no open position, create a new Position entity
    positionEntity = new Position(positionId);
    positionEntity.market = event.params.marketId.toString();
    positionEntity.account = event.params.accountId.toString();
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
    positionEntity.trackingCode = event.params.trackingCode

    // Save the new Position entity
    positionEntity.save();

    // Create a new OpenPositions entity
    openPositionEntity = new OpenPosition(openPositionId);
    openPositionEntity.position = positionEntity.id; // Link to the new Position
    openPositionEntity.save();
  } else {
    // Load the existing Position entity from the OpenPositions reference
    positionEntity = Position.load(openPositionEntity.position !== null ? openPositionEntity.position! : '') as Position;

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

      // Calculate realized PnL and set it
      // positionEntity.realizedPnl = calculatePnl(positionEntity, event);

      // Remove the reference from OpenPositions
      // openPositionEntity.position = null;
      // openPositionEntity.save();

      // Optionally, you could remove the openPositionEntity altogether if you prefer a cleaner dataset
      store.remove('OpenPositions', openPositionEntity.id);
    }

    // Save the updated Position entity
    positionEntity.save();
  }
}

// // Utility function to calculate PnL
// function calculatePnl(position: Position, event: OrderSettledEvent): BigInt {
//   // Example PnL calculation, can be adjusted as per your logic
//   let pnl = event.params.fillPrice.minus(position.entryPrice).times(position.size);
//   return pnl;
// }
