import { OrderSettled as OrderSettledEvent } from "./generated/PerpsMarketProxy/PerpsMarketProxy";
import {
  Position,
  OpenPosition,
  Account,
  InterestCharged,
  Trade,
  Market,
  AccountAggregateStat,
} from "./generated/schema";
import { BigInt, log, store, Bytes, ByteArray } from "@graphprotocol/graph-ts";

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

  // If no Position Entity, create a new Position Entity
  if (positionEntity == null) {
    // If no open position, create a new Position entity
    positionEntity = new Position(tradeId);

    // set the trade type
    trade.tradeType = event.params.sizeDelta.gt(BigInt.zero()) ? "LONG_OPENED" : "SHORT_OPENED"
   
    // Increment Total Open Positions
    account.totalOpenPositions = account.totalOpenPositions.plus(BigInt.fromI32(1));

    // marketID, accountID, trackingCode, isOpen, isLiquidated, status, direction
    positionEntity.market = market.id;
    positionEntity.account = account.id;
    positionEntity.trackingCode = event.params.trackingCode;
    positionEntity.isOpen = true;
    positionEntity.isLiquidated = false;
    positionEntity.status = "OPEN";
    positionEntity.direction = event.params.newSize.gt(BigInt.zero())
      ? "LONG"
      : "SHORT";

    // openTimestamp, lastTradetimestamp, entryPrice, lastFillPrice, 
    // averageEntryPrice, size, notionalAmount, realizedPnl, unrealizedPnl
    positionEntity.openTimestamp = event.block.timestamp;
    positionEntity.lastTradeTimestamp = trade.timestamp;
    positionEntity.entryPrice = event.params.fillPrice;
    positionEntity.lastFillPrice = event.params.fillPrice;
    positionEntity.averageEntryPrice = event.params.fillPrice;
    positionEntity.size = event.params.newSize;
    positionEntity.notionalAmount = notionalAmount;
    positionEntity.realizedPnl = event.params.pnl;
    positionEntity.unrealizedPnl = BigInt.zero();

    // totalTrades, totalVolume, totalFees
    positionEntity.totalTrades = BigInt.fromI32(1);
    positionEntity.totalVolume = volume;
    positionEntity.totalFees = event.params.totalFees;

    // totalFees, accruedFunding

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
  } else {
    // Position Entity is not null. Process Order updating Position
    

    // store previousPositionSize
    const previousPositionValue = positionEntity.size
      .abs()
      .times(positionEntity.averageEntryPrice);

    // last fill price, last trade time stamp
    positionEntity.lastFillPrice = event.params.fillPrice;
    positionEntity.lastTradeTimestamp = trade.timestamp;

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

    if (event.params.newSize.isZero()) {
      // If the newSize is zero, this means the position is being closed

      // set trade type to closing
      trade.tradeType = event.params.sizeDelta.gt(BigInt.zero()) ? "SHORT_CLOSED" : "LONG_CLOSED";

      // isOpen, status, closeTimestamp, exitPrice, unrealizedPnl, realizedPnl
      positionEntity.isOpen = false;
      positionEntity.status = "CLOSED";
      positionEntity.closeTimestamp = event.block.timestamp;
      positionEntity.exitPrice = event.params.fillPrice;
      positionEntity.unrealizedPnl = BigInt.zero();
      // positionEntity.realizedPnl = event.params.pnl;

      // Remove the OpenPosition entity
      store.remove("OpenPosition", openPositionEntity.id);

      // Update Total Open and Closed Positions
      account.totalOpenPositions = account.totalOpenPositions.minus(BigInt.fromI32(1));
      account.totalClosedPositions = account.totalClosedPositions.plus(BigInt.fromI32(1));

    } else if (event.params.newSize.gt(BigInt.zero())) {
      // Update Long Position
      positionEntity.direction = "LONG";

      // update trade type
      trade.tradeType = event.params.sizeDelta.gt(BigInt.zero()) ? "LONG_INCREASED" : "LONG_DECREASED";

      // Calculate unrealizedPnl for Long Position
      positionEntity.unrealizedPnl = market.price
        .minus(positionEntity.averageEntryPrice)
        .times(positionEntity.size)
        .div(BigInt.fromI32(10).pow(18));

      // Check if Position Size is increasing
      if (event.params.newSize.gt(positionEntity.size)) {
        // Long position is increasing, update average entry price

        positionEntity.averageEntryPrice = previousPositionValue
          .plus(event.params.sizeDelta.abs().times(event.params.fillPrice))
          .div(event.params.newSize.abs())
          .div(BigInt.fromI32(10).pow(18));
      }
    } else if (event.params.newSize.lt(BigInt.zero())) {
      // Update Short Position
      positionEntity.direction = "SHORT";

      // update trade type
      trade.tradeType = event.params.sizeDelta.gt(BigInt.zero()) ? "SHORT_DECREASED" : "SHORT_INCREASED";

      // Calculate unrealizedPnl for Short Position
      positionEntity.unrealizedPnl = positionEntity.averageEntryPrice
        .minus(market.price)
        .times(positionEntity.size.abs())
        .div(BigInt.fromI32(10).pow(18));

      if (event.params.newSize.abs().gt(positionEntity.size.abs())) {
        // Short position is increasing, update average entry price
        positionEntity.averageEntryPrice = previousPositionValue
          .plus(event.params.sizeDelta.abs().times(event.params.fillPrice))
          .div(event.params.newSize.abs())
          .div(BigInt.fromI32(10).pow(18));
      }
    }

    // Save the updated Position entity
    positionEntity.save();

    // Save the updated OpenPosition entity
    // openPositionEntity.save();

    // Link the Trade to the Position
    trade.position = positionEntity.id;
    // Save the Trade entity
    trade.save();
  }

  // Add to Account
  account.pnl = account.pnl.plus(event.params.pnl);
  account.feesPaid = account.feesPaid.plus(event.params.totalFees);
  account.totalTrades = account.totalTrades.plus(BigInt.fromI32(1));
  account.totalVolume = account.totalVolume.plus(volume);
  account.save();

  const accountStatId = account.id.toString() + '-' + positionEntity.id.toString();
  let accountStatEntity = AccountAggregateStat.load(accountStatId);
  if(accountStatEntity == null) {
    accountStatEntity = new AccountAggregateStat(accountStatId)
  }
  accountStatEntity.account = account.id;
  accountStatEntity.market = market.id;
  accountStatEntity.positionPnl = event.params.pnl;
  accountStatEntity.accountPnl = account.pnl;
  accountStatEntity.timestamp = event.block.timestamp;
  accountStatEntity.block = event.block.number;
  accountStatEntity.save()
}


