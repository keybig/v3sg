import { OrderSettled as OrderSettledEvent } from "./generated/PerpsMarketProxy/PerpsMarketProxy";
import {
  Position,
  OpenPosition,
  Account,
  InterestCharged,
  Trade,
  Market,
  AccountAggregateStat,
  PositionReference,
} from "./generated/schema";
import { BigInt, log, store, Bytes, ByteArray } from "@graphprotocol/graph-ts";

export function handleOrderSettled(event: OrderSettledEvent): void {
  // Create or load the Trade entity
  // opening trade of position is the position id
  const tradeId =
    event.params.accountId.toString() +
    "-" +
    event.block.number.toString() +
    "-" +
    event.logIndex.toString();
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

  let volume = event.params.sizeDelta
    .abs()
    .times(event.params.fillPrice)
    .div(BigInt.fromI32(10).pow(18))
  trade.volume = volume;

  let notionalAmount = event.params.newSize
    .abs()
    .times(event.params.fillPrice)
    .div(BigInt.fromI32(10).pow(18))
  trade.notionalAmount = notionalAmount;

  // interest charged
  const interestChargedId = event.params.accountId.toString() + '-' + event.transaction.hash.toHex();
  const interestChargedEntity = InterestCharged.load(interestChargedId);
  const interestCharged = interestChargedEntity ? interestChargedEntity.interest : BigInt.zero();
  trade.interestCharged = interestCharged;

  // Load the OpenPositions entity using the accountId and marketId
  const openPositionId =
    event.params.marketId.toString() + "-" + event.params.accountId.toString();
  let openPositionEntity = OpenPosition.load(openPositionId);

  if (openPositionEntity == null) {
    openPositionEntity = new OpenPosition(openPositionId);
    // If no open position, create a new Position entity
    openPositionEntity.position = tradeId;
  }
  // load position entity
  let positionEntity = Position.load(openPositionEntity.position);

  if (positionEntity == null) {
    // If no open position, create a new Position entity
    positionEntity = new Position(tradeId);

    // set the trade type
    trade.tradeType = event.params.sizeDelta.gt(BigInt.zero())
      ? "LONG_OPENED"
      : "SHORT_OPENED";

    // average Entry Price tracking
    trade.averageEntryPrice = event.params.fillPrice;

    // Increment Total Open Positions
    account.totalOpenPositions = account.totalOpenPositions.plus(
      BigInt.fromI32(1)
    );

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
    positionEntity.positionPnl = event.params.pnl;
    positionEntity.unrealizedPnl = BigInt.zero();
    positionEntity.realizedPnl = BigInt.zero();
    positionEntity.realizedPnlWithFees = BigInt.zero();
    trade.realizedPnl = BigInt.zero();

    // totalTrades, totalVolume, totalFees, accruedFunding, interestCharged
    positionEntity.totalTrades = BigInt.fromI32(1);
    positionEntity.totalVolume = volume;
    positionEntity.totalFees = event.params.totalFees;
    positionEntity.accruedFunding = event.params.accruedFunding;
    positionEntity.interestCharged = interestCharged;

    // Save the updated Position entity
    positionEntity.save();

    // Save the updated OpenPosition entity
    openPositionEntity.position = positionEntity.id;
    openPositionEntity.save();

    // Save the trade entity
    trade.position = positionEntity.id;
    trade.save();
  } else {

    // Position Entity is not null. Process Order updating Position

    // totalFees, totalVolume, totalTrades, accruedFunding, interestCharged
   positionEntity.totalFees = positionEntity.totalFees.plus(event.params.totalFees);
   positionEntity.totalVolume = positionEntity.totalVolume.plus(volume);
   positionEntity.totalTrades = positionEntity.totalTrades.plus(BigInt.fromI32(1));
   positionEntity.accruedFunding =  positionEntity.accruedFunding.plus(event.params.accruedFunding);
   positionEntity.interestCharged = positionEntity.interestCharged.plus(interestCharged);
 
    // calculate PNL and update average entry price
    if (event.params.newSize.abs().lt(positionEntity.size.abs())) {
      
      // Calculate realized PnL using the previous average entry price and previous size
      let realizedPnlCalc = event.params.fillPrice
        .minus(positionEntity.averageEntryPrice) // Use the previous averageEntryPrice
        .times(event.params.sizeDelta.abs()) // Use the size delta
        .times(positionEntity.size.gt(BigInt.zero()) ? BigInt.fromI32(1) : BigInt.fromI32(-1))
        .div(BigInt.fromI32(10).pow(18));
      
      // update position realized pnl
      positionEntity.realizedPnl = positionEntity.realizedPnl.plus(realizedPnlCalc);
      positionEntity.realizedPnlWithFees = positionEntity.realizedPnl.minus(positionEntity.totalFees).plus(positionEntity.accruedFunding).plus(positionEntity.interestCharged)
      trade.realizedPnl = realizedPnlCalc;

      // trade type based on position decrease
      trade.tradeType = event.params.sizeDelta.gt(BigInt.zero())
        ? "SHORT_DECREASED"
        : "LONG_DECREASED";
      
      // average entry price tracking
      trade.averageEntryPrice = positionEntity.averageEntryPrice;

    } else {

      // update average entry price
      const newTradeValue = event.params.sizeDelta.abs().times(event.params.fillPrice);
      const currentPositionValue = positionEntity.size.abs().times(positionEntity.averageEntryPrice);
      const newAverageEntryPrice = currentPositionValue.plus(newTradeValue).div(event.params.newSize.abs());
      trade.averageEntryPrice = newAverageEntryPrice;
      positionEntity.averageEntryPrice = newAverageEntryPrice;

      // trade type based on position increase
      trade.tradeType = event.params.sizeDelta.gt(BigInt.zero())
        ? "LONG_INCREASED"
        : "SHORT_INCREASED";

      trade.realizedPnl = BigInt.zero();

    }

    // last fill price, last trade time stamp
    positionEntity.lastFillPrice = event.params.fillPrice;
    positionEntity.lastTradeTimestamp = event.block.timestamp;

    // size, notionalAmount, realizedPnl
    positionEntity.size = event.params.newSize;
    positionEntity.notionalAmount = notionalAmount;
    positionEntity.positionPnl = positionEntity.positionPnl.plus(event.params.pnl);


 

    // if newSize is zero, this menas the position is being closed
    if (event.params.newSize.isZero()) {
      // set trade type to closing
      trade.tradeType = event.params.sizeDelta.gt(BigInt.zero())
        ? "SHORT_CLOSED"
        : "LONG_CLOSED";

      // isOpen, status, closeTimestamp, exitPrice, unrealizedPnl, realizedPnl
      positionEntity.isOpen = false;
      positionEntity.status = "CLOSED";
      positionEntity.closeTimestamp = event.block.timestamp;
      positionEntity.exitPrice = event.params.fillPrice;
      positionEntity.unrealizedPnl = BigInt.zero();

      // Remove the OpenPosition entity
      store.remove("OpenPosition", openPositionEntity.id);

      // Update Total Open and Closed Positions
      account.totalOpenPositions = account.totalOpenPositions.minus(
        BigInt.fromI32(1)
      );
      account.totalClosedPositions = account.totalClosedPositions.plus(
        BigInt.fromI32(1)
      );
    }

    // Save the updated Position entity
    positionEntity.save();

    // Link the Trade to the Position
    trade.position = positionEntity.id;
    // Save the Trade entity
    trade.save();
  }

  // Add to Account
  account.pnl = account.pnl.plus(positionEntity.realizedPnl);
  account.feesPaid = account.feesPaid.plus(event.params.totalFees);
  account.totalTrades = account.totalTrades.plus(BigInt.fromI32(1));
  account.totalVolume = account.totalVolume.plus(volume);
  account.save();

  const accountStatId =
    account.id.toString() +
    "-" +
    positionEntity.id.toString() +
    "-" +
    event.block.timestamp.toString();
  const accountStatEntity = new AccountAggregateStat(accountStatId);

  accountStatEntity.account = account.id;
  accountStatEntity.market = market.id;
  accountStatEntity.positionPnl = positionEntity.realizedPnl;
  accountStatEntity.accountPnl = account.pnl;
  accountStatEntity.timestamp = event.block.timestamp;
  accountStatEntity.block = event.block.number;
  accountStatEntity.save();
}
