import type { Plugin } from 'vite';

interface CachedQuote {
  data: any;
  timestamp: number;
}

const quoteCache = new Map<string, CachedQuote>();
const CACHE_TTL_MS = 20 * 1000; // 20 segundos de caché en memoria

async function fetchFromYahoo(url: string) {
  const cached = quoteCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo returned status ${res.status}`);
  }

  const data = await res.json();
  quoteCache.set(url, { data, timestamp: Date.now() });
  return data;
}

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
                  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(q.symbol)}?interval=1d&range=1d`;
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
            const symbol = urlObj.searchParams.get('symbol');
            if (!symbol) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing symbol parameter' }));
              return;
            }

            const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
            const yData = await fetchFromYahoo(yUrl);
            const meta = yData.chart?.result?.[0]?.meta;

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
              symbol: meta.symbol,
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

            const results = await Promise.allSettled(
              symbols.map(async s => {
                const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=1d`;
                const yData = await fetchFromYahoo(yUrl);
                const meta = yData.chart?.result?.[0]?.meta;
                if (!meta) return null;

                const curPrice = meta.regularMarketPrice ?? 0;
                const prevClose = meta.chartPreviousClose ?? curPrice;
                const change = curPrice - prevClose;
                const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

                return {
                  symbol: s,
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
                };
              })
            );

            const quotes = results
              .map(r => (r.status === 'fulfilled' ? r.value : null))
              .filter(Boolean);

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

            const results = await Promise.allSettled(
              indexSymbols.map(async s => {
                const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=1d`;
                const yData = await fetchFromYahoo(yUrl);
                const meta = yData.chart?.result?.[0]?.meta;
                if (!meta) return null;

                const curPrice = meta.regularMarketPrice ?? 0;
                const prevClose = meta.chartPreviousClose ?? curPrice;
                const change = curPrice - prevClose;
                const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

                return {
                  symbol: s,
                  name: names[s] || s,
                  price: curPrice,
                  change: Number(change.toFixed(2)),
                  changePercent: Number(changePercent.toFixed(2)),
                };
              })
            );

            const indices = results
              .map(r => (r.status === 'fulfilled' ? r.value : null))
              .filter(Boolean);

            res.end(JSON.stringify({ indices }));
            return;
          }

          // 5. Tipos de cambio oficiales en tiempo real EUR/USD y EUR/GBP
          if (pathname === '/api/quotes/fx') {
            const symbols = ['EURUSD=X', 'EURGBP=X'];
            const fxResults = await Promise.allSettled(
              symbols.map(async s => {
                const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=1d`;
                const yData = await fetchFromYahoo(yUrl);
                const meta = yData.chart?.result?.[0]?.meta;
                return {
                  symbol: s,
                  price: meta?.regularMarketPrice ?? 0,
                };
              })
            );

            let usdEurRate = 1.1227;
            let gbpEurRate = 0.8376;

            for (const r of fxResults) {
              if (r.status === 'fulfilled' && r.value) {
                if (r.value.symbol === 'EURUSD=X' && r.value.price > 0) {
                  usdEurRate = Number(r.value.price.toFixed(4));
                } else if (r.value.symbol === 'EURGBP=X' && r.value.price > 0) {
                  gbpEurRate = Number(r.value.price.toFixed(4));
                }
              }
            }

            res.end(JSON.stringify({
              usdEurRate,
              gbpEurRate,
              updatedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
