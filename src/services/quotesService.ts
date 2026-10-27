import { MarketQuote, Currency, UpcomingDividend, StockPosition } from '../types/portfolio';
import { POPULAR_MARKET_STOCKS } from '../data/marketDatabase';

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Mapa de correspondencia para tickers españoles y europeos habituales
const SYMBOL_MAP: Record<string, { yahooSymbol: string; company: string; country: string; region: 'ESPAÑA' | 'EUROPA' | 'EEUU'; currency: Currency; exchange: string }> = {
  'SAN': { yahooSymbol: 'SAN.MC', company: 'Banco Santander', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'ITX': { yahooSymbol: 'ITX.MC', company: 'Inditex', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'IBE': { yahooSymbol: 'IBE.MC', company: 'Iberdrola', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'BBVA': { yahooSymbol: 'BBVA.MC', company: 'BBVA', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'CABK': { yahooSymbol: 'CABK.MC', company: 'CaixaBank', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'REP': { yahooSymbol: 'REP.MC', company: 'Repsol', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'TEF': { yahooSymbol: 'TEF.MC', company: 'Telefónica', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'ELE': { yahooSymbol: 'ELE.MC', company: 'Endesa', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'NTGY': { yahooSymbol: 'NTGY.MC', company: 'Naturgy', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'ACS': { yahooSymbol: 'ACS.MC', company: 'ACS', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'FER': { yahooSymbol: 'FER.MC', company: 'Ferrovial', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'AMS': { yahooSymbol: 'AMS.MC', company: 'Amadeus IT Group', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'IAG': { yahooSymbol: 'IAG.MC', company: 'International Airlines Group', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'GRF': { yahooSymbol: 'GRF.MC', company: 'Grifols', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'MAP': { yahooSymbol: 'MAP.MC', company: 'Mapfre', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'SAB': { yahooSymbol: 'SAB.MC', company: 'Banco Sabadell', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'RED': { yahooSymbol: 'RED.MC', company: 'Redeia (REE)', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'COL': { yahooSymbol: 'COL.MC', company: 'Inmobiliaria Colonial', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  'MRL': { yahooSymbol: 'MRL.MC', company: 'Merlin Properties', country: 'España', region: 'ESPAÑA', currency: 'EUR', exchange: 'BME (Madrid)' },
  // Europa
  'NOVO': { yahooSymbol: 'NOVO-B.CO', company: 'Novo Nordisk', country: 'Dinamarca', region: 'EUROPA', currency: 'EUR', exchange: 'Nasdaq Copenhagen' },
  'NOVO-B': { yahooSymbol: 'NOVO-B.CO', company: 'Novo Nordisk', country: 'Dinamarca', region: 'EUROPA', currency: 'EUR', exchange: 'Nasdaq Copenhagen' },
  'NOVO-B.CO': { yahooSymbol: 'NOVO-B.CO', company: 'Novo Nordisk', country: 'Dinamarca', region: 'EUROPA', currency: 'EUR', exchange: 'Nasdaq Copenhagen' },
  'ASML': { yahooSymbol: 'ASML.AS', company: 'ASML Holding', country: 'Países Bajos', region: 'EUROPA', currency: 'EUR', exchange: 'Euronext Amsterdam' },
  'MC': { yahooSymbol: 'MC.PA', company: 'LVMH', country: 'Francia', region: 'EUROPA', currency: 'EUR', exchange: 'Euronext Paris' },
  'SAP': { yahooSymbol: 'SAP.DE', company: 'SAP SE', country: 'Alemania', region: 'EUROPA', currency: 'EUR', exchange: 'XETRA' },
  'TTE': { yahooSymbol: 'TTE.PA', company: 'TotalEnergies', country: 'Francia', region: 'EUROPA', currency: 'EUR', exchange: 'Euronext Paris' },
  'OR': { yahooSymbol: 'OR.PA', company: "L'Oréal", country: 'Francia', region: 'EUROPA', currency: 'EUR', exchange: 'Euronext Paris' },
  'SIE': { yahooSymbol: 'SIE.DE', company: 'Siemens', country: 'Alemania', region: 'EUROPA', currency: 'EUR', exchange: 'XETRA' },
  'ALV': { yahooSymbol: 'ALV.DE', company: 'Allianz', country: 'Alemania', region: 'EUROPA', currency: 'EUR', exchange: 'XETRA' },
  // EEUU
  'AAPL': { yahooSymbol: 'AAPL', company: 'Apple Inc.', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NASDAQ' },
  'MSFT': { yahooSymbol: 'MSFT', company: 'Microsoft', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NASDAQ' },
  'NVDA': { yahooSymbol: 'NVDA', company: 'NVIDIA', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NASDAQ' },
  'ORCL': { yahooSymbol: 'ORCL', company: 'Oracle', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NYSE' },
  'AMZN': { yahooSymbol: 'AMZN', company: 'Amazon', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NASDAQ' },
  'GOOGL': { yahooSymbol: 'GOOGL', company: 'Alphabet (Google)', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NASDAQ' },
  'META': { yahooSymbol: 'META', company: 'Meta Platforms', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NASDAQ' },
  'TSLA': { yahooSymbol: 'TSLA', company: 'Tesla', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NASDAQ' },
  'BE': { yahooSymbol: 'BE', company: 'Bloom Energy Corp.', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NYSE' },
  'CEG': { yahooSymbol: 'CEG', company: 'Constellation Energy Corp.', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NASDAQ' },
  'AMD': { yahooSymbol: 'AMD', company: 'Advanced Micro Devices Inc.', country: 'USA', region: 'EEUU', currency: 'USD', exchange: 'NASDAQ' },
};

// Tipos de cambio por defecto sincronizados con el cierre y cotización oficial de Yahoo Finance (EURUSD=X y EURGBP=X)
let currentEurUsdRate = 1.1204;
let currentGbpEurRate = 0.8376;

export interface FxRates {
  usdEur: number;
  gbpEur: number;
  updatedAt?: string;
}

export function getStoredFxRates(): FxRates {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cartera_fx_rates') : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.usdEur > 0) {
        // Si tenía guardado el tipo desfasado del BCE (1.1193), migrar a la cotización oficial de Yahoo Finance (1.1204)
        if (Math.abs(parsed.usdEur - 1.1193) < 0.0005) {
          parsed.usdEur = 1.1204;
          localStorage.setItem('cartera_fx_rates', JSON.stringify(parsed));
        }
        currentEurUsdRate = Number(parsed.usdEur);
        if (parsed.gbpEur > 0) currentGbpEurRate = Number(parsed.gbpEur);
        return {
          usdEur: currentEurUsdRate,
          gbpEur: currentGbpEurRate,
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch {}
  return { usdEur: currentEurUsdRate, gbpEur: currentGbpEurRate };
}

export function saveStoredFxRates(rates: FxRates) {
  try {
    if (rates.usdEur > 0) currentEurUsdRate = Number(rates.usdEur);
    if (rates.gbpEur > 0) currentGbpEurRate = Number(rates.gbpEur);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cartera_fx_rates', JSON.stringify(rates));
    }
  } catch {}
}

export async function fetchLiveFxRates(): Promise<FxRates> {
  // 1. Consultar primero el endpoint de cotización en tiempo real de Yahoo Finance (/api/quotes/fx)
  try {
    const res = await fetch('/api/quotes/fx', { credentials: 'include' });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.usdEurRate > 0) {
          const rates: FxRates = {
            usdEur: Number(data.usdEurRate.toFixed(4)),
            gbpEur: data.gbpEurRate ? Number(data.gbpEurRate.toFixed(4)) : currentGbpEurRate,
            updatedAt: data.updatedAt || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
          saveStoredFxRates(rates);
          return rates;
        }
      }
    }
  } catch (err) {
    console.warn('[QuotesService] /api/quotes/fx failed, trying indices:', err);
  }

  // 2. Intentar endpoint /api/quotes/indices (que también extrae EURUSD=X y EURGBP=X de Yahoo Finance)
  try {
    const res = await fetch('/api/quotes/indices', { credentials: 'include' });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.indices && Array.isArray(data.indices)) {
          const fxUsd = data.indices.find((i: any) => i.symbol === 'EURUSD=X');
          const fxGbp = data.indices.find((i: any) => i.symbol === 'EURGBP=X');
          const usdEur = fxUsd && fxUsd.price > 0 ? Number(fxUsd.price.toFixed(4)) : currentEurUsdRate;
          const gbpEur = fxGbp && fxGbp.price > 0 ? Number(fxGbp.price.toFixed(4)) : currentGbpEurRate;
          const rates: FxRates = {
            usdEur,
            gbpEur,
            updatedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
          saveStoredFxRates(rates);
          return rates;
        }
      }
    }
  } catch (err) {
    console.warn('[QuotesService] fetchLiveFxRates indices fallback failed:', err);
  }

  // 3. Fallback adicional directo si no hay backend activo (Frankfurter)
  try {
    const frankRes = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (frankRes.ok) {
      const fData = await frankRes.json();
      if (fData?.rates?.USD > 0) {
        const rates: FxRates = {
          usdEur: Number(fData.rates.USD.toFixed(4)),
          gbpEur: fData?.rates?.GBP > 0 ? Number(fData.rates.GBP.toFixed(4)) : currentGbpEurRate,
          updatedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        saveStoredFxRates(rates);
        return rates;
      }
    }
  } catch {}

  return getStoredFxRates();
}

export function resolveYahooSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (SYMBOL_MAP[clean]) {
    return SYMBOL_MAP[clean].yahooSymbol;
  }
  return clean;
}

export async function fetchLiveIndices(): Promise<MarketIndex[]> {
  try {
    const res = await fetch('/api/quotes/indices', { credentials: 'include' });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.indices && Array.isArray(data.indices)) {
          const fxUsd = data.indices.find((i: any) => i.symbol === 'EURUSD=X');
          const fxGbp = data.indices.find((i: any) => i.symbol === 'EURGBP=X');
          if (fxUsd && fxUsd.price > 0) {
            currentEurUsdRate = fxUsd.price;
          }
          if (fxGbp && fxGbp.price > 0) {
            currentGbpEurRate = fxGbp.price;
          }
          saveStoredFxRates({
            usdEur: currentEurUsdRate,
            gbpEur: currentGbpEurRate,
            updatedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          });
          return data.indices;
        }
      }
    }
  } catch (err) {
    console.warn('[QuotesService] Could not fetch live indices, using fallback:', err);
  }

  getStoredFxRates();

  // Fallback con datos realistas
  return [
    { symbol: '^GSPC', name: 'S&P 500', price: 7623.68, change: -39.75, changePercent: -0.52 },
    { symbol: '^NDX', name: 'Nasdaq 100', price: 28957.53, change: -1.16, changePercent: 0.00 },
    { symbol: '^IBEX', name: 'IBEX 35', price: 18989.80, change: 76.30, changePercent: 0.40 },
    { symbol: '^STOXX50E', name: 'EuroStoxx 50', price: 6068.22, change: -18.79, changePercent: -0.31 },
    { symbol: 'EURUSD=X', name: 'EUR / USD', price: currentEurUsdRate, change: 0.002, changePercent: 0.18 },
    { symbol: 'EURGBP=X', name: 'EUR / GBP', price: currentGbpEurRate, change: -0.001, changePercent: -0.12 },
  ];
}

export async function fetchQuoteOnline(symbol: string): Promise<MarketQuote | null> {
  const yahooSym = resolveYahooSymbol(symbol);
  getStoredFxRates();

  // 1. Intentar endpoint local
  try {
    const res = await fetch(`/api/quotes/quote?symbol=${encodeURIComponent(yahooSym)}`, { credentials: 'include' });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.price) {
          const isUSD = data.currency === 'USD';
          const isGBP = data.currency === 'GBP';
          const isDKK = data.currency === 'DKK';
          const fxRate = isUSD ? currentEurUsdRate : isGBP ? currentGbpEurRate : isDKK ? 7.4604 : 1.0;
          const priceEUR = isUSD || isGBP || isDKK ? data.price / fxRate : data.price;

          const known = SYMBOL_MAP[symbol.toUpperCase()];
          const country = known ? known.country : (isUSD ? 'USA' : (yahooSym.includes('.MC') ? 'España' : 'Europa'));
          const region: 'ESPAÑA' | 'EUROPA' | 'EEUU' = known ? known.region : (country === 'España' ? 'ESPAÑA' : (country === 'USA' ? 'EEUU' : 'EUROPA'));

          return {
            symbol: yahooSym,
            displaySymbol: symbol.toUpperCase(),
            company: data.company || known?.company || symbol.toUpperCase(),
            country,
            region,
            exchange: data.exchangeName || known?.exchange || (isUSD ? 'NYSE/NASDAQ' : 'Europa'),
            currency: (data.currency as Currency) || 'EUR',
            price: data.price,
            priceEUR: Number(priceEUR.toFixed(2)),
            change: data.change || 0,
            changePercent: data.changePercent || 0,
            dayHigh: data.dayHigh,
            dayLow: data.dayLow,
            high52: data.high52,
            low52: data.low52,
            volume: data.volume,
            lastUpdated: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          };
        }
      }
    }
  } catch (err) {
    console.warn(`[QuotesService] Local fetch for ${symbol} failed:`, err);
  }

  // 2. Fallback directo en vivo vía proxy CORS para entornos cliente / PWA
  try {
    const directUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=1d`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
    const pRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
    if (pRes.ok) {
      const chartData = await pRes.json();
      const meta = chartData.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice > 0) {
        const curPrice = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose ?? curPrice;
        const change = curPrice - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        const isUSD = meta.currency === 'USD';
        const isGBP = meta.currency === 'GBP';
        const fxRate = isUSD ? currentEurUsdRate : isGBP ? currentGbpEurRate : 1.0;
        const priceEUR = isUSD || isGBP ? curPrice / fxRate : curPrice;
        const known = SYMBOL_MAP[symbol.toUpperCase()];
        const country = known ? known.country : (isUSD ? 'USA' : (yahooSym.includes('.MC') ? 'España' : 'Europa'));
        const region: 'ESPAÑA' | 'EUROPA' | 'EEUU' = known ? known.region : (country === 'España' ? 'ESPAÑA' : (country === 'USA' ? 'EEUU' : 'EUROPA'));

        return {
          symbol: yahooSym,
          displaySymbol: symbol.toUpperCase(),
          company: meta.shortName || known?.company || symbol.toUpperCase(),
          country,
          region,
          exchange: meta.exchangeName || known?.exchange || (isUSD ? 'NYSE/NASDAQ' : 'Europa'),
          currency: (meta.currency as Currency) || 'EUR',
          price: curPrice,
          priceEUR: Number(priceEUR.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          dayHigh: meta.regularMarketDayHigh,
          dayLow: meta.regularMarketDayLow,
          high52: meta.fiftyTwoWeekHigh,
          low52: meta.fiftyTwoWeekLow,
          volume: meta.regularMarketVolume,
          lastUpdated: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        };
      }
    }
  } catch (proxyErr) {
    console.warn(`[QuotesService] Direct proxy for ${symbol} failed:`, proxyErr);
  }

  // 3. Fallback de catálogo
  const popular = POPULAR_MARKET_STOCKS.find(
    s => s.symbol.toUpperCase() === yahooSym.toUpperCase() || s.displaySymbol?.toUpperCase() === symbol.toUpperCase()
  );
  return popular || null;
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, { price: number; priceEUR: number; currency?: string; changePercent: number }>> {
  if (symbols.length === 0) return {};
  getStoredFxRates();

  const symbolMapToOriginal: Record<string, string> = {};
  const yahooSymbols = symbols.map(s => {
    const ySym = resolveYahooSymbol(s);
    symbolMapToOriginal[ySym.toUpperCase()] = s.toUpperCase();
    return ySym;
  });

  const resultMap: Record<string, { price: number; priceEUR: number; currency?: string; changePercent: number }> = {};

  // 1. Intentar endpoint local del servidor /api/quotes/batch
  try {
    const res = await fetch(`/api/quotes/batch?symbols=${encodeURIComponent(yahooSymbols.join(','))}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
          for (const q of data.quotes) {
            const origSym = symbolMapToOriginal[q.symbol.toUpperCase()] || q.symbol.toUpperCase();
            const isUSD = q.currency === 'USD';
            const isGBP = q.currency === 'GBP';
            const isDKK = q.currency === 'DKK';
            const fxRate = isUSD ? currentEurUsdRate : isGBP ? currentGbpEurRate : isDKK ? 7.4604 : 1.0;
            const priceEUR = isUSD || isGBP || isDKK ? q.price / fxRate : q.price;
            resultMap[origSym] = {
              price: q.price,
              priceEUR: Number(priceEUR.toFixed(2)),
              currency: q.currency,
              changePercent: q.changePercent || 0,
            };
            resultMap[q.symbol.toUpperCase()] = resultMap[origSym];
          }
        }
      }
    }
  } catch (err) {
    console.warn('[QuotesService] Batch fetch local failed, attempting direct proxy:', err);
  }

  // 2. Si algún símbolo falta o falló la conexión local (ej. en standalone PWA), consultar directo vía proxy CORS en vivo
  const missingSymbols = symbols.filter(s => !resultMap[s.toUpperCase()]);
  if (missingSymbols.length > 0) {
    await Promise.allSettled(
      missingSymbols.map(async s => {
        const ySym = resolveYahooSymbol(s);
        try {
          const directUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`;
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
          const pRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
          if (pRes.ok) {
            const chartData = await pRes.json();
            const meta = chartData.chart?.result?.[0]?.meta;
            if (meta && meta.regularMarketPrice > 0) {
              const curPrice = meta.regularMarketPrice;
              const prevClose = meta.chartPreviousClose ?? curPrice;
              const change = curPrice - prevClose;
              const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
              const isUSD = meta.currency === 'USD';
              const isGBP = meta.currency === 'GBP';
              const isDKK = meta.currency === 'DKK';
              const fxRate = isUSD ? currentEurUsdRate : isGBP ? currentGbpEurRate : isDKK ? 7.4604 : 1.0;
              const priceEUR = isUSD || isGBP || isDKK ? curPrice / fxRate : curPrice;

              resultMap[s.toUpperCase()] = {
                price: curPrice,
                priceEUR: Number(priceEUR.toFixed(2)),
                currency: meta.currency || 'USD',
                changePercent: Number(changePercent.toFixed(2)),
              };
              resultMap[ySym.toUpperCase()] = resultMap[s.toUpperCase()];
            }
          }
        } catch (proxyErr) {
          console.warn(`[QuotesService] Direct proxy fallback for ${s} failed:`, proxyErr);
        }
      })
    );
  }

  // 3. Fallback de catálogo para cualquier ticker que no se haya podido resolver
  for (const s of symbols) {
    const clean = s.toUpperCase();
    if (!resultMap[clean]) {
      const pop = POPULAR_MARKET_STOCKS.find(
        p => p.symbol.toUpperCase() === clean || p.displaySymbol?.toUpperCase() === clean
      );
      if (pop) {
        const isUSD = pop.currency === 'USD';
        const priceEUR = isUSD ? Number((pop.price / currentEurUsdRate).toFixed(2)) : pop.priceEUR;
        resultMap[clean] = {
          price: pop.price,
          priceEUR,
          currency: pop.currency,
          changePercent: pop.changePercent,
        };
      }
    }
  }

  return resultMap;
}

export async function searchMarketQuotes(query: string): Promise<MarketQuote[]> {
  const q = query.trim().toUpperCase();
  if (!q) return POPULAR_MARKET_STOCKS;

  // 1. Filtrar primero en la base curada para respuesta inmediata (0ms)
  const localMatches = POPULAR_MARKET_STOCKS.filter(
    s =>
      s.symbol.toUpperCase().includes(q) ||
      (s.displaySymbol && s.displaySymbol.toUpperCase().includes(q)) ||
      s.company.toUpperCase().includes(q) ||
      s.country.toUpperCase().includes(q) ||
      (s.sector && s.sector.toUpperCase().includes(q))
  );

  // 2. Si la consulta tiene al menos 2 letras, buscar también en Internet
  if (q.length >= 2) {
    try {
      // Buscar en el endpoint de búsqueda y paralelamente como ticker directo si es una palabra corta
      const isPossibleTicker = !q.includes(' ') && q.length <= 7;
      const [searchRes, directQuote] = await Promise.all([
        fetch(`/api/quotes/search?q=${encodeURIComponent(query)}`),
        isPossibleTicker ? fetchQuoteOnline(q) : Promise.resolve(null),
      ]);

      const seen = new Set(localMatches.map(m => m.symbol.toUpperCase()));
      const combined = [...localMatches];

      // Añadir la cotización directa si se encontró y no estaba
      if (directQuote && !seen.has(directQuote.symbol.toUpperCase())) {
        seen.add(directQuote.symbol.toUpperCase());
        combined.unshift(directQuote); // Poner al inicio de los resultados
      }

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
          const apiQuotes: MarketQuote[] = data.quotes.map((item: any) => {
            const sym = item.symbol;
            const isUS = item.currency === 'USD' || !sym.includes('.');
            const isES = sym.endsWith('.MC');
            const country = isES ? 'España' : (isUS ? 'USA' : 'Europa');
            const region: 'ESPAÑA' | 'EUROPA' | 'EEUU' = isES ? 'ESPAÑA' : (isUS ? 'EEUU' : 'EUROPA');
            const currency: Currency = (item.currency as Currency) || (isUS ? 'USD' : 'EUR');
            const price = item.price || 0;
            const priceEUR = isUS ? price / currentEurUsdRate : price;

            return {
              symbol: sym,
              displaySymbol: sym.replace(/\.[A-Z]+$/, ''),
              company: item.company || sym,
              country,
              region,
              exchange: item.exchange || (isUS ? 'NYSE/NASDAQ' : 'Bolsa'),
              currency,
              price: Number(price.toFixed(2)),
              priceEUR: Number(priceEUR.toFixed(2)),
              change: item.change || 0,
              changePercent: item.changePercent || 0,
              dayHigh: item.dayHigh,
              dayLow: item.dayLow,
              high52: item.high52,
              low52: item.low52,
              volume: item.volume,
              sector: 'Mercado',
              lastUpdated: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            };
          });

          for (const aq of apiQuotes) {
            if (!seen.has(aq.symbol.toUpperCase())) {
              seen.add(aq.symbol.toUpperCase());
              combined.push(aq);
            }
          }
        }
      }
      return combined;
    } catch (err) {
      console.warn('[QuotesService] Internet search failed, using local database:', err);
    }
  }

  return localMatches;
}

/**
 * Consulta y sincroniza automáticamente los dividendos anunciados y públicos
 * para todas las acciones de la Cartera actual.
 * Dispone de triple tolerancia a fallos:
 * 1. Servidor local (/api/quotes/dividends)
 * 2. Consulta directa a Yahoo Finance Chart API (con soporte de CORS proxy)
 * 3. Catálogo corporativo público para acciones internacionales y nacionales
 */
export async function fetchPortfolioDividendsOnline(positions: StockPosition[]): Promise<UpcomingDividend[]> {
  if (!positions || positions.length === 0) return [];

  const symbols = positions.map(p => p.symbol.trim()).filter(Boolean);
  const posMap = new Map(positions.map(p => [p.symbol.toUpperCase(), p]));

  // 1. Intentar endpoint local (/api/quotes/dividends)
  try {
    const res = await fetch(`/api/quotes/dividends?symbols=${encodeURIComponent(symbols.join(','))}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.dividends) && data.dividends.length > 0) {
        return data.dividends.map((item: any) => {
          const pos = posMap.get(item.symbol.toUpperCase());
          const shares = pos ? pos.shares : 1;
          const estTotal = item.estimatedTotalEUR ?? Number((shares * item.dividendPerShareEUR).toFixed(2));
          return {
            id: item.id || `div-auto-${item.symbol}-${item.date.replace(/\//g, '')}`,
            date: item.date,
            company: pos?.company || item.company,
            symbol: item.symbol,
            dividendPerShareEUR: item.dividendPerShareEUR,
            estimatedTotalEUR: estTotal,
          };
        });
      }
    }
  } catch (err) {
    console.warn('[QuotesService] Local /api/quotes/dividends unavailable, using direct web sources:', err);
  }

  // 2. Intentar consulta directa a Yahoo Finance para cada posición
  const directDividends: UpcomingDividend[] = [];
  const fxUsdToEur = 1 / currentEurUsdRate;

  for (const pos of positions) {
    const rawSym = pos.symbol.toUpperCase();
    const yahooSym = resolveYahooSymbol(rawSym);
    const yUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1mo&range=2y&events=div`;

    let chartData: any = null;
    try {
      const res = await fetch(yUrl);
      if (res.ok) {
        chartData = await res.json();
      }
    } catch {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yUrl)}`;
        const pRes = await fetch(proxyUrl);
        if (pRes.ok) {
          chartData = await pRes.json();
        }
      } catch {
        // Silencioso
      }
    }

    const meta = chartData?.chart?.result?.[0]?.meta;
    const divsObj = chartData?.chart?.result?.[0]?.events?.dividends;

    if (meta && divsObj && typeof divsObj === 'object') {
      const currency = (meta.currency || pos.currency || 'USD').toUpperCase();
      for (const [exTs, divInfo] of Object.entries(divsObj as Record<string, any>)) {
        const rawAmount = typeof divInfo.amount === 'number' ? divInfo.amount : parseFloat(divInfo.amount);
        if (isNaN(rawAmount) || rawAmount <= 0) continue;

        const payTs = divInfo.date ? Number(divInfo.date) * 1000 : Number(exTs) * 1000;
        const dObj = new Date(payTs);
        const day = String(dObj.getDate()).padStart(2, '0');
        const month = String(dObj.getMonth() + 1).padStart(2, '0');
        const year = dObj.getFullYear();
        const dateStr = `${day}/${month}/${year}`;

        let amountEUR = rawAmount;
        if (currency === 'USD') amountEUR = rawAmount * fxUsdToEur;
        else if (currency === 'DKK') amountEUR = rawAmount / 7.46;
        else if (currency === 'GBP') amountEUR = rawAmount / currentGbpEurRate;

        const totalEst = Number((pos.shares * amountEUR).toFixed(2));
        directDividends.push({
          id: `div-auto-${rawSym}-${year}${month}${day}`,
          date: dateStr,
          company: pos.company || meta.shortName || rawSym,
          symbol: rawSym,
          dividendPerShareEUR: Number(amountEUR.toFixed(4)),
          estimatedTotalEUR: totalEst,
        });
      }
    }
  }

  if (directDividends.length > 0) {
    return directDividends;
  }

  // 3. Catálogo público de respaldo para empresas conocidas de la cartera
  const fallbackCatalog: Record<string, { dpsUSD: number; dpsEUR: number; months: number[]; day: number }> = {
    'MSFT': { dpsUSD: 0.83, dpsEUR: 0.74, months: [2, 5, 8, 11], day: 12 },
    'META': { dpsUSD: 0.525, dpsEUR: 0.47, months: [2, 5, 8, 11], day: 26 },
    'AAPL': { dpsUSD: 0.25, dpsEUR: 0.22, months: [1, 4, 7, 10], day: 15 },
    'CEG':  { dpsUSD: 0.35, dpsEUR: 0.31, months: [2, 5, 8, 11], day: 10 },
    'BE':   { dpsUSD: 0.0, dpsEUR: 0.0, months: [], day: 1 },
    'AMD':  { dpsUSD: 0.0, dpsEUR: 0.0, months: [], day: 1 },
    'SAN':  { dpsUSD: 0.10, dpsEUR: 0.10, months: [4, 10], day: 2 },
    'ITX':  { dpsUSD: 0.77, dpsEUR: 0.77, months: [4, 10], day: 4 },
    'IBE':  { dpsUSD: 0.38, dpsEUR: 0.38, months: [0, 6], day: 28 },
    'BBVA': { dpsUSD: 0.39, dpsEUR: 0.39, months: [3, 9], day: 10 },
    'CABK': { dpsUSD: 0.23, dpsEUR: 0.23, months: [3, 10], day: 8 },
    'NOVO': { dpsUSD: 0.65, dpsEUR: 0.65, months: [2, 7], day: 25 },
    'SIE':  { dpsUSD: 4.70, dpsEUR: 4.70, months: [1], day: 14 },
  };

  const catalogDividends: UpcomingDividend[] = [];
  const curYr = 2026;

  for (const pos of positions) {
    const sym = pos.symbol.toUpperCase();
    const info = fallbackCatalog[sym];
    if (info && info.dpsEUR > 0) {
      for (const m of info.months) {
        const dStr = `${String(info.day).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${curYr}`;
        const total = Number((pos.shares * info.dpsEUR).toFixed(2));
        catalogDividends.push({
          id: `div-catalog-${sym}-${curYr}-${m + 1}`,
          date: dStr,
          company: pos.company,
          symbol: sym,
          dividendPerShareEUR: info.dpsEUR,
          estimatedTotalEUR: total,
        });
      }
    }
  }

  return catalogDividends;
}
