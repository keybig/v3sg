import { OrderSettled as OrderSettledEvent } from "./generated/PerpsMarketProxy/PerpsMarketProxy";
import {
  Position,
  OpenPosition,
  Account,
  InterestCharged,
  Trade,
  Market,
} from "./generated/schema";
import { BigInt, log, store } from "@graphprotocol/graph-ts";

export function handleOrderSettled(event: OrderSettledEvent): void {
  // Create or load the Trade entity
  // opening trade of position is the position id
  const tradeId =
    event.params.marketId.toString() +
    "-" +
    event.params.accountId.toString() +
    "-" +
    event.block.timestamp.toString();
  const trade = new Trade(tradeId);

  // Verify account
  let account = Account.load(event.params.accountId.toString());
  if (account === null) {
    log.error("Account not found for accountId: {}", [
      event.params.accountId.toString(),
    ]);
    return;
  }

  // Check if valid market
  let market = Market.load(event.params.marketId.toString());
  if (market == null) {
    log.warning("Market entity not found for marketId {}", [
      event.params.marketId.toString(),
    ]);
    return;
  }

  // Set Trade entity fields
  trade.timestamp = event.block.timestamp;
  trade.market = market.id;
  trade.account = account.id;
  trade.fillPrice = event.params.fillPrice;
  trade.accruedFunding = event.params.accruedFunding;
  trade.sizeDelta = event.params.sizeDelta;
  trade.newSize = event.params.newSize;
  trade.totalFees = event.params.totalFees;
  trade.referralFees = event.params.referralFees;
  trade.collectedFees = event.params.collectedFees;
  trade.settlementReward = event.params.settlementReward;
  trade.trackingCode = event.params.trackingCode;
  trade.settler = event.params.settler;
  trade.transactionHash = event.transaction.hash;
  trade.pnl = event.params.pnl;
  trade.block = event.block.number;

  // Load any associated interest charges
  let interestCharged = InterestCharged.load(
    event.params.accountId.toString() + "-" + event.transaction.hash.toHex()
  );
  if (interestCharged !== null) {
    trade.interestCharged = interestCharged.interest;
  }

  let volume = event.params.sizeDelta
    .abs()
    .times(event.params.fillPrice)
    .div(BigInt.fromI32(10).pow(18))
    .abs();
  trade.volume = volume;

  let notionalAmount = event.params.newSize
    .abs()
    .times(event.params.fillPrice)
    .div(BigInt.fromI32(10).pow(18))
    .abs();
  trade.notionalAmount = notionalAmount;

  // Load the OpenPositions entity using the accountId and marketId
  const openPositionId =
    event.params.marketId.toString() + "-" + event.params.accountId.toString();
  let openPositionEntity = OpenPosition.load(openPositionId);
  if (openPositionEntity == null) {
    openPositionEntity = new OpenPosition(openPositionId);
    openPositionEntity.position = tradeId;
  }

  // load position entity
  let positionEntity = Position.load(openPositionEntity.position);

  // important
  // start control flow logic
  // if/else if for opening position, closing position
  if (positionEntity == null) {
    // important
    // If no open position, create a new Position entity

    log.info("Position Entity is null, creating new position: {}", [tradeId.toString()]);

    positionEntity = new Position(tradeId);

    log.info("Position Entity is created, new positionID: {}", [positionEntity.id.toString()]);

    // marketID, accountID, trackingCode
    positionEntity.market = market.id;
    positionEntity.account = account.id;
    positionEntity.trackingCode = event.params.trackingCode;

    // isOpen, isLiquidated, status, direction
    positionEntity.isOpen = true;
    positionEntity.isLiquidated = false;
    positionEntity.status = "OPEN";

    // openTimestamp, entryPrice, lastFillPrice
    positionEntity.openTimestamp = event.block.timestamp;
    positionEntity.entryPrice = event.params.fillPrice;

    // totalTrades, totalVolume
    positionEntity.totalTrades = BigInt.zero(); // init to zero
    positionEntity.totalVolume = BigInt.zero(); // init to zero

    // Initialize averageEntryPrice and unrealizedPnl
    // positionEntity.averageEntryPrice = event.params.fillPrice;
    // positionEntity.unrealizedPnl = BigInt.zero();
    // positionEntity.size = event.params.newSize;

    log.info("new created position averageEntryPrice:{}", [positionEntity.averageEntryPrice.toString()]);
    log.info("new created position event param fill price:{}", [event.params.fillPrice.toString()]);
    log.info("new created position unrealizedPnl:{}", [positionEntity.unrealizedPnl.toString()]);
    log.info("new created position size:{}", [positionEntity.size.toString()]);


  } 
  
  if (event.params.newSize.isZero()) {
    // important
    // If the newSize is zero, this means the position is being closed

    log.info("Position Entity is closing, id: {}, newSize:{}", [tradeId.toString(), event.params.newSize.toString()]);
    log.info("newSize:{}", [event.params.newSize.toString()]);

    // isOpen, status
    positionEntity.isOpen = false;
    positionEntity.status = "CLOSED";

    // closeTimestamp, exitPrice
    positionEntity.closeTimestamp = event.block.timestamp;
    positionEntity.exitPrice = event.params.fillPrice;
    positionEntity.unrealizedPnl = BigInt.zero();

    // Remove the OpenPosition entity
    store.remove("OpenPosition", openPositionEntity.id);
  } else {

    log.info("before run average entry price: {}", [positionEntity.averageEntryPrice.toString()]);
  log.info("positionSize: {}", [positionEntity.size.toString()]);
  log.info("positionSizeAbs: {}", [positionEntity.size.abs().toString()]);
  log.info("sizeDelta: {}", [event.params.sizeDelta.toString()]);
  log.info("sizeDeltaAbs: {}", [event.params.sizeDelta.abs().toString()]);
  log.info("fillPrice: {}", [event.params.fillPrice.toString()]);
  log.info("newSize: {}", [event.params.newSize.toString()]);
  log.info("newSizeAbs: {}", [event.params.newSize.abs().toString()]);


    // Update averageEntryPrice using absolute values
    positionEntity.averageEntryPrice = positionEntity.size.abs()
      .times(positionEntity.averageEntryPrice)
      .plus(event.params.sizeDelta.abs().times(event.params.fillPrice))
      .div(event.params.newSize.abs());
    
    log.info("averageEntryPrice updated: {}", [positionEntity.averageEntryPrice.toString()])

      
    // Calculate unrealizedPnl based on the current market price
    if (event.params.newSize.gt(BigInt.zero())) {
      positionEntity.unrealizedPnl = market.price
        .minus(positionEntity.averageEntryPrice)
        .times(positionEntity.size)
        .div(BigInt.fromI32(10).pow(18));
    } else {
      positionEntity.unrealizedPnl = positionEntity.averageEntryPrice
        .minus(market.price)
        .times(positionEntity.size.abs())
        .div(BigInt.fromI32(10).pow(18));
    }

  }

  // important
  // below logic is common to all positions

  if (!event.params.newSize.isZero()) {
    log.info("Position Entity is being updated, ID: {}", [positionEntity.id.toString()]);

  
  }

  // Update Existing Position
  // direction
  positionEntity.direction = event.params.newSize.gt(BigInt.zero())
    ? "LONG"
    : "SHORT";

  // last fill price
  positionEntity.lastFillPrice = event.params.fillPrice;

  // size, notionalAmount, realizedPnl
  positionEntity.size = event.params.newSize;
  positionEntity.notionalAmount = notionalAmount;
  positionEntity.realizedPnl = event.params.pnl;

  // totalFees, totalVolume, totalTrades, accruedFunding
  positionEntity.totalFees = event.params.totalFees;
  positionEntity.totalVolume = positionEntity.totalVolume.plus(volume);
  positionEntity.totalTrades = positionEntity.totalTrades.plus(
    BigInt.fromI32(1)
  );
  positionEntity.accruedFunding = event.params.accruedFunding;
  positionEntity.interestCharged =
    interestCharged !== null ? interestCharged.interest : BigInt.zero();

  // Save the updated Position entity

  positionEntity.save();

  // Save the updated OpenPosition entity

  openPositionEntity.save();

  // Link the Trade to the Position
  trade.position = positionEntity.id;
  // Save the Trade entity
  trade.save();

  // Add to Account
  account.pnl = account.pnl.plus(event.params.pnl);
  account.feesPaid = account.feesPaid.plus(event.params.totalFees);
  account.totalTrades = account.totalTrades.plus(BigInt.fromI32(1));
  account.totalVolume = account.totalVolume.plus(volume);
  account.save();
}
