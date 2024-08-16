import { MarketCreated } from './generated/PerpsMarketProxy/PerpsMarketProxy';
import { Market } from './generated/schema';
import { BigInt } from '@graphprotocol/graph-ts';

export function handleMarketCreated(event: MarketCreated): void {
  const id = event.params.perpsMarketId.toString();
  const market = new Market(id);

  market.perpsMarketId = event.params.perpsMarketId;
  market.marketName = event.params.marketName;
  market.marketSymbol = event.params.marketSymbol;
  market.price = BigInt.zero();
  market.save();
}
