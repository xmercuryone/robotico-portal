// Ticker mapping for our companies with shares outstanding for market cap calculation
const TICKERS = {
  // US stocks (already in USD)
  'tesla': { symbol: 'TSLA', shares: 3.21e9, currency: 'USD' },
  'xpeng': { symbol: 'XPEV', shares: 1.94e9, currency: 'USD' },
  'honda': { symbol: 'HMC', shares: 5.12e9, currency: 'USD' },
  'toyota': { symbol: 'TM', shares: 1.325e9, currency: 'USD' },
  // Hong Kong stocks (HKD)
  'ubtech': { symbol: '9880.HK', shares: 504e6, currency: 'HKD' },
  'xiaomi': { symbol: '1810.HK', shares: 25.04e9, currency: 'HKD' },
  // Korean stocks (KRW)
  'hyundai': { symbol: '005380.KS', shares: 211e6, currency: 'KRW' },
  'samsung': { symbol: '005930.KS', shares: 5.97e9, currency: 'KRW' },
  'lg-electronics': { symbol: '066570.KS', shares: 163.6e6, currency: 'KRW' },
};

// Fetch exchange rate from Yahoo Finance
async function fetchExchangeRate(fromCurrency) {
  if (fromCurrency === 'USD') return 1;

  const symbol = `${fromCurrency}USD=X`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (!rate) throw new Error('No rate data');
    return rate;
  } catch (err) {
    console.error(`Error fetching ${fromCurrency} rate:`, err.message);
    // Fallback rates (approximate)
    const fallbackRates = { HKD: 0.128, KRW: 0.00069 };
    return fallbackRates[fromCurrency] || 1;
  }
}

// Fetch quote data from Yahoo Finance Chart API
async function fetchQuote(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;

  if (!meta) {
    throw new Error('No chart data');
  }

  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose || meta.previousClose;
  const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  return {
    price,
    change,
    currency: meta.currency || 'USD',
    name: meta.shortName || meta.longName || null,
  };
}

export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Fetch exchange rates first
    const [hkdRate, krwRate] = await Promise.all([
      fetchExchangeRate('HKD'),
      fetchExchangeRate('KRW'),
    ]);

    const exchangeRates = { USD: 1, HKD: hkdRate, KRW: krwRate };
    console.log('Exchange rates:', exchangeRates);

    const results = {};
    const tickerEntries = Object.entries(TICKERS);

    // Fetch all quotes in parallel
    const quotes = await Promise.allSettled(
      tickerEntries.map(async ([companyId, { symbol, shares, currency }]) => {
        try {
          const quote = await fetchQuote(symbol);
          const rate = exchangeRates[currency] || 1;

          // Calculate market cap in USD
          const marketCapLocal = quote.price * shares;
          const marketCapUSD = Math.round(marketCapLocal * rate);

          return {
            companyId,
            symbol,
            data: {
              marketCap: marketCapUSD,
              price: quote.price,
              priceUSD: quote.price * rate,
              change: quote.change,
              currency: 'USD', // All converted to USD
              originalCurrency: currency,
              name: quote.name,
            },
          };
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err.message);
          return { companyId, symbol, error: err.message };
        }
      })
    );

    // Process results
    quotes.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.data) {
        const { companyId, data } = result.value;
        results[companyId] = data;
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        exchangeRates,
        data: results,
      }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
