import type { Plugin } from 'vite';

interface CachedQuote {
  data: any;
  timestamp: number;
}

const quoteCache = new Map<string, CachedQuote>();
const CACHE_TTL_MS = 20 * 1000; // 20 segundos de caché en memoria

async function fetchFromYahoo(url: string, retries = 2): Promise<any> {
  const targetUrl = url.replace('query1.finance.yahoo.com', 'query2.finance.yahoo.com');
  const cached = quoteCache.get(targetUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Yahoo returned status 404`);
        }
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 120 * (attempt + 1)));
          continue;
        }
        throw new Error(`Yahoo returned status ${res.status}`);
      }

      const text = await res.text();
      if (!text || !text.trim().startsWith('{')) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 150 * (attempt + 1)));
          continue;
        }
        throw new Error(`Invalid Yahoo response: ${text.slice(0, 100)}`);
      }

      const data = JSON.parse(text);
      quoteCache.set(targetUrl, { data, timestamp: Date.now() });
      return data;
    } catch (err: any) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 120 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

const YAHOO_SYMBOL_OVERRIDES: Record<string, string> = {
  'NOVO': 'NOVO-B.CO',
  'NOVO-B': 'NOVO-B.CO',
  'NOVO-B.CO': 'NOVO-B.CO',
  'SAN': 'SAN.MC',
  'ITX': 'ITX.MC',
  'IBE': 'IBE.MC',
  'BBVA': 'BBVA.MC',
  'CABK': 'CABK.MC',
  'REP': 'REP.MC',
  'TEF': 'TEF.MC',
  'ELE': 'ELE.MC',
  'NTGY': 'NTGY.MC',
  'ACS': 'ACS.MC',
  'FER': 'FER.MC',
  'AMS': 'AMS.MC',
  'IAG': 'IAG.MC',
  'GRF': 'GRF.MC',
  'MAP': 'MAP.MC',
  'SAB': 'SAB.MC',
  'RED': 'RED.MC',
  'COL': 'COL.MC',
  'MRL': 'MRL.MC',
  'ASML': 'ASML.AS',
  'MC': 'MC.PA',
  'SAP': 'SAP.DE',
  'TTE': 'TTE.PA',
  'OR': 'OR.PA',
  'SIE': 'SIE.DE',
  'ALV': 'ALV.DE',
  'RMS': 'RMS.PA',
  'SU': 'SU.PA',
};

export function quotesApiPlugin(): Plugin {
  return {
    name: 'quotes-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/quotes')) {
          return next();
        }

        const urlObj = new URL(req.url, 'http://localhost:3000');
        const pathname = urlObj.pathname;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        try {
          // 1. Buscar cotizaciones por texto o ticker
          if (pathname === '/api/quotes/search') {
            const query = urlObj.searchParams.get('q') || '';
            if (!query.trim()) {
              res.end(JSON.stringify({ quotes: [] }));
              return;
            }

            const yUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&listsCount=0`;
            const yData = await fetchFromYahoo(yUrl);
            const rawQuotes = yData.quotes || [];

            // Filtrar resultados relevantes (acciones y ETFs)
            const filteredRaw = rawQuotes
              .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
              .slice(0, 8);

            // Obtener cotizaciones detalladas en paralelo
            const detailedQuotes = await Promise.all(
              filteredRaw.map(async (q: any) => {
                try {
                  const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(q.symbol)}?interval=1d&range=1d`;
                  const chartData = await fetchFromYahoo(chartUrl);
                  const meta = chartData.chart?.result?.[0]?.meta;
                  if (!meta) return null;

                  const curPrice = meta.regularMarketPrice ?? 0;
                  const prevClose = meta.chartPreviousClose ?? curPrice;
                  const change = curPrice - prevClose;
                  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

                  return {
                    symbol: meta.symbol,
                    company: meta.shortName || q.shortname || q.longname || meta.symbol,
                    exchange: meta.exchangeName || q.exchange,
                    currency: meta.currency || 'USD',
                    price: curPrice,
                    change: Number(change.toFixed(2)),
                    changePercent: Number(changePercent.toFixed(2)),
                    dayHigh: meta.regularMarketDayHigh,
                    dayLow: meta.regularMarketDayLow,
                    high52: meta.fiftyTwoWeekHigh,
                    low52: meta.fiftyTwoWeekLow,
                    volume: meta.regularMarketVolume,
                  };
                } catch {
                  return {
                    symbol: q.symbol,
                    company: q.shortname || q.longname || q.symbol,
                    exchange: q.exchange,
                    currency: 'USD',
                    price: 0,
                    change: 0,
                    changePercent: 0,
                  };
                }
              })
            );

            const quotes = detailedQuotes.filter(Boolean);
            res.end(JSON.stringify({ quotes }));
            return;
          }

          // 2. Cotización detallada de un solo símbolo
          if (pathname === '/api/quotes/quote') {
            const rawSymbol = (urlObj.searchParams.get('symbol') || '').trim();
            if (!rawSymbol) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing symbol parameter' }));
              return;
            }

            const querySymbol = YAHOO_SYMBOL_OVERRIDES[rawSymbol.toUpperCase()] || rawSymbol;

            let yData: any = null;
            try {
              const yUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=1d&range=1d`;
              yData = await fetchFromYahoo(yUrl);
            } catch (err: any) {
              console.info(`[Quotes Plugin] Single quote lookup for ${rawSymbol} (${querySymbol}): ${err?.message || 'not found'}`);
            }

            const meta = yData?.chart?.result?.[0]?.meta;

            if (!meta) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Quote not found' }));
              return;
            }

            const curPrice = meta.regularMarketPrice ?? 0;
            const prevClose = meta.chartPreviousClose ?? curPrice;
            const change = curPrice - prevClose;
            const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

            res.end(JSON.stringify({
              symbol: rawSymbol.toUpperCase(),
              yahooSymbol: meta.symbol,
              company: meta.shortName || meta.symbol,
              currency: meta.currency || 'USD',
              price: curPrice,
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(2)),
              dayHigh: meta.regularMarketDayHigh,
              dayLow: meta.regularMarketDayLow,
              high52: meta.fiftyTwoWeekHigh,
              low52: meta.fiftyTwoWeekLow,
              volume: meta.regularMarketVolume,
              exchangeName: meta.exchangeName,
            }));
            return;
          }

          // 3. Batch de múltiples cotizaciones (para actualizar toda la cartera/watchlist)
          if (pathname === '/api/quotes/batch') {
            const symbolsParam = urlObj.searchParams.get('symbols') || '';
            const symbols = symbolsParam
              .split(',')
              .map(s => s.trim().toUpperCase())
              .filter(Boolean);

            if (symbols.length === 0) {
              res.end(JSON.stringify({ quotes: [] }));
              return;
            }

            const quotes: any[] = [];
            for (let i = 0; i < symbols.length; i++) {
              const s = symbols[i];
              const querySymbol = YAHOO_SYMBOL_OVERRIDES[s] || s;
              try {
                const yUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=1d&range=1d`;
                const yData = await fetchFromYahoo(yUrl);
                const meta = yData?.chart?.result?.[0]?.meta;
                if (meta && meta.regularMarketPrice > 0) {
                  const curPrice = meta.regularMarketPrice;
                  const prevClose = meta.chartPreviousClose ?? curPrice;
                  const change = curPrice - prevClose;
                  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

                  quotes.push({
                    symbol: s,
                    querySymbol,
                    company: meta.shortName || s,
                    currency: meta.currency || 'USD',
                    price: curPrice,
                    change: Number(change.toFixed(2)),
                    changePercent: Number(changePercent.toFixed(2)),
                    dayHigh: meta.regularMarketDayHigh,
                    dayLow: meta.regularMarketDayLow,
                    high52: meta.fiftyTwoWeekHigh,
                    low52: meta.fiftyTwoWeekLow,
                    volume: meta.regularMarketVolume,
                  });
                }
              } catch (err: any) {
                console.info(`[Quotes Plugin] Symbol ${s} not resolved: ${err?.message || 'unknown'}`);
              }
              if (i < symbols.length - 1) {
                await new Promise(r => setTimeout(r, 60));
              }
            }

            res.end(JSON.stringify({ quotes }));
            return;
          }

          // 4. Índices principales y tipo de cambio EUR/USD y EUR/GBP
          if (pathname === '/api/quotes/indices') {
            const indexSymbols = ['^GSPC', '^NDX', '^IBEX', '^STOXX50E', 'EURUSD=X', 'EURGBP=X'];
            const names: Record<string, string> = {
              '^GSPC': 'S&P 500',
              '^NDX': 'Nasdaq 100',
              '^IBEX': 'IBEX 35',
              '^STOXX50E': 'EuroStoxx 50',
              'EURUSD=X': 'EUR / USD',
              'EURGBP=X': 'EUR / GBP',
            };

            const indices: any[] = [];
            for (let i = 0; i < indexSymbols.length; i++) {
              const s = indexSymbols[i];
              try {
                const yUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=1d`;
                const yData = await fetchFromYahoo(yUrl);
                const meta = yData?.chart?.result?.[0]?.meta;
                if (meta) {
                  const curPrice = meta.regularMarketPrice ?? 0;
                  const prevClose = meta.chartPreviousClose ?? curPrice;
                  const change = curPrice - prevClose;
                  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

                  indices.push({
                    symbol: s,
                    name: names[s] || s,
                    price: curPrice,
                    change: Number(change.toFixed(2)),
                    changePercent: Number(changePercent.toFixed(2)),
                  });
                }
              } catch (err) {
                console.warn(`[Quotes Plugin] Failed index ${s}:`, err);
              }
              if (i < indexSymbols.length - 1) {
                await new Promise(r => setTimeout(r, 60));
              }
            }

            res.end(JSON.stringify({ indices }));
            return;
          }

          // 5. Tipos de cambio en tiempo real EUR/USD y EUR/GBP (Fuente principal: Yahoo Finance EURUSD=X)
          if (pathname === '/api/quotes/fx') {
            let usdEurRate = 1.1204;
            let gbpEurRate = 0.8376;
            let success = false;

            // 1. Consultar Yahoo Finance para EURUSD=X y EURGBP=X como fuente primaria de mercado
            try {
              const yUrl = 'https://query2.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d';
              const yData = await fetchFromYahoo(yUrl);
              const meta = yData?.chart?.result?.[0]?.meta;
              if (meta && meta.regularMarketPrice > 0) {
                usdEurRate = Number(meta.regularMarketPrice.toFixed(4));
                success = true;
              }
            } catch (err) {
              console.warn('[Quotes Plugin] Yahoo FX EURUSD=X failed:', err);
            }

            try {
              const yGbpUrl = 'https://query2.finance.yahoo.com/v8/finance/chart/EURGBP=X?interval=1d&range=1d';
              const yGbpData = await fetchFromYahoo(yGbpUrl);
              const gbpMeta = yGbpData?.chart?.result?.[0]?.meta;
              if (gbpMeta && gbpMeta.regularMarketPrice > 0) {
                gbpEurRate = Number(gbpMeta.regularMarketPrice.toFixed(4));
              }
            } catch (err) {
              console.warn('[Quotes Plugin] Yahoo FX EURGBP=X failed:', err);
            }

            // 2. Si Yahoo Finance fallase, usar API de respaldo del BCE (Frankfurter)
            if (!success) {
              try {
                const frankRes = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP', {
                  headers: { 'Accept': 'application/json' },
                  signal: AbortSignal.timeout(4000),
                });
                if (frankRes.ok) {
                  const fData = await frankRes.json();
                  if (fData?.rates?.USD > 0) {
                    usdEurRate = Number(fData.rates.USD.toFixed(4));
                    if (fData?.rates?.GBP > 0) gbpEurRate = Number(fData.rates.GBP.toFixed(4));
                    success = true;
                  }
                }
              } catch (fErr) {
                // Mantener cotización previa
              }
            }

            res.end(JSON.stringify({
              usdEurRate,
              gbpEurRate,
              updatedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              source: success ? 'Yahoo Finance (EURUSD=X)' : 'Fallback',
            }));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Endpoint not found' }));
        } catch (err: any) {
          console.error('[Quotes Plugin Error]', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        }
      });
    },
  };
}
