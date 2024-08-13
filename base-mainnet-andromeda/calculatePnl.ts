// import { Position, OrderSettled } from "./generated/schema";
// import { OrderSettled as OrderSettledEvent } from './generated/PerpsMarketProxy/PerpsMarketProxy';


// function calculatePnl(
//     position: Position,
//     order: OrderSettled,
//     event: OrderSettledEvent,
//     statEntity: AccountStat,
//   ): void {
//     let pnl = event.params.fillPrice
//       .minus(position.avgEntryPrice)
//       .times(event.params.sizeDelta.abs())
//       .times(position.size.gt(ZERO) ? BigInt.fromI32(1) : BigInt.fromI32(-1))
//       .div(ETHER);
//     let interestCharged = ZERO;
//     if (order.interestCharged !== null) {
//       interestCharged = order.interestCharged!;
//     }
//     position.interestCharged = position.interestCharged.plus(interestCharged);
//     position.realizedPnl = position.realizedPnl.plus(pnl);
//     position.pnlWithFeesPaid = position.realizedPnl
//       .minus(position.feesPaid)
//       .plus(position.netFunding)
//       .plus(interestCharged);
//     order.pnl = order.pnl.plus(pnl);
//     statEntity.pnl = statEntity.pnl.plus(pnl);
//     statEntity.pnlWithFeesPaid = statEntity.pnlWithFeesPaid
//       .plus(pnl)
//       .minus(order.totalFees)
//       .plus(order.accruedFunding)
//       .plus(interestCharged);
//     let pnlSnapshot = new PnlSnapshot(
//       position.id + '-' + event.block.timestamp.toString() + '-' + event.transaction.hash.toHex(),
//     );
//     pnlSnapshot.pnl = statEntity.pnl;
//     pnlSnapshot.accountId = position.accountId;
//     pnlSnapshot.timestamp = event.block.timestamp;
//     pnlSnapshot.save();
//     order.save();
//     position.save();
//     statEntity.save();
//   }