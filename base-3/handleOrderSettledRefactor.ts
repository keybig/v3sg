// import { OrderSettled as OrderSettledEvent } from "./generated/PerpsMarketProxy/PerpsMarketProxy";
// import {
//   Position,
//   OpenPosition,
//   Account,
//   InterestCharged,
//   Trade,
//   Market,
//   AccountAggregateStat,
//   PositionReference,
// } from "./generated/schema";
// import { BigInt, log, store, Bytes, ByteArray } from "@graphprotocol/graph-ts";

// /*
//     Functions Needed
//     1. Create Trade Entity
//     2. Create Position Entity if null
//     3. Update Position if not null
//         A. Is Position switching direction?
//         B. Is Position Increasing or Decreasing
//         C. Is Position Closing
//     4. Update Account Stats
// */
// export function handleOrderSettled(event: OrderSettledEvent): void {
//   // Create or load the Trade entity
//   // opening trade of position is the position id
//   const tradeId =
//     event.params.accountId.toString() +
//     "-" +
//     event.block.number.toString() +
//     "-" +
//     event.logIndex.toString();
//   const trade = new Trade(tradeId);

//   // Verify account
//   let account = Account.load(event.params.accountId.toString());
//   if (account === null) {
//     log.error("Account not found for accountId: {}", [
//       event.params.accountId.toString(),
//     ]);
//     return;
//   }

//   // Check if valid market
//   let market = Market.load(event.params.marketId.toString());
//   if (market == null) {
//     log.warning("Market entity not found for marketId {}", [
//       event.params.marketId.toString(),
//     ]);
//     return;
//   }

//   // Set Trade entity fields
//   trade.timestamp = event.block.timestamp;
//   trade.market = market.id;
//   trade.account = account.id;
//   trade.fillPrice = event.params.fillPrice;
//   trade.accruedFunding = event.params.accruedFunding;
//   trade.sizeDelta = event.params.sizeDelta;
//   trade.newSize = event.params.newSize;
//   trade.totalFees = event.params.totalFees;
//   trade.referralFees = event.params.referralFees;
//   trade.collectedFees = event.params.collectedFees;
//   trade.settlementReward = event.params.settlementReward;
//   trade.trackingCode = event.params.trackingCode;
//   trade.settler = event.params.settler;
//   trade.transactionHash = event.transaction.hash;
//   trade.pnl = event.params.pnl;
//   trade.block = event.block.number;

//   let volume = event.params.sizeDelta
//     .abs()
//     .times(event.params.fillPrice)
//     .div(BigInt.fromI32(10).pow(18))
//     .abs();
//   trade.volume = volume;

//   let notionalAmount = event.params.newSize
//     .abs()
//     .times(event.params.fillPrice)
//     .div(BigInt.fromI32(10).pow(18))
//     .abs();
//   trade.notionalAmount = notionalAmount;

//   // Load the OpenPositions entity using the accountId and marketId
//   const openPositionId =
//     event.params.marketId.toString() + "-" + event.params.accountId.toString();
//   let openPositionEntity = OpenPosition.load(openPositionId);

//   if (openPositionEntity == null) {
//     openPositionEntity = new OpenPosition(openPositionId);
//     // If no open position, create a new Position entity
//     openPositionEntity.position = tradeId;
//   }
//   // load position entity
//   let positionEntity = Position.load(openPositionEntity.position);

//   if (positionEntity == null) {
//     // If no open position, create a new Position entity
//    let placeholder = 1;
//   } else {

//     // Position Entity is not null. Process Order updating Position

//     // calculate PNL and update average entry price
//     if (event.params.newSize.abs().lt(positionEntity.size.abs())) {
      
//       // Calculate realized PnL using the previous average entry price and previous size
//       let pnlCalc = event.params.fillPrice
//         .minus(positionEntity.averageEntryPrice) // Use the previous averageEntryPrice
//         .times(event.params.sizeDelta.abs()) // Use the size delta
//         .times(positionEntity.size.gt(BigInt.zero()) ? BigInt.fromI32(1) : BigInt.fromI32(-1))
//         .div(BigInt.fromI32(10).pow(18));
      
//       let pnlCalcWithFees = pnlCalc.minus(positionEntity.totalFees).plus(positionEntity.accruedFunding)

//       // update pnlCalc
//       positionEntity.pnlCalc = positionEntity.pnlCalc.plus(pnlCalc);
//       positionEntity.pnlCalcWithFees = positionEntity.pnlCalcWithFees.plus(pnlCalcWithFees);
//       trade.pnlCalc = pnlCalc;

//       // update realizedPnl field
//       positionEntity.realizedPnl = event.params.pnl;
//       positionEntity.realizedPnlSum = positionEntity.realizedPnlSum.plus(event.params.pnl)

//       // trade type based on position decrease
//       trade.tradeType = event.params.sizeDelta.gt(BigInt.zero())
//         ? "SHORT_DECREASED"
//         : "LONG_DECREASED";
      
//       // average entry price tracking
//       trade.averageEntryPrice = positionEntity.averageEntryPrice;


//     } else {
//       // update average entry price
//       positionEntity.averageEntryPrice = positionEntity.size.abs()
//         .times(positionEntity.averageEntryPrice)
//         .plus(event.params.sizeDelta.abs().times(event.params.fillPrice))
//         .div(event.params.newSize.abs())
//         .div(BigInt.fromI32(10).pow(18));

//       // trade type based on position increase
//       trade.tradeType = event.params.sizeDelta.gt(BigInt.zero())
//         ? "LONG_INCREASED"
//         : "SHORT_INCREASED";

//       trade.pnlCalc = BigInt.zero();

//       // average entry price tracking
//       trade.averageEntryPrice = positionEntity.size.abs()
//       .times(positionEntity.averageEntryPrice)
//       .plus(event.params.sizeDelta.abs().times(event.params.fillPrice))
//       .div(event.params.newSize.abs())
//       .div(BigInt.fromI32(10).pow(18));

//     }

//     // last fill price, last trade time stamp
//     positionEntity.lastFillPrice = event.params.fillPrice;
//     positionEntity.lastTradeTimestamp = trade.timestamp;

//     // size, notionalAmount, realizedPnl
//     positionEntity.size = event.params.newSize;
//     positionEntity.notionalAmount = notionalAmount;
//     // positionEntity.realizedPnl = event.params.pnl;


//     // totalFees, totalVolume, totalTrades, accruedFunding
//     positionEntity.totalFees = event.params.totalFees;
//     positionEntity.totalVolume = positionEntity.totalVolume.plus(volume);
//     positionEntity.totalTrades = positionEntity.totalTrades.plus(
//       BigInt.fromI32(1)
//     );
//     positionEntity.accruedFunding = event.params.accruedFunding;

//     // if newSize is zero, this menas the position is being closed
//     if (event.params.newSize.isZero()) {
//       // set trade type to closing
//       trade.tradeType = event.params.sizeDelta.gt(BigInt.zero())
//         ? "SHORT_CLOSED"
//         : "LONG_CLOSED";

//       // isOpen, status, closeTimestamp, exitPrice, unrealizedPnl, realizedPnl
//       positionEntity.isOpen = false;
//       positionEntity.status = "CLOSED";
//       positionEntity.closeTimestamp = event.block.timestamp;
//       positionEntity.exitPrice = event.params.fillPrice;
//       positionEntity.unrealizedPnl = BigInt.zero();
//       // positionEntity.realizedPnl = event.params.pnl;

//       // Remove the OpenPosition entity
//       store.remove("OpenPosition", openPositionEntity.id);

//       // Update Total Open and Closed Positions
//       account.totalOpenPositions = account.totalOpenPositions.minus(
//         BigInt.fromI32(1)
//       );
//       account.totalClosedPositions = account.totalClosedPositions.plus(
//         BigInt.fromI32(1)
//       );
//     }

//     // Save the updated Position entity
//     positionEntity.save();

//     // Link the Trade to the Position
//     trade.position = positionEntity.id;
//     // Save the Trade entity
//     trade.save();
//   }

//   // Add to Account
//   account.pnl = account.pnl.plus(event.params.pnl);
//   account.feesPaid = account.feesPaid.plus(event.params.totalFees);
//   account.totalTrades = account.totalTrades.plus(BigInt.fromI32(1));
//   account.totalVolume = account.totalVolume.plus(volume);
//   account.save();

//   const accountStatId =
//     account.id.toString() +
//     "-" +
//     positionEntity.id.toString() +
//     "-" +
//     event.block.timestamp.toString();
//   const accountStatEntity = new AccountAggregateStat(accountStatId);

//   accountStatEntity.account = account.id;
//   accountStatEntity.market = market.id;
//   accountStatEntity.positionPnl = event.params.pnl;
//   accountStatEntity.accountPnl = account.pnl;
//   accountStatEntity.timestamp = event.block.timestamp;
//   accountStatEntity.block = event.block.number;
//   accountStatEntity.save();

//   // interest charged IDs
//   let interestTempId =
//     event.params.accountId.toString() + "-" + event.transaction.hash.toHex();
//   let interestTempEntity = new PositionReference(interestTempId);
//   interestTempEntity.accountId = event.params.accountId;
//   interestTempEntity.marketId = event.params.marketId;
//   interestTempEntity.positionId = positionEntity.id;
//   interestTempEntity.transactionHash = event.transaction.hash;
//   interestTempEntity.block = event.block.number;
// }

// function initializePosition(
//     position: Position, 
//     trade: Trade, 
//     event: OrderSettledEvent,
//     account: Account,
//     market: Market
// ): void {
//     let positionEntity = new Position(tradeId);

//     // set the trade type
//     trade.tradeType = event.params.sizeDelta.gt(BigInt.zero())
//       ? "LONG_OPENED"
//       : "SHORT_OPENED";

//     // average Entry Price tracking
//     trade.averageEntryPrice = event.params.fillPrice;

//     // Increment Total Open Positions
//     account.totalOpenPositions = account.totalOpenPositions.plus(
//       BigInt.fromI32(1)
//     );

//     // marketID, accountID, trackingCode, isOpen, isLiquidated, status, direction
//     positionEntity.market = market.id;
//     positionEntity.account = account.id;
//     positionEntity.trackingCode = event.params.trackingCode;
//     positionEntity.isOpen = true;
//     positionEntity.isLiquidated = false;
//     positionEntity.status = "OPEN";
//     positionEntity.direction = event.params.newSize.gt(BigInt.zero())
//       ? "LONG"
//       : "SHORT";

//     // openTimestamp, lastTradetimestamp, entryPrice, lastFillPrice,
//     // averageEntryPrice, size, notionalAmount, realizedPnl, unrealizedPnl
//     positionEntity.openTimestamp = event.block.timestamp;
//     positionEntity.lastTradeTimestamp = trade.timestamp;
//     positionEntity.entryPrice = event.params.fillPrice;
//     positionEntity.lastFillPrice = event.params.fillPrice;
//     positionEntity.averageEntryPrice = event.params.fillPrice;
//     positionEntity.size = event.params.newSize;
//     positionEntity.notionalAmount = notionalAmount;
//     positionEntity.realizedPnl = event.params.pnl;
//     positionEntity.realizedPnlSum = BigInt.zero();
//     positionEntity.unrealizedPnl = BigInt.zero();
//     positionEntity.pnlCalc = BigInt.zero();
//     positionEntity.pnlCalcWithFees = BigInt.zero();
//     trade.pnlCalc = BigInt.zero();

//     // totalTrades, totalVolume, totalFees
//     positionEntity.totalTrades = BigInt.fromI32(1);
//     positionEntity.totalVolume = volume;
//     positionEntity.totalFees = event.params.totalFees;

//     // totalFees, accruedFunding

//     positionEntity.accruedFunding = event.params.accruedFunding;

//     // Save the updated Position entity
//     positionEntity.save();

//     // Save the updated OpenPosition entity
//     openPositionEntity.position = positionEntity.id;
//     openPositionEntity.save();

//     // Save the trade entity
//     trade.position = positionEntity.id;
//     trade.save();
// }