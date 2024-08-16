import { OrderSettled as OrderSettledEvent } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Position, OpenPosition, Account, InterestCharged, OrderSettled, Order, Market } from "./generated/schema";
import { BigInt, log, store } from "@graphprotocol/graph-ts";

export function handleOrderSettled(event: OrderSettledEvent): void {
    const orderId = event.params.accountId.toString() + '-' + event.block.timestamp.toString();
    const order = new OrderSettled(orderId);
  

  
    order.transactionHash = event.transaction.hash;
    order.accountId = event.params.accountId;
    order.account = event.params.accountId.toString();
    order.accruedFunding = event.params.accruedFunding;
    order.collectedFees = event.params.collectedFees;
    order.fillPrice = event.params.fillPrice;
    order.marketId = event.params.marketId;
    order.timestamp = event.block.timestamp;
    order.totalFees = event.params.totalFees;
    order.trackingCode = event.params.trackingCode;
    order.settlementReward = event.params.settlementReward;
    order.sizeDelta = event.params.sizeDelta;
    order.newSize = event.params.newSize;
    order.referralFees = event.params.referralFees;
    order.settler = event.params.settler;
  
    let interestChargedItem = InterestCharged.load(
      event.params.accountId.toString() + '-' + event.transaction.hash.toHex(),
    );
    if (interestChargedItem !== null) {
      order.interestCharged = interestChargedItem.interest;
    }
  
    let positionId = event.params.marketId.toString() + '-' + event.params.accountId.toString();
    let openPositionEntity = OpenPosition.load(positionId);
    if (openPositionEntity == null) {
      openPositionEntity = new OpenPosition(positionId);
    }
  
    let positionEntity = Position.load(openPositionEntity.position !== null ? openPositionEntity.position! : '');
    let account = Account.load(order.account);
  
    if (account === null) {
      log.error('Account not found for accountId: {}', [order.account.toString()]);
      return;
    }
  
  
    if (positionEntity == null) {
      let marketEntity = Market.load(event.params.marketId.toString());
  
      if (marketEntity == null) {
        log.warning('Market entity not found for marketId {}', [event.params.marketId.toString()]);
        return;
      }
  
      let positionEntity = new Position(positionId + '-' + event.block.timestamp.toString());
      openPositionEntity.position = positionEntity.id;
  
      positionEntity.marketId = event.params.marketId;
      if (marketEntity) {
        positionEntity.marketSymbol = marketEntity.marketSymbol;
      }
  
      positionEntity.accountId = event.params.accountId;
      positionEntity.account = event.params.accountId.toString();
      positionEntity.isLiquidated = false;
      positionEntity.isOpen = true;
      positionEntity.size = event.params.sizeDelta;
      positionEntity.timestamp = event.block.timestamp;
      positionEntity.openTimestamp = event.block.timestamp;
      positionEntity.avgEntryPrice = event.params.fillPrice;
      positionEntity.totalTrades = BigInt.fromI32(1);
      positionEntity.entryPrice = event.params.fillPrice;
      positionEntity.lastPrice = event.params.fillPrice;
      positionEntity.feesPaid = event.params.totalFees;
      positionEntity.netFunding = event.params.accruedFunding;
      positionEntity.realizedPnl = positionEntity.netFunding;
      positionEntity.pnlWithFeesPaid = positionEntity.netFunding.minus(positionEntity.feesPaid);
      positionEntity.totalVolume = volume;
      positionEntity.totalReducedNotional = ZERO;
      positionEntity.interestCharged = ZERO;
  

  
  
      positionEntity.save();
      order.position = positionEntity.id;

    } else {
      const tradeNotionalValue = event.params.sizeDelta.abs().times(event.params.fillPrice);
  
      positionEntity.feesPaid = positionEntity.feesPaid.plus(event.params.totalFees);
      positionEntity.netFunding = positionEntity.netFunding.plus(event.params.accruedFunding);
  
      if (event.params.newSize.isZero()) {
        positionEntity.isOpen = false;
        positionEntity.closeTimestamp = event.block.timestamp;
        positionEntity.exitPrice = event.params.fillPrice;
        positionEntity.totalReducedNotional = positionEntity.totalReducedNotional.plus(tradeNotionalValue);
        openPositionEntity.position = null;
        openPositionEntity.save();
  
        calculatePnl(positionEntity, order, event, statEntity);
      } else {
        if (
          (positionEntity.size.lt(ZERO) && event.params.newSize.gt(ZERO)) ||
          (positionEntity.size.gt(ZERO) && event.params.newSize.lt(ZERO))
        ) {
          // TODO: Better handle flipping sides
          calculatePnl(positionEntity, order, event, statEntity);
          positionEntity.avgEntryPrice = event.params.fillPrice;
          positionEntity.entryPrice = event.params.fillPrice;
        } else if (event.params.newSize.abs().gt(positionEntity.size.abs())) {
          // If ths positions size is increasing then recalculate the average entry price
          const existingNotionalValue = positionEntity.size.abs().times(positionEntity.avgEntryPrice);
          positionEntity.avgEntryPrice = existingNotionalValue.plus(tradeNotionalValue).div(event.params.newSize.abs());
        } else {
          // If decreasing calc the pnl
          calculatePnl(positionEntity, order, event, statEntity);
          // Track the total amount reduced
        }
      }
      positionEntity.totalTrades = positionEntity.totalTrades.plus(BigInt.fromI32(1));
      positionEntity.totalVolume = positionEntity.totalVolume.plus(volume);
  
      statEntity.totalTrades = statEntity.totalTrades.plus(BigInt.fromI32(1));
      statEntity.totalVolume = statEntity.totalVolume.plus(volume);
      order.position = positionEntity.id;
      positionEntity.size = positionEntity.size.plus(event.params.sizeDelta);
  
      if (event.params.trackingCode.toString() == 'KWENTA') {
        updateAggregateStatEntities(
          positionEntity.marketId,
          positionEntity.marketSymbol,
          event.block.timestamp,
          ONE,
          volume,
        );
      }
  
      statEntity.feesPaid = statEntity.feesPaid.plus(event.params.totalFees).minus(event.params.accruedFunding);
  
      positionEntity.save();
      statEntity.save();
    }
    openPositionEntity.save();
  
    log.info('Order Settled: {} {}', [order.account.toString(), event.block.number.toString()]);
  
    order.save();
  }
  