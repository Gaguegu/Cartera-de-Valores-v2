import { MarketQuote, Currency } from '../types/portfolio';
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
};

// Tipo de cambio EUR/USD estimado por defecto
let currentEurUsdRate = 1.12;

export function resolveYahooSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (SYMBOL_MAP[clean]) {
    return SYMBOL_MAP[clean].yahooSymbol;
  }
  return clean;
}

export async function fetchLiveIndices(): Promise<MarketIndex[]> {
  try {
    const res = await fetch('/api/quotes/indices');
    if (!res.ok) throw new Error('Indices request failed');
    const data = await res.json();
    if (data.indices && Array.isArray(data.indices)) {
      const fx = data.indices.find((i: any) => i.symbol === 'EURUSD=X');
      if (fx && fx.price > 0) {
        currentEurUsdRate = fx.price;
      }
      return data.indices;
    }
  } catch (err) {
    console.warn('[QuotesService] Could not fetch live indices, using fallback:', err);
  }

  // Fallback con datos realistas
  return [
    { symbol: '^GSPC', name: 'S&P 500', price: 7725.10, change: 6.20, changePercent: 0.08 },
    { symbol: '^NDX', name: 'Nasdaq 100', price: 29782.15, change: -168.40, changePercent: -0.56 },
    { symbol: '^IBEX', name: 'IBEX 35', price: 19189.70, change: -41.00, changePercent: -0.21 },
    { symbol: '^STOXX50E', name: 'EuroStoxx 50', price: 6168.94, change: -21.40, changePercent: -0.35 },
    { symbol: 'EURUSD=X', name: 'EUR / USD', price: currentEurUsdRate, change: 0.005, changePercent: 0.45 },
  ];
}

export async function fetchQuoteOnline(symbol: string): Promise<MarketQuote | null> {
  const yahooSym = resolveYahooSymbol(symbol);
  try {
    const res = await fetch(`/api/quotes/quote?symbol=${encodeURIComponent(yahooSym)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.price) {
      const isUSD = data.currency === 'USD';
      const isGBP = data.currency === 'GBP';
      const fxRate = isUSD ? currentEurUsdRate : isGBP ? 0.85 : 1.0;
      const priceEUR = isUSD ? data.price / fxRate : isGBP ? data.price / fxRate : data.price;

      // Determinar país y región
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
  } catch (err) {
    console.warn(`[QuotesService] Error fetching ${symbol}:`, err);
  }

  // Fallback si no hay conexión
  const popular = POPULAR_MARKET_STOCKS.find(
    s => s.symbol.toUpperCase() === yahooSym.toUpperCase() || s.displaySymbol?.toUpperCase() === symbol.toUpperCase()
  );
  return popular || null;
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, { price: number; priceEUR: number; currency?: string; changePercent: number }>> {
  if (symbols.length === 0) return {};
  const symbolMapToOriginal: Record<string, string> = {};
  const yahooSymbols = symbols.map(s => {
    const ySym = resolveYahooSymbol(s);
    symbolMapToOriginal[ySym.toUpperCase()] = s.toUpperCase();
    return ySym;
  });

  const resultMap: Record<string, { price: number; priceEUR: number; currency?: string; changePercent: number }> = {};

  try {
    const res = await fetch(`/api/quotes/batch?symbols=${encodeURIComponent(yahooSymbols.join(','))}`);
    if (res.ok) {
      const data = await res.json();
      if (data.quotes && Array.isArray(data.quotes)) {
        for (const q of data.quotes) {
          const origSym = symbolMapToOriginal[q.symbol.toUpperCase()] || q.symbol.toUpperCase();
          const isUSD = q.currency === 'USD';
          const priceEUR = isUSD ? q.price / currentEurUsdRate : q.price;
          resultMap[origSym] = {
            price: q.price,
            priceEUR: Number(priceEUR.toFixed(2)),
            currency: q.currency,
            changePercent: q.changePercent || 0,
          };
          // También registrar por el símbolo Yahoo
          resultMap[q.symbol.toUpperCase()] = resultMap[origSym];
        }
      }
    }
  } catch (err) {
    console.warn('[QuotesService] Batch fetch failed, using fallback:', err);
  }

  // Si algún símbolo no vino del servidor, consultar base popular
  for (const s of symbols) {
    const clean = s.toUpperCase();
    if (!resultMap[clean]) {
      const pop = POPULAR_MARKET_STOCKS.find(
        p => p.symbol.toUpperCase() === clean || p.displaySymbol?.toUpperCase() === clean
      );
      if (pop) {
        resultMap[clean] = {
          price: pop.price,
          priceEUR: pop.priceEUR,
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
