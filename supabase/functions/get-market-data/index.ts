// supabase/functions/get-market-data/index.ts
// Yahoo Finance 시세 조회 + 종목 검색 프록시

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// 단일 심볼 시세 조회. null이면 실패.
async function fetchPrice(sym: string): Promise<{ price: number; prevClose: number } | null> {
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
          // ticker: 한국 종목은 숫자 코드만, 미국은 그대로
          const ticker = isKR ? sym.replace(/\.(KS|KQ)$/, '') : sym;
          const suffix = sym.endsWith('.KQ') ? '.KQ' : (isKR ? '.KS' : '');
          return {
            name: q.longname || q.shortname || sym,
            ticker,
            suffix,   // App.js에서 올바른 suffix를 저장하기 위해 전달
            isUSD,
            isETF,
            exchange: q.exchDisp || q.exchange || '',
          };
        });

      return new Response(JSON.stringify({ items }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      // 한국 종목(.KS)은 실패 시 .KQ로 폴백
      let result = await fetchPrice(sym);
      if (result === null && sym.endsWith('.KS')) {
        const kqSym = sym.replace(/\.KS$/, '.KQ');
        result = await fetchPrice(kqSym);
        // 성공했다면 원래 키(.KS)로 저장 (App.js가 .KS 키로 결과를 조회하므로)
      }
      results[sym] = result;
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
