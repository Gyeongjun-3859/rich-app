// supabase/functions/get-market-data/index.ts
// Yahoo Finance에서 시세/지수를 서버사이드로 가져오는 프록시
// 클라이언트의 CORS 제약을 우회하고 안정적으로 데이터를 제공합니다.

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  // CORS preflight 응답
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json(); // ['AAPL', '005930.KS', '^KS11', ...]

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: 'symbols 배열이 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Record<string, { price: number; prevClose: number } | null> = {};

    await Promise.all(symbols.map(async (sym: string) => {
      try {
        const res = await fetch(`${YAHOO_CHART}/${encodeURIComponent(sym)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
        });
        if (!res.ok) { results[sym] = null; return; }
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) { results[sym] = null; return; }
        results[sym] = {
          price: meta.regularMarketPrice,
          prevClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice
        };
      } catch {
        results[sym] = null;
      }
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