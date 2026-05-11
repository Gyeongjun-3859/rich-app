// supabase/functions/get-market-data/index.ts
// Yahoo Finance 시세 조회 + 네이버 금융 폴백 + 종목 검색 프록시

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';
const NAVER_FINANCE = 'https://finance.naver.com/item/main.naver';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// 한국 특수코드인지 확인 (예: 0008S0.KS, 0142D0.KS) — .KS/.KQ가 붙어있고 영문 혼합인 경우만
function isSpecialKRCode(sym: string): boolean {
  const isKR = sym.endsWith('.KS') || sym.endsWith('.KQ');
  if (!isKR) return false; // 미국 주식(AAPL, MU 등)은 제외
  const code = sym.replace(/\.(KS|KQ)$/, '');
  return /[A-Za-z]/.test(code);
}

// Yahoo Finance로 시세 조회
async function fetchPriceYahoo(sym: string): Promise<{ price: number; prevClose: number } | null> {
  try {
    const res = await fetch(`${YAHOO_CHART}/${encodeURIComponent(sym)}`, {
      headers: { 'User-Agent': UA }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) return null;
    return {
      price: meta.regularMarketPrice,
      prevClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice
    };
  } catch {
    return null;
  }
}

// 네이버 금융으로 시세 조회 (영문 혼합 특수코드용)
async function fetchPriceNaver(code: string): Promise<{ price: number; prevClose: number } | null> {
  try {
    const res = await fetch(`${NAVER_FINANCE}?code=${encodeURIComponent(code)}`, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://finance.naver.com',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      }
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 현재가: <dd>현재가 10,110 전일대비...</dd>
    const priceMatch = html.match(/<dd>현재가\s*([\d,]+)/);
    if (!priceMatch) return null;
    const price = Number(priceMatch[1].replace(/,/g, ''));
    if (!price || isNaN(price)) return null;

    // 전일종가: <dd>전일가 10,100</dd>
    const prevMatch = html.match(/<dd>전일가\s*([\d,]+)<\/dd>/);
    const prevClose = prevMatch ? Number(prevMatch[1].replace(/,/g, '')) : price;

    return { price, prevClose };
  } catch {
    return null;
  }
}

// 심볼에 따라 적절한 API로 조회
async function fetchPrice(sym: string): Promise<{ price: number; prevClose: number } | null> {
  const code = sym.replace(/\.(KS|KQ)$/, '');

  // 영문 혼합 특수코드 → 네이버 금융으로만 조회 (Yahoo 시도 안 함)
  if (isSpecialKRCode(sym)) {
    return await fetchPriceNaver(code);
  }

  // 일반 코드 → Yahoo Finance
  let result = await fetchPriceYahoo(sym);

  // .KS 실패 시 .KQ로 폴백
  if (result === null && sym.endsWith('.KS')) {
    const kqSym = sym.replace(/\.KS$/, '.KQ');
    result = await fetchPriceYahoo(kqSym);
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // ── 종목 검색 모드 ──────────────────────────────────────────
    if (body.search) {
      const q = String(body.search).trim();
      if (!q) return new Response(JSON.stringify({ items: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const url = `${YAHOO_SEARCH}?q=${encodeURIComponent(q)}&lang=ko-KR&region=KR&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) return new Response(JSON.stringify({ items: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const data = await res.json();
      const quotes = (data?.quotes ?? []) as Array<{
        symbol: string; shortname?: string; longname?: string;
        quoteType?: string; exchDisp?: string; exchange?: string;
      }>;

      const items = quotes
        .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND')
        .map(q => {
          const sym = q.symbol;
          const isKR = sym.endsWith('.KS') || sym.endsWith('.KQ');
          const isUSD = !isKR;
          const isETF = q.quoteType === 'ETF';
          const ticker = isKR ? sym.replace(/\.(KS|KQ)$/, '') : sym;
          const suffix = sym.endsWith('.KQ') ? '.KQ' : (isKR ? '.KS' : '');
          return {
            name: q.longname || q.shortname || sym,
            ticker,
            suffix,
            isUSD,
            isETF,
            exchange: q.exchDisp || q.exchange || '',
          };
        });

      return new Response(JSON.stringify({ items }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── 차트 데이터 모드 ─────────────────────────────────────────
    if (body.chart) {
      const sym = String(body.chart).trim();
      const range = String(body.range || '1y');
      const interval = String(body.interval || '1wk');
      try {
        // 특수코드는 Yahoo로 차트 불가 → 빈 배열 반환
        if (isSpecialKRCode(sym)) {
          return new Response(JSON.stringify({ points: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const url = `${YAHOO_CHART}/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`;
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) return new Response(JSON.stringify({ points: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        const timestamps: number[] = result?.timestamp || [];
        const closes: number[] = result?.indicators?.quote?.[0]?.close || [];
        const points = timestamps.map((ts: number, i: number) => ({ t: ts, c: closes[i] })).filter((p: { t: number; c: number }) => p.c != null);
        return new Response(JSON.stringify({ points }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch {
        return new Response(JSON.stringify({ points: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ── 시세 조회 모드 ───────────────────────────────────────────
    const { symbols } = body;
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: 'symbols 배열이 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Record<string, { price: number; prevClose: number } | null> = {};

    await Promise.all(symbols.map(async (sym: string) => {
      results[sym] = await fetchPrice(sym);
    }));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
