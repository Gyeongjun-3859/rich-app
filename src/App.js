import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Flame, LogOut, Target, Clock, Plus, Trash2, Search, TrendingUp, TrendingDown,
  ShoppingCart, X, Star, Sparkles, Heart, 
  PiggyBank, CalendarDays, Database, Edit2, CircleDollarSign, Briefcase, Camera, AlertCircle, Menu, Download, UploadCloud, ChevronRight, ChevronDown, Landmark, PieChart, Scale, Settings, RefreshCw, Upload, CreditCard, MoreHorizontal, Bell
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
// Kongeramo 'Upload' muri lucide-react kugira ngo dukemure ikibazo cya ReferenceError

// --- [Supabase 클라우드 연동] ---
import { createClient } from '@supabase/supabase-js';

// ⚠️ 주의: 본인의 Supabase Project URL과 anon key로 반드시 변경하세요!
const supabaseUrl = 'https://slpzlgpbcetnspmjcqee.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscHpsZ3BiY2V0bnNwbWpjcWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjE1NTgsImV4cCI6MjA4OTczNzU1OH0.q1t-MZAMcA9aLbIhnbrjsgy0vOD3WBMHm4O-y4ZOp_o';
const supabase = createClient(supabaseUrl, supabaseKey);
// 🎯 Edge Function을 통해 시세/지수 일괄 조회 (서버에서 Yahoo 호출, CORS 안전, 안정적)
const edgeFnHeaders = () => ({
  'Content-Type': 'application/json',
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
});

const fetchMarketDataViaEdgeFn = async (symbols) => {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/get-market-data`, {
      method: 'POST',
      headers: edgeFnHeaders(),
      body: JSON.stringify({ symbols }),
    });
    const data = await res.json();
    return data?.results || {};
  } catch (e) {
    console.error('⚠️ Edge Function 호출 실패:', e);
    return {};
  }
};

const searchStocksViaEdgeFn = async (query) => {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/get-market-data`, {
      method: 'POST',
      headers: edgeFnHeaders(),
      body: JSON.stringify({ search: query }),
    });
    const data = await res.json();
    return data?.items || [];
  } catch {
    return [];
  }
};

const toPureNumber = (str) => Number(String(str).replace(/,/g, "")) || 0;
const toCommaString = (val) => String(val).replace(/[^0-9.-]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const formatNum = (val, fixed = 0) => {
  const n = Number(val);
  return isNaN(n) ? "0" : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: fixed });
};
const getPayoutsPerYear = (freqStr) => {
  if (freqStr === '분기') return 4;
  if (freqStr === '반기') return 2;
  if (freqStr === '연') return 1;
  return 12;
};
const getDefaultDivMonths = (freq) => {
  if (freq === '분기') return [3, 6, 9, 12];
  if (freq === '반기') return [6, 12];
  if (freq === '연') return [12];
  return [];
};
// 특정 종목이 특정 월에 배당을 지급하는지 확인
const isDivMonth = (s, month) => {
  if (!s.divFreq || s.divFreq === '월') return true;
  const months = (s.divMonths && s.divMonths.length > 0) ? s.divMonths : getDefaultDivMonths(s.divFreq);
  return months.includes(month);
};
const getRecoveredValue = (key, fallbackKey, defaultVal) => {
  try {
    const saved = localStorage.getItem(key) || localStorage.getItem(fallbackKey);
    if (saved && saved !== "undefined") return JSON.parse(saved);
  } catch (e) {}
  return defaultVal;
};

// --- [Error Boundary] ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-rose-50 rounded-xl m-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-rose-800">오류가 발생했습니다</h2>
        <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-rose-500 text-white rounded-lg font-bold shadow-md">새로고침</button>
      </div>
    );
    return this.props.children;
  }
}

// --- [Constants & Themes] ---
const PRESET_PROFILES = [
  { id: '1', url: 'https://api.dicebear.com/9.x/micah/svg?seed=Felix&facialHair=beard&backgroundColor=ffdfbf' },
  { id: '2', url: 'https://api.dicebear.com/9.x/micah/svg?seed=Jack&backgroundColor=dcfce3' },
  { id: '3', url: 'https://api.dicebear.com/9.x/micah/svg?seed=Jocelyn&backgroundColor=fce7f3' },
  { id: '4', url: 'https://robohash.org/poutycat.png?set=set4&bgset=bg1' },
  { id: '5', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Doggy&backgroundColor=e0e7ff' },
  { id: '6', url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Baby&backgroundColor=fef08a' }, 
];

const STOCK_DATABASE = [
  // 🎯 사용자가 특별히 요청한 필수 ETF 8종 (최상단 고정 배치)
  { id: 'etf_req10', name: 'TIGER 미국배당다우존스타겟데일리커버드콜', ticker: '0008S0', currentPrice: 10000, isUSD: false, isETF: true },
  { id: 'etf_req11', name: 'TIGER 미국S&P500', ticker: '360750', currentPrice: 15000, isUSD: false, isETF: true },
  { id: 'etf_req12', name: 'ACE 미국하이일드액티브(H)', ticker: '455660', currentPrice: 10000, isUSD: false, isETF: true },
  { id: 'etf_req13', name: 'KODEX 한국부동산리츠인프라', ticker: '476800', currentPrice: 5000, isUSD: false, isETF: true },
  { id: 'etf_req14', name: 'KODEX 코스닥150', ticker: '229200', currentPrice: 12000, isUSD: false, isETF: true },
  { id: 'etf_req15', name: 'KODEX 코스피100', ticker: '237350', currentPrice: 25000, isUSD: false, isETF: true },
  { id: 'etf_req16', name: 'ACE KRX금현물', ticker: '411060', currentPrice: 13000, isUSD: false, isETF: true },
  { id: 'etf_req17', name: 'PLUS 미국고배당주액티브', ticker: '0153X0', currentPrice: 10000, isUSD: false, isETF: true },
  { id: 'etf_req18', name: 'TIGER 미국AI데이터센터TOP4Plus', ticker: '0142D0', currentPrice: 10000, isUSD: false, isETF: true },
  { id: 'etf_req19', name: 'PLUS 글로벌HBM반도체', ticker: '442580', currentPrice: 10000, isUSD: false, isETF: true },

  // 🎯 글로벌 & 국내 시총 상위 실제 주식 100종 (콤팩트 배열 파싱)
  ...[
    '애플 (Apple)|AAPL|U','마이크로소프트|MSFT|U','엔비디아 (NVIDIA)|NVDA|U','테슬라 (Tesla)|TSLA|U','알파벳 A|GOOGL|U','아마존 (Amazon)|AMZN|U','메타 (Meta)|META|U','버크셔 해서웨이|BRK.B|U','일라이 릴리|LLY|U','TSMC|TSM|U',
    '브로드컴|AVGO|U','노보 노디스크|NVO|U','제이피모건|JPM|U','유나이티드헬스|UNH|U','월마트|WMT|U','비자 (Visa)|V|U','마스터카드|MA|U','존슨앤드존슨|JNJ|U','엑슨모빌|XOM|U','프록터앤갬블|PG|U',
    '코스트코|COST|U','홈디포|HD|U','오라클|ORCL|U','쉐브론|CVX|U','머크|MRK|U','코카콜라|KO|U','펩시코|PEP|U','애비|ABBV|U','뱅크오브아메리카|BAC|U','넷플릭스|NFLX|U',
    '어도비|ADBE|U','세일즈포스|CRM|U','AMD|AMD|U','맥도날드|MCD|U','시스코 시스템즈|CSCO|U','애보트|ABT|U','인텔|INTC|U','퀄컴|QCOM|U','IBM|IBM|U','디즈니|DIS|U',
    '나이키|NKE|U','스타벅스|SBUX|U','화이자|PFE|U','버라이즌|VZ|U','AT&T|T|U','넥스트에라|NEE|U','보잉|BA|U','캐터필러|CAT|U','아메리칸 익스프레스|AXP|U','암젠|AMGN|U',
    '삼성전자|005930|K','SK하이닉스|000660|K','현대차|005380|K','기아|000270|K','NAVER|035420|K','카카오|035720|K','셀트리온|068270|K','LG에너지솔루션|373220|K','POSCO홀딩스|005490|K','삼성바이오로직스|207940|K',
    'LG화학|051910|K','삼성SDI|006400|K','현대모비스|012330|K','카카오뱅크|323410|K','포스코퓨처엠|003670|K','한화솔루션|009830|K','에코프로|086520|KQ','에코프로비엠|247540|KQ','하이브|352820|K','SK이노베이션|096770|K',
    '삼성물산|028260|K','KB금융|105560|K','신한지주|055550|K','LG전자|066570|K','삼성생명|032830|K','SK|034730|K','하나금융지주|086790|K','KT&G|033780|K','카카오페이|377300|K','엔씨소프트|036570|K',
    '삼성에스디에스|018260|K','우리금융지주|316140|K','고려아연|010130|K','두산에너빌리티|034020|K','현대글로비스|086280|K','크래프톤|259960|K','에스엠|041510|KQ','LG생활건강|051900|K','SK텔레콤|017670|K','한국전력|015760|K',
    'HMM|011200|K','기업은행|024110|K','메리츠금융지주|138040|K','포스코인터내셔널|047050|K','HD현대|267250|K','삼성화재|000810|K','삼성전기|009150|K','KT|030200|K','아모레퍼시픽|090430|K','현대제철|004020|K'
  ].map((str, i) => { const [n,t,u,q] = str.split('|'); return { id:`s_${i}`, name:n, ticker:t, currentPrice:100, isUSD:(u==='U'), isETF:false, ...(q === 'KQ' ? { tickerSuffix: '.KQ' } : {}) }; }),

  // 🎯 글로벌 & 국내 인기 ETF 92종 (콤팩트 배열 파싱)
  ...[
    'SCHD|SCHD|U','SPY|SPY|U','QQQ|QQQ|U','VOO|VOO|U','IVV|IVV|U','VTI|VTI|U','JEPI|JEPI|U','JEPQ|JEPQ|U','DIA|DIA|U','ARKK|ARKK|U',
    'SMH|SMH|U','SOXX|SOXX|U','VNQ|VNQ|U','IWM|IWM|U','GLD|GLD|U','IAU|IAU|U','VT|VT|U','VEA|VEA|U','VIG|VIG|U','VYM|VYM|U',
    'QID|QID|U','QLD|QLD|U','TQQQ|TQQQ|U','SQQQ|SQQQ|U','SPXL|SPXL|U','SPXS|SPXS|U','SOXL|SOXL|U','SOXS|SOXS|U','TNA|TNA|U','TZA|TZA|U',
    'XLF|XLF|U','XLV|XLV|U','XLE|XLE|U','XLK|XLK|U','XLY|XLY|U','XLP|XLP|U','XLU|XLU|U','XLI|XLI|U','XLB|XLB|U','XLC|XLC|U',
    'KODEX 200|069500|K','TIGER 2차전지테마|305540|K','TIGER 차이나전기차SOLACTIVE|371460|K','KODEX 레버리지|122630|K','KODEX 200선물인버스2X|252670|K','TIGER 미국배당다우존스|458730|K','TIGER 미국테크TOP10 INDXX|381180|K','KODEX 코스닥150레버리지|233740|K','KODEX 코스닥150선물인버스|251340|K','TIGER 미국필라델피아반도체나스닥|381170|K',
    'ACE 미국배당다우존스|460330|K','KODEX 삼성그룹|102780|K','TIGER 글로벌리튬&2차전지SOLACTIVE|398070|K','KODEX 은행|091220|K','TIGER 200 IT|139260|K','KODEX 자동차|091230|K','TIGER K-게임지수|380440|K','KODEX 2차전지산업|305720|K','KODEX 반도체|091160|K','TIGER 화장품|228790|K',
    'KODEX 미디어&엔터테인먼트|266360|K','TIGER 헬스케어|228800|K','KODEX 바이오|266410|K','TIGER 은행|139270|K','KODEX 에너지화학|091250|K','TIGER 방송통신|228810|K','KODEX 철강|091240|K','TIGER 증권|139310|K','KODEX 건설|091210|K','TIGER 보험|139320|K',
    'KODEX 운송|091260|K','TIGER 기계장비|228770|K','KODEX 보험|140700|K','TIGER 금속소재|228820|K','KODEX 기계조선|102960|K','TIGER 현대차그룹+펀더멘털|138540|K','KODEX 운송장비|102970|K','TIGER LG그룹+펀더멘털|138530|K','KODEX 필수소비재|266370|K','TIGER 삼성그룹펀더멘털|138520|K',
    'KODEX 골드선물(H)|132030|K','TIGER 미국달러선물레버리지|261250|K','KODEX 미국달러선물|261240|K','TIGER 단기통안채|157450|K','KODEX 단기채권|153130|K','TIGER 단기채권액티브|272580|K','KODEX 종합채권(AA-이상)액티브|273130|K','TIGER 우량교환사채|332610|K','KODEX 국고채3년|114470|K'
  ].map((str, i) => { const [n,t,u,q] = str.split('|'); return { id:`e_${i}`, name:n, ticker:t, currentPrice:100, isUSD:(u==='U'), isETF:true, ...(q === 'KQ' ? { tickerSuffix: '.KQ' } : {}) }; })
];

const THEME_STYLES = {
  pink: { bg: 'bg-[#fffafb]', main: 'bg-rose-400 text-white shadow-md hover:bg-rose-500', text: 'text-rose-500', light: 'bg-rose-50 text-rose-600 hover:bg-rose-100', border: 'border-rose-200', accStock: 'bg-rose-500 text-white shadow-md', accSavings: 'bg-indigo-500 text-white shadow-md', altMain: 'bg-indigo-400 text-white shadow-md hover:bg-indigo-500', altText: 'text-indigo-500', altLight: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100', altBgOnly: 'bg-indigo-50' },
  blue: { bg: 'bg-[#f0f9ff]', main: 'bg-blue-400 text-white shadow-md hover:bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50 text-blue-600 hover:bg-blue-100', border: 'border-blue-200', accStock: 'bg-blue-500 text-white shadow-md', accSavings: 'bg-orange-500 text-white shadow-md', altMain: 'bg-orange-400 text-white shadow-md hover:bg-orange-500', altText: 'text-orange-500', altLight: 'bg-orange-50 text-orange-600 hover:bg-orange-100', altBgOnly: 'bg-orange-50' },
  green: { bg: 'bg-[#f0fdf4]', main: 'bg-emerald-400 text-white shadow-md hover:bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', border: 'border-emerald-200', accStock: 'bg-emerald-500 text-white shadow-md', accSavings: 'bg-purple-500 text-white shadow-md', altMain: 'bg-purple-400 text-white shadow-md hover:bg-purple-500', altText: 'text-purple-500', altLight: 'bg-purple-50 text-purple-600 hover:bg-purple-100', altBgOnly: 'bg-purple-50' },
  white: { bg: 'bg-slate-50', main: 'bg-slate-800 text-white shadow-md hover:bg-slate-900', text: 'text-slate-800', light: 'bg-slate-200 text-slate-800 hover:bg-slate-300', border: 'border-slate-300', accStock: 'bg-slate-800 text-white shadow-md', accSavings: 'bg-sky-600 text-white shadow-md', altMain: 'bg-sky-500 text-white shadow-md hover:bg-sky-600', altText: 'text-sky-600', altLight: 'bg-sky-50 text-sky-700 hover:bg-sky-100', altBgOnly: 'bg-sky-50' },
  yellow: { bg: 'bg-[#fffbeb]', main: 'bg-amber-400 text-white shadow-md hover:bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100 text-amber-700 hover:bg-amber-200', border: 'border-amber-300', accStock: 'bg-amber-500 text-white shadow-md', accSavings: 'bg-teal-500 text-white shadow-md', altMain: 'bg-teal-400 text-white shadow-md hover:bg-teal-500', altText: 'text-teal-600', altLight: 'bg-teal-50 text-teal-700 hover:bg-teal-100', altBgOnly: 'bg-teal-50' },
  purple: { bg: 'bg-[#faf5ff]', main: 'bg-purple-400 text-white shadow-md hover:bg-purple-500', text: 'text-purple-600', light: 'bg-purple-100 text-purple-700 hover:bg-purple-200', border: 'border-purple-300', accStock: 'bg-purple-500 text-white shadow-md', accSavings: 'bg-rose-500 text-white shadow-md', altMain: 'bg-rose-400 text-white shadow-md hover:bg-rose-500', altText: 'text-rose-600', altLight: 'bg-rose-50 text-rose-700 hover:bg-rose-100', altBgOnly: 'bg-rose-50' }
};

// --- [Main Component] ---
const AppContent = () => {
  // --- 🎯 신규 추가 상태값 및 자동로그인 로직 ---
  const [showIndices, setShowIndices] = useState(false); // 지수 보드 토글
  
  // 🎯 실시간 지수 연동을 위한 상태 및 API fetch 함수 추가
  const [marketIndices, setMarketIndices] = useState({
    KOSPI: { price: '0', change: 0 }, KOSDAQ: { price: '0', change: 0 },
    'S&P 500': { price: '0', change: 0 }, DOW: { price: '0', change: 0 }, NASDAQ: { price: '0', change: 0 }
  });

  const fetchMarketIndices = async () => {
    const indexMap = { '^KS11': 'KOSPI', '^KQ11': 'KOSDAQ', '^GSPC': 'S&P 500', '^DJI': 'DOW', '^IXIC': 'NASDAQ' };
    const results = await fetchMarketDataViaEdgeFn(Object.keys(indexMap));

    const newIndices = { ...marketIndices };
    Object.entries(indexMap).forEach(([sym, name]) => {
      const r = results[sym];
      if (r?.price && r?.prevClose) {
        const change = ((r.price - r.prevClose) / r.prevClose) * 100;
        newIndices[name] = {
          price: Number(r.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          change: Number(change)
        };
      }
    });
    setMarketIndices(newIndices);

    // 환율은 별도 무료 API 사용
    try {
      const resFx = await fetch('https://open.er-api.com/v6/latest/USD');
      const dataFx = await resFx.json();
      if (dataFx?.rates?.KRW) setExchangeRate(Math.round(dataFx.rates.KRW).toString());
    } catch (e) {}
  };

  // 🎯 마운트 시 1회 + 5분마다 지수/환율 자동 갱신 (버튼 안 눌러도 화면에 즉시 반영)
  useEffect(() => {
    fetchMarketIndices();
    const id = setInterval(fetchMarketIndices, 5 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [flowingTextId, setFlowingTextId] = useState(null); // 물흐름 애니메이션 ID

  // 🎯 화면 빈 곳(외부) 클릭 시 달력 상세내역 해제 및 툴팁 닫기 (전역 마우스 이벤트)
  const justOpenedPopupRef = useRef(false);
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // 1. 계좌/타입 팝업 외부 클릭 시 닫기
      if (!e.target.closest('.acc-popup') && !e.target.closest('.account-card-area')) {
        setActiveCardId(null);
        setActiveTypePopup(null);
        setFlowingTextId(null);
      }
      // 2. 달력 상세 내역이 켜져 있을 때, 달력 영역 밖(빈 공간)을 누르면 해제
      if (!e.target.closest('.calendar-detail-area')) {
        setSelectedDay(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 🎯 자동 로그인 (컴포넌트 마운트 시 localStorage 확인)
  useEffect(() => {
    const savedSession = localStorage.getItem('kj_auto_login_session');
    if (savedSession && !session) {
      setSession(JSON.parse(savedSession));
      // 로그인 처리 후 기존 데이터를 불러오는 fetch 로직 등 연동 가능
    }
  }, []);

  // 🎯 로그아웃 함수
  const handleLogoutAction = () => {
    localStorage.removeItem('kj_auto_login_session');
    setSession(null);
    showToast("👋 안전하게 로그아웃 되었습니다.");
  };
  const [activeTab, setActiveTab] = useState('portfolio'); 
  const [toastMsg, setToastMsg] = useState(''); 
  const toastTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const accClickTimerRef = useRef(null);
  const typeClickTimerRef = useRef(null);
  const searchTimerRef = useRef(null);
  const calendarSwipeRef = useRef(null);
  const calendarGridRef = useRef(null);
  const [chartSplit, setChartSplit] = useState(60); // 차트 너비 % (30~80 범위)
  const chartDividerRef = useRef(null);
  const chartDragState = useRef(null); // { startX, startSplit }
  const calDaySummaryRef = useRef(null);
  const divPickerSectionRef = useRef(null);
  const stockFormScrollRef = useRef(null);
  const divDiarySwipeRef = useRef(null);
  const divDiaryTouchStart = useRef(null);
  const divDiaryWheelLock = useRef(false);
  const calSwipeTouchStart = useRef(null);
  const calSwipeWheelLock = useRef(false);
  const [calSlide, setCalSlide] = useState({ dragX: 0, animDir: null }); // dragX: 드래그 중 실시간 px, animDir: 'left'|'right'|null
  const [divDiarySlide, setDivDiarySlide] = useState({ dragX: 0, animDir: null });
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null, onCancel: null });
  const [inputModal, setInputModal] = useState({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null });
  const [inputModalValue, setInputModalValue] = useState('');
  const [inlineConsume, setInlineConsume] = useState({ isOpen: false, amount: '' });
  const [savingsWithdrawModal, setSavingsWithdrawModal] = useState({ isOpen: false, amount: '', targetAccId: '' });
  const [savingsMaturityModal, setSavingsMaturityModal] = useState({ isOpen: false, targetId: null, finalAmount: '' });
  
  const [itemWithdrawModal, setItemWithdrawModal] = useState({ isOpen: false, targetId: null, amount: '', toAccId: 'wallet' });
  const [savingsTradeModal, setSavingsTradeModal] = useState({ isOpen: false, mode: 'deposit', stockId: null, amount: '', fromAccId: '', toAccId: 'wallet' });

  const [appTitle, setAppTitle] = useState('경준 부자 포트폴리오');
  const [appSubtitle, setAppSubtitle] = useState('Dream Big, Invest Smart');
  const [characterName, setCharacterName] = useState('경준');
  const [appTheme, setAppTheme] = useState('pink');
  const [typeCustom, setTypeCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kj_type_custom') || '{}'); } catch { return {}; }
  });
 
  
  // 수정용 임시 상태 (설정창용)
  
  const t = THEME_STYLES[appTheme] || THEME_STYLES.pink;

  // 🎯 테마 배경색을 body/html에도 적용 → zoom 축소 시 흰색 노출 방지
  useEffect(() => {
    const themeBg = {
      pink: '#fffafb', blue: '#f0f9ff', green: '#f0fdf4',
      white: '#f8fafc', yellow: '#fffbeb', purple: '#faf5ff'
    }[appTheme] || '#fffafb';
    document.body.style.backgroundColor = themeBg;
    document.documentElement.style.backgroundColor = themeBg;
    // 모바일 상태바 색상도 일치
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', themeBg);
  }, [appTheme]);

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isFireModalOpen, setIsFireModalOpen] = useState(false); // 🔥 FIRE 대시보드 팝업 스위치
  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editCharacterName, setEditCharacterName] = useState('');
  const [editProfileImage, setEditProfileImage] = useState(''); 

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('__all__stock');

  // 🎯 accounts가 로드되거나 바뀌면, selectedAccountId가 실제 계좌 중 하나를 가리키도록 자동 동기화
  useEffect(() => {
    if (accounts.length === 0) return;
    if (selectedAccountId && selectedAccountId.startsWith('__all__')) return;
    const exists = accounts.some(a => a.id === selectedAccountId);
    if (!exists) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);
  const [stocks, setStocksState] = useState([]);

  // 2. 상태 업데이트 함수 (저장은 2초 자동 저장 엔진이 일괄 처리함)
  const setStocks = (newStocks) => {
    setStocksState(newStocks);
  };

  const [exchangeRate, setExchangeRate] = useState("1392");
  const [isFetchingStocks, setIsFetchingStocks] = useState(false);
  
  const [historyRecords, setHistoryRecords] = useState([]);
  const [tradeLogs, setTradeLogs] = useState([]);

  const [profileImage, setProfileImage] = useState(PRESET_PROFILES[0].url);
  const [globalCash, setGlobalCash] = useState(0);
  const [loans, setLoans] = useState([]);
  const [lastFetchTime, setLastFetchTime] = useState('');

  const [pastStates, setPastStates] = useState([]);
  const [futureStates, setFutureStates] = useState([]);

  const [chartViewMode, setChartViewMode] = useState('month');
  const [excludeLoanFromTotal, setExcludeLoanFromTotal] = useState(false);
  // 상시 노출로 변경되어 activeChartLabels 상태가 제거되었습니다.
  const [pendingDivs, setPendingDivs] = useState({});
  const [pendingBuys, setPendingBuys] = useState({});
  const [pendingSells, setPendingSells] = useState({});
  
  const [activeDepositId, setActiveDepositId] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSourceId, setDepositSourceId] = useState('');
  
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [tradeModal, setTradeModal] = useState({ isOpen: false, mode: 'buy', stockId: null });
  const [tradePrice, setTradePrice] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTargetAccId, setModalTargetAccId] = useState('');
  const [modalOpenedFromAll, setModalOpenedFromAll] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const ocrFileInputRef = useRef(null);
  const [isBatchBuyModalOpen, setIsBatchBuyModalOpen] = useState(false);
  const [batchBuyInputs, setBatchBuyInputs] = useState({}); // 일괄매수 수량 사용자 입력 저장용
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false); 
  const [isEditLabelModalOpen, setIsEditLabelModalOpen] = useState(false);
  const [editLabelInput, setEditLabelInput] = useState('');

  const [isEditingAccCash, setIsEditingAccCash] = useState(false);
  const [editAccCashAmount, setEditAccCashAmount] = useState('');

  const [rebalanceTab, setRebalanceTab] = useState('overview');
  const [rebalanceInvestAmount, setRebalanceInvestAmount] = useState(''); 

  const [investTab, setInvestTab] = useState('transfer');
  const [incomeMode, setIncomeMode] = useState(null); // 'salary' 또는 'bonus'
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('출장비'); // 🎯 수익 카테고리 기본값 '출장비'로 변경
  const [expenseCategory, setExpenseCategory] = useState('식비');
  const [expenseMemo, setExpenseMemo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('현금');
  const [selectedCard, setSelectedCard] = useState('');
  const [cashSource, setCashSource] = useState(''); // '' = 소비계좌 없음, accId = 소비계좌, 'transfer' = 계좌이체
  const [transferAccId, setTransferAccId] = useState('');
  const [spendingItem, setSpendingItem] = useState(''); // 소비계좌 내 선택된 항목 stock id
  const [useSpendingPoint, setUseSpendingPoint] = useState(false); // 소비항목 포인트 사용 여부
  const [myCards, setMyCards] = useState([]); 
  const [isNbbang, setIsNbbang] = useState(false);
  const [nbbangCount, setNbbangCount] = useState(1);
  const [nbbangNames, setNbbangNames] = useState('');
  const [nbbangList, setNbbangList] = useState([{ id: Date.now(), name: '' }]); 
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [newCardTarget, setNewCardTarget] = useState('');
  const [newCardPeriod, setNewCardPeriod] = useState(''); 
  const [newCardPayDay, setNewCardPayDay] = useState(''); // 🎯 카드 결제일 상태
  const [isCardSettledView, setIsCardSettledView] = useState(false); // 🎯 카드 결제 완료 내역 뷰
  const [expandedFootprint, setExpandedFootprint] = useState({}); // 🎯 발자취 카테고리 아코디언
  const [isNbbangConfirmed, setIsNbbangConfirmed] = useState(false);
  const [nbbangFilter, setNbbangFilter] = useState('all');
  const [expandedPersons, setExpandedPersons] = useState({}); 
  const [expandedRestaurants, setExpandedRestaurants] = useState({}); 
  const [editingNbbang, setEditingNbbang] = useState(null);
  const [editingAllGroupKey, setEditingAllGroupKey] = useState(null); // 전체 사용내역 수정 모달용
  const [selectedAllGroupKeys, setSelectedAllGroupKeys] = useState([]); // 전체 사용내역 클릭 정산용 (복수)
  const [prepayModalState, setPrepayModalState] = useState({ isOpen: false, cardName: '' });
  const [prepaySelectedKey, setPrepaySelectedKey] = useState(null);
  const [prepayEditKey, setPrepayEditKey] = useState(null);
  const [expenseDateInput, setExpenseDateInput] = useState(''); 
  const [isSettledHistoryView, setIsSettledHistoryView] = useState(false);
  const [settledDetailModal, setSettledDetailModal] = useState({ isOpen: false, person: '', details: [] }); // 🎯 정산 완료 상세 모달
  const [settledNbbangFilter, setSettledNbbangFilter] = useState('person'); // 🎯 완료 내역 전용 필터 상태 추가
  const [myDisplayName, setMyDisplayName] = useState(''); // 🎯 내 이름 설정 (settings에 동기화)
  const [isNameSettingOpen, setIsNameSettingOpen] = useState(false); // 🎯 내 이름 설정 팝업 상태
  const [selectedPersonsToSettle, setSelectedPersonsToSettle] = useState([]); // 🎯 선택적 N빵 정산
  const [settleDepositStockId, setSettleDepositStockId] = useState(''); // 🎯 정산금 입금 저축계좌 항목
  const [doubleClickedBatchItem, setDoubleClickedBatchItem] = useState(null); // 🎯 정산내역 더블클릭 되돌리기
  const [expandedBatches, setExpandedBatches] = useState({}); // 🎯 계층형 완료 내역 아코디언
  const [editingBatchId, setEditingBatchId] = useState(null); // 🎯 완료 내역 이름 수정 모드
  const [batchNameInput, setBatchNameInput] = useState('');
  const [newCardType, setNewCardType] = useState('신용'); // 🎯 등록 카드 종류 (신용/체크)
  // --- 통합된 FIRE 및 계좌 변수 선언 ---
  const [newCardLinkedAcc, setNewCardLinkedAcc] = useState('');
  const [isTaxAccount, setIsTaxAccount] = useState(false);
  // --- 은퇴 목표 및 저축액 상태 (설정 복구 로직 포함) ---
  const [fireTarget, setFireTarget] = useState(1000000000);
  const [annualLimit, setAnnualLimit] = useState(2000000);

  // 설정창 수정을 위한 임시 상태값
  const [expectedReturn, setExpectedReturn] = useState('');
  const [userEditedReturn, setUserEditedReturn] = useState(false);
  const [showFireReturnModal, setShowFireReturnModal] = useState(false);
  const [isBalanceEditOpen, setIsBalanceEditOpen] = useState(false);
  const [balanceEditDraft, setBalanceEditDraft] = useState({});
  // --- 설정창 수정을 위한 임시 상태값 (중복 방지) ---
  const [editFireTarget, setEditFireTarget] = useState('');
  const [editMonthlySaving, setEditMonthlySaving] = useState('');

  // 은퇴 목표 및 저축액 상태 (복구 로직 포함)

  // 설정창 수정을 위한 임시 상태값 (중복 선언 방지를 위해 이름 확인)
  
  // 설정창 수정을 위한 임시 상태값
  const [newCardName, setNewCardName] = useState('');
  const [accountbookTab, setAccountbookTab] = useState('calendar');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [monthlyGoals, setMonthlyGoals] = useState({});
  const [showYearSummary, setShowYearSummary] = useState(false);
  const [showCatStats, setShowCatStats] = useState(false);
  const [catStatsMode, setCatStatsMode] = useState('month'); // 'month' | 'year'
  const [catStatsDate, setCatStatsDate] = useState(null); // 통계 모달 전용 날짜 (calendarDate와 분리)
  const catStatsRef = useRef(null); // DOM ref for stats modal card
  const catStatsSwipeX = useRef(null); // swipe start X coordinate
  const [appNotifications, setAppNotifications] = useState([]); // [{id, type, title, body, amount, date, read}]
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showShopList, setShowShopList] = useState(false);
  const [shopItems, setShopItems] = useState([]); // [{id, name, done}]
  const [shopInput, setShopInput] = useState('');
  const [shopBuyModal, setShopBuyModal] = useState(null); // {id, name} — 구매 기록 팝업
  const [shopBuyAmount, setShopBuyAmount] = useState('');
  const [shopBuyCategory, setShopBuyCategory] = useState('식비');
  const [shopBuyEtcDetail, setShopBuyEtcDetail] = useState(''); // 기타 상세 입력
  const [shopEditId, setShopEditId] = useState(null);
  const [shopEditName, setShopEditName] = useState('');
  const [shopMode, setShopMode] = useState(null); // null | 'edit' | 'delete'
  const [fixedExpenses, setFixedExpenses] = useState([]); // [{id, name, amount, day, category, paymentMethod, cardName}]
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => {
    // viewport는 항상 1로 고정 — initial-scale 변경 시 모바일에서 가로 스크롤 발생
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement('meta'); vp.name = 'viewport'; document.head.appendChild(vp); }
    vp.content = 'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover';
  }, []);
  const [session, setSession] = useState(null);
  const [authId, setAuthId] = useState(''); 
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem('savedRichId');
    const savedPw = localStorage.getItem('savedRichPw');
    if (savedId && savedPw) {
      setAuthId(savedId);
      setAuthPassword(savedPw);
      setRememberMe(true);
    }
  }, []);

  // 🎯 Context API 역할을 대체하는 전역 사용자 상태 및 세션 동기화 락(Lock)
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // 세션 복구가 끝났는지 확인하는 상태

  useEffect(() => {
    // 1. 새로고침 시 기존 세션 완벽 복구
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      setIsAuthReady(true); // 인증 상태 확인 완료 (이제 데이터 불러오기 허용)
      setAuthLoading(false);
    };
    restoreSession();

    // 2. 실시간 로그인/로그아웃/토큰 만료 감지기
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 1.5 데이터 덮어쓰기 방지용 상태 추가
  const [isCloudDataLoaded, setIsCloudDataLoaded] = useState(false);

  // 2. 🎯 완벽 격리: 내 로그인 ID와 일치하는 데이터만 불러오기
  useEffect(() => {
    if (!isAuthReady) return; 

    if (!user?.id) {
       // 로그아웃 상태면 화면의 모든 데이터(State)를 0으로 싹 비움
       setGlobalCash(0); setTradeLogs([]); setMyCards([]); setAccounts([]); setStocks([]); setHistoryRecords([]);
       setAppTitle('경준 부자 포트폴리오'); setAppSubtitle('Dream Big, Invest Smart'); setCharacterName('경준'); setAppTheme('pink');
       setProfileImage(PRESET_PROFILES[0].url); setFireTarget(1000000000); setAnnualLimit(2000000); setZoomLevel(100);
       setIsCloudDataLoaded(false);
       return;
    }

    const loadCloudData = async () => {
       // 🎯 데이터 일원화: 비어있는 accounts/stocks 테이블을 버리고, 
       // 실제 데이터가 들어있는 app_data 테이블 하나에서만 모든 정보를 가져옵니다.
       const { data, error } = await supabase.from('app_data').select('*').eq('user_id', user.id).maybeSingle();

       const parseJson = (val, fallback) => {
         if (val === null || val === undefined) return fallback;
         if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
         return val;
       };

       if (data) {
          // 기본 데이터
          setGlobalCash(data.global_cash ?? 0);
          setAccounts(parseJson(data.accounts, []));
          const loadedStocks = parseJson(data.stocks, []);
          const patchedStocks = loadedStocks.map(s => {
            if (s.isUSD) return s;
            // 이름으로 DB 매칭 → 잘못된 티커 또는 누락된 suffix 교정
            const dbMatch = STOCK_DATABASE.find(d => d.name === s.name && !d.isUSD);
            if (dbMatch) {
              return {
                ...s,
                ticker: dbMatch.ticker,
                ...(dbMatch.tickerSuffix ? { tickerSuffix: dbMatch.tickerSuffix } : {}),
              };
            }
            return s;
          });
          setStocks(patchedStocks);
          setTradeLogs(parseJson(data.trade_logs, []));
          setMyCards(parseJson(data.my_cards, []));
          // 🎯 가계부 (성장일기 차트의 원본 데이터)
          setHistoryRecords(parseJson(data.history_records, []));
          // 🎯 설정 (테마/제목/프로필 등 통합)
          const s = parseJson(data.settings, {});
          setAppTitle(s.appTitle ?? '경준 부자 포트폴리오');
          setAppSubtitle(s.appSubtitle ?? 'Dream Big, Invest Smart');
          setCharacterName(s.characterName ?? '경준');
          setAppTheme(s.appTheme ?? 'pink');
          setProfileImage(s.profileImage ?? PRESET_PROFILES[0].url);
          setFireTarget(Number(s.fireTarget ?? 1000000000));
          setAnnualLimit(Number(s.annualLimit ?? 2000000));
          setZoomLevel(s.zoomLevel ?? 100);
          setExchangeRate(s.exchangeRate ?? "1392");
          setMyDisplayName(s.myDisplayName ?? '');
          if (s.monthlyGoals) setMonthlyGoals(s.monthlyGoals);
          if (s.fixedExpenses) setFixedExpenses(s.fixedExpenses);
          if (s.loans) setLoans(s.loans);
          if (s.shopItems) setShopItems(s.shopItems);
          if (s.excludeLoanFromTotal !== undefined) setExcludeLoanFromTotal(s.excludeLoanFromTotal);
          if (s.watchlist) { setWatchlist(s.watchlist); watchlistRef.current = s.watchlist; }
          if (s.watchlistCategories) {
            const migrated = s.watchlistCategories.map(c => c === '한국주식' ? '한국' : c === '미국주식' ? '미국' : c);
            setWatchlistCategories(migrated);
            watchlistCategoriesRef.current = migrated;
          }
          if (s.watchlistCategoryMap) {
            const migrated = {};
            Object.entries(s.watchlistCategoryMap).forEach(([k, v]) => {
              migrated[k] = v === '한국주식' ? '한국' : v === '미국주식' ? '미국' : v;
            });
            setWatchlistCategoryMap(migrated);
            watchlistCategoryMapRef.current = migrated;
          }
       } else {
          // 신규 가입자: 모든 데이터 빈 상태로 초기화
          await supabase.from('app_data').insert([{ user_id: user.id, global_cash: 0, settings: {}, history_records: [] }]);
          setGlobalCash(0);
          setAccounts([{ id: 'default', name: '메인 계좌', cash: "0", type: 'stock', label: '입출금 통장' }]);
          setStocks([]);
          setTradeLogs([]);
          setMyCards([]);
          setHistoryRecords([]);
          setFixedExpenses([]);
          setProfileImage(PRESET_PROFILES[0].url);
          setCharacterName('경준');
          setAppTitle('경준 부자 포트폴리오');
          setAppSubtitle('Dream Big, Invest Smart');
          setAppTheme('pink');
          setFireTarget(1000000000);
          setAnnualLimit(2000000);
          setZoomLevel(100);
          setExchangeRate("1392");
       }

       setIsCloudDataLoaded(true); // 불러오기 완료 도장 쾅!
    };
    loadCloudData();
  }, [user, isAuthReady]);

  // 3. 🎯 완벽 격리: 저장할 때 내 로그인 ID 꼬리표를 꽉 묶어서 저장
  useEffect(() => {
    // 세션이 없거나, 불러오기가 안 끝났으면 절대 저장 안 함 (0원으로 덮어써지는 참사 방지)
    if (!session?.user?.id || !isCloudDataLoaded) return; 
    
    const saveToCloud = async () => {
       const currentUserId = session.user.id;
       
       // 🎯 jsonb 컬럼은 객체/배열 그대로 보내야 함 (JSON.stringify 하면 문자열로 저장돼서 매번 파싱 필요)
       const settings = {
         appTitle, appSubtitle, characterName, appTheme,
         profileImage, fireTarget, annualLimit, zoomLevel, exchangeRate,
         myDisplayName
       };

       const { error } = await supabase.from('app_data').upsert({
         user_id: currentUserId,
         global_cash: globalCash,
         accounts: accounts,
         stocks: stocks,
         trade_logs: tradeLogs,
         my_cards: myCards,
         history_records: historyRecords,
         settings: { ...settings, monthlyGoals, fixedExpenses, shopItems, excludeLoanFromTotal, watchlist: watchlistRef.current, watchlistCategories: watchlistCategoriesRef.current, watchlistCategoryMap: watchlistCategoryMapRef.current },
         updated_at: new Date().toISOString()
       }, { onConflict: 'user_id' });

       if (error) console.error("❌ 클라우드 저장 실패:", error);
    };

    const timeoutId = setTimeout(saveToCloud, 3000);
    return () => clearTimeout(timeoutId);
  }, [globalCash, accounts, stocks, tradeLogs, myCards, historyRecords, appTitle, appSubtitle, characterName, appTheme, profileImage, fireTarget, annualLimit, zoomLevel, exchangeRate, myDisplayName, session, isCloudDataLoaded, monthlyGoals, fixedExpenses, shopItems, excludeLoanFromTotal]);

  // 고정비 자동 지출: 로드 후 오늘 날짜에 해당하는 고정비를 미처리 시 자동 기록
  useEffect(() => {
    if (!isCloudDataLoaded || fixedExpenses.length === 0) return;
    const today = new Date();
    const todayDay = today.getDate();
    const ymd = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(todayDay).padStart(2,'0')}`;
    const toAdd = fixedExpenses.filter(fe => {
      if (Number(fe.day) !== todayDay) return false;
      return !tradeLogs.some(r => r.fixedExpenseId === fe.id && r.date === ymd);
    });
    if (toAdd.length === 0) return;
    const newLogs = toAdd.map(fe => {
      const rawAmt = Number(fe.amount);
      const krwAmt = fe.isUSD ? Math.round(rawAmt * (exchangeRate || 1350)) : rawAmt;
      return {
        id: `fe_${fe.id}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        date: ymd, timestamp: Date.now(),
        type: 'expense', name: fe.name, amount: krwAmt,
        category: '고정비', subCategory: fe.name,
        paymentMethod: fe.paymentMethod || '현금',
        cardName: fe.cardName || '',
        fixedExpenseId: fe.id,
        excludeFromPerf: fe.excludeFromPerf || false,
      };
    });
    setTradeLogs(prev => [...newLogs, ...prev]);
    const notifs = toAdd.map(fe => {
      const rawAmt = Number(fe.amount);
      const krwAmt = fe.isUSD ? Math.round(rawAmt * (exchangeRate || 1350)) : rawAmt;
      return { id: `notif_fe_${fe.id}_${Date.now()}`, type: 'expense', title: '자동 지출', body: fe.name, amount: krwAmt, date: ymd, read: false };
    });
    setAppNotifications(prev => [...notifs, ...prev]);
  }, [isCloudDataLoaded, fixedExpenses]);

  // 대출 만기일 D-day 알림: 만기 3개월 전부터 표시
  useEffect(() => {
    if (!isCloudDataLoaded) return;
    const loanAccs = accounts.filter(a => a.type === 'loan' && a.loanDueDate);
    if (loanAccs.length === 0) return;
    const today = new Date(); today.setHours(0,0,0,0);
    loanAccs.forEach(a => {
      const due = new Date(a.loanDueDate); due.setHours(0,0,0,0);
      const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 90) {
        const name = a.loanProductName || a.name;
        if (diffDays === 0) showToast(`🚨 ${name} 만기일이 오늘입니다!`);
        else showToast(`⚠️ ${name} 만기 D-${diffDays} (${a.loanDueDate})`);
      }
    });
  }, [isCloudDataLoaded]);

  // 자동 배당 입금: 앱 로드 시 오늘이 배당 지급일인 종목 자동 처리
  useEffect(() => {
    if (!isCloudDataLoaded || stocks.length === 0) return;
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();
    const mId = `${todayYear}-${String(todayMonth).padStart(2, '0')}`;
    const rate = toPureNumber(exchangeRate) || 1392;

    const toAutoDiv = stocks.filter(s => {
      if (!toPureNumber(s.divPerShare)) return false;
      if (s.dividendTimeline?.[mId]) return false; // 이번 달 이미 지급됨
      const payDay = s.divDay === '말' ? new Date(todayYear, todayMonth, 0).getDate() : Number(s.divDay || 15);
      if (todayDay !== payDay) return false;
      return isDivMonth(s, todayMonth);
    });

    if (toAutoDiv.length === 0) return;

    const summary = [];
    let updatedStocks = [...stocks];
    let updatedAccounts = [...accounts];

    toAutoDiv.forEach(s => {
      const qty = toPureNumber(s.quantity);
      const divPer = toPureNumber(s.divPerShare);
      const mult = s.isUSD ? rate : 1;
      const totalDiv = qty * divPer * mult;
      if (!totalDiv) return;

      updatedStocks = updatedStocks.map(st =>
        st.id === s.id
          ? { ...st, dividendTimeline: { ...(st.dividendTimeline || {}), [mId]: String(totalDiv) } }
          : st
      );
      const accId = s.accountId || 'default';
      updatedAccounts = updatedAccounts.map(a =>
        a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) + totalDiv) } : a
      );
      summary.push({ name: s.name, amount: totalDiv });
    });

    setStocks(updatedStocks);
    setAccounts(updatedAccounts);
    const divDateStr = `${todayYear}.${String(todayMonth).padStart(2,'0')}.${String(todayDay).padStart(2,'0')}`;
    summary.forEach(({ name, amount }) => {
      setTradeLogs(prev => [{ id: `div_auto_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, date: `${todayYear}-${String(todayMonth).padStart(2,'0')}-${String(todayDay).padStart(2,'0')}`, timestamp: Date.now(), type: 'dividend', name, amount }, ...prev]);
    });
    setAppNotifications(prev => [
      ...summary.map(({ name, amount }) => ({ id: `notif_div_${name}_${Date.now()}`, type: 'income', title: '배당금 입금', body: name, amount, date: divDateStr, read: false })),
      ...prev
    ]);
    setAutoDivSummary(summary);
    setIsAutoDivModalOpen(true);
  }, [isCloudDataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. 나만의 아이디(영문/숫자) 로그인 실행 로직
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    
    // 🎯 아이디 로그인 핵심: 사용자가 입력한 아이디 뒤에 몰래 주소를 붙여서 Supabase를 속입니다.
    const fakeEmail = `${authId}@richapp.com`;

    if (isSignUpMode) {
      const { error } = await supabase.auth.signUp({ email: fakeEmail, password: authPassword });
      
      if (error) {
        // 🎯 에러 코드 분석을 통한 지능형 알림창
        if (error.status === 400 || error.message.includes('already') || error.message.includes('exists')) {
          alert("⚠️ 이미 존재하는 아이디입니다. 다른 아이디로 만들어 주세요.");
        } else {
          alert(`⚠️ 가입 오류: ${error.message}`);
        }
      } else {
        alert("🎉 가입이 완료되었습니다! 로그인을 진행해 주세요.");
        setIsSignUpMode(false); // 가입 성공 시 자동으로 로그인 화면으로 전환
        setAuthPassword(''); // 비밀번호 칸 초기화
      }
    }
    else {
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password: authPassword });
      if (error) {
        showToast(`❌ 로그인 실패: 아이디나 비밀번호를 확인해주세요.`);
      } else {
        // 🎯 해결: 로그인 성공 시 ID/PW 저장 로직 (자동 로그인용)
        if (rememberMe) {
          localStorage.setItem('savedRichId', authId);
          localStorage.setItem('savedRichPw', authPassword);
        } else {
          localStorage.removeItem('savedRichId');
          localStorage.removeItem('savedRichPw');
        }
        showToast('🎉 환영합니다!');
      }
    }
    setAuthLoading(false);
  };

    const handleLogout = async () => {
    await supabase.auth.signOut();
    // 🎯 다른 아이디 로그인 시 데이터 누출 방지: 모든 localStorage 데이터 초기화
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('kj_final_v') || key.startsWith('kj_nbbang') || key === 'savedRichId' || key === 'savedRichPw' || key === 'kj_auto_login_session') {
        localStorage.removeItem(key);
      }
    });
    // 🎯 로그아웃 시 로컬 상태값 완벽 초기화 (타인 노출 절대 차단)
    setSession(null);
    setGlobalCash(0);
    setAccounts([]);
    setStocks([]);
    setTradeLogs([]);
    setMyCards([]);
    setIsCloudDataLoaded(false);
    showToast('👋 로그아웃 되었습니다.');
  };
  const [calendarDate, setCalendarDate] = useState(new Date()); // 🎯 가계부 달력 현재 달

  // 통계 모달 스와이프: DOM에 직접 non-passive 리스너 부착 (overflow-y-auto 자식이 passive로 가로채는 문제 우회)
  useEffect(() => {
    if (!showCatStats) return;
    const node = catStatsRef.current;
    if (!node) return;
    const onStart = e => { catStatsSwipeX.current = e.touches[0].clientX; };
    const onEnd = e => {
      if (catStatsSwipeX.current === null) return;
      const diff = catStatsSwipeX.current - e.changedTouches[0].clientX;
      catStatsSwipeX.current = null;
      if (Math.abs(diff) < 40) return;
      setCatStatsDate(prev => { const d = new Date(prev || calendarDate); d.setMonth(d.getMonth() + (diff > 0 ? 1 : -1)); return d; });
    };
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchend', onEnd, { passive: true });
    return () => { node.removeEventListener('touchstart', onStart); node.removeEventListener('touchend', onEnd); };
  }, [showCatStats, calendarDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedDay, setSelectedDay] = useState(null); // 🎯 가계부 선택된 날짜
  const [touchStartX, setTouchStartX] = useState(0); // 🎯 스와이프 감지용 State
  const [investInput, setInvestInput] = useState(''); 
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  // 🎯 스마트 이체 모달 열기 전용 함수 (출발/도착 계좌 자동 셋팅)
  const openTransferModal = (fromId, toId) => {
    setTransferFromId(fromId);
    setTransferToId(toId);
    setInvestTab('transfer');
    setIsInvestModalOpen(true);
  };
   

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // Yahoo 실시간 검색 결과
  const [isSearching, setIsSearching] = useState(false);  // 검색 로딩 중
  const [tickerQuery, setTickerQuery] = useState('');      // 티커 직접 입력
  const tickerTimerRef = useRef(null);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const [watchlistTickerQuery, setWatchlistTickerQuery] = useState('');
  const [watchlistSearchResults, setWatchlistSearchResults] = useState([]);
  const [watchlistIsSearching, setWatchlistIsSearching] = useState(false);
  const [watchlistIsDropdownOpen, setWatchlistIsDropdownOpen] = useState(false);
  const [watchlistPrices, setWatchlistPrices] = useState({});
  const [watchlistRefreshing, setWatchlistRefreshing] = useState(false);
  const [watchlistCatUpdatedAt, setWatchlistCatUpdatedAt] = useState({});
  const [watchlistCategories, setWatchlistCategories] = useState(['한국','미국']);
  const [watchlistCategoryMap, setWatchlistCategoryMap] = useState({});
  const watchlistRef = useRef([]);
  const watchlistCategoriesRef = useRef(['한국','미국']);
  const watchlistCategoryMapRef = useRef({});
  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { watchlistCategoriesRef.current = watchlistCategories; }, [watchlistCategories]);
  useEffect(() => { watchlistCategoryMapRef.current = watchlistCategoryMap; }, [watchlistCategoryMap]);
  const [watchlistChartStock, setWatchlistChartStock] = useState(null);
  const [watchlistChartPeriod, setWatchlistChartPeriod] = useState('1Y');
  const [watchlistChartData, setWatchlistChartData] = useState([]);
  const [watchlistChartLoading, setWatchlistChartLoading] = useState(false);
  const [watchlistNewCategory, setWatchlistNewCategory] = useState('');
  const [watchlistNewCatSelect, setWatchlistNewCatSelect] = useState('');
  const [watchlistAddingCategory, setWatchlistAddingCategory] = useState(false);
  const [watchlistSelectedCategory, setWatchlistSelectedCategory] = useState(null);
  const [watchlistDeleteTarget, setWatchlistDeleteTarget] = useState(null); // 삭제 대기 중인 종목 id
  const [watchlistEditTarget, setWatchlistEditTarget] = useState(null); // 수정 모달 대상 { id, name, ticker, tickerSuffix }
  const [watchlistEditName, setWatchlistEditName] = useState('');
  const watchlistSearchTimerRef = useRef(null);
  const watchlistTickerTimerRef = useRef(null);
  const watchlistClickTimerRef = useRef({});
  const watchlistLongPressTimerRef = useRef({});
  const watchlistDragRef = useRef({ dragId: null, overCat: null, overId: null });
  const [watchlistDragState, setWatchlistDragState] = useState({ draggingId: null, overIdx: null, overCat: null, x: 0, y: 0, startX: 0, startY: 0 });
  const [watchlistFlowId, setWatchlistFlowId] = useState(null);
  const [isSubDivModalOpen, setIsSubDivModalOpen] = useState(false);
  const [isGlobalDivModalOpen, setIsGlobalDivModalOpen] = useState(false);
  const [divInputView, setDivInputView] = useState('schedule');
  const [selectedDivStock, setSelectedDivStock] = useState('');
  const [tempTimelines, setTempTimelines] = useState({});
  const [isAutoDivModalOpen, setIsAutoDivModalOpen] = useState(false);
  const [autoDivSummary, setAutoDivSummary] = useState([]);
  const [showDivMonthPicker, setShowDivMonthPicker] = useState(false);
  const [showDivExPicker, setShowDivExPicker] = useState(false);
  const [subDivYear, setSubDivYear] = useState(new Date().getFullYear());
  
  const [portfolioTypeTab, setPortfolioTypeTab] = useState('stock');
  const [dashboardTypeTab, setDashboardTypeTab] = useState(null);
  const [dashboardAccTab, setDashboardAccTab] = useState(null); // 내 자산 탭에서 선택된 계좌 id
  const [activeTypePopup, setActiveTypePopup] = useState(null);
  const [editTypeModal, setEditTypeModal] = useState({ isOpen: false, type: '', name: '', emoji: '' });
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [addAccountMode, setAddAccountMode] = useState('type'); // 'type' = 신규 타입, 'account' = 기존 타입에 계좌 추가
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('stock');
  const [newLoanAmount, setNewLoanAmount] = useState('');
  const [newLoanRate, setNewLoanRate] = useState('');
  const [newLoanPayDay, setNewLoanPayDay] = useState('');
  const [newLoanPeriod, setNewLoanPeriod] = useState('');
  const [loanItemModal, setLoanItemModal] = useState({ isOpen: false, loanId: null, loanName: '', amount: '', rate: '', payDay: '', period: '', dueDate: '', linkedAccId: '', interestCategory: '' });
  const [spendingChargeModal, setSpendingChargeModal] = useState({ isOpen: false, stockId: null, amount: '', fromKey: '' });
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [editAccountName, setEditAccountName] = useState('');
  const [editingAccountId, setEditingAccountId] = useState(null);

  const [editingStockId, setEditingStockId] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null); // 모바일 터치(클릭) 상태 관리를 위한 변수
  const [newStock, setNewStock] = useState({
    name: '', ticker: '', buyPrice: '', quantity: '', targetRatio: '', isUSD: false,
    currentPrice: '', dividendTimeline: {}, divPerShare: '', divFreq: '월', divDay: '15', divMonths: [], divExDay: '1', divExMonths: [],
    maturityDate: '', interestRate: '', interestType: '단리', benefit: '',
    cardType: '체크', performance: '', isNbbang: false, cardPayDay: '', cardPeriod: '', cardLinkedAcc: 'wallet',
    withdrawAccId: ''
  });

  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const [batchYear, setBatchYear] = useState(currentYearNum);
  const [batchMonth, setBatchMonth] = useState(currentMonthNum);
  const [divModalFilterAccId, setDivModalFilterAccId] = useState(null);
  const [expandedHistoryYears, setExpandedHistoryYears] = useState({ [currentYearNum]: true }); 
  
  const [expandedLogYears, setExpandedLogYears] = useState({ [currentYearNum]: true });
  const [expandedLogMonths, setExpandedLogMonths] = useState({});

  const currentYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [moneyLogExpanded, setMoneyLogExpanded] = useState({ [currentYM]: true });
  const [moneyLogCardOpen, setMoneyLogCardOpen] = useState(null); // 선택된 카드 id
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newFixedDay, setNewFixedDay] = useState('');
  const [newFixedSub, setNewFixedSub] = useState('');
  const [fixedCategories, setFixedCategories] = useState(['월세/관리비/공과금', '구독료/통신비', '보험료/교육비/교통비']);
  const [showFixedCatInput, setShowFixedCatInput] = useState(false);
  const [newFixedCatName, setNewFixedCatName] = useState('');
  const [newFixedPayment, setNewFixedPayment] = useState({ method: '현금', cardName: '', transferAccId: '' });
  const [newFixedIsUSD, setNewFixedIsUSD] = useState(false);
  const [newFixedExcludePerf, setNewFixedExcludePerf] = useState(false);
  const [editFixedModal, setEditFixedModal] = useState(null); // { fe, confirmDelete? } or null
  const [editFixedAmount, setEditFixedAmount] = useState('');
  const [editFixedDay, setEditFixedDay] = useState('');
  const [editFixedPayment, setEditFixedPayment] = useState({ method: '현금', cardName: '', transferAccId: '' });
  const [editFixedIsUSD, setEditFixedIsUSD] = useState(false);
  const [bonusDestAccId, setBonusDestAccId] = useState(''); // 수익 입금 계좌 ('wallet' | 'acc:{id}' | 'stock:{id}')
  const [salaryDestAccId, setSalaryDestAccId] = useState(''); // 월급 입금 계좌
  const [salaryAmount, setSalaryAmount] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');

  const [draggedAccIdx, setDraggedAccIdx] = useState(null); 

  const yearOptions = Array.from({ length: 20 }, (_, i) => 2020 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // 모달이 하나라도 열리면 배경 스크롤/터치 이동 잠금
  const anyModalOpen = isWatchlistModalOpen || isFireModalOpen || isBalanceEditOpen || showGoalModal || showShopList || showIndices || confirmModal.isOpen || inputModal.isOpen || !!editFixedModal || settledDetailModal.isOpen || isModalOpen;
  useEffect(() => {
    if (anyModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => { document.body.style.overflow = prev; document.body.style.touchAction = ''; };
    }
  }, [anyModalOpen]);

  const todayDate = new Date();
  const dateString = `${todayDate.getFullYear()}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${String(todayDate.getDate()).padStart(2, '0')}`;

  // "2026.05.02" 또는 timestamp → 로컬 날짜 기준 Date (UTC 오프셋 문제 방지)
  const parseLocalDate = (val) => {
    if (!val) return null;
    if (typeof val === 'number') { const d = new Date(val); d.setHours(0,0,0,0); return d; }
    const s = String(val).replace(/\./g, '-').split('T')[0]; // "2026.05.02" → "2026-05-02"
    const parts = s.split('-');
    if (parts.length === 3) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const d = new Date(val); d.setHours(0,0,0,0); return d;
  };

  const stocksRef = useRef(stocks);
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);

  // 관심종목 현재가 갱신
  const fetchWatchlistPrices = async ({ manual = false } = {}) => {
    const wl = watchlistRef.current;
    if (wl.length === 0) return;
    if (manual) setWatchlistRefreshing(true);
    try {
      const symbols = wl.map(w => w.isUSD ? w.ticker : `${w.ticker}${w.tickerSuffix || '.KS'}`);
      const results = await fetchMarketDataViaEdgeFn(symbols);
      const newPrices = {};
      wl.forEach(w => {
        const sym = w.isUSD ? w.ticker : `${w.ticker}${w.tickerSuffix || '.KS'}`;
        if (results[sym]) newPrices[w.id] = results[sym];
      });
      if (Object.keys(newPrices).length > 0) {
        setWatchlistPrices(newPrices);
        const now = Math.floor(Date.now() / 1000);
        setWatchlistCatUpdatedAt(prev => {
          const next = { ...prev };
          watchlistCategoriesRef.current.forEach(cat => {
            const catStocks = wl.filter(w => {
              const mapped = watchlistCategoryMapRef.current[w.ticker];
              if (mapped) return mapped === cat;
              const suffix = w.tickerSuffix || '';
              if (w.isETF) return cat === 'ETF';
              if (suffix === '.T') return cat === '일본';
              if (suffix === '.BO' || suffix === '.NS') return cat === '인도';
              if (suffix === '.SS' || suffix === '.SZ') return cat === '중국';
              if (suffix === '.KS' || suffix === '.KQ') return cat === '한국';
              return cat === (w.isUSD ? '미국' : '한국');
            });
            const times = catStocks.map(w => {
              const sym = w.isUSD ? w.ticker : `${w.ticker}${w.tickerSuffix || '.KS'}`;
              return results[sym]?.time;
            }).filter(Boolean);
            const ts = times.length > 0 ? Math.max(...times) : (catStocks.length > 0 ? now : null);
            if (ts) next[cat] = ts;
          });
          return next;
        });
      }
    } catch (e) { console.error('watchlist price fetch error:', e); }
    if (manual) setWatchlistRefreshing(false);
  };

  // 관심종목 현재가 자동 갱신 (10분마다)
  useEffect(() => {
    fetchWatchlistPrices();
    const interval = setInterval(() => fetchWatchlistPrices(), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [watchlist]);

  // 관심종목 변경 시 저장
  useEffect(() => {
    if (!session?.user?.id || !isCloudDataLoaded) return;
    const save = async () => {
      const s = { appTitle, appSubtitle, characterName, appTheme, profileImage, fireTarget, annualLimit, zoomLevel, exchangeRate, myDisplayName, monthlyGoals, fixedExpenses, shopItems, excludeLoanFromTotal, watchlist, watchlistCategories, watchlistCategoryMap };
      await supabase.from('app_data').upsert({
        user_id: session.user.id,
        global_cash: globalCash, accounts, stocks, trade_logs: tradeLogs, my_cards: myCards, history_records: historyRecords,
        settings: s, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    };
    const id = setTimeout(save, 1500);
    return () => clearTimeout(id);
  }, [watchlist, watchlistCategories, watchlistCategoryMap]); // eslint-disable-line

  // 관심종목 차트 데이터 로딩 (Edge Function 경유)
  const fetchWatchlistChart = async (stock, period) => {
    setWatchlistChartLoading(true);
    setWatchlistChartData([]);
    try {
      const periodMap = { '1M': '1mo', '3M': '3mo', '1Y': '1y', '3Y': '3y' };
      const intervalMap = { '1M': '1d', '3M': '1d', '1Y': '1wk', '3Y': '1mo' };
      const sym = stock.isUSD ? stock.ticker : `${stock.ticker}${stock.tickerSuffix || '.KS'}`;
      const range = periodMap[period] || '1y';
      const iv = intervalMap[period] || '1wk';
      const res = await fetch(`${supabaseUrl}/functions/v1/get-market-data`, {
        method: 'POST',
        headers: edgeFnHeaders(),
        body: JSON.stringify({ chart: sym, range, interval: iv }),
      });
      const data = await res.json();
      const points = (data?.points || []).map(p => ({ date: new Date(p.t * 1000), close: p.c }));
      setWatchlistChartData(points);
    } catch { setWatchlistChartData([]); }
    setWatchlistChartLoading(false);
  };

  // 달력 트랙패드 가로 스와이프 (non-passive wheel + 슬라이드 애니메이션)
  useEffect(() => {
    const onWheel = (e) => {
      if (showCatStats) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.8) return;
      e.preventDefault();
      if (calSwipeWheelLock.current) return;
      if (Math.abs(e.deltaX) < 15) return;
      calSwipeWheelLock.current = true;
      const dir = e.deltaX > 0 ? 'left' : 'right';
      setCalSlide({ dragX: 0, animDir: dir });
      setTimeout(() => {
        // 애니메이션 완료 → transition 없이 달 교체 + 위치 리셋 동시 처리
        if (dir === 'left') { setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDay(null); }
        else { setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDay(null); }
        setCalSlide({ dragX: 0, animDir: null });
        setTimeout(() => { calSwipeWheelLock.current = false; }, 600);
      }, 330);
    };
    const els = [calendarSwipeRef.current, calendarGridRef.current].filter(Boolean);
    els.forEach(el => el.addEventListener('wheel', onWheel, { passive: false }));
    return () => els.forEach(el => el.removeEventListener('wheel', onWheel));
  });

  // 배당일기 트랙패드 가로 스와이프
  useEffect(() => {
    const el = divDiarySwipeRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.8) return;
      e.preventDefault();
      if (divDiaryWheelLock.current) return;
      if (Math.abs(e.deltaX) < 15) return;
      divDiaryWheelLock.current = true;
      const dir = e.deltaX > 0 ? 'left' : 'right';
      setDivDiarySlide({ dragX: 0, animDir: dir });
      setTimeout(() => {
        setBatchMonth(m => {
          let nm = dir === 'left' ? m + 1 : m - 1;
          if (nm > 12) { setBatchYear(y => y + 1); return 1; }
          if (nm < 1) { setBatchYear(y => y - 1); return 12; }
          return nm;
        });
        setDivDiarySlide({ dragX: 0, animDir: null });
        setTimeout(() => { divDiaryWheelLock.current = false; }, 400);
      }, 200);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  // --- Live API Fetch (Auto) ---
  useEffect(() => {
    let isMounted = true;
    const fetchPrices = async () => {
      // 1. 환율
      try {
        const resFx = await fetch('https://open.er-api.com/v6/latest/USD');
        const dataFx = await resFx.json();
        if (dataFx?.rates?.KRW) setExchangeRate(Math.round(dataFx.rates.KRW).toString());
      } catch (error) {}

      // 2. 주식 시세 일괄 조회 (Edge Function 한 번 호출)
      const stocksList = stocksRef.current;
      const getTickerSym = (s) => s.isUSD ? s.ticker : `${s.ticker}${s.tickerSuffix || '.KS'}`;
      const symbols = stocksList.filter(s => s.ticker && !s.manualPrice).map(getTickerSym);
      if (symbols.length === 0) return;

      const results = await fetchMarketDataViaEdgeFn(symbols);
      let updated = false;
      let successCount = 0;
      const newStocks = stocksList.map(s => {
        if (!s.ticker || s.manualPrice) return s;
        const sym = getTickerSym(s);
        const price = results[sym]?.price;
        if (price && !isNaN(price)) {
          successCount++;
          if (Number(s.currentPrice) !== price) {
            updated = true;
            return { ...s, currentPrice: String(price) };
          }
        }
        return s;
      });

      if (successCount > 0 && isMounted) {
        const now = new Date();
        const timeStr = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        setLastFetchTime(timeStr);
        if (updated) setStocks(newStocks);
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, 10 * 60 * 1000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const handleUpdateStockPrices = async () => {
    setIsFetchingStocks(true);
    showToast("🔄 실시간 시세 및 환율, 지수 연동 중...");
    
    await fetchMarketIndices(); // 🎯 주식 시세 갱신 시 글로벌 지수도 함께 최신화
    
    let updatedStocks = [...stocks];
    let stockSuccessCount = 0;
    let isStockUpdated = false;
    let newFxRate = exchangeRate;

    // 1. 실시간 환율(USD/KRW) API 호출
    try {
      const resFx = await fetch('https://open.er-api.com/v6/latest/USD');
      const dataFx = await resFx.json();
      if (dataFx?.rates?.KRW) {
        newFxRate = Math.round(dataFx.rates.KRW).toString();
        if (newFxRate !== exchangeRate) {
          setExchangeRate(newFxRate); // 화면 헤더 환율 즉시 갱신
        }
      }
    } catch (error) {
      console.error("❌ 환율 업데이트 실패:", error);
    }

    // 2. 실시간 주식/ETF 시세 일괄 조회 (manualPrice=true 종목 제외)
    const getTickerSymManual = (s) => s.isUSD ? s.ticker : `${s.ticker}${s.tickerSuffix || '.KS'}`;
    const symbolsToFetch = updatedStocks.filter(s => s.ticker && !s.manualPrice).map(getTickerSymManual);
    if (symbolsToFetch.length > 0) {
      const results = await fetchMarketDataViaEdgeFn(symbolsToFetch);
      updatedStocks = updatedStocks.map(s => {
        if (!s.ticker || s.manualPrice) return s;
        const sym = getTickerSymManual(s);
        const price = results[sym]?.price;
        if (price && !isNaN(price)) {
          stockSuccessCount++;
          if (Number(s.currentPrice) !== price) {
            isStockUpdated = true;
            return { ...s, currentPrice: String(price) };
          }
        }
        return s;
      });
    }
    
    // 3. 변경사항 발생 시 Supabase 및 화면 상태값 자동 반영
    if (stockSuccessCount > 0 || newFxRate !== exchangeRate) {
      const now = new Date();
      const timeStr = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      setLastFetchTime(timeStr);
      
      if (isStockUpdated) {
        // 🎯 해결: 기존에 개조해둔 setStocks 함수가 화면 갱신과 Supabase 저장을 동시에 처리합니다.
        await setStocks(updatedStocks);
      }
    }
    
    setIsFetchingStocks(false);
    saveConfig(accounts, newFxRate, appTitle, appSubtitle, characterName, appTheme, globalCash, zoomLevel);
    showToast(stockSuccessCount > 0 ? `✅ 시세 & 환율(₩${formatNum(newFxRate)}) 연동 완료!` : "⚠️ API 연동에 실패하여 기존 데이터를 유지합니다.");
  };

  // 카드 실적 필터: 단순 이번달(1일~말일) 기준 — 실적 게이지에 사용
  const filterByCurrentMonth = (logs) => {
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return logs.filter(r => {
      const d = parseLocalDate(r.date || r.timestamp);
      return d && d >= start && d <= end;
    });
  };

  // 카드 결제 기준일 범위 계산: cardPeriod(기준일)를 기준으로 [시작일, 종료일] 반환 — 결제 예정금액에 사용
  // refYear/refMonth(0-based)를 넘기면 해당 월 기준으로 계산, 생략 시 오늘 기준
  const getCardPeriodRange = (cardPeriod, refYear, refMonth) => {
    if (!cardPeriod) return [null, null];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const y = refYear != null ? refYear : today.getFullYear();
    const m = refMonth != null ? refMonth : today.getMonth(); // m: 0-based
    const periodDay = cardPeriod === '말일'
      ? new Date(y, m + 1, 0).getDate()
      : Number(cardPeriod);
    // 종료일: 해당 월의 periodDay일
    // refYear/refMonth가 주어진 경우 해당 월 기준으로 고정, 없으면 오늘 기준으로 밀기
    let endDate = new Date(y, m, periodDay);
    if (refYear == null && endDate < today) {
      endDate = new Date(y, m + 1, cardPeriod === '말일' ? new Date(y, m + 2, 0).getDate() : periodDay);
    }
    // 시작일: 종료일 기준 전달 periodDay+1일
    const ey = endDate.getFullYear(), em2 = endDate.getMonth();
    const prevMonthLastDay = new Date(ey, em2, 0).getDate();
    const startDay = Math.min(periodDay + 1, prevMonthLastDay);
    const startDate = new Date(ey, em2 - 1, startDay);
    return [startDate, endDate];
  };

  const filterByCardPeriod = (logs, cardPeriod) => {
    const [start, end] = getCardPeriodRange(cardPeriod);
    if (!start || !end) return logs;
    return logs.filter(r => {
      const d = parseLocalDate(r.date || r.timestamp);
      return d && d >= start && d <= end;
    });
  };

  // --- Calculations ---
  const accountStatsList = useMemo(() => {
    const rate = toPureNumber(exchangeRate) || 1392;
    return accounts.map(acc => {
      if (acc.type === 'loan') {
        return { id: acc.id, name: acc.name, type: 'loan', cash: 0, loanAmount: toPureNumber(acc.loanAmount), loanRate: acc.loanRate || '', loanPayDay: acc.loanPayDay || '', loanPeriod: acc.loanPeriod || '', loanDueDate: acc.loanDueDate || '', linkedAccId: acc.linkedAccId || '', loanProductName: acc.loanProductName || '', loanInterestCategory: acc.loanInterestCategory || '', totalValue: 0, rebalanceData: [], totalROI: 0, stockOnlyTotalValue: 0 };
      }
      const accStocks = stocks.filter(s => (s.accountId || 'default') === acc.id);
      const currentCash = toPureNumber(acc.cash);
      const isSavingsAcc = acc.type === 'savings';
      const isSpendingAcc = acc.type === 'spending';
      const isCardAcc = acc.type === 'card';
      let stockOnlyTotalValue = 0;
      let savingsExpectedTotal = 0;
      let futureTotalDiv = 0; // 🎯 핵심: 연간 총 예상 배당금 메모리 추가
      let spendingItemsTotal = 0;
      let cardItemsTotal = 0;
      let cardItemsNonNbbang = 0;

      accStocks.forEach(s => {
         const curP = (isSavingsAcc || isSpendingAcc || isCardAcc) ? 1 : toPureNumber(s.currentPrice);
         const mult = (s.isUSD && !isSavingsAcc && !isSpendingAcc && !isCardAcc) ? rate : 1;
         const qty = toPureNumber(s.quantity);
         stockOnlyTotalValue += curP * qty * mult;

         if (isSavingsAcc) {
           const R = toPureNumber(s.interestRate) / 100;
           const expected = s.interestType === '복리' ? qty * Math.pow(1 + R, 1) : qty * (1 + R);
           savingsExpectedTotal += Math.floor(expected);
         } else if (isSpendingAcc) {
           spendingItemsTotal += qty;
         } else if (isCardAcc) {
           // N빵 결제자 로그(isNbbang=false, myInNbbang 있음)만 포함, 대상자 로그(isNbbang=true) 제외
           const rawLogs = (tradeLogs || []).filter(r => r.cardName === s.name && r.paymentMethod === '신용카드' && !r.isNbbang);
           const cardLogs = filterByCurrentMonth(rawLogs);
           // 총 카드 사용금액: 전체 결제금액 (N빵이면 totalAmount, 아니면 amount)
           const totalUsed = cardLogs.reduce((sum, r) => {
             const full = r.totalAmount ? Number(r.totalAmount) : toPureNumber(r.amount);
             return sum + full;
           }, 0);
           // 내 실부담 금액: 내가 N빵 멤버인 경우만 내 몫(amount) 포함, 나 제외 N빵은 제외
           const myUsed = cardLogs.filter(r => !r.nbbangCount || r.nbbangCount <= 1 || r.myInNbbang !== false)
             .reduce((sum, r) => sum + toPureNumber(r.amount), 0);
           cardItemsTotal += totalUsed;
           cardItemsNonNbbang += myUsed;
         } else {
           // 🎯 핵심: 종목별 배당 주기(월, 분기, 연 등)를 파악해 1년치 합산 계산
           const divFreq = getPayoutsPerYear(s.divFreq || '월');
           const divPerShare = toPureNumber(s.divPerShare);
           futureTotalDiv += (qty * divPerShare * mult * divFreq);
         }
      });

      let totalInvestedKRW = 0, totalValueKRW = 0, totalReceivedDivKRW = 0, ratioSum = 0;
      const rebalanceData = accStocks.map(s => {
        const curP = isSavingsAcc ? 1 : toPureNumber(s.currentPrice);
        const buyP = isSavingsAcc ? 1 : toPureNumber(s.buyPrice);
        const qty = toPureNumber(s.quantity);
        const mult = (s.isUSD && !isSavingsAcc) ? rate : 1;
        const targetR = toPureNumber(s.targetRatio);
        
        let divRecAllTime = 0;
        Object.values(s.dividendTimeline || {}).forEach(val => divRecAllTime += toPureNumber(val));
        
        const investedKRW = buyP * qty * mult;
        const currentValueKRW = curP * qty * mult;
        const currentRatio = stockOnlyTotalValue > 0 ? (currentValueKRW / stockOnlyTotalValue) * 100 : 0;
        
        totalInvestedKRW += investedKRW; 
        totalValueKRW += currentValueKRW; 
        totalReceivedDivKRW += divRecAllTime; 
        ratioSum += targetR;
        
        // 🎯 변경: 목표수량 계산 시 공용 '지갑'이 아닌 '현재 계좌의 잔고'를 기준으로 변경
        const allocatedCash = currentCash * (targetR / 100);
        let recommendedShares = (curP > 0 && mult > 0) ? Math.floor(allocatedCash / (curP * mult)) : 0;

        return {
          ...s, currentRatio, recShares: recommendedShares, recommendedAmountKRW: recommendedShares * curP * mult,
          stockROI: investedKRW > 0 ? ((currentValueKRW - investedKRW + divRecAllTime) / investedKRW) * 100 : 0,
          stockProfitKRW: (currentValueKRW - investedKRW) + divRecAllTime, investedKRW
        };
      });
      
      const totalProfitKRW = (totalValueKRW - totalInvestedKRW) + totalReceivedDivKRW;
      const futureExpectedTotalROI = stockOnlyTotalValue > 0 ? (futureTotalDiv / stockOnlyTotalValue) * 100 : 0;

      return {
        id: acc.id, name: acc.name, cash: currentCash, type: acc.type || 'stock', label: acc.label || '입출금 통장',
        totalInvestedKRW, totalValue: totalValueKRW, totalProfitKRW, totalReceivedDivKRW,
        totalROI: totalInvestedKRW > 0 ? (totalProfitKRW / totalInvestedKRW) * 100 : 0,
        totalRatio: ratioSum, stockOnlyTotalValue, savingsExpectedTotal, rebalanceData,
        futureTotalDiv, futureExpectedTotalROI, spendingItemsTotal, cardItemsTotal, cardItemsNonNbbang // UI에 뿌려줄 데이터 반환
      };
    });
  }, [accounts, stocks, exchangeRate, currentYearNum, tradeLogs]);

  const globalStats = useMemo(() => {
    let globalInvested = 0, globalValue = 0, globalProfit = 0, accountCashSum = 0, globalReceivedDiv = 0, cardNonNbbangTotal = 0;
    const rate = toPureNumber(exchangeRate) || 1392;
    accounts.forEach(acc => {
      const isSav = acc.type === 'savings';
      const isCard = acc.type === 'card';
      const cStocks = stocks.filter(s => (s.accountId || 'default') === acc.id);
      let tInvested = 0, tValue = 0, tDiv = 0;
      cStocks.forEach(s => {
        if (isCard) {
          // N빵 결제자 로그(isNbbang=false)만 포함, 대상자 로그(isNbbang=true) 제외
          const rawLogs = (tradeLogs || []).filter(r => r.cardName === s.name && r.paymentMethod === '신용카드' && !r.isNbbang);
          const cardLogs = filterByCurrentMonth(rawLogs);
          // 내 실부담 금액: 내가 N빵 멤버인 경우만 내 몫 포함, 나 제외 N빵은 제외
          const myUsed = cardLogs.filter(r => !r.nbbangCount || r.nbbangCount <= 1 || r.myInNbbang !== false)
            .reduce((sum, r) => sum + toPureNumber(r.amount), 0);
          cardNonNbbangTotal += myUsed;
          return;
        }
        const qty = toPureNumber(s.quantity), curP = isSav ? 1 : toPureNumber(s.currentPrice), buyP = isSav ? 1 : toPureNumber(s.buyPrice), mult = (s.isUSD && !isSav) ? rate : 1;
        tInvested += buyP * qty * mult; tValue += curP * qty * mult;
        Object.values(s.dividendTimeline || {}).forEach(v => tDiv += toPureNumber(v));
      });
      if (!isCard && acc.type !== 'loan') {
        globalInvested += tInvested; globalValue += tValue; globalReceivedDiv += tDiv;
        globalProfit += (tValue - tInvested) + tDiv; accountCashSum += toPureNumber(acc.cash);
      }
    });
    const totalLoanDebt = accounts.filter(a => a.type === 'loan').reduce((s, a) => s + toPureNumber(a.loanAmount), 0);
    const totalAssets = globalValue + accountCashSum - cardNonNbbangTotal - totalLoanDebt;
    const totalPrincipal = globalInvested + accountCashSum;
    return { globalInvested, globalValue, globalProfit, accountCashSum, globalReceivedDiv, totalAssets, totalPrincipal, totalROI: globalInvested > 0 ? (globalProfit / globalInvested) * 100 : 0, totalLoanDebt };
  }, [accounts, stocks, exchangeRate, globalCash, tradeLogs]);

  // FIRE: 전체 연간 예상 배당금 합산 (모든 계좌의 divPerShare × quantity × 주기)
  const fireAnnualDiv = useMemo(() => {
    const rate = toPureNumber(exchangeRate) || 1392;
    return stocks.reduce((sum, s) => {
      const qty = toPureNumber(s.quantity);
      const divPer = toPureNumber(s.divPerShare);
      if (!qty || !divPer) return sum;
      const mult = s.isUSD ? rate : 1;
      const freq = getPayoutsPerYear(s.divFreq || '월');
      return sum + qty * divPer * mult * freq;
    }, 0);
  }, [stocks, exchangeRate]);

  // FIRE: 예상 연 수익률 계산
  // - 히스토리 12개월 미만: (시세차익 + 연간예상배당금) / 투자원금 (현재 스냅샷 기준)
  // - 히스토리 12개월 이상: 실제 CAGR (복리 기준 연환산)
  const fireCAGR = useMemo(() => {
    const sorted = [...historyRecords].sort((a, b) => a.id.localeCompare(b.id));
    const now = new Date();
    const monthsUsed = sorted.length >= 1
      ? (now.getFullYear() - sorted[0].year) * 12 + (now.getMonth() + 1 - sorted[0].month)
      : 0;

    if (monthsUsed >= 12 && sorted.length >= 2) {
      const oldest = sorted[0];
      const latest = sorted[sorted.length - 1];
      const yearsUsed = monthsUsed / 12;
      const basePrincipal = oldest.invested > 0 ? oldest.invested : oldest.current;
      if (!basePrincipal || basePrincipal <= 0 || latest.current <= 0) return null;
      const cagr = Math.pow(latest.current / basePrincipal, 1 / yearsUsed) - 1;
      return isFinite(cagr) && cagr > -1 ? parseFloat((cagr * 100).toFixed(1)) : null;
    } else {
      const capitalGain = globalStats.globalValue - globalStats.globalInvested;
      const annualDiv = fireAnnualDiv;
      const principal = globalStats.globalInvested;
      if (principal <= 0) return null;
      const roi = (capitalGain + annualDiv) / principal * 100;
      return isFinite(roi) ? parseFloat(roi.toFixed(1)) : null;
    }
  }, [historyRecords, globalStats.globalValue, globalStats.globalInvested, fireAnnualDiv]);


  // FIRE: 복리+저축+배당 월별 시뮬레이션으로 은퇴 기간 계산
  const fireYearsCalc = useMemo(() => {
    const r = (toPureNumber(expectedReturn) || (fireCAGR !== null ? fireCAGR : 5)) / 100 / 12;
    const pv = globalStats.totalAssets;
    // 월 저축액 + 월 예상 배당금을 합산한 월 현금흐름
    const monthlyDiv = fireAnnualDiv / 12;
    const pmt = (annualLimit || 0) + monthlyDiv;
    const target = fireTarget || 1000000000;
    if (pv >= target) return 0;
    if (r <= 0) {
      return pmt > 0 ? Math.max(0, target - pv) / pmt / 12 : Infinity;
    }
    let current = pv;
    for (let month = 1; month <= 12 * 100; month++) {
      current = current * (1 + r) + pmt;
      if (current >= target) return parseFloat((month / 12).toFixed(1));
    }
    return Infinity;
  }, [expectedReturn, globalStats.totalAssets, annualLimit, fireTarget, fireAnnualDiv]);

  const currentAccountStat = (() => {
    if (selectedAccountId && selectedAccountId.startsWith('__all__')) {
      const type = selectedAccountId.replace('__all__', '');
      const typeStats = accountStatsList.filter(a => a.type === type);
      if (typeStats.length === 0) return accountStatsList[0];
      const merged = {
        id: selectedAccountId, name: '전체', type,
        cash: typeStats.reduce((s, a) => s + a.cash, 0),
        totalValue: typeStats.reduce((s, a) => s + a.totalValue, 0),
        totalInvestedKRW: typeStats.reduce((s, a) => s + a.totalInvestedKRW, 0),
        totalProfitKRW: typeStats.reduce((s, a) => s + a.totalProfitKRW, 0),
        totalReceivedDivKRW: typeStats.reduce((s, a) => s + a.totalReceivedDivKRW, 0),
        stockOnlyTotalValue: typeStats.reduce((s, a) => s + a.stockOnlyTotalValue, 0),
        savingsExpectedTotal: typeStats.reduce((s, a) => s + (a.savingsExpectedTotal || 0), 0),
        futureTotalDiv: typeStats.reduce((s, a) => s + (a.futureTotalDiv || 0), 0),
        spendingItemsTotal: typeStats.reduce((s, a) => s + (a.spendingItemsTotal || 0), 0),
        cardItemsTotal: typeStats.reduce((s, a) => s + (a.cardItemsTotal || 0), 0),
        cardItemsNonNbbang: typeStats.reduce((s, a) => s + (a.cardItemsNonNbbang || 0), 0),
        loanAmount: typeStats.reduce((s, a) => s + (a.loanAmount || 0), 0),
        rebalanceData: typeStats.flatMap(a => a.rebalanceData),
        totalROI: 0, futureExpectedTotalROI: 0, totalRatio: 0,
      };
      const inv = merged.totalInvestedKRW;
      merged.totalROI = inv > 0 ? (merged.totalProfitKRW / inv) * 100 : 0;
      merged.futureExpectedTotalROI = merged.stockOnlyTotalValue > 0 ? (merged.futureTotalDiv / merged.stockOnlyTotalValue) * 100 : 0;
      return merged;
    }
    return accountStatsList.find(a => a.id === selectedAccountId) || accountStatsList[0];
  })();
  
  const currentModalOtherRatioSum = useMemo(() => {
    if (!isModalOpen || !selectedAccountId) return 0;
    return stocks.filter(s => s.accountId === selectedAccountId && s.id !== editingStockId && s.targetRatio !== '').reduce((sum, s) => sum + toPureNumber(s.targetRatio), 0);
  }, [isModalOpen, stocks, selectedAccountId, editingStockId]);

  const currentModalTotalRatio = currentModalOtherRatioSum + (newStock.targetRatio ? toPureNumber(newStock.targetRatio) : 0);
  const isRatioExceededModal = currentAccountStat?.type === 'stock' && newStock.targetRatio !== '' && currentModalTotalRatio > 100;

  const isDuplicateStock = useMemo(() => {
    if (!newStock.name.trim()) return false;
    return stocks.some(s => s.accountId === selectedAccountId && s.id !== editingStockId && s.name === newStock.name);
  }, [stocks, selectedAccountId, editingStockId, newStock.name]);

  const chartDataFinal = useMemo(() => {
    const sorted = [...historyRecords].sort((a,b) => a.id.localeCompare(b.id));
    return chartViewMode === 'month' ? sorted.slice(-6).map(r => ({ label: `${r.month}월`, value: r.current })) : 
           Object.values(sorted.reduce((acc, r) => { acc[r.year] = r; return acc; }, {})).map(r => ({ label: `${r.year}년`, value: r.current }));
  }, [historyRecords, chartViewMode]);

  const chartPointsFinal = useMemo(() => {
    if (chartDataFinal.length === 0) return "";
    if (chartDataFinal.length === 1) return `0,50 L 100,50`; 
    const min = Math.min(...chartDataFinal.map(d=>d.value)) * 0.9;
    const range = (Math.max(...chartDataFinal.map(d=>d.value)) - min) || 1;
    return chartDataFinal.map((d, i) => `${(i/(chartDataFinal.length-1))*100},${100 - ((d.value-min)/range)*80-10}`).join(' L ');
  }, [chartDataFinal]);

  const sortedYears = useMemo(() => [...new Set(historyRecords.map(r => r.year))].sort((a,b)=>b-a), [historyRecords]);
  const groupedHistory = useMemo(() => {
    const groups = {};
    historyRecords.forEach(r => { if(!groups[r.year]) groups[r.year] = { records: [] }; groups[r.year].records.push(r); });
    Object.keys(groups).forEach(y => groups[y].records.sort((a,b)=>b.month-a.month));
    return groups;
  }, [historyRecords]);

  // 재테크 발자취 데이터 고도화 (Year -> Month -> Type)
  const groupedTradeLogs = useMemo(() => {
    const acc = {};
    (tradeLogs || []).forEach(log => {
      if (!log || !log.date) return;
      const year = log.date.substring(0, 4);
      const month = log.date.substring(5, 7);
      const type = log.type || '기타';

      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = {};
      
      // 🎯 핵심 에러 해결: 데이터를 넣을 '수익', '소비' 서랍장이 없으면 뻗지 않고 알아서 빈 서랍을 만듭니다!
      if (!acc[year][month][type]) acc[year][month][type] = [];

      acc[year][month][type].push(log);
    });
    return acc;
  }, [tradeLogs]);

  const easterEgg = useMemo(() => {
    const assets = globalStats.totalAssets;
    if (assets >= 100000000) return { img: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=King&backgroundColor=fbbf24', msg: '👑 경제적 자유!' };
    if (assets >= 50000000) return { img: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Star&backgroundColor=fcd34d', msg: '⭐ 투자 달인!' };
    return { img: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Smile&backgroundColor=6ee7b7', msg: '🏃 부자 되기!' };
  }, [globalStats.totalAssets]);

  const filteredSList = STOCK_DATABASE.filter(d => !d.isETF && (d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.ticker.toLowerCase().includes(searchQuery.toLowerCase())));
  const filteredEList = STOCK_DATABASE.filter(d => d.isETF && (d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.ticker.toLowerCase().includes(searchQuery.toLowerCase())));
  const savingsAccs = accounts.filter(a => a.type === 'savings');

  // 성장일기 자동 동기화 — 대출 제외 순수 +자산만 기록
  useEffect(() => {
    const positiveAssets = globalStats.totalAssets + globalStats.totalLoanDebt;
    if (positiveAssets === 0) return;
    const id = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;

    setHistoryRecords(prev => {
      const cur = prev.find(r => r.id === id);
      if (cur && cur.current === positiveAssets && cur.dividend === globalStats.globalReceivedDiv && cur.invested === globalStats.totalPrincipal && cur.profit === globalStats.globalProfit) {
        return prev;
      }
      const rec = { id, year: currentYearNum, month: currentMonthNum, invested: globalStats.totalPrincipal, current: positiveAssets, profit: globalStats.globalProfit, roi: globalStats.totalROI, dividend: globalStats.globalReceivedDiv };
      const newHistory = [rec, ...prev.filter(r => r.id !== id)].sort((a,b) => b.id.localeCompare(a.id));
      return newHistory;
    });
  }, [globalStats, currentYearNum, currentMonthNum]);

  // 포트폴리오 탭 타입 동기화 (전체 모드는 건드리지 않음)
  useEffect(() => {
    if (!selectedAccountId || selectedAccountId.startsWith('__all__')) return;
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (acc) setPortfolioTypeTab(acc.type || 'stock');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  // --- Handlers ---
  const showToast = (text) => {
    setToastMsg(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2000);
  };

  const dismissToast = () => {
    setToastMsg('');
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  };

  const showConfirm = (message, onConfirm, onCancel = null) => {
    setConfirmModal({ isOpen: true, message, onConfirm, onCancel });
  };

  const showInputModal = (title, placeholder, defaultValue, onConfirm) => {
    setInputModalValue(defaultValue);
    setInputModal({ isOpen: true, title, placeholder, defaultValue, onConfirm });
  };

  const openSettings = () => {
    setEditTitle(appTitle);
    setEditSubtitle(appSubtitle);
    setEditCharacterName(characterName);
    setEditProfileImage(profileImage);
    setIsEditHeaderOpen(true); 
  };

  const saveStateToHistory = () => {
    setPastStates(prev => [...prev, {
      stocks: JSON.parse(JSON.stringify(stocks)),
      accounts: JSON.parse(JSON.stringify(accounts)),
      historyRecords: JSON.parse(JSON.stringify(historyRecords)),
      globalCash: globalCash
    }].slice(-20));
    setFutureStates([]); 
  };

  const handleUndo = () => {
    if (pastStates.length === 0) return;
    const last = pastStates[pastStates.length - 1];
    setFutureStates([ { stocks, accounts, historyRecords, globalCash }, ...futureStates ]);
    setPastStates(pastStates.slice(0, -1));
    setStocks(last.stocks); setAccounts(last.accounts); setHistoryRecords(last.historyRecords); setGlobalCash(last.globalCash);
  };

  const handleRedo = () => {
    if (futureStates.length === 0) return;
    const next = futureStates[0];
    setPastStates([ ...pastStates, { stocks, accounts, historyRecords, globalCash } ]);
    setFutureStates(futureStates.slice(1));
    setStocks(next.stocks); setAccounts(next.accounts); setHistoryRecords(next.historyRecords); setGlobalCash(next.globalCash);
  };

  const saveConfig = (accs, fx, title = appTitle, subtitle = appSubtitle, charName = characterName, theme = appTheme, gCash = globalCash, zLevel = zoomLevel) => {
  };

  const saveTypeCustom = (updated) => {
    setTypeCustom(updated);
    localStorage.setItem('kj_type_custom', JSON.stringify(updated));
  };

  const logTrade = (tradeDetails) => {
    const newLog = { id: Date.now().toString(), date: dateString, timestamp: Date.now(), ...tradeDetails };
    const updatedLogs = [newLog, ...tradeLogs];
    setTradeLogs(updatedLogs);
  };

  const handleMoneyLogSubmit = () => {
    const amt = toPureNumber(incomeAmount);
    if (amt <= 0) return;
    saveStateToHistory();

    const isExpense = incomeMode === 'expense';
    let myShare = amt;
    let finalNbbangCount = 1;
    let finalNbbangNames = '';
    let perPersonShare = 0;

    if (isExpense && isNbbang) {
      const validPeople = nbbangList.filter(n => n.name.trim() !== '');
      finalNbbangCount = validPeople.length;
      if (finalNbbangCount > 0) {
        perPersonShare = Math.ceil(amt / finalNbbangCount);
        // 내 몫 = 전체 - 멤버들 몫 합산 (올림처리 나머지를 내가 부담)
        myShare = amt - perPersonShare * (finalNbbangCount - 1);
        finalNbbangNames = validPeople.map(n => n.name.trim()).join(', ');
      }
    }

    let updatedGlobalCash = Number(globalCash);
    let updatedAccs = [...accounts];
    let updatedStocks = [...stocks];
    let isPaidNow = false;

    if (!isExpense) {
      if ((incomeMode === 'bonus' || incomeMode === 'salary') && bonusDestAccId && bonusDestAccId !== 'wallet') {
        if (bonusDestAccId.startsWith('stock:')) {
          const stockId = bonusDestAccId.replace('stock:', '');
          updatedStocks = updatedStocks.map(s => String(s.id) === stockId ? { ...s, quantity: String(toPureNumber(s.quantity) + amt) } : s);
        } else {
          const accId = bonusDestAccId.replace('acc:', '');
          updatedAccs = updatedAccs.map(a => a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) + amt) } : a);
        }
      } else {
        updatedGlobalCash += amt;
      }
      isPaidNow = true;
    } else {
      if (paymentMethod === '현금') {
        if (cashSource && cashSource !== 'transfer') {
          if (spendingItem) {
            const item = updatedStocks.find(s => s.id === spendingItem);
            const benefit = toPureNumber(item?.benefit) || 0;
            const wid = item?.withdrawAccId || '';
            if (wid.startsWith('stock:')) {
              // 출금계좌 연동 항목: CMA에서 차감, 혜택%는 소비항목에 적립
              const srcId = String(wid.slice(6));
              const src = updatedStocks.find(s => String(s.id) === srcId);
              const pointBal = toPureNumber(item?.quantity) || 0;
              let pointUsed = 0;
              let cashNeeded = myShare;
              if (useSpendingPoint && pointBal > 0) {
                pointUsed = Math.min(pointBal, myShare);
                cashNeeded = myShare - pointUsed;
              }
              if (!src || toPureNumber(src.quantity) < cashNeeded) { showToast("⚠️ 출금 계좌 잔액이 부족합니다."); return; }
              const accumulation = Math.floor(myShare * benefit / 100);
              updatedStocks = updatedStocks.map(s => {
                if (String(s.id) === String(spendingItem)) return { ...s, quantity: String(pointBal - pointUsed + accumulation) };
                if (String(s.id) === srcId) return { ...s, quantity: String(toPureNumber(s.quantity) - cashNeeded) };
                return s;
              });
              if (accumulation > 0) showToast(`✅ ₩${formatNum(accumulation)} 적립!`);
            } else {
              if (!item || toPureNumber(item.quantity) < myShare) { showToast("⚠️ 잔액이 부족합니다."); return; }
              const accumulation = Math.floor(myShare * benefit / 100);
              updatedStocks = updatedStocks.map(s => s.id === spendingItem ? { ...s, quantity: String(toPureNumber(s.quantity) - myShare + accumulation) } : s);
              if (accumulation > 0) showToast(`✅ ₩${formatNum(accumulation)} 적립!`);
            }
          }
        } else if (cashSource === 'transfer' && transferAccId) {
          if (transferAccId.startsWith('stock:')) {
            const stockId = transferAccId.replace('stock:', '');
            const src = updatedStocks.find(s => String(s.id) === stockId);
            if (!src || toPureNumber(src.quantity) < myShare) { showToast("⚠️ 잔액이 부족합니다."); return; }
            updatedStocks = updatedStocks.map(s => String(s.id) === stockId ? { ...s, quantity: String(toPureNumber(s.quantity) - myShare) } : s);
          } else {
            const accId = transferAccId.startsWith('acc:') ? transferAccId.replace('acc:', '') : transferAccId;
            const srcAcc = updatedAccs.find(a => a.id === accId);
            if (!srcAcc || toPureNumber(srcAcc.cash) < myShare) { showToast("⚠️ 계좌 잔액이 부족합니다."); return; }
            updatedAccs = updatedAccs.map(a => a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) - myShare) } : a);
          }
        } else {
          isPaidNow = true;
        }
        isPaidNow = true;
      } else {
        const selectedCardInfo = myCards.find(c => c.name === selectedCard)
          || stocks.find(s => s.name === selectedCard && accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'card');
        const isCredit = selectedCardInfo?.cardType === '신용';
        const linkedAccId = selectedCardInfo?.linkedAcc || selectedCardInfo?.cardLinkedAcc || '';
        const deductFrom = linkedAccId || '';
        if (isCredit) {
          isPaidNow = false;
        } else if (deductFrom.startsWith('stock:')) {
          const stockId = deductFrom.replace('stock:', '');
          const targetStock = updatedStocks.find(s => String(s.id) === stockId);
          if (!targetStock || toPureNumber(targetStock.quantity) < myShare) { showToast("⚠️ 연동된 통장 잔액이 부족합니다."); return; }
          updatedStocks = updatedStocks.map(s => String(s.id) === stockId ? { ...s, quantity: String(toPureNumber(s.quantity) - myShare) } : s);
          isPaidNow = true;
        } else if (deductFrom) {
          const acc = updatedAccs.find(a => a.id === deductFrom);
          if (!acc || toPureNumber(acc.cash) < myShare) { showToast("⚠️ 연동된 계좌 잔액이 부족합니다."); return; }
          updatedAccs = updatedAccs.map(a => a.id === deductFrom ? { ...a, cash: String(toPureNumber(a.cash) - myShare) } : a);
          isPaidNow = true;
        } else {
          isPaidNow = false;
        }
      }
    }

    setGlobalCash(updatedGlobalCash);
    setAccounts(updatedAccs);
    setStocks(updatedStocks);

    let logType = 'income'; let logCat = '기타'; let logName = ''; let logMemo = expenseMemo;
    if (incomeMode === 'salary') { logCat = '급여'; logName = '월급 입금'; }
    else if (incomeMode === 'bonus') { const cat = incomeCategory.trim() || '기타 수익'; logCat = cat; logName = `${cat} 입금`; }
    else if (incomeMode === 'expense') { logType = 'expense'; logCat = expenseCategory.trim() || '기타'; logName = expenseMemo || '소비'; }

    let finalDate = new Date().toISOString().substring(0, 10);
    if (expenseDateInput && expenseDateInput.length === 5) {
      const year = new Date().getFullYear();
      finalDate = `${year}-${expenseDateInput.replace('/', '-')}`;
    }

    let logsToAdd = [];
    const baseLog = {
      type: logType, name: logName, category: logCat, amount: myShare, totalAmount: amt,
      memo: logMemo, paymentMethod: isExpense ? paymentMethod : null, cardName: selectedCard || null,
      isPaid: isPaidNow, isNbbang: isExpense ? isNbbang : false, nbbangCount: finalNbbangCount, nbbangNames: finalNbbangNames, perPersonShare: perPersonShare,
      date: finalDate, timestamp: Date.now()
    };

    if (isExpense && isNbbang && finalNbbangCount > 1) {
      const cleanLogName = logName.replace(/\(.*?(몫|분)\)/g, '').trim();
      const validPeople = nbbangList.filter(n => n.name.trim() !== '');
      // 내 이름이 멤버 목록에 있는지 확인
      const myName = (myDisplayName || '').trim();
      const iAmInList = myName && validPeople.some(p => p.name.trim() === myName);
      // 항상 payer log 생성 (카드 총 사용금액 추적용)
      // iAmInList=true → myInNbbang:true (내 몫 소비로 반영)
      // iAmInList=false → myInNbbang:false (카드 총액에만 반영, 소비/N빵제외에서는 제외)
      const myLogAmount = iAmInList ? myShare : amt;
      const myLog = { ...baseLog, id: Date.now().toString() + '_0', name: cleanLogName, isNbbang: false, myInNbbang: iAmInList ? true : false, amount: myLogAmount };
      logsToAdd.push(myLog);
      validPeople.filter(p => p.name.trim() !== myName).forEach((p, idx) => {
        logsToAdd.push({ ...baseLog, id: Date.now().toString() + '_' + (idx + 1), name: cleanLogName, category: logCat, amount: perPersonShare, timestamp: Date.now() + idx + 1, isNbbang: true, isSettled: false, nbbangTarget: p.name.trim() });
      });
      const updatedLogs = [...logsToAdd.reverse(), ...tradeLogs];
      setTradeLogs(updatedLogs);
    } else {
      logTrade(baseLog);
    }

    if (logCat === '고정비' && logName.trim()) {
      const today2 = new Date();
      const dayNum = expenseDateInput && expenseDateInput.length === 5
        ? Number(expenseDateInput.split('/')[0])
        : today2.getDate();
      const already = fixedExpenses.find(fe => fe.name === logName.trim());
      if (!already) {
        const newFe = { id: Date.now().toString(), name: logName.trim(), amount: myShare, day: dayNum, paymentMethod: isExpense ? paymentMethod : '현금', cardName: selectedCard || '' };
        setFixedExpenses(prev => [...prev, newFe]);
      }
    }
    setIncomeAmount(''); setIsNbbang(false); setIsNbbangConfirmed(false); setNbbangList([{id:Date.now(), name:''}]); setExpenseMemo(''); setExpenseDateInput(''); setBonusDestAccId(''); setUseSpendingPoint(false); setSelectedCard(''); setCashSource(''); setTransferAccId('');
    showToast(`🎉 ${logCat} 처리 완료!`);
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, updatedGlobalCash);

    // trade_logs 즉시 저장 (2초 디바운스 없이)
    if (session?.user?.id && isCloudDataLoaded) {
      const finalLogs = isExpense && isNbbang && finalNbbangCount > 1
        ? [...logsToAdd.reverse(), ...tradeLogs]
        : [{ ...baseLog, id: Date.now().toString() }, ...tradeLogs];
      supabase.from('app_data').upsert({
        user_id: session.user.id,
        global_cash: updatedGlobalCash,
        accounts: updatedAccs,
        stocks: updatedStocks,
        trade_logs: finalLogs,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) console.error("❌ 즉시 저장 실패:", error);
      });
    }
  };

  const handleExportData = () => {
    const backupData = JSON.stringify({ accounts, stocks, historyRecords, tradeLogs, globalCash, appTitle, appSubtitle, characterName, appTheme, zoomLevel, exchangeRate, profileImage, monthlyGoals });
    navigator.clipboard.writeText(backupData).then(() => showToast("✅ 복사되었습니다! 메모장에 보관하세요.")).catch(() => showToast("❌ 복사에 실패했습니다."));
  };
  
  const handleImportData = () => {
    showInputModal('백업 데이터 붙여넣기', '복사해둔 백업 데이터를 여기에 붙여넣기 하세요', '', (input) => {
      if (!input) return;
      try {
        const data = JSON.parse(input);
        if (data.accounts) setAccounts(data.accounts);
        if (data.stocks) setStocks(data.stocks);
        if (data.historyRecords) setHistoryRecords(data.historyRecords);
        if (data.tradeLogs) setTradeLogs(data.tradeLogs);
        if (data.globalCash !== undefined) setGlobalCash(data.globalCash);
        if (data.appTitle) setAppTitle(data.appTitle);
        if (data.appSubtitle) setAppSubtitle(data.appSubtitle);
        if (data.characterName) setCharacterName(data.characterName);
        if (data.appTheme) setAppTheme(data.appTheme);
        if (data.zoomLevel) setZoomLevel(data.zoomLevel);
        if (data.exchangeRate) setExchangeRate(data.exchangeRate);
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.monthlyGoals) setMonthlyGoals(data.monthlyGoals);
        saveConfig(data.accounts || accounts, data.exchangeRate || exchangeRate, data.appTitle || appTitle, data.appSubtitle || appSubtitle, data.characterName || characterName, data.appTheme || appTheme, data.globalCash ?? globalCash, data.zoomLevel || zoomLevel);
        showToast("✅ 복원되었습니다!");
      } catch (e) { showToast("❌ 데이터 형식이 올바르지 않습니다."); }
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // 🎯 너무 큰 이미지는 캔버스로 리사이즈해서 저장 (DB 용량 절약 + 빠른 로딩)
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256; // 프로필은 256px이면 충분
        const canvas = document.createElement('canvas');
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        // 🎯 모달 내 미리보기 + 메인 화면 캐릭터 동시 즉시 반영
        setEditProfileImage(compressed);
        setProfileImage(compressed);
        showToast("✅ 프로필 사진이 변경되었습니다!");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddClick = () => {
    const blankStock = {
      name: '', ticker: '', buyPrice: '', quantity: '', targetRatio: '', isUSD: false,
      currentPrice: '', dividendTimeline: {}, divPerShare: '', divFreq: '월', divDay: '15', divMonths: [], divExDay: '1', divExMonths: [],
      maturityDate: '', interestRate: '', interestType: '단리', benefit: '',
      cardType: '체크', performance: '', isNbbang: false, cardPayDay: '', cardPeriod: '', cardLinkedAcc: 'wallet',
      withdrawAccId: ''
    };
    if (selectedAccountId && selectedAccountId.startsWith('__all__')) {
      const type = selectedAccountId.replace('__all__', '');
      const typeAccs = accounts.filter(a => a.type === type);
      if (typeAccs.length === 0) return showToast('⚠️ 먼저 계좌를 추가해주세요.');
      setModalTargetAccId(typeAccs[0].id);
      setModalOpenedFromAll(typeAccs.length > 1);
      setEditingStockId(null);
      setNewStock(blankStock);
      setSearchQuery('');
      setTickerQuery('');
      setIsModalOpen(true);
      return;
    }
    setModalTargetAccId(selectedAccountId);
    setModalOpenedFromAll(false);
    setEditingStockId(null);
    setNewStock(blankStock);
    setSearchQuery('');
    setTickerQuery('');
    setIsModalOpen(true);
  };

  const handleEditClick = (stock) => {
    setEditingStockId(stock.id);
    setModalTargetAccId(stock.accountId || selectedAccountId);
    setModalOpenedFromAll(false);
    setNewStock({ ...stock });
    setSearchQuery(stock.name);
    setIsModalOpen(true);
  };

  const handleDeleteStock = (e, id) => {
    if (e) e.stopPropagation();
    const target = stocks.find(s=>s.id === id);
    setConfirmModal({
      isOpen: true, message: "정말 이 항목을 삭제하시겠습니까?\n기록이 완전히 지워집니다.", 
      onConfirm: () => {
        saveStateToHistory();
        const updated = stocks.filter(s => s.id !== id);
        setStocks(updated);
        const updatedLogs = tradeLogs.filter(log => log.name !== target.name);
        setTradeLogs(updatedLogs);
        showToast("🗑️ 삭제되었습니다.");
      }
    });
  };

  const handleReceiveDividend = (e, s) => {
    e.stopPropagation();
    saveStateToHistory();
    const mId = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;
    const qty = toPureNumber(s.quantity);
    const divPer = toPureNumber(s.divPerShare);
    const mult = s.isUSD ? toPureNumber(exchangeRate) : 1;
    const totalDiv = qty * divPer * mult; 
    
    const updatedTimeline = { ...(s.dividendTimeline || {}), [mId]: String((toPureNumber(s.dividendTimeline?.[mId]) || 0) + totalDiv) };
    const updatedStock = { ...s, dividendTimeline: updatedTimeline };
    
    // 🎯 출처 변경: 배당금을 공용 지갑이 아닌 해당 계좌(accountId) 잔고로 입금!
    const accountId = s.accountId || 'default';
    const updatedAccs = accounts.map(a => a.id === accountId ? { ...a, cash: String(toPureNumber(a.cash) + totalDiv) } : a);
    
    const newStocks = stocks.map(item => item.id === s.id ? updatedStock : item);
    setStocks(newStocks);
    setAccounts(updatedAccs); // 계좌 업데이트
    setPendingDivs(p => ({...p, [s.id]: false}));
    logTrade({ type: 'dividend', name: s.name, amount: totalDiv });
    showToast(`💰 배당금이 계좌로 입금되었습니다!`);
    
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
  };

  const handleEditAccountSubmit = (e) => {
    e.preventDefault();
    if (!editAccountName.trim()) return;
    saveStateToHistory();
    const updated = accounts.map(a => a.id === (editingAccountId || selectedAccountId) ? { ...a, name: editAccountName } : a);
    setAccounts(updated);
    setIsEditAccountOpen(false);
    saveConfig(updated, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
    showToast("✅ 이름이 변경되었습니다.");
  };

  const handleEditLabelSubmit = (e) => {
    e.preventDefault();
    if (!editLabelInput.trim()) return;
    saveStateToHistory();
    const updated = accounts.map(a => a.id === selectedAccountId ? { ...a, label: editLabelInput } : a);
    setAccounts(updated);
    setIsEditLabelModalOpen(false);
    saveConfig(updated, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
    showToast("✅ 통장 이름이 변경되었습니다.");
  };

  const handleDeleteAccount = async (id) => {
    // 🎯 화면 상태만 지우면 2초 뒤 자동 저장 엔진이 알아서 app_data에 덮어씁니다.
    const deletedAcc = accounts.find(a => a.id === id);
    setAccounts(prev => prev.filter(a => a.id !== id));
    // 삭제된 계좌가 선택 중이었으면 해당 타입의 전체 보기로 이동
    if (selectedAccountId === id && deletedAcc) {
      setSelectedAccountId('__all__' + deletedAcc.type);
    }
    showToast("🗑️ 계좌가 삭제되었습니다.");
    setActiveCardId(null);
  };

  const handleUpdateAccount = async (id, updatedData) => {
    // 🎯 화면 상태만 수정하면 2초 뒤 자동 저장 엔진이 알아서 app_data에 덮어씁니다.
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updatedData } : a));
    showToast("✅ 계좌가 수정되었습니다.");
  };

  const handleTempTimelineChange = (sId, mId, val) => {
    const clean = val.replace(/[^0-9]/g, "");
    setTempTimelines(prev => ({
      ...prev,
      [sId]: { ...(prev[sId] || {}), [mId]: clean }
    }));
  };

  const handleDeleteHistory = (id) => {
    saveStateToHistory();
    const updated = historyRecords.filter(r => r.id !== id);
    setHistoryRecords(updated);
  };

  const handleDragStart = (e, index) => {
    setDraggedAccIdx(index);
    const emptyImage = new Image();
    emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    if(e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(emptyImage, 0, 0);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedAccIdx === null || draggedAccIdx === index) return;
    setAccounts(prevAccounts => {
      const newAccounts = [...prevAccounts];
      const draggedItem = newAccounts[draggedAccIdx];
      newAccounts.splice(draggedAccIdx, 1);
      newAccounts.splice(index, 0, draggedItem);
      return newAccounts;
    });
    setDraggedAccIdx(index); 
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => e.preventDefault();
  const handleDragEnd = () => {
    setDraggedAccIdx(null);
    saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
  };

  const handleItemWithdrawSubmit = async (e) => {
    e.preventDefault();
    const target = stocks.find(s => s.id === itemWithdrawModal.targetId);
    const amount = toPureNumber(itemWithdrawModal.amount);
    if (!target || amount <= 0) return showToast("⚠️ 금액을 올바르게 입력해주세요.");
    if (amount > toPureNumber(target.quantity)) return showToast("⚠️ 저축액(원금)이 부족합니다.");

    saveStateToHistory();
    const newQty = toPureNumber(target.quantity) - amount;
    const updatedStock = { ...target, quantity: String(newQty) };
    let updatedStocks = stocks.map(s => s.id === target.id ? updatedStock : s);
    
    let newGlobalCash = globalCash;
    let updatedAccs = [...accounts];

    const toAccId = itemWithdrawModal.toAccId || accounts[0]?.id || '';
    if (toAccId) {
      updatedAccs = updatedAccs.map(a => a.id === toAccId ? { ...a, cash: String(toPureNumber(a.cash) + amount) } : a);
      const targetName = accounts.find(a => a.id === toAccId)?.name;
      showToast(`💸 ₩${formatNum(amount)} '${targetName}'(으)로 이동 완료!`);
    }

    logTrade({ type: 'sell', name: target.name, shares: amount, sellPrice: 1, isUSD: false, profit: 0, roi: 0, notes: '저축 출금' });

    setItemWithdrawModal({ isOpen: false, targetId: null, amount: '', toAccId: accounts[0]?.id || '' });
    
    if (newQty === 0) {
      showConfirm("저축액을 전액 출금하였습니다.\n해당 항목을 삭제할까요?", () => {
        const finalStocks = updatedStocks.filter(s => s.id !== target.id);
        setStocks(finalStocks);
        setGlobalCash(newGlobalCash);
        setAccounts(updatedAccs);
        saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newGlobalCash);
      }, () => {
        setStocks(updatedStocks);
        setGlobalCash(newGlobalCash);
        setAccounts(updatedAccs);
        saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newGlobalCash);
      });
    } else {
      setStocks(updatedStocks);
      setGlobalCash(newGlobalCash);
      setAccounts(updatedAccs);
      saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newGlobalCash);
    }
  };

  const handleSavingsWithdrawSubmit = (e) => {
    e.preventDefault();
    const amount = toPureNumber(savingsWithdrawModal.amount);
    if (amount <= 0) return showToast("⚠️ 금액을 올바르게 입력해주세요.");
    const currAcc = accounts.find(a => a.id === selectedAccountId);
    if (amount > toPureNumber(currAcc.cash)) return showToast("⚠️ 통장 잔액이 부족합니다.");

    saveStateToHistory();
    let updatedAccs = accounts.map(a => a.id === selectedAccountId ? { ...a, cash: String(toPureNumber(a.cash) - amount) } : a);
    let newGlobalCash = globalCash; 

    const targetId = savingsWithdrawModal.targetAccId || accounts.find(a => a.id !== selectedAccountId)?.id || '';
    if (targetId) {
      updatedAccs = updatedAccs.map(a => a.id === targetId ? { ...a, cash: String(toPureNumber(a.cash) + amount) } : a);
      const targetName = accounts.find(a => a.id === targetId)?.name;
      showToast(`💸 ₩${formatNum(amount)} '${targetName}'(으)로 이동 완료!`);
    }

    setGlobalCash(newGlobalCash);
    setAccounts(updatedAccs);
    setSavingsWithdrawModal({ isOpen: false, amount: '', targetAccId: '' });
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newGlobalCash);
  };

  const handleInlineConsumeConfirm = () => {
    const amount = toPureNumber(inlineConsume.amount);
    if (amount <= 0) { setInlineConsume({ isOpen: false, amount: '' }); return; }
    const currAcc = accounts.find(a => a.id === selectedAccountId);
    if (amount > toPureNumber(currAcc.cash)) return showToast("⚠️ 입출금 통장의 잔액이 부족합니다.");

    saveStateToHistory();
    const updatedAccs = accounts.map(a => a.id === selectedAccountId ? { ...a, cash: String(toPureNumber(a.cash) - amount) } : a);
    setAccounts(updatedAccs);
    setInlineConsume({ isOpen: false, amount: '' });
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
    showToast(`🛍️ ${formatNum(amount)}원을 소비했습니다!`);
  };

  const handleAddAccountSubmit = (e) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    saveStateToHistory();
    const newAcc = { id: 'acc_' + Date.now(), name: newAccountName, cash: "0", type: newAccountType, label: '입출금 통장' };
    const updated = [...accounts, newAcc];
    setAccounts(updated); setSelectedAccountId(newAcc.id); setIsAddAccountOpen(false); setNewAccountName('');
    saveConfig(updated, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
    showToast(`✅ 계좌가 생성되었습니다.`);
  };

  const handleIntegratedInvestSubmit = (e, type) => {
    e.preventDefault();
    const amount = toPureNumber(investInput);
    if (amount <= 0) return showToast("⚠️ 이체할 금액을 입력해주세요.");
    
    saveStateToHistory();
    let updatedAccs = [...accounts];

    if (investTab === 'transfer') {
      const activeFromId = transferFromId || (accounts[0] ? accounts[0].id : '');
      const activeToId = transferToId || (accounts[0] ? accounts[0].id : '');
      if (activeFromId === activeToId) return showToast("⚠️ 보내는 계좌와 받는 계좌가 같습니다.");

      const fromAcc = updatedAccs.find(a => a.id === activeFromId);
      if (!fromAcc || toPureNumber(fromAcc.cash) < amount) return showToast("⚠️ 출금 계좌의 잔액이 부족합니다.");
      updatedAccs = updatedAccs.map(a => a.id === activeFromId ? { ...a, cash: String(toPureNumber(a.cash) - amount) } : a);
      updatedAccs = updatedAccs.map(a => a.id === activeToId ? { ...a, cash: String(toPureNumber(a.cash) + amount) } : a);
      showToast(`✅ ₩${formatNum(amount)} 성공적으로 이체되었습니다.`);
    }

    setAccounts(updatedAccs);
    setIsInvestModalOpen(false);
    setInvestInput('');
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
  };

  const handleBatchBuyConfirm = () => {
    saveStateToHistory();
    let totalCost = 0;
    let newStocks = [...stocks];
    const rate = toPureNumber(exchangeRate) || 1392;
    const accountId = currentAccountStat.id;
    const currentCash = toPureNumber(currentAccountStat.cash);

    currentAccountStat.rebalanceData.forEach(s => {
      const sharesToBuy = batchBuyInputs[s.id] !== undefined ? batchBuyInputs[s.id] : s.recShares;
      if (sharesToBuy > 0) {
        const mult = s.isUSD ? rate : 1;
        const price = toPureNumber(s.currentPrice);
        const cost = sharesToBuy * price * mult;
        totalCost += cost;

        const q = toPureNumber(s.quantity);
        const b = toPureNumber(s.buyPrice);
        const newQty = q + sharesToBuy;
        const newBuyPrice = ((b * q) + (price * sharesToBuy)) / newQty;

        newStocks = newStocks.map(item => item.id === s.id ? { ...item, quantity: String(newQty), buyPrice: String(newBuyPrice) } : item);
      }
    });

    if (totalCost === 0) return showToast("⚠️ 매수할 항목이 없습니다.");
    if (totalCost > currentCash) return showToast(`⚠️ 계좌 잔액이 부족합니다. (필요: ₩${formatNum(totalCost)})`);

    const newCash = currentCash - totalCost;
    const updatedAccs = accounts.map(a => a.id === accountId ? { ...a, cash: String(newCash) } : a);

    setStocks(newStocks);
    setAccounts(updatedAccs);
    setIsBatchBuyModalOpen(false);
    showToast(`✅ 일괄 매수 완료! (계좌 잔고 ₩${formatNum(totalCost)} 차감)`);
    
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
  };

  const handleRebalanceBuyBatch = () => {
    const addCash = toPureNumber(rebalanceInvestAmount);
    const currentCash = toPureNumber(currentAccountStat.cash);
    if (addCash <= 0 || addCash > currentCash) return showToast("⚠️ 투자 금액(계좌 잔액 이내)을 확인해주세요.");

    saveStateToHistory();
    const targetTotalAsset = currentAccountStat.stockOnlyTotalValue + addCash;
    let totalCost = 0;
    let newStocks = [...stocks];
    const rate = toPureNumber(exchangeRate) || 1392;

    currentAccountStat.rebalanceData.forEach(s => {
      const targetValue = targetTotalAsset * (toPureNumber(s.targetRatio) / 100);
      const currentValue = toPureNumber(s.currentPrice) * toPureNumber(s.quantity) * (s.isUSD ? rate : 1);
      const diff = targetValue - currentValue;
      const sharesDiff = Math.floor(diff / (toPureNumber(s.currentPrice) * (s.isUSD ? rate : 1)));

      if (sharesDiff >= 1) {
        const price = toPureNumber(s.currentPrice);
        const cost = sharesDiff * price * (s.isUSD ? rate : 1);
        totalCost += cost;

        const q = toPureNumber(s.quantity);
        const b = toPureNumber(s.buyPrice);
        const newQty = q + sharesDiff;
        const newBuyPrice = ((b * q) + (price * sharesDiff)) / newQty;

        newStocks = newStocks.map(item => item.id === s.id ? { ...item, quantity: String(newQty), buyPrice: String(newBuyPrice) } : item);
      }
    });

    if (totalCost === 0) return showToast("⚠️ 매수할 항목이 없습니다.");
    if (totalCost > currentCash) return showToast(`⚠️ 계좌 잔액이 부족합니다.`);

    const newCash = currentCash - totalCost;
    const updatedAccs = accounts.map(a => a.id === currentAccountStat.id ? { ...a, cash: String(newCash) } : a);

    setStocks(newStocks);
    setAccounts(updatedAccs);
    setIsRebalanceModalOpen(false);
    showToast(`✅ 리밸런싱 매수 완료! (계좌 잔고 차감)`);
    
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
  };

  const handleSellStock = (e, id, qty) => {
    e.stopPropagation();
    const sellQty = toPureNumber(qty);
    if (sellQty <= 0) return showToast("⚠️ 매도할 수량을 입력해주세요.");
    const target = stocks.find(s => s.id === id);
    if (!target || toPureNumber(target.quantity) < sellQty) return showToast("⚠️ 수량이 부족합니다.");
    saveStateToHistory();
    
    const mult = target.isUSD ? toPureNumber(exchangeRate) : 1;
    const income = sellQty * toPureNumber(target.currentPrice) * mult;
    const newQty = toPureNumber(target.quantity) - sellQty;
    const updatedStock = { ...target, quantity: String(newQty) };

    const targetAcc = accounts.find(a => a.id === target.accountId);
    let updatedAccs = targetAcc
      ? accounts.map(a => a.id === targetAcc.id ? { ...a, cash: String(toPureNumber(a.cash) + income) } : a)
      : accounts;

    let updatedStocks = stocks.map(s => s.id === id ? updatedStock : s);
    setStocks(updatedStocks);
    setAccounts(updatedAccs);
    setPendingSells(p => ({...p, [id]: false}));
    setSellAmount('');

    const profit = income - (sellQty * toPureNumber(target.buyPrice) * mult);
    const roi = toPureNumber(target.buyPrice) > 0 ? ((toPureNumber(target.currentPrice) - toPureNumber(target.buyPrice)) / toPureNumber(target.buyPrice)) * 100 : 0;
    logTrade({ type: 'sell', name: target.name, shares: sellQty, sellPrice: target.currentPrice, isUSD: target.isUSD, profit, roi });
    showToast(`💰 ${targetAcc ? `'${targetAcc.name}'으로` : ''} 입금되었습니다.`);

    if (newQty === 0) {
      showConfirm("남은 주식을 전부 매도하였습니다.\n해당 카드를 삭제할까요?", () => {
        saveStateToHistory();
        const finalStocks = updatedStocks.filter(s => s.id !== id);
        setStocks(finalStocks);
        setAccounts(updatedAccs);
        saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
      }, () => {
        setStocks(updatedStocks);
        setAccounts(updatedAccs);
        saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
      });
    } else {
      setStocks(updatedStocks);
      setAccounts(updatedAccs);
      saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
    }
  };

  const handleBuyStock = (e, id, shares) => {
    e.stopPropagation();
    const target = stocks.find(s => s.id === id);
    if (!target) return;
    const buyQty = toPureNumber(shares);
    if (buyQty <= 0) return showToast("⚠️ 매수할 수량을 입력해주세요.");
    
    const mult = target.isUSD ? toPureNumber(exchangeRate) : 1;
    const cost = buyQty * toPureNumber(target.currentPrice) * mult;
    
    // 🎯 출처 변경: 지갑 대신 해당 계좌 잔고 확인
    const account = accounts.find(a => a.id === target.accountId);
    const currentCash = toPureNumber(account?.cash || 0);
    if (cost > currentCash) return showToast("⚠️ 계좌 잔액이 부족합니다.");
    
    saveStateToHistory(); 
    
    const q = toPureNumber(target.quantity), b = toPureNumber(target.buyPrice), c = toPureNumber(target.currentPrice);
    const updatedStock = { ...target, quantity: String(q + buyQty), buyPrice: String(((b * q) + (c * buyQty)) / (q + buyQty)) };
    
    const newCash = currentCash - cost;
    const updatedAccs = accounts.map(a => a.id === account.id ? { ...a, cash: String(newCash) } : a);
    const updatedStocks = stocks.map(s => s.id === id ? updatedStock : s);
    
    setStocks(updatedStocks);
    setAccounts(updatedAccs);
    setPendingBuys(p => ({...p, [id]: false})); 
    setBuyAmount('');
    logTrade({ type: 'buy', name: target.name, shares: buyQty, price: target.currentPrice, total: cost, isUSD: target.isUSD });
    showToast(`🛒 매수 완료! (계좌 잔고 차감)`);
    
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
  };

  const handleSavingsDeposit = (e, id) => {
    e.stopPropagation();
    const amount = toPureNumber(depositAmount);
    if (amount <= 0) return showToast("⚠️ 금액을 입력해주세요.");

    saveStateToHistory();
    let updatedAccs = [...accounts];
    let updatedGlobalCash = globalCash;

    if (depositSourceId) {
      const sourceAcc = accounts.find(a => a.id === depositSourceId);
      if (!sourceAcc || toPureNumber(sourceAcc.cash) < amount) return showToast("⚠️ 선택 계좌의 잔액이 부족합니다.");
      updatedAccs = updatedAccs.map(a => a.id === depositSourceId ? { ...a, cash: String(toPureNumber(a.cash) - amount) } : a);
    }

    const target = stocks.find(s => s.id === id);
    if (!target) return;
    
    const updatedStock = { ...target, quantity: String(toPureNumber(target.quantity) + amount) };
    const updatedStocks = stocks.map(s => s.id === id ? updatedStock : s);
    
    setStocks(updatedStocks);
    setGlobalCash(updatedGlobalCash);
    setAccounts(updatedAccs);
    setActiveDepositId(null);
    setDepositAmount('');
    setDepositSourceId('');
    logTrade({ type: 'buy', name: target.name, total: amount, isSavings: true });
    showToast(`✅ 저축액이 추가되었습니다!`);
    
    localStorage.setItem('kj_final_v87_globalCash', JSON.stringify(updatedGlobalCash));
  };

  const handleSavingsMaturitySubmit = (e) => {
    e.preventDefault();
    const target = stocks.find(s => s.id === savingsMaturityModal.targetId);
    const finalAmt = toPureNumber(savingsMaturityModal.finalAmount);
    if (!target || finalAmt <= 0) return;

    saveStateToHistory();
    const newStocks = stocks.filter(s => s.id !== target.id);
    const principal = toPureNumber(target.quantity);
    const profit = finalAmt - principal;
    const roi = principal > 0 ? (profit / principal) * 100 : 0;

    const destAcc = accounts.find(a => a.type === 'savings' && a.id !== (target.accountId || 'default')) || accounts[0];
    let updatedAccs = accounts;
    if (destAcc) {
      updatedAccs = accounts.map(a => a.id === destAcc.id ? { ...a, cash: String(toPureNumber(a.cash) + finalAmt) } : a);
    }

    logTrade({ type: 'maturity', name: target.name, principal, finalAmount: finalAmt, profit, roi });
    setStocks(newStocks);
    setAccounts(updatedAccs);
    setSavingsMaturityModal({ isOpen: false, targetId: null, finalAmount: '' });
    showToast(`🎉 축하합니다!\n노력의 결실 ₩${formatNum(finalAmt)} ${destAcc ? `'${destAcc.name}'에 ` : ''}입금 완료! 🥳`);
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);

  };

  const handleScreenshotOcr = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
      showToast("⚠️ 아이폰 원본 사진(HEIC)은 지원하지 않습니다.\n스크린샷(PNG/JPG)을 올려주세요.");
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
      return;
    }

    // 잔고분석은 주식 계좌에서만
    const targetAccId = modalTargetAccId || selectedAccountId;
    const targetAcc = accounts.find(a => a.id === targetAccId);
    if (!targetAcc || targetAcc.type !== 'stock') {
      showToast("⚠️ 잔고분석은 주식 계좌에서만 사용 가능합니다.");
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
      return;
    }

    setIsOcrLoading(true);
    showToast("🔍 잔고 스크린샷 분석 중...\n(처음 실행 시 10~20초 소요)");

    try {
      if (!window.Tesseract) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          script.crossOrigin = 'anonymous';
          script.onload = resolve;
          script.onerror = () => reject(new Error("Tesseract 로드 실패"));
          document.head.appendChild(script);
        });
      }

      const worker = await window.Tesseract.createWorker('kor+eng');
      const ret = await worker.recognize(file);
      const text = ret.data.text;
      await worker.terminate();

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
      const foundStocks = [];
      const usedNames = new Set();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineClean = line.replace(/\s/g, '');

        // 1) DB에서 종목명 매칭 (공백 무시, 부분 포함)
        const matchedDb = STOCK_DATABASE.find(db => {
          const dbName = db.name.replace(/\s/g, '');
          return lineClean.includes(dbName) || dbName.includes(lineClean) && lineClean.length >= 3;
        });

        if (matchedDb && !usedNames.has(matchedDb.name)) {
          // 주변 5줄을 넓게 검색
          const ctx = [line, lines[i+1], lines[i+2], lines[i+3], lines[i+4]].filter(Boolean).join(' ');

          // 수량: 숫자+주/좌, 또는 "수량" 키워드 뒤 숫자
          const qtyMatch =
            ctx.match(/보유\s*수량\s*[:\|]?\s*([0-9,]+)/) ||
            ctx.match(/([0-9,]+)\s*주\b/) ||
            ctx.match(/([0-9,]+)\s*좌\b/) ||
            ctx.match(/수량\s*[:\|]?\s*([0-9,]+)/);

          // 평단가: 평균단가, 매입단가, 평단 등 키워드 뒤 숫자
          const priceMatch =
            ctx.match(/평균\s*단가\s*[:\|]?\s*([0-9,]+)/) ||
            ctx.match(/매입\s*단가\s*[:\|]?\s*([0-9,]+)/) ||
            ctx.match(/평\s*단\s*[:\|]?\s*([0-9,]+)/) ||
            ctx.match(/단가\s*[:\|]?\s*([0-9,]+)/);

          if (qtyMatch) {
            const qty = Number(qtyMatch[1].replace(/,/g, ''));
            const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0;
            if (qty > 0) {
              usedNames.add(matchedDb.name);
              foundStocks.push({
                id: `ocr_${Date.now()}_${i}`,
                accountId: targetAccId,
                name: matchedDb.name,
                ticker: matchedDb.ticker,
                isUSD: matchedDb.isUSD,
                quantity: String(qty),
                buyPrice: price > 0 ? String(price) : '0',
                currentPrice: '0',
                targetRatio: '',
                dividendTimeline: {}, divPerShare: '', divFreq: '월', divDay: '15', divMonths: [], divExDay: '1', divExMonths: [],
                interestRate: '', interestType: '단리', benefit: '',
                cardType: '체크', performance: '', isNbbang: false, cardPayDay: '', cardPeriod: '', cardLinkedAcc: ''
              });
            }
          }
        }
      }

      if (foundStocks.length > 0) {
        // 이미 있는 종목 제외 (이름 기준)
        const existingNames = new Set(stocks.filter(s => s.accountId === targetAccId).map(s => s.name));
        const newStocks = foundStocks.filter(s => !existingNames.has(s.name));
        if (newStocks.length === 0) {
          showToast("⚠️ 이미 등록된 종목들입니다.");
        } else {
          setStocks([...stocks, ...newStocks]);
          showToast(`✨ ${newStocks.length}개 종목이 추가됐습니다!\n평단가는 직접 확인 후 수정해주세요.`);
        }
      } else {
        showToast("⚠️ 종목을 인식하지 못했습니다.\n증권사 앱의 보유 잔고 화면을 선명하게 캡처해주세요.");
      }

    } catch (err) {
      console.error(err);
      showToast("❌ 분석 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
    } finally {
      setIsOcrLoading(false);
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
    }
  };

  const handleEditStockSubmit = async (e) => {
    e.preventDefault();
    if (!newStock.name.trim()) return showToast('❌ 이름을 입력해주세요!');
    
    const currentModalOtherRatioSum = stocks.filter(s => s.accountId === selectedAccountId && s.id !== editingStockId && s.targetRatio !== '').reduce((sum, s) => sum + toPureNumber(s.targetRatio), 0);
    const currentModalTotalRatio = currentModalOtherRatioSum + (newStock.targetRatio ? toPureNumber(newStock.targetRatio) : 0);
    const isRatioExceededModal = currentAccountStat?.type === 'stock' && newStock.targetRatio !== '' && currentModalTotalRatio > 100;
    const isDuplicateStock = !!newStock.name.trim() && stocks.some(s => s.accountId === selectedAccountId && s.id !== editingStockId && s.name === newStock.name);

    if (isRatioExceededModal) return showToast("⚠️ 목표 비중 총합이 100%를 초과할 수 없습니다.");
    if (isDuplicateStock) return showToast("⚠️ 이미 동일한 이름의 종목이 존재합니다.");

    saveStateToHistory();
    const id = editingStockId || Date.now().toString();
    const resolvedAccId = modalTargetAccId || selectedAccountId;
    const finalStock = { ...newStock, id, accountId: resolvedAccId };
    if (!selectedAccountId.startsWith('__all__') === false) setSelectedAccountId(resolvedAccId);
    let updatedStocks = editingStockId ? stocks.map(s => s.id === id ? finalStock : s) : [...stocks, finalStock];

    if (!editingStockId) {
      const accountType = accounts.find(a => a.id === resolvedAccId)?.type || currentAccountStat?.type;
      if (accountType === 'stock') {
        const total = toPureNumber(finalStock.quantity) * toPureNumber(finalStock.buyPrice) * (finalStock.isUSD ? toPureNumber(exchangeRate) : 1);
        logTrade({ type: 'buy', name: finalStock.name, shares: toPureNumber(finalStock.quantity), price: finalStock.buyPrice, amount: total, total, isUSD: finalStock.isUSD });
      } else if (accountType === 'spending') {
        const initAmt = toPureNumber(finalStock.quantity);
        const wid = finalStock.withdrawAccId || '';
        if (wid.startsWith('stock:') && initAmt > 0) {
          const srcId = wid.slice(6);
          const src = updatedStocks.find(s => s.id === srcId);
          if (!src || toPureNumber(src.quantity) < initAmt) { showToast('⚠️ 출금 계좌 잔액이 부족합니다.'); return; }
          updatedStocks = updatedStocks.map(s => s.id === srcId ? { ...s, quantity: String(toPureNumber(s.quantity) - initAmt) } : s);
        }
      } else {
        const amount = toPureNumber(finalStock.quantity);
        logTrade({ type: 'deposit', name: finalStock.name, amount, category: '저축/예금' });
      }
    }

    setStocks(updatedStocks);
    setIsModalOpen(false);
    showToast(editingStockId ? `✅ 수정되었습니다.` : `✅ 추가되었습니다.`);

  };

  const handleFormattedChange = (field, value) => {
    let clean = value.replace(/[^0-9.]/g, "");
    setNewStock(prev => ({ ...prev, [field]: clean }));
  };

  const openGlobalDivModal = (mode = 'schedule', stockId = null, filterAccId = null) => {
    if (stocks.length === 0) return showToast("⚠️ 항목을 추가해주세요.");
    const temp = {};
    stocks.forEach(s => { temp[s.id] = { ...(s.dividendTimeline || {}) }; });
    setTempTimelines(temp);
    setDivInputView('schedule');
    setBatchYear(new Date().getFullYear());
    setBatchMonth(new Date().getMonth() + 1);
    setSelectedDivStock(stockId || stocks[0]?.id || '');
    setDivModalFilterAccId(filterAccId);
    setIsGlobalDivModalOpen(true);
  };

  const handleGlobalDivSave = () => {
    saveStateToHistory();
    const updatedStocks = stocks.map(s => {
      const newTimeline = tempTimelines[s.id] || {};
      return { ...s, dividendTimeline: newTimeline };
    });
    setStocks(updatedStocks); 
    setIsGlobalDivModalOpen(false); 
    showToast(`✅ 업데이트되었습니다.`);
  };

  // --- Rendering UI ---
  // 🎯 로그인을 안 했으면 진짜 앱 화면 대신 로그인 창을 먼저 보여줍니다!
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-slate-500">앱 준비 중...</div>;
  }

  // 🎯 로그인을 안 했으면 진짜 앱 화면 대신 브랜딩된 로그인/자동로그인 창을 띄움
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-md hover:scale-110 transition-transform cursor-pointer">
            <span className="text-4xl">🤑</span> {/* 🎯 돈/부를 상징하는 이모지로 브랜딩 강화 */}
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-1 tracking-tighter">경준 부자 포트폴리오</h1> {/* 🎯 지정된 고정 타이틀 적용 */}
          <p className="text-xs font-bold text-slate-400 mb-8 text-center">나만의 자산을 가장 안전하게 관리하세요</p>
          
          <form onSubmit={handleAuthSubmit} className="w-full flex flex-col gap-3">
            <input type="text" placeholder="아이디 (영문/숫자)" className="w-full bg-slate-50 p-3.5 rounded-xl font-bold text-sm outline-none border focus:border-slate-800 transition-colors" value={authId} onChange={e => setAuthId(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} required />
            <input type="password" placeholder="비밀번호 (6자리 이상)" className="w-full bg-slate-50 p-3.5 rounded-xl font-bold text-sm outline-none border focus:border-slate-800 transition-colors" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required minLength={6} />
            
            {/* 🎯 브라우저 localStorage 연동 자동로그인 체크박스 */}
            <label className="flex items-center gap-2 mt-1 cursor-pointer w-fit group">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 accent-slate-800 cursor-pointer" />
              <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 transition-colors">다음 접속 시 자동 로그인 💵</span>
            </label>

            <button type="submit" className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-black text-sm mt-3 shadow-md hover:bg-slate-900 transition-colors">
              {isSignUpMode ? '가입하고 시작하기' : '안전하게 로그인'}
            </button>
          </form>
          
          <button onClick={() => setIsSignUpMode(!isSignUpMode)} className="mt-5 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors">
            {isSignUpMode ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 1초 만에 가입하기'}
          </button>
        </div>
      </div>
    );
  }
  const scale = zoomLevel / 100;
  return (
    <>
    <div className={`${t.bg} text-slate-800 selection:bg-slate-200 transition-colors duration-500`} style={{ fontFamily: "'Pretendard', sans-serif", paddingBottom: 'max(80px, calc(env(safe-area-inset-bottom) + 80px))', paddingTop: 'env(safe-area-inset-top)', zoom: scale }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        body { font-family: 'Pretendard', sans-serif !important; overflow-x: clip; background-color: transparent; }
        .picture-card { background: white; border-radius: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.03); transition: transform 0.2s; }
        .bubbly-btn:active { transform: scale(0.96); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4"
          onKeyDown={e => { if (e.key === 'Enter') { confirmModal.onConfirm && confirmModal.onConfirm(); setConfirmModal({ isOpen: false, message: '', onConfirm: null, onCancel: null }); } if (e.key === 'Escape') { if(confirmModal.onCancel) confirmModal.onCancel(); setConfirmModal({ isOpen: false, message: '', onConfirm: null, onCancel: null }); } }}
          tabIndex={-1} ref={el => el && el.focus()}>
          <div className="bg-white rounded-[1.5rem] p-6 shadow-2xl w-full max-w-xs flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <h3 className="font-black text-slate-800 text-[13px] mb-5 leading-relaxed whitespace-pre-line">{confirmModal.message}</h3>
            <div className="flex gap-2 w-full mt-1">
              <button onClick={() => { if(confirmModal.onCancel) confirmModal.onCancel(); setConfirmModal({ isOpen: false, message: '', onConfirm: null, onCancel: null }); }} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-black hover:bg-slate-200 transition-colors">아니오</button>
              <button onClick={() => { confirmModal.onConfirm && confirmModal.onConfirm(); setConfirmModal({ isOpen: false, message: '', onConfirm: null, onCancel: null }); }} className={`flex-1 ${t.main} py-3 rounded-xl text-xs font-black shadow-md transition-colors`}>예</button>
            </div>
          </div>
        </div>
      )}

      {/* 범용 입력 모달 (prompt 대체) */}
      {inputModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4" onClick={() => setInputModal({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null })}>
          <div className="bg-white rounded-[1.5rem] p-6 shadow-2xl w-full max-w-xs flex flex-col animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-slate-800 text-[13px] mb-4 text-center">{inputModal.title}</h3>
            <textarea
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-amber-400 resize-none bg-slate-50"
              rows={inputModal.title === '백업 데이터 붙여넣기' ? 5 : 2}
              placeholder={inputModal.placeholder}
              value={inputModalValue}
              onChange={e => setInputModalValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && inputModal.title !== '백업 데이터 붙여넣기') {
                  e.preventDefault();
                  inputModal.onConfirm && inputModal.onConfirm(inputModalValue);
                  setInputModal({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null });
                }
              }}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setInputModal({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null })} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-black hover:bg-slate-200 transition-colors">취소</button>
              <button onClick={() => { inputModal.onConfirm && inputModal.onConfirm(inputModalValue); setInputModal({ isOpen: false, title: '', placeholder: '', defaultValue: '', onConfirm: null }); }} className={`flex-1 ${t.main} py-3 rounded-xl text-xs font-black shadow-md transition-colors`}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 고정비 수정/삭제 모달 */}
      {editFixedModal && (() => {
        const fe = editFixedModal.fe;
        const isConfirmingDelete = !!editFixedModal.confirmDelete;
        const allPayOpts = [
          { key: '__cash__', label: '💵 현금', method: '현금', cardName: '', transferAccId: '' },
          ...myCards.map(c => ({ key: `card-${c.name}`, label: `💳 ${c.name}`, method: c.type === '신용' ? '신용카드' : '체크카드', cardName: c.name, transferAccId: '' })),
          ...stocks.filter(s => { const acc = accounts.find(a => a.id === (s.accountId || 'default')); return acc?.type === 'card'; }).map(s => ({ key: `cardacc-${s.id}`, label: `💳 ${s.name}`, method: s.cardType === '신용' ? '신용카드' : '체크카드', cardName: s.name, transferAccId: '' })),
          ...stocks.filter(s => { const acc = accounts.find(a => a.id === (s.accountId || 'default')); return acc?.type === 'savings'; }).map(s => ({ key: `savstk-${s.id}`, label: `🏦 ${s.name}`, method: '현금', cardName: '', transferAccId: `stock:${s.id}` })),
        ];
        const doSave = () => {
          const parsed = editFixedIsUSD ? Number(editFixedAmount) : Number(editFixedAmount.replace(/[^0-9]/g, ''));
          const dayNum = Number(editFixedDay);
          if (!parsed || !dayNum || dayNum < 1 || dayNum > 31) { showToast('금액과 날짜(일)를 올바르게 입력하세요'); return; }
          setFixedExpenses(fixedExpenses.map(f => f.id === fe.id ? { ...f, amount: parsed, day: dayNum, paymentMethod: editFixedPayment.method, cardName: editFixedPayment.cardName, transferAccId: editFixedPayment.transferAccId, isUSD: editFixedIsUSD, excludeFromPerf: !!editFixedModal.excludeFromPerf } : f));
          setEditFixedModal(null);
          showToast('✅ 고정비 수정 완료');
        };
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4" onClick={() => setEditFixedModal(null)}>
            {isConfirmingDelete ? (
              <div className="bg-white rounded-[1.5rem] p-6 shadow-2xl w-full max-w-xs flex flex-col items-center text-center animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="font-black text-slate-800 text-[13px] mb-5 leading-relaxed">"{fe.name}"<br/>고정비를 삭제할까요?</h3>
                <div className="flex gap-2 w-full">
                  <button onClick={() => setEditFixedModal({ fe })} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-black hover:bg-slate-200 transition-colors">아니오</button>
                  <button onClick={() => { setFixedExpenses(fixedExpenses.filter(f => f.id !== fe.id)); setEditFixedModal(null); showToast('🗑️ 삭제되었습니다.'); }} className="flex-1 bg-red-500 text-white py-3 rounded-xl text-xs font-black shadow-md hover:bg-red-600 transition-colors">삭제</button>
                </div>
              </div>
            ) : (
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
                <span className="text-[13px] font-black text-slate-800">고정비 수정</span>
                <button onClick={() => setEditFixedModal(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400 text-lg">×</button>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">항목</span>
                  <p className="text-[12px] font-black text-slate-700 mt-0.5">{fe.name}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">금액</span>
                  <div className="flex gap-1.5 mt-1 items-center">
                    <button onClick={() => setEditFixedIsUSD(v => !v)} className={`px-2.5 py-2 rounded-lg text-[10px] font-black shrink-0 border transition-colors ${editFixedIsUSD ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{editFixedIsUSD ? '$' : '₩'}</button>
                    <input type="text" autoFocus className="flex-1 text-right text-[12px] font-black text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400" placeholder={editFixedIsUSD ? 'USD 금액' : '금액'} value={editFixedIsUSD ? editFixedAmount : toCommaString(editFixedAmount)} onChange={e => setEditFixedAmount(editFixedIsUSD ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') doSave(); }} />
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">결제일 (매월 N일)</span>
                  <input type="text" inputMode="numeric" className="w-full mt-1 text-center text-[12px] font-black text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400" value={editFixedDay} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); if (Number(v) <= 31) setEditFixedDay(v); }} onKeyDown={e => { if (e.key === 'Enter') doSave(); }} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">결제수단</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {allPayOpts.map(opt => {
                      const isSelected = opt.cardName === editFixedPayment.cardName && opt.transferAccId === editFixedPayment.transferAccId && (opt.method === editFixedPayment.method || (opt.key === '__cash__' && editFixedPayment.method === '현금' && !editFixedPayment.cardName && !editFixedPayment.transferAccId));
                      return (
                        <button key={opt.key} onClick={() => setEditFixedPayment({ method: opt.method, cardName: opt.cardName, transferAccId: opt.transferAccId })}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-colors ${isSelected ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{opt.label}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="px-4 pb-2">
                <button onClick={() => setEditFixedModal(prev => ({ ...prev, excludeFromPerf: !prev.excludeFromPerf }))}
                  className={`w-full py-2 rounded-xl text-[10px] font-black border transition-colors ${editFixedModal.excludeFromPerf ? 'bg-slate-600 text-white border-slate-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                  {editFixedModal.excludeFromPerf ? '✓ 실적제외 중 (클릭 시 포함)' : '실적에서 제외'}
                </button>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button onClick={() => setEditFixedModal({ fe, confirmDelete: true })} className="flex-1 bg-red-50 text-red-500 py-2.5 rounded-xl text-[11px] font-black border border-red-100 hover:bg-red-100 transition-colors">삭제</button>
                <button onClick={doSave} className="flex-1 bg-amber-400 text-white py-2.5 rounded-xl text-[11px] font-black shadow-sm hover:bg-amber-500 transition-colors">저장</button>
              </div>
            </div>
            )}
          </div>
        );
      })()}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/95 text-slate-700 border border-slate-200 px-5 py-3 rounded-2xl shadow-xl z-[999999] font-bold text-xs animate-in fade-in slide-in-from-bottom-4 flex items-center justify-center gap-3 w-[90%] max-w-sm cursor-pointer hover:bg-slate-50 transition-colors backdrop-blur-sm" onClick={dismissToast}>
          <span className="flex-1 text-center whitespace-pre-line">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="max-w-5xl mx-auto pt-6 pb-3 px-4 flex flex-col md:flex-row items-center md:items-stretch justify-between gap-3 md:gap-6 relative z-10 w-full min-w-0">
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-center md:justify-start">
          <button onClick={() => setIsGlobalSettingsOpen(true)} className="p-1 text-slate-400 hover:text-slate-800 transition-colors shrink-0 -ml-1">
            <Menu size={20} strokeWidth={2.5} />
          </button>
          <div className={`w-[45px] h-[45px] sm:w-[55px] sm:h-[55px] rounded-full border-2 ${t.border} overflow-hidden shadow-md bg-white cursor-pointer relative group shrink-0`} onClick={openSettings} style={{ width: '45px', height: '45px', minWidth: '45px', minHeight: '45px' }}>
            <img src={profileImage} alt="Profile" className="w-full h-full object-cover group-hover:opacity-60 bg-white transition-opacity" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 text-white"><Camera size={14}/></div>
          </div>
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5 min-h-[18px]">
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">{dateString}</span>
              <button onClick={() => setShowIndices(!showIndices)} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-colors flex items-center gap-1 shrink-0">
                📈 {showIndices ? '닫기' : '지수확인'}
              </button>
              <button onClick={() => { if (expectedReturn === '' && fireCAGR !== null) setExpectedReturn(String(fireCAGR)); setIsFireModalOpen(true); }} className="bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-md text-[9px] font-bold border border-rose-100 shadow-sm hover:bg-rose-100 transition-colors flex items-center gap-1 shrink-0">
                🔥 FIRE
              </button>
            </div>
            {/* 타이틀과 모바일 갱신버튼을 나란히 배치 */}
            <div className="flex items-center justify-between w-full">
              <div className="group cursor-pointer flex flex-col items-start min-w-0" onClick={openSettings}>
                <h1 className={`font-bold text-[17px] sm:text-[20px] text-slate-800 flex items-center gap-1.5 transition-colors group-hover:${t.text} leading-tight w-full break-all sm:break-normal`}>
                  <span className="truncate">{appTitle}</span> <Sparkles size={14} className="text-amber-400 shrink-0" />
                  <Edit2 size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </h1>
                <p className={`text-[9px] ${t.text} opacity-80 font-bold uppercase tracking-wider mt-0.5 text-left w-full break-all sm:break-normal whitespace-normal leading-tight`}>{appSubtitle}</p>
              </div>
              {/* 모바일 액션 그룹 */}
              <div className="md:hidden flex flex-col items-end gap-1 shrink-0 ml-2">
                <div onClick={() => { setInvestTab('transfer'); setIsInvestModalOpen(true); }} className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 shadow-sm cursor-pointer hover:bg-slate-700 transition-colors">
                  <CircleDollarSign size={10} /> 머니로그
                </div>
                <div className="flex items-center gap-1 bg-white/60 p-1 rounded-full border border-slate-200 shadow-sm h-[28px]">
                  <button onClick={handleUpdateStockPrices} disabled={isFetchingStocks} className={`px-2 h-full rounded-full text-[9px] font-black transition-all flex items-center gap-1 text-slate-500 hover:bg-slate-200 ${isFetchingStocks ? 'opacity-50' : ''}`}><RefreshCw size={10} className={isFetchingStocks ? 'animate-spin' : ''}/>갱신</button>
                  <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                  <button onClick={handleUndo} disabled={pastStates.length === 0} className={`px-2 h-full rounded-full text-[9px] font-black transition-all ${pastStates.length > 0 ? `${t.light}` : 'text-slate-300'}`}>슝</button>
                  <button onClick={handleRedo} disabled={futureStates.length === 0} className={`px-2 h-full rounded-full text-[9px] font-black transition-all ${futureStates.length > 0 ? `${t.light}` : 'text-slate-300'}`}>뿅</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col justify-center items-center md:items-end gap-2 w-full md:flex-1">
          {/* 메뉴 탭 영역 — 하단 fixed로 이동, 여기는 빈 자리 */}
          {/* PC 액션 그룹 */}
          <div className="hidden md:flex flex-col items-end gap-1 w-full relative z-20">
            <div onClick={() => { setInvestTab('transfer'); setIsInvestModalOpen(true); }} className="bg-slate-800 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm cursor-pointer hover:bg-slate-700 transition-colors">
              <CircleDollarSign size={12} /> 머니로그
            </div>
            <div className="flex items-center justify-end gap-1.5 h-[32px]">
              <div className="flex items-center gap-1 shrink-0 bg-white/60 p-1.5 rounded-full border border-slate-200 shadow-sm h-full">
                <button onClick={handleUpdateStockPrices} disabled={isFetchingStocks} className={`px-2.5 h-full rounded-full text-[10px] font-black transition-all whitespace-nowrap flex items-center gap-1 text-slate-500 hover:bg-slate-200 ${isFetchingStocks ? 'opacity-50 cursor-wait' : ''}`}><RefreshCw size={10} className={isFetchingStocks ? 'animate-spin' : ''}/> 현재가 갱신</button>
                <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                <button onClick={handleUndo} disabled={pastStates.length === 0} className={`px-2.5 h-full rounded-full text-[10px] font-black transition-all whitespace-nowrap ${pastStates.length > 0 ? `${t.light}` : 'text-slate-300 cursor-not-allowed'}`}>슝💨</button>
                <button onClick={handleRedo} disabled={futureStates.length === 0} className={`px-2.5 h-full rounded-full text-[10px] font-black transition-all whitespace-nowrap ${futureStates.length > 0 ? `${t.light}` : 'text-slate-300 cursor-not-allowed'}`}>뿅✨</button>
              </div>
            </div>
          </div>
        </div>

        </header>

      {/* 🎯 지수 확인 전역 오버레이 */}
      {showIndices && (
        <div className="fixed inset-0 z-[100000] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowIndices(false)}>
          <div className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm border border-slate-100 relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5">📈 글로벌 증시</h3>
              <button onClick={() => setShowIndices(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={16}/></button>
            </div>
            {/* 환율 */}
            <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 mb-3 flex justify-between items-center border border-slate-100">
              <span className="text-[11px] font-black text-slate-500">USD/KRW</span>
              <span className="text-[13px] font-black text-slate-800">₩{formatNum(exchangeRate)}</span>
            </div>
            {/* 한국 지수: 2열 1줄 */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[{ key: 'KOSPI', label: 'KOSPI' }, { key: 'KOSDAQ', label: 'KOSDAQ' }].map(({ key, label }) => (
                <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-slate-500">{label}</span>
                  <span className="text-[14px] font-black text-slate-800 leading-none">{marketIndices[key].price}</span>
                  <span className={`text-[10px] font-black ${marketIndices[key].change >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                    {marketIndices[key].change >= 0 ? '▲' : '▼'} {Math.abs(marketIndices[key].change).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
            {/* 미국 지수: 3열 1줄 */}
            <div className="grid grid-cols-3 gap-2">
              {[{ key: 'S&P 500', label: 'S&P 500' }, { key: 'DOW', label: 'DOW' }, { key: 'NASDAQ', label: 'NASDAQ' }].map(({ key, label }) => (
                <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 flex flex-col gap-0.5">
                  <span className="text-[9px] font-black text-slate-400">{label}</span>
                  <span className="text-[11px] font-black text-slate-700 leading-none truncate">{marketIndices[key].price}</span>
                  <span className={`text-[9px] font-black ${marketIndices[key].change >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                    {marketIndices[key].change >= 0 ? '▲' : '▼'} {Math.abs(marketIndices[key].change).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 타입 탭 바 + 계좌 선택 바 (포트폴리오 탭, 두 개 분리) */}
      {activeTab === 'portfolio' && (() => {
        const typeOrder = ['stock','savings','spending','card','loan'];
        const defaultLabel = { stock: '주식', savings: '저축', spending: '소비', card: '카드', loan: '대출' };
        const defaultEmoji = { stock: '📈', savings: '🏦', spending: '🛍️', card: '💳', loan: '💸' };
        const typeDot = { stock: t.main.split(' ')[0], savings: 'bg-emerald-400', spending: 'bg-rose-400', card: 'bg-purple-400', loan: 'bg-orange-400' };
        const typeActive = {
          stock: t.main,
          savings: 'bg-emerald-500 text-white',
          spending: 'bg-rose-500 text-white',
          card: 'bg-purple-500 text-white',
          loan: 'bg-orange-500 text-white',
        };
        const accActive = {
          stock: t.accStock,
          savings: 'bg-emerald-500 text-white shadow-sm',
          spending: 'bg-rose-500 text-white shadow-sm',
          card: 'bg-purple-500 text-white shadow-sm',
          loan: 'bg-orange-500 text-white shadow-sm',
        };
        const existingTypes = typeOrder.filter(type => accounts.some(a => a.type === type));
        const allTypesAdded = existingTypes.length >= typeOrder.length;
        const accsOfType = accounts.filter(a => a.type === portfolioTypeTab);
        const isAll = selectedAccountId === '__all__' + portfolioTypeTab;
        return (
          <div className="max-w-5xl mx-auto px-4 mb-3 mt-1 flex flex-col items-center gap-2 animate-in fade-in duration-300">
            {/* 바 1: 타입 탭 */}
            <div className="flex items-center justify-center gap-2 max-w-full overflow-x-auto custom-scrollbar">
              <div className="inline-flex items-center gap-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                {existingTypes.map(type => {
                  const isActive = portfolioTypeTab === type;
                  const isPopupOpen = activeTypePopup === type;
                  const label = typeCustom[type]?.name || defaultLabel[type];
                  const emoji = typeCustom[type]?.emoji || defaultEmoji[type];
                  return (
                    <div key={type} className="acc-btn relative">
                      {isPopupOpen && (
                        <div className="acc-popup absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-xl px-1 py-1 flex gap-1 shadow-xl z-50 whitespace-nowrap after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-slate-800">
                          <button onClick={() => { setActiveTypePopup(null); setEditTypeModal({ isOpen: true, type, name: label, emoji }); }} className="px-2 py-1 text-[10px] font-black hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1"><Edit2 size={10}/> 수정</button>
                          <button onClick={() => { setActiveTypePopup(null); showConfirm(`'${label}' 메뉴와 포함된 모든 계좌를 삭제할까요?`, () => { saveStateToHistory(); const updated = accounts.filter(a => a.type !== type); setAccounts(updated); const first = updated[0]; if(first){ setPortfolioTypeTab(first.type||'stock'); setSelectedAccountId(first.id); } showToast('🗑️ 삭제됐습니다.'); }); }} className="px-2 py-1 text-[10px] font-black hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1"><Trash2 size={10}/> 삭제</button>
                        </div>
                      )}
                      <button
                        onClick={() => { setPortfolioTypeTab(type); setSelectedAccountId('__all__' + type); setActiveTypePopup(null); }}
                        onDoubleClick={(e) => { e.stopPropagation(); setActiveTypePopup(prev => prev === type ? null : type); }}
                        onContextMenu={(e) => { e.preventDefault(); setActiveTypePopup(prev => prev === type ? null : type); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all duration-200 whitespace-nowrap select-none ${isActive ? typeActive[type] + ' shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className="text-[13px] leading-none">{emoji}</span>
                        <span>{label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              {!allTypesAdded && (
                <button type="button" onClick={() => { setAddAccountMode('type'); setIsAddAccountOpen(true); }} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                  <Plus size={13} strokeWidth={2.5}/>
                </button>
              )}
            </div>
            {/* 바 2: 계좌 선택 */}
            <div className="flex flex-col items-center gap-1 w-full">
              <div className="flex items-center justify-center gap-2 w-full max-w-full">
                <div className="max-w-full overflow-x-auto custom-scrollbar">
                  <div className="inline-flex items-center gap-1 bg-white px-2 py-1.5 rounded-2xl shadow-sm border border-slate-200">
                    <button
                      onClick={() => setSelectedAccountId('__all__' + portfolioTypeTab)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all duration-200 shrink-0 whitespace-nowrap ${isAll ? accActive[portfolioTypeTab] || accActive.stock : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                      전체
                    </button>
                    {accsOfType.length > 0 && <div className="w-px h-4 bg-slate-100 shrink-0" />}
                    {accsOfType.map((acc) => {
                      const globalIndex = accounts.findIndex(a => a.id === acc.id);
                      const isSelected = selectedAccountId === acc.id;
                      return (
                        <div key={acc.id} className="acc-btn shrink-0">
                          <button
                            onClick={() => { setSelectedAccountId(acc.id); setActiveCardId(null); }}
                            onDoubleClick={(e) => { e.stopPropagation(); setActiveCardId(prev => prev === acc.id ? null : acc.id); }}
                            onContextMenu={(e) => { e.preventDefault(); setActiveCardId(prev => prev === acc.id ? null : acc.id); }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black transition-all duration-200 max-w-[140px] overflow-hidden select-none ${isSelected ? accActive[portfolioTypeTab] || accActive.stock : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white/70' : typeDot[portfolioTypeTab] || typeDot.stock}`} />
                            <span className="truncate">{acc.name}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button type="button" onClick={() => { setNewAccountType(portfolioTypeTab); setNewAccountName(''); setAddAccountMode('account'); setIsAddAccountOpen(true); }} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all">
                  <Plus size={13} strokeWidth={2.5}/>
                </button>
              </div>
              {/* 계좌 팝업: overflow 밖에 독립 렌더링 */}
              {activeCardId && accsOfType.find(a => a.id === activeCardId) && (() => {
                const acc = accsOfType.find(a => a.id === activeCardId);
                return (
                  <div className="acc-popup flex items-center gap-1 bg-slate-800 text-white rounded-xl px-1 py-1 shadow-xl z-50 whitespace-nowrap">
                    <button onClick={() => { setActiveCardId(null); setEditingAccountId(acc.id); setEditAccountName(acc.name); setIsEditAccountOpen(true); }} className="acc-popup px-2 py-1 text-[10px] font-black hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1"><Edit2 size={10}/> 수정</button>
                    {acc.id !== 'default' && <button onClick={() => { setActiveCardId(null); showConfirm(`'${acc.name}' 계좌를 삭제할까요?`, () => handleDeleteAccount(acc.id)); }} className="acc-popup px-2 py-1 text-[10px] font-black hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1"><Trash2 size={10}/> 삭제</button>}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      <main className="max-w-5xl mx-auto px-4 mt-2 w-full">
        {/* --- PORTFOLIO TAB --- */}
        {activeTab === 'portfolio' && (
          <div className="animate-in fade-in duration-500 pb-28 min-w-0 w-full">
            {currentAccountStat?.type === 'loan' && (() => {
              const loanAccs = selectedAccountId.startsWith('__all__')
                ? accountStatsList.filter(a => a.type === 'loan')
                : [currentAccountStat];
              const totalLoan = loanAccs.reduce((s, a) => s + (a.loanAmount || 0), 0);
              const totalMonthlyInterest = loanAccs.reduce((s, a) => {
                if (!a.loanAmount || !a.loanRate) return s;
                return s + Math.round(toPureNumber(a.loanAmount) * toPureNumber(a.loanRate) / 100 / 12);
              }, 0);
              return (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                <div className="bg-orange-50 rounded-xl border border-orange-200 shadow-sm p-3 sm:p-4 min-h-[70px] flex flex-col justify-center">
                  <span className="text-[10px] font-black text-orange-500 mb-1">대출 잔액</span>
                  <span className="text-[17px] sm:text-2xl font-black text-rose-600">-₩{formatNum(totalLoan)}</span>
                  {!selectedAccountId.startsWith('__all__') && currentAccountStat?.loanPeriod && <span className="text-[9px] text-orange-400 font-bold mt-0.5">계약 {currentAccountStat.loanPeriod}개월</span>}
                </div>
                <div className="bg-orange-50 rounded-xl border border-orange-200 shadow-sm p-3 sm:p-4 min-h-[70px] flex flex-col justify-center">
                  <span className="text-[10px] font-black text-orange-500 mb-1">이번달 이자 상환</span>
                  <span className="text-[17px] sm:text-2xl font-black text-rose-600">{totalMonthlyInterest > 0 ? `₩${formatNum(totalMonthlyInterest)}` : '-'}</span>
                  {!selectedAccountId.startsWith('__all__') && <span className="text-[9px] text-orange-400 font-bold mt-0.5">{currentAccountStat?.loanRate ? `연 ${currentAccountStat.loanRate}%` : ''}{currentAccountStat?.loanPayDay ? ` · 매월 ${currentAccountStat.loanPayDay}일` : ''}</span>}
                </div>
              </div>
              );
            })()}
            {currentAccountStat?.type === 'card' && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 min-h-[70px] flex flex-col justify-center overflow-hidden">
                  <div className="flex items-center gap-1 mb-1"><CreditCard size={12} className="text-slate-400 shrink-0"/><span className="text-[10px] sm:text-[11px] font-black text-slate-500 truncate">총 카드 사용금액</span></div>
                  <div className="flex items-baseline gap-1 overflow-hidden"><span className="text-slate-400 text-xs sm:text-sm font-black shrink-0">₩</span><span className="text-[17px] sm:text-2xl font-black text-slate-800 tracking-tight leading-none truncate py-1">{formatNum(currentAccountStat?.cardItemsTotal)}</span></div>
                </div>
                <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-3 sm:p-4 min-h-[70px] flex flex-col justify-center overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] sm:text-[11px] font-black text-orange-500 flex items-center gap-1 sm:gap-1.5 truncate"><CreditCard size={12} className="shrink-0"/><span className="truncate">내 실부담 금액</span></span>
                  </div>
                  <div className="flex items-baseline gap-1 sm:gap-1.5 overflow-hidden"><span className="text-orange-400 text-xs sm:text-sm font-black shrink-0">₩</span><span className="text-[17px] sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none truncate py-1">{formatNum(currentAccountStat?.cardItemsNonNbbang)}</span></div>
                </div>
              </div>
            )}
            <div className={`grid grid-cols-2 gap-2 sm:gap-3 mb-4 ${['card','loan'].includes(currentAccountStat?.type) ? 'hidden' : ''}`}>
              {!['savings','spending','card','loan'].includes(currentAccountStat?.type) && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 min-h-[80px] flex flex-col justify-between overflow-hidden relative col-span-1">
                {/* 상단 행: 라벨(좌) + 주문가능금액 버튼(우) */}
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] sm:text-[11px] font-black text-slate-500 flex items-center gap-1 sm:gap-1.5 truncate`}>
                    <PieChart size={12} className="shrink-0"/> <span className="truncate">{currentAccountStat?.type === 'savings' ? currentAccountStat.label : currentAccountStat?.type === 'spending' ? '소비 계좌' : '총 평가액'}</span>
                  </span>
                  {currentAccountStat?.type === 'stock' && !selectedAccountId.startsWith('__all__') && (
                    <button onClick={() => openTransferModal(currentAccountStat.id, '')} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[8px] font-black transition-colors border border-slate-200 whitespace-nowrap shrink-0 ml-1">
                      <span className="opacity-60">₩</span>{formatNum(currentAccountStat?.cash)}
                    </button>
                  )}
                </div>
                {/* 중간: 금액 */}
                <div className="flex items-baseline gap-1 overflow-hidden">
                  <span className="text-slate-400 text-xs sm:text-sm font-black shrink-0">₩</span>
                  {isEditingAccCash && ['savings','spending'].includes(currentAccountStat?.type) ? (
                    <div className="flex items-center gap-1 z-20"><input type="text" className="w-16 sm:w-24 text-right border-b border-slate-300 font-black text-slate-800 text-sm sm:text-xl outline-none bg-transparent" value={toCommaString(editAccCashAmount)} onChange={e => setEditAccCashAmount(e.target.value.replace(/[^0-9]/g, ''))} autoFocus /><button onClick={() => { const val = editAccCashAmount.trim() === '' ? currentAccountStat?.cash : toPureNumber(editAccCashAmount); setAccounts(accounts.map(a => a.id === selectedAccountId ? { ...a, cash: String(val) } : a)); setIsEditingAccCash(false); }} className={`${t.main} px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold`}>저장</button></div>
                  ) : (
                    <span className="text-[17px] sm:text-2xl font-black text-slate-800 tracking-tight leading-none cursor-pointer flex items-center gap-1.5 truncate py-0.5" onClick={() => { if(['savings','spending'].includes(currentAccountStat?.type)) { setEditAccCashAmount(''); setIsEditingAccCash(true); } }}>
                      {formatNum(['savings','spending'].includes(currentAccountStat?.type) ? currentAccountStat?.cash : (currentAccountStat?.totalValue || 0) + (currentAccountStat?.cash || 0))}
                      {['savings','spending'].includes(currentAccountStat?.type) && <Edit2 size={10} className="text-slate-300 hover:text-slate-500 shrink-0"/>}
                    </span>
                  )}
                  {['savings','spending'].includes(currentAccountStat?.type) && !inlineConsume.isOpen && (
                    <div className="flex items-center gap-0.5 sm:gap-1 ml-auto shrink-0"><button onClick={(e) => { e.stopPropagation(); setInlineConsume({isOpen: true, amount: ''}) }} className={`${t.light} px-1.5 sm:px-2 py-1 rounded shadow-sm text-[8px] sm:text-[9px] font-black transition-colors`}>🛍️ 소비</button><button onClick={(e) => { e.stopPropagation(); setSavingsWithdrawModal({ isOpen: true, amount: '', targetAccId: '' }) }} className="bg-slate-100 text-slate-600 px-1.5 sm:px-2 py-1 rounded shadow-sm text-[8px] sm:text-[9px] font-black hover:bg-slate-200 transition-colors">💸 출금</button></div>
                  )}
                  {['savings','spending'].includes(currentAccountStat?.type) && inlineConsume.isOpen && (
                    <div className="flex items-center gap-1 ml-auto shrink-0"><div className="flex items-center gap-0.5 sm:gap-1 bg-slate-50 rounded p-1 border border-slate-200"><input type="text" className="w-12 sm:w-16 text-[9px] sm:text-[10px] p-0.5 rounded text-right outline-none text-slate-600 font-black bg-white" placeholder="금액" value={toCommaString(inlineConsume.amount)} onChange={e => setInlineConsume({...inlineConsume, amount: e.target.value.replace(/[^0-9]/g, '')})} autoFocus /><button onClick={handleInlineConsumeConfirm} className={`${t.main} px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black whitespace-nowrap`}>확정</button><button onClick={() => setInlineConsume({isOpen: false, amount: ''})} className="bg-slate-200 text-slate-600 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black hover:bg-slate-300 whitespace-nowrap">취소</button></div></div>
                  )}
                </div>
                {/* 하단 행: 원금(좌) + 수익률(우) */}
                {currentAccountStat?.type === 'stock' && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[8px] font-black text-slate-400 truncate">원금 ₩{formatNum(currentAccountStat?.totalInvestedKRW)}</span>
                    <div className={`px-1.5 py-0.5 rounded-md text-[9px] font-black text-white shrink-0 ml-1 ${currentAccountStat?.totalROI >= 0 ? t.main.split(' ')[0] : 'bg-blue-400'}`}>
                      {currentAccountStat?.totalROI >= 0 ? '▲' : '▼'} {formatNum(Math.abs(currentAccountStat?.totalROI), 1)}%
                    </div>
                  </div>
                )}
              </div>)}

              <div className={`bg-white rounded-xl border border-orange-100 shadow-sm p-3 sm:p-4 min-h-[80px] flex flex-col justify-between overflow-hidden ${['savings','spending'].includes(currentAccountStat?.type) ? 'col-span-2' : 'col-span-1'}`}>
                {/* 상단 행: 라벨(좌) + 배당버튼(우) */}
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] sm:text-[11px] font-black text-orange-500 flex items-center gap-1 sm:gap-1.5 truncate">
                    {currentAccountStat?.type === 'stock' ? <><Star size={12} className="shrink-0"/> <span className="truncate">예상 연 배당금</span></> : <><Landmark size={12} className="shrink-0"/> <span className="truncate">{currentAccountStat?.type === 'spending' ? '현재 잔액' : '현재 저축 합계'}</span></>}
                  </span>
                  {currentAccountStat?.type === 'stock' && (
                    <button onClick={() => openGlobalDivModal('batch', null, selectedAccountId.startsWith('__all__') ? null : selectedAccountId)} className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-[8px] font-black border border-amber-200 transition-colors whitespace-nowrap shrink-0 ml-1">
                      <CircleDollarSign size={10}/> 배당
                    </button>
                  )}
                  {currentAccountStat?.type === 'savings' && (
                    <div className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black shrink-0 ml-1 ${t.altText} ${t.altBgOnly}`}>
                      <span className="hidden sm:inline">만기 예상</span> ₩{formatNum(currentAccountStat?.savingsExpectedTotal)}
                    </div>
                  )}
                </div>
                {/* 중간: 금액 */}
                <div className="flex items-baseline gap-1 sm:gap-1.5 overflow-hidden">
                  <span className="text-orange-400 text-xs sm:text-sm font-black shrink-0">₩</span>
                  <span className="text-[17px] sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none truncate py-0.5">{formatNum(currentAccountStat?.type === 'stock' ? currentAccountStat?.futureTotalDiv : currentAccountStat?.type === 'spending' ? currentAccountStat?.spendingItemsTotal : currentAccountStat?.totalValue)}</span>
                </div>
                {/* 하단 행: 누적배당(좌) + 배당포함수익률(우) */}
                {currentAccountStat?.type === 'stock' && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[8px] font-black text-slate-400 truncate">누적 ₩{formatNum(currentAccountStat?.totalReceivedDivKRW)}</span>
                    <div className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border shrink-0 ml-1 ${currentAccountStat?.futureExpectedTotalROI >= 0 ? 'text-orange-600 bg-orange-50 border-orange-100' : 'text-blue-500 bg-blue-50 border-blue-100'}`}>
                      {formatNum(Math.abs(currentAccountStat?.futureExpectedTotalROI), 1)}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mb-3 px-1 gap-1 w-full">
              <h3 className={`font-black text-slate-800 flex items-center gap-1 text-[11px] sm:text-sm h-[28px] shrink-0`}>
                <Heart size={14} className={t.text} /> 내 {currentAccountStat?.type === 'stock' ? '보유 종목' : currentAccountStat?.type === 'card' ? '카드 항목' : currentAccountStat?.type === 'spending' ? '소비 항목' : currentAccountStat?.type === 'loan' ? '대출 상품' : '저축 상품'}
              </h3>
              {currentAccountStat?.type === 'stock' && (
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0 justify-end flex-1 shrink-0">
                  {/* 관심종목 */}
                  <button onClick={() => setIsWatchlistModalOpen(true)} className="flex items-center gap-1 px-2 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg text-[9px] font-black border border-yellow-200 transition-colors shrink-0 whitespace-nowrap">
                    <Star size={10}/> 관심종목
                  </button>
                  {/* 일괄구매 */}
                  <button onClick={() => { const initial = {}; const currentCash = toPureNumber(currentAccountStat?.cash || 0); const rate = toPureNumber(exchangeRate) || 1392; currentAccountStat?.rebalanceData.forEach(s => { const targetR = toPureNumber(s.targetRatio); if(targetR > 0) { const allocated = currentCash * (targetR / 100); const curP = toPureNumber(s.currentPrice); const mult = s.isUSD ? rate : 1; const shares = (curP > 0 && mult > 0) ? Math.floor(allocated / (curP * mult)) : 0; if(shares > 0) initial[s.id] = shares; } }); setBatchBuyInputs(initial); setIsBatchBuyModalOpen(true); }} className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[9px] font-black border border-blue-200 transition-colors shrink-0 whitespace-nowrap">
                    <ShoppingCart size={10}/> 구매
                  </button>
                  {/* 리밸런싱 */}
                  <button onClick={() => setIsRebalanceModalOpen(true)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black border transition-colors shrink-0 whitespace-nowrap ${t.main} hover:opacity-80`}>
                    <Scale size={10}/> 리밸런싱
                  </button>
                </div>
              )}
            </div>

            {/* 대출 계좌: 상품 카드 목록 */}
            {currentAccountStat?.type === 'loan' && (() => {
              const isAll = selectedAccountId.startsWith('__all__');
              const loanList = isAll
                ? accountStatsList.filter(a => a.type === 'loan')
                : (currentAccountStat ? [currentAccountStat] : []);
              const today = new Date(); today.setHours(0,0,0,0);
              return (
                <div className="mb-4 flex flex-col gap-2">
                  {loanList.map(acc => {
                    const dueDays = acc.loanDueDate ? Math.round((new Date(acc.loanDueDate) - today) / (1000*60*60*24)) : null;
                    const dueAlert = dueDays !== null && dueDays >= 0 && dueDays <= 90;
                    return acc.loanAmount > 0 ? (
                      <button key={acc.id} onClick={() => !isAll && setLoanItemModal({ isOpen: true, loanId: acc.id, loanName: acc.loanProductName || '', amount: String(acc.loanAmount), rate: acc.loanRate || '', payDay: acc.loanPayDay || '', period: acc.loanPeriod || '', dueDate: acc.loanDueDate || '', linkedAccId: acc.linkedAccId || '', interestCategory: acc.loanInterestCategory || '' })}
                        className={`w-full picture-card p-4 bg-orange-50 border rounded-2xl shadow-sm flex items-center gap-3 text-left transition-colors ${isAll ? 'cursor-default border-orange-200' : 'hover:border-orange-400 border-orange-200'}`}>
                        <div className="bg-orange-100 p-2.5 rounded-xl shrink-0"><span className="text-lg">💸</span></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-[12px] text-slate-800 truncate">{acc.loanProductName || acc.name}</div>
                          <div className="text-[10px] text-orange-500 font-bold mt-0.5">
                            {acc.loanRate ? `연 ${acc.loanRate}%` : ''}
                            {acc.loanPayDay ? ` · 매월 ${acc.loanPayDay}일` : ''}
                            {acc.loanDueDate ? ` · 만기 ${acc.loanDueDate}` : ''}
                          </div>
                          {dueAlert && <div className={`text-[9px] font-black mt-0.5 ${dueDays <= 30 ? 'text-rose-500' : 'text-amber-500'}`}>{dueDays === 0 ? '🚨 오늘 만기!' : `⚠️ 만기 D-${dueDays}`}</div>}
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="font-black text-[13px] text-rose-600">-₩{formatNum(acc.loanAmount)}</span>
                          {acc.loanRate && acc.loanAmount && (
                            <span className="text-[9px] text-slate-400 font-bold mt-0.5">월 이자 ₩{formatNum(Math.round(toPureNumber(acc.loanAmount) * toPureNumber(acc.loanRate) / 100 / 12))}</span>
                          )}
                        </div>
                      </button>
                    ) : null;
                  })}
                  {!isAll && loanList[0]?.loanAmount === 0 && (
                    <button onClick={() => setLoanItemModal({ isOpen: true, loanId: currentAccountStat.id, loanName: '', amount: '', rate: '', payDay: '', period: '', dueDate: '', linkedAccId: '', interestCategory: '' })} className="w-full picture-card p-4 flex flex-col items-center justify-center bg-orange-50 border-2 border-dashed border-orange-200 transition-colors group min-h-[70px]">
                      <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-1.5"><Plus className="text-orange-500" size={16} /></div>
                      <span className="font-black text-[10px] text-orange-600">새 항목 추가</span>
                    </button>
                  )}
                  {!isAll && !loanList[0] && (
                    <button onClick={() => setLoanItemModal({ isOpen: true, loanId: currentAccountStat.id, loanName: '', amount: '', rate: '', payDay: '', period: '', dueDate: '', linkedAccId: '', interestCategory: '' })} className="w-full picture-card p-4 flex flex-col items-center justify-center bg-orange-50 border-2 border-dashed border-orange-200 transition-colors group min-h-[70px]">
                      <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-1.5"><Plus className="text-orange-500" size={16} /></div>
                      <span className="font-black text-[10px] text-orange-600">새 항목 추가</span>
                    </button>
                  )}
                </div>
              );
            })()}
            {/* 컴팩트화된 종목 리스트 그리드 */}
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2 ${currentAccountStat?.type === 'loan' ? 'hidden' : ''}`}>
              {currentAccountStat?.rebalanceData.length === 0 ? (
                <button onClick={handleAddClick} className={`col-span-full picture-card p-4 flex flex-col items-center justify-center ${t.light} border-2 border-dashed ${t.border} transition-colors group min-h-[90px] md:min-h-[110px]`}><div className={`bg-white p-2 md:p-2.5 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-1.5 md:mb-2`}><Plus className={t.text} size={16} /></div><span className={`font-black text-[10px] md:text-[11px] ${t.text}`}>{stocks.length === 0 ? '텅 비어있어요! 첫 항목 추가' : '새 항목 추가'}</span></button>
              ) : (
                <>
                  {currentAccountStat?.rebalanceData.map(s => {
                    const isP = s.stockROI >= 0, isSavings = currentAccountStat.type === 'savings', isSpending = currentAccountStat.type === 'spending', isCard = currentAccountStat.type === 'card';
                    const divAmount = toPureNumber(s.quantity) * toPureNumber(s.divPerShare) * (s.isUSD ? toPureNumber(exchangeRate) : 1);
                    
                    const availableSources = [];
                    accounts.filter(a => toPureNumber(a.cash) > 0 && a.id !== selectedAccountId).forEach(a => availableSources.push({ id: a.id, name: a.name, cash: toPureNumber(a.cash) }));
                    if (isSavings && currentAccountStat.cash > 0) {
                      if (!availableSources.some(src => src.id === selectedAccountId)) {
                         availableSources.push({ id: selectedAccountId, name: '입출금 통장', cash: currentAccountStat.cash });
                      }
                    }
                    const canDeposit = availableSources.length > 0;

                    return (
                      <div key={s.id}
                           onDoubleClick={(e) => { e.stopPropagation(); setActiveCardId(s.id); }}
                           onClick={(e) => { e.stopPropagation(); if (isCard) setPrepayModalState({ isOpen: true, cardName: s.name, fromPortfolio: true }); }}
                           className={`account-card-area picture-card p-2 md:p-3 relative cursor-pointer transition-all group flex flex-col justify-between gap-1 overflow-hidden min-h-[95px] md:min-h-[110px] ${activeCardId === s.id ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-md scale-[1.02] z-10' : 'hover:border-slate-300 border-transparent'}`}>
                        
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col min-w-0 pr-1 w-[80%]">
                            <h4 className="font-bold text-slate-800 text-[11px] md:text-[12px] leading-tight flex items-center gap-0.5 md:gap-1 overflow-hidden w-full">
                              {/* 🎯 종목명 물흐름 텍스트 적용 */}
                              <span onClick={(e) => { e.stopPropagation(); setFlowingTextId(s.id); }} className={`cursor-pointer ${flowingTextId === s.id ? 'animate-flow whitespace-nowrap block' : 'truncate'}`}>
                                {s.name}
                              </span>
                              {!isSavings && !isSpending && !isCard && s.ticker && <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-1 py-0.5 rounded shrink-0 ml-0.5">{s.ticker}</span>}
                              {isSavings && s.maturityDate && <button onClick={(e)=>{ e.stopPropagation(); setSavingsMaturityModal({ isOpen: true, targetId: s.id, finalAmount: String(Math.floor(toPureNumber(s.quantity) * (s.interestType==='복리'?Math.pow(1+toPureNumber(s.interestRate)/100,1):(1+toPureNumber(s.interestRate)/100)))) }); }} className="bg-amber-100 text-amber-600 px-1 md:px-1.5 py-0.5 rounded text-[7px] md:text-[8px] font-black shrink-0 ml-0.5 hover:bg-amber-200 transition-colors shadow-sm">🎉 만기</button>}
                              {isCard && (() => {
                                const _goal = toPureNumber(s.performance);
                                if (_goal <= 0) return null;
                                const _raw = (tradeLogs || []).filter(r => r.cardName === s.name && (r.paymentMethod === '체크카드' || r.paymentMethod === '신용카드'));
                                const _today = new Date(); const _py = _today.getMonth() === 0 ? _today.getFullYear()-1 : _today.getFullYear(); const _pm = _today.getMonth() === 0 ? 11 : _today.getMonth()-1;
                                const _ps = new Date(_py, _pm, 1); const _pe = new Date(_py, _pm+1, 0);
                                const _pu = _raw.filter(r => { const d = parseLocalDate(r.date || r.timestamp); return d && d >= _ps && d <= _pe; }).reduce((a, r) => a + toPureNumber(r.amount), 0);
                                return _pu >= _goal ? <span className="text-[7px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap shrink-0">✓ 전월달성</span> : null;
                              })()}
                            </h4>
                            <span className="text-[8px] md:text-[9px] font-bold text-slate-400 mt-0.5 truncate">
                              {isCard ? `${s.cardPayDay ? `결제 ${s.cardPayDay}일` : (s.cardType === '신용' ? '결제일 미설정' : '')}${s.cardPeriod ? ` · 기준 ${s.cardPeriod}일` : ''}` :isSpending ? `혜택 ${s.benefit || 0}%` : isSavings ? (s.interestRate ? `${s.interestType} ${s.interestRate}%` : '') : <>{s.targetRatio !== '' && s.targetRatio !== undefined ? `목표 ${s.targetRatio}% ` : ''}<span className="text-slate-500 font-black">({formatNum(s.currentRatio, 1)}%)</span></>}
                            </span>
                          </div>
                          {!isSavings && !isSpending && toPureNumber(s.divPerShare) > 0 && <span className={`text-[7px] md:text-[8px] font-black ${t.text} ${t.light.split(' ')[0]} px-1 py-0.5 rounded shadow-sm shrink-0 whitespace-nowrap ml-1`}>배당 ₩{formatNum(s.divPerShare)}</span>}
                          {isSavings && <span className={`text-[8px] md:text-[9px] font-black ${t.altText} ${t.altBgOnly} px-1 md:px-1.5 py-0.5 rounded shadow-sm shrink-0 whitespace-nowrap ml-1`}>저축</span>}
                          {isSpending && <span className="text-[8px] md:text-[9px] font-black text-rose-500 bg-rose-50 px-1 md:px-1.5 py-0.5 rounded shadow-sm shrink-0 whitespace-nowrap ml-1">소비</span>}
                          {isCard && <span className={`text-[8px] md:text-[9px] font-black px-1 md:px-1.5 py-0.5 rounded shadow-sm shrink-0 whitespace-nowrap ml-1 ${s.cardType === '신용' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'}`}>{s.cardType || '체크'}</span>}
                          {isCard && s.isNbbang && <span className="text-[7px] md:text-[8px] font-black text-slate-400 bg-slate-100 px-1 py-0.5 rounded ml-0.5">N빵</span>}
                        </div>
                        
                        <div className="flex justify-between items-end bg-slate-50 rounded-md md:rounded-lg p-1.5 md:p-2 border border-slate-100">
                          {isCard ? (
                            (() => {
                              const rawCardLogs = (tradeLogs || []).filter(r => r.cardName === s.name && r.paymentMethod === '신용카드' && !r.isNbbang);
                              const cardLogs = filterByCurrentMonth(rawCardLogs);
                              // 총 카드 사용금액 = N빵 여부 상관없이 내가 실제 카드로 긁은 전체 금액
                              const used = cardLogs.reduce((sum, r) => {
                                const full = r.totalAmount ? Number(r.totalAmount) : toPureNumber(r.amount);
                                return sum + full;
                              }, 0);
                              const goal = toPureNumber(s.performance);
                              const achieved = goal > 0 && used >= goal;
                              const pct = goal > 0 ? Math.min(100, Math.round((used / goal) * 100)) : 0;
                              return (
                                <div className="flex flex-col gap-0.5 min-w-0 w-full">
                                  <span className={`font-black text-[11px] md:text-[12px] truncate text-center ${achieved ? 'text-rose-400' : 'text-slate-800'}`}>₩{formatNum(used)}</span>
                                  {goal > 0 && <>
                                    <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden mt-0.5">
                                      <div className={`h-1 rounded-full transition-all ${achieved ? 'bg-rose-400' : 'bg-lime-400'}`} style={{width:`${pct}%`}}></div>
                                    </div>
                                    <div className="flex justify-between items-center mt-0.5">
                                      <span className={`text-[7px] md:text-[8px] font-black ${achieved ? 'text-rose-400' : 'text-slate-400'}`}>₩{formatNum(used)}</span>
                                      <span className="text-[7px] md:text-[8px] font-black text-slate-400">/ ₩{formatNum(goal)}</span>
                                    </div>
                                  </>}
                                </div>
                              );
                            })()
                          ) : isSpending ? (
                            <div className="flex flex-col gap-0.5 min-w-0 w-full items-center">
                              <span className="text-slate-800 font-black text-[11px] md:text-[12px] truncate">₩{formatNum(s.quantity)}</span>
                            </div>
                          ) : isSavings ? (
                            <div className="flex flex-col gap-0.5 min-w-0 w-full items-center">
                              <span className="text-slate-800 font-black text-[11px] md:text-[12px] truncate">₩{formatNum(s.quantity)}</span>
                              {(s.maturityDate || s.interestRate) && (
                                <span className="text-slate-400 font-bold text-[8px] md:text-[9px] truncate">
                                  {s.maturityDate ? `만기 ${s.maturityDate}` : ''}{s.maturityDate && s.interestRate ? ' · ' : ''}{s.interestRate ? `${s.interestType} ${s.interestRate}%` : ''}
                                </span>
                              )}
                            </div>
                          ) : (<>
                          <div className="flex flex-col gap-0.5 min-w-0"><span className="text-slate-500 font-bold text-[8px] md:text-[9px] truncate">{`${s.isUSD ? '$' : '₩'}${formatNum(s.currentPrice, s.isUSD ? 2 : 0)}`}</span><span className="text-slate-800 font-black text-[9px] md:text-[10px] truncate">{`${formatNum(s.quantity)}주 보유`}</span></div>
                          <div className="flex flex-col items-end gap-0.5 ml-1 text-right min-w-0">{(()=>{const curVal=toPureNumber(s.currentPrice)*toPureNumber(s.quantity)*(s.isUSD?toPureNumber(exchangeRate):1);const profitAmt=curVal-(s.investedKRW||0);const profitPct=s.stockROI;return(<><span className="text-slate-800 font-black text-[9px] md:text-[10px] truncate w-full">₩{formatNum(curVal)}</span><span className={`text-[8px] md:text-[9px] font-black ${isP?t.text:'text-blue-500'}`}>{isP?'+':''}{formatNum(profitAmt)} ({isP?'▲':'▼'}{formatNum(Math.abs(profitPct),1)}%)</span></>);})()}</div>
                          </>)}
                        </div>
                        {!isCard && <div className="flex gap-1 h-[20px] md:h-[24px]">
                          {isSpending ? (
                            <div className="flex gap-1 w-full">
                              <button onClick={(e)=>{ e.stopPropagation(); const savStocks = stocks.filter(st => accounts.find(a => a.id === (st.accountId||'default'))?.type === 'savings'); const linked = s.linkedAccId ? savStocks.find(st => st.accountId === s.linkedAccId) : null; const salary = savStocks.find(st => st.name.includes('월급')); const defKey = linked ? `stock:${linked.id}` : salary ? `stock:${salary.id}` : savStocks[0] ? `stock:${savStocks[0].id}` : ''; setSpendingChargeModal({ isOpen: true, stockId: s.id, amount: '', fromKey: defKey }); }} className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] md:text-[10px] font-black shadow-sm flex items-center justify-center gap-1 w-full whitespace-nowrap py-0.5 md:py-1">💳 충전</button>
                            </div>
                          ) : !isSavings ? ( <>
                            <div className="flex gap-1 flex-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setBuyAmount(''); setTradePrice(s.currentPrice ? String(toPureNumber(s.currentPrice)) : ''); setTradeModal({ isOpen: true, mode: 'buy', stockId: s.id }); }}
                                className={`flex-1 flex items-center justify-center gap-0.5 ${t.light} rounded-lg text-[9px] md:text-[10px] font-black py-1 shadow-sm bubbly-btn`}
                              >
                                <TrendingUp size={9}/> 매수
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSellAmount(''); setTradePrice(s.currentPrice ? String(toPureNumber(s.currentPrice)) : ''); setTradeModal({ isOpen: true, mode: 'sell', stockId: s.id }); }}
                                className="flex-1 flex items-center justify-center gap-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[9px] md:text-[10px] font-black py-1 shadow-sm bubbly-btn hover:bg-slate-200 transition-colors"
                              >
                                <TrendingDown size={9}/> 매도
                              </button>
                            </div>
                          </> ) : (
                            <div className="flex gap-1 w-full">
                              <button onClick={(e)=>{ e.stopPropagation(); const defFrom = availableSources[0]?.id || 'wallet'; setSavingsTradeModal({ isOpen: true, mode: 'deposit', stockId: s.id, amount: '', fromAccId: defFrom, toAccId: 'wallet' }); }} className={`flex-1 ${t.altLight} border ${t.border} rounded-lg text-[9px] md:text-[10px] font-black shadow-sm flex items-center justify-center gap-0.5 py-1`}><Landmark size={9}/> 저축</button>
                              <button onClick={(e)=>{ e.stopPropagation(); setSavingsTradeModal({ isOpen: true, mode: 'withdraw', stockId: s.id, amount: '', fromAccId: '', toAccId: 'wallet' }); }} className="flex-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[9px] md:text-[10px] font-black shadow-sm flex items-center justify-center gap-0.5 py-1 hover:bg-slate-200 transition-colors">💸 출금</button>
                            </div>
                          )}
                        </div>}

                        {/* 🎯 더블클릭 시 노출되도록 hover 속성 제거 및 투명도 전환 */}
                        <div className={`absolute top-1.5 md:top-2 right-1.5 md:right-2 flex gap-0.5 md:gap-1 bg-white/90 backdrop-blur-sm p-0.5 md:p-1 rounded-md md:rounded-lg border border-slate-100 shadow-sm transition-all duration-200 ${activeCardId === s.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                          <button className="p-1 md:p-1.5 text-slate-400 hover:text-blue-500 transition-colors rounded" onClick={(e) => { e.stopPropagation(); handleEditClick(s); setActiveCardId(null); }}><Edit2 size={12} className="md:w-3.5 md:h-3.5"/></button>
                          <button className="p-1 md:p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded" onClick={(e) => { e.stopPropagation(); handleDeleteStock(e, s.id); setActiveCardId(null); }}><Trash2 size={12} className="md:w-3.5 md:h-3.5"/></button>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={handleAddClick} className={`picture-card p-2 md:p-3 flex flex-col items-center justify-center ${t.light} border-dashed ${t.border} transition-colors group min-h-[90px] md:min-h-[110px]`}><div className={`bg-white p-2 md:p-2.5 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-1.5 md:mb-2`}><Plus className={`${t.text} md:w-4 md:h-4`} size={14} /></div><span className={`font-black text-[10px] md:text-[11px] ${t.text}`}>{stocks.length === 0 ? '텅 비어있어요! 첫 항목 추가' : '새 항목 추가'}</span></button>
                </>
              )}
            </div>
          </div>
        )}

        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (() => {
          const typeOrder = ['stock','savings','spending','card','loan'];
          const typeLabel = { stock: '주식', savings: '저축', spending: '소비', card: '카드', loan: '대출' };
          const typeEmoji = { stock: '📈', savings: '🏦', spending: '🛍️', card: '💳', loan: '💸' };
          const typeColor = {
            stock:   { bg: 'bg-white', border: 'border-slate-100', dot: t.main.split(' ')[0], val: 'text-slate-800', sub: 'text-slate-400', activeBg: t.light, activeBorder: t.border, activeVal: t.text },
            savings: { bg: 'bg-white', border: 'border-slate-100', dot: 'bg-emerald-400', val: 'text-slate-800', sub: 'text-slate-400', activeBg: 'bg-emerald-50', activeBorder: 'border-emerald-200', activeVal: 'text-emerald-700' },
            spending:{ bg: 'bg-white', border: 'border-slate-100', dot: 'bg-rose-400', val: 'text-slate-800', sub: 'text-slate-400', activeBg: 'bg-rose-50', activeBorder: 'border-rose-200', activeVal: 'text-rose-700' },
            card:    { bg: 'bg-white', border: 'border-slate-100', dot: 'bg-purple-400', val: 'text-slate-800', sub: 'text-slate-400', activeBg: 'bg-purple-50', activeBorder: 'border-purple-200', activeVal: 'text-purple-700' },
            loan:    { bg: 'bg-white', border: 'border-slate-100', dot: 'bg-orange-400', val: 'text-slate-800', sub: 'text-slate-400', activeBg: 'bg-orange-50', activeBorder: 'border-orange-200', activeVal: 'text-orange-700' },
          };
          const existingTypes = typeOrder.filter(type => accounts.some(a => a.type === type));

          // 타입별 합산
          const typeSummary = {};
          typeOrder.forEach(type => {
            const typeStats = accountStatsList.filter(a => a.type === type);
            if (type === 'loan') {
              typeSummary[type] = { total: -typeStats.reduce((s,a) => s + (a.loanAmount||0), 0), count: typeStats.length };
            } else if (type === 'card') {
              typeSummary[type] = { total: -typeStats.reduce((s,a) => s + (a.cardItemsNonNbbang||0), 0), count: typeStats.length };
            } else if (type === 'spending') {
              typeSummary[type] = { total: typeStats.reduce((s,a) => s + (a.spendingItemsTotal||0), 0), count: typeStats.length };
            } else {
              typeSummary[type] = { total: typeStats.reduce((s,a) => s + a.totalValue + a.cash, 0), count: typeStats.length };
            }
          });

          // 선택된 타입의 계좌 리스트
          const detailAccs = dashboardTypeTab ? accountStatsList.filter(a => a.type === dashboardTypeTab) : [];

          return (
          <div className="animate-in fade-in duration-500 flex flex-col mt-2 pb-28">
            {/* 상단 총자산 카드 */}
            <div className="flex flex-row gap-2 mb-4 items-stretch min-h-[85px] w-full shrink-0">
              <div className="bg-slate-800 rounded-xl p-3 text-white shadow-md flex flex-row flex-1 items-center gap-3 min-w-0">
                <div className="flex flex-col justify-center shrink-0 w-[40%] sm:w-[35%] border-r border-slate-600/50 pr-2 h-full">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-slate-300 font-bold text-[9px] flex items-center gap-1"><Briefcase size={10}/> 전체 총 자산</span>
                    {accounts.some(a => a.type === 'loan') && (
                      <button onClick={() => setExcludeLoanFromTotal(v => !v)}
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[7px] font-black transition-colors border ${excludeLoanFromTotal ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}>
                        대출제외
                      </button>
                    )}
                  </div>
                  <span className="text-[17px] sm:text-xl font-black break-words leading-tight mb-1">
                    ₩{formatNum(excludeLoanFromTotal ? globalStats.totalAssets + globalStats.totalLoanDebt : globalStats.totalAssets)}
                  </span>
                  <div className="flex gap-2 text-[8px]">
                    <span className="text-slate-400">수익률 <span className={globalStats.totalROI >= 0 ? t.text : 'text-blue-400'}>{formatNum(globalStats.totalROI, 1)}%</span></span>
                    <span className="text-slate-400 hidden sm:inline">원금 ₩{formatNum(globalStats.totalPrincipal)}</span>
                  </div>
                </div>
                <div className="flex-1 h-full flex flex-col justify-end relative min-w-0 pb-0.5">
                  <div className="absolute top-0 right-0 flex gap-1 z-10">
                    <button onClick={() => setChartViewMode('month')} className={`text-[8px] px-1.5 py-0.5 rounded ${chartViewMode === 'month' ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-400'}`}>월별</button>
                    <button onClick={() => setChartViewMode('year')} className={`text-[8px] px-1.5 py-0.5 rounded ${chartViewMode === 'year' ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-400'}`}>연별</button>
                  </div>
                  {chartDataFinal.length > 0 ? (
                    <div className="w-full h-[45px] relative">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d={`M ${chartPointsFinal}`} fill="none" stroke="#94a3b8" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="text-[9px] font-bold text-slate-500 opacity-60 flex items-center justify-center h-full w-full">데이터 없음</div>
                  )}
                </div>
              </div>
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl w-[70px] sm:w-[90px] flex flex-col items-center justify-center shrink-0 p-1.5">
                <img src={easterEgg.img} alt="level" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-sm mb-1 bg-slate-50" />
                <span className="text-[8px] font-black text-slate-700 text-center tracking-tighter truncate w-full px-0.5">{easterEgg.msg}</span>
              </div>
            </div>

            {/* 5가지 타입 요약 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {existingTypes.map(type => {
                const c = typeColor[type];
                const s = typeSummary[type];
                const isActive = dashboardTypeTab === type;
                const isNeg = type === 'loan' || type === 'card';
                const typeAccs = accountStatsList.filter(a => a.type === type);
                return (
                  <button key={type} onClick={() => {
                    if (isActive) { setDashboardTypeTab(null); setDashboardAccTab(null); return; }
                    setDashboardTypeTab(type);
                    setDashboardAccTab(null);
                    // 계좌가 1개면 바로 그 계좌를 선택
                    if (typeAccs.length === 1) setDashboardAccTab(typeAccs[0].id);
                  }}
                    className={`text-left rounded-xl p-3.5 border transition-all duration-200 shadow-sm min-h-[90px] flex flex-col justify-between ${isActive ? c.activeBg + ' ' + c.activeBorder : 'bg-white border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                      <span className={`text-[11px] font-black ${isActive ? c.activeVal : 'text-slate-500'}`}>{typeEmoji[type]} {typeLabel[type]}</span>
                      <span className="text-[9px] text-slate-300 font-bold ml-auto">{s.count}개</span>
                    </div>
                    <div className={`text-[15px] font-black leading-tight ${isNeg ? 'text-rose-500' : 'text-slate-800'}`}>
                      {isNeg ? '-' : ''}₩{formatNum(Math.abs(s.total))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 선택된 타입 → 계좌/종목 그리드 */}
            {dashboardTypeTab && (() => {
              const typeAccs = accountStatsList.filter(a => a.type === dashboardTypeTab);
              const exRate = toPureNumber(exchangeRate) || 1392;

              // 종목 카드 렌더러 (작은 카드)
              // 카드 종목별 내 몫 금액 계산 헬퍼
              const getCardItemMyUsed = (cardName) => {
                const rawLogs = (tradeLogs || []).filter(r => r.cardName === cardName && r.paymentMethod === '신용카드' && !r.isNbbang);
                return filterByCurrentMonth(rawLogs).reduce((sum, r) => sum + toPureNumber(r.amount), 0);
              };

              const renderItemGrid = (acc) => {
                const isLoan = acc.type === 'loan';
                const isCard = acc.type === 'card';
                const isSpending = acc.type === 'spending';
                const isSavings = acc.type === 'savings';
                const isStock = acc.type === 'stock';
                const accStocks = stocks.filter(s => (s.accountId || 'default') === acc.id);
                if (accStocks.length === 0) return (
                  <div className="text-center text-[11px] text-slate-300 font-bold py-4">항목이 없습니다</div>
                );
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
                    {accStocks.map(s => {
                      const qty = toPureNumber(s.quantity);
                      const curP = toPureNumber(s.currentPrice);
                      const buyP = toPureNumber(s.buyPrice);
                      const mult = (s.isUSD && isStock) ? exRate : 1;
                      const cardMyUsed = isCard ? getCardItemMyUsed(s.name) : 0;
                      const curVal = isCard ? cardMyUsed : isSavings || isSpending ? qty : qty * curP * mult;
                      const invested = (isSavings || isSpending || isCard) ? qty : qty * buyP * mult;
                      const roi = (isStock && invested > 0) ? ((curVal - invested) / invested) * 100 : null;
                      const isNeg = isCard || isLoan;
                      return (
                        <div key={s.id} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col gap-1">
                          <span className="font-black text-[10px] text-slate-500 truncate">{s.name}</span>
                          <span className={`text-[13px] font-black leading-tight ${isNeg ? 'text-rose-500' : 'text-slate-800'}`}>
                            {isNeg ? '-' : ''}₩{formatNum(Math.abs(curVal))}
                          </span>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-400 font-bold">
                              {isSavings ? (s.interestRate ? `연 ${s.interestRate}%` : '') : isStock ? `${formatNum(qty)}주` : ''}
                            </span>
                            {roi !== null && <span className={`font-black ${roi >= 0 ? t.text : 'text-blue-400'}`}>{roi >= 0 ? '+' : ''}{formatNum(roi, 1)}%</span>}
                            {isSavings && s.interestRate && <span className="text-emerald-500 font-black">+{s.interestRate}%</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              };

              // 계좌 카드 렌더러
              const renderAccCard = (acc) => {
                const isLoan = acc.type === 'loan';
                const isCard = acc.type === 'card';
                const isSpending = acc.type === 'spending';
                const mainVal = isLoan ? -acc.loanAmount : isCard ? -acc.cardItemsNonNbbang : isSpending ? acc.spendingItemsTotal : acc.totalValue + acc.cash;
                const subLabel = isLoan ? '이자율' : isCard ? '총 사용액' : isSpending ? '잔여금' : '계좌 잔여금';
                const subVal = isLoan ? (acc.loanRate ? `연 ${acc.loanRate}%` : '-') : isCard ? `-₩${formatNum(acc.cardItemsTotal)}` : `₩${formatNum(acc.cash)}`;
                const isSelected = dashboardAccTab === acc.id;
                return (
                  <div key={acc.id}
                    onClick={() => setDashboardAccTab(isSelected ? null : acc.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); setActiveCardId(prev => prev === acc.id ? null : acc.id); }}
                    onContextMenu={(e) => { e.preventDefault(); setActiveCardId(prev => prev === acc.id ? null : acc.id); }}
                    className={`account-card-area relative bg-white rounded-xl p-3.5 border shadow-sm flex flex-col gap-1.5 cursor-pointer select-none transition-all min-h-[90px] justify-between ${isSelected ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-100 hover:border-slate-200'}`}>
                    {activeCardId === acc.id && (
                      <div className="acc-popup absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-lg p-1 flex gap-1 shadow-xl z-50 after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-800">
                        <button onClick={(e) => { e.stopPropagation(); setEditingAccountId(acc.id); setEditAccountName(acc.name); setIsEditAccountOpen(true); setActiveCardId(null); }} className="acc-popup p-1.5 hover:bg-indigo-500 rounded transition-colors"><Edit2 size={12}/></button>
                        {acc.id !== 'default' && <button onClick={(e) => { e.stopPropagation(); showConfirm(`'${acc.name}' 계좌를 삭제할까요?`, () => handleDeleteAccount(acc.id)); setActiveCardId(null); }} className="acc-popup p-1.5 hover:bg-rose-500 rounded transition-colors"><Trash2 size={12}/></button>}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColor[acc.type]?.dot || 'bg-slate-300'}`} />
                      <span className="font-black text-[12px] text-slate-700 truncate">{acc.name}</span>
                      <ChevronDown size={11} className={`ml-auto text-slate-300 shrink-0 transition-transform duration-200 ${isSelected ? 'rotate-180' : ''}`}/>
                    </div>
                    <div className={`text-[15px] font-black ${isLoan || isCard ? 'text-rose-500' : 'text-slate-800'}`}>
                      {(isLoan || isCard) ? '-' : ''}₩{formatNum(Math.abs(mainVal))}
                    </div>
                    <div className="flex justify-between text-[10px] pt-1 border-t border-slate-50">
                      <span className="text-slate-400 font-bold">{subLabel}</span>
                      <span className="text-slate-500 font-black">{subVal}</span>
                    </div>
                  </div>
                );
              };

              return (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
                    <span className="text-[11px] font-black text-slate-500">{typeEmoji[dashboardTypeTab]} {typeLabel[dashboardTypeTab]} 계좌</span>
                    <button onClick={() => { setDashboardTypeTab(null); setDashboardAccTab(null); }} className="ml-auto text-slate-300 hover:text-slate-500 transition-colors"><X size={14}/></button>
                  </div>
                  {typeAccs.length === 1 ? (
                    /* 계좌 1개: 항목들을 계좌 카드와 동일한 큰 카드 그리드로 바로 표시 */
                    (() => {
                      const acc = typeAccs[0];
                      const isLoan = acc.type === 'loan';
                      const isCard = acc.type === 'card';
                      const isSpending = acc.type === 'spending';
                      const isSavings = acc.type === 'savings';
                      const isStock = acc.type === 'stock';
                      const accStocks = stocks.filter(s => (s.accountId || 'default') === acc.id);
                      if (accStocks.length === 0) return <div className="text-center text-[12px] text-slate-300 font-bold py-6">항목이 없습니다</div>;
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {accStocks.map(s => {
                            const qty = toPureNumber(s.quantity);
                            const curP = toPureNumber(s.currentPrice);
                            const buyP = toPureNumber(s.buyPrice);
                            const mult = (s.isUSD && isStock) ? exRate : 1;
                            const cardMyUsed = isCard ? getCardItemMyUsed(s.name) : 0;
                            const curVal = isCard ? cardMyUsed : (isSavings || isSpending) ? qty : qty * curP * mult;
                            const invested = (isSavings || isSpending || isCard) ? qty : qty * buyP * mult;
                            const roi = (isStock && invested > 0) ? ((curVal - invested) / invested) * 100 : null;
                            const isNeg = isCard || isLoan;
                            const subVal = isSavings ? (s.maturityDate ? `만기 ${s.maturityDate}` : '') : isStock ? `${formatNum(qty)}주` : null;
                            return (
                              <div key={s.id} className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm flex flex-col gap-1.5 min-h-[90px] justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColor[acc.type]?.dot || 'bg-slate-300'}`} />
                                  <span className="font-black text-[12px] text-slate-700 truncate">{s.name}</span>
                                </div>
                                <div className={`text-[15px] font-black leading-tight ${isNeg ? 'text-rose-500' : 'text-slate-800'}`}>
                                  {isNeg ? '-' : ''}₩{formatNum(Math.abs(curVal))}
                                </div>
                                <div className="flex justify-between text-[10px] pt-1 border-t border-slate-50">
                                  <span className="text-slate-400 font-bold">{subVal || ''}</span>
                                  {roi !== null && <span className={`font-black ${roi >= 0 ? t.text : 'text-blue-400'}`}>{roi >= 0 ? '+' : ''}{formatNum(roi, 1)}%</span>}
                                  {isSavings && s.interestRate && <span className="text-emerald-500 font-black">{s.interestType} {s.interestRate}%</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    /* 계좌 2개 이상: 계좌 그리드 항상 표시, 선택된 계좌 아래에 작은 종목 카드 */
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {typeAccs.map(acc => renderAccCard(acc))}
                      </div>
                      {dashboardAccTab && accountStatsList.find(a => a.id === dashboardAccTab) && (
                        <div className="animate-in fade-in duration-200 border-t border-slate-100 pt-2">
                          <div className="text-[10px] font-black text-slate-400 mb-1.5 px-0.5">
                            {accountStatsList.find(a => a.id === dashboardAccTab)?.name} 종목
                          </div>
                          {renderItemGrid(accountStatsList.find(a => a.id === dashboardAccTab))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          );
        })()}

       {/* --- HISTORY TAB (월간 요약 내장 + 지능형 4계층 아코디언) --- */}
        {activeTab === 'history' && (() => {
           const cleanMyName = (myDisplayName || '').trim();
           // 1. 텍스트 정제 및 N빵 본인 지분 필터링
           const validLogs = (tradeLogs || []).filter(r => {
              if (r.type === 'expense' && (r.isNbbang || r.category === 'N빵')) {
                 return r.name.includes('(본인 몫)') || (cleanMyName && r.name.includes(`${cleanMyName} 몫`));
              }
              return true;
           }).map(r => ({
              ...r,
              name: (r.name || '').replace(/\(.*?(몫|분)\)/g, '').replace(/\(N빵\)/g, '').trim(),
              amount: Number(r.amount || 0)
           }));

           // 2. 현재 시간 기준 설정
           const now = new Date();
           const ty = String(now.getFullYear());
           const tm = String(now.getMonth() + 1).padStart(2, '0');
           const td = String(now.getDate()).padStart(2, '0');

           // 3. 데이터 그룹화 (각 월별 통계 mStats 포함)
           const grouped = {};

           validLogs.forEach(r => {
               const d = new Date(r.date || r.timestamp || Date.now());
               if(isNaN(d.getTime())) return;
               const y = String(d.getFullYear());
               const m = String(d.getMonth() + 1).padStart(2, '0');
               const day = String(d.getDate()).padStart(2, '0');

               let cat = '기타 소비';
               if (r.type === 'buy') cat = '투자/저축';
               else if (r.type === 'dividend') cat = '배당';
               else if (r.type === 'income' || r.type === 'sell' || r.type === 'deposit') cat = '수익';
               else if (r.type === 'expense') cat = r.category && r.category !== 'N빵' ? r.category : '기타 소비';

               const itemAmt = Number(r.amount || 0);
               const signedAmt = (r.type === 'expense' || r.type === 'buy') ? -itemAmt : itemAmt;

               if(!grouped[y]) grouped[y] = { total: 0, months: {} };
               if(!grouped[y].months[m]) grouped[y].months[m] = { total: 0, days: {}, mStats: { income: 0, dividend: 0, food: 0, other: 0 } };
               if(!grouped[y].months[m].days[day]) grouped[y].months[m].days[day] = { total: 0, incomeSum: 0, expenseSum: 0, categories: {} };
               if(!grouped[y].months[m].days[day].categories[cat]) grouped[y].months[m].days[day].categories[cat] = { total: 0, items: [] };

               grouped[y].total += signedAmt;
               grouped[y].months[m].total += signedAmt;
               grouped[y].months[m].days[day].total += signedAmt;

               // 월간 통계 집계 (해당 월의 데이터로 누적)
               if (cat === '수익') grouped[y].months[m].mStats.income += itemAmt;
               else if (cat === '배당') grouped[y].months[m].mStats.dividend += itemAmt;
               else if (r.type === 'expense') {
                   if (cat === '식비') grouped[y].months[m].mStats.food += itemAmt;
                   else grouped[y].months[m].mStats.other += itemAmt;
               }

               // 일별 요약용 합계
               if (cat === '수익' || cat === '배당') grouped[y].months[m].days[day].incomeSum += itemAmt;
               else if (r.type === 'expense') grouped[y].months[m].days[day].expenseSum += itemAmt;

               grouped[y].months[m].days[day].categories[cat].total += itemAmt;
               grouped[y].months[m].days[day].categories[cat].items.push(r);
           });

           // 4. 지능형 아코디언 초기화
           const isFirstLoad = Object.keys(expandedFootprint).length === 0;
           const isExpanded = (key) => {
              if (isFirstLoad && (key === `y_${ty}` || key === `m_${ty}_${tm}` || key === `d_${ty}_${tm}_${td}`)) return true;
              return expandedFootprint[key];
           };

           const toggleExpand = (key) => {
               setExpandedFootprint(prev => {
                   const next = {...prev};
                   if (isFirstLoad) { next[`y_${ty}`] = true; next[`m_${ty}_${tm}`] = true; next[`d_${ty}_${tm}_${td}`] = true; }
                   next[key] = !isExpanded(key);
                   return next;
               });
           };

           return (
             <section className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm min-h-[400px] mt-2 animate-in fade-in zoom-in duration-300">
               <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                 <h2 className="font-bold text-sm sm:text-base flex items-center gap-1.5 text-slate-800"><span className="text-[16px]">🐾</span> 재테크 발자취</h2>
               </div>

               <div className="flex flex-col gap-3">
                 {Object.keys(grouped).length === 0 ? (
                   <div className="text-center py-10 text-[10px] font-bold text-slate-400">기록된 발자취가 없습니다.</div>
                 ) : (
                   Object.keys(grouped).sort((a,b)=>b.localeCompare(a)).map(y => (
                     <div key={`y_${y}`} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-sm">
                       <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(`y_${y}`)}>
                         <span className="text-[13px] font-black text-slate-800">{y}년</span>
                         <div className="flex items-center gap-2">
                           <span className={`text-[11px] font-black ${grouped[y].total < 0 ? 'text-rose-500' : 'text-blue-600'}`}>{grouped[y].total < 0 ? '-' : '+'}₩{formatNum(Math.abs(grouped[y].total))}</span>
                           {isExpanded(`y_${y}`) ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-400"/>}
                         </div>
                       </div>

                       {isExpanded(`y_${y}`) && (
                         <div className="mt-3 flex flex-col gap-2.5">
                           {Object.keys(grouped[y].months).sort((a,b)=>b.localeCompare(a)).map(m => {
                             const mStats = grouped[y].months[m].mStats;
                             return (
                             <div key={`m_${y}_${m}`} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                               <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleExpand(`m_${y}_${m}`)}>
                                 <span className="text-[12px] font-black text-slate-700 ml-1">{m}월</span>
                                 <div className="flex items-center gap-2">
                                   <span className={`text-[11px] font-bold ${grouped[y].months[m].total < 0 ? 'text-rose-400' : 'text-blue-500'}`}>₩{formatNum(Math.abs(grouped[y].months[m].total))}</span>
                                   {isExpanded(`m_${y}_${m}`) ? <ChevronDown size={12} className="text-slate-400"/> : <ChevronRight size={12} className="text-slate-400"/>}
                                 </div>
                               </div>

                               {isExpanded(`m_${y}_${m}`) && (
                                 <div className="mt-3 flex flex-col gap-2.5">
                                   {/* 🎯 특정 월의 월간 요약 대시보드 (클릭형 지능형 카드) */}
                                   <div className="grid grid-cols-2 gap-2 mb-1 p-1">
                                     <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl flex flex-col justify-center shadow-sm cursor-pointer hover:bg-blue-100 transition-colors" onClick={(e) => { e.stopPropagation(); toggleExpand(`income_detail_${y}_${m}`); }}>
                                       <span className="text-[9px] font-black text-blue-500 mb-0.5 flex justify-between items-center">총 수익 {isExpanded(`income_detail_${y}_${m}`) ? '▲' : '▼'}</span>
                                       <span className="text-xs font-black text-blue-700">₩{formatNum(mStats.income)}</span>
                                     </div>
                                     <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex flex-col justify-center shadow-sm cursor-pointer hover:bg-rose-100 transition-colors" onClick={(e) => { e.stopPropagation(); toggleExpand(`expense_detail_${y}_${m}`); }}>
                                       <span className="text-[9px] font-black text-rose-500 mb-0.5 flex justify-between items-center">총 소비 {isExpanded(`expense_detail_${y}_${m}`) ? '▲' : '▼'}</span>
                                       <span className="text-xs font-black text-rose-700">₩{formatNum(mStats.food + mStats.other)}</span>
                                     </div>
                                   </div>

                                   {/* 🎯 확장 시 대분류 상세 요약 노출 */}
                                   {isExpanded(`income_detail_${y}_${m}`) && (
                                      <div className="bg-white p-2 rounded-lg border border-blue-100 text-[10px] flex flex-col gap-1 mb-2 animate-in slide-in-from-top-1 shadow-sm mx-1">
                                        <div className="flex justify-between"><span className="text-slate-500 font-bold">월급 및 근로/기타</span><span className="font-black text-blue-600">₩{formatNum(mStats.income - (mStats.dividend || 0))}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500 font-bold">배당 수익</span><span className="font-black text-blue-600">₩{formatNum(mStats.dividend || 0)}</span></div>
                                      </div>
                                   )}
                                   {isExpanded(`expense_detail_${y}_${m}`) && (
                                      <div className="bg-white p-2 rounded-lg border border-rose-100 text-[10px] flex flex-col gap-1 mb-2 animate-in slide-in-from-top-1 shadow-sm mx-1">
                                        <div className="flex justify-between"><span className="text-slate-500 font-bold">식비</span><span className="font-black text-rose-600">₩{formatNum(mStats.food)}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500 font-bold">기타 소비</span><span className="font-black text-rose-600">₩{formatNum(mStats.other)}</span></div>
                                      </div>
                                   )}

                                   {/* 🎯 일자별 상세 보기 토글 버튼 신설 */}
                                   <div className="flex justify-center mt-2 mb-2">
                                     <button onClick={(e) => { e.stopPropagation(); toggleExpand(`daily_view_${y}_${m}`); }} className="px-4 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full hover:bg-slate-200 transition-colors shadow-sm">
                                       {isExpanded(`daily_view_${y}_${m}`) ? '일자별 내역 닫기 ▲' : '📅 일자별 상세 보기 ▼'}
                                     </button>
                                   </div>

                                   {/* 🎯 일자별 렌더링 맵핑 (토글 안에 감싸기) */}
                                   {isExpanded(`daily_view_${y}_${m}`) && (
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start calendar-detail-area">
                                       {Object.keys(grouped[y].months[m].days).sort((a,b)=>b.localeCompare(a)).map(day => {
                                          const dayData = grouped[y].months[m].days[day];
                                          return (
                                         <div key={`d_${y}_${m}_${day}`} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                           {/* 일별 요약 헤더 */}
                                           <div className="flex justify-between items-center cursor-pointer p-1" onClick={() => toggleExpand(`d_${y}_${m}_${day}`)}>
                                             <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-slate-800 bg-white px-2 py-0.5 rounded-md shadow-sm">{m}.{day}</span>
                                                <div className="flex gap-1.5">
                                                  {dayData.incomeSum > 0 && <span className="text-[9px] font-black text-blue-500 bg-blue-100/50 px-1.5 rounded">+₩{formatNum(dayData.incomeSum)}</span>}
                                                  {dayData.expenseSum > 0 && <span className="text-[9px] font-black text-rose-500 bg-rose-100/50 px-1.5 rounded">-₩{formatNum(dayData.expenseSum)}</span>}
                                                </div>
                                             </div>
                                             {isExpanded(`d_${y}_${m}_${day}`) ? <ChevronDown size={12} className="text-slate-400"/> : <ChevronRight size={12} className="text-slate-400"/>}
                                           </div>

                                           {/* 일별 대분류 카테고리 요약 */}
                                           {isExpanded(`d_${y}_${m}_${day}`) && (
                                             <div className="grid grid-cols-2 gap-1.5 mt-2">
                                               {Object.keys(dayData.categories).map(cat => {
                                                  const catData = dayData.categories[cat];
                                                  const catKey = `c_${y}_${m}_${day}_${cat}`;
                                                  const isCatExpanded = isExpanded(catKey);
                                                  const isIncome = cat === '수익' || cat === '배당';
                                                  const isInvest = cat === '투자/저축';
                                                  const colorClass = isIncome ? 'text-blue-500' : (isInvest ? 'text-purple-500' : 'text-rose-500');
                                                  const sign = isIncome ? '+' : '-';

                                                  return (
                                                    <div key={catKey} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-300 transition-colors">
                                                      {/* 대분류 클릭 버튼 */}
                                                      <div className="p-2 flex justify-between items-center cursor-pointer bg-slate-50/50" onClick={(e) => { e.stopPropagation(); toggleExpand(catKey); }}>
                                                        <span className={`text-[9px] font-black flex items-center gap-0.5 ${colorClass}`}>
                                                          {isCatExpanded ? <ChevronDown size={10}/> : <ChevronRight size={10}/>} {cat}
                                                        </span>
                                                        <span className={`text-[10px] font-black ${colorClass}`}>
                                                          {sign}₩{formatNum(catData.total)}
                                                        </span>
                                                      </div>
                                                      
                                                      {/* 펼쳤을 때 나타나는 개별 세부 내역 */}
                                                      {isCatExpanded && (
                                                        <div className="flex flex-col gap-1 p-2 pt-1 border-t border-slate-100 bg-white">
                                                          {catData.items.map(log => (
                                                            <div key={log.id} className="flex justify-between items-start text-[8px]">
                                                              <span className="text-slate-500 truncate pr-1 flex-1 leading-tight">
                                                                {isInvest ? `${log.name} (${log.shares||0}주)` : log.name}
                                                              </span>
                                                              <span className="font-bold text-slate-700 shrink-0">₩{formatNum(log.amount)}</span>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                               })}
                                             </div>
                                           )}
                                         </div>
                                       )})}
                                     </div>
                                   )}
                                 </div>
                               )}
                             </div>
                           )})}
                         </div>
                       )}
                     </div>
                   ))
                 )}
               </div>
             </section>
           );
        })()}

        {/* 🎯 통합 가계부 탭 (달력 및 자금 흐름 연동) */}
      {activeTab === 'accountbook' && (() => {
        const calYear = calendarDate.getFullYear();
        const calMonth = calendarDate.getMonth();
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const daysArray = Array.from({length: daysInMonth}, (_, i) => i + 1);
        const blanks = Array.from({length: firstDay}, (_, i) => i);

        // 🎯 텅 빈 데이터(historyRecords) 대신 올바른 거래내역(tradeLogs) 사용 및 방어적 코딩 적용
        const safeRecords = tradeLogs || [];
        const stats = { year: {}, month: {}, daily: {} };
        ['income', 'expense', 'invest', 'salary'].forEach(t => { stats.year[t] = 0; stats.month[t] = 0; });

        // 🎯 N빵 중복 방지: 결제 그룹(날짜+메모)당 '본인 몫' 딱 1건만 남기기
        const cleanMyName = (myDisplayName || '').trim();
        const myUniqueRecords = [];
        const processedNbbangIds = new Set();

        safeRecords.forEach(r => {
           if (!r) return;
           if (r.type === 'deposit') return;
           if (r.type === 'buy' && r.isSavings) return;
           if (r.type === 'expense' && r.category === '카드대금') return;
           if (r.type === 'expense' && r.isNbbang) {
              const isMyShare = r.name.includes('(본인 몫)') || (cleanMyName && r.name.includes(`${cleanMyName} 몫`));
              const groupId = `${r.date}_${r.memo || 'nbbang'}`; // 🎯 고유 그룹키
              if (isMyShare && !processedNbbangIds.has(groupId)) {
                 processedNbbangIds.add(groupId);
                 myUniqueRecords.push({...r, amount: Number(r.amount || 0)}); // 🎯 전체 금액이 아닌 1인분만 저장!
              }
           } else {
              // 나를 제외한 N빵 결제자 로그(myInNbbang===false)는 달력 소비에서 제외
              if (r.type === 'expense' && r.nbbangCount > 1 && r.myInNbbang === false) return;
              myUniqueRecords.push(r);
           }
        });

        myUniqueRecords.forEach(r => {
          const d = new Date(r?.date || r?.timestamp || Date.now());
          if (isNaN(d.getTime())) return; 

          const rYear = d.getFullYear();
          const rMonth = d.getMonth();
          const rDay = d.getDate();
          
          let amtForStat = Number(r.amount || 0);
          
          let cat = 'income';
          if (r.type === 'deposit') return;
          if (r.type === 'expense' && r.category === '카드대금') return;
          if (r.type === 'buy') cat = 'invest';
          else if (r.type === 'expense') {
             cat = r.category && r.category !== 'N빵' ? r.category : 'expense';
          }
          else if (r.type === 'income' && r.category === '급여') cat = 'salary';
          else if (r.type === 'income' || r.type === 'dividend' || r.type === 'sell') cat = 'income';

          if (rYear === calYear) {
             if (stats.year[cat] === undefined) stats.year[cat] = 0;
             stats.year[cat] += amtForStat;
             if (r.type === 'expense' && cat !== 'expense') stats.year.expense += amtForStat;
             if (rMonth === calMonth) {
               if (stats.month[cat] === undefined) stats.month[cat] = 0;
               stats.month[cat] += amtForStat;
               if (r.type === 'expense' && cat !== 'expense') stats.month.expense += amtForStat;
               if (!stats.daily[rDay]) stats.daily[rDay] = { income: 0, expense: 0, invest: 0, salary: 0, records: [] };
               if (stats.daily[rDay][cat] === undefined) stats.daily[rDay][cat] = 0;

               stats.daily[rDay][cat] += amtForStat;
               if (r.type === 'expense' && cat !== 'expense') stats.daily[rDay].expense += amtForStat;
               // 🎯 텍스트 정제 (N빵 꼬리표 완벽 삭제)
               stats.daily[rDay].records.push({
                 ...r,
                 name: (r.name||'').replace(/\(.*?(몫|분)\)/g, '').replace(/\(N빵\)/g, '').trim(),
                 viewCategory: r.type === 'expense' ? 'expense' : cat
               });
             }
          }
        });

        const thisMonthRecords = safeRecords.filter(r => {
           if (!r) return false;
           const d = new Date(r?.date || r?.timestamp || Date.now());
           if (isNaN(d.getTime())) return false;
           return d.getFullYear() === calYear && d.getMonth() === calMonth;
        });
        
        const nbbangRecords = thisMonthRecords.filter(r => r?.isNbbang);
        const cardRecords = thisMonthRecords.filter(r => r?.paymentMethod === '신용카드');

        return (
          <div className="max-w-3xl mx-auto px-2 md:px-4 mb-4 animate-in fade-in zoom-in duration-300">
            {/* 가계부 상단 3개 탭 */}
            <div className="flex gap-2 mb-3 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button onClick={() => setAccountbookTab('calendar')} className={`flex-1 py-2 rounded-lg text-[10px] md:text-[11px] font-black transition-colors ${accountbookTab === 'calendar' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>📅 달력</button>
              <button onClick={() => setAccountbookTab('dutch')} className={`flex-1 py-2 rounded-lg text-[10px] md:text-[11px] font-black transition-colors ${accountbookTab === 'dutch' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>🍰 엔빵 정산소</button>
              <button onClick={() => setAccountbookTab('card')} className={`flex-1 py-2 rounded-lg text-[10px] md:text-[11px] font-black transition-colors ${accountbookTab === 'card' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>💳 카드 내역</button>
            </div>

            <div
              className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-3 overflow-hidden"
              ref={calendarSwipeRef}
              onTouchStart={e => { if (showCatStats || calSwipeWheelLock.current) return; calSwipeTouchStart.current = e.touches[0].clientX; setCalSlide({ dragX: 0, animDir: null }); }}
              onTouchMove={e => {
                if (showCatStats || calSwipeTouchStart.current === null || calSwipeWheelLock.current) return;
                const dx = e.touches[0].clientX - calSwipeTouchStart.current;
                if (Math.abs(dx) > 8) setCalSlide({ dragX: dx, animDir: null });
              }}
              onTouchEnd={e => {
                if (showCatStats || calSwipeTouchStart.current === null || calSwipeWheelLock.current) return;
                const dx = e.changedTouches[0].clientX - calSwipeTouchStart.current;
                calSwipeTouchStart.current = null;
                const w = calendarSwipeRef.current?.offsetWidth || window.innerWidth;
                if (Math.abs(dx) < w * 0.2) { setCalSlide({ dragX: 0, animDir: null }); return; }
                const dir = dx < 0 ? 'left' : 'right';
                calSwipeWheelLock.current = true;
                setCalSlide({ dragX: 0, animDir: dir });
                setTimeout(() => {
                  if (dir === 'left') { setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDay(null); }
                  else { setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDay(null); }
                  setCalSlide({ dragX: 0, animDir: null });
                  setTimeout(() => { calSwipeWheelLock.current = false; }, 600);
                }, 330);
              }}
            >
              <div
                className="p-3"
                style={{
                  opacity: calSlide.animDir ? 0 : 1,
                  transition: calSlide.animDir ? 'opacity 0.15s ease-out' : 'opacity 0.2s ease-in',
                }}
              >
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100 mb-3">
                <button onClick={() => { setCalendarDate(new Date(calYear, calMonth - 1, 1)); setSelectedDay(null); }} className="px-3 text-slate-400 hover:text-slate-800 text-lg font-black">&lt;</button>
                <span className="text-sm md:text-base font-black text-slate-800">{calYear}년 {calMonth + 1}월</span>
                <button onClick={() => { setCalendarDate(new Date(calYear, calMonth + 1, 1)); setSelectedDay(null); }} className="px-3 text-slate-400 hover:text-slate-800 text-lg font-black">&gt;</button>
              </div>
              
              {accountbookTab === 'calendar' && (() => {
                const goalKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
                const currentGoal = monthlyGoals[goalKey] || {};
                const expenseGoal = Number(currentGoal.expenseGoal || 0);
                const fixedGoal = Number(currentGoal.fixedGoal || 0);
                const pct = expenseGoal > 0 ? Math.round((stats.month.expense / expenseGoal) * 100) : 0;
                const overGoal = pct >= 100;
                // 이번달 고정비 실제 지출액
                const fixedActual = (() => { const k = `${calYear}-${String(calMonth+1).padStart(2,'0')}`; let s2 = 0; Object.values(stats.daily || {}).forEach(d => { (d.records || []).forEach(r => { if (r.category === '고정비' && new Date(r.date||r.timestamp).getMonth() === calMonth) s2 += Number(r.amount||0); }); }); return s2; })();
                const fixedPct = fixedGoal > 0 ? Math.round((fixedActual / fixedGoal) * 100) : 0;
                const overFixed = fixedPct >= 100;
                return (
                <>
                  <div className="flex justify-end mb-1.5">
                    <div className="flex gap-1">
                      <button onClick={() => setShowGoalModal(true)} className="text-[9px] font-black text-rose-500 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors">🎯 월 목표 설정</button>
                      <button onClick={() => { setCatStatsDate(new Date(calendarDate)); setShowCatStats(true); }} className="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">📊 통계</button>
                      <button onClick={() => setShowShopList(true)} className="relative text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                        🛒 쇼핑리스트
                        {shopItems.filter(i => !i.done).length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">{shopItems.filter(i => !i.done).length}</span>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    <div className="bg-rose-50/60 rounded-xl p-2 border border-rose-100 flex flex-col gap-1 cursor-pointer hover:bg-rose-50 transition-colors" onClick={() => setShowGoalModal(true)}>
                      <div className="text-[10px] md:text-[11px] font-black text-rose-600 text-center border-b border-rose-100 pb-1 mb-0.5">{calMonth + 1}월 목표</div>
                      {expenseGoal > 0 ? <>
                        <div className="flex justify-between text-[8px]">
                          <span className="text-rose-400 font-bold">생활비</span>
                          <span className={`font-black ${overGoal ? 'text-rose-600' : 'text-slate-500'}`}>₩{formatNum(expenseGoal)}</span>
                        </div>
                        <div className="w-full bg-rose-100 rounded-full h-1 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${overGoal ? 'bg-rose-500' : 'bg-rose-300'}`} style={{width: `${Math.min(100, pct)}%`}}></div>
                        </div>
                        <div className="flex justify-between text-[8px]">
                          <span className={`font-bold ${overGoal ? 'text-rose-500' : 'text-slate-400'}`}>{overGoal ? '초과' : '잔여'}</span>
                          <span className={`font-black ${overGoal ? 'text-rose-500' : 'text-emerald-500'}`}>₩{formatNum(Math.abs(expenseGoal - stats.month.expense))}</span>
                        </div>
                      </> : <div className="text-[8px] text-slate-400 text-center py-0.5">생활비 미설정</div>}
                      {fixedGoal > 0 ? <>
                        <div className="flex justify-between text-[8px] mt-0.5">
                          <span className="text-amber-500 font-bold">고정비</span>
                          <span className={`font-black ${overFixed ? 'text-amber-600' : 'text-slate-500'}`}>₩{formatNum(fixedGoal)}</span>
                        </div>
                        <div className="w-full bg-amber-100 rounded-full h-1 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${overFixed ? 'bg-amber-500' : 'bg-amber-300'}`} style={{width: `${Math.min(100, fixedPct)}%`}}></div>
                        </div>
                        <div className="flex justify-between text-[8px]">
                          <span className={`font-bold ${overFixed ? 'text-amber-500' : 'text-slate-400'}`}>{overFixed ? '초과' : '잔여'}</span>
                          <span className={`font-black ${overFixed ? 'text-amber-500' : 'text-emerald-500'}`}>₩{formatNum(Math.abs(fixedGoal - fixedActual))}</span>
                        </div>
                      </> : <div className="text-[8px] text-slate-400 text-center py-0.5">고정비 미설정</div>}
                    </div>
                    <div className="bg-blue-50/30 rounded-xl p-2 border border-blue-50 flex flex-col gap-1">
                      <div className="text-[10px] md:text-[11px] font-black text-blue-600 text-center border-b border-blue-100 pb-1 mb-0.5">{calMonth + 1}월 요약</div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-emerald-600 font-bold">급여</span><span className="font-black text-slate-700">{formatNum(stats.month.salary)}</span></div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-blue-500 font-bold">수익</span><span className="font-black text-slate-700">{formatNum(stats.month.income)}</span></div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-purple-500 font-bold">투자</span><span className="font-black text-slate-700">{formatNum(stats.month.invest)}</span></div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-rose-500 font-bold">소비</span><span className="font-black text-slate-700">{formatNum(stats.month.expense)}</span></div>
                    </div>
                    <div className="bg-amber-50/50 rounded-xl p-2 border border-amber-100 flex flex-col gap-1">
                      <div className="text-[10px] md:text-[11px] font-black text-amber-600 text-center border-b border-amber-200 pb-1 mb-0.5">{selectedDay ? `${selectedDay}일 요약` : '일자 선택'}</div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-emerald-600 font-bold">급여</span><span className="font-black text-slate-700">{formatNum(selectedDay && stats.daily[selectedDay] ? stats.daily[selectedDay].salary : 0)}</span></div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-blue-500 font-bold">수익</span><span className="font-black text-slate-700">{formatNum(selectedDay && stats.daily[selectedDay] ? stats.daily[selectedDay].income : 0)}</span></div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-purple-500 font-bold">투자</span><span className="font-black text-slate-700">{formatNum(selectedDay && stats.daily[selectedDay] ? stats.daily[selectedDay].invest : 0)}</span></div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-rose-500 font-bold">소비</span><span className="font-black text-slate-700">{formatNum(selectedDay && stats.daily[selectedDay] ? stats.daily[selectedDay].expense : 0)}</span></div>
                    </div>
                  </div>

                  {/* 월 목표 설정 모달 */}
                  {showGoalModal && (() => {
                    const gk = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;
                    // 전달 실적 계산
                    const prevY = calMonth === 0 ? calYear - 1 : calYear;
                    const prevM = calMonth === 0 ? 11 : calMonth - 1;
                    const prevExpense = (tradeLogs || []).filter(r => {
                      if (r.type !== 'expense' || r.category === '카드대금' || r.category === '투자/저축' || r.isNbbang) return false;
                      const d = new Date(r.date || r.timestamp);
                      return d.getFullYear() === prevY && d.getMonth() === prevM && r.category !== '고정비';
                    }).reduce((s, r) => s + Number(r.amount || 0), 0);
                    const prevFixed = (tradeLogs || []).filter(r => {
                      if (r.type !== 'expense' || r.category !== '고정비') return false;
                      const d = new Date(r.date || r.timestamp);
                      return d.getFullYear() === prevY && d.getMonth() === prevM;
                    }).reduce((s, r) => s + Number(r.amount || 0), 0);
                    const prevLabel = `${prevM + 1}월`;
                    const handleGoalEnter = (e) => { if (e.key === 'Enter') { setShowGoalModal(false); showToast('✓ 목표 저장 완료'); } };
                    return (
                      <div className="fixed inset-0 z-[100000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowGoalModal(false)}>
                        <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                          {/* 헤더 */}
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-[13px] text-slate-800">🎯 {calMonth + 1}월 목표 설정</h3>
                            <button onClick={() => setShowGoalModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"><X size={14}/></button>
                          </div>
                          {/* 전달 실적 참고 */}
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3">
                            <p className="text-[9px] font-bold text-slate-400 mb-2">{prevLabel} 실적</p>
                            <div className="flex gap-2">
                              <div className="flex-1 bg-white rounded-lg p-2 border border-slate-100 text-center">
                                <p className="text-[8px] font-bold text-rose-400 mb-0.5">생활비</p>
                                <p className="text-[11px] font-black text-slate-700">₩{formatNum(prevExpense)}</p>
                              </div>
                              <div className="flex-1 bg-white rounded-lg p-2 border border-slate-100 text-center">
                                <p className="text-[8px] font-bold text-amber-500 mb-0.5">고정비</p>
                                <p className="text-[11px] font-black text-slate-700">₩{formatNum(prevFixed)}</p>
                              </div>
                            </div>
                          </div>
                          {/* 목표 입력 */}
                          <div className="flex flex-col gap-2 mb-3">
                            <div className="flex items-center gap-2 bg-white rounded-xl p-2.5 border border-slate-200">
                              <span className="text-[10px] font-black text-rose-500 w-12 shrink-0">생활비</span>
                              <div className="relative flex-1 flex items-center">
                                <span className="absolute left-2 text-[10px] font-bold text-slate-300">₩</span>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-5 pr-2 py-1.5 text-[10px] font-black text-right outline-none focus:border-rose-300 focus:bg-white transition-colors" placeholder="목표 금액"
                                  value={(() => { const v = Number((monthlyGoals[gk] || {}).expenseGoal || 0); return v > 0 ? v.toLocaleString() : ''; })()}
                                  onChange={e => { const v = e.target.value.replace(/[^0-9]/g,''); setMonthlyGoals(prev => ({...prev, [gk]: {...(prev[gk]||{}), expenseGoal: v}})); }}
                                  onKeyDown={handleGoalEnter} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-white rounded-xl p-2.5 border border-slate-200">
                              <span className="text-[10px] font-black text-amber-500 w-12 shrink-0">고정비</span>
                              <div className="relative flex-1 flex items-center">
                                <span className="absolute left-2 text-[10px] font-bold text-slate-300">₩</span>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-5 pr-2 py-1.5 text-[10px] font-black text-right outline-none focus:border-amber-300 focus:bg-white transition-colors" placeholder="목표 금액"
                                  value={(() => { const v = Number((monthlyGoals[gk] || {}).fixedGoal || 0); return v > 0 ? v.toLocaleString() : ''; })()}
                                  onChange={e => { const v = e.target.value.replace(/[^0-9]/g,''); setMonthlyGoals(prev => ({...prev, [gk]: {...(prev[gk]||{}), fixedGoal: v}})); }}
                                  onKeyDown={handleGoalEnter} />
                              </div>
                            </div>
                          </div>
                          <button onClick={() => { setShowGoalModal(false); showToast('✓ 목표 저장 완료'); }} className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-[11px] font-black shadow-sm hover:bg-slate-700 transition-colors">저장</button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 연도 요약 모달 */}
                  {/* 🛒 쇼핑리스트 모달 */}
                  {showShopList && (
                    <div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { if (!shopBuyModal) { if (shopMode) { setShopMode(null); setShopEditId(null); } else setShowShopList(false); } }}>
                      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
                          <h3 className="font-black text-sm text-slate-800">🛒 쇼핑리스트</h3>
                          <div className="flex items-center gap-1.5">
                            {shopItems.some(i => i.done) && !shopMode && (
                              <button onClick={() => setShopItems(prev => prev.filter(i => !i.done))} className="text-[9px] font-black text-slate-400 hover:text-rose-500 transition-colors">완료 삭제</button>
                            )}
                            {shopItems.length > 0 && (
                              <>
                                <button
                                  onClick={() => { setShopMode(prev => prev === 'edit' ? null : 'edit'); setShopEditId(null); }}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${shopMode === 'edit' ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-600'}`}
                                >수정</button>
                                <button
                                  onClick={() => { setShopMode(prev => prev === 'delete' ? null : 'delete'); setShopEditId(null); }}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${shopMode === 'delete' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-500'}`}
                                >삭제</button>
                              </>
                            )}
                            <button onClick={() => { setShowShopList(false); setShopMode(null); setShopEditId(null); }} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
                          </div>
                        </div>
                        {/* 입력창 */}
                        <div className="px-4 pt-3 pb-2 shrink-0">
                          <form onSubmit={e => {
                            e.preventDefault();
                            const name = shopInput.trim();
                            if (!name) return;
                            setShopItems(prev => [{ id: Date.now().toString(), name, done: false }, ...prev]);
                            setShopInput('');
                          }} className="flex gap-2">
                            <input type="text" value={shopInput} onChange={e => setShopInput(e.target.value)} placeholder="살 것을 입력하세요" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold outline-none focus:border-emerald-400"/>
                            <button type="submit" className="bg-emerald-500 text-white px-3 py-2 rounded-xl text-[11px] font-black hover:bg-emerald-600 transition-colors shrink-0"><Plus size={14}/></button>
                          </form>
                        </div>
                        {/* 2열 리스트 */}
                        <div className="overflow-y-auto flex-1 px-4 pb-4" onClick={() => { if (shopMode) { setShopMode(null); setShopEditId(null); } }}>
                          {shopMode && (
                            <p className="text-center text-[9px] font-black pt-2 pb-0.5 transition-all">
                              {shopMode === 'edit'
                                ? <span className="text-amber-500">수정할 항목을 눌러주세요</span>
                                : <span className="text-rose-500">삭제할 항목을 눌러주세요</span>}
                            </p>
                          )}
                          {shopItems.length === 0 ? (
                            <div className="text-center py-8 text-[11px] text-slate-300 font-bold">살 것을 추가해보세요!</div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              {shopItems.map(item => {
                                const isEditing = shopEditId === item.id;
                                return (
                                <div key={item.id}
                                  className={`relative flex flex-col gap-1 px-3 py-2.5 rounded-xl border transition-all select-none cursor-pointer
                                    ${isEditing ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                                    : shopMode === 'edit' ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
                                    : shopMode === 'delete' ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400'
                                    : item.done ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (shopMode === 'edit') {
                                      setShopEditId(item.id);
                                      setShopEditName(item.name);
                                    } else if (shopMode === 'delete') {
                                      showConfirm(`"${item.name}"을(를) 삭제할까요?`, () => {
                                        setShopItems(prev => prev.filter(i => i.id !== item.id));
                                      });
                                    } else {
                                      if (item.done) {
                                        setShopItems(prev => prev.map(i => i.id === item.id ? { ...i, done: false } : i));
                                      } else {
                                        setShopBuyAmount('');
                                        setShopBuyCategory('식비');
                                        setShopBuyEtcDetail('');
                                        setShopBuyModal({ id: item.id, name: item.name });
                                      }
                                    }
                                  }}
                                >
                                  {isEditing ? (
                                    <div className="flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        value={shopEditName}
                                        onChange={e => setShopEditName(e.target.value)}
                                        className="w-full text-[10px] font-black text-slate-800 border border-amber-300 rounded-lg px-2 py-1 outline-none bg-white"
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            const n = shopEditName.trim();
                                            if (n) setShopItems(prev => prev.map(i => i.id === item.id ? { ...i, name: n } : i));
                                            setShopEditId(null);
                                          }
                                          if (e.key === 'Escape') setShopEditId(null);
                                        }}
                                      />
                                      <div className="flex gap-1">
                                        <button className="flex-1 py-1 rounded-lg bg-amber-400 text-white text-[8px] font-black" onClick={() => {
                                          const n = shopEditName.trim();
                                          if (n) setShopItems(prev => prev.map(i => i.id === item.id ? { ...i, name: n } : i));
                                          setShopEditId(null);
                                        }}>완료</button>
                                        <button className="flex-1 py-1 rounded-lg bg-slate-200 text-slate-600 text-[8px] font-black" onClick={() => setShopEditId(null)}>취소</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${item.done ? 'bg-emerald-400 border-emerald-400' : shopMode === 'delete' ? 'border-rose-300' : 'border-slate-300'}`}>
                                        {item.done && <span className="text-white text-[8px] font-black">✓</span>}
                                        {shopMode === 'delete' && !item.done && <span className="text-rose-400 text-[8px] font-black">✕</span>}
                                      </div>
                                      <span className={`text-[11px] font-black transition-all leading-tight ${item.done ? 'line-through text-slate-300' : shopMode === 'edit' ? 'text-amber-700' : shopMode === 'delete' ? 'text-rose-600' : 'text-slate-700'}`}>{item.name}</span>
                                      {item.paidAmount && (
                                        <span className="text-[9px] font-black text-emerald-600">₩{formatNum(item.paidAmount)}</span>
                                      )}
                                    </>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 구매 기록 팝업 */}
                      {shopBuyModal && (
                        <div className="absolute inset-0 flex items-center justify-center p-4" onClick={() => setShopBuyModal(null)}>
                          <div className="bg-white rounded-2xl w-full max-w-[260px] shadow-2xl p-5 animate-in zoom-in duration-200 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                            <div>
                              <h3 className="font-black text-sm text-slate-800 mb-0.5">얼마에 사셨어요? 🛍️</h3>
                              <p className="text-[10px] font-bold text-slate-400 truncate">{shopBuyModal.name}</p>
                            </div>
                            {/* 카테고리 선택 */}
                            <div className="flex flex-wrap gap-1.5">
                              {['식비', '생필품', '의류비', '고정비', '기타'].map(cat => (
                                <button key={cat} onClick={() => { setShopBuyCategory(cat); if (cat !== '기타') setShopBuyEtcDetail(''); }}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black border transition-all ${shopBuyCategory === cat ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300'}`}>
                                  {cat}
                                </button>
                              ))}
                            </div>
                            {shopBuyCategory === '기타' && (
                              <input type="text" placeholder="어떤 내역인지 입력 (선택)" value={shopBuyEtcDetail} onChange={e => setShopBuyEtcDetail(e.target.value)}
                                className="w-full text-[10px] font-black border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-300 bg-slate-50 placeholder:text-slate-300"
                                autoFocus
                              />
                            )}
                            {/* 금액 입력 */}
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                              <span className="text-[11px] font-black text-slate-400">₩</span>
                              <input type="text" inputMode="numeric" autoFocus placeholder="금액 입력"
                                value={toCommaString(shopBuyAmount)}
                                onChange={e => setShopBuyAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.closest('form')?.requestSubmit(); }}
                                className="flex-1 bg-transparent text-[13px] font-black text-slate-800 outline-none text-right"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setShopBuyModal(null)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 text-[11px] font-black hover:bg-slate-200 transition-colors">취소</button>
                              <button onClick={() => {
                                const amt = toPureNumber(shopBuyAmount);
                                if (!amt) return showToast('⚠️ 금액을 입력해주세요.');
                                const today = new Date();
                                const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
                                setTradeLogs(prev => [{
                                  id: `shop_${Date.now()}`,
                                  date: dateStr,
                                  timestamp: Date.now(),
                                  type: 'expense',
                                  name: shopBuyModal.name,
                                  amount: amt,
                                  category: shopBuyCategory === '기타' ? (shopBuyEtcDetail.trim() || '기타') : shopBuyCategory,
                                  paymentMethod: '현금',
                                }, ...prev]);
                                setShopItems(prev => prev.map(i => i.id === shopBuyModal.id ? { ...i, done: true, paidAmount: amt } : i));
                                showToast(`✅ ${shopBuyModal.name} ₩${formatNum(amt)} 가계부 기록!`);
                                setShopBuyModal(null);
                              }} className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-[11px] font-black hover:bg-rose-600 transition-colors shadow-sm">확인</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 📊 카테고리별 통계 모달 */}
                  {showCatStats && (() => {
                    const isYear = catStatsMode === 'year';
                    const statsDate = catStatsDate || calendarDate;
                    const statsMonth = statsDate.getMonth();
                    const statsYear = statsDate.getFullYear();
                    const label = isYear ? `${statsYear}년` : `${statsYear}년 ${statsMonth + 1}월`;
                    const goMonth = (delta) => setCatStatsDate(prev => { const d = new Date(prev || calendarDate); d.setMonth(d.getMonth() + delta); return d; });

                    // 제외할 카테고리 (카드대금, 충전 등 실제 소비 아닌 것)
                    const EXCLUDED_EXP_CATS = new Set(['카드대금', '충전', '계좌이체', 'N빵', '지갑 충전']);

                    const expCats = {};
                    let totalSalary = 0, totalIncome = 0, totalInvest = 0;
                    myUniqueRecords.forEach(r => {
                      if (!r) return;
                      const d = new Date(r.date || r.timestamp || Date.now());
                      if (isNaN(d.getTime())) return;
                      const rYear = d.getFullYear(); const rMonth = d.getMonth();
                      if (rYear !== statsYear) return;
                      if (!isYear && rMonth !== statsMonth) return;
                      const amt = Number(r.amount || 0);
                      if (r.type === 'expense') {
                        const cat = r.category && r.category !== 'N빵' ? r.category : '기타';
                        if (!EXCLUDED_EXP_CATS.has(cat)) expCats[cat] = (expCats[cat] || 0) + amt;
                      } else if (r.type === 'income' && r.category === '급여') {
                        totalSalary += amt;
                      } else if (r.type === 'income' || r.type === 'dividend' || r.type === 'sell') {
                        totalIncome += amt;
                      } else if (r.type === 'buy') {
                        totalInvest += amt;
                      }
                    });
                    const totalExp = Object.values(expCats).reduce((a, b) => a + b, 0);
                    const sortedCats = Object.entries(expCats).sort((a, b) => b[1] - a[1]);
                    const catColors = { '식비': 'bg-orange-50 border-orange-100 text-orange-600', '생필품': 'bg-amber-50 border-amber-100 text-amber-600', '의류비': 'bg-pink-50 border-pink-100 text-pink-600', '고정비': 'bg-slate-100 border-slate-200 text-slate-600', '기타': 'bg-slate-50 border-slate-200 text-slate-500' };
                    const defaultCatColor = 'bg-rose-50 border-rose-100 text-rose-600';

                    // 고정비 대분류별 합계
                    const fixedGrouped = {};
                    fixedExpenses.forEach(fe => {
                      const dash = fe.name.indexOf('-');
                      const cat = dash > 0 ? fe.name.slice(0, dash).trim() : fe.name.trim();
                      const krw = fe.isUSD ? Math.round(Number(fe.amount) * (toPureNumber(exchangeRate) || 1350)) : Number(fe.amount);
                      fixedGrouped[cat] = (fixedGrouped[cat] || 0) + krw;
                    });
                    const fixedGroupEntries = Object.entries(fixedGrouped).sort((a,b) => b[1]-a[1]);
                    const totalFixed = fixedGroupEntries.reduce((s,[,v])=>s+v,0);

                    return (
                      <div className="fixed inset-0 z-[100000] bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setShowCatStats(false)}>
                        <div ref={catStatsRef} className="bg-white rounded-2xl w-full max-w-xs shadow-xl flex flex-col max-h-[85vh] animate-in zoom-in duration-200"
                          onClick={e => e.stopPropagation()}>
                          {/* 헤더 */}
                          <div className="flex justify-between items-center px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">지출 요약</p>
                              <h3 className="font-black text-[15px] text-slate-800">{label}</h3>
                            </div>
                            <button onClick={() => setShowCatStats(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
                          </div>
                          {/* 월/연 토글 */}
                          <div className="flex items-center px-5 pt-3 gap-1.5 shrink-0">
                            {!isYear && <button onClick={() => goMonth(-1)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0"><ChevronRight size={14} className="rotate-180"/></button>}
                            <button onClick={() => setCatStatsMode('month')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-colors ${catStatsMode === 'month' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{statsMonth + 1}월</button>
                            {!isYear && <button onClick={() => goMonth(1)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0"><ChevronRight size={14}/></button>}
                            <button onClick={() => setCatStatsMode('year')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-colors ${catStatsMode === 'year' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{statsYear}년</button>
                          </div>
                          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4" style={{ touchAction: 'pan-y' }}>
                            {/* 수입·투자 */}
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-2">수입 · 투자</p>
                              <div className="flex flex-col divide-y divide-slate-50 bg-slate-50 rounded-xl overflow-hidden">
                                {[['급여', totalSalary], ['수익 (배당 포함)', totalIncome], ['투자', totalInvest]].map(([label, val]) => (
                                  <div key={label} className="flex justify-between items-center px-3 py-2.5">
                                    <span className="text-[11px] font-bold text-slate-600">{label}</span>
                                    <span className="text-[12px] font-black text-slate-800">₩{formatNum(val)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* 생활비 */}
                            <div>
                              <div className="flex items-baseline justify-between mb-2">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">생활비</p>
                                {totalExp > 0 && <span className="text-[11px] font-black text-slate-700">₩{formatNum(totalExp)}</span>}
                              </div>
                              {sortedCats.length === 0
                                ? <p className="text-[11px] text-slate-400 text-center py-3">기록 없음</p>
                                : <div className="flex flex-col divide-y divide-slate-50 bg-slate-50 rounded-xl overflow-hidden">
                                    {sortedCats.map(([cat, amt]) => {
                                      const pct = totalExp > 0 ? Math.round((amt / totalExp) * 100) : 0;
                                      return (
                                        <div key={cat} className="flex justify-between items-center px-3 py-2.5">
                                          <span className="text-[11px] font-bold text-slate-600">{cat}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400">{pct}%</span>
                                            <span className="text-[12px] font-black text-slate-800">₩{formatNum(amt)}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                              }
                            </div>
                            {/* 고정비 */}
                            {fixedGroupEntries.length > 0 && (
                              <div>
                                <div className="flex items-baseline justify-between mb-2">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">고정비</p>
                                  <span className="text-[11px] font-black text-slate-700">월 ₩{formatNum(totalFixed)}{isYear && ` · 연 ₩${formatNum(totalFixed*12)}`}</span>
                                </div>
                                <div className="flex flex-col divide-y divide-slate-50 bg-slate-50 rounded-xl overflow-hidden">
                                  {fixedGroupEntries.map(([cat, krw]) => (
                                    <div key={cat} className="flex justify-between items-center px-3 py-2.5">
                                      <span className="text-[11px] font-bold text-slate-600">{cat}</span>
                                      <div className="flex flex-col items-end">
                                        <span className="text-[12px] font-black text-slate-800">₩{formatNum(isYear ? krw*12 : krw)}</span>
                                        {isYear && <span className="text-[9px] text-slate-400">월 ₩{formatNum(krw)}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
                );
              })()}

              {/* 엔빵 정산소 탭 */}
              {accountbookTab === 'dutch' && (() => {
                const othersOweMe = nbbangRecords.filter(r => (r?.category === 'N빵' || r?.isNbbang) && !r?.isSettled);
                // 미정산 총액: 같은 그룹별로 totalAmount/nbbangCount 기준으로 계산
                // nbbangCount = 실제 전체 인원수 (내가 멤버인 경우도 포함된 값)
                const owedGroupMap = {};
                othersOweMe.forEach(r => {
                  const baseName = (r.name || '').replace(/\(.*?\)/g, '').trim();
                  const gKey = `${r.date}_${baseName}`;
                  if (!owedGroupMap[gKey]) owedGroupMap[gKey] = { totalAmount: 0, count: 0 };
                  // nbbangCount 필드가 있으면 그걸 사용, 없으면 target log 수를 카운트
                  if (r.nbbangCount && r.nbbangCount > owedGroupMap[gKey].count) owedGroupMap[gKey].count = Number(r.nbbangCount);
                  else if (!r.nbbangCount) owedGroupMap[gKey].count += 1;
                  if (r.totalAmount && !owedGroupMap[gKey].totalAmount) owedGroupMap[gKey].totalAmount = Number(r.totalAmount);
                });
                const totalOwed = othersOweMe.reduce((sum, r) => {
                  return sum + Number(r.amount || 0);
                }, 0);

                // 같은 날짜+이름 그룹별로 totalAmount와 count를 먼저 계산
                const nbbangGroups = {};
                othersOweMe.forEach(r => {
                   const baseName = (r.name || '').replace(/\(.*?\)/g, '').trim();
                   const gKey = `${r.date}_${baseName}`;
                   if (!nbbangGroups[gKey]) nbbangGroups[gKey] = { totalAmount: 0, count: 0, nbbangNames: '' };
                   if (r.nbbangCount && r.nbbangCount > nbbangGroups[gKey].count) nbbangGroups[gKey].count = Number(r.nbbangCount);
                   else if (!r.nbbangCount) nbbangGroups[gKey].count += 1;
                   if (r.totalAmount && !nbbangGroups[gKey].totalAmount) nbbangGroups[gKey].totalAmount = Number(r.totalAmount);
                   if (r.nbbangNames && !nbbangGroups[gKey].nbbangNames) nbbangGroups[gKey].nbbangNames = r.nbbangNames;
                });
                Object.values(nbbangGroups).forEach(g => { if (!g.totalAmount) g.totalAmount = null; });

                const groupedByPerson = {};
                othersOweMe.forEach(r => {
                   // 🎯 기존 괄호(몫) 데이터와 새로운 nbbangTarget 데이터를 모두 완벽 호환
                   const personName = r.nbbangTarget || (r.name||'').match(/\((.*?)\s*몫\)/)?.[1] || '일행';
                   // 표시 금액: 저장된 amount 그대로 (저장 시 올바르게 계산됨)
                   const displayAmt = Number(r.amount || 0);
                   if(!groupedByPerson[personName]) groupedByPerson[personName] = { total: 0, details: [] };
                   groupedByPerson[personName].total += displayAmt;
                   groupedByPerson[personName].details.push({ ...r, displayAmount: displayAmt });
                });

                const handleEditNbbangAmount = (logId, newAmount) => {
                   const amt = toPureNumber(newAmount);
                   if (amt < 0) return;

                   const targetLog = tradeLogs.find(r => String(r.id) === String(logId));
                   if (!targetLog) return;
                   const baseName = (targetLog.name || '').replace(/\(.*?\)/g, '').trim();

                   // 같은 날짜+식당의 전체 그룹 (tradeLogs 전체에서 검색 — isNbbang:false 내 기록 포함)
                   const findGroup = (excludeId) => tradeLogs.filter(r => {
                     const rBase = (r.name || '').replace(/\(.*?\)/g, '').trim();
                     return r.date === targetLog.date && rBase === baseName && String(r.id) !== String(excludeId || '');
                   });

                   if (amt === 0) {
                     // 0원 → 해당 인원 삭제, 그 몫을 남은 인원에게 균등 분배
                     const deletedAmt = Number(targetLog.amount || 0);
                     const remaining = findGroup(logId);
                     const myLog = remaining.find(r => !r.isNbbang);
                     const otherNbbangLogs = remaining.filter(r => r.isNbbang);
                     // 재분배 대상: 다른 N빵 인원들 + 내 로그(나머지는 내 로그에 몰아줌)
                     const remainingCount = otherNbbangLogs.length + (myLog ? 1 : 0);
                     const addPerPerson = remainingCount > 0 ? Math.floor(deletedAmt / remainingCount) : 0;
                     const remainder = deletedAmt - addPerPerson * remainingCount;

                     showConfirm(`"${targetLog.nbbangTarget || '해당 인원'}"의 내역을 삭제하고 ₩${formatNum(deletedAmt)}을 남은 인원에게 분배할까요?`, () => {
                       saveStateToHistory();
                       setTradeLogs(prev => prev
                         .filter(r => String(r.id) !== String(logId))
                         .map(r => {
                           const rBase = (r.name || '').replace(/\(.*?\)/g, '').trim();
                           if (r.date !== targetLog.date || rBase !== baseName) return r;
                           if (!r.isNbbang && myLog && String(r.id) === String(myLog.id)) {
                             const newAmt = Number(r.amount || 0) + addPerPerson + remainder;
                             return { ...r, amount: newAmt, perPersonShare: newAmt };
                           }
                           if (r.isNbbang) {
                             const newAmt = Number(r.amount || 0) + addPerPerson;
                             return { ...r, amount: newAmt, perPersonShare: newAmt };
                           }
                           return r;
                         })
                       );
                       setEditingNbbang(null);
                       showToast(`✅ "${targetLog.nbbangTarget || '인원'}" 삭제, ₩${formatNum(addPerPerson)}씩 재분배 완료`);
                     });
                     setEditingNbbang(null);
                     return;
                   }

                   // 0원 아닌 수정 → 차액을 나머지 인원에게 분배
                   const oldAmt = Number(targetLog.amount || 0);
                   const diff = amt - oldAmt; // 양수면 이 사람이 더 냄, 음수면 덜 냄
                   if (diff === 0) { setEditingNbbang(null); return; }

                   const remaining = findGroup(logId);
                   const myLog = remaining.find(r => !r.isNbbang);
                   const remainingCount = remaining.length;
                   // 차액을 나머지 인원에서 반대로 조정 (이 사람이 더 내면 나머지는 덜 냄)
                   const adjustPerPerson = remainingCount > 0 ? Math.floor(-diff / remainingCount) : 0;
                   const adjustRemainder = -diff - adjustPerPerson * remainingCount;

                   saveStateToHistory();
                   setTradeLogs(prev => prev.map(r => {
                     if (String(r.id) === String(logId)) return { ...r, amount: amt, perPersonShare: amt };
                     const rBase = (r.name || '').replace(/\(.*?\)/g, '').trim();
                     if (r.date !== targetLog.date || rBase !== baseName) return r;
                     if (!r.isNbbang && myLog && String(r.id) === String(myLog.id)) {
                       const newAmt = Math.max(0, Number(r.amount || 0) + adjustPerPerson + adjustRemainder);
                       return { ...r, amount: newAmt, perPersonShare: newAmt };
                     }
                     if (r.isNbbang) {
                       const newAmt = Math.max(0, Number(r.amount || 0) + adjustPerPerson);
                       return { ...r, amount: newAmt, perPersonShare: newAmt };
                     }
                     return r;
                   }));
                   setEditingNbbang(null);
                   showToast('✅ 금액 수정 및 재분배 완료');
                };

                const doSettle = (targets) => {
                   const amtToSettle = targets.reduce((sum, r) => sum + Number(r.amount || 0), 0);
                   saveStateToHistory();
                   const dates = targets.map(r => new Date(r.date || r.timestamp || Date.now()));
                   const minDate = new Date(Math.min(...dates));
                   const maxDate = new Date(Math.max(...dates));

                   // 같은 N빵(날짜+이름 동일)이면 기존 배치 ID 재사용
                   const existingSettled = (tradeLogs || []).filter(r => r.isSettled && r.settledBatchId);
                   const getBatchIdForRecord = (r) => {
                     const rDate = r.date || '';
                     const rBaseName = (r.name || '').replace(/\(.*?\)/g, '').trim();
                     const match = existingSettled.find(e => {
                       const eDate = e.date || '';
                       const eBaseName = (e.name || '').replace(/\(.*?\)/g, '').trim();
                       return eDate === rDate && eBaseName === rBaseName;
                     });
                     return match ? match.settledBatchId : null;
                   };

                   // 배치 ID 결정: 같은 N빵 기록이 이미 정산된 배치가 있으면 그 ID를 재사용, 없으면 새로 생성
                   const newBatchId = `batch_${Date.now()}`;
                   const resolvedBatchId = targets.reduce((acc, r) => {
                     const existing = getBatchIdForRecord(r);
                     return existing || acc;
                   }, newBatchId);

                   const batchTitle = `(${minDate.getMonth()+1}.${minDate.getDate()} ~ ${maxDate.getMonth()+1}.${maxDate.getDate()}) 정산내역`;

                   // 재사용 배치면 기존 배치의 날짜 범위를 확장
                   let finalStartDate = minDate.toISOString();
                   let finalEndDate = maxDate.toISOString();
                   let finalTitle = batchTitle;
                   if (resolvedBatchId !== newBatchId) {
                     const existingInBatch = existingSettled.filter(e => e.settledBatchId === resolvedBatchId);
                     const allDates = [
                       ...existingInBatch.map(e => new Date(e.settledStartDate || e.date || e.timestamp)),
                       minDate, maxDate
                     ];
                     const newMin = new Date(Math.min(...allDates));
                     const newMax = new Date(Math.max(...allDates));
                     finalStartDate = newMin.toISOString();
                     finalEndDate = newMax.toISOString();
                     finalTitle = `(${newMin.getMonth()+1}.${newMin.getDate()} ~ ${newMax.getMonth()+1}.${newMax.getDate()}) 정산내역`;
                   }

                   const updatedLogs = tradeLogs.map(r => {
                     if (targets.find(t => String(t.id) === String(r.id))) {
                       return { ...r, isSettled: true, settledBatchId: resolvedBatchId, settledBatchTitle: finalTitle, settledStartDate: finalStartDate, settledEndDate: finalEndDate };
                     }
                     // 기존 같은 배치 기록의 날짜 범위도 업데이트
                     if (r.settledBatchId === resolvedBatchId && resolvedBatchId !== newBatchId) {
                       return { ...r, settledBatchTitle: finalTitle, settledStartDate: finalStartDate, settledEndDate: finalEndDate };
                     }
                     return r;
                   });

                   if (settleDepositStockId) {
                     setStocks(prev => prev.map(s => String(s.id) === settleDepositStockId
                       ? { ...s, quantity: String(toPureNumber(s.quantity) + amtToSettle) }
                       : s
                     ));
                     const depositItem = stocks.find(s => String(s.id) === settleDepositStockId);
                     showToast(`🎉 정산 완료! ₩${formatNum(amtToSettle)} → ${depositItem?.name || '계좌'} 입금`);
                   } else {
                     showToast(`🎉 정산 완료! ₩${formatNum(amtToSettle)} 처리되었습니다.`);
                   }
                   setTradeLogs(updatedLogs);
                   setSelectedPersonsToSettle([]);
                   saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                };

                const handleSettleSelected = () => {
                   if (nbbangFilter === 'all') {
                     if (selectedAllGroupKeys.length === 0) return showToast('⚠️ 정산할 내역을 클릭해서 선택해주세요.');
                     // selectedAllGroupKeys는 "date_name" 형태 — othersOweMe에서 매칭
                     const targets = othersOweMe.filter(r => {
                       const baseName = (r.name || '').replace(/\(.*?\)/g, '').trim();
                       const key = `${r.date}_${baseName}`;
                       return selectedAllGroupKeys.includes(key);
                     });
                     doSettle(targets);
                     setSelectedAllGroupKeys([]);
                   } else {
                     if (selectedPersonsToSettle.length === 0) return showToast('⚠️ 정산받을 인원을 클릭해서 선택해주세요.');
                     const targets = othersOweMe.filter(r => {
                        const pName = r.nbbangTarget || (r.name||'').match(/\((.*?)\s*몫\)/)?.[1] || '일행';
                        return selectedPersonsToSettle.includes(pName);
                     });
                     doSettle(targets);
                   }
                };

                const handleSettleAll = () => {
                   if (othersOweMe.length === 0) return showToast('⚠️ 정산할 내역이 없습니다.');
                   showConfirm('미정산된 N빵 전체를 일괄 정산하시겠습니까?', () => doSettle(othersOweMe));
                };

                const handleUndoSettle = (batchId) => {
                   saveStateToHistory();
                   const updatedLogs = tradeLogs.map(r =>
                     r.settledBatchId === batchId
                       ? { ...r, isSettled: false, settledBatchId: undefined, settledBatchTitle: undefined, settledStartDate: undefined, settledEndDate: undefined }
                       : r
                   );
                   setTradeLogs(updatedLogs);
                   setDoubleClickedBatchItem(null);
                   showToast('↩️ 정산이 되돌려졌습니다.');
                };

                const togglePersonSelection = (person) => {
                   setSelectedPersonsToSettle(prev => prev.includes(person) ? prev.filter(p => p !== person) : [...prev, person]);
                };

                const selectedTotal = nbbangFilter === 'all'
                  ? 0 // 전체 탭: 버튼 텍스트에 금액 안 쓰임 (그룹 단위라 합산 어려움)
                  : othersOweMe.filter(r => {
                      const pName = r.nbbangTarget || (r.name||'').match(/\((.*?)\s*몫\)/)?.[1] || '일행';
                      return selectedPersonsToSettle.includes(pName);
                    }).reduce((sum, r) => sum + Number(r.amount||0), 0);
                const hasSelected = nbbangFilter === 'all' ? selectedAllGroupKeys.length > 0 : selectedPersonsToSettle.length > 0;

                const savingsStockItems = stocks.filter(s => accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'savings');

                return (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                     {/* 입금계좌 선택 - 버튼 탭 형태 */}
                     <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                       <p className="text-[9px] font-black text-slate-400 mb-1.5 px-0.5">정산금 입금계좌</p>
                       <div className="flex flex-wrap gap-1.5">
                         <button
                           onClick={() => setSettleDepositStockId('')}
                           className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all border ${settleDepositStockId === '' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                         >입금 안 함</button>
                         {savingsStockItems.map(s => (
                           <button key={s.id}
                             onClick={() => setSettleDepositStockId(String(s.id))}
                             className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all border ${settleDepositStockId === String(s.id) ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}
                           >
                             <span>{s.name}</span>
                             <span className={`ml-1 ${settleDepositStockId === String(s.id) ? 'text-purple-200' : 'text-slate-400'}`}>₩{formatNum(toPureNumber(s.quantity))}</span>
                           </button>
                         ))}
                       </div>
                     </div>
                     <div className="flex flex-col gap-2 bg-purple-50 rounded-xl p-3 border border-purple-100 shadow-sm relative">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black text-purple-600 truncate">N빵 미수금</span>
                            <span className="text-lg font-black text-purple-800 truncate">₩{formatNum(totalOwed)}</span>
                          </div>
                          <button onClick={() => setIsNameSettingOpen(!isNameSettingOpen)} className="bg-white border border-purple-200 text-purple-600 px-2 py-1.5 rounded-lg text-[9px] font-black shadow-sm hover:bg-purple-100 transition-colors shrink-0">
                            {myDisplayName ? `${myDisplayName}` : '👤 이름 설정'}
                          </button>
                          {isNameSettingOpen && (
                             <input type="text" className="absolute top-[110%] right-0 text-[10px] font-black text-purple-700 border border-purple-300 outline-none text-center w-24 bg-white px-2 py-2 rounded-lg shadow-xl z-10" placeholder="내 이름" value={myDisplayName} onChange={e=>setMyDisplayName(e.target.value)} autoFocus onBlur={()=>{ setIsNameSettingOpen(false); }} onKeyDown={e=>{ if(e.key==='Enter'){ setIsNameSettingOpen(false); } }} />
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={handleSettleSelected} disabled={!hasSelected} className={`flex-1 text-white px-2 py-2 rounded-lg text-[10px] font-black shadow-sm transition-all ${hasSelected ? 'bg-emerald-500 hover:bg-emerald-600 animate-pulse' : 'bg-slate-300'}`}>
                            {nbbangFilter === 'all'
                              ? (selectedAllGroupKeys.length > 0 ? `${selectedAllGroupKeys.length}건 정산 완료` : '선택 정산하기')
                              : (selectedPersonsToSettle.length > 0 ? `₩${formatNum(selectedTotal)} 정산 완료` : '선택 정산하기')}
                          </button>
                          {hasSelected && (
                            <button onClick={() => { setSelectedAllGroupKeys([]); setSelectedPersonsToSettle([]); }} className="px-3 py-2 rounded-lg text-[10px] font-black bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all shrink-0">
                              취소
                            </button>
                          )}
                          <button onClick={handleSettleAll} disabled={othersOweMe.length === 0} className={`flex-1 text-white px-2 py-2 rounded-lg text-[10px] font-black shadow-sm transition-all ${othersOweMe.length > 0 ? 'bg-purple-500 hover:bg-purple-600' : 'bg-slate-300'}`}>
                            일괄정산
                          </button>
                        </div>
                     </div>

                     <div className="flex gap-2 mb-1 mt-1 bg-slate-50 p-1 rounded-lg">
                        <button onClick={() => { setNbbangFilter('all'); setIsSettledHistoryView(false); }} className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-colors ${nbbangFilter === 'all' && !isSettledHistoryView ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>전체 사용내역</button>
                        <button onClick={() => { setNbbangFilter('person'); setIsSettledHistoryView(false); }} className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-colors ${nbbangFilter === 'person' && !isSettledHistoryView ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>인원별</button>
                        <button onClick={() => setIsSettledHistoryView(true)} className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-colors ${isSettledHistoryView ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-500'}`}>과거 정산 내역</button>
                     </div>

                     {isSettledHistoryView ? (() => {
                        const allSettled = (tradeLogs||[]).filter(r => (r?.category === 'N빵' || r?.isNbbang) && r?.isSettled);
                        
                        // 🎯 정산 묶음(Batch) 단위로 데이터 재조립 및 인원별 합산
                        const settledBatches = {};
                        allSettled.forEach(r => {
                           // 하위 호환성 보장 (과거 데이터는 날짜 기반 강제 ID 부여)
                           const bId = r.settledBatchId || `legacy_${r.date}`;
                           if (!settledBatches[bId]) {
                               settledBatches[bId] = {
                                   id: bId,
                                   title: r.settledBatchTitle || `${r.date?.substring(5)} 정산내역`,
                                   startDate: r.settledStartDate ? new Date(r.settledStartDate) : new Date(r.date || r.timestamp),
                                   endDate: r.settledEndDate ? new Date(r.settledEndDate) : new Date(r.date || r.timestamp),
                                   total: 0,
                                   persons: {}
                               };
                           }
                           const b = settledBatches[bId];
                           const pName = r.nbbangTarget || (r.name||'').match(/\((.*?)\s*몫\)/)?.[1] || '일행';
                           if (!b.persons[pName]) b.persons[pName] = 0;
                           b.persons[pName] += Number(r.amount || 0);
                           b.total += Number(r.amount || 0);
                        });

                        // 🎯 2. 교차 월(Cross-Month) 중복 노출 로직
                        const currentVal = calYear * 12 + calMonth;
                        const currentMonthBatches = Object.values(settledBatches).filter(b => {
                           const sVal = b.startDate.getFullYear() * 12 + b.startDate.getMonth();
                           const eVal = b.endDate.getFullYear() * 12 + b.endDate.getMonth();
                           // 현재 달력이 시작 달(sVal)과 종료 달(eVal) 사이에 있다면 무조건 노출!
                           return currentVal >= sVal && currentVal <= eVal;
                        }).sort((a,b) => b.endDate - a.endDate); // 최근 정산된 순서대로 정렬

                        if (currentMonthBatches.length === 0) return <div className="text-center py-6 text-[10px] font-bold text-slate-400">이번 달에 포함된 정산 내역이 없습니다.</div>;

                        return (
                         <div className="mt-1 grid grid-cols-2 gap-2 items-start animate-in fade-in duration-200">
                             {currentMonthBatches.map(batch => {
                               const isDbClicked = doubleClickedBatchItem === batch.id;
                               return (
                                <div key={batch.id}
                                  className={`p-2 rounded-xl border shadow-sm transition-all flex flex-col justify-between cursor-pointer ${isDbClicked ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200 hover:border-purple-300'}`}
                                  onClick={() => { if (isDbClicked) setDoubleClickedBatchItem(null); else setExpandedBatches(p => ({...p, [batch.id]: !p[batch.id]})); }}
                                  onDoubleClick={() => setDoubleClickedBatchItem(isDbClicked ? null : batch.id)}
                                >
                                   {isDbClicked ? (
                                     <div className="flex flex-col items-center justify-center gap-2 py-2">
                                       <span className="text-[9px] font-black text-rose-600 text-center leading-tight">{batch.title}</span>
                                       <span className="text-[9px] text-slate-500 font-bold">정산을 되돌릴까요?</span>
                                       <div className="flex gap-1.5 w-full">
                                         <button onClick={e => { e.stopPropagation(); setDoubleClickedBatchItem(null); }} className="flex-1 py-1 rounded-lg bg-slate-200 text-slate-600 text-[9px] font-black">취소</button>
                                         <button onClick={e => { e.stopPropagation(); handleUndoSettle(batch.id); }} className="flex-1 py-1 rounded-lg bg-rose-500 text-white text-[9px] font-black">↩️ 되돌리기</button>
                                         <button onClick={e => { e.stopPropagation(); showConfirm('이 정산 내역을 완전히 삭제하시겠습니까?', () => { saveStateToHistory(); setTradeLogs(prev => prev.filter(r => r.settledBatchId !== batch.id)); setDoubleClickedBatchItem(null); showToast('🗑️ 삭제되었습니다.'); }); }} className="flex-1 py-1 rounded-lg bg-slate-700 text-white text-[9px] font-black">삭제</button>
                                       </div>
                                     </div>
                                   ) : (
                                     <>
                                       <div className="flex justify-between items-start mb-2">
                                          <span className="text-[10px] font-black text-slate-800 flex items-start gap-1 leading-tight"><Heart size={10} className="text-purple-500 mt-0.5 shrink-0"/> {batch.title}</span>
                                          <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                                             <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">₩{formatNum(batch.total)}</span>
                                             {expandedBatches[batch.id] ? <ChevronDown size={12} className="text-slate-400"/> : <ChevronRight size={12} className="text-slate-400"/>}
                                          </div>
                                       </div>
                                       {expandedBatches[batch.id] && (
                                          <div className="grid grid-cols-2 gap-1.5 mt-auto pt-2 border-t border-slate-200/60 animate-in slide-in-from-top-1">
                                             {Object.keys(batch.persons).map(pName => (
                                                <div key={pName} className="bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                                                   <span className="text-[9px] font-bold text-slate-500 mb-0.5">{pName}</span>
                                                   <span className="text-[10px] font-black text-slate-800">₩{formatNum(batch.persons[pName])}</span>
                                                </div>
                                             ))}
                                          </div>
                                       )}
                                     </>
                                   )}
                                </div>
                               );
                             })}
                          </div>
                        );
                     })()
                     : nbbangFilter === 'all' ? (() => {
                        // 전체 사용내역: 미정산 기록을 식당(name)별로 묶기
                        const allGroups = {};
                        othersOweMe.forEach(r => {
                          const baseName = (r.name || '').replace(/\(.*?\)/g, '').trim();
                          const key = `${r.date}_${baseName}`;
                          if (!allGroups[key]) {
                            allGroups[key] = { name: baseName, date: r.date, total: 0, totalAmount: 0, persons: [], ids: [], nbbangNames: '' };
                          }
                          const pName = r.nbbangTarget || (r.name||'').match(/\((.*?)\s*몫\)/)?.[1] || '일행';
                          if (!allGroups[key].persons.includes(pName)) allGroups[key].persons.push(pName);
                          allGroups[key].ids.push(r.id);
                          allGroups[key].total += Number(r.amount || 0);
                          // totalAmount: 원래 입력한 전체금액 — 하나라도 있으면 그걸 우선 사용
                          if (r.totalAmount && !allGroups[key].totalAmount) allGroups[key].totalAmount = Number(r.totalAmount);
                          // nbbangNames: 전체 멤버 이름 문자열 (내가 포함된 경우 표시용)
                          if (r.nbbangNames && !allGroups[key].nbbangNames) allGroups[key].nbbangNames = r.nbbangNames;
                        });
                        // totalAmount 없는 경우 합산값으로 fallback
                        // nbbangNames가 있으면 전체 멤버 이름으로 persons 교체 (내 이름 포함)
                        Object.values(allGroups).forEach(g => {
                          if (!g.totalAmount) g.totalAmount = g.total;
                          if (g.nbbangNames) {
                            const allMembers = g.nbbangNames.split(',').map(n => n.trim()).filter(Boolean);
                            if (allMembers.length > g.persons.length) g.persons = allMembers;
                          }
                        });
                        const groupList = Object.values(allGroups).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                        if (groupList.length === 0) return <div className="text-center py-6 text-[10px] font-bold text-slate-400">미정산 내역이 없습니다!</div>;

                        // 전체 사용내역 수정 모달
                        const editingGroup = editingAllGroupKey ? groupList.find(g => `${g.date}_${g.name}` === editingAllGroupKey) : null;
                        const editGroupLogs = editingGroup ? tradeLogs.filter(r => editingGroup.ids.map(String).includes(String(r.id))) : [];

                        return (
                          <>
                          <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                            {groupList.map((g, idx) => {
                              const gKey = `${g.date}_${g.name}`;
                              const isAllSelected = selectedAllGroupKeys.includes(gKey);
                              return (
                              <div key={idx}
                                onClick={() => { if (editingAllGroupKey) return; setSelectedAllGroupKeys(prev => isAllSelected ? prev.filter(k => k !== gKey) : [...prev, gKey]); }}
                                className={`border rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm cursor-pointer transition-all ${isAllSelected ? 'bg-slate-200 border-slate-300 opacity-50 grayscale' : 'bg-white border-slate-200 hover:border-purple-200'}`}>
                                <div className="flex items-start justify-between gap-1">
                                  <span className={`text-[10px] font-black leading-tight truncate flex-1 ${isAllSelected ? 'line-through text-slate-500' : 'text-slate-800'}`}>{g.name}</span>
                                  <span className="text-[8px] font-bold text-slate-400 shrink-0">{(g.date||'').substring(5)}</span>
                                </div>
                                <span
                                  onClick={e => { e.stopPropagation(); setEditingAllGroupKey(gKey); setSelectedAllGroupKeys(prev => prev.filter(k => k !== gKey)); }}
                                  className={`text-[12px] font-black text-rose-500 cursor-pointer hover:underline ${isAllSelected ? 'line-through' : ''}`}>
                                  ₩{formatNum(g.totalAmount)}
                                </span>
                                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                                  {g.persons.map(p => (
                                    <span key={p} className={`px-1.5 py-0.5 bg-purple-50 border border-purple-100 rounded-md text-[8px] font-black text-purple-600 ${isAllSelected ? 'line-through' : ''}`}>{p}</span>
                                  ))}
                                </div>
                              </div>
                            )})}
                          </div>

                          {/* 전체 사용내역 수정 모달 */}
                          {editingGroup && (() => {
                            const count = editGroupLogs[0]?.nbbangCount || editGroupLogs.length;
                            return (
                            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4" onClick={() => { setEditingAllGroupKey(null); setEditingNbbang(null); }}>
                              <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                                  <p className="text-xs font-black text-slate-800">{editingGroup.name} <span className="font-bold text-slate-400 text-[9px]">{editingGroup.date}</span></p>
                                  <button onClick={() => { setEditingAllGroupKey(null); setEditingNbbang(null); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full"><X size={14}/></button>
                                </div>

                                {/* 전체 금액 수정 */}
                                <div className="bg-purple-50 rounded-xl px-3 py-2.5 mb-3 border border-purple-100">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[9px] font-black text-purple-600">전체 금액 수정</p>
                                    <span className="text-[8px] font-bold text-purple-400">올림처리 적용</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-1 flex items-center">
                                      <span className="absolute left-2.5 text-xs font-bold text-slate-400">₩</span>
                                      <input type="text" inputMode="numeric"
                                        className="w-full bg-white border border-purple-200 rounded-lg pl-6 pr-2 py-2 text-[11px] font-black text-right outline-none focus:border-purple-500"
                                        value={toCommaString(editingNbbang?.id === '__total__' ? editingNbbang.amount : String(editingGroup.totalAmount))}
                                        onFocus={() => setEditingNbbang({ id: '__total__', amount: String(editingGroup.totalAmount) })}
                                        onChange={e => setEditingNbbang({ id: '__total__', amount: e.target.value.replace(/[^0-9]/g, '') })}
                                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                                        onBlur={() => {
                                          if (editingNbbang?.id !== '__total__') return;
                                          const newTotal = toPureNumber(editingNbbang.amount);
                                          if (newTotal <= 0 || newTotal === editingGroup.totalAmount) { setEditingNbbang(null); return; }
                                          const perPerson = Math.ceil(newTotal / count);
                                          saveStateToHistory();
                                          setTradeLogs(prev => prev.map(r => {
                                            if (!editingGroup.ids.map(String).includes(String(r.id))) return r;
                                            return { ...r, amount: perPerson, perPersonShare: perPerson, totalAmount: newTotal };
                                          }));
                                          editingGroup.totalAmount = newTotal;
                                          editingGroup.total = perPerson * count;
                                          setEditingNbbang(null);
                                          showToast(`✅ ${formatNum(newTotal)}원 → 인원당 ${formatNum(perPerson)}원`);
                                        }}
                                      />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 shrink-0">{count}명 × {formatNum(Math.ceil((editingNbbang?.id === '__total__' ? toPureNumber(editingNbbang.amount) : editingGroup.totalAmount) / count))}원</span>
                                  </div>
                                </div>

                                <p className="text-[9px] font-bold text-slate-400 mb-2">개별 수정도 가능. 0원 입력 시 해당 인원 삭제.</p>
                                <div className="overflow-y-auto custom-scrollbar flex-1 pr-0.5">
                                  <div className="grid grid-cols-3 gap-2">
                                  {editGroupLogs.map(r => {
                                    const displayAmt = Number(r.amount || 0);
                                    return (
                                    <div key={r.id} className="flex flex-col items-center gap-1 bg-slate-50 rounded-xl px-2 py-2 border border-slate-200">
                                      <span className="text-[9px] font-black text-slate-700 truncate w-full text-center">{r.nbbangTarget || '나'}</span>
                                      <div className="relative flex items-center w-full">
                                        <span className="absolute left-1.5 text-[8px] font-bold text-slate-400">₩</span>
                                        <input type="text" inputMode="numeric"
                                          className="w-full bg-white border border-slate-200 rounded-lg pl-4 pr-1 py-1 text-[9px] font-black text-right outline-none focus:border-purple-400"
                                          value={toCommaString(editingNbbang?.id === r.id ? editingNbbang.amount : String(displayAmt))}
                                          onFocus={() => setEditingNbbang({ id: r.id, amount: String(displayAmt) })}
                                          onChange={e => setEditingNbbang({ id: r.id, amount: e.target.value.replace(/[^0-9]/g, '') })}
                                          onBlur={() => { if (editingNbbang?.id === r.id) handleEditNbbangAmount(r.id, editingNbbang.amount); }}
                                          onKeyDown={e => { if (e.key === 'Enter' && editingNbbang?.id === r.id) { handleEditNbbangAmount(r.id, editingNbbang.amount); e.target.blur(); } }}
                                        />
                                      </div>
                                    </div>
                                    );
                                  })}
                                  </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <button
                                    onClick={() => showConfirm(`"${editingGroup.name}" 전체 내역(${count}명)을 삭제하시겠습니까?`, () => {
                                      saveStateToHistory();
                                      const targetIds = editingGroup.ids.map(String);
                                      setTradeLogs(prev => {
                                        // targetIds에 해당하는 로그 찾아서 totalAmount+date 추출
                                        const refLogs = prev.filter(r => targetIds.includes(String(r.id)));
                                        const refTotalAmount = refLogs[0]?.totalAmount;
                                        const refDate = (editingGroup.date || '').substring(0, 10);
                                        const refName = (refLogs[0]?.name || '').trim();
                                        return prev.filter(r => {
                                          // N빵 대상자 로그 삭제
                                          if (targetIds.includes(String(r.id))) return false;
                                          // 결제자 로그: 같은 날짜 + totalAmount + name 모두 일치
                                          if (!r.isNbbang && r.nbbangCount > 1) {
                                            const rDate = (r.date || '').substring(0, 10);
                                            if (rDate === refDate && String(r.totalAmount) === String(refTotalAmount) && (r.name || '').trim() === refName) return false;
                                          }
                                          return true;
                                        });
                                      });
                                      setEditingAllGroupKey(null); setEditingNbbang(null);
                                      showToast('🗑️ 내역이 삭제되었습니다.');
                                    })}
                                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.click(); }}
                                    className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-black hover:bg-rose-600 transition-colors">삭제</button>
                                  <button onClick={() => { setEditingAllGroupKey(null); setEditingNbbang(null); }} className="flex-1 py-2.5 bg-purple-500 text-white rounded-xl text-xs font-black">완료</button>
                                </div>
                              </div>
                            </div>
                            );
                          })()}
                          </>
                        );
                     })()
                     : othersOweMe.length === 0 ? (
                       <div className="text-center py-6 text-[10px] font-bold text-slate-400">받을 돈이 없습니다! 모두 정산 완료✨</div>
                     ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.keys(groupedByPerson).map(person => {
                            const isSelected = selectedPersonsToSettle && selectedPersonsToSettle.includes(person);
                            return (
                            <div key={person} onClick={() => togglePersonSelection(person)} className={`p-2 rounded-xl shadow-sm border transition-all cursor-pointer flex flex-col h-full ${isSelected ? 'bg-slate-200 border-slate-300 opacity-50 grayscale' : 'bg-slate-50 border-slate-100 hover:border-purple-200'}`}>
                               <div className={`text-center border-b border-slate-300 pb-1 mb-1 ${isSelected ? 'line-through' : ''}`}>
                                 <span className="text-[11px] font-black text-slate-800"><Heart size={10} className={`inline ${isSelected?'text-slate-500':'text-purple-400'} relative -top-0.5`}/> {person}</span>
                                 <div className="text-[12px] font-black text-rose-500 mt-0.5">₩{formatNum(groupedByPerson[person].total)}</div>
                               </div>
                               <div className="grid grid-cols-2 gap-1.5 overflow-y-auto custom-scrollbar flex-1 max-h-[100px] p-0.5">
                                 {groupedByPerson[person].details.map(detail => (
                                   <div key={detail.id} className="text-[8px] flex flex-col justify-center bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm min-h-[38px] transition-colors" onClick={(e) => { e.stopPropagation(); if(!isSelected) setEditingNbbang({id: detail.id, amount: String(detail.displayAmount ?? detail.amount)}); }}>
                                     {editingNbbang?.id === detail.id ? (
                                        <input type="text" className="w-full text-right outline-none bg-slate-100 px-1 rounded font-black text-blue-500 py-0.5" value={toCommaString(editingNbbang.amount)} autoFocus onBlur={()=>handleEditNbbangAmount(detail.id, editingNbbang.amount)} onChange={e=>setEditingNbbang({...editingNbbang, amount: e.target.value.replace(/[^0-9]/g, '')})} onKeyDown={e=>e.key==='Enter' && handleEditNbbangAmount(detail.id, editingNbbang.amount)}/>
                                     ) : (
                                        <>
                                          <span className="truncate w-full font-bold text-slate-500 mb-0.5">{detail.name.replace(`(${person} 몫)`, '').trim()}</span>
                                          <span className="font-black text-slate-700 text-right">₩{formatNum(detail.displayAmount ?? detail.amount)}</span>
                                        </>
                                     )}
                                   </div>
                                 ))}
                               </div>
                            </div>
                          )})}
                        </div>
                     )}
                  </div>
                );
              })()}

{/* 🎯 정산 완료 상세 내역 팝업 모달 */}
                     {settledDetailModal.isOpen && (
                       <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4" onClick={() => setSettledDetailModal({isOpen: false, person: '', details: []})}>
                         <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl relative flex flex-col max-h-[80vh] animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                           <button onClick={() => setSettledDetailModal({ isOpen: false, person: '', details: [] })} className="absolute top-4 right-4 p-1.5 text-slate-400 bg-slate-50 rounded-full hover:bg-slate-100"><X size={14}/></button>
                           <div className="flex flex-col mb-4 border-b border-slate-100 pb-3">
                             <h3 className="font-black text-base text-slate-800 flex items-center gap-1.5"><Heart size={14} className="text-purple-500"/> {settledDetailModal.person} 정산 완료 내역</h3>
                             <span className="text-[10px] font-bold text-slate-400 mt-1">총 {settledDetailModal.details.length}건의 정산이 완료되었습니다.</span>
                           </div>
                           
                           {/* 🎯 상세 내역 가로 2열 배치 그리드 */}
                           <div className="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar pr-1 pb-2">
                             {settledDetailModal.details.sort((a,b) => new Date(b.date||b.timestamp) - new Date(a.date||a.timestamp)).map(d => (
                               <div key={d.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[75px]">
                                 <div className="flex justify-between items-start mb-1.5">
                                   <span className="text-[10px] font-black text-slate-800 truncate pr-1">{d.name.replace(/\(.*?(몫|분)\)/g, '').trim()}</span>
                                   <span className="text-[8px] font-bold text-slate-400 shrink-0">{d.date?.substring(5)}</span>
                                 </div>
                                 <div className="flex items-center justify-between mt-auto">
                                   <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">완료</span>
                                   <span className="text-[11px] font-black text-slate-700">₩{formatNum(d.amount)}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                     )}
              {/* 카드 내역서 탭 */}
              {accountbookTab === 'card' && (() => {
                const cleanMyName = (myDisplayName || '').trim();
                
                // 🎯 카드 내역에서도 내 몫만 남기고 텍스트 정제 (N빵 텍스트 완벽 제거)
                const myCardRecords = cardRecords.filter(r => {
                   if (r?.type === 'expense' && (r?.isNbbang || r?.category === 'N빵')) {
                      const rName = r.name || '';
                      return rName.includes('(본인 몫)') || (cleanMyName && rName.includes(`${cleanMyName} 몫`));
                   }
                   return true;
                }).map(r => ({
                   ...r,
                   name: (r.name || '').replace(/\(.*?(몫|분)\)/g, '').replace(/\(N빵\)/g, '').trim(),
                   amount: Number(r.amount || 0)
                }));

                // 고유 결제 건당 1개만 추출
                const getUniqueRecords = (records) => Object.values(records.reduce((acc, r) => {
                    const key = r.isNbbang ? `${r.date}_${r.cardName}_${r.memo || r.name}_${r.totalAmount || r.amount}` : String(r.id);
                    if (!acc[key]) acc[key] = { ...r, displayName: r.name };
                    return acc;
                }, {}));

                const unpaidCardRecords = getUniqueRecords(myCardRecords.filter(r => r?.paymentMethod === '신용카드' && !r?.isPaid));
                const paidCardRecords = getUniqueRecords(myCardRecords.filter(r => r?.paymentMethod === '신용카드' && r?.isPaid));

                const handlePaySingleItem = (log) => {
                   const totalAmt = log.combinedAmount || log.amount;
                   const cardInfo = myCards.find(c => c.name === log.cardName) || stocks.find(s => s.name === log.cardName);
                   const linkedId = cardInfo?.linkedAcc || cardInfo?.cardLinkedAcc || '';
                   saveStateToHistory();
                   if (linkedId.startsWith('stock:')) {
                     const stockId = linkedId.replace('stock:', '');
                     const tgt = stocks.find(s => String(s.id) === stockId);
                     if (!tgt || toPureNumber(tgt.quantity) < totalAmt) return showToast('⚠️ 연동된 통장 잔액이 부족합니다.');
                     setStocks(prev => prev.map(s => String(s.id) === stockId ? { ...s, quantity: String(toPureNumber(s.quantity) - totalAmt) } : s));
                   } else {
                     return showToast('⚠️ 연동된 계좌가 없습니다. 카드에 계좌를 연동해주세요.');
                   }
                   const newCash = globalCash;
                   
                   // 🎯 문자열(String) 형변환을 통한 엄격한 비교로 선결제 누락 버그 픽스
                   const updatedLogs = tradeLogs.map(r => {
                     const isTarget = log.combinedIds ? log.combinedIds.map(String).includes(String(r.id)) : String(r.id) === String(log.id);
                     return isTarget ? { ...r, isPaid: true } : r;
                   });

                   const paymentLog = { id: Date.now().toString(), type: 'expense', name: `${log.displayTitle || log.displayName || log.name} 선결제`, category: '카드대금', amount: totalAmt, totalAmount: totalAmt, date: new Date().toISOString().substring(0, 10), timestamp: Date.now() };
                   
                   setTradeLogs([paymentLog, ...updatedLogs]);
                   saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newCash);
                   showToast(`💳 ₩${formatNum(totalAmt)} 결제 완료!`);
                   
                   if (unpaidCardRecords.filter(r => r.cardName === prepayModalState.cardName && String(r.id) !== String(log.id)).length === 0) {
                     setPrepayModalState({ isOpen: false, cardName: '' });
                   }
                };

                const handleAutoPayCard = (cardName, amount) => {
                   if (amount <= 0) return showToast('⚠️ 결제할 금액이 없습니다.');
                   const cardInfo = myCards.find(c => c.name === cardName) || stocks.find(s => s.name === cardName);
                   const linkedId = cardInfo?.linkedAcc || cardInfo?.cardLinkedAcc || '';
                   saveStateToHistory();
                   let newCash = globalCash;
                   if (linkedId.startsWith('stock:')) {
                     const stockId = linkedId.replace('stock:', '');
                     const tgt = stocks.find(s => String(s.id) === stockId);
                     if (!tgt || toPureNumber(tgt.quantity) < amount) return showToast('⚠️ 연동된 통장 잔액이 부족합니다.');
                     setStocks(prev => prev.map(s => String(s.id) === stockId ? { ...s, quantity: String(toPureNumber(s.quantity) - amount) } : s));
                   } else {
                     return showToast('⚠️ 연동된 계좌가 없습니다. 카드에 계좌를 연동해주세요.');
                   }
                   const updatedLogs = tradeLogs.map(r => (r.cardName === cardName && r.paymentMethod === '신용카드' && !r.isPaid) ? { ...r, isPaid: true } : r);
                   const paymentLog = { id: Date.now().toString(), type: 'expense', name: `${cardName} 대금결제`, category: '카드대금', amount, totalAmount: amount, date: new Date().toISOString().substring(0, 10), timestamp: Date.now() };

                   setTradeLogs([paymentLog, ...updatedLogs]);
                   saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newCash);
                   showToast(`💳 ₩${formatNum(amount)} 결제 완료!`);
                };

                const now = new Date();
                const currentDay = now.getDate();
                const currentHour = now.getHours();

                return (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                     <div className="flex gap-2 mb-1 bg-slate-50 p-1 rounded-lg">
                        <button onClick={() => setIsCardSettledView(false)} className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-colors ${!isCardSettledView ? 'bg-white text-blue-600 shadow-sm border border-blue-200' : 'text-slate-500 hover:bg-white/50'}`}>결제 예정 (명세서)</button>
                        <button onClick={() => setIsCardSettledView(true)} className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-colors ${isCardSettledView ? 'bg-blue-500 text-white shadow-sm border border-blue-400' : 'text-slate-500 hover:bg-slate-200'}`}>결제 완료 내역</button>
                     </div>

                     {!isCardSettledView ? (
                     <>
                     {(() => {
                       // 전체 미결제를 카드별 실적기간 기준으로 이번달/다음달로 분리
                       let totalThisMonth = 0, totalNextMonth = 0;
                       const allUnpaidLogs = (tradeLogs || []).filter(r => r.paymentMethod === '신용카드' && !r.isPaid && !r.isNbbang);
                       const cardPeriodMap = {};
                       [...myCards.map(c => ({ name: c.name, period: c.period })),
                        ...stocks.filter(s => accounts.find(a => a.id === (s.accountId||'default'))?.type === 'card').map(s => ({ name: s.name, period: s.cardPeriod }))
                       ].forEach(c => { if (!cardPeriodMap[c.name]) cardPeriodMap[c.name] = c.period; });
                       allUnpaidLogs.forEach(r => {
                         const period = cardPeriodMap[r.cardName];
                         const [cs, ce] = getCardPeriodRange(period, calYear, calMonth);
                         const ns = ce ? new Date(ce.getFullYear(), ce.getMonth(), ce.getDate() + 1) : null;
                         const ne = ce ? new Date(ce.getFullYear(), ce.getMonth() + 1, ce.getDate()) : null;
                         const d = parseLocalDate(r.date || r.timestamp);
                         // N빵 원본은 카드에 전체금액이 청구됨
                         const amt = r.totalAmount ? Number(r.totalAmount) : (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare) * Number(r.nbbangCount) : toPureNumber(r.amount);
                         if (d && cs && ce && d >= cs && d <= ce) totalThisMonth += amt;
                         else if (d && ns && ne && d >= ns && d <= ne) totalNextMonth += amt;
                       });
                       return (
                         <div className="flex gap-2">
                           <div className="flex-1 bg-blue-50 rounded-xl p-3 border border-blue-100 flex flex-col shadow-sm">
                             <span className="text-[9px] font-black text-blue-500">이번달 결제 예정</span>
                             <span className="text-base font-black text-blue-800">₩{formatNum(totalThisMonth)}</span>
                           </div>
                           <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col shadow-sm">
                             <span className="text-[9px] font-black text-slate-500">다음달 결제 예정</span>
                             <span className="text-base font-black text-slate-700">₩{formatNum(totalNextMonth)}</span>
                           </div>
                         </div>
                       );
                     })()}
                     
                     {(() => {
                       const cardAccItems = stocks.filter(s => {
                         const acc = accounts.find(a => a.id === (s.accountId || 'default'));
                         return acc?.type === 'card' && !myCards.some(c => c.name === s.name);
                       });
                       return (myCards.length > 0 || cardAccItems.length > 0);
                     })() ? (
                       // 🎯 카드 요약본 모바일 1열, PC 2열 그리드 배치
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                         {myCards.map(c => {
                           const periodFiltered = (tradeLogs || []).filter(r => r.cardName === c.name && (r.paymentMethod === '체크카드' || r.paymentMethod === '신용카드') && !r.isNbbang && !r.excludeFromPerf && (() => { const d = parseLocalDate(r.date || r.timestamp); return d && d.getFullYear() === calYear && d.getMonth() === calMonth; })());
                           const totalUsed = periodFiltered.reduce((sum, r) => { const full = (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare)*Number(r.nbbangCount) : toPureNumber(r.amount); return sum + full; }, 0);
                           const target = Number(c.target || 0);
                           const percent = target > 0 ? Math.min((totalUsed / target) * 100, 100) : 0;
                           const isReached = target > 0 && totalUsed >= target;
                           // 이번달/다음달 결제예정 분리: 이번달 = 현재 기준일 범위, 다음달 = 다음 기준일 범위
                           const [_curS, _curE] = getCardPeriodRange(c.period, calYear, calMonth);
                           const _nextS = _curE ? new Date(_curE.getFullYear(), _curE.getMonth(), _curE.getDate() + 1) : null;
                           const _nextE = _curE ? new Date(_curE.getFullYear(), _curE.getMonth() + 1, _curE.getDate()) : null;
                           const _allUnpaid = (tradeLogs || []).filter(r => r.cardName === c.name && r.paymentMethod === '신용카드' && !r.isPaid && !r.isNbbang);
                           const _toAmt = r => r.totalAmount ? Number(r.totalAmount) : (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare) * Number(r.nbbangCount) : toPureNumber(r.amount);
                           const thisMonthPay = _curS && _curE ? _allUnpaid.filter(r => { const d = parseLocalDate(r.date || r.timestamp); return d && d >= _curS && d <= _curE; }).reduce((s, r) => s + _toAmt(r), 0) : 0;
                           const nextMonthPay = _nextS && _nextE ? _allUnpaid.filter(r => { const d = parseLocalDate(r.date || r.timestamp); return d && d >= _nextS && d <= _nextE; }).reduce((s, r) => s + _toAmt(r), 0) : 0;
                           const toPay = thisMonthPay + nextMonthPay;
                           
                           let isPayDayActive = false;
                           if (c.payDay) {
                              const payDayNum = c.payDay === '말일' ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : Number(c.payDay);
                              if (currentDay === payDayNum && currentHour >= 9) isPayDayActive = true;
                           }

                           return (
                             <div key={`prog-${c.id}`} className="flex flex-col bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all" onClick={() => setPrepayModalState({ isOpen: true, cardName: c.name, fromPortfolio: true })}>
                               <div className="flex justify-between items-center mb-1.5">
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-slate-800">{c.name} {isReached && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded shadow-sm ml-1">실적 달성!</span>}</span>
                                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">
                                      {c.period && `기준: ${c.period}일 `}
                                      {c.payDay && `| 결제: ${c.payDay}${c.payDay === '말일' ? '' : '일'}`}
                                    </span>
                                 </div>
                                 {isPayDayActive && toPay > 0 ? (
                                    <button onClick={e => { e.stopPropagation(); handleAutoPayCard(c.name, toPay); }} className="px-2.5 py-1.5 bg-rose-500 text-white rounded shadow-md text-[9px] font-black hover:bg-rose-600 transition-colors animate-pulse whitespace-nowrap">오늘 결제</button>
                                 ) : (
                                    <button onClick={e => { e.stopPropagation(); setPrepayModalState({ isOpen: true, cardName: c.name }); }} disabled={toPay <= 0} className="px-2 py-1.5 bg-blue-500 text-white rounded shadow-sm text-[9px] font-black hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap">미리 갚기</button>
                                 )}
                               </div>

                               <div className="flex gap-1.5 mb-1">
                                 <div className="flex-1 bg-slate-50 p-1.5 rounded-md border border-slate-100 flex flex-col items-center">
                                   <span className="text-[8px] font-bold text-slate-400">이번달 결제</span>
                                   <span className="text-[10px] font-black text-rose-500">₩{formatNum(thisMonthPay)}</span>
                                 </div>
                                 <div className="flex-1 bg-slate-50 p-1.5 rounded-md border border-slate-100 flex flex-col items-center">
                                   <span className="text-[8px] font-bold text-slate-400">다음달 결제</span>
                                   <span className="text-[10px] font-black text-slate-500">₩{formatNum(nextMonthPay)}</span>
                                 </div>
                               </div>

                               {target > 0 && (
                                 <div className="mt-1">
                                   <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-0.5">
                                      <span>실적 ₩{formatNum(totalUsed)}</span>
                                      <span>목표 ₩{formatNum(target)}</span>
                                   </div>
                                   <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative shadow-inner">
                                     <div className={`h-full rounded-full transition-all duration-500 ${isReached ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${percent}%` }}></div>
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                         {stocks.filter(s => {
                           const acc = accounts.find(a => a.id === (s.accountId || 'default'));
                           return acc?.type === 'card' && !myCards.some(c => c.name === s.name);
                         }).map(s => {
                           const rawUsedLogs = (tradeLogs || []).filter(r => r.cardName === s.name && (r.paymentMethod === '체크카드' || r.paymentMethod === '신용카드') && !r.isNbbang && !r.excludeFromPerf);
                           const totalUsed = rawUsedLogs.filter(r => { const d = parseLocalDate(r.date || r.timestamp); return d && d.getFullYear() === calYear && d.getMonth() === calMonth; }).reduce((sum, r) => { const full = (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare)*Number(r.nbbangCount) : toPureNumber(r.amount); return sum + full; }, 0);
                           const target = toPureNumber(s.performance);
                           // 이번달/다음달 결제예정 분리: 이번달 = 현재 기준일 범위, 다음달 = 다음 기준일 범위
                           const [_cs2, _ce2] = getCardPeriodRange(s.cardPeriod, calYear, calMonth);
                           const _ns2 = _ce2 ? new Date(_ce2.getFullYear(), _ce2.getMonth(), _ce2.getDate() + 1) : null;
                           const _ne2 = _ce2 ? new Date(_ce2.getFullYear(), _ce2.getMonth() + 1, _ce2.getDate()) : null;
                           const _unpaid2 = (tradeLogs || []).filter(r => r.cardName === s.name && r.paymentMethod === '신용카드' && !r.isPaid && !r.isNbbang);
                           const _toAmt2 = r => r.totalAmount ? Number(r.totalAmount) : (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare) * Number(r.nbbangCount) : toPureNumber(r.amount);
                           const thisMonthPay2 = _cs2 && _ce2 ? _unpaid2.filter(r => { const d = parseLocalDate(r.date || r.timestamp); return d && d >= _cs2 && d <= _ce2; }).reduce((a, r) => a + _toAmt2(r), 0) : 0;
                           const nextMonthPay2 = _ns2 && _ne2 ? _unpaid2.filter(r => { const d = parseLocalDate(r.date || r.timestamp); return d && d >= _ns2 && d <= _ne2; }).reduce((a, r) => a + _toAmt2(r), 0) : 0;
                           const toPay = thisMonthPay2 + nextMonthPay2;
                           const percent = target > 0 ? Math.min((totalUsed / target) * 100, 100) : 0;
                           const isReached = target > 0 && totalUsed >= target;
                           let isPayDayActive = false;
                           if (s.cardPayDay) {
                             const payDayNum = s.cardPayDay === '말일' ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : Number(s.cardPayDay);
                             if (currentDay === payDayNum && currentHour >= 9) isPayDayActive = true;
                           }
                           return (
                             <div key={`cardacc-${s.id}`} className="flex flex-col bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all" onClick={() => setPrepayModalState({ isOpen: true, cardName: s.name, fromPortfolio: true })}>
                               <div className="flex justify-between items-center mb-1.5">
                                 <div className="flex flex-col">
                                   <span className="text-[11px] font-black text-slate-800">{s.name} {isReached && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded shadow-sm ml-1">실적 달성!</span>}</span>
                                   <span className="text-[8px] font-bold text-slate-400 mt-0.5">
                                     {s.cardPeriod && `기준: ${s.cardPeriod}일 `}
                                     {s.cardPayDay && `| 결제: ${s.cardPayDay}${s.cardPayDay === '말일' ? '' : '일'}`}
                                   </span>
                                 </div>
                                 {s.cardType === '신용' && (isPayDayActive && toPay > 0 ? (
                                   <button onClick={e => { e.stopPropagation(); handleAutoPayCard(s.name, toPay); }} className="px-2.5 py-1.5 bg-rose-500 text-white rounded shadow-md text-[9px] font-black hover:bg-rose-600 transition-colors animate-pulse whitespace-nowrap">오늘 결제</button>
                                 ) : (
                                   <button onClick={e => { e.stopPropagation(); setPrepayModalState({ isOpen: true, cardName: s.name }); }} disabled={toPay <= 0} className="px-2 py-1.5 bg-blue-500 text-white rounded shadow-sm text-[9px] font-black hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap">미리 갚기</button>
                                 ))}
                               </div>
                               {s.cardType === '신용' && (
                                 <div className="flex gap-1.5 mb-1">
                                   <div className="flex-1 bg-slate-50 p-1.5 rounded-md border border-slate-100 flex flex-col items-center">
                                     <span className="text-[8px] font-bold text-slate-400">이번달 결제</span>
                                     <span className="text-[10px] font-black text-rose-500">₩{formatNum(thisMonthPay2)}</span>
                                   </div>
                                   <div className="flex-1 bg-slate-50 p-1.5 rounded-md border border-slate-100 flex flex-col items-center">
                                     <span className="text-[8px] font-bold text-slate-400">다음달 결제</span>
                                     <span className="text-[10px] font-black text-slate-500">₩{formatNum(nextMonthPay2)}</span>
                                   </div>
                                 </div>
                               )}
                               {target > 0 && (
                                 <div className="mt-1">
                                   <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-0.5">
                                     <span>실적 ₩{formatNum(totalUsed)}</span>
                                     <span>목표 ₩{formatNum(target)}</span>
                                   </div>
                                   <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative shadow-inner">
                                     <div className={`h-full rounded-full transition-all duration-500 ${isReached ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${percent}%` }}></div>
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     ) : (
                        <div className="text-center py-6 text-[10px] font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">우측 상단 톱니바퀴 {'>'} 내 카드에서<br/>카드를 먼저 등록해주세요.</div>
                     )}

                     {/* 🎯 카드 선결제 상세 모달 UI */}
                     {prepayModalState.isOpen && (() => {
                       const isFromPortfolio = prepayModalState.fromPortfolio;
                       // 미리갚기: calYear/calMonth 기준일 범위 내 미결제만, 포트폴리오: 해당 월 전체 내역
                       const _modalCardPeriod = (() => { const mc = myCards.find(c => c.name === prepayModalState.cardName); const sc = stocks.find(s => s.name === prepayModalState.cardName); return mc ? mc.period : sc?.cardPeriod; })();
                       const _refY = typeof calYear !== 'undefined' ? calYear : new Date().getFullYear();
                       const _refM = typeof calMonth !== 'undefined' ? calMonth : new Date().getMonth();
                       const [_mcs, _mce] = getCardPeriodRange(_modalCardPeriod, _refY, _refM);
                       const allRecordsForCard = (tradeLogs || []).filter(r => {
                         if (r.cardName !== prepayModalState.cardName) return false;
                         if (!(r.paymentMethod === '신용카드' || r.paymentMethod === '체크카드')) return false;
                         if (r.isNbbang) return false;
                         if (isFromPortfolio) {
                           // 포트폴리오에서 열면 해당 월 전체
                           const d = parseLocalDate(r.date || r.timestamp);
                           return d && d.getFullYear() === _refY && d.getMonth() === _refM;
                         }
                         // 미리갚기: 해당 월 기준일 범위 내 미결제
                         if (r.isPaid) return false;
                         if (!_mcs || !_mce) return true;
                         const d = parseLocalDate(r.date || r.timestamp);
                         return d && d >= _mcs && d <= _mce;
                       });
                       const modalItems = allRecordsForCard.map(log => {
                         const cleanName = (log.name || '').replace(/\(.*?(몫|분)\)/g, '').replace(/\(N빵\)/g, '').trim();
                         const nbbangTotal = log.totalAmount ? Number(log.totalAmount) : (log.nbbangCount > 1 && log.perPersonShare) ? Number(log.perPersonShare) * Number(log.nbbangCount) : null;
                         // 항상 전체금액 표시 (N빵이면 카드 실제 결제금액 = totalAmount 우선)
                         const displayAmount = nbbangTotal || Number(log.amount);
                         const myAmount = Number(log.amount);
                         return { ...log, combinedIds: [log.id], combinedAmount: displayAmount, myAmount, displayTitle: cleanName, hasNbbang: nbbangTotal != null };
                       }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                       const unpaidItems = modalItems.filter(l => !l.isPaid);
                       // 전액갚기도 카드 실제 결제금액(전체금액) 기준
                       const totalUnpaid = unpaidItems.reduce((sum, l) => sum + l.combinedAmount, 0);
                       const closeModal = () => { setPrepayModalState({ isOpen: false, cardName: '' }); setPrepaySelectedKey(null); setPrepayEditKey(null); };
                       const handleDeleteItem = (log) => {
                         saveStateToHistory();
                         setTradeLogs(prev => prev.filter(r => !log.combinedIds.map(String).includes(String(r.id))));
                         setPrepayEditKey(null);
                       };
                       return (
                       <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4" onClick={closeModal}>
                         <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl p-5 shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                           <button onClick={closeModal} className="absolute top-4 right-4 p-1.5 text-slate-400 bg-slate-50 rounded-full hover:bg-slate-100"><X size={14}/></button>
                           <h3 className="font-black text-sm mb-0.5 text-slate-800">💳 {prepayModalState.cardName} {isFromPortfolio ? '사용 내역' : '미결제 내역'}</h3>
                           <p className="text-[9px] font-bold text-slate-400 mb-3">{isFromPortfolio ? '더블클릭으로 내역 삭제 가능. N빵 항목은 전액 기준 표시.' : '항목을 눌러 선택 후 결제하기를 눌러 개별 결제하세요.'}</p>

                           {modalItems.length === 0 ? (
                             <div className="text-center py-8 text-[11px] font-bold text-slate-400">{isFromPortfolio ? '사용 내역이 없습니다.' : '미결제 내역이 없습니다.'}</div>
                           ) : (
                             <>
                               {/* 포트폴리오에서 열면 미결제 합계만 표시, 가계부에서 열면 전액 갚기 버튼 */}
                               {isFromPortfolio ? (
                                 totalUnpaid > 0 && (
                                   <div className="w-full mb-3 py-2 px-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-black text-rose-600 flex items-center justify-between">
                                     <span>미결제 합계</span>
                                     <span>₩{formatNum(totalUnpaid)}</span>
                                   </div>
                                 )
                               ) : (
                                 <button onClick={() => { showConfirm(`₩${formatNum(totalUnpaid)} 전액을 결제하시겠습니까?`, () => { handleAutoPayCard(prepayModalState.cardName, totalUnpaid); closeModal(); }); }}
                                   className="w-full mb-3 py-2.5 bg-rose-500 text-white rounded-xl text-[11px] font-black shadow-sm hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                                   전액 갚기 <span className="bg-white/20 px-2 py-0.5 rounded-lg">₩{formatNum(totalUnpaid)}</span>
                                 </button>
                               )}

                               {/* 개별 내역 — 2열 그리드 */}
                               <div className="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar pb-1" style={{WebkitOverflowScrolling:'touch'}}>
                                 {modalItems.map(log => {
                                   const itemKey = log.combinedIds ? log.combinedIds[0] : log.id;
                                   const isActive = prepaySelectedKey === itemKey;
                                   const isEditing = prepayEditKey === itemKey;
                                   const isPaidItem = log.isPaid;
                                   return (
                                     <div key={itemKey}
                                       onClick={() => {
                                         if (isFromPortfolio) { if (isEditing) setPrepayEditKey(null); return; }
                                         if (!isActive) { setPrepaySelectedKey(itemKey); return; }
                                         showConfirm(`₩${formatNum(log.combinedAmount)} 결제하시겠습니까?`, () => { handlePaySingleItem(log); setPrepaySelectedKey(null); }); return;
                                       }}
                                       onDoubleClick={() => { setPrepayEditKey(isEditing ? null : itemKey); setPrepaySelectedKey(null); }}
                                       className={`p-2 rounded-xl border shadow-sm transition-all flex flex-col gap-0.5 cursor-pointer ${isEditing ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200' : isActive ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : isPaidItem ? 'border-slate-100 bg-slate-50 opacity-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                                       <div className="flex items-center justify-between gap-1">
                                         <span className="text-[9px] font-black text-slate-800 truncate leading-tight flex-1">{log.displayTitle}</span>
                                         <div className="flex items-center gap-0.5 shrink-0">
                                           {log.excludeFromPerf && <span className="text-[7px] font-black text-slate-400 bg-slate-100 px-1 py-0.5 rounded">실적제외</span>}
                                           {log.hasNbbang && <span className="text-[7px] font-black text-violet-500 bg-violet-50 px-1 py-0.5 rounded">N빵</span>}
                                           {isPaidItem && <span className="text-[7px] font-black text-emerald-500 bg-emerald-50 px-1 py-0.5 rounded">완납</span>}
                                         </div>
                                       </div>
                                       <span className="text-[8px] font-bold text-slate-400">{log.date?.substring(5)} · {log.paymentMethod === '체크카드' ? '체크' : '신용'}</span>
                                       <div className="flex flex-col mt-1 gap-0.5">
                                         <span className={`text-[10px] font-black ${isPaidItem ? 'text-slate-400' : isEditing ? 'text-rose-600' : 'text-rose-500'}`}>₩{formatNum(log.combinedAmount)}</span>
                                         {log.hasNbbang && <span className="text-[8px] font-bold text-slate-400">내 몫 ₩{formatNum(log.myAmount)}</span>}
                                         {isActive && !isFromPortfolio && <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md animate-in fade-in duration-150 self-end">결제하기</span>}
                                         {isEditing && (
                                           <div className="flex flex-col gap-1 mt-1 animate-in fade-in duration-150" onClick={e => e.stopPropagation()}>
                                             <button onClick={() => {
                                               const newVal = !log.excludeFromPerf;
                                               setTradeLogs(prev => prev.map(r => log.combinedIds.map(String).includes(String(r.id)) ? { ...r, excludeFromPerf: newVal } : r));
                                               setPrepayEditKey(null);
                                               showToast(newVal ? '실적에서 제외했습니다.' : '실적에 다시 포함했습니다.');
                                             }} className={`w-full py-1 rounded-lg text-[8px] font-black active:scale-95 transition-all ${log.excludeFromPerf ? 'bg-slate-500 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                               {log.excludeFromPerf ? '✓ 실적제외 중 (클릭 시 포함)' : '실적에서 제외'}
                                             </button>
                                             <div className="flex gap-1">
                                               <button onClick={() => handleDeleteItem(log)} className="flex-1 py-1 bg-rose-500 text-white rounded-lg text-[8px] font-black hover:bg-rose-600 active:scale-95 transition-all">🗑 삭제</button>
                                               <button onClick={() => setPrepayEditKey(null)} className="flex-1 py-1 bg-slate-200 text-slate-600 rounded-lg text-[8px] font-black hover:bg-slate-300 active:scale-95 transition-all">취소</button>
                                             </div>
                                           </div>
                                         )}
                                       </div>
                                     </div>
                                   );
                                 })}
                               </div>
                             </>
                           )}
                         </div>
                       </div>
                       );
                     })()}
                     </>
                     ) : (
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                        {paidCardRecords.length === 0 ? (
                          <div className="col-span-full text-center py-6 text-[10px] font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">결제 완료된 내역이 없습니다.</div>
                        ) : (
                          paidCardRecords.map(r => (
                            <div key={r.id} className="flex flex-col justify-between bg-white p-2.5 rounded-xl border border-blue-100 shadow-sm opacity-70 min-h-[70px]">
                              <div className="flex justify-between items-start mb-1.5">
                                <span className="text-[10px] font-black text-slate-800 truncate pr-1">{r.displayName || r.name.replace(/\(.*?몫\)/g, '').trim()}</span>
                                <span className="text-[8px] font-bold text-slate-400 shrink-0">{r.date?.substring(5)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-auto">
                                <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">결제완료</span>
                                <span className="text-[11px] font-black text-slate-500 line-through">₩{formatNum(r.amount)}</span>
                              </div>
                            </div>
                          ))
                        )}
                     </div>
                     )}
                  </div>
                );
              })()}
              </div>{/* /슬라이드 래퍼 */}
            </div>

            {/* 달력 그리드 - 3패널 슬라이더 */}
            {accountbookTab === 'calendar' && (
              <div className="calendar-detail-area">
                {(() => {
                  // 이전달 / 다음달 간단 그리드 렌더러
                  const renderSimpleGrid = (yr, mo) => {
                    const fd = new Date(yr, mo, 1).getDay();
                    const dim = new Date(yr, mo + 1, 0).getDate();
                    const today = new Date();
                    return (
                      <div className="bg-white p-2 md:p-3" style={{ width: '100%', flexShrink: 0 }}>
                        <div className="grid grid-cols-7 gap-1 text-center text-[9px] md:text-[10px] font-black text-slate-400 mb-1">
                          <div className="text-rose-400">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div className="text-blue-400">토</div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                          {Array.from({length: fd}, (_, i) => <div key={`b${i}`} className="h-12 md:h-14 rounded-lg bg-slate-50/50" />)}
                          {Array.from({length: dim}, (_, i) => {
                            const d = i + 1;
                            const col = (fd + d - 1) % 7;
                            const isT = today.getDate() === d && today.getMonth() === mo && today.getFullYear() === yr;
                            return (
                              <div key={d} className={`h-12 md:h-14 border rounded-lg p-1 flex flex-col border-slate-100 bg-white ${isT ? 'ring-1 ring-blue-300' : ''}`}>
                                <span className={`text-[9px] font-black leading-none ${col === 0 ? 'text-rose-400' : col === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{d}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };
                  const prevYr = calMonth === 0 ? calYear - 1 : calYear;
                  const prevMo = calMonth === 0 ? 11 : calMonth - 1;
                  const nextYr = calMonth === 11 ? calYear + 1 : calYear;
                  const nextMo = calMonth === 11 ? 0 : calMonth + 1;
                  // px 기반 translateX — 컨테이너 100% 기준으로 좌우 패널 배치
                  const trans = calSlide.animDir
                    ? `translateX(${calSlide.animDir === 'left' ? '-100%' : '100%'})`
                    : `translateX(${calSlide.dragX}px)`;
                  const transStyle = {
                    transform: trans,
                    transition: calSlide.animDir ? 'transform 0.35s cubic-bezier(0.23,1,0.32,1)' : 'none',
                    willChange: 'transform',
                  };
                  return (
                    <div
                      className="overflow-hidden rounded-2xl mb-2 shadow-sm border border-slate-200 bg-white"
                      ref={calendarGridRef}
                      style={{ touchAction: 'pan-y', position: 'relative' }}
                      onTouchStart={e => { if (showCatStats || calSwipeWheelLock.current) return; calSwipeTouchStart.current = e.touches[0].clientX; setCalSlide({ dragX: 0, animDir: null }); }}
                      onTouchMove={e => {
                        if (showCatStats || calSwipeTouchStart.current === null || calSwipeWheelLock.current) return;
                        const dx = e.touches[0].clientX - calSwipeTouchStart.current;
                        if (Math.abs(dx) > 8) setCalSlide({ dragX: dx, animDir: null });
                      }}
                      onTouchEnd={e => {
                        if (showCatStats || calSwipeTouchStart.current === null || calSwipeWheelLock.current) return;
                        const dx = e.changedTouches[0].clientX - calSwipeTouchStart.current;
                        calSwipeTouchStart.current = null;
                        const w = calendarGridRef.current?.offsetWidth || window.innerWidth;
                        if (Math.abs(dx) < w * 0.2) { setCalSlide({ dragX: 0, animDir: null }); return; }
                        const dir = dx < 0 ? 'left' : 'right';
                        calSwipeWheelLock.current = true;
                        setCalSlide({ dragX: 0, animDir: dir });
                        setTimeout(() => {
                          if (dir === 'left') { setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDay(null); }
                          else { setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDay(null); }
                          setCalSlide({ dragX: 0, animDir: null });
                          setTimeout(() => { calSwipeWheelLock.current = false; }, 600);
                        }, 330);
                      }}
                    >
                      {/* 이전달 — 현재달 왼쪽에 붙어서 같이 이동 */}
                      <div className="absolute inset-0 bg-white" style={{ ...transStyle, transform: `translateX(calc(-100% + ${calSlide.animDir === 'left' ? '-100%' : calSlide.animDir === 'right' ? '100%' : `${calSlide.dragX}px`}))`, pointerEvents: 'none' }}>
                        {renderSimpleGrid(prevYr, prevMo)}
                      </div>
                      {/* 현재달 */}
                      <div style={transStyle} className="bg-white">
                          <div className="p-2 md:p-3">
                            <div className="grid grid-cols-7 gap-1 text-center text-[9px] md:text-[10px] font-black text-slate-400 mb-1" onClick={() => setSelectedDay(null)}>
                              <div className="text-rose-400">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div className="text-blue-400">토</div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                              {blanks.map(b => <div key={`blank-${b}`} onClick={() => setSelectedDay(null)} className="h-12 md:h-14 rounded-lg bg-slate-50/50"></div>)}
                              {daysArray.map(day => {
                                const data = stats.daily[day] || { income: 0, expense: 0, invest: 0, salary: 0 };
                                const isSelected = selectedDay === day;
                                const isToday = new Date().getDate() === day && new Date().getMonth() === calMonth && new Date().getFullYear() === calYear;
                                const isPastOrToday = new Date(calYear, calMonth, day) <= new Date();
                                const isZeroExpense = isPastOrToday && data.expense === 0;
                                return (
                                  <div key={day} onClick={(e) => { e.stopPropagation(); setSelectedDay(day); setTimeout(() => { calDaySummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50); }} className={`h-12 md:h-14 border rounded-lg p-1 flex flex-col cursor-pointer transition-colors overflow-hidden relative ${isSelected ? 'border-slate-800 bg-slate-800 text-white shadow-md' : 'border-slate-100 bg-white hover:bg-slate-50'} ${isToday && !isSelected ? 'ring-1 ring-blue-300' : ''}`}>
                                    <span className={`text-[9px] font-black leading-none mb-0.5 relative z-10 ${isSelected ? 'text-white' : (firstDay + day - 1) % 7 === 0 ? 'text-rose-500' : (firstDay + day - 1) % 7 === 6 ? 'text-blue-500' : 'text-slate-600'}`}>{day}</span>
                                    {isZeroExpense && (
                                      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none animate-in zoom-in duration-500">
                                        <span className="text-2xl drop-shadow-sm">🌿</span>
                                      </div>
                                    )}
                                    <div className="flex flex-col items-end gap-0 mt-auto relative z-10 w-full overflow-visible">
                                      {isZeroExpense && !isSelected && <span className="text-[6.5px] font-black text-emerald-500 bg-emerald-50 rounded text-center whitespace-nowrap shadow-sm mb-[1px] w-full px-0.5 leading-tight">🌿무지출</span>}
                                      {data.salary > 0 && <span className="text-[6.5px] font-black text-emerald-400 text-right whitespace-nowrap leading-tight">+{formatNum(data.salary)}</span>}
                                      {data.income > 0 && <span className="text-[6.5px] font-black text-blue-400 text-right whitespace-nowrap leading-tight">+{formatNum(data.income)}</span>}
                                      {data.invest > 0 && <span className="text-[6.5px] font-black text-purple-400 text-right whitespace-nowrap leading-tight">-{formatNum(data.invest)}</span>}
                                      {data.expense > 0 && <span className="text-[6.5px] font-black text-rose-400 text-right whitespace-nowrap leading-tight">-{formatNum(data.expense)}</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      {/* 다음달 — 현재달 오른쪽에 붙어서 같이 이동 */}
                      <div className="absolute inset-0 bg-white" style={{ ...transStyle, transform: `translateX(calc(100% + ${calSlide.animDir === 'left' ? '-100%' : calSlide.animDir === 'right' ? '100%' : `${calSlide.dragX}px`}))`, pointerEvents: 'none' }}>
                        {renderSimpleGrid(nextYr, nextMo)}
                      </div>
                    </div>
                  );
                })()}

                {selectedDay && stats.daily[selectedDay]?.records?.length > 0 && (() => {
                  const dayData = stats.daily[selectedDay];
                  const visibleRecords = (dayData.records || []).filter(r =>
                    r?.category !== '카드대금' && !r?.isNbbang && r?.type !== 'deposit'
                  );
                  const incRecords = visibleRecords.filter(r => r?.viewCategory === 'salary' || r?.viewCategory === 'income');
                  const expRecords = visibleRecords.filter(r => r?.viewCategory === 'expense');
                  const invRecords = visibleRecords.filter(r => r?.viewCategory === 'invest');
                  const groups = [
                    incRecords.length > 0 && { key: 'inc', label: '월급/수익', color: 'emerald', records: incRecords, sign: '+' },
                    expRecords.length > 0 && { key: 'exp', label: '소비', color: 'rose', records: expRecords, sign: '-' },
                    invRecords.length > 0 && { key: 'inv', label: '투자/저축', color: 'purple', records: invRecords, sign: '-' },
                  ].filter(Boolean);
                  if (groups.length === 0) return null;
                  const colorMap = {
                    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', header: 'bg-emerald-100/70', title: 'text-emerald-700', amt: 'text-emerald-600' },
                    rose:    { bg: 'bg-rose-50',    border: 'border-rose-100',    header: 'bg-rose-100/70',    title: 'text-rose-700',    amt: 'text-rose-600' },
                    purple:  { bg: 'bg-purple-50',  border: 'border-purple-100',  header: 'bg-purple-100/70',  title: 'text-purple-700',  amt: 'text-purple-600' },
                  };
                  const widthClass = groups.length === 1 ? 'w-full' : groups.length === 2 ? 'w-[calc(50%-3px)]' : 'w-[calc(33.33%-4px)]';
                  return (
                    <div ref={calDaySummaryRef} className="rounded-2xl border border-slate-100 bg-white shadow-sm animate-in slide-in-from-bottom-2 duration-200 overflow-hidden mt-2">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <span className="text-[10px] font-black text-slate-600">{calMonth + 1}월 {selectedDay}일</span>
                        <div className="flex items-center gap-2">
                          {incRecords.length > 0 && <span className="text-[9px] font-black text-emerald-600">+₩{formatNum(incRecords.reduce((s, r) => s + Number(r?.amount || 0), 0))}</span>}
                          {expRecords.length > 0 && <span className="text-[9px] font-black text-rose-500">-₩{formatNum(expRecords.reduce((s, r) => s + Number(r?.amount || 0), 0))}</span>}
                          {invRecords.length > 0 && <span className="text-[9px] font-black text-purple-500">-₩{formatNum(invRecords.reduce((s, r) => s + Number(r?.amount || 0), 0))}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 p-2">
                        {groups.map(g => {
                          const c = colorMap[g.color];
                          const total = g.records.reduce((s, r) => s + Number(r?.amount || 0), 0);
                          return (
                            <div key={g.key} className={`${widthClass} ${c.bg} border ${c.border} rounded-xl overflow-hidden`}>
                              <div className={`flex items-center justify-between px-2.5 py-1.5 ${c.header} border-b ${c.border}`}>
                                <span className={`text-[9px] font-black ${c.title}`}>{g.label}</span>
                                <span className={`text-[9px] font-black ${c.amt}`}>{g.sign}₩{formatNum(total)}</span>
                              </div>
                              <div className="flex flex-col divide-y divide-white/80">
                                {g.records.map((r, idx) => (
                                  <div key={idx} className="flex items-center justify-between px-2.5 py-1.5">
                                    <span className="text-[9px] font-bold text-slate-600 truncate flex-1 mr-2">{r?.name || '내역'}</span>
                                    <span className={`text-[9px] font-black shrink-0 ${c.amt}`}>{g.sign}₩{formatNum(Number(r?.amount || 0))}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })()}

        {/* --- WATCHLIST MODAL --- */}
        {watchlistEditTarget && (() => {
          const doConfirm = () => {
            if (!watchlistEditName.trim()) return;
            setWatchlist(prev => prev.map(x => x.id === watchlistEditTarget.id ? { ...x, name: watchlistEditName.trim() } : x));
            setWatchlistDeleteTarget(null);
            setWatchlistEditTarget(null);
          };
          return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[999999] flex items-end sm:items-center justify-center p-4 pb-8" onClick={() => setWatchlistEditTarget(null)}>
              <div className="bg-white rounded-[2rem] p-5 shadow-2xl w-full max-w-xs" onClick={e => e.stopPropagation()}>
                <h3 className={`font-black text-sm mb-4 ${t.text}`}>종목 수정</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 mb-1 block">티커 (변경 불가)</label>
                    <input type="text" value={`${watchlistEditTarget.ticker}${watchlistEditTarget.tickerSuffix || ''}`} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 text-slate-400 px-3 py-2 text-sm font-black cursor-not-allowed"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 mb-1 block">종목명</label>
                    <input autoFocus type="text" value={watchlistEditName} onChange={e => setWatchlistEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') doConfirm(); if (e.key === 'Escape') setWatchlistEditTarget(null); }}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-black focus:outline-none focus:border-slate-500"/>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => {
                    showConfirm(`"${watchlistEditTarget.name}" 을(를) 관심종목에서 삭제할까요?`, () => {
                      setWatchlist(prev => prev.filter(x => x.id !== watchlistEditTarget.id));
                      setWatchlistCategoryMap(prev => { const n = {...prev}; delete n[watchlistEditTarget.ticker]; return n; });
                      setWatchlistDeleteTarget(null);
                      setWatchlistEditTarget(null);
                    });
                  }} className="flex-1 py-2 rounded-xl bg-rose-50 text-rose-500 font-black text-sm border border-rose-200">삭제</button>
                  <button onClick={doConfirm} className={`flex-1 py-2 rounded-xl ${t.main} font-black text-sm`}>확인</button>
                </div>
              </div>
            </div>
          );
        })()}
        {isWatchlistModalOpen && (() => {
          const filteredWDB = STOCK_DATABASE.filter(d =>
            d.name.toLowerCase().includes(watchlistSearch.toLowerCase()) ||
            d.ticker.toLowerCase().includes(watchlistSearch.toLowerCase())
          );
          const catFlag = { '한국': '🇰🇷', '미국': '🇺🇸', '인도': '🇮🇳', '일본': '🇯🇵', '중국': '🇨🇳', 'ETF': '📊' };
          const closeWatchlist = () => { setIsWatchlistModalOpen(false); setWatchlistSearch(''); setWatchlistTickerQuery(''); setWatchlistIsDropdownOpen(false); setWatchlistSearchResults([]); setWatchlistNewCategory(''); setWatchlistSelectedCategory(null); setWatchlistDeleteTarget(null); };
          const getWatchlistAutoCat = (w) => {
            const suffix = w.tickerSuffix || '';
            const exch = (w.exchange || '').toLowerCase();
            if (w.isETF) return 'ETF';
            if (suffix === '.T' || exch.includes('tokyo') || exch.includes('osaka')) return '일본';
            if (suffix === '.BO' || suffix === '.NS' || exch.includes('india') || exch.includes('bombay') || exch.includes('nse')) return '인도';
            if (suffix === '.SS' || suffix === '.SZ' || exch.includes('shanghai') || exch.includes('shenzhen')) return '중국';
            if (suffix === '.HK' || exch.includes('hong kong') || exch.includes('hkse') || exch.includes('hkex') || exch.includes('홍콩')) return '중국';
            if (suffix === '.KS' || suffix === '.KQ') return '한국';
            if (w.isUSD) return '미국';
            return '한국';
          };
          const addToWatchlist = async (item, isFromDB) => {
            const newItem = isFromDB
              ? { id: Date.now().toString(), name: item.name, ticker: item.ticker, isUSD: item.isUSD, tickerSuffix: item.tickerSuffix || '', isETF: item.isETF, exchange: item.exchange || '' }
              : { id: Date.now().toString(), name: item.name, ticker: item.ticker, isUSD: item.isUSD, tickerSuffix: item.suffix || '', isETF: item.isETF, exchange: item.exchange || '' };
            if (watchlist.some(w => w.ticker === newItem.ticker)) { setWatchlistSearch(''); setWatchlistTickerQuery(''); setWatchlistIsDropdownOpen(false); setWatchlistSearchResults([]); return; }
            const sym = newItem.isUSD ? newItem.ticker : `${newItem.ticker}${newItem.tickerSuffix || '.KS'}`;
            const res = await fetchMarketDataViaEdgeFn([sym]);
            const priceData = res[sym];
            setWatchlist(prev => [...prev, newItem]);
            if (priceData) setWatchlistPrices(prev => ({ ...prev, [newItem.id]: priceData }));
            const autoCat = watchlistSelectedCategory || getWatchlistAutoCat(newItem);
            if (watchlistCategories.includes(autoCat)) setWatchlistCategoryMap(prev => ({ ...prev, [newItem.ticker]: autoCat }));
            setWatchlistSearch(''); setWatchlistTickerQuery(''); setWatchlistIsDropdownOpen(false); setWatchlistSearchResults([]);
          };
          const colW = 148;
          const modalW = Math.min(watchlistCategories.length * (colW + 12) + 40, window.innerWidth - 32);
          return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-hidden" onClick={closeWatchlist}>
              <div className="bg-white rounded-[2rem] p-4 shadow-2xl flex flex-col max-h-[92vh] transition-all duration-300" style={{ width: `${modalW}px`, minWidth: '340px', maxWidth: 'calc(100vw - 32px)' }} onClick={e => { e.stopPropagation(); if (watchlistDeleteTarget) setWatchlistDeleteTarget(null); }}>

                {/* 헤더 */}
                <div className="flex items-center justify-between mb-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className={`font-black text-sm flex items-center gap-1.5 ${t.text}`}><Star size={15}/> 관심종목</h3>
                    <button onClick={() => fetchWatchlistPrices({ manual: true })} disabled={watchlistRefreshing}
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-40">
                      {watchlistRefreshing ? '갱신 중...' : '↻ 갱신'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* + 분류 추가 버튼 */}
                    <div className="relative">
                      <button onClick={() => setWatchlistAddingCategory(v => !v)} className={`text-[10px] font-black px-2 py-1 rounded-lg border transition-all ${watchlistAddingCategory ? `${t.main} border-transparent` : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-400'}`}>+ 분류</button>
                      {watchlistAddingCategory && (() => {
                        const presetOptions = ['한국','미국','ETF','인도','일본','중국','기타'];
                        const presetFlag = { '한국': '🇰🇷', '미국': '🇺🇸', 'ETF': '📊', '인도': '🇮🇳', '일본': '🇯🇵', '중국': '🇨🇳' };
                        const availableOptions = presetOptions.filter(o => !watchlistCategories.includes(o));
                        const addCategory = () => {
                          const val = watchlistNewCatSelect === '기타' ? watchlistNewCategory.trim() : watchlistNewCatSelect;
                          if (!val || watchlistCategories.includes(val)) return;
                          setWatchlistCategories(prev => [...prev, val]);
                          setWatchlistNewCatSelect(''); setWatchlistNewCategory(''); setWatchlistAddingCategory(false);
                        };
                        return (
                          <>
                            <div className="fixed inset-0 z-[199997] bg-slate-900/40" onClick={() => { setWatchlistAddingCategory(false); setWatchlistNewCatSelect(''); setWatchlistNewCategory(''); }}/>
                            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[199998] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-56">
                              <p className="text-[10px] font-black text-slate-600 mb-2">분류 추가</p>
                              {availableOptions.length === 0 ? (
                                <p className="text-[10px] text-slate-400 mb-3">추가할 수 있는 분류가 없어요.</p>
                              ) : (
                                <select autoFocus value={watchlistNewCatSelect} onChange={e => { setWatchlistNewCatSelect(e.target.value); setWatchlistNewCategory(''); }}
                                  className="w-full bg-slate-50 py-2 px-2.5 rounded-xl outline-none border border-slate-200 text-[11px] font-black text-slate-700 mb-2">
                                  <option value="">선택하세요</option>
                                  {availableOptions.map(o => <option key={o} value={o}>{presetFlag[o] ? `${presetFlag[o]} ${o}` : o}</option>)}
                                </select>
                              )}
                              {watchlistNewCatSelect === '기타' && (
                                <input autoFocus type="text" placeholder="분류명 입력..." value={watchlistNewCategory} onChange={e => setWatchlistNewCategory(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') { setWatchlistNewCatSelect(''); setWatchlistNewCategory(''); setWatchlistAddingCategory(false); } }}
                                  className="w-full bg-slate-50 py-2 px-2.5 rounded-xl outline-none border border-slate-200 text-[11px] font-black text-slate-700 mb-2"
                                />
                              )}
                              <div className="flex gap-1.5">
                                <button onClick={addCategory} disabled={!watchlistNewCatSelect || (watchlistNewCatSelect === '기타' && !watchlistNewCategory.trim())} className={`flex-1 text-[11px] font-black py-1.5 rounded-xl ${t.main} disabled:opacity-40`}>추가</button>
                                <button onClick={() => { setWatchlistNewCatSelect(''); setWatchlistNewCategory(''); setWatchlistAddingCategory(false); }} className="flex-1 text-[11px] font-black py-1.5 rounded-xl bg-slate-100 text-slate-500">취소</button>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <button onClick={closeWatchlist} className="p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"><X size={15}/></button>
                  </div>
                </div>

                {/* 분류별 갱신시간 */}
                {(() => {
                  const catFlag2 = { '한국': '🇰🇷', '미국': '🇺🇸', 'ETF': '📊', '인도': '🇮🇳', '일본': '🇯🇵', '중국': '🇨🇳' };
                  const rows = watchlistCategories.map(cat => {
                    const ts = watchlistCatUpdatedAt[cat];
                    if (!ts) return null;
                    const d = new Date(ts * 1000);
                    const label = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                    return { cat, label };
                  }).filter(Boolean);
                  if (rows.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2 shrink-0">
                      {rows.map(({ cat, label }) => (
                        <div key={cat} className="flex items-center gap-0.5">
                          <span className="text-[9px]">{catFlag2[cat] || ''}</span>
                          <span className="text-[9px] text-slate-400 font-medium">{cat} {label} 기준</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 검색창 */}
                <div className="relative mb-3 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="relative flex-[2] min-w-0" style={{flex:'2 1 0'}}>
                      <Search className="absolute right-2 top-2 text-slate-300" size={13}/>
                      <input type="text" placeholder="종목명 검색" className={`w-full bg-slate-50 py-2 pl-3 pr-7 rounded-xl outline-none border focus:${t.border} font-bold text-xs`}
                        value={watchlistSearch}
                        onChange={e => {
                          const q = e.target.value;
                          setWatchlistSearch(q);
                          setWatchlistIsDropdownOpen(true);
                          clearTimeout(watchlistSearchTimerRef.current);
                          if (q.trim().length >= 1) {
                            watchlistSearchTimerRef.current = setTimeout(async () => {
                              setWatchlistIsSearching(true);
                              const items = await searchStocksViaEdgeFn(q.trim());
                              setWatchlistSearchResults(items);
                              setWatchlistIsSearching(false);
                            }, 400);
                          } else { setWatchlistSearchResults([]); }
                        }}
                        onFocus={() => setWatchlistIsDropdownOpen(true)}
                      />
                    </div>
                    <input type="text" placeholder="티커" style={{flex:'1 1 0'}} className={`min-w-0 bg-slate-50 py-2 px-2 rounded-xl outline-none border focus:${t.border} font-bold text-xs text-center`}
                      value={watchlistTickerQuery}
                      onChange={e => {
                        const q = e.target.value.toUpperCase();
                        setWatchlistTickerQuery(q);
                        clearTimeout(watchlistTickerTimerRef.current);
                        if (q.trim().length >= 1) {
                          watchlistTickerTimerRef.current = setTimeout(async () => {
                            setWatchlistIsSearching(true);
                            const items = await searchStocksViaEdgeFn(q.trim());
                            if (items.length > 0) { setWatchlistSearchResults(items); setWatchlistIsDropdownOpen(true); }
                            setWatchlistIsSearching(false);
                          }, 400);
                        }
                      }}
                    />
                  </div>
                  {/* 카테고리 선택 (검색 중일 때만) */}
                  {(watchlistSearch.length > 0 || watchlistTickerQuery.length > 0) && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      <span className="text-[9px] text-slate-400 font-bold self-center">분류:</span>
                      {watchlistCategories.map(cat => (
                        <button key={cat} onClick={() => setWatchlistSelectedCategory(watchlistSelectedCategory === cat ? null : cat)}
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border transition-all ${watchlistSelectedCategory === cat ? `${t.bg} text-white border-transparent` : 'bg-white text-slate-500 border-slate-200'}`}>
                          {catFlag[cat] || ''} {cat}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* 드롭다운 */}
                  {watchlistIsDropdownOpen && (watchlistSearch.length > 0 || watchlistTickerQuery.length > 0) && (
                    <>
                      <div className="fixed inset-0 z-[50]" onClick={() => setWatchlistIsDropdownOpen(false)}/>
                      <div className="absolute z-[60] w-full mt-1 bg-white border rounded-xl shadow-xl max-h-[260px] overflow-hidden border-slate-200 text-left flex flex-col">
                        {filteredWDB.length > 0 && (
                          <div className="overflow-y-auto custom-scrollbar max-h-[130px] p-2">
                            <div className={`text-[9px] font-black ${t.text} mb-1`}>📈 내장 DB</div>
                            {filteredWDB.map(db => (
                              <div key={db.id} onClick={() => addToWatchlist(db, true)} className="p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center">
                                <div className="flex flex-col"><span className="font-bold text-[10px] text-slate-800 truncate">{db.name}</span><span className="text-[8px] font-black text-slate-400">{db.ticker}</span></div>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${db.isETF ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{db.isETF ? 'ETF' : db.isUSD ? '미국' : '한국'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(watchlistIsSearching || watchlistSearchResults.length > 0) && (
                          <div className="border-t border-slate-100 overflow-y-auto custom-scrollbar max-h-[130px]">
                            <div className="px-2 pt-1.5 pb-0.5 text-[9px] font-black text-slate-400 sticky top-0 bg-white">🌐 실시간 검색</div>
                            {watchlistIsSearching
                              ? <div className="text-center text-[9px] text-slate-400 py-2">검색 중...</div>
                              : watchlistSearchResults.map((item, i) => (
                                <div key={i} onClick={() => addToWatchlist(item, false)} className="px-2 py-1.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 border-b border-slate-50 last:border-0">
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-[10px] truncate text-slate-800">{item.name}</span>
                                    <span className="text-[8px] font-black text-slate-400">{item.ticker}{item.suffix} · {item.exchange}</span>
                                  </div>
                                  <span className={`shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded ${item.isETF ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{item.isETF ? 'ETF' : item.isUSD ? '미국' : '한국'}</span>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* 카테고리별 컬럼 리스트 */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex gap-3 overflow-x-auto custom-scrollbar h-full pb-1">
                    {watchlistCategories.map(cat => {
                      const catStocks = watchlist.filter(w => (watchlistCategoryMap[w.ticker] || getWatchlistAutoCat(w)) === cat);
                      const flag = catFlag[cat] || '';
                      const isDraggingInThisCat = watchlistDragState.draggingId && watchlistDragState.overCat === cat;
                      return (
                        <div key={cat} className="flex flex-col shrink-0" style={{ width: `${colW}px` }}>
                          {/* 카테고리 헤더 */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[11px] font-black ${t.text}`}>{flag} {cat}</span>
                            <button onClick={() => {
                              if (watchlistCategories.length <= 1) return;
                              if (catStocks.length > 0) { showToast(`⚠️ ${cat} 분류에 종목이 있어 삭제할 수 없어요.`); return; }
                              setWatchlistCategories(prev => prev.filter(c => c !== cat));
                            }} className="text-slate-300 hover:text-rose-400 transition-colors"><X size={10}/></button>
                          </div>
                          {/* 구분선 */}
                          <div className={`h-0.5 rounded-full mb-2 ${t.bg} opacity-20`}/>
                          {/* 종목 리스트 */}
                          <div className="flex flex-col gap-0.5 overflow-y-auto custom-scrollbar flex-1 max-h-[55vh]">
                            {catStocks.length === 0 ? (
                              <div className="text-center py-5 text-slate-200">
                                <p className="text-[9px] font-black">종목 없음</p>
                              </div>
                            ) : catStocks.map((w, wIdx) => {
                              const priceData = watchlistPrices[w.id];
                              const currentPrice = priceData?.price;
                              const prevClose = priceData?.prevClose;
                              const change = currentPrice && prevClose ? currentPrice - prevClose : null;
                              const changePct = change !== null && prevClose ? (change / prevClose) * 100 : null;
                              const isUp = changePct !== null && changePct >= 0;
                              const isDeleteMode = watchlistDeleteTarget === w.id;
                              const isDragging = watchlistDragState.draggingId === w.id;
                              // 드래그 중 이 카드가 밀려나야 하는지 계산
                              const overIdx = isDraggingInThisCat ? catStocks.findIndex(x => x.id === watchlistDragState.overId) : -1;
                              const draggingCatIdx = isDraggingInThisCat ? catStocks.findIndex(x => x.id === watchlistDragState.draggingId) : -1;
                              let translateY = 0;
                              if (isDraggingInThisCat && !isDragging && overIdx >= 0 && draggingCatIdx >= 0) {
                                const CARD_H = 46;
                                if (draggingCatIdx < overIdx && wIdx > draggingCatIdx && wIdx <= overIdx) translateY = -CARD_H;
                                else if (draggingCatIdx > overIdx && wIdx >= overIdx && wIdx < draggingCatIdx) translateY = CARD_H;
                              }
                              const deleteStock = () => {
                                showConfirm(`"${w.name}" 을(를) 관심종목에서 삭제할까요?`, () => {
                                  setWatchlist(prev => prev.filter(x => x.id !== w.id));
                                  setWatchlistCategoryMap(prev => { const n = {...prev}; delete n[w.ticker]; return n; });
                                  setWatchlistDeleteTarget(null);
                                });
                              };
                              const isFlowing = watchlistFlowId === w.id;
                              return (
                                <div key={w.id}
                                  style={{
                                    transform: isDragging
                                      ? `translate(${watchlistDragState.x - watchlistDragState.startX}px, ${watchlistDragState.y - watchlistDragState.startY}px)`
                                      : `translateY(${translateY}px)`,
                                    transition: isDragging ? 'none' : 'transform 0.18s ease',
                                    zIndex: isDragging ? 50 : 'auto',
                                    position: 'relative',
                                    opacity: isDragging ? 0.85 : 1,
                                    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
                                    pointerEvents: isDragging ? 'none' : undefined,
                                  }}
                                  className={`rounded-xl px-2 py-1.5 flex items-center justify-between gap-1.5 transition-colors select-none ${isDeleteMode ? 'bg-rose-50 border-2 border-rose-400' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'} ${isDeleteMode ? 'cursor-grab' : 'cursor-pointer'}`}
                                  onContextMenu={e => { e.preventDefault(); setWatchlistDeleteTarget(isDeleteMode ? null : w.id); }}
                                  onPointerDown={e => {
                                    if (!isDeleteMode) return;
                                    e.currentTarget.setPointerCapture(e.pointerId);
                                    setWatchlistDragState({ draggingId: w.id, overIdx: wIdx, overId: w.id, overCat: cat, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
                                  }}
                                  onPointerMove={e => {
                                    if (watchlistDragState.draggingId !== w.id) return;
                                    // 현재 포인터 위치로 상태 업데이트
                                    setWatchlistDragState(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                                    // 어느 카드 위에 올라가 있는지 감지
                                    const el = document.elementFromPoint(e.clientX, e.clientY);
                                    const overCard = el?.closest('[data-watchlist-id]');
                                    if (overCard) {
                                      const oid = overCard.getAttribute('data-watchlist-id');
                                      const ocat = overCard.getAttribute('data-watchlist-cat');
                                      if (oid && oid !== w.id) setWatchlistDragState(prev => ({ ...prev, overId: oid, overCat: ocat }));
                                    }
                                  }}
                                  onPointerUp={e => {
                                    if (watchlistDragState.draggingId !== w.id) return;
                                    const fromId = w.id;
                                    const toId = watchlistDragState.overId;
                                    const didDrag = Math.abs(watchlistDragState.x - watchlistDragState.startX) > 5 || Math.abs(watchlistDragState.y - watchlistDragState.startY) > 5;
                                    if (didDrag) watchlistLongPressTimerRef.current[w.id + '_firedAt'] = Date.now();
                                    if (toId && toId !== fromId) {
                                      setWatchlist(prev => {
                                        const arr = [...prev];
                                        const fromIdx = arr.findIndex(x => x.id === fromId);
                                        const toIdx = arr.findIndex(x => x.id === toId);
                                        if (fromIdx < 0 || toIdx < 0) return prev;
                                        const [item] = arr.splice(fromIdx, 1);
                                        arr.splice(toIdx, 0, item);
                                        return arr;
                                      });
                                    }
                                    if (didDrag) watchlistLongPressTimerRef.current[w.id + '_didDragAt'] = Date.now();
                                    setWatchlistDragState({ draggingId: null, overIdx: null, overId: null, overCat: null, x: 0, y: 0, startX: 0, startY: 0 });
                                  }}
                                  onPointerCancel={() => {
                                    setWatchlistDragState({ draggingId: null, overIdx: null, overId: null, overCat: null, x: 0, y: 0, startX: 0, startY: 0 });
                                  }}
                                  onMouseDown={e => {
                                    if (isDeleteMode) return;
                                    if (e.button !== 0) return;
                                    watchlistLongPressTimerRef.current[w.id + '_fired'] = false;
                                    watchlistLongPressTimerRef.current[w.id + '_firedAt'] = 0;
                                    watchlistLongPressTimerRef.current[w.id] = setTimeout(() => {
                                      watchlistLongPressTimerRef.current[w.id + '_fired'] = true;
                                      watchlistLongPressTimerRef.current[w.id + '_firedAt'] = Date.now();
                                      setWatchlistDeleteTarget(prev => prev === w.id ? null : w.id);
                                    }, 500);
                                  }}
                                  onMouseUp={() => { clearTimeout(watchlistLongPressTimerRef.current[w.id]); }}
                                  onMouseLeave={() => { clearTimeout(watchlistLongPressTimerRef.current[w.id]); }}
                                  onTouchStart={e => {
                                    if (e.touches.length > 1) return;
                                    const t = e.touches[0];
                                    if (isDeleteMode) {
                                      // 수정모드: 드래그 시작 준비 — 스크롤 방지
                                      e.preventDefault();
                                      watchlistLongPressTimerRef.current[w.id + '_touchDragStartX'] = t.clientX;
                                      watchlistLongPressTimerRef.current[w.id + '_touchDragStartY'] = t.clientY;
                                      watchlistLongPressTimerRef.current[w.id + '_touchDragging'] = false;
                                      return;
                                    }
                                    watchlistLongPressTimerRef.current[w.id + '_fired'] = false;
                                    watchlistLongPressTimerRef.current[w.id + '_firedAt'] = 0;
                                    watchlistLongPressTimerRef.current[w.id + '_startX'] = t.clientX;
                                    watchlistLongPressTimerRef.current[w.id + '_startY'] = t.clientY;
                                    watchlistLongPressTimerRef.current[w.id] = setTimeout(() => {
                                      watchlistLongPressTimerRef.current[w.id + '_fired'] = true;
                                      watchlistLongPressTimerRef.current[w.id + '_firedAt'] = Date.now();
                                      setWatchlistDeleteTarget(prev => prev === w.id ? null : w.id);
                                    }, 500);
                                  }}
                                  onTouchMove={e => {
                                    if (e.touches.length !== 1) return;
                                    const t = e.touches[0];
                                    if (isDeleteMode) {
                                      e.preventDefault();
                                      const startX = watchlistLongPressTimerRef.current[w.id + '_touchDragStartX'] || t.clientX;
                                      const startY = watchlistLongPressTimerRef.current[w.id + '_touchDragStartY'] || t.clientY;
                                      const dx = Math.abs(t.clientX - startX);
                                      const dy = Math.abs(t.clientY - startY);
                                      if (!watchlistLongPressTimerRef.current[w.id + '_touchDragging'] && (dx > 5 || dy > 5)) {
                                        watchlistLongPressTimerRef.current[w.id + '_touchDragging'] = true;
                                        setWatchlistDragState({ draggingId: w.id, overIdx: wIdx, overId: w.id, overCat: cat, x: startX, y: startY, startX, startY });
                                      }
                                      if (watchlistLongPressTimerRef.current[w.id + '_touchDragging']) {
                                        setWatchlistDragState(prev => ({ ...prev, x: t.clientX, y: t.clientY }));
                                        const el = document.elementFromPoint(t.clientX, t.clientY);
                                        const overCard = el?.closest('[data-watchlist-id]');
                                        if (overCard) {
                                          const oid = overCard.getAttribute('data-watchlist-id');
                                          const ocat = overCard.getAttribute('data-watchlist-cat');
                                          if (oid && oid !== w.id) setWatchlistDragState(prev => ({ ...prev, overId: oid, overCat: ocat }));
                                        }
                                      }
                                      return;
                                    }
                                    const dx = Math.abs(t.clientX - (watchlistLongPressTimerRef.current[w.id + '_startX'] || 0));
                                    const dy = Math.abs(t.clientY - (watchlistLongPressTimerRef.current[w.id + '_startY'] || 0));
                                    if (dx > 8 || dy > 8) clearTimeout(watchlistLongPressTimerRef.current[w.id]);
                                  }}
                                  onTouchEnd={e => {
                                    if (isDeleteMode) {
                                      e.preventDefault();
                                      const wasDragging = watchlistLongPressTimerRef.current[w.id + '_touchDragging'];
                                      watchlistLongPressTimerRef.current[w.id + '_touchDragging'] = false;
                                      if (wasDragging) {
                                        // 드래그 완료: 순서 변경
                                        const fromId = w.id;
                                        const toId = watchlistDragRef.current.overId || watchlistDragState.overId;
                                        if (toId && toId !== fromId) {
                                          setWatchlist(prev => {
                                            const arr = [...prev];
                                            const fromIdx = arr.findIndex(x => x.id === fromId);
                                            const toIdx = arr.findIndex(x => x.id === toId);
                                            if (fromIdx < 0 || toIdx < 0) return prev;
                                            const [item] = arr.splice(fromIdx, 1);
                                            arr.splice(toIdx, 0, item);
                                            return arr;
                                          });
                                        }
                                        setWatchlistDragState({ draggingId: null, overIdx: null, overId: null, overCat: null, x: 0, y: 0, startX: 0, startY: 0 });
                                        watchlistLongPressTimerRef.current[w.id + '_firedAt'] = Date.now();
                                        watchlistLongPressTimerRef.current[w.id + '_didDragAt'] = Date.now();
                                      } else {
                                        // 드래그 없이 탭: 롱프레스로 막 켜진 직후(300ms 이내)면 무시
                                        const firedAt = watchlistLongPressTimerRef.current[w.id + '_firedAt'] || 0;
                                        if (Date.now() - firedAt < 300) return;
                                        // 그 외엔 삭제 알림창 표시
                                        deleteStock();
                                      }
                                      return;
                                    }
                                    clearTimeout(watchlistLongPressTimerRef.current[w.id]);
                                    if (watchlistLongPressTimerRef.current[w.id + '_fired']) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      watchlistLongPressTimerRef.current[w.id + '_fired'] = false;
                                    }
                                  }}
                                  onContextMenu={e => e.preventDefault()}
                                  onClick={e => {
                                    e.stopPropagation();
                                    // 롱프레스 직후 발생한 click 무시 (600ms 이내)
                                    const firedAt = watchlistLongPressTimerRef.current[w.id + '_firedAt'] || 0;
                                    if (Date.now() - firedAt < 600) return;
                                    // 드래그 직후 발생한 click 무시 (300ms 이내)
                                    const didDragAt = watchlistLongPressTimerRef.current[w.id + '_didDragAt'] || 0;
                                    if (Date.now() - didDragAt < 300) return;
                                    // 수정모드 중 다른 종목 클릭 → 수정모드 해제
                                    if (watchlistDeleteTarget && watchlistDeleteTarget !== w.id) { setWatchlistDeleteTarget(null); return; }
                                    if (isDeleteMode) { setWatchlistEditTarget(w); setWatchlistEditName(w.name); return; }
                                    setWatchlistChartStock(w); setWatchlistChartPeriod('1Y'); fetchWatchlistChart(w, '1Y');
                                  }}
                                  data-watchlist-id={w.id}
                                  data-watchlist-cat={cat}
                                >
                                  {/* 좌측: 종목명 + 티커 */}
                                  <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                                    <span
                                      className={`font-black text-[10px] leading-tight ${isDeleteMode ? 'text-rose-600' : 'text-slate-800'} ${isFlowing ? 'animate-flow whitespace-nowrap block' : 'truncate'}`}
                                      onDoubleClick={e => { e.stopPropagation(); setWatchlistFlowId(isFlowing ? null : w.id); }}
                                    >{w.name}</span>
                                    <span className={`text-[8px] font-black truncate ${isDeleteMode ? 'text-rose-300' : 'text-slate-400'}`}>{w.ticker}{w.tickerSuffix}</span>
                                  </div>
                                  {/* 우측: 주가 + 등락 */}
                                  {!isDeleteMode && (
                                    <div className="flex flex-col items-end shrink-0">
                                      {currentPrice ? (
                                        <>
                                          <span className="font-black text-[10px] text-slate-800 leading-tight">{w.isUSD ? `$${formatNum(currentPrice, 2)}` : `₩${formatNum(currentPrice)}`}</span>
                                          {changePct !== null && (
                                            <span className={`text-[8px] font-black ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>
                                              {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{changePct.toFixed(2)}%
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-[8px] font-black text-slate-300">-</span>
                                      )}
                                    </div>
                                  )}
                                  {isDeleteMode && (
                                    <button onClick={e => { e.stopPropagation(); setWatchlistDeleteTarget(null); }} className="text-slate-400 hover:text-slate-600 shrink-0 bg-white rounded-full p-0.5 touch-none"><X size={11}/></button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 관심종목 차트 모달 */}
        {watchlistChartStock && (() => {
          const w = watchlistChartStock;
          const priceData = watchlistPrices[w.id];
          const currentPrice = priceData?.price;
          const prevClose = priceData?.prevClose;
          const changePct = currentPrice && prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : null;
          const isUp = changePct !== null && changePct >= 0;
          const periods = ['1M','3M','1Y','3Y'];
          const points = watchlistChartData.filter(p => p.close != null);
          const chartW = 300, chartH = 120;
          let svgPath = '', svgArea = '', totalChangePct = null;
          // 기간별 격자 간격 설정: { intervalMs, labelFmt }
          const gridConfig = {
            '1M': { getMarkers: (pts) => {
              // 1주일 단위
              const markers = [];
              let prevMon = null;
              pts.forEach((p, i) => {
                const d = p.date;
                const mon = `${d.getFullYear()}-${d.getMonth()}-W${Math.floor(d.getDate()/7)}`;
                if (mon !== prevMon) { markers.push(i); prevMon = mon; }
              });
              return markers.slice(1);
            }, fmt: d => `${d.getMonth()+1}/${d.getDate()}` },
            '3M': { getMarkers: (pts) => {
              // 1달 단위
              const markers = [];
              let prevMon = null;
              pts.forEach((p, i) => {
                const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
                if (key !== prevMon) { markers.push(i); prevMon = key; }
              });
              return markers.slice(1);
            }, fmt: d => `${d.getMonth()+1}월` },
            '1Y': { getMarkers: (pts) => {
              // 3달 단위
              const markers = [];
              let prevQ = null;
              pts.forEach((p, i) => {
                const q = `${p.date.getFullYear()}-${Math.floor(p.date.getMonth()/3)}`;
                if (q !== prevQ) { markers.push(i); prevQ = q; }
              });
              return markers.slice(1);
            }, fmt: d => `${d.getMonth()+1}월` },
            '3Y': { getMarkers: (pts) => {
              // 1년 단위
              const markers = [];
              let prevY = null;
              pts.forEach((p, i) => {
                const y = p.date.getFullYear();
                if (y !== prevY) { markers.push(i); prevY = y; }
              });
              return markers.slice(1);
            }, fmt: d => `${d.getFullYear()}` },
          };
          let gridMarkers = [];
          if (points.length >= 2) {
            const minV = Math.min(...points.map(p => p.close));
            const maxV = Math.max(...points.map(p => p.close));
            const rng = maxV - minV || 1;
            const toX = i => (i / (points.length - 1)) * chartW;
            const toY = v => chartH - ((v - minV) / rng) * chartH * 0.85 - chartH * 0.075;
            const pts = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.close).toFixed(1)}`);
            svgPath = `M${pts.join('L')}`;
            svgArea = `M${pts[0]}L${pts.join('L')}L${toX(points.length-1).toFixed(1)},${chartH}L0,${chartH}Z`;
            const s = points[0].close, e = points[points.length-1].close;
            totalChangePct = s ? ((e - s) / s) * 100 : null;
            const cfg = gridConfig[watchlistChartPeriod];
            if (cfg) {
              const idxs = cfg.getMarkers(points);
              gridMarkers = idxs.map(i => ({ x: toX(i), label: cfg.fmt(points[i].date) }));
            }
          }
          const chartColor = totalChangePct !== null ? (totalChangePct >= 0 ? '#f43f5e' : '#3b82f6') : '#94a3b8';
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[199999] flex items-center justify-center p-4" onClick={() => setWatchlistChartStock(null)}>
              <div className="bg-white rounded-[2rem] p-5 shadow-2xl w-full max-w-xs" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-black text-sm text-slate-800 leading-tight">{w.name}</p>
                    <p className="text-[9px] font-black text-slate-400">{w.ticker}{w.tickerSuffix} · {w.isETF ? 'ETF' : w.isUSD ? '🇺🇸 미국' : '🇰🇷 한국'}</p>
                  </div>
                  <button onClick={() => setWatchlistChartStock(null)} className="p-1 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"><X size={14}/></button>
                </div>
                {currentPrice && (
                  <div className="mb-3">
                    <span className="font-black text-xl text-slate-800">{w.isUSD ? `$${formatNum(currentPrice, 2)}` : `₩${formatNum(currentPrice)}`}</span>
                    {changePct !== null && (
                      <span className={`ml-2 text-xs font-black ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>{isUp ? '+' : ''}{changePct.toFixed(2)}% 오늘</span>
                    )}
                  </div>
                )}
                {/* 기간 선택 — 선택된 버튼은 진한 배경 + 흰 글자 */}
                <div className="flex gap-1 mb-3 bg-slate-100 p-1 rounded-xl">
                  {periods.map(p => (
                    <button key={p} onClick={() => { setWatchlistChartPeriod(p); fetchWatchlistChart(w, p); }}
                      className={`flex-1 text-[10px] font-black py-1 rounded-lg transition-all ${watchlistChartPeriod === p ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{p}</button>
                  ))}
                </div>
                {/* 차트 */}
                <div className="bg-slate-50 rounded-2xl p-3 min-h-[140px] flex flex-col justify-center">
                  {watchlistChartLoading ? (
                    <div className="flex items-center justify-center h-[120px] text-[10px] text-slate-300 font-black">불러오는 중...</div>
                  ) : points.length < 2 ? (
                    <div className="flex items-center justify-center h-[120px] text-[10px] text-slate-300 font-black">데이터를 불러올 수 없어요</div>
                  ) : (
                    <>
                      {/* 차트 영역 — 날짜 레이블 공간 포함 */}
                      <div style={{ position: 'relative' }}>
                        <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                          <defs>
                            <linearGradient id="wlAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartColor} stopOpacity="0.2"/>
                              <stop offset="100%" stopColor={chartColor} stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          {/* 격자 점선 */}
                          {gridMarkers.map((m, i) => (
                            <line key={i} x1={m.x.toFixed(1)} y1="0" x2={m.x.toFixed(1)} y2={chartH}
                              stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" vectorEffect="non-scaling-stroke"/>
                          ))}
                          <path d={svgArea} fill="url(#wlAreaGrad)"/>
                          <path d={svgPath} fill="none" stroke={chartColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
                        </svg>
                        {/* 날짜 레이블 — SVG 아래에 절대위치로 */}
                        {gridMarkers.length > 0 && (
                          <div style={{ position: 'relative', height: '14px' }}>
                            {gridMarkers.map((m, i) => (
                              <span key={i} style={{ position: 'absolute', left: `${(m.x / chartW * 100).toFixed(1)}%`, transform: 'translateX(-50%)', fontSize: '8px', color: '#94a3b8', fontWeight: 800, whiteSpace: 'nowrap' }}>{m.label}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {totalChangePct !== null && (
                        <p className={`text-[10px] font-black mt-1 text-center ${totalChangePct >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                          {watchlistChartPeriod} 수익률 {totalChangePct >= 0 ? '+' : ''}{totalChangePct.toFixed(2)}%
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* --- YIELD TAB --- */}
        {activeTab === 'yield' && (() => {
          // 🎯 원형 차트에 들어갈 자산 데이터 계산 (현금, 저축, 주식 각각 분리)
          // 🎯 다양한 색상 팔레트 적용
          // 🎯 세련된 파스텔/네온톤 팔레트로 전면 교체
          const pieColors = ['#fb7185', '#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#f472b6', '#2dd4bf', '#818cf8', '#fb923c', '#60a5fa', '#94a3b8', '#ec4899'];
          const rate = toPureNumber(exchangeRate) || 1392;
          // 현금 합산: 주식계좌 예수금 + 저축계좌 항목 잔액 + 소비계좌 항목 잔액
          let totalCash = 0;
          const pieStockItems = [];
          accounts.forEach(acc => {
            const accStocks = stocks.filter(s => (s.accountId || 'default') === acc.id);
            if (acc.type === 'stock') {
              totalCash += toPureNumber(acc.cash); // 주문가능금액
              accStocks.forEach(s => {
                const val = toPureNumber(s.quantity) * toPureNumber(s.currentPrice) * (s.isUSD ? rate : 1);
                if (val > 0) pieStockItems.push({ name: s.name, value: val });
              });
            } else if (acc.type === 'savings' || acc.type === 'spending') {
              accStocks.forEach(s => { totalCash += toPureNumber(s.quantity); });
            }
          });
          const pieRawItems = [];
          if (totalCash > 0) pieRawItems.push({ name: '현금', value: totalCash });
          pieStockItems.forEach(d => pieRawItems.push(d));
          const pieData = pieRawItems
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((d, i) => ({ ...d, color: pieColors[i % pieColors.length] }));

          return (
            <section className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm min-h-[400px] mt-2 animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <div>
                  <h2 className={`font-bold text-sm sm:text-base ${t.text} flex items-center gap-1.5 whitespace-nowrap`}><CalendarDays size={16}/> 🌱 {characterName} 성장일기</h2>
                  <p className="text-[9px] font-bold text-slate-500 mt-1">총 자산: <span className={`font-black ${t.text}`}>₩{formatNum(globalStats.totalAssets + globalStats.totalLoanDebt)}</span>
                    {globalStats.totalLoanDebt > 0 && <span className="text-[8px] text-slate-400 ml-1">(대출 제외)</span>}
                  </p>
                </div>
              </div>

              {/* 차트(좌) + 자산 목록(우) 2열 레이아웃 — 드래그 divider */}
              <div className="bg-slate-50 rounded-2xl p-3 md:p-4 border border-slate-100 mb-5 shadow-inner flex items-stretch gap-0 select-none"
                onMouseMove={e => {
                  if (!chartDragState.current) return;
                  const container = e.currentTarget;
                  const rect = container.getBoundingClientRect();
                  const dx = e.clientX - chartDragState.current.startX;
                  const pct = chartDragState.current.startSplit + (dx / rect.width) * 100;
                  setChartSplit(Math.min(80, Math.max(30, pct)));
                }}
                onMouseUp={() => { chartDragState.current = null; }}
                onMouseLeave={() => { chartDragState.current = null; }}
                onTouchMove={e => {
                  if (!chartDragState.current) return;
                  const container = e.currentTarget;
                  const rect = container.getBoundingClientRect();
                  const dx = e.touches[0].clientX - chartDragState.current.startX;
                  const pct = chartDragState.current.startSplit + (dx / rect.width) * 100;
                  setChartSplit(Math.min(80, Math.max(30, pct)));
                }}
                onTouchEnd={() => { chartDragState.current = null; }}
              >
                {/* 좌: 파이차트 */}
                <div className="shrink-0 relative" style={{width: `${chartSplit}%`, aspectRatio: '1/1'}}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5">총 자산</span>
                    <span className="text-[13px] md:text-[16px] font-black text-slate-700">₩{formatNum(globalStats.totalAssets + globalStats.totalLoanDebt)}</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius="52%" outerRadius="82%" paddingAngle={4} dataKey="value" stroke="none" cornerRadius={6} className="outline-none">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₩${formatNum(value)}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: '900', fontSize: '12px' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                {/* 드래그 divider */}
                <div
                  ref={chartDividerRef}
                  className="flex items-center justify-center shrink-0 cursor-col-resize z-10 px-1"
                  style={{width: '14px'}}
                  onMouseDown={e => { chartDragState.current = { startX: e.clientX, startSplit: chartSplit }; e.preventDefault(); }}
                  onTouchStart={e => { chartDragState.current = { startX: e.touches[0].clientX, startSplit: chartSplit }; }}
                >
                  <div className="w-[3px] rounded-full bg-slate-200 hover:bg-slate-300 transition-colors" style={{height: '40%', minHeight: '32px'}}></div>
                </div>
                {/* 우: 자산 목록 */}
                <div className="flex-1 flex flex-col gap-1.5 justify-center overflow-hidden min-w-0">
                  {pieData.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="shrink-0 w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></span>
                      <span className="text-[10px] md:text-[11px] font-black text-slate-700 truncate flex-1">{item.name}</span>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[12px] md:text-[14px] font-black text-slate-800">{((item.value / (globalStats.totalAssets + globalStats.totalLoanDebt)) * 100).toFixed(1)}%</span>
                        <span className="text-[8px] font-bold text-slate-400">₩{formatNum(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 기존 테이블 영역 */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm custom-scrollbar pb-2">
                <table className="w-full text-center border-collapse min-w-[500px] bg-white"><thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200"><tr><th className="py-2 px-2 whitespace-nowrap text-center">날짜</th><th className="py-2 px-2 whitespace-nowrap text-center">총 평가액</th><th className="py-2 px-2 whitespace-nowrap text-center">수익금</th><th className="py-2 px-2 whitespace-nowrap text-center">수익률</th><th className="py-2 px-2 text-orange-500 whitespace-nowrap text-center">배당금</th><th className="py-2 px-2 whitespace-nowrap text-center">관리</th></tr></thead><tbody className="text-[10px] font-bold text-slate-700 text-center">
                  {sortedYears.map(y => {
                    const yearRecords = groupedHistory[y]?.records || [];
                    const latestRecord = yearRecords[0] || {};
                    const yearTotalDiv = yearRecords.reduce((sum, r) => sum + r.dividend, 0); 
                    return (
                    <React.Fragment key={y}><tr onClick={() => setExpandedHistoryYears(p => ({...p, [y]: !p[y]}))} className="bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                        <td className="py-3 px-2 font-black text-slate-600 flex items-center justify-center gap-1 text-[11px] whitespace-nowrap">{expandedHistoryYears[y] ? <ChevronDown size={12}/> : <ChevronRight size={12}/>} {y}년</td>
                        <td className="py-3 px-2 font-black text-slate-800 text-[11px] whitespace-nowrap text-center">₩{formatNum(latestRecord.current)}</td>
                        <td className={`py-3 px-2 font-black text-[11px] whitespace-nowrap text-center ${latestRecord.profit>=0?t.text:'text-blue-500'}`}>₩{formatNum(latestRecord.profit)}</td>
                        <td className="py-3 px-2 whitespace-nowrap text-center"><span className={`px-2 py-0.5 rounded font-black ${latestRecord.roi>=0?t.light:'bg-blue-100 text-blue-600'}`}>{formatNum(latestRecord.roi, 1)}%</span></td>
                        <td className="py-3 px-2 font-black text-orange-500 text-[11px] whitespace-nowrap text-center">₩{formatNum(yearTotalDiv)}</td>
                        <td className="py-3 px-2 text-center text-[9px] text-slate-500 whitespace-nowrap text-center">1년 결산</td>
                      </tr>
                      {expandedHistoryYears[y] && yearRecords.map(r => (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group"><td className="py-2.5 px-2 whitespace-nowrap text-center"><span className={`px-2 py-0.5 rounded-md font-black inline-block w-full max-w-[60px] text-center ${r.year === currentYearNum && r.month === currentMonthNum ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border text-slate-600'}`}>{r.month}월 {r.year === currentYearNum && r.month === currentMonthNum && '(현재)'}</span></td><td className="py-2.5 px-2 text-slate-800 whitespace-nowrap text-center">₩{formatNum(r.current)}</td><td className={`py-2.5 px-2 whitespace-nowrap text-center ${r.profit>=0?t.text:'text-blue-400'}`}>₩{formatNum(r.profit)}</td><td className="py-2.5 px-2 whitespace-nowrap text-center">{r.roi>=0 ? '+' : ''}{formatNum(r.roi, 1)}%</td><td className="py-2.5 px-2 text-orange-400 whitespace-nowrap text-center">₩{formatNum(r.dividend)}</td><td className="py-2.5 px-2 flex justify-center whitespace-nowrap text-center"><button onClick={() => showConfirm("기록을 삭제하시겠습니까?\n기록이 영구 삭제됩니다.", () => handleDeleteHistory(r.id))} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 p-1"><Trash2 size={12}/></button></td></tr>
                      ))}
                    </React.Fragment>
                  )})}
                </tbody></table>
              </div>
            </section>
          );
        })()}

        {/* --- 소비 탭 --- */}
        {activeTab === 'expense' && (() => {
          // 날짜를 YYYY-MM-DD 로 정규화 (점 구분자, 타임스탬프 숫자 모두 처리)
          const normalizeDate = (r) => {
            const raw = r.date || r.timestamp;
            if (!raw) return '';
            if (typeof raw === 'number') {
              const d = new Date(raw);
              return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            }
            return String(raw).replace(/\./g, '-').split('T')[0];
          };

          // 모드별 기록 필터
          const salaryLogs = (tradeLogs || []).filter(r => r.type === 'income' && r.category === '급여');
          const bonusLogs = (tradeLogs || []).filter(r =>
            r.type === 'income' && r.category !== '급여' && r.category !== '충전' && r.name !== '지갑 충전'
          );
          const expenseLogs = (tradeLogs || []).filter(r =>
            r.type === 'expense' && !r.isNbbang &&
            // N빵 결제자 로그는 내가 멤버인 경우만 소비에 포함 (myInNbbang===false이면 제외, 필드 없는 기존 데이터는 포함)
            !(r.nbbangCount > 1 && r.myInNbbang === false) &&
            r.category !== '카드대금' && r.category !== '투자/저축' && r.category !== '고정비'
          );
          const fixedLogs = (tradeLogs || []).filter(r =>
            r.type === 'expense' && r.category === '고정비'
          );

          const groupByDate = (logs) => {
            const byDate = logs.reduce((acc, r) => {
              const d = normalizeDate(r);
              if (!d) return acc;
              if (!acc[d]) acc[d] = [];
              acc[d].push(r);
              return acc;
            }, {});
            return Object.keys(byDate).sort((a, b) => b.localeCompare(a)).map(d => ({ date: d, entries: byDate[d] }));
          };

          const salaryGroups = groupByDate(salaryLogs);
          const bonusGroups = groupByDate(bonusLogs);
          const expenseGroups = groupByDate(expenseLogs);

          const fixedGroups = groupByDate(fixedLogs);
          const activeGroups = incomeMode === 'salary' ? salaryGroups : incomeMode === 'bonus' ? bonusGroups : incomeMode === 'expense' ? expenseGroups : incomeMode === 'fixed' ? fixedGroups : [];
          const activeColor = incomeMode === 'expense' || incomeMode === 'fixed'
            ? { bg: 'bg-rose-50', border: 'border-rose-100', label: 'text-rose-500', total: 'text-rose-500', totalPrefix: '-' }
            : { bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'text-emerald-500', total: 'text-emerald-600', totalPrefix: '+' };
          const activeTitle = incomeMode === 'salary' ? '💵 월급 기록' : incomeMode === 'bonus' ? '🧧 수익 기록' : incomeMode === 'fixed' ? '📌 고정비 기록' : '💳 소비 기록';

          return (
            <section className="flex flex-col gap-4 pb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <h2 className="text-sm font-black text-slate-700 mb-4">💰 머니로그</h2>

                {/* 월급/수익/소비 모드 선택 버튼 */}
                <div className="flex gap-1.5 mb-3">
                  <button onClick={() => { setIncomeMode('salary'); setIncomeAmount(''); setIsNbbang(false); setExpenseDateInput(''); setBonusDestAccId(''); }} className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-colors ${incomeMode === 'salary' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>월급 💵</button>
                  <button onClick={() => { setIncomeMode('bonus'); setIncomeAmount(''); setIsNbbang(false); setExpenseDateInput(''); setIncomeCategory('출장비'); }} className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-colors ${incomeMode === 'bonus' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>수익 🧧</button>
                  <button onClick={() => { setIncomeMode('expense'); setIncomeAmount(''); setIsNbbang(false); setIsNbbangConfirmed(false); setNbbangList([{id:Date.now(), name:''}]); setExpenseDateInput(''); }} className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-colors ${incomeMode === 'expense' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>소비 💳</button>
                  <button onClick={() => { setIncomeMode('fixed'); setIncomeAmount(''); setIsNbbang(false); setExpenseDateInput(''); }} className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-colors ${incomeMode === 'fixed' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>고정비 📌</button>
                </div>

                {incomeMode && (
                  <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {incomeMode === 'salary' && (() => {
                      const savingsStocks = stocks
                        .filter(s => accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'savings')
                        .map(s => ({ key: `stock:${s.id}`, label: s.name, sub: `₩${formatNum(toPureNumber(s.quantity))}`, isSalary: s.name.includes('월급') }))
                        .sort((a, b) => (b.isSalary ? 1 : 0) - (a.isSalary ? 1 : 0));
                      // 월급 포함 항목이 있으면 자동 선택
                      const defaultKey = savingsStocks.find(d => d.isSalary)?.key || savingsStocks[0]?.key || '';
                      if (!bonusDestAccId && defaultKey) setTimeout(() => setBonusDestAccId(defaultKey), 0);
                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {savingsStocks.map(d => (
                            <button key={d.key} type="button" onClick={() => setBonusDestAccId(bonusDestAccId === d.key ? '' : d.key)}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors border ${bonusDestAccId === d.key ? 'bg-emerald-500 text-white border-emerald-500' : d.isSalary ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                              {d.label} <span className="opacity-70 text-[9px]">{d.sub}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    {incomeMode === 'bonus' && (
                      <div className="flex flex-col gap-2">
                        {['출장비', '성과급', '복지비', '자기계발비'].includes(incomeCategory) ? (
                          <select className="w-full text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={incomeCategory}
                            onChange={e => {
                              if (e.target.value === '__other__') setIncomeCategory('');
                              else setIncomeCategory(e.target.value);
                            }}>
                            <option value="출장비">출장비</option>
                            <option value="성과급">성과급</option>
                            <option value="복지비">복지비</option>
                            <option value="자기계발비">자기계발</option>
                            <option value="__other__">기타 (직접 입력)</option>
                          </select>
                        ) : (
                          <div className="flex w-full gap-1 animate-in zoom-in duration-200">
                            <button type="button" onClick={() => setIncomeCategory('출장비')} className="shrink-0 px-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-colors">←</button>
                            <input type="text" className="flex-1 text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-400 bg-white" placeholder="항목명 입력 (비우면 기타 수익으로 저장)" value={incomeCategory} onChange={e => setIncomeCategory(e.target.value)} autoFocus />
                          </div>
                        )}
                        {/* 입금 계좌 선택 */}
                        <div className="flex flex-wrap gap-1.5">
                          {stocks.filter(s => accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'savings').map(s => (
                            <button key={s.id} type="button" onClick={() => setBonusDestAccId(bonusDestAccId === `stock:${s.id}` ? '' : `stock:${s.id}`)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${bonusDestAccId === `stock:${s.id}` ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                              💳 {s.name} <span className="opacity-70">₩{formatNum(toPureNumber(s.quantity))}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {incomeMode === 'expense' && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1.5">
                          <div className="flex-1 flex items-center">
                            {['식비', '생필품', '의류비'].includes(expenseCategory) ? (
                              <select className="w-full text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                                <option value="식비">식비</option><option value="생필품">생필품</option><option value="의류비">의류비</option><option value="기타">기타</option>
                              </select>
                            ) : (
                              <div className="flex w-full gap-1 animate-in zoom-in duration-200">
                                <button type="button" onClick={() => setExpenseCategory('식비')} className="shrink-0 px-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-colors">←</button>
                                <input type="text" className="flex-1 text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-400 bg-white" placeholder="기타 (상세 내역 입력)" value={expenseCategory === '기타' ? '' : expenseCategory} onChange={e => setExpenseCategory(e.target.value)} autoFocus />
                              </div>
                            )}
                          </div>
                          <select className="flex-1 text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setSelectedCard(''); setCashSource(''); setTransferAccId(''); }}>
                            <option value="현금">현금</option><option value="체크카드">체크카드</option><option value="신용카드">신용카드</option>
                          </select>
                        </div>
                        {(paymentMethod === '체크카드' || paymentMethod === '신용카드') && (() => {
                          const isCredit = paymentMethod === '신용카드';
                          const cardList = [
                            ...myCards.filter(c => isCredit ? c.type === '신용' : c.type === '체크').map(c => ({ key: `mc-${c.id}`, name: c.name })),
                            ...stocks.filter(s => {
                              const acc = accounts.find(a => a.id === (s.accountId || 'default'));
                              return acc?.type === 'card' && (isCredit ? s.cardType === '신용' : s.cardType !== '신용');
                            }).filter(s => !myCards.some(c => c.name === s.name)).map(s => ({ key: `ca-${s.id}`, name: s.name })),
                          ];
                          // 선택된 카드 실적 게이지 계산
                          const selCardGauge = (() => {
                            if (!selectedCard) return null;
                            const mc = myCards.find(c => c.name === selectedCard);
                            const sc = stocks.find(s => s.name === selectedCard && accounts.find(a => a.id === (s.accountId||'default'))?.type === 'card');
                            const period = mc ? mc.period : sc?.cardPeriod;
                            const target = mc ? Number(mc.target || 0) : toPureNumber(sc?.performance);
                            if (!target || target <= 0) return null;
                            const rawLogs = (tradeLogs || []).filter(r => r.cardName === selectedCard && (r.paymentMethod === '체크카드' || r.paymentMethod === '신용카드') && !r.isNbbang && !r.excludeFromPerf);
                            const totalUsed = filterByCurrentMonth(rawLogs).reduce((sum, r) => {
                              const full = r.totalAmount ? Number(r.totalAmount) : (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare) * Number(r.nbbangCount) : toPureNumber(r.amount);
                              return sum + full;
                            }, 0);
                            const percent = Math.min((totalUsed / target) * 100, 100);
                            const isReached = totalUsed >= target;
                            return { totalUsed, target, percent, isReached, period };
                          })();
                          return (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex flex-wrap gap-1.5">
                                {cardList.length === 0
                                  ? <span className="text-[9px] text-slate-400 font-bold">등록된 {paymentMethod}가 없습니다</span>
                                  : cardList.map(c => (
                                    <button key={c.key} type="button"
                                      onClick={() => setSelectedCard(selectedCard === c.name ? '' : c.name)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${selectedCard === c.name ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                                      💳 {c.name}
                                    </button>
                                  ))
                                }
                              </div>
                              {selCardGauge && (
                                <div className="px-1 pt-0.5 pb-1 animate-in fade-in duration-200">
                                  <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-1">
                                    <span>이번달 실적 ₩{formatNum(selCardGauge.totalUsed)}</span>
                                    <span className={selCardGauge.isReached ? 'text-emerald-500 font-black' : ''}>목표 ₩{formatNum(selCardGauge.target)}{selCardGauge.isReached ? ' ✓' : ''}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                                    <div className={`h-full rounded-full transition-all duration-500 ${selCardGauge.isReached ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${selCardGauge.percent}%` }}></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {paymentMethod === '현금' && (
                          <div className="flex flex-wrap gap-1.5">
                            {accounts.filter(a => a.type === 'spending').map(a => (
                              <button key={a.id} type="button"
                                onClick={() => { setCashSource(cashSource === a.id ? '' : a.id); setSelectedCard(''); setSpendingItem(''); setUseSpendingPoint(false); }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${cashSource === a.id ? 'bg-rose-500 text-white border-rose-500' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}>
                                🛍️ {a.name}
                              </button>
                            ))}
                            <button type="button"
                              onClick={() => { setCashSource(cashSource === 'transfer' ? '' : 'transfer'); setTransferAccId(''); setSelectedCard(''); }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${cashSource === 'transfer' ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>
                              🏦 계좌이체
                            </button>
                          </div>
                        )}
                        {paymentMethod === '현금' && cashSource && cashSource !== 'transfer' && (() => {
                          const items = stocks.filter(s => (s.accountId || 'default') === cashSource);
                          const selectedItem = items.find(s => s.id === spendingItem);
                          const hasWithdrawAcc = !!selectedItem?.withdrawAccId;
                          return (
                            <div className="flex flex-wrap gap-1.5 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                              <span className="w-full text-[9px] font-black text-rose-400 mb-0.5">결제 수단 선택</span>
                              {items.length === 0 ? (
                                <span className="text-[9px] text-slate-400 font-bold">이 소비계좌에 저장된 항목이 없습니다</span>
                              ) : (
                                items.map(s => (
                                  <button key={s.id} type="button"
                                    onClick={() => { setSpendingItem(spendingItem === s.id ? '' : s.id); setUseSpendingPoint(false); }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${spendingItem === s.id ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-100'}`}>
                                    {s.name} <span className="text-[9px] opacity-70">₩{formatNum(toPureNumber(s.quantity))}</span>
                                  </button>
                                ))
                              )}
                              {hasWithdrawAcc && (
                                <button type="button"
                                  onClick={() => setUseSpendingPoint(v => !v)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${useSpendingPoint ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-amber-600 border-amber-300 hover:bg-amber-50'}`}>
                                  🎁 포인트 사용 {useSpendingPoint ? 'ON' : 'OFF'}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        {paymentMethod === '현금' && cashSource === 'transfer' && (() => {
                          const savingsStocks = stocks.filter(s => {
                            const acc = accounts.find(a => a.id === (s.accountId || 'default'));
                            return acc?.type === 'savings';
                          });
                          return (
                            <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <span className="w-full text-[9px] font-black text-slate-400 mb-0.5">출금 계좌 선택</span>
                              {savingsStocks.map(s => (
                                <button key={`stk-${s.id}`} type="button"
                                  onClick={() => setTransferAccId(transferAccId === `stock:${s.id}` ? '' : `stock:${s.id}`)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${transferAccId === `stock:${s.id}` ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                                  🏦 {s.name} <span className="opacity-70">₩{formatNum(toPureNumber(s.quantity))}</span>
                                </button>
                              ))}
                              {savingsStocks.length === 0 && (
                                <span className="text-[9px] text-slate-400 font-bold">입출금 통장이 없습니다</span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex gap-1.5">
                          <input type="text" className="flex-1 text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-400 bg-white" placeholder="무엇을 샀나요?" value={expenseMemo} onChange={e => setExpenseMemo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleMoneyLogSubmit(); }} />
                          <button onClick={() => { setIsNbbang(!isNbbang); setIsNbbangConfirmed(false); if(!isNbbang) setNbbangList([{id:Date.now(), name:''}]); }} className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-colors flex items-center gap-1 ${isNbbang ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white border-slate-200 text-slate-600'} border shadow-sm`}>🍰 N빵</button>
                        </div>
                        {isNbbang && (
                          <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 flex flex-col gap-2 animate-in zoom-in duration-200 mt-1">
                            {isNbbangConfirmed ? (
                              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-purple-200 shadow-sm">
                                <span className="text-[10px] font-black text-purple-700 truncate flex-1">함께한 사람: {nbbangList.map(n=>n.name).filter(Boolean).join(', ')}</span>
                                <button onClick={() => setIsNbbangConfirmed(false)} className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-[9px] font-black shadow-sm hover:bg-purple-200 shrink-0 transition-colors">수정</button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] font-black text-purple-600">총 인원 설정</span>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => setNbbangList(nbbangList.length > 1 ? nbbangList.slice(0, -1) : nbbangList)} className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-purple-600 font-black shadow-sm border border-purple-200 hover:bg-purple-50 transition-colors">-</button>
                                    <span className="text-xs font-black text-purple-800 w-4 text-center">{nbbangList.length}</span>
                                    <button onClick={() => setNbbangList([...nbbangList, { id: Date.now() + nbbangList.length, name: '' }])} className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-purple-600 font-black shadow-sm border border-purple-200 hover:bg-purple-50 transition-colors">+</button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-5 gap-1.5 max-h-[120px] overflow-y-auto p-0.5">
                                  {nbbangList.map((person, index) => (
                                    <input key={person.id} id={`ec-nbbang-input-${index}`} type="text"
                                      className="w-full text-[10px] font-black text-slate-800 border border-purple-200 rounded-lg p-1.5 outline-none focus:border-purple-400 bg-white text-center shadow-sm"
                                      placeholder={`인원${index+1}`} value={person.name}
                                      onChange={e => { const newList = [...nbbangList]; newList[index].name = e.target.value; setNbbangList(newList); }}
                                      onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); if (index < nbbangList.length - 1) { document.getElementById(`ec-nbbang-input-${index + 1}`)?.focus(); } else { setIsNbbangConfirmed(true); } } }}
                                    />
                                  ))}
                                </div>
                                <div className="flex justify-end mt-1">
                                  <button onClick={() => setIsNbbangConfirmed(true)} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-[10px] font-black shadow-sm hover:bg-purple-600 transition-colors">입력완료</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {incomeMode === 'fixed' && (
                      <div className="flex flex-col gap-2">
                        {/* 고정비 등록 폼 — 2줄 레이아웃 */}
                        {(() => {
                          const doRegister = () => {
                            const cat = newFixedName.trim();
                            const sub = newFixedSub.trim();
                            const name = sub ? `${cat}-${sub}` : cat;
                            const amt = Number(newFixedAmount);
                            const day = Number(newFixedDay);
                            if (!cat || !amt || !day || day < 1 || day > 31) { showToast('대분류, 금액, 날짜(일)를 모두 입력하세요'); return; }
                            setFixedExpenses([...fixedExpenses, { id: Date.now().toString(), name, amount: amt, day, paymentMethod: newFixedPayment.method, cardName: newFixedPayment.cardName, transferAccId: newFixedPayment.transferAccId, isUSD: newFixedIsUSD, excludeFromPerf: newFixedExcludePerf }]);
                            setNewFixedName(''); setNewFixedSub(''); setNewFixedAmount(''); setNewFixedDay(''); setNewFixedPayment({ method: '현금', cardName: '', transferAccId: '' }); setNewFixedIsUSD(false); setNewFixedExcludePerf(false);
                            showToast(`📌 ${name} 고정비 등록 완료`);
                          };
                          return (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex gap-1.5">
                                <select className="flex-1 min-w-0 text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none focus:border-amber-400 bg-white" value={newFixedName} onChange={e => setNewFixedName(e.target.value)}>
                                  <option value="">대분류 선택</option>
                                  {fixedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input type="text" className="flex-1 min-w-0 text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-amber-400 bg-white" placeholder="세부내역 (선택)" value={newFixedSub} onChange={e => setNewFixedSub(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('fixedAmtInput')?.focus(); }} />
                              </div>
                              <div className="flex gap-1.5 items-center">
                                <button onClick={() => setNewFixedIsUSD(v => !v)} className={`px-2.5 py-2 rounded-lg text-[10px] font-black shrink-0 border transition-colors ${newFixedIsUSD ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{newFixedIsUSD ? '$' : '₩'}</button>
                                <input id="fixedAmtInput" type="text" className="flex-1 min-w-0 text-right text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-amber-400 bg-white" placeholder={newFixedIsUSD ? 'USD 금액' : '금액'} value={newFixedIsUSD ? newFixedAmount : toCommaString(newFixedAmount)} onChange={e => setNewFixedAmount(newFixedIsUSD ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('fixedDayInput')?.focus(); }} />
                                <input id="fixedDayInput" type="text" inputMode="numeric" className="w-[46px] text-center text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-amber-400 bg-white shrink-0" placeholder="일" value={newFixedDay} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); if (Number(v) <= 31) setNewFixedDay(v); }} onKeyDown={e => { if (e.key === 'Enter') doRegister(); }} />
                                <button onClick={() => setNewFixedExcludePerf(v => !v)} className={`px-2 py-2 rounded-lg text-[10px] font-black shrink-0 border transition-colors ${newFixedExcludePerf ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`} title="실적제외: 카드 실적 달성 계산에서 제외">실적제외</button>
                                <button onClick={doRegister} className="bg-amber-400 text-white px-3 py-2 rounded-lg text-[10px] font-black shrink-0 shadow-sm hover:bg-amber-500 transition-colors">등록</button>
                                <button onClick={() => { setShowFixedCatInput(v => !v); setNewFixedCatName(''); }} className={`px-2.5 py-2 rounded-lg text-[10px] font-black shrink-0 shadow-sm transition-colors border ${showFixedCatInput ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>+분류</button>
                              </div>
                            </div>
                          );
                        })()}
                        {showFixedCatInput && (
                          <div className="flex gap-1.5 items-center animate-in zoom-in duration-150">
                            <input type="text" autoFocus className="flex-1 text-[10px] font-black text-slate-800 border border-amber-300 rounded-lg p-2 outline-none focus:border-amber-500 bg-white" placeholder="새 대분류명 (예: 대출상환)" value={newFixedCatName} onChange={e => setNewFixedCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') {
                              const v = newFixedCatName.trim();
                              if (!v) return;
                              if (fixedCategories.includes(v)) { showToast('이미 있는 대분류입니다'); return; }
                              setFixedCategories([...fixedCategories, v]);
                              setNewFixedName(v);
                              setNewFixedCatName(''); setShowFixedCatInput(false);
                              showToast(`✓ "${v}" 대분류 추가 완료`);
                            }}} />
                            <button onClick={() => {
                              const v = newFixedCatName.trim();
                              if (!v) return;
                              if (fixedCategories.includes(v)) { showToast('이미 있는 대분류입니다'); return; }
                              setFixedCategories([...fixedCategories, v]);
                              setNewFixedName(v);
                              setNewFixedCatName(''); setShowFixedCatInput(false);
                              showToast(`✓ "${v}" 대분류 추가 완료`);
                            }} className="bg-amber-400 text-white px-3 py-2 rounded-lg text-[10px] font-black shrink-0 shadow-sm hover:bg-amber-500 transition-colors">추가</button>
                          </div>
                        )}
                        {/* 결제수단 선택 */}
                        {(() => {
                          const allPaymentOptions = [
                            ...myCards.map(c => ({ key: `card-${c.name}`, label: `💳 ${c.name}`, method: c.type === '신용' ? '신용카드' : '체크카드', cardName: c.name, transferAccId: '' })),
                            ...stocks.filter(s => { const acc = accounts.find(a => a.id === (s.accountId || 'default')); return acc?.type === 'card'; }).map(s => ({ key: `cardacc-${s.id}`, label: `💳 ${s.name}`, method: s.cardType === '신용' ? '신용카드' : '체크카드', cardName: s.name, transferAccId: '' })),
                            ...stocks.filter(s => { const acc = accounts.find(a => a.id === (s.accountId || 'default')); return acc?.type === 'savings'; }).map(s => ({ key: `savstk-${s.id}`, label: `🏦 ${s.name}`, method: '현금', cardName: '', transferAccId: `stock:${s.id}` })),
                          ];
                          const selectedKey = newFixedPayment.cardName
                            ? (newFixedPayment.transferAccId ? `savstk-${newFixedPayment.transferAccId.replace('stock:','')}` : `card-${newFixedPayment.cardName}`)
                            : (newFixedPayment.transferAccId ? (newFixedPayment.transferAccId.startsWith('acc:') ? `acc-${newFixedPayment.transferAccId.replace('acc:','')}` : `savstk-${newFixedPayment.transferAccId.replace('stock:','')}`) : '__cash__');
                          return (
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => setNewFixedPayment({ method: '현금', cardName: '', transferAccId: '' })}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${newFixedPayment.method === '현금' && !newFixedPayment.transferAccId ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                💵 현금
                              </button>
                              {allPaymentOptions.map(opt => (
                                <button key={opt.key} onClick={() => setNewFixedPayment({ method: opt.method, cardName: opt.cardName, transferAccId: opt.transferAccId })}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${newFixedPayment.cardName === opt.cardName && newFixedPayment.transferAccId === opt.transferAccId && !(newFixedPayment.method === '현금' && !newFixedPayment.transferAccId) ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                        {/* 고정비 목록 — 대분류별 그룹 카드 */}
                        {fixedExpenses.length === 0 ? (
                          <div className="text-center text-[9px] text-slate-400 py-4 bg-slate-50/60 rounded-lg border border-dashed border-slate-200 mt-1">
                            📌 등록된 고정비가 없습니다
                          </div>
                        ) : (() => {
                          const catIconMap = {
                            '월세/관리비/공과금': '🏠', '관리비': '🏠', '월세': '🏠', '공과금': '🏠',
                            '구독료/통신비': '📱', '구독료': '📱', '통신비': '📱',
                            '보험료/교육비/교통비': '🛡️', '보험료': '🛡️', '교육비': '📚', '교통비': '🚌',
                            '대출상환': '💰', '대출': '💰',
                          };
                          const getCat = (fe) => {
                            const dashIdx = fe.name.indexOf('-');
                            return dashIdx > 0 ? fe.name.slice(0, dashIdx).trim() : '기타';
                          };
                          const getCatIcon = (cat) => catIconMap[cat] || '📌';
                          const getItemLabel = (fe) => {
                            const dashIdx = fe.name.indexOf('-');
                            return dashIdx > 0 ? fe.name.slice(dashIdx + 1).trim() : fe.name;
                          };
                          const getFeSubLabel = (fe) => {
                            if (fe.cardName) return fe.cardName;
                            if (fe.transferAccId) {
                              if (fe.transferAccId.startsWith('stock:')) {
                                const stk = stocks.find(s => s.id === fe.transferAccId.replace('stock:', ''));
                                return stk ? stk.name : '저축';
                              }
                              const accId = fe.transferAccId.startsWith('acc:') ? fe.transferAccId.replace('acc:', '') : fe.transferAccId;
                              const acc = accounts.find(a => a.id === accId);
                              return acc ? acc.name : '입출금';
                            }
                            return '현금';
                          };
                          // group by category
                          const grouped = {};
                          fixedExpenses.forEach(fe => {
                            const cat = getCat(fe);
                            if (!grouped[cat]) grouped[cat] = [];
                            grouped[cat].push(fe);
                          });
                          const groupKeys = Object.keys(grouped);
                          const totalMonthly = fixedExpenses.reduce((s, fe) => s + (fe.isUSD ? Math.round(Number(fe.amount) * (exchangeRate || 1350)) : Number(fe.amount)), 0);
                          return (
                            <div className="flex flex-col gap-1.5 mt-2">
                              <div className="flex items-center justify-between px-0.5 mb-0.5">
                                <span className="text-[9px] font-bold text-slate-400">총 {fixedExpenses.length}건</span>
                                <span className="text-[10px] font-black text-slate-700">월 ₩{formatNum(totalMonthly)}</span>
                              </div>
                              <div className={`grid gap-2 ${groupKeys.length === 1 ? 'grid-cols-1' : groupKeys.length === 2 ? 'grid-cols-2' : groupKeys.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`} style={groupKeys.length > 4 ? { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } : {}}>
                                {groupKeys.map(cat => {
                                  const items = grouped[cat];
                                  const catTotal = items.reduce((s, fe) => s + (fe.isUSD ? Math.round(Number(fe.amount) * (exchangeRate || 1350)) : Number(fe.amount)), 0);
                                  return (
                                    <div key={cat} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border-b border-slate-100">
                                        <span className="text-[11px]">{getCatIcon(cat)}</span>
                                        <span className="text-[9px] font-black text-slate-600 flex-1 truncate">{cat}</span>
                                        <span className="text-[8px] font-bold text-slate-400">₩{formatNum(catTotal)}</span>
                                      </div>
                                      <div className="flex flex-col divide-y divide-slate-50">
                                        {items.map(fe => {
                                          const krwAmt = fe.isUSD ? Math.round(Number(fe.amount) * (exchangeRate || 1350)) : Number(fe.amount);
                                          const subLabel = getFeSubLabel(fe);
                                          const itemLabel = getItemLabel(fe);
                                          return (
                                            <div key={fe.id}
                                              onDoubleClick={() => {
                                                setEditFixedModal({ fe, excludeFromPerf: !!fe.excludeFromPerf });
                                                setEditFixedAmount(String(fe.amount));
                                                setEditFixedDay(String(fe.day));
                                                setEditFixedPayment({ method: fe.paymentMethod || '현금', cardName: fe.cardName || '', transferAccId: fe.transferAccId || '' });
                                                setEditFixedIsUSD(!!fe.isUSD);
                                              }}
                                              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-50 active:bg-amber-50 cursor-pointer select-none transition-colors">
                                              <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[8.5px] font-bold text-slate-700 truncate">{itemLabel}</span>
                                                <span className="text-[7px] text-slate-400">{subLabel} · {fe.day}일</span>
                                              </div>
                                              <div className="flex flex-col items-end shrink-0">
                                                <span className="text-[8.5px] font-black text-slate-800">{fe.isUSD ? `$${formatNum(fe.amount, 2)}` : `₩${formatNum(krwAmt)}`}</span>
                                                {fe.isUSD && <span className="text-[7px] text-slate-400">≈₩{formatNum(krwAmt)}</span>}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {incomeMode !== 'fixed' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input type="text" className="w-[60px] text-center text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-emerald-400 bg-white shrink-0" placeholder="MMDD" value={expenseDateInput} onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length > 4) val = val.slice(0, 4);
                        if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
                        setExpenseDateInput(val);
                      }} />
                      <input type="text" className="flex-1 text-right text-[11px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-400 min-w-0" placeholder="총 금액 입력" value={toCommaString(incomeAmount)} onChange={e => setIncomeAmount(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') { const amt = toPureNumber(incomeAmount); if (amt <= 0) return; const label = incomeMode === 'salary' ? '월급' : incomeMode === 'bonus' ? '수익' : incomeMode === 'expense' ? '소비' : '고정비'; const eul = label === '소비' ? '를' : '을'; showConfirm(`₩${formatNum(amt)} ${label}${eul} 기록하시겠습니까?`, handleMoneyLogSubmit); } }} />
                      <button onClick={() => { const amt = toPureNumber(incomeAmount); if (amt <= 0) return; const label = incomeMode === 'salary' ? '월급' : incomeMode === 'bonus' ? '수익' : incomeMode === 'expense' ? '소비' : '고정비'; const eul = label === '소비' ? '를' : '을'; showConfirm(`₩${formatNum(amt)} ${label}${eul} 기록하시겠습니까?`, handleMoneyLogSubmit); }} className="bg-rose-500 text-white px-4 py-2 rounded-lg text-[11px] font-black shrink-0 shadow-sm hover:bg-rose-600 transition-colors">확인</button>
                    </div>
                    )}
                  </div>
                )}
              </div>

              {/* 모드별 기록 요약 — 연/월 아코디언 (소비는 flat, 월급/수익만 아코디언) */}
              {incomeMode && activeGroups.length > 0 && (() => {
                // 연-월별 그룹화
                const byYearMonth = {};
                activeGroups.forEach(({ date, entries }) => {
                  const parts = date.split('-');
                  const ym = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : date;
                  if (!byYearMonth[ym]) byYearMonth[ym] = [];
                  byYearMonth[ym].push({ date, entries });
                });
                const ymKeys = Object.keys(byYearMonth).sort((a, b) => b.localeCompare(a));

                const renderEntryCard = (r) => {
                  const cardId = r.id || r.timestamp;
                  const isCardOpen = moneyLogCardOpen === cardId;
                  return (
                    <div key={cardId} onClick={() => setMoneyLogCardOpen(isCardOpen ? null : cardId)} className={`relative ${activeColor.bg} border ${isCardOpen ? 'border-slate-300' : activeColor.border} rounded-xl p-2.5 flex flex-col gap-0.5 cursor-pointer select-none`}>
                      <span className={`text-[9px] font-black ${activeColor.label} truncate`}>{r.name || r.category || '기록'}</span>
                      <span className="text-[12px] font-black text-slate-800">₩{formatNum(r.amount)}</span>
                      {isCardOpen && (
                        <div className="absolute top-1 right-1 flex gap-0.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => {
                            showInputModal('금액 수정', '숫자만 입력하세요', String(r.amount), (val) => {
                              const parsed = Number(val.replace(/[^0-9]/g, ''));
                              if (!parsed) return;
                              const diff = parsed - r.amount;
                              setTradeLogs(prev => prev.map(l => l.id === r.id ? { ...l, amount: parsed } : l));
                              if (r.type === 'income') setGlobalCash(prev => prev + diff); else setGlobalCash(prev => prev - diff);
                              setMoneyLogCardOpen(null);
                              showToast('✅ 수정되었습니다.');
                            });
                          }} className="w-4 h-4 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-500 hover:text-blue-500 hover:border-blue-300 flex items-center justify-center shadow-sm transition-colors">✎</button>
                          <button onClick={() => showConfirm('이 기록을 삭제하시겠습니까?', () => {
                            setTradeLogs(prev => prev.filter(l => l.id !== r.id));
                            if (r.type === 'income') setGlobalCash(prev => prev - r.amount); else setGlobalCash(prev => prev + r.amount);
                            setMoneyLogCardOpen(null);
                            showToast('🗑️ 삭제되었습니다.');
                          })} className="w-4 h-4 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-500 hover:text-rose-500 hover:border-rose-300 flex items-center justify-center shadow-sm transition-colors">✕</button>
                        </div>
                      )}
                    </div>
                  );
                };

                // 월급/수익 전용 렌더러 — 날짜 소제목 + 카드 그리드
                const renderMonthContent = (ym) => byYearMonth[ym].map(({ date, entries }) => {
                  const parts = date.split('-');
                  const dayLabel = parts.length === 3 ? `${Number(parts[1])}월 ${Number(parts[2])}일` : date;
                  const dayTotal = entries.reduce((s, r) => s + r.amount, 0);
                  return (
                    <div key={date} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500">{dayLabel}</span>
                        <span className={`text-[10px] font-black ${activeColor.total}`}>{activeColor.totalPrefix}₩{formatNum(dayTotal)}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                        {entries.map(r => renderEntryCard(r))}
                      </div>
                    </div>
                  );
                });

                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                    <h3 className="text-xs font-black text-slate-700 mb-3">{activeTitle}</h3>
                    <div className="flex flex-col gap-1">
                      {ymKeys.map(ym => {
                        const isOpen = !!moneyLogExpanded[ym];
                        const [ymYear, ymMonth] = ym.split('-');
                        const ymTotal = byYearMonth[ym].reduce((s, { entries }) => s + entries.reduce((ss, r) => ss + r.amount, 0), 0);
                        return (
                          <div key={ym} className="border border-slate-100 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setMoneyLogExpanded(prev => ({ ...prev, [ym]: !prev[ym] }))}
                              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-slate-400">{ymYear}년</span>
                                <span className="text-[11px] font-black text-slate-700">{Number(ymMonth)}월</span>
                                {ym === currentYM && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">이번달</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black ${activeColor.total}`}>{activeColor.totalPrefix}₩{formatNum(ymTotal)}</span>
                                <span className="text-slate-400 text-[10px]">{isOpen ? '▲' : '▼'}</span>
                              </div>
                            </button>
                            {isOpen && (() => {
                              if (incomeMode !== 'expense') {
                                return (
                                  <div className="px-3 py-2.5 flex flex-col gap-3">
                                    {renderMonthContent(ym)}
                                  </div>
                                );
                              }
                              // 소비: 날짜 카드 그리드 + 선택된 날짜 상세 목록을 그리드 아래 표시
                              const openDate = byYearMonth[ym].find(({ date }) => !!moneyLogExpanded[date]);
                              return (
                                <div className="px-3 py-2.5 flex flex-col gap-2">
                                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                                    {byYearMonth[ym].map(({ date, entries }) => {
                                      const parts = date.split('-');
                                      const dayLabel = parts.length === 3 ? `${Number(parts[2])}일` : date;
                                      const monthLabel = parts.length === 3 ? `${Number(parts[1])}월` : '';
                                      const dayTotal = entries.reduce((s, r) => s + r.amount, 0);
                                      const isDayOpen = !!moneyLogExpanded[date];
                                      return (
                                        <button
                                          key={date}
                                          onClick={() => setMoneyLogExpanded(prev => {
                                            const next = { ...prev };
                                            byYearMonth[ym].forEach(({ date: d }) => { if (d !== date) delete next[d]; });
                                            next[date] = !prev[date];
                                            return next;
                                          })}
                                          className={`flex flex-col items-start p-2.5 rounded-xl border transition-colors text-left ${isDayOpen ? 'bg-emerald-100 border-emerald-300' : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100/70'}`}
                                        >
                                          <span className="text-[9px] font-black text-emerald-500 truncate w-full">{monthLabel} {dayLabel}</span>
                                          <span className="text-[12px] font-black text-slate-800">₩{formatNum(dayTotal)}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {/* 선택된 날짜 상세 카드 그리드 */}
                                  {openDate && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 mt-1 border-t border-slate-100 pt-2">
                                      {openDate.entries.map(r => {
                                        const cardId = r.id || r.timestamp;
                                        const isCardOpen = moneyLogCardOpen === cardId;
                                        return (
                                          <div key={cardId} onClick={() => setMoneyLogCardOpen(isCardOpen ? null : cardId)} className={`relative bg-slate-50 border ${isCardOpen ? 'border-slate-300' : 'border-slate-200'} rounded-xl p-2.5 flex flex-col gap-0.5 cursor-pointer select-none`}>
                                            <span className="text-[9px] font-black text-slate-500 truncate">{r.name || r.category || '소비'}</span>
                                            <span className="text-[12px] font-black text-slate-800">₩{formatNum(r.amount)}</span>
                                            {isCardOpen && (
                                              <div className="absolute top-1 right-1 flex gap-0.5" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => {
                                                  showInputModal('금액 수정', '숫자만 입력하세요', String(r.amount), (val) => {
                                                    const parsed = Number(val.replace(/[^0-9]/g, ''));
                                                    if (!parsed) return;
                                                    const diff = parsed - r.amount;
                                                    setTradeLogs(prev => prev.map(l => l.id === r.id ? { ...l, amount: parsed } : l));
                                                    setGlobalCash(prev => prev - diff);
                                                    setMoneyLogCardOpen(null);
                                                    showToast('✅ 수정되었습니다.');
                                                  });
                                                }} className="w-4 h-4 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-500 hover:text-blue-500 hover:border-blue-300 flex items-center justify-center shadow-sm transition-colors">✎</button>
                                                <button onClick={() => showConfirm('이 기록을 삭제하시겠습니까?', () => {
                                                  saveStateToHistory();
                                                  setTradeLogs(prev => prev.filter(l => {
                                                    if (l.id === r.id) return false;
                                                    // N빵 결제자 로그면 같은 날짜+totalAmount+name 대상자 로그도 삭제
                                                    if (r.nbbangCount > 1 && l.isNbbang && l.date === r.date &&
                                                        String(l.totalAmount) === String(r.totalAmount) &&
                                                        (l.name || '').trim() === (r.name || '').trim()) return false;
                                                    return true;
                                                  }));
                                                  setGlobalCash(prev => prev + r.amount);
                                                  setMoneyLogCardOpen(null);
                                                  showToast('🗑️ 삭제되었습니다.');
                                                })} className="w-4 h-4 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-500 hover:text-rose-500 hover:border-rose-300 flex items-center justify-center shadow-sm transition-colors">✕</button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </section>
          );
        })()}
      </main>

      {/* --- Modals (High Z-Index) --- */}

      {/* 💰 자산 잔액 수정 모달 */}
      {isBalanceEditOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsBalanceEditOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5"><CircleDollarSign size={15} className={t.text}/> 자산 잔액 수정</h3>
              <button onClick={() => setIsBalanceEditOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-3">
              {/* 주식 계좌별 주문가능 금액 */}
              {(() => {
                const stockAccs = accounts.filter(a => a.type === 'stock');
                if (stockAccs.length === 0) return null;
                return (
                  <div>
                    <p className="text-[9px] font-black text-slate-400 mb-1.5">📈 주식 주문가능 금액</p>
                    <div className="flex flex-col gap-1.5">
                      {stockAccs.map(a => {
                        const key = `acc:${a.id}`;
                        const val = balanceEditDraft[key] !== undefined ? balanceEditDraft[key] : String(toPureNumber(a.cash));
                        return (
                          <div key={a.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                            <span className="text-[11px] font-black text-slate-600 truncate flex-1 min-w-0">{a.name}</span>
                            <span className="text-[11px] font-black text-slate-400 shrink-0">₩</span>
                            <input type="text" className="w-28 text-[12px] font-black text-slate-800 bg-transparent outline-none text-right shrink-0"
                              value={toCommaString(val)}
                              onChange={e => setBalanceEditDraft(d => ({ ...d, [key]: e.target.value.replace(/[^0-9]/g, '') }))} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* 저축계좌 잔액 */}
              {(() => {
                const savingsItems = stocks.filter(s => accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'savings');
                if (savingsItems.length === 0) return null;
                return (
                  <div>
                    <p className="text-[9px] font-black text-slate-400 mb-1.5">🏦 저축계좌 잔액</p>
                    <div className="flex flex-col gap-1.5">
                      {savingsItems.map(s => (
                        <div key={s.id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                          <span className="text-[11px] font-black text-emerald-700 truncate flex-1 min-w-0">{s.name}</span>
                          <span className="text-[11px] font-black text-slate-500 shrink-0">₩</span>
                          <input type="text" className="w-28 text-[12px] font-black text-slate-800 bg-transparent outline-none text-right shrink-0"
                            value={toCommaString(balanceEditDraft[s.id] !== undefined ? balanceEditDraft[s.id] : String(toPureNumber(s.quantity)))}
                            onChange={e => setBalanceEditDraft(d => ({ ...d, [s.id]: e.target.value.replace(/[^0-9]/g, '') }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* 소비계좌 잔액 */}
              {(() => {
                const spendingItems = stocks.filter(s => accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'spending');
                if (spendingItems.length === 0) return null;
                return (
                  <div>
                    <p className="text-[9px] font-black text-slate-400 mb-1.5">🛍️ 소비계좌 잔액</p>
                    <div className="flex flex-col gap-1.5">
                      {spendingItems.map(s => (
                        <div key={s.id} className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                          <span className="text-[11px] font-black text-rose-700 truncate flex-1 min-w-0">{s.name}</span>
                          <span className="text-[11px] font-black text-slate-500 shrink-0">₩</span>
                          <input type="text" className="w-28 text-[12px] font-black text-slate-800 bg-transparent outline-none text-right shrink-0"
                            value={toCommaString(balanceEditDraft[s.id] !== undefined ? balanceEditDraft[s.id] : String(toPureNumber(s.quantity)))}
                            onChange={e => setBalanceEditDraft(d => ({ ...d, [s.id]: e.target.value.replace(/[^0-9]/g, '') }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="px-5 pb-5 pt-3 shrink-0">
              <button onClick={() => {
                saveStateToHistory();
                let updatedAccs = [...accounts];
                accounts.filter(a => a.type === 'stock').forEach(a => {
                  const key = `acc:${a.id}`;
                  if (balanceEditDraft[key] !== undefined) {
                    updatedAccs = updatedAccs.map(ac => ac.id === a.id ? { ...ac, cash: String(toPureNumber(balanceEditDraft[key])) } : ac);
                  }
                });
                setAccounts(updatedAccs);
                const updatedStocks = stocks.map(s => {
                  if (balanceEditDraft[s.id] !== undefined) {
                    return { ...s, quantity: String(toPureNumber(balanceEditDraft[s.id])) };
                  }
                  return s;
                });
                setStocks(updatedStocks);
                setIsBalanceEditOpen(false);
                showToast('✅ 잔액이 수정됐습니다.');
              }} className={`w-full ${t.main} py-2.5 rounded-xl font-black text-xs shadow-md transition-colors`}>저장하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 FIRE 조기 은퇴 대시보드 팝업 모달 */}
      {isFireModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999999] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setIsFireModalOpen(false)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 w-full max-w-sm md:max-w-md rounded-[2rem] p-6 shadow-[0_0_40px_rgba(244,63,94,0.3)] relative overflow-hidden flex flex-col border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsFireModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-20"><X size={16}/></button>
            
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Flame size={150} className="text-rose-500" />
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-black bg-gradient-to-r from-rose-500 to-orange-500 text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                  <Target size={12}/> FIRE 조기 은퇴 시뮬레이터
                </span>
              </div>

              <div className="mb-6 text-center mt-4">
                <p className="text-white/60 text-[11px] font-bold mb-1">나의 은퇴 목표 금액: ₩{formatNum(fireTarget || 1000000000)}</p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tighter drop-shadow-sm">
                    {(((globalStats.totalAssets + globalStats.totalLoanDebt) / (fireTarget || 1000000000)) * 100).toFixed(1)}%
                  </h2>
                  <span className="text-sm font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-md border border-white/5">달성 중</span>
                </div>
              </div>

              {/* 진행 바 */}
              <div className="bg-slate-950/50 h-4 rounded-full overflow-hidden shadow-inner border border-white/5 mb-6 relative">
                <div
                  className="bg-gradient-to-r from-orange-400 to-rose-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(244,63,94,0.6)] relative"
                  style={{ width: `${Math.min(100, ((globalStats.totalAssets + globalStats.totalLoanDebt) / (fireTarget || 1000000000)) * 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-white/50 mb-1 flex items-center gap-1"><TrendingUp size={10}/> 은퇴까지 남은 금액</p>
                  <p className="text-[13px] font-black text-white">₩{formatNum(Math.max(0, (fireTarget || 1000000000) - (globalStats.totalAssets + globalStats.totalLoanDebt)))}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-white/50 mb-1 flex items-center gap-1"><Clock size={10}/> 은퇴까지 남은 시간</p>
                  <p className="text-[13px] font-black text-white flex items-baseline gap-1">
                    {fireYearsCalc === Infinity
                      ? <span className="text-sm text-rose-400">계산 불가</span>
                      : <><span className="text-lg text-emerald-400">{fireYearsCalc === 0 ? '0' : fireYearsCalc}</span>년 뒤 은퇴</>
                    }
                  </p>
                </div>
              </div>

              {/* 수익률 정보 섹션 */}
              <div className="mt-3 p-3 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-1 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-0.5">
                  <button onClick={() => setShowFireReturnModal(true)} className="text-[9px] font-bold text-white/40 flex items-center gap-1 hover:text-emerald-400 transition-colors">
                    <TrendingUp size={9}/> 현재까지 수익률 반영 <span className="text-[8px]">ⓘ</span>
                  </button>
                  {fireCAGR !== null
                    ? <span className="text-[10px] font-black text-emerald-400">{fireCAGR > 0 ? '+' : ''}{fireCAGR}%</span>
                    : <span className="text-[9px] text-white/30">기록 부족</span>
                  }
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-white/60 flex items-center gap-1"><Flame size={10}/> 예상 연 수익률</label>
                  <div className="flex items-center bg-slate-900/50 rounded-lg border border-white/10 px-2 py-1.5 w-28 focus-within:border-emerald-400 transition-colors">
                    <input
                      type="text"
                      className="w-full bg-transparent text-white text-right text-[11px] font-black outline-none placeholder:text-white/30"
                      value={expectedReturn}
                      placeholder={fireCAGR !== null ? String(fireCAGR) : '5'}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setExpectedReturn(val);
                      }}
                    />
                    <span className="text-[9px] font-bold text-slate-400 ml-1">%</span>
                  </div>
                </div>
              </div>

              {/* FIRE 설정 컨트롤 패널 */}
              <div className="mt-3 p-3.5 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-2.5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-white/60 flex items-center gap-1"><Target size={10}/> 목표 금액</label>
                  <div className="flex items-center bg-slate-900/50 rounded-lg border border-white/10 px-2 py-1.5 w-36 focus-within:border-rose-400 transition-colors">
                    <span className="text-[9px] font-bold text-slate-400 mr-1">₩</span>
                    <input type="text" className="w-full bg-transparent text-white text-right text-[11px] font-black outline-none" value={toCommaString(fireTarget)} onChange={e => { const val = toPureNumber(e.target.value.replace(/[^0-9]/g, '')); setFireTarget(val); }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-white/60 flex items-center gap-1"><TrendingUp size={10}/> 월 저축액</label>
                  <div className="flex items-center bg-slate-900/50 rounded-lg border border-white/10 px-2 py-1.5 w-36 focus-within:border-orange-400 transition-colors">
                    <span className="text-[9px] font-bold text-slate-400 mr-1">₩</span>
                    <input type="text" className="w-full bg-transparent text-white text-right text-[11px] font-black outline-none" value={toCommaString(annualLimit)} onChange={e => { const val = toPureNumber(e.target.value.replace(/[^0-9]/g, '')); setAnnualLimit(val); }} />
                  </div>
                </div>
                {fireAnnualDiv > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-[9px] font-bold text-orange-300/70">💰 월 예상 배당</span>
                    <span className="text-[10px] font-black text-orange-300">+₩{formatNum(Math.round(fireAnnualDiv / 12))}</span>
                  </div>
                )}
                {fireAnnualDiv > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-white/50">= 월 총 현금흐름</span>
                    <span className="text-[10px] font-black text-white">₩{formatNum((annualLimit || 0) + Math.round(fireAnnualDiv / 12))}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsFireModalOpen(false)}
                className="mt-4 w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-black text-[11px] rounded-xl transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {showFireReturnModal && (() => {
        const capitalGain = globalStats.globalValue - globalStats.globalInvested;
        const principal = globalStats.globalInvested;
        const total = capitalGain + fireAnnualDiv;
        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[99999999] flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setShowFireReturnModal(false)}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 w-full max-w-xs shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowFireReturnModal(false)} className="absolute top-3 right-3 p-1 text-white/40 hover:text-white/80 transition-colors"><X size={14}/></button>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-emerald-400"/>
                <span className="text-sm font-black text-white">수익률 계산 방법</span>
              </div>
              <p className="text-[10px] text-white/40 mb-4">등록된 내 자산 기준으로 계산한 결과예요</p>

              {/* 항목별 실제 수치 */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                  <div>
                    <p className="text-[10px] font-bold text-white/80">📈 시세차익</p>
                    <p className="text-[9px] text-white/40 mt-0.5">현재 평가금액 − 총 투자 원금</p>
                  </div>
                  <span className={`text-[13px] font-black ${capitalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {capitalGain >= 0 ? '+' : ''}₩{formatNum(Math.round(capitalGain))}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                  <div>
                    <p className="text-[10px] font-bold text-white/80">💰 연간 예상 배당금</p>
                    <p className="text-[9px] text-white/40 mt-0.5">배당 탭에 입력된 종목 기준</p>
                  </div>
                  <span className="text-[13px] font-black text-sky-400">
                    +₩{formatNum(Math.round(fireAnnualDiv))}
                  </span>
                </div>
                <div className="h-px bg-white/10 mx-1"/>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 border border-emerald-500/20">
                  <div>
                    <p className="text-[10px] font-bold text-white/80">💼 총 투자 원금</p>
                    <p className="text-[9px] text-white/40 mt-0.5">평단가 × 보유 수량 합계</p>
                  </div>
                  <span className="text-[13px] font-black text-white/70">
                    ₩{formatNum(Math.round(principal))}
                  </span>
                </div>
              </div>

              {/* 계산 결과 */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-3 text-center">
                <p className="text-[9px] text-white/40 mb-1">
                  (시세차익 ₩{formatNum(Math.round(capitalGain))} + 배당 ₩{formatNum(Math.round(fireAnnualDiv))}) ÷ 원금 ₩{formatNum(Math.round(principal))}
                </p>
                <p className="text-[11px] font-bold text-white/60">= <span className="text-emerald-400 text-xl font-black">{fireCAGR !== null ? (fireCAGR > 0 ? '+' : '') + fireCAGR + '%' : '-'}</span></p>
              </div>

              <p className="text-[9px] text-white/30 mt-3 leading-relaxed text-center">
                * 연환산이 아닌 현재까지의 총 수익률이에요.<br/>실제 투자 기간·추가 납입에 따라 다를 수 있어요.
              </p>

              <button onClick={() => setShowFireReturnModal(false)} className="mt-4 w-full py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-[11px] font-bold hover:bg-emerald-500/30 transition-colors">
                확인
              </button>
            </div>
          </div>
        );
      })()}
      {tradeModal.isOpen && (() => {
        const ts = stocks.find(s => s.id === tradeModal.stockId);
        if (!ts) return null;
        const isBuy = tradeModal.mode === 'buy';
        const mult = ts.isUSD ? toPureNumber(exchangeRate) : 1;
        const effectivePrice = (toPureNumber(tradePrice) || toPureNumber(ts.currentPrice)) * mult;
        const tradeQty = toPureNumber(isBuy ? buyAmount : sellAmount);
        const totalCost = tradeQty * effectivePrice;
        const accCash = toPureNumber(accounts.find(a => a.id === ts.accountId)?.cash || 0);
        const maxBuyQty = effectivePrice > 0 ? Math.floor(accCash / effectivePrice) : 0;
        const closeModal = () => setTradeModal({ isOpen: false, mode: 'buy', stockId: null });
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-5 animate-in fade-in duration-200" onClick={closeModal}>
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">{ts.name}</p>
                  <p className="text-sm font-black text-slate-800">주식 거래</p>
                </div>
                <button onClick={closeModal} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
              </div>

              {/* 매수/매도 탭 */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4">
                <button onClick={() => { setTradeModal(m => ({ ...m, mode: 'buy' })); setBuyAmount(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${isBuy ? `${t.main} text-white shadow-md` : 'text-slate-400'}`}>
                  <TrendingUp size={11}/> 매수
                </button>
                <button onClick={() => { setTradeModal(m => ({ ...m, mode: 'sell' })); setSellAmount(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${!isBuy ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400'}`}>
                  <TrendingDown size={11}/> 매도
                </button>
              </div>

              {/* 단가 입력 */}
              <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">단가</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 focus-within:border-slate-400 transition-colors">
                  <span className="text-slate-400 font-bold text-xs mr-1">{ts.isUSD ? '$' : '₩'}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="flex-1 text-sm font-black outline-none text-slate-800 bg-transparent"
                    value={toCommaString(tradePrice)}
                    onChange={e => setTradePrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder={toCommaString(String(toPureNumber(ts.currentPrice)))}
                  />
                  <button onClick={() => setTradePrice(String(toPureNumber(ts.currentPrice)))}
                    className="text-[9px] font-bold text-slate-400 hover:text-slate-600 ml-1 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded-md">현재가</button>
                </div>
              </div>

              {/* 수량 입력 */}
              <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">수량</label>
                <div className={`flex items-center border rounded-xl px-3 py-2 transition-colors ${isBuy ? 'border-slate-200 focus-within:border-rose-300' : 'border-slate-200 focus-within:border-slate-400'}`}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="flex-1 text-xl font-black outline-none text-slate-800 bg-transparent"
                    placeholder="0"
                    value={isBuy ? toCommaString(buyAmount) : toCommaString(sellAmount)}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      isBuy ? setBuyAmount(raw) : setSellAmount(raw);
                    }}
                    autoFocus
                  />
                  <span className="text-slate-400 font-bold text-sm">주</span>
                </div>
                {/* 빠른 수량 + 가능수량/전체 */}
                <div className="flex gap-1 mt-1.5">
                  {[1, 5, 10, 50].map(n => (
                    <button key={n}
                      onClick={() => isBuy ? setBuyAmount(String(toPureNumber(buyAmount) + n)) : setSellAmount(String(toPureNumber(sellAmount) + n))}
                      className="flex-1 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-colors">
                      +{n}
                    </button>
                  ))}
                  {isBuy
                    ? <button onClick={() => setBuyAmount(String(maxBuyQty))}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-colors ${t.light} ${t.text}`}>
                        최대
                      </button>
                    : <button onClick={() => setSellAmount(String(toPureNumber(ts.quantity)))}
                        className="flex-1 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-colors">
                        전체
                      </button>
                  }
                </div>
              </div>

              {/* 예상 금액 */}
              <div className={`rounded-xl px-4 py-3 mb-4 flex items-center justify-between ${isBuy ? 'bg-rose-50' : 'bg-slate-50'}`}>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">{isBuy ? '예상 매수 금액' : '예상 매도 금액'}</p>
                  <p className={`text-base font-black ${isBuy ? t.text : 'text-slate-700'}`}>
                    {tradeQty > 0 ? `₩${formatNum(Math.round(totalCost))}` : '-'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold">{isBuy ? '계좌 잔고' : '보유 수량'}</p>
                  <p className={`text-xs font-black ${isBuy && accCash < totalCost && tradeQty > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                    {isBuy ? `₩${formatNum(Math.round(accCash))}` : `${formatNum(ts.quantity)}주`}
                  </p>
                </div>
              </div>

              {/* 확인 버튼 */}
              <button
                onClick={() => {
                  const fakeE = { stopPropagation: () => {} };
                  if (isBuy) { handleBuyStock(fakeE, ts.id, buyAmount); }
                  else { handleSellStock(fakeE, ts.id, sellAmount); }
                  closeModal();
                }}
                className={`w-full py-3 rounded-2xl text-sm font-black shadow-lg transition-colors flex items-center justify-center gap-1.5 ${isBuy ? `${t.main} text-white` : 'bg-slate-700 text-white hover:bg-slate-800'}`}
              >
                {isBuy ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
                {isBuy ? '매수하기' : '매도하기'}
              </button>
            </div>
          </div>
        );
      })()}
      {isGlobalSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsGlobalSettingsOpen(false)}>
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl relative flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setIsGlobalSettingsOpen(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={18}/></button>
            <h3 className="font-black text-base mb-5 flex items-center justify-center w-full gap-2 text-slate-800"><Settings size={16}/> 앱 설정</h3>
            <div className="space-y-5 flex-1">
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 text-center">앱 테마 색상</label>
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 place-items-center">
                  <button onClick={() => { setAppTheme('pink'); saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, 'pink', globalCash); }} className={`w-8 h-8 rounded-full bg-rose-400 shadow-inner ${appTheme === 'pink' ? 'ring-4 ring-rose-200 ring-offset-2' : 'opacity-80 hover:opacity-100'}`}></button>
                  <button onClick={() => { setAppTheme('blue'); saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, 'blue', globalCash); }} className={`w-8 h-8 rounded-full bg-blue-400 shadow-inner ${appTheme === 'blue' ? 'ring-4 ring-blue-200 ring-offset-2' : 'opacity-80 hover:opacity-100'}`}></button>
                  <button onClick={() => { setAppTheme('green'); saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, 'green', globalCash); }} className={`w-8 h-8 rounded-full bg-emerald-400 shadow-inner ${appTheme === 'green' ? 'ring-4 ring-emerald-200 ring-offset-2' : 'opacity-80 hover:opacity-100'}`}></button>
                  <button onClick={() => { setAppTheme('white'); saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, 'white', globalCash); }} className={`w-8 h-8 rounded-full bg-white shadow-inner border border-slate-200 ${appTheme === 'white' ? 'ring-4 ring-slate-200 ring-offset-2' : 'opacity-80 hover:opacity-100'}`}></button>
                  <button onClick={() => { setAppTheme('yellow'); saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, 'yellow', globalCash); }} className={`w-8 h-8 rounded-full bg-amber-400 shadow-inner ${appTheme === 'yellow' ? 'ring-4 ring-amber-200 ring-offset-2' : 'opacity-80 hover:opacity-100'}`}></button>
                  <button onClick={() => { setAppTheme('purple'); saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, 'purple', globalCash); }} className={`w-8 h-8 rounded-full bg-purple-400 shadow-inner ${appTheme === 'purple' ? 'ring-4 ring-purple-200 ring-offset-2' : 'opacity-80 hover:opacity-100'}`}></button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 text-center">화면 비율 조정 (Zoom)</label>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                  {[80, 90, 100, 110, 120].map(level => (
                    <button key={level} onClick={() => { setZoomLevel(level); saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash, level); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${zoomLevel === level ? t.main : 'text-slate-500 hover:bg-slate-200'}`}>{level}%</button>
                  ))}
                </div>
              </div>
            </div>
            {user && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <div className="bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-[9px] font-black text-slate-400">로그인 정보</span>
                    <span className="text-[11px] font-black text-slate-700 truncate">{user.email}</span>
                    {user.last_sign_in_at && (
                      <span className="text-[9px] font-bold text-slate-400">최근 접속: {new Date(user.last_sign_in_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                  <button onClick={() => { setAppNotifications(prev => prev.map(n => ({ ...n, read: true }))); setShowNotifModal(true); }} className="relative shrink-0 p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors">
                    <Bell size={16} className="text-slate-600"/>
                    {appNotifications.some(n => !n.read) && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                        {appNotifications.filter(n => !n.read).length > 9 ? '9+' : appNotifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>
                </div>
                <button type="button" onClick={handleLogoutAction} className="w-full py-2.5 bg-slate-50 text-slate-500 rounded-xl font-black text-xs shadow-sm border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100 hover:text-rose-500 transition-colors">
                  <LogOut size={14} /> 로그아웃
                </button>
              </div>
            )}
            <button onClick={() => setIsGlobalSettingsOpen(false)} className={`w-full ${t.main} mt-4 py-2.5 rounded-xl text-xs font-black shadow-md transition-colors shrink-0`}>확인</button>
          </div>
        </div>
      )}

      {showNotifModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1100000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowNotifModal(false)}>
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-slate-700"/>
                <h3 className="font-black text-sm text-slate-800">알림</h3>
              </div>
              <div className="flex items-center gap-2">
                {appNotifications.length > 0 && (
                  <button onClick={() => setAppNotifications([])} className="text-[9px] font-black text-slate-400 hover:text-rose-500 transition-colors">전체 삭제</button>
                )}
                <button onClick={() => setShowNotifModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
              {appNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell size={28} className="text-slate-200"/>
                  <p className="text-[11px] font-black text-slate-400">알림이 없습니다</p>
                  <p className="text-[9px] text-slate-300 font-bold">배당금 입금, 고정 지출 시 자동으로 알림이 생성됩니다</p>
                </div>
              ) : (
                appNotifications.map(n => (
                  <div key={n.id} className={`rounded-xl px-3 py-2.5 border flex items-start gap-2.5 ${n.type === 'income' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <span className="text-base shrink-0 mt-0.5">{n.type === 'income' ? '💰' : '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[9px] font-black ${n.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>{n.title}</span>
                        <span className="text-[8px] text-slate-400 font-bold shrink-0">{n.date}</span>
                      </div>
                      <p className="text-[11px] font-black text-slate-800 mt-0.5 truncate">{n.body}</p>
                      <p className={`text-[11px] font-black mt-0.5 ${n.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {n.type === 'income' ? '+' : '-'}₩{(n.amount||0).toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => setAppNotifications(prev => prev.filter(x => x.id !== n.id))} className="shrink-0 p-1 text-slate-300 hover:text-rose-400 transition-colors mt-0.5"><X size={11}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isEditAccountOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={e => { if (e.target === e.currentTarget) setIsEditAccountOpen(false); }}>
          <form onSubmit={handleEditAccountSubmit} className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
            <button type="button" onClick={() => setIsEditAccountOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            <h3 className="font-black text-sm mb-4 flex justify-center items-center gap-1.5 w-full"><Edit2 size={14}/> 계좌 이름 변경</h3>
            <input type="text" placeholder="새 계좌 이름" autoFocus className="w-full p-2.5 rounded-xl text-sm font-black mb-4 outline-none border focus:border-slate-400 text-center" value={editAccountName} onChange={e=>setEditAccountName(e.target.value)} required />
            <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black shadow-md hover:bg-slate-900 transition-colors">이름 저장하기</button>
          </form>
        </div>
      )}

      {isEditHeaderOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsEditHeaderOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setAppTitle(editTitle); setAppSubtitle(editSubtitle); setCharacterName(editCharacterName); setProfileImage(editProfileImage); setIsEditHeaderOpen(false); saveConfig(accounts, exchangeRate, editTitle, editSubtitle, editCharacterName, appTheme, globalCash); }} className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col relative animate-in zoom-in duration-200">
            <button type="button" onClick={() => setIsEditHeaderOpen(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={18}/></button>
            <h3 className="font-black text-base mb-5 flex items-center justify-center w-full gap-2 text-slate-800"><Heart size={16} className={t.text} fill="currentColor"/> 프로필 설정</h3>
            
            <div className="mb-3 flex items-center gap-3 overflow-x-auto py-2 px-2 -mx-2 custom-scrollbar">
              {PRESET_PROFILES.map(p => (<button key={p.id} type="button" onClick={() => setEditProfileImage(p.url)} className={`w-10 h-10 rounded-full shrink-0 transition-all ${editProfileImage === p.url ? `ring-2 ${t.border} ring-offset-2 scale-110` : 'opacity-60 hover:opacity-100'}`}><img src={p.url} className="w-full h-full object-cover rounded-full bg-slate-50"/></button>))}
              <button type="button" onClick={() => fileInputRef.current.click()} className="w-10 h-10 rounded-full shrink-0 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 hover:bg-slate-100"><Upload size={14} className="text-slate-400"/></button><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
            </div>
            
            <input type="text" placeholder="캐릭터명 (예: 경준)" className={`w-full bg-slate-50 p-2.5 text-sm rounded-xl font-bold mb-2 outline-none border focus:${t.border} text-center`} value={editCharacterName} onChange={e=>setEditCharacterName(e.target.value)} />
            <input type="text" placeholder="앱 이름" className={`w-full bg-slate-50 p-2.5 text-sm rounded-xl font-bold mb-2 outline-none border focus:${t.border} text-center`} value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
            <input type="text" placeholder="부제목" className={`w-full bg-slate-50 p-2.5 text-sm rounded-xl font-bold mb-4 outline-none border focus:${t.border} text-center`} value={editSubtitle} onChange={e=>setEditSubtitle(e.target.value)} />
            
            <div className="flex gap-2 mb-3">
            </div>

            {/* 자산 잔액 수정 버튼 */}
            <div className="flex flex-col gap-2 mb-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => {
                const draft = {};
                accounts.filter(a => a.type === 'stock').forEach(a => {
                  draft[`acc:${a.id}`] = String(toPureNumber(a.cash));
                });
                stocks.forEach(s => {
                  const acc = accounts.find(a => a.id === (s.accountId || 'default'));
                  if (acc?.type === 'savings' || acc?.type === 'spending') {
                    draft[s.id] = String(toPureNumber(s.quantity));
                  }
                });
                setBalanceEditDraft(draft);
                setIsBalanceEditOpen(true);
              }} className="w-full py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs shadow-sm border border-emerald-200 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors">
                <CircleDollarSign size={14} /> 자산 잔액 수정
              </button>
            </div>
            
            <button type="submit" className={`w-full ${t.main} py-2.5 rounded-xl font-black text-xs shadow-md transition-colors`}>설정 저장하기</button>
          </form>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-200 relative">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors z-50"><X size={14}/></button>
            <div className="flex items-center mb-3 pb-2 border-b border-slate-100 shrink-0">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5 pl-1"><Heart size={14} fill="currentColor" className={t.text} /> {editingStockId ? '항목 수정' : '새 항목 추가'}</h3>
            </div>
            <form onSubmit={handleEditStockSubmit} className="flex flex-col flex-1 overflow-hidden relative" onClick={e => { if ((showDivMonthPicker || showDivExPicker) && !e.target.closest('[data-picker]')) { setShowDivMonthPicker(false); setShowDivExPicker(false); setTimeout(() => { stockFormScrollRef.current?.scrollTo({ top: stockFormScrollRef.current.scrollHeight, behavior: 'smooth' }); }, 50); } }}>
              {/* 전체 모드에서 열었을 때 계좌 선택 바 */}
              {(() => {
                if (editingStockId || !modalOpenedFromAll) return null;
                const modalType = accounts.find(a => a.id === modalTargetAccId)?.type;
                const typeAccs = accounts.filter(a => a.type === modalType);
                if (typeAccs.length <= 1) return null;
                const typeColors = { stock: { active: t.main, border: t.border }, savings: { active: 'bg-emerald-500 text-white', border: 'border-emerald-400' }, spending: { active: 'bg-rose-500 text-white', border: 'border-rose-400' }, card: { active: 'bg-slate-700 text-white', border: 'border-slate-600' } };
                const tc = typeColors[modalType] || typeColors.stock;
                return (
                  <div className="mb-3 shrink-0">
                    <p className="text-[9px] font-black text-slate-400 mb-1.5 text-center">어느 계좌에 추가할까요?</p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {typeAccs.map(acc => (
                        <button key={acc.id} type="button"
                          onClick={() => setModalTargetAccId(acc.id)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${modalTargetAccId === acc.id ? tc.active + ' shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                          {acc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div ref={stockFormScrollRef} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5 pb-2">

                {isDropdownOpen && currentAccountStat?.type === 'stock' && (
                  <div className="fixed inset-0 z-[50]" onClick={() => setIsDropdownOpen(false)}></div>
                )}
                <div className="relative z-[55]">
                  {currentAccountStat?.type === 'stock' ? (
                    <div className="flex gap-1.5">
                      {/* 종목명 검색 (2/3) */}
                      <div className="relative flex-[2]">
                        <Search className="absolute right-2 top-2 text-slate-300" size={13}/>
                        <input type="text" placeholder="종목명 검색" className={`w-full bg-slate-50 py-2 pl-3 pr-7 rounded-xl outline-none border focus:${t.border} font-bold text-xs text-center`} value={searchQuery}
                          onChange={e => {
                            const q = e.target.value;
                            setSearchQuery(q);
                            setNewStock(p => ({...p, name: q}));
                            setIsDropdownOpen(true);
                            clearTimeout(searchTimerRef.current);
                            if (q.trim().length >= 1) {
                              searchTimerRef.current = setTimeout(async () => {
                                setIsSearching(true);
                                const items = await searchStocksViaEdgeFn(q.trim());
                                setSearchResults(items);
                                setIsSearching(false);
                              }, 400);
                            } else {
                              setSearchResults([]);
                            }
                          }}
                          onClick={() => setIsDropdownOpen(true)}
                          onFocus={() => setIsDropdownOpen(true)}
                        />
                      </div>
                      {/* 티커 직접 입력 (1/3) */}
                      <input type="text" placeholder="티커 입력" className={`flex-[1] bg-slate-50 py-2 px-2 rounded-xl outline-none border focus:${t.border} font-bold text-xs text-center`} value={tickerQuery}
                        onChange={e => {
                          const q = e.target.value.toUpperCase();
                          setTickerQuery(q);
                          clearTimeout(tickerTimerRef.current);
                          if (q.trim().length >= 1) {
                            tickerTimerRef.current = setTimeout(async () => {
                              setIsSearching(true);
                              const items = await searchStocksViaEdgeFn(q.trim());
                              if (items.length > 0) {
                                setSearchResults(items);
                                setIsDropdownOpen(true);
                              }
                              setIsSearching(false);
                            }, 400);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && tickerQuery.trim()) {
                            const matched = searchResults.find(r => r.ticker.toUpperCase() === tickerQuery.toUpperCase());
                            if (matched) {
                              setNewStock({...newStock, name: matched.name, ticker: matched.ticker, isUSD: matched.isUSD, currentPrice: '0', tickerSuffix: matched.suffix || ''});
                              setSearchQuery(matched.name);
                              setTickerQuery('');
                              setIsDropdownOpen(false);
                              setSearchResults([]);
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <input type="text" placeholder={currentAccountStat?.type === 'spending' ? "예: 네이버페이, 삼성월렛" : currentAccountStat?.type === 'card' ? "예: 국민카드, 신한카드" : "예: 정기예금, 파킹통장"} className={`w-full bg-slate-50 py-2 px-3 rounded-xl outline-none border focus:${t.border} font-bold text-xs text-center`} value={searchQuery}
                      onChange={e => { const q = e.target.value; setSearchQuery(q); setNewStock(p => ({...p, name: q})); }}
                    />
                  )}
                  {isDropdownOpen && currentAccountStat?.type === 'stock' && (
                    <div className="absolute z-[60] w-full mt-1 bg-white border rounded-xl shadow-xl max-h-[240px] overflow-hidden border-slate-200 text-left flex flex-col">
                      {/* 내장 DB 결과 */}
                      {(filteredSList.length > 0 || filteredEList.length > 0) && (
                        <div className="flex divide-x max-h-[120px] shrink-0">
                          <div className="w-1/2 p-2 overflow-y-auto custom-scrollbar bg-white">
                            <div className={`text-[9px] font-black ${t.text} mb-1 border-b ${t.border} pb-1 sticky top-0 bg-white whitespace-nowrap`}>📈 주식</div>
                            {filteredSList.map(db => (
                              <div key={db.id} onClick={async () => { const sym = db.isUSD ? db.ticker : `${db.ticker}${db.tickerSuffix || '.KS'}`; const res = await fetchMarketDataViaEdgeFn([sym]); const price = res[sym]?.price; setNewStock({...newStock, name: db.name, ticker: db.ticker, isUSD: db.isUSD, currentPrice: price ? String(price) : '0', tickerSuffix: db.tickerSuffix || '', manualPrice: false}); setSearchQuery(db.name); setTickerQuery(db.ticker); setIsDropdownOpen(false); setSearchResults([]); }} className={`p-1.5 hover:${t.light.split(' ')[0]} rounded-lg cursor-pointer flex flex-col gap-0.5`}>
                                <span className="font-bold text-[10px] truncate text-slate-800">{db.name}</span>
                                <span className="text-slate-400 text-[8px] font-black">{db.ticker}</span>
                              </div>
                            ))}
                          </div>
                          <div className="w-1/2 p-2 overflow-y-auto custom-scrollbar bg-slate-50">
                            <div className="text-[9px] font-black text-indigo-500 mb-1 border-b border-indigo-100 pb-1 sticky top-0 bg-slate-50 whitespace-nowrap">📊 ETF</div>
                            {filteredEList.map(db => (
                              <div key={db.id} onClick={async () => { const sym = db.isUSD ? db.ticker : `${db.ticker}${db.tickerSuffix || '.KS'}`; const res = await fetchMarketDataViaEdgeFn([sym]); const price = res[sym]?.price; setNewStock({...newStock, name: db.name, ticker: db.ticker, isUSD: db.isUSD, currentPrice: price ? String(price) : '0', tickerSuffix: db.tickerSuffix || '', manualPrice: false}); setSearchQuery(db.name); setTickerQuery(db.ticker); setIsDropdownOpen(false); setSearchResults([]); }} className="p-1.5 hover:bg-indigo-100 rounded-lg cursor-pointer flex flex-col gap-0.5">
                                <span className="font-bold text-[10px] truncate text-slate-800">{db.name}</span>
                                <span className="text-indigo-400 text-[8px] font-black">{db.ticker}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Yahoo 실시간 검색 결과 */}
                      {(isSearching || searchResults.length > 0) && (
                        <div className="border-t border-slate-100 overflow-y-auto custom-scrollbar max-h-[120px]">
                          <div className="px-2 pt-1.5 pb-0.5 text-[9px] font-black text-slate-400 sticky top-0 bg-white">🌐 실시간 검색</div>
                          {isSearching
                            ? <div className="text-center text-[9px] text-slate-400 py-2">검색 중...</div>
                            : searchResults.map((item, i) => (
                              <div key={i} onClick={async () => {
                                // suffix 정보를 ticker에 저장하지 않고 별도 필드로 보관
                                const sym = item.isUSD ? item.ticker : `${item.ticker}${item.suffix || '.KS'}`; const res = await fetchMarketDataViaEdgeFn([sym]); const price = res[sym]?.price;
                                setNewStock({...newStock, name: item.name, ticker: item.ticker, isUSD: item.isUSD, currentPrice: price ? String(price) : '0', tickerSuffix: item.suffix || '', manualPrice: false});
                                setSearchQuery(item.name);
                                setTickerQuery(item.ticker);
                                setIsDropdownOpen(false);
                                setSearchResults([]);
                              }} className="px-2 py-1.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 border-b border-slate-50 last:border-0">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-[10px] truncate text-slate-800">{item.name}</span>
                                  <span className="text-[8px] font-black text-slate-400">{item.ticker}{item.suffix} · {item.exchange}</span>
                                </div>
                                <span className={`shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded ${item.isETF ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{item.isETF ? 'ETF' : item.isUSD ? '미국' : '한국'}</span>
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              {currentAccountStat?.type === 'stock' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">현재가 <span className="text-slate-300 font-normal">(검색 안될 시 수동입력)</span></label><div className="relative flex items-center"><span className="absolute left-2.5 text-xs font-bold text-slate-400">{newStock.isUSD ? '$' : '₩'}</span><input type="text" className={`w-full bg-slate-50 py-2 pl-6 pr-2.5 rounded-xl font-bold text-xs outline-none focus:${t.border} border text-right`} value={toCommaString(newStock.currentPrice)} onChange={e => { handleFormattedChange('currentPrice', e.target.value); setNewStock(prev => ({...prev, manualPrice: e.target.value.replace(/,/g,'') !== ''})); }} placeholder="0" /></div></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">평단가</label><div className="relative flex items-center"><span className="absolute left-2.5 text-xs font-bold text-slate-400">{newStock.isUSD ? '$' : '₩'}</span><input type="text" className={`w-full bg-slate-50 py-2 pl-6 pr-2.5 rounded-xl font-bold text-xs outline-none focus:${t.border} border text-right`} value={toCommaString(newStock.buyPrice)} onChange={e => handleFormattedChange('buyPrice', e.target.value)} placeholder="0" required /></div></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">보유 수량</label><div className="relative flex items-center"><input type="text" className={`w-full bg-slate-50 py-2 pl-2.5 pr-6 rounded-xl font-bold text-xs outline-none focus:${t.border} border text-right`} value={toCommaString(newStock.quantity)} onChange={e => handleFormattedChange('quantity', e.target.value)} placeholder="0" required /><span className="absolute right-2.5 text-xs font-bold text-slate-400">주</span></div></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">목표 비중</label><div className="relative flex items-center"><input type="text" className={`w-full py-2 pl-2.5 pr-6 rounded-xl font-black text-xs outline-none border transition-colors text-right ${isRatioExceededModal ? 'bg-red-50 border-red-500 text-red-500' : `bg-slate-50 focus:${t.border}`}`} value={newStock.targetRatio} onChange={e => handleFormattedChange('targetRatio', e.target.value)} placeholder="자유입력" />{newStock.targetRatio && <span className="absolute right-2.5 text-xs font-bold text-slate-400">%</span>}</div></div>
                </div>
              ) : currentAccountStat?.type === 'spending' ? (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">현재금액</label><div className="relative flex items-center"><span className="absolute left-2.5 text-xs font-bold text-slate-400">₩</span><input type="text" className="w-full bg-slate-50 py-2 pl-6 pr-2.5 rounded-xl font-bold text-xs outline-none border focus:border-rose-300 text-right" value={toCommaString(newStock.quantity)} onChange={e => handleFormattedChange('quantity', e.target.value)} placeholder="0" /></div></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">혜택</label><div className="relative flex items-center"><input type="text" className="w-full bg-slate-50 py-2 pl-2.5 pr-6 rounded-xl font-bold text-xs outline-none border focus:border-rose-300 text-right" value={newStock.benefit} onChange={e => handleFormattedChange('benefit', e.target.value)} placeholder="0" /><span className="absolute right-2.5 text-xs font-bold text-slate-400">%</span></div></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 block text-center">출금 계좌 <span className="font-normal text-slate-300">(선택 안 하면 직접 충전)</span></label>
                    <select className="w-full bg-slate-50 py-2 px-2 rounded-xl font-bold text-xs outline-none border focus:border-rose-300 text-center" value={newStock.withdrawAccId || ''} onChange={e => setNewStock({...newStock, withdrawAccId: e.target.value})}>
                      <option value="">선택 안 함 (직접 충전)</option>
                      {stocks.filter(s => {
                        const acc = accounts.find(a => a.id === (s.accountId || 'default'));
                        return acc?.type === 'savings';
                      }).map(s => (
                        <option key={`wa-${s.id}`} value={`stock:${s.id}`}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : currentAccountStat?.type === 'card' ? (
                <>
                  <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 mb-2">
                    <button type="button" onClick={()=>setNewStock({...newStock, cardType:'체크'})} className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg transition-colors ${newStock.cardType !== '신용' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}>체크카드</button>
                    <button type="button" onClick={()=>setNewStock({...newStock, cardType:'신용'})} className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg transition-colors ${newStock.cardType === '신용' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}>신용카드</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 block text-center">실적금액</label>
                      <div className="relative flex items-center"><span className="absolute left-2.5 text-xs font-bold text-slate-400">₩</span><input type="text" className="w-full bg-slate-50 py-2 pl-6 pr-2.5 rounded-xl font-bold text-xs outline-none border focus:border-slate-400 text-right" value={toCommaString(newStock.performance)} onChange={e => handleFormattedChange('performance', e.target.value)} placeholder="0" /></div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 block text-center">출금 계좌</label>
                      <select className="w-full bg-slate-50 py-2 px-2 rounded-xl font-bold text-xs outline-none border focus:border-slate-400 text-center" value={newStock.cardLinkedAcc || ''} onChange={e => setNewStock({...newStock, cardLinkedAcc: e.target.value})}>
                        {newStock.cardType === '신용' && <option value="">연동 없음</option>}
                        {accounts.filter(a => a.type === 'savings').flatMap(a =>
                          stocks.filter(s => (s.accountId || 'default') === a.id).map(s => (
                            <option key={`cl-${s.id}`} value={`stock:${s.id}`}>{s.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 block text-center">결제일</label>
                      <select className="w-full bg-slate-50 py-2 px-2.5 rounded-xl font-bold text-xs outline-none border focus:border-slate-400 text-center" value={newStock.cardPayDay || ''} onChange={e=>setNewStock({...newStock, cardPayDay: e.target.value})}>
                        <option value="">선택</option>
                        {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={String(d)}>{d}일</option>)}
                        <option value="말일">말일</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 block text-center">기준일</label>
                      <select className="w-full bg-slate-50 py-2 px-2.5 rounded-xl font-bold text-xs outline-none border focus:border-slate-400 text-center" value={newStock.cardPeriod || ''} onChange={e=>setNewStock({...newStock, cardPeriod: e.target.value})}>
                        <option value="">선택</option>
                        {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={String(d)}>{d}일</option>)}
                        <option value="말일">말일</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">현재 금액 (원금)</label><div className="relative flex items-center"><span className="absolute left-2.5 text-xs font-bold text-slate-400">₩</span><input type="text" className="w-full bg-slate-50 py-2 pl-6 pr-2.5 rounded-xl font-bold text-xs outline-none border focus:border-emerald-300 text-right" value={toCommaString(newStock.quantity)} onChange={e => handleFormattedChange('quantity', e.target.value)} placeholder="0" /></div></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">만기일</label><input type="text" placeholder="YYYY-MM-DD" className="w-full bg-slate-50 py-2 px-2.5 rounded-xl font-bold text-xs outline-none border focus:border-emerald-300 text-center" value={newStock.maturityDate} onChange={e => { let val = e.target.value.replace(/[^0-9]/g, ''); if (val.length > 8) val = val.slice(0, 8); let f = val; if (val.length >= 5 && val.length <= 6) f = val.slice(0, 4) + '-' + val.slice(4); else if (val.length > 6) f = val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6); setNewStock({...newStock, maturityDate: f}); }} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 block text-center w-full">금리유형</label>
                      <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-emerald-100">
                        <button type="button" onClick={() => setNewStock({...newStock, interestType: '단리'})} className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg transition-colors ${newStock.interestType !== '복리' ? 'bg-emerald-400 text-white shadow-sm' : 'text-slate-400'}`}>단리</button>
                        <button type="button" onClick={() => setNewStock({...newStock, interestType: '복리'})} className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg transition-colors ${newStock.interestType === '복리' ? 'bg-emerald-400 text-white shadow-sm' : 'text-slate-400'}`}>복리</button>
                      </div>
                    </div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">금리</label><div className="relative flex items-center"><input type="text" className="w-full bg-slate-50 py-2 pl-2.5 pr-6 rounded-xl font-bold text-xs outline-none border focus:border-emerald-300 text-right" value={newStock.interestRate} onChange={e => handleFormattedChange('interestRate', e.target.value)} placeholder="0"/><span className="absolute right-2.5 text-xs font-bold text-slate-400">%</span></div></div>
                </div>
                </>
              )}
              {currentAccountStat?.type === 'stock' && (() => {
                const freq = newStock.divFreq || '월';
                const isMonthly = freq === '월';
                const maxPay = freq === '분기' ? 4 : freq === '반기' ? 2 : freq === '연' ? 1 : 0;
                const maxEx  = maxPay;
                const curPayMonths = newStock.divMonths || [];
                const curExMonths  = newStock.divExMonths || [];
                const dayOptions = [...Array.from({length:31},(_,i)=>String(i+1)), '말'];

                const MonthPickerDropdown = ({ label, selected, onToggle, max, isOpen, onOpen, onClose }) => {
                  const wrapRef = React.useRef(null);
                  return (
                  <div ref={wrapRef} className="relative flex-1">
                    <button type="button" onClick={() => { if (isOpen) { onClose(); } else { onOpen(); setTimeout(() => { wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 50); } }}
                      className="w-full bg-white border rounded-lg px-2 py-2 text-[10px] font-black outline-none text-center flex items-center justify-between gap-1 min-w-0">
                      <span className="truncate text-slate-700 flex-1 text-left">
                        {selected.length === 0 ? <span className="text-slate-400">월 선택</span> : selected.map(m=>`${m}월`).join(', ')}
                      </span>
                      <span className="text-slate-400 shrink-0 text-[8px]">▼</span>
                    </button>
                    {isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="p-1.5 max-h-[160px] overflow-y-auto custom-scrollbar grid grid-cols-3 gap-1">
                          {Array.from({length:12},(_,i)=>i+1).map(m => {
                            const sel = selected.includes(m);
                            const disabled = !sel && selected.length >= max;
                            return (
                              <button key={m} type="button" disabled={disabled}
                                onClick={() => onToggle(m)}
                                className={`py-1.5 rounded-lg text-[10px] font-black transition-colors ${sel ? `${t.main}` : disabled ? 'bg-slate-50 text-slate-300' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                                {m}월
                              </button>
                            );
                          })}
                        </div>
                        <div className="border-t border-slate-100 px-2 py-1.5 flex justify-between items-center bg-slate-50">
                          <span className="text-[9px] text-slate-400">{selected.length}/{max}개 선택</span>
                          <button type="button" onClick={onClose} className="text-[9px] font-black text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">완료</button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                };

                return (
                  <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-100">
                    <div ref={divPickerSectionRef} className="bg-slate-50 border border-slate-200 p-3 rounded-xl mb-1.5" onClick={e => { if(!e.target.closest('[data-picker]')) { setShowDivMonthPicker(false); setShowDivExPicker(false); }}} >
                      <label className="text-[9px] font-black text-slate-500 block mb-2 text-center">배당금 / 지급 주기 설정</label>

                      {/* 1행: 주당 배당금 + 주기 */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="relative flex items-center flex-1">
                          <span className="absolute left-2.5 text-[10px] font-bold text-slate-400">{newStock.isUSD ? '$' : '₩'}</span>
                          <input type="text" className={`w-full bg-white border rounded-lg py-2 pl-6 pr-2 font-black text-[10px] outline-none focus:${t.border} text-right`} value={toCommaString(newStock.divPerShare)} onChange={e => handleFormattedChange('divPerShare', e.target.value)} placeholder="주당 배당금"/>
                        </div>
                        <select className="w-[84px] bg-white border rounded-lg p-2 text-[10px] font-black outline-none text-center shrink-0"
                          value={freq}
                          onChange={e => { setNewStock(p => ({ ...p, divFreq: e.target.value, divMonths: [], divExMonths: [] })); setShowDivMonthPicker(false); setShowDivExPicker(false); }}>
                          <option value="월">월배당</option><option value="분기">분기배당</option><option value="반기">반기배당</option><option value="연">연배당</option>
                        </select>
                      </div>

                      {/* 2행: 배당 기준일 + 지급일 한 줄 */}
                      <div className="grid grid-cols-2 gap-1.5" data-picker>
                        {/* 기준일 */}
                        <div>
                          <p className="text-[8px] font-black text-slate-400 mb-1">📋 기준일 <span className="font-normal text-slate-300">(보유 확인일)</span></p>
                          <div className="flex items-center gap-1">
                            {!isMonthly && (
                              <MonthPickerDropdown
                                label="기준 월"
                                selected={curExMonths}
                                onToggle={m => {
                                  const s = curExMonths.includes(m) ? curExMonths.filter(x=>x!==m) : [...curExMonths,m].sort((a,b)=>a-b);
                                  // 지급 월이 비어있으면 동기화
                                  const paySync = curPayMonths.length === 0 ? s : curPayMonths;
                                  setNewStock(p=>({...p, divExMonths: s, divMonths: paySync}));
                                }}
                                max={maxEx}
                                isOpen={showDivExPicker}
                                onOpen={() => { setShowDivExPicker(true); setShowDivMonthPicker(false); }}
                                onClose={() => { setShowDivExPicker(false); setTimeout(() => { stockFormScrollRef.current?.scrollTo({ top: stockFormScrollRef.current.scrollHeight, behavior: 'smooth' }); }, 50); }}
                              />
                            )}
                            <select className={`bg-white border rounded-lg p-1.5 text-[10px] font-black outline-none text-center ${isMonthly ? 'w-full' : 'w-[60px] shrink-0'}`}
                              value={newStock.divExDay || '1'} onChange={e => setNewStock(p=>({...p, divExDay: e.target.value}))}>
                              {dayOptions.map(d => <option key={d} value={d}>{d === '말' ? '말일' : `${d}일`}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* 지급일 */}
                        <div>
                          <p className="text-[8px] font-black text-slate-400 mb-1">📅 지급일</p>
                          <div className="flex items-center gap-1">
                            {!isMonthly && (
                              <MonthPickerDropdown
                                label="지급 월"
                                selected={curPayMonths}
                                onToggle={m => {
                                  const s = curPayMonths.includes(m) ? curPayMonths.filter(x=>x!==m) : [...curPayMonths,m].sort((a,b)=>a-b);
                                  // 기준 월이 비어있으면 동기화
                                  const exSync = curExMonths.length === 0 ? s : curExMonths;
                                  setNewStock(p=>({...p, divMonths: s, divExMonths: exSync}));
                                }}
                                max={maxPay}
                                isOpen={showDivMonthPicker}
                                onOpen={() => { setShowDivMonthPicker(true); setShowDivExPicker(false); }}
                                onClose={() => { setShowDivMonthPicker(false); setTimeout(() => { stockFormScrollRef.current?.scrollTo({ top: stockFormScrollRef.current.scrollHeight, behavior: 'smooth' }); }, 50); }}
                              />
                            )}
                            <select className={`bg-white border rounded-lg p-1.5 text-[10px] font-black outline-none text-center ${isMonthly ? 'w-full' : 'w-[60px] shrink-0'}`}
                              value={newStock.divDay || '15'} onChange={e => setNewStock(p=>({...p, divDay: e.target.value}))}>
                              {dayOptions.map(d => <option key={d} value={d}>{d === '말' ? '말일' : `${d}일`}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>
              <div className="pt-3 shrink-0 flex flex-col gap-1.5">
                {isRatioExceededModal && <div className="text-[9px] text-red-500 font-bold bg-red-50 border border-red-100 p-2 rounded-lg text-center">⚠️ 목표 비중 총합이 100%를 초과할 수 없습니다. ({currentModalTotalRatio}%)</div>}
                {isDuplicateStock && <div className="text-[9px] text-red-500 font-bold bg-red-50 border border-red-100 p-2 rounded-lg text-center">⚠️ 이미 동일한 이름의 종목이 존재합니다.</div>}
                <button type="submit" disabled={isRatioExceededModal || isDuplicateStock} className={`w-full py-2.5 rounded-xl font-black text-xs text-white shadow-md transition-colors ${(isRatioExceededModal || isDuplicateStock) ? 'bg-slate-300 cursor-not-allowed' : t.main}`}>{currentAccountStat?.type === 'spending' ? '항목 저장하기' : '포트폴리오에 반영하기'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
{isCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => { if(e.target === e.currentTarget) setIsCardModalOpen(false); }}>
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
            <button type="button" onClick={() => setIsCardModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            <h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center items-center gap-1.5 w-full"><CreditCard size={14}/> 내 카드 등록</h3>
            <div className="flex flex-col gap-2 mb-4">
               {myCards.length === 0 ? (
                 <div className="text-[10px] text-slate-400 text-center py-4 font-bold bg-slate-50 rounded-xl">등록된 카드가 없습니다.<br/>카드를 등록하면 지출 시 선택할 수 있습니다.</div>
               ) : (
                 myCards.map(c => (
                   <div key={c.id} className="flex justify-between items-center bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                     <span className="text-[11px] font-black text-blue-800">{c.name}</span>
                     <button onClick={() => setMyCards(myCards.filter(card => card.id !== c.id))} className="text-slate-400 hover:text-rose-500"><X size={12}/></button>
                   </div>
                 ))
               )}
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              <input type="text" placeholder="카드 이름 (예: 신한 RPM)" className="w-full p-2.5 rounded-xl text-[10px] font-black outline-none border focus:border-blue-400 bg-slate-50" value={newCardName} onChange={e=>setNewCardName(e.target.value)} />
              
              <div className="flex gap-1.5">
                <select className="p-2.5 rounded-xl text-[10px] font-black outline-none border focus:border-blue-400 bg-slate-50" value={newCardType} onChange={e=>setNewCardType(e.target.value)}>
                  <option value="신용">신용</option><option value="체크">체크</option>
                </select>
                <div className="flex-1 flex gap-1.5">
                  <input type="text" placeholder="실적 기준액 (예: 300,000)" className="w-full p-2.5 rounded-xl text-[10px] font-black outline-none border focus:border-blue-400 bg-slate-50 text-right" value={toCommaString(newCardTarget)} onChange={e=>setNewCardTarget(e.target.value.replace(/[^0-9]/g, ''))} />
                  <span className="text-[10px] font-black text-slate-500 flex items-center pr-1 whitespace-nowrap">원</span>
                </div>
              </div>

              {(newCardType === '체크' || newCardType === '신용') && (
                <select className="w-full p-2.5 rounded-xl text-[10px] font-black outline-none border focus:border-blue-400 bg-slate-50 text-center" value={newCardLinkedAcc} onChange={e=>setNewCardLinkedAcc(e.target.value)}>
                  {newCardType === '신용' && <option value="">연동 없음 (나중에 결제)</option>}
                  {accounts.filter(a => a.type === 'savings').flatMap(a =>
                    stocks.filter(s => (s.accountId || 'default') === a.id).map(s => (
                      <option key={`stock-${s.id}`} value={`stock:${s.id}`}>{s.name} (출금)</option>
                    ))
                  )}
                </select>
              )}

              <div className="flex gap-1.5 mt-1.5">
                <select className="w-full p-2.5 rounded-xl text-[10px] font-black outline-none border focus:border-blue-400 bg-slate-50 text-center text-slate-700" value={newCardPeriod} onChange={e=>setNewCardPeriod(e.target.value)}>
                  <option value="">기준일 (예: 매월 말일)</option>
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={`p${d}`} value={String(d)}>매월 {d}일 기준</option>)}
                  <option value="말일">매월 말일 기준</option>
                </select>
                <select className="w-full p-2.5 rounded-xl text-[10px] font-black outline-none border focus:border-blue-400 bg-slate-50 text-center text-slate-700" value={newCardPayDay} onChange={e=>setNewCardPayDay(e.target.value)}>
                  <option value="">결제일 (예: 매월 14일)</option>
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={`d${d}`} value={String(d)}>매월 {d}일</option>)}
                  <option value="말일">매월 말일</option>
                </select>
              </div>
            </div>
            <button onClick={() => { 
              if(!newCardName) return; 
              setMyCards([...myCards, {id: Date.now(), name: newCardName, target: toPureNumber(newCardTarget), period: newCardPeriod, payDay: newCardPayDay, type: newCardType, linkedAcc: newCardLinkedAcc}]); 
              setNewCardName(''); setNewCardTarget(''); setNewCardPeriod(''); setNewCardPayDay('');
            }} className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black shadow-md hover:bg-slate-900 transition-colors">새 카드 추가</button>
          </div>
        </div>
      )}
      {isAddAccountOpen && (() => {
        const typeInfo = { stock: { label: typeCustom.stock?.name||'주식', emoji: typeCustom.stock?.emoji||'📈', btn:t.main }, savings: { label: typeCustom.savings?.name||'저축', emoji: typeCustom.savings?.emoji||'🏦', btn:'bg-emerald-500 hover:bg-emerald-600' }, spending: { label: typeCustom.spending?.name||'소비', emoji: typeCustom.spending?.emoji||'🛍️', btn:'bg-rose-500 hover:bg-rose-600' }, card: { label: typeCustom.card?.name||'카드', emoji: typeCustom.card?.emoji||'💳', btn:'bg-slate-700 hover:bg-slate-800' }, loan: { label: typeCustom.loan?.name||'대출', emoji: typeCustom.loan?.emoji||'💸', btn:'bg-orange-500 hover:bg-orange-600' } };
        const typeActiveBtns = { stock: t.main, savings: 'bg-emerald-500 text-white shadow-sm', spending: 'bg-rose-500 text-white shadow-sm', card: 'bg-slate-700 text-white shadow-sm', loan: 'bg-orange-500 text-white shadow-sm' };
        const info = typeInfo[newAccountType] || typeInfo.stock;
        const isAccountMode = addAccountMode === 'account';
        const placeholder = newAccountType === 'card' ? '카드 별칭 (예: 신한카드)' : newAccountType === 'loan' ? '대출명 (예: 전세대출)' : '계좌 별칭 (예: 생활비 통장)';
        const handleSave = () => {
          const name = newAccountName.trim();
          if (!name) return showToast('⚠️ 이름을 입력해주세요.');
          saveStateToHistory();
          const newAcc = newAccountType === 'loan'
            ? { id: 'acc_' + Date.now(), name, cash: "0", type: 'loan', loanAmount: 0, loanRate: '', loanPayDay: '', loanPeriod: '', linkedAccId: '' }
            : { id: 'acc_' + Date.now(), name, cash: "0", type: newAccountType, label: '입출금 통장' };
          const updated = [...accounts, newAcc];
          setAccounts(updated); setSelectedAccountId(newAcc.id);
          setIsAddAccountOpen(false); setNewAccountName('');
          setPortfolioTypeTab(newAccountType);
          saveConfig(updated, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
          showToast('✅ 추가됐습니다.');
        };
        return (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={e => { if (e.target === e.currentTarget) setIsAddAccountOpen(false); }}>
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
            <button type="button" onClick={() => setIsAddAccountOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            {isAccountMode ? (
              /* 계좌 추가 모드: 타입 고정, 이름만 입력 */
              <>
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  <span className="text-base">{info.emoji}</span>
                  <h3 className="font-black text-sm text-slate-800">{info.label} 추가</h3>
                </div>
                <input type="text" placeholder={placeholder} autoFocus className={`w-full p-2.5 rounded-xl text-sm font-bold outline-none border mb-3 focus:border-slate-400 text-center`} value={newAccountName} onChange={e=>setNewAccountName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') handleSave(); }} />
                <button type="button" onClick={handleSave} className={`w-full text-white py-2.5 rounded-xl text-xs font-black transition-colors shadow-md ${info.btn}`}>추가하기</button>
              </>
            ) : (
              /* 신규 타입 추가 모드: 타입 선택 + 이름 입력 */
              <>
                <h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center w-full">➕ 자산 유형 추가</h3>
                <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-xl">
                  {['stock','savings','spending','card','loan'].map(type => {
                    const alreadyHas = accounts.some(a => a.type === type);
                    const ti = typeInfo[type];
                    return (
                      <button key={type} type="button" disabled={alreadyHas} onClick={()=>{ if(!alreadyHas){ setNewAccountType(type); setNewAccountName(''); } }} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${newAccountType === type ? typeActiveBtns[type] : alreadyHas ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600'}`}>{ti.emoji}<br/>{ti.label}</button>
                    );
                  })}
                </div>
                <input type="text" placeholder={placeholder} autoFocus className={`w-full p-2.5 rounded-xl text-sm font-bold outline-none border mb-3 focus:border-slate-300 text-center`} value={newAccountName} onChange={e=>setNewAccountName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') handleSave(); }} />
                <button type="button" onClick={handleSave} className={`w-full text-white py-2.5 rounded-xl text-xs font-black transition-colors shadow-md ${info.btn}`}>{newAccountType === 'loan' ? '대출 추가하기' : '계좌 추가하기'}</button>
              </>
            )}
          </div>
        </div>
        );
      })()}

      {/* 타입 메뉴 수정 모달 (이름 + 이모지) */}
      {editTypeModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={e => { if (e.target === e.currentTarget) setEditTypeModal(m => ({ ...m, isOpen: false })); }}>
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
            <button type="button" onClick={() => setEditTypeModal(m => ({ ...m, isOpen: false }))} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            <h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center items-center gap-1.5"><Edit2 size={14}/> 메뉴 수정</h3>
            <div className="flex gap-2 mb-3">
              <div className="w-14 shrink-0">
                <label className="text-[10px] font-black text-slate-400 block mb-1 text-center">이모지</label>
                <input type="text" className="w-full p-2 rounded-xl border text-center text-lg outline-none focus:border-slate-400" value={editTypeModal.emoji} onChange={e => setEditTypeModal(m => ({ ...m, emoji: e.target.value }))} maxLength={2} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 block mb-1">메뉴 이름</label>
                <input type="text" autoFocus className="w-full p-2 rounded-xl border text-sm font-bold outline-none focus:border-slate-400" value={editTypeModal.name} onChange={e => setEditTypeModal(m => ({ ...m, name: e.target.value }))} placeholder="메뉴 이름" onKeyDown={e => { if (e.key === 'Enter') { const updated = { ...typeCustom, [editTypeModal.type]: { name: editTypeModal.name || undefined, emoji: editTypeModal.emoji || undefined } }; saveTypeCustom(updated); setEditTypeModal(m => ({ ...m, isOpen: false })); showToast('✅ 수정됐습니다.'); }}} />
              </div>
            </div>
            <button type="button" onClick={() => { const updated = { ...typeCustom, [editTypeModal.type]: { name: editTypeModal.name || undefined, emoji: editTypeModal.emoji || undefined } }; saveTypeCustom(updated); setEditTypeModal(m => ({ ...m, isOpen: false })); showToast('✅ 수정됐습니다.'); }} className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black shadow-md">저장하기</button>
          </div>
        </div>
      )}

      {isEditLabelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={e => { if (e.target === e.currentTarget) setIsEditLabelModalOpen(false); }}>
          <form onSubmit={handleEditLabelSubmit} className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative"><button type="button" onClick={() => setIsEditLabelModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button><h3 className="font-black text-sm mb-4 flex justify-center w-full items-center gap-1.5"><Edit2 size={14}/> 통장 명칭 변경</h3><input type="text" placeholder="새로운 통장 이름" autoFocus className="w-full p-2.5 rounded-xl text-sm font-black mb-4 outline-none border focus:border-slate-400 text-center" value={editLabelInput} onChange={e=>setEditLabelInput(e.target.value)} required /><button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black shadow-md">이름 저장하기</button></form>
        </div>
      )}

      {/* 저축 거래 모달 (저축/출금) */}
      {savingsTradeModal.isOpen && (() => {
        const ss = stocks.find(s => s.id === savingsTradeModal.stockId);
        if (!ss) return null;
        const isDeposit = savingsTradeModal.mode === 'deposit';
        const balance = toPureNumber(ss.quantity);
        // 저축계좌 항목들 (본 항목 제외, 카드 제외)
        const savingsItems = stocks.filter(s =>
          s.id !== ss.id &&
          accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'savings' &&
          !s.isCard
        ).map(s => ({ id: `stock:${s.id}`, name: s.name, sub: `₩${formatNum(toPureNumber(s.quantity))}`, emoji: '🏦' }));
        // 소비계좌 항목들 (카드 제외)
        const spendingItems = stocks.filter(s =>
          accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'spending' &&
          !s.isCard
        ).map(s => ({ id: `stock:${s.id}`, name: s.name, sub: `₩${formatNum(toPureNumber(s.quantity))}`, emoji: '💳' }));
        // 주식계좌들 (계좌 단위, 주문가능금액 = 계좌 cash)
        const stockItems = accounts.filter(a => a.type === 'stock').map(a => ({
          id: `acc:${a.id}`,
          name: a.name,
          sub: `₩${formatNum(toPureNumber(a.cash))}`,
          emoji: '📈',
        }));
        const depositSources = [...savingsItems, ...spendingItems, ...stockItems];
        const allWithdrawDests = [...savingsItems, ...spendingItems, ...stockItems];
        const amt = toPureNumber(savingsTradeModal.amount);
        const close = () => setSavingsTradeModal({ isOpen: false, mode: 'deposit', stockId: null, amount: '', fromAccId: '', toAccId: 'wallet' });
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-5 animate-in fade-in duration-200" onClick={close}>
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">{ss.name}</p>
                  <p className="text-sm font-black text-slate-800">저축 거래</p>
                </div>
                <button onClick={close} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
              </div>

              {/* 탭 */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4">
                <button onClick={() => setSavingsTradeModal(m => ({ ...m, mode: 'deposit', amount: '' }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${isDeposit ? `${t.altMain} shadow-md` : 'text-slate-400'}`}>
                  <Landmark size={11}/> 저축
                </button>
                <button onClick={() => setSavingsTradeModal(m => ({ ...m, mode: 'withdraw', amount: '' }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${!isDeposit ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400'}`}>
                  💸 출금
                </button>
              </div>

              {/* 출처/목적지 선택 */}
              <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">{isDeposit ? '어디서 저축할까요?' : '어디로 출금할까요?'}</label>
                <div className="flex flex-wrap gap-1.5">
                  {isDeposit
                    ? depositSources.map(src => (
                        <button key={src.id} onClick={() => setSavingsTradeModal(m => ({ ...m, fromAccId: src.id }))}
                          className={`flex flex-col items-start px-3 py-2 rounded-xl text-left border transition-colors ${savingsTradeModal.fromAccId === src.id ? `${t.altMain} border-transparent` : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                          <span className="text-[10px] font-black">{src.emoji} {src.name}</span>
                          <span className={`text-[9px] font-bold ${savingsTradeModal.fromAccId === src.id ? 'opacity-80' : 'text-slate-400'}`}>{src.sub}</span>
                        </button>
                      ))
                    : allWithdrawDests.map(dest => (
                        <button key={dest.id} onClick={() => setSavingsTradeModal(m => ({ ...m, toAccId: dest.id }))}
                          className={`flex flex-col items-start px-3 py-2 rounded-xl text-left border transition-colors ${savingsTradeModal.toAccId === dest.id ? 'bg-slate-700 text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                          <span className="text-[10px] font-black">{dest.emoji} {dest.name}</span>
                          <span className={`text-[9px] font-bold ${savingsTradeModal.toAccId === dest.id ? 'opacity-70' : 'text-slate-400'}`}>{dest.sub}</span>
                        </button>
                      ))
                  }
                </div>
              </div>

              {/* 금액 입력 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400">금액</label>
                  {!isDeposit && <button onClick={() => setSavingsTradeModal(m => ({ ...m, amount: String(balance) }))}
                    className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">전액 ₩{formatNum(balance)}</button>}
                </div>
                <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-slate-400 transition-colors">
                  <span className="text-slate-400 font-bold text-xs mr-1">₩</span>
                  <input type="text" inputMode="numeric" className="flex-1 text-xl font-black outline-none text-slate-800 bg-transparent"
                    placeholder="0"
                    value={toCommaString(savingsTradeModal.amount)}
                    onChange={e => setSavingsTradeModal(m => ({ ...m, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                    autoFocus />
                </div>
              </div>

              {/* 잔액 표시 */}
              <div className={`rounded-xl px-4 py-2.5 mb-4 flex justify-between ${isDeposit ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                <span className="text-[10px] font-bold text-slate-400">현재 잔액</span>
                <span className="text-[11px] font-black text-slate-700">₩{formatNum(balance)}</span>
              </div>

              {/* 확인 버튼 */}
              <button onClick={() => {
                  if (amt <= 0) return showToast('⚠️ 금액을 입력해주세요.');
                  saveStateToHistory();
                  let updatedStocks = [...stocks];
                  let updatedAccs = [...accounts];
                  if (isDeposit) {
                    const fromId = savingsTradeModal.fromAccId;
                    if (!fromId) return showToast('⚠️ 출처 계좌를 선택해주세요.');
                    if (fromId.startsWith('stock:')) {
                      const srcId = fromId.slice(6);
                      const src = updatedStocks.find(s => s.id === srcId);
                      if (!src || toPureNumber(src.quantity) < amt) return showToast('⚠️ 잔액이 부족합니다.');
                      updatedStocks = updatedStocks.map(s => s.id === srcId ? { ...s, quantity: String(toPureNumber(s.quantity) - amt) } : s);
                    } else if (fromId.startsWith('acc:')) {
                      const accId = fromId.slice(4);
                      const srcAcc = updatedAccs.find(a => a.id === accId);
                      if (!srcAcc || toPureNumber(srcAcc.cash) < amt) return showToast('⚠️ 잔액이 부족합니다.');
                      updatedAccs = updatedAccs.map(a => a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) - amt) } : a);
                    }
                    updatedStocks = updatedStocks.map(s => s.id === ss.id ? { ...s, quantity: String(toPureNumber(s.quantity) + amt) } : s);
                    setStocks(updatedStocks);
                    setAccounts(updatedAccs);
                    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                    showToast('🏦 저축 완료!');
                  } else {
                    const toId = savingsTradeModal.toAccId;
                    if (!toId) return showToast('⚠️ 출금 계좌를 선택해주세요.');
                    if (toPureNumber(ss.quantity) < amt) return showToast('⚠️ 잔액이 부족합니다.');
                    updatedStocks = updatedStocks.map(s => s.id === ss.id ? { ...s, quantity: String(toPureNumber(s.quantity) - amt) } : s);
                    if (toId.startsWith('stock:')) {
                      const dstId = toId.slice(6);
                      updatedStocks = updatedStocks.map(s => s.id === dstId ? { ...s, quantity: String(toPureNumber(s.quantity) + amt) } : s);
                    } else if (toId.startsWith('acc:')) {
                      const accId = toId.slice(4);
                      updatedAccs = updatedAccs.map(a => a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) + amt) } : a);
                    }
                    setStocks(updatedStocks);
                    setAccounts(updatedAccs);
                    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                    showToast('💸 출금 완료!');
                  }
                  close();
                }}
                className={`w-full py-3 rounded-2xl text-sm font-black shadow-lg flex items-center justify-center gap-1.5 transition-colors ${isDeposit ? `${t.altMain}` : 'bg-slate-700 text-white hover:bg-slate-800'}`}>
                {isDeposit ? <Landmark size={13}/> : <span>💸</span>}
                {isDeposit ? '저축하기' : '출금하기'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* 입출금 통장 출금 창 */}
      {itemWithdrawModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
            <button onClick={() => setItemWithdrawModal({ isOpen: false, targetId: null, amount: '', toAccId: 'wallet' })} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            <h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center w-full">💸 저축액 출금하기</h3>
            <div className="mb-4 space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 text-center">받는 대상</label>
                <select className="w-full p-2.5 rounded-xl bg-slate-50 border outline-none font-black text-xs text-center" value={itemWithdrawModal.toAccId} onChange={e=>setItemWithdrawModal({...itemWithdrawModal, toAccId: e.target.value})}>
                  {accounts.map(a=><option key={a.id} value={a.id}>{a.type === 'savings' ? '🏦 ' : a.type === 'spending' ? '🛍️ ' : '📈 '}{a.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="text" placeholder="출금할 금액" className="flex-1 p-2.5 rounded-xl bg-slate-50 border outline-none font-black text-sm text-right text-blue-600" value={toCommaString(itemWithdrawModal.amount)} onChange={e=>setItemWithdrawModal({...itemWithdrawModal, amount: e.target.value.replace(/[^0-9]/g, '')})} autoFocus />
                <button onClick={(e) => {
                  e.preventDefault();
                  const targetStock = stocks.find(s => s.id === itemWithdrawModal.targetId);
                  if(targetStock) setItemWithdrawModal({...itemWithdrawModal, amount: String(toPureNumber(targetStock.quantity))});
                }} className="px-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black whitespace-nowrap shadow-sm hover:bg-slate-200 transition-colors">전액</button>
              </div>
            </div>
            <button onClick={handleItemWithdrawSubmit} className={`w-full py-2.5 rounded-xl font-black text-white text-xs shadow-md ${t.main}`}>출금 실행</button>
          </div>
        </div>
      )}

      {/* 소비계좌 항목 충전 모달 */}
      {spendingChargeModal.isOpen && (() => {
        const close = () => setSpendingChargeModal({ isOpen: false, stockId: null, amount: '', fromKey: '' });
        const targetItem = stocks.find(s => s.id === spendingChargeModal.stockId);

        // 저축 항목들만 출처로 표시 (CMA, 월급통장 등) — 월급 포함 이름 우선
        const sources = stocks
          .filter(st => accounts.find(a => a.id === (st.accountId || 'default'))?.type === 'savings')
          .map(st => ({
            id: `stock:${st.id}`,
            name: st.name,
            sub: `₩${formatNum(toPureNumber(st.quantity))}`,
            bal: toPureNumber(st.quantity),
            isSalary: st.name.includes('월급'),
          }))
          .sort((a, b) => (b.isSalary ? 1 : 0) - (a.isSalary ? 1 : 0));

        const amt = toPureNumber(spendingChargeModal.amount);
        const selectedSrc = sources.find(s => s.id === spendingChargeModal.fromKey);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-5 animate-in fade-in duration-200" onClick={close}>
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  {targetItem && <p className="text-[10px] text-slate-400 font-bold">{targetItem.name}</p>}
                  <p className="text-sm font-black text-slate-800">💳 충전하기</p>
                </div>
                <button onClick={close} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
              </div>

              {/* 출처 선택 */}
              <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">어디서 충전할까요?</label>
                {sources.length === 0 ? (
                  <p className="text-[10px] text-slate-400 py-3 text-center">저축 항목이 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map(src => {
                      const isSel = spendingChargeModal.fromKey === src.id;
                      return (
                        <button key={src.id} onClick={() => setSpendingChargeModal(p => ({ ...p, fromKey: src.id }))}
                          className={`flex flex-col items-start px-3 py-2 rounded-xl text-left border transition-colors ${isSel ? 'bg-rose-500 text-white border-transparent shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                          <span className="text-[10px] font-black">🏦 {src.name}</span>
                          <span className={`text-[9px] font-bold ${isSel ? 'opacity-80 text-white' : 'text-slate-400'}`}>{src.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 금액 입력 */}
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">금액</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-slate-400 transition-colors">
                  <span className="text-slate-400 font-bold text-xs mr-1">₩</span>
                  <input type="text" inputMode="numeric" placeholder="0" autoFocus
                    className="flex-1 text-xl font-black outline-none text-slate-800 bg-transparent"
                    value={toCommaString(spendingChargeModal.amount)}
                    onChange={e => setSpendingChargeModal(p => ({ ...p, amount: e.target.value.replace(/[^0-9]/g, '') }))} />
                </div>
              </div>

              {/* 잔액 표시 */}
              <div className="rounded-xl px-4 py-2.5 mb-4 bg-rose-50 flex justify-between">
                <span className="text-[10px] font-bold text-slate-400">{selectedSrc ? `${selectedSrc.name} 잔액` : '출처를 선택하세요'}</span>
                <span className="text-[11px] font-black text-slate-700">{selectedSrc ? `₩${formatNum(selectedSrc.bal)}` : '-'}</span>
              </div>

              {/* 확인 버튼 */}
              <button onClick={() => {
                if (amt <= 0) return showToast('⚠️ 금액을 입력해주세요.');
                if (!spendingChargeModal.fromKey) return showToast('⚠️ 출처를 선택해주세요.');
                saveStateToHistory();
                let updatedStocks = stocks.map(s => s.id === spendingChargeModal.stockId ? { ...s, quantity: String(toPureNumber(s.quantity) + amt) } : s);
                let updatedAccs = [...accounts];
                const fromKey = spendingChargeModal.fromKey;
                if (fromKey.startsWith('stock:')) {
                  const srcId = fromKey.slice(6);
                  const src = updatedStocks.find(s => s.id === srcId);
                  if (!src || toPureNumber(src.quantity) < amt) return showToast('⚠️ 잔액이 부족합니다.');
                  updatedStocks = updatedStocks.map(s => s.id === srcId ? { ...s, quantity: String(toPureNumber(s.quantity) - amt) } : s);
                } else if (fromKey.startsWith('acc:')) {
                  const accId = fromKey.slice(4);
                  const srcAcc = updatedAccs.find(a => a.id === accId);
                  if (!srcAcc || toPureNumber(srcAcc.cash) < amt) return showToast('⚠️ 잔액이 부족합니다.');
                  updatedAccs = updatedAccs.map(a => a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) - amt) } : a);
                }
                setStocks(updatedStocks);
                setAccounts(updatedAccs);
                saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                close();
                showToast(`✅ ₩${formatNum(amt)} 충전 완료!`);
              }} className="w-full py-3 rounded-2xl text-sm font-black shadow-lg flex items-center justify-center gap-1.5 bg-rose-500 text-white hover:bg-rose-600 transition-colors">
                💳 충전하기
              </button>
            </div>
          </div>
        );
      })()}

      {/* 대출 세부 항목 추가 모달 */}
      {loanItemModal.isOpen && (() => {
        // 저축계좌 안의 항목(stocks)만 출금 대상으로 표시
        const savingsStockOptions = stocks.filter(s => {
          const acc = accounts.find(a => a.id === (s.accountId || 'default'));
          return acc?.type === 'savings';
        });
        const previewInterest = loanItemModal.amount && loanItemModal.rate
          ? Math.round(toPureNumber(loanItemModal.amount) * toPureNumber(loanItemModal.rate) / 100 / 12)
          : 0;
        return (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
            <button onClick={() => setLoanItemModal({ isOpen: false, loanId: null, loanName: '', amount: '', rate: '', payDay: '', period: '', linkedAccId: '', interestCategory: '' })} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            <h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center w-full">💸 대출 상세 입력</h3>
            <div className="flex flex-col gap-2.5 mb-4">
              <div className="relative flex items-center">
                <input type="text" placeholder="대출 상품명 (예: 카카오 주담대)" className="w-full p-2.5 rounded-xl bg-slate-50 border outline-none font-black text-sm focus:border-orange-400" value={loanItemModal.loanName} onChange={e=>setLoanItemModal({...loanItemModal, loanName: e.target.value})} autoFocus />
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-slate-400">₩</span>
                <input type="text" placeholder="대출 잔액 (원금)" className="w-full p-2.5 pl-7 rounded-xl bg-slate-50 border outline-none font-black text-sm text-right focus:border-orange-400" value={toCommaString(loanItemModal.amount)} onChange={e=>setLoanItemModal({...loanItemModal, amount: e.target.value.replace(/[^0-9]/g,'')})} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative flex items-center">
                  <input type="text" placeholder="이자율" className="w-full p-2.5 pr-7 rounded-xl bg-slate-50 border outline-none font-black text-sm text-right focus:border-orange-400" value={loanItemModal.rate} onChange={e=>setLoanItemModal({...loanItemModal, rate: e.target.value.replace(/[^0-9.]/g,'')})} />
                  <span className="absolute right-3 text-xs font-bold text-slate-400">%</span>
                </div>
                <div className="flex-1 relative flex items-center">
                  <input type="text" placeholder="납입일" className="w-full p-2.5 pr-6 rounded-xl bg-slate-50 border outline-none font-black text-sm text-right focus:border-orange-400" value={loanItemModal.payDay} onChange={e=>setLoanItemModal({...loanItemModal, payDay: e.target.value.replace(/[^0-9]/g,'')})} />
                  <span className="absolute right-3 text-xs font-bold text-slate-400">일</span>
                </div>
              </div>
              {previewInterest > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 text-center">
                  <span className="text-[10px] font-black text-orange-600">이번달 예상 이자: ₩{formatNum(previewInterest)}</span>
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1 relative flex items-center">
                  <input type="text" placeholder="계약기간 (개월)" className="w-full p-2.5 pr-10 rounded-xl bg-slate-50 border outline-none font-black text-sm text-right focus:border-orange-400" value={loanItemModal.period} onChange={e=>setLoanItemModal({...loanItemModal, period: e.target.value.replace(/[^0-9]/g,'')})} />
                  <span className="absolute right-3 text-xs font-bold text-slate-400">개월</span>
                </div>
                <div className="flex-1 relative flex items-center">
                  <input type="text" placeholder="만기일 (YYYY-MM-DD)" className="w-full p-2.5 rounded-xl bg-slate-50 border outline-none font-black text-[11px] text-right focus:border-orange-400" value={loanItemModal.dueDate} onChange={e => { let val = e.target.value.replace(/[^0-9]/g,''); if (val.length > 8) val = val.slice(0,8); let f = val; if (val.length >= 5) f = val.slice(0,4)+'-'+val.slice(4); if (val.length >= 7) f = val.slice(0,4)+'-'+val.slice(4,6)+'-'+val.slice(6); setLoanItemModal({...loanItemModal, dueDate: f}); }} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 text-center">고정비 분류</label>
                <select className="w-full p-2.5 rounded-xl bg-slate-50 border outline-none font-black text-xs text-center focus:border-orange-400" value={loanItemModal.interestCategory} onChange={e=>setLoanItemModal({...loanItemModal, interestCategory: e.target.value})}>
                  <option value="">선택</option>
                  {fixedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 text-center">이자 출금 항목 (저축계좌 항목)</label>
                <select className="w-full p-2.5 rounded-xl bg-slate-50 border outline-none font-black text-xs text-center focus:border-orange-400" value={loanItemModal.linkedAccId} onChange={e=>setLoanItemModal({...loanItemModal, linkedAccId: e.target.value})}>
                  <option value="">선택 안 함</option>
                  {savingsStockOptions.map(s => (
                    <option key={s.id} value={`stock:${s.id}`}>💰 {s.name} (₩{formatNum(toPureNumber(s.quantity))})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setLoanItemModal({ isOpen: false, loanId: null, loanName: '', amount: '', rate: '', payDay: '', period: '', dueDate: '', linkedAccId: '', interestCategory: '' })} className="flex-1 py-2.5 rounded-xl font-black text-slate-600 text-xs bg-slate-100 hover:bg-slate-200 transition-colors">취소</button>
              <button onClick={() => {
                if (!loanItemModal.amount) return showToast('⚠️ 대출 잔액을 입력해주세요.');
                saveStateToHistory();
                const loanAcc = accounts.find(a => a.id === loanItemModal.loanId);
                const updated = accounts.map(a => a.id === loanItemModal.loanId ? { ...a, loanProductName: loanItemModal.loanName, loanAmount: toPureNumber(loanItemModal.amount), loanRate: loanItemModal.rate, loanPayDay: loanItemModal.payDay, loanPeriod: loanItemModal.period, loanDueDate: loanItemModal.dueDate, linkedAccId: loanItemModal.linkedAccId, loanInterestCategory: loanItemModal.interestCategory } : a);
                setAccounts(updated);
                // 납입일과 이자율이 설정됐으면 고정비로 자동 등록
                if (loanItemModal.payDay && loanItemModal.rate && loanItemModal.amount) {
                  const interestAmt = Math.round(toPureNumber(loanItemModal.amount) * toPureNumber(loanItemModal.rate) / 100 / 12);
                  const productName = loanItemModal.loanName || loanAcc?.name || '대출';
                  const feId = `loan_interest_${loanItemModal.loanId}`;
                  const baseName = loanItemModal.interestCategory ? `${loanItemModal.interestCategory}-${productName} 이자` : `${productName} 이자`;
                  const newFe = { id: feId, name: baseName, amount: interestAmt, day: Number(loanItemModal.payDay), paymentMethod: '현금', cardName: '', linkedStockId: loanItemModal.linkedAccId.startsWith('stock:') ? loanItemModal.linkedAccId.replace('stock:','') : '' };
                  setFixedExpenses(prev => {
                    const filtered = prev.filter(fe => fe.id !== feId);
                    return [...filtered, newFe];
                  });
                }
                saveConfig(updated, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                setLoanItemModal({ isOpen: false, loanId: null, loanName: '', amount: '', rate: '', payDay: '', period: '', dueDate: '', linkedAccId: '', interestCategory: '' });
                showToast('✅ 대출 정보가 저장되었습니다. 납입일에 이자가 자동 출금됩니다.');
              }} className="flex-1 py-2.5 rounded-xl font-black text-white text-xs bg-orange-500 hover:bg-orange-600 shadow-md transition-colors">저장</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* 저축 만기 입력 모달 */}
      {savingsMaturityModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
            <button onClick={() => setSavingsMaturityModal({ isOpen: false, targetId: null, finalAmount: '' })} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            <h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center w-full">🎉 만기 수령액 입력</h3>
            <div className="mb-4">
              <label className="text-[10px] font-black text-slate-400 block text-center mb-1.5">실제 수령한 금액 (원금+이자)</label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs font-bold text-slate-400">₩</span>
                <input type="text" className="w-full p-2.5 pl-6 pr-2.5 rounded-xl bg-slate-50 border outline-none font-black text-sm text-right text-emerald-600" value={toCommaString(savingsMaturityModal.finalAmount)} onChange={e=>setSavingsMaturityModal({...savingsMaturityModal, finalAmount: e.target.value.replace(/[^0-9]/g, '')})} autoFocus />
              </div>
            </div>
            <button onClick={handleSavingsMaturitySubmit} className={`w-full py-2.5 rounded-xl font-black text-white text-xs shadow-md ${t.main}`}>만기 수령</button>
          </div>
        </div>
      )}

      {isInvestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => { if(e.target === e.currentTarget) setIsInvestModalOpen(false); }}>
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-2xl relative flex flex-col min-h-[460px] md:min-h-[500px]">
            <button onClick={() => setIsInvestModalOpen(false)} className="absolute top-4 md:top-5 right-4 md:right-5 p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
            <h3 className="font-black text-sm md:text-base mb-4 flex justify-center w-full items-center gap-2 text-slate-800 tracking-tighter"><CircleDollarSign size={16} className="md:w-[18px] md:h-[18px]"/> 머니로그</h3>

            <div className="flex gap-1.5 mb-4 bg-slate-50 p-1 rounded-xl shrink-0">
              <button onClick={() => { setInvestTab('income'); if (!incomeMode || incomeMode === 'expense') setIncomeMode('salary'); }} className={`flex-1 py-2 md:py-2.5 rounded-lg text-[10px] md:text-xs font-black transition-all ${investTab === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500'}`}>수입 💵</button>
              <button onClick={() => { setIncomeMode('expense'); setInvestTab('moneylog'); setIsNbbang(false); setIsNbbangConfirmed(false); setNbbangList([{id:Date.now(), name:''}]); }} className={`flex-1 py-2 md:py-2.5 rounded-lg text-[10px] md:text-xs font-black transition-all ${investTab === 'moneylog' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500'}`}>소비 💳</button>
              <button onClick={() => { setInvestTab('transfer'); }} className={`flex-1 py-2 md:py-2.5 rounded-lg text-[10px] md:text-xs font-black transition-all ${investTab === 'transfer' ? t.main : 'text-slate-500'}`}>이체 🏦</button>
            </div>
            
            <div className="mb-4 flex flex-col justify-center flex-1 overflow-y-auto custom-scrollbar pr-1">
              {investTab === 'income' ? (
                <div className="flex flex-col gap-3">
                  {/* 월급 섹션 */}
                  <div className="flex flex-col gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-black text-emerald-700">💵 월급</span>
                    <div className="flex flex-wrap gap-1.5">
                      {stocks.filter(s => accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'savings').map(s => (
                        <button key={s.id} type="button" onClick={() => setSalaryDestAccId(salaryDestAccId === `stock:${s.id}` ? '' : `stock:${s.id}`)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${salaryDestAccId === `stock:${s.id}` ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                          💰 {s.name} <span className="opacity-70">₩{formatNum(toPureNumber(s.quantity))}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input type="text" className="flex-1 text-right text-[11px] font-black text-slate-800 border border-emerald-200 rounded-lg p-2 outline-none focus:border-emerald-400 bg-white min-w-0" placeholder="월급 금액" value={toCommaString(salaryAmount)} onChange={e => setSalaryAmount(e.target.value.replace(/[^0-9]/g, ''))} />
                      <button onClick={() => {
                        const amt = toPureNumber(salaryAmount);
                        if (amt <= 0) return showToast('⚠️ 금액을 입력해주세요.');
                        saveStateToHistory();
                        let updatedAccs = [...accounts]; let updatedStocks = [...stocks];
                        if (salaryDestAccId) {
                          if (salaryDestAccId.startsWith('stock:')) { const sid = salaryDestAccId.replace('stock:', ''); updatedStocks = updatedStocks.map(s => String(s.id) === sid ? { ...s, quantity: String(toPureNumber(s.quantity) + amt) } : s); }
                          else { const aid = salaryDestAccId.replace('acc:', ''); updatedAccs = updatedAccs.map(a => a.id === aid ? { ...a, cash: String(toPureNumber(a.cash) + amt) } : a); }
                        }
                        setAccounts(updatedAccs); setStocks(updatedStocks);
                        logTrade({ type: 'income', name: '월급 입금', category: '급여', amount: amt });
                        setSalaryAmount('');
                        showToast('🎉 월급 처리 완료!');
                        saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                      }} className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-[11px] font-black shrink-0 shadow-sm hover:bg-emerald-600">확인</button>
                    </div>
                  </div>
                  {/* 수익 섹션 */}
                  <div className="flex flex-col gap-2 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                    <span className="text-[10px] font-black text-blue-700">🧧 수익</span>
                    <div className="flex flex-wrap gap-1.5">
                      {stocks.filter(s => accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'savings').map(s => (
                        <button key={s.id} type="button" onClick={() => setBonusDestAccId(bonusDestAccId === `stock:${s.id}` ? '' : `stock:${s.id}`)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${bonusDestAccId === `stock:${s.id}` ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                          💰 {s.name} <span className="opacity-70">₩{formatNum(toPureNumber(s.quantity))}</span>
                        </button>
                      ))}
                    </div>
                    <select className="w-full text-[10px] font-black text-slate-700 border border-blue-200 rounded-lg p-2 outline-none bg-white" value={incomeCategory} onChange={e => setIncomeCategory(e.target.value)}>
                      <option value="출장비">출장비</option><option value="성과급">성과급</option><option value="복지비">복지비</option><option value="자기계발비">자기계발</option><option value="기타 수익">기타</option>
                    </select>
                    <div className="flex items-center gap-1.5">
                      <input type="text" className="flex-1 text-right text-[11px] font-black text-slate-800 border border-blue-200 rounded-lg p-2 outline-none focus:border-blue-400 bg-white min-w-0" placeholder="수익 금액" value={toCommaString(bonusAmount)} onChange={e => setBonusAmount(e.target.value.replace(/[^0-9]/g, ''))} />
                      <button onClick={() => {
                        const amt = toPureNumber(bonusAmount);
                        if (amt <= 0) return showToast('⚠️ 금액을 입력해주세요.');
                        saveStateToHistory();
                        let updatedAccs = [...accounts]; let updatedStocks = [...stocks];
                        if (bonusDestAccId) {
                          if (bonusDestAccId.startsWith('stock:')) { const sid = bonusDestAccId.replace('stock:', ''); updatedStocks = updatedStocks.map(s => String(s.id) === sid ? { ...s, quantity: String(toPureNumber(s.quantity) + amt) } : s); }
                          else { const aid = bonusDestAccId.replace('acc:', ''); updatedAccs = updatedAccs.map(a => a.id === aid ? { ...a, cash: String(toPureNumber(a.cash) + amt) } : a); }
                        }
                        setAccounts(updatedAccs); setStocks(updatedStocks);
                        logTrade({ type: 'income', name: `${incomeCategory} 입금`, category: incomeCategory, amount: amt });
                        setBonusAmount(''); setBonusDestAccId('');
                        showToast(`🎉 ${incomeCategory} 처리 완료!`);
                        saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                      }} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-[11px] font-black shrink-0 shadow-sm hover:bg-blue-600">확인</button>
                    </div>
                  </div>
                </div>
              ) : investTab === 'moneylog' ? (
                <div className="flex flex-col gap-3">
                  {incomeMode && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-2">
                      {incomeMode === 'expense' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1.5">
                            {/* 🎯 '기타' 선택 시 셀렉트 박스가 입력창으로 마법처럼 변신! */}
                           <div className="flex-1 flex items-center">
                            {['식비', '생필품', '의류비', '고정비'].includes(expenseCategory) ? (
                             <select className="w-full text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                             <option value="식비">식비</option><option value="생필품">생필품</option><option value="의류비">의류비</option><option value="고정비">고정비</option><option value="기타">기타</option>
                             </select>
                             ) : (
                            <div className="flex w-full gap-1 animate-in zoom-in duration-200">
                                  <button type="button" onClick={() => setExpenseCategory('식비')} className="shrink-0 px-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-colors">←</button>
                                  <input type="text" className="flex-1 text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-400 bg-white" placeholder="기타 (상세 내역 입력)" value={expenseCategory === '기타' ? '' : expenseCategory} onChange={e => setExpenseCategory(e.target.value)} autoFocus />
                                </div>
                              )}
                           </div>
                            <select className="flex-1 text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setSelectedCard(''); setCashSource(''); setTransferAccId(''); }}>
                              <option value="현금">현금</option><option value="체크카드">체크카드</option><option value="신용카드">신용카드</option>
                            </select>
                          </div>
                          {(paymentMethod === '체크카드' || paymentMethod === '신용카드') && (
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                ...myCards.filter(c => paymentMethod === '체크카드' ? c.type === '체크' : c.type === '신용').map(c => c.name),
                                ...stocks.filter(s => {
                                  const acc = accounts.find(a => a.id === (s.accountId || 'default'));
                                  return acc?.type === 'card' && (paymentMethod === '체크카드' ? s.cardType !== '신용' : s.cardType === '신용');
                                }).filter(s => !myCards.some(c => c.name === s.name)).map(s => s.name)
                              ].map(name => (
                                <button key={name} type="button"
                                  onClick={() => setSelectedCard(selectedCard === name ? '' : name)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${selectedCard === name ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                                  💳 {name}
                                </button>
                              ))}
                            </div>
                          )}
                          {paymentMethod === '현금' && (
                            <div className="flex flex-wrap gap-1.5">
                              {accounts.filter(a => a.type === 'spending').map(a => (
                                <button key={a.id} type="button"
                                  onClick={() => { setCashSource(cashSource === a.id ? '' : a.id); setSelectedCard(''); setSpendingItem(''); setUseSpendingPoint(false); }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${cashSource === a.id ? 'bg-rose-500 text-white border-rose-500' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}>
                                  🛍️ {a.name}
                                </button>
                              ))}
                              <button type="button"
                                onClick={() => { setCashSource(cashSource === 'transfer' ? '' : 'transfer'); setTransferAccId(''); setSelectedCard(''); }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${cashSource === 'transfer' ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>
                                🏦 계좌이체
                              </button>
                            </div>
                          )}
                          {paymentMethod === '현금' && cashSource && cashSource !== 'transfer' && (() => {
                            const items = stocks.filter(s => (s.accountId || 'default') === cashSource);
                            const selectedItem = items.find(s => s.id === spendingItem);
                            const hasWithdrawAcc = !!selectedItem?.withdrawAccId;
                            return (
                              <div className="flex flex-wrap gap-1.5 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                                <span className="w-full text-[9px] font-black text-rose-400 mb-0.5">결제 수단 선택</span>
                                {items.length === 0 ? (
                                  <span className="text-[9px] text-slate-400 font-bold">이 소비계좌에 저장된 항목이 없습니다</span>
                                ) : (
                                  items.map(s => (
                                    <button key={s.id} type="button"
                                      onClick={() => { setSpendingItem(spendingItem === s.id ? '' : s.id); setUseSpendingPoint(false); }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${spendingItem === s.id ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-100'}`}>
                                      {s.name} <span className="text-[9px] opacity-70">₩{formatNum(toPureNumber(s.quantity))}</span>
                                    </button>
                                  ))
                                )}
                                {hasWithdrawAcc && (
                                  <button type="button"
                                    onClick={() => setUseSpendingPoint(v => !v)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${useSpendingPoint ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-amber-600 border-amber-300 hover:bg-amber-50'}`}>
                                    🎁 포인트 사용 {useSpendingPoint ? 'ON' : 'OFF'}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          {paymentMethod === '현금' && cashSource === 'transfer' && (() => {
                            const savingsStocks = stocks.filter(s => {
                              const acc = accounts.find(a => a.id === (s.accountId || 'default'));
                              return acc?.type === 'savings';
                            });
                            return (
                              <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="w-full text-[9px] font-black text-slate-400 mb-0.5">출금 계좌 선택</span>
                                {savingsStocks.map(s => (
                                  <button key={`stk-${s.id}`} type="button"
                                    onClick={() => setTransferAccId(transferAccId === `stock:${s.id}` ? '' : `stock:${s.id}`)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${transferAccId === `stock:${s.id}` ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                                    🏦 {s.name} <span className="opacity-70">₩{formatNum(toPureNumber(s.quantity))}</span>
                                  </button>
                                ))}
                                {savingsStocks.length === 0 && (
                                  <span className="text-[9px] text-slate-400 font-bold">입출금 통장이 없습니다</span>
                                )}
                              </div>
                            );
                          })()}
                          <div className="flex gap-1.5">
                            <input type="text" className="w-[60px] text-center text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-400 bg-white shrink-0" placeholder="MMDD" value={expenseDateInput} onChange={e => {
                               let val = e.target.value.replace(/[^0-9]/g, '');
                               if (val.length > 4) val = val.slice(0, 4);
                               if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
                               setExpenseDateInput(val);
                            }} />
                            <input type="text" className="flex-1 text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-400 bg-white" placeholder="무엇을 샀나요?" value={expenseMemo} onChange={e => setExpenseMemo(e.target.value)} />
                            <button onClick={() => { setIsNbbang(!isNbbang); setIsNbbangConfirmed(false); if(!isNbbang) setNbbangList([{id:Date.now(), name:''}]); }} className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-colors flex items-center gap-1 ${isNbbang ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white border-slate-200 text-slate-600'} border shadow-sm`}>🍰 N빵</button>
                          </div>
                          {expenseCategory === '고정비' && expenseMemo.trim() && (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg p-2 animate-in zoom-in duration-200">
                              <span className="text-[9px] font-black text-amber-700 flex-1">📌 "{expenseMemo}" 고정비로 매달 자동 지출</span>
                              {(() => {
                                const existing = fixedExpenses.find(fe => fe.name === expenseMemo.trim());
                                return existing ? (
                                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">✓ 저장됨 ({existing.day}일)</span>
                                ) : (
                                  <span className="text-[8px] font-black text-amber-500">결제 시 자동 저장</span>
                                );
                              })()}
                            </div>
                          )}
                          
                          {isNbbang && (
                            <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 flex flex-col gap-2 animate-in zoom-in duration-200 mt-1">
                              {isNbbangConfirmed ? (
                                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-purple-200 shadow-sm">
                                  <span className="text-[10px] font-black text-purple-700 truncate flex-1">함께한 사람: {nbbangList.map(n=>n.name).filter(Boolean).join(', ')}</span>
                                  <button onClick={() => setIsNbbangConfirmed(false)} className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-[9px] font-black shadow-sm hover:bg-purple-200 shrink-0 transition-colors">수정</button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black text-purple-600">총 인원 설정</span>
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => setNbbangList(nbbangList.length > 1 ? nbbangList.slice(0, -1) : nbbangList)} className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-purple-600 font-black shadow-sm border border-purple-200 hover:bg-purple-50 transition-colors">-</button>
                                      <span className="text-xs font-black text-purple-800 w-4 text-center">{nbbangList.length}</span>
                                      <button onClick={() => setNbbangList([...nbbangList, { id: Date.now() + nbbangList.length, name: '' }])} className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-purple-600 font-black shadow-sm border border-purple-200 hover:bg-purple-50 transition-colors">+</button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-5 gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar p-0.5">
                                    {nbbangList.map((person, index) => (
                                      <input 
                                        key={person.id} 
                                        id={`nbbang-input-${index}`} 
                                        type="text" 
                                        className="w-full text-[10px] font-black text-slate-800 border border-purple-200 rounded-lg p-1.5 outline-none focus:border-purple-400 bg-white text-center shadow-sm" 
                                        placeholder={`인원${index+1}`} 
                                        value={person.name} 
                                        onChange={e => { const newList = [...nbbangList]; newList[index].name = e.target.value; setNbbangList(newList); }} 
                                        onKeyDown={e => {
                                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                            e.preventDefault();
                                            if (index < nbbangList.length - 1) {
                                              document.getElementById(`nbbang-input-${index + 1}`)?.focus();
                                            } else {
                                              setIsNbbangConfirmed(true);
                                            }
                                          }
                                        }} 
                                      />
                                    ))}
                                  </div>
                                  <div className="flex justify-end mt-1">
                                    <button onClick={() => setIsNbbangConfirmed(true)} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-[10px] font-black shadow-sm hover:bg-purple-600 transition-colors">입력완료</button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mt-1">
                        <input type="text" className="flex-1 text-right text-[11px] md:text-xs font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-400 min-w-0" placeholder="총 금액 입력" value={toCommaString(incomeAmount)} onChange={e => setIncomeAmount(e.target.value.replace(/[^0-9]/g, ''))} />
                        <button onClick={() => {
                          const amt = toPureNumber(incomeAmount);
                          if(amt <= 0) return;
                          saveStateToHistory();
                          
                          const isExpense = incomeMode === 'expense';
                          let myShare = amt;
                          let finalNbbangCount = 1;
                          let finalNbbangNames = '';
                          let perPersonShare = 0; 

                          if (isExpense && isNbbang) {
                            const validPeople = nbbangList.filter(n => n.name.trim() !== '');
                            finalNbbangCount = validPeople.length;
                            if (finalNbbangCount > 0) {
                              perPersonShare = Math.ceil(amt / finalNbbangCount);
                              myShare = amt - perPersonShare * (finalNbbangCount - 1);
                              finalNbbangNames = validPeople.map(n => n.name.trim()).join(', ');
                            }
                          }
                          
                          let updatedGlobalCash = Number(globalCash);
                          let updatedAccs = [...accounts];
                          let updatedStocks = [...stocks];
                          let isPaidNow = false;

                          if (!isExpense) {
                            if (bonusDestAccId && bonusDestAccId !== 'wallet') {
                              if (bonusDestAccId.startsWith('stock:')) {
                                const stockId = bonusDestAccId.replace('stock:', '');
                                updatedStocks = updatedStocks.map(s => String(s.id) === stockId ? { ...s, quantity: String(toPureNumber(s.quantity) + amt) } : s);
                              } else {
                                const accId = bonusDestAccId.replace('acc:', '');
                                updatedAccs = updatedAccs.map(a => a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) + amt) } : a);
                              }
                            }
                            isPaidNow = true;
                          } else {
                            if (paymentMethod === '현금') {
                               if (cashSource && cashSource !== 'transfer') {
                                  if (spendingItem) {
                                     const item = updatedStocks.find(s => s.id === spendingItem);
                                     const benefit = toPureNumber(item?.benefit) || 0;
                                     const wid = item?.withdrawAccId || '';
                                     if (wid.startsWith('stock:')) {
                                        const srcId = String(wid.slice(6));
                                        const src = updatedStocks.find(s => String(s.id) === srcId);
                                        const pointBal = toPureNumber(item?.quantity) || 0;
                                        let pointUsed = 0;
                                        let cashNeeded = myShare;
                                        if (useSpendingPoint && pointBal > 0) {
                                           pointUsed = Math.min(pointBal, myShare);
                                           cashNeeded = myShare - pointUsed;
                                        }
                                        if (!src || toPureNumber(src.quantity) < cashNeeded) return showToast("⚠️ 출금 계좌 잔액이 부족합니다.");
                                        const accumulation = Math.floor(myShare * benefit / 100);
                                        updatedStocks = updatedStocks.map(s => {
                                           if (String(s.id) === String(spendingItem)) return { ...s, quantity: String(pointBal - pointUsed + accumulation) };
                                           if (String(s.id) === srcId) return { ...s, quantity: String(toPureNumber(s.quantity) - cashNeeded) };
                                           return s;
                                        });
                                        if (accumulation > 0) showToast(`✅ ₩${formatNum(accumulation)} 적립!`);
                                     } else {
                                        if (!item || toPureNumber(item.quantity) < myShare) return showToast("⚠️ 잔액이 부족합니다.");
                                        const accumulation = Math.floor(myShare * benefit / 100);
                                        updatedStocks = updatedStocks.map(s => s.id === spendingItem ? { ...s, quantity: String(toPureNumber(s.quantity) - myShare + accumulation) } : s);
                                        if (accumulation > 0) showToast(`✅ ₩${formatNum(accumulation)} 적립!`);
                                     }
                                  }
                               } else if (cashSource === 'transfer' && transferAccId) {
                                  if (transferAccId.startsWith('stock:')) {
                                     const stockId = transferAccId.replace('stock:', '');
                                     const src = updatedStocks.find(s => String(s.id) === stockId);
                                     if (!src || toPureNumber(src.quantity) < myShare) return showToast("⚠️ 잔액이 부족합니다.");
                                     updatedStocks = updatedStocks.map(s => String(s.id) === stockId ? { ...s, quantity: String(toPureNumber(s.quantity) - myShare) } : s);
                                  }
                               } else {
                                  isPaidNow = true;
                               }
                               isPaidNow = true;
                            } else {
                               const selectedCardInfo = myCards.find(c => c.name === selectedCard)
                                 || stocks.find(s => s.name === selectedCard && accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'card');
                               const isCredit = selectedCardInfo?.cardType === '신용';
                               const linkedAccId = selectedCardInfo?.linkedAcc || selectedCardInfo?.cardLinkedAcc || '';
                               const deductFrom = linkedAccId || '';
                               if (isCredit) {
                                  isPaidNow = false;
                               } else if (deductFrom.startsWith('stock:')) {
                                  const stockId = deductFrom.replace('stock:', '');
                                  const targetStock = updatedStocks.find(s => String(s.id) === stockId);
                                  if (!targetStock || toPureNumber(targetStock.quantity) < myShare) return showToast("⚠️ 연동된 통장 잔액이 부족합니다.");
                                  updatedStocks = updatedStocks.map(s => String(s.id) === stockId ? { ...s, quantity: String(toPureNumber(s.quantity) - myShare) } : s);
                                  isPaidNow = true;
                               } else if (deductFrom) {
                                  const acc = updatedAccs.find(a => a.id === deductFrom);
                                  if (!acc || toPureNumber(acc.cash) < myShare) return showToast("⚠️ 연동된 계좌 잔액이 부족합니다.");
                                  updatedAccs = updatedAccs.map(a => a.id === deductFrom ? { ...a, cash: String(toPureNumber(a.cash) - myShare) } : a);
                                  isPaidNow = true;
                               } else {
                                  isPaidNow = false;
                               }
                            }
                          }
                          
                          setGlobalCash(updatedGlobalCash);
                          setAccounts(updatedAccs);
                          setStocks(updatedStocks);

                          let logType = 'income'; let logCat = '기타'; let logName = ''; let logMemo = expenseMemo;
                          if (incomeMode === 'salary') { logCat = '급여'; logName = '월급 입금'; }
                          else if (incomeMode === 'bonus') { logCat = incomeCategory; logName = `${incomeCategory} 입금`; }
                          else if (incomeMode === 'expense') { logType = 'expense'; logCat = expenseCategory.trim() || '기타'; logName = expenseMemo || '소비'; }
                          
                          let finalDate = new Date().toISOString().substring(0, 10);
                          if (expenseDateInput && expenseDateInput.length === 5) {
                             const year = new Date().getFullYear();
                             const formatted = expenseDateInput.replace('/', '-');
                             finalDate = `${year}-${formatted}`;
                          }

                          let logsToAdd = [];
                          const baseLog = { 
                            type: logType, name: logName, category: logCat, amount: myShare, totalAmount: amt, 
                            memo: logMemo, paymentMethod: isExpense ? paymentMethod : null, cardName: selectedCard || null,
                            isPaid: isPaidNow, isNbbang: isExpense ? isNbbang : false, nbbangCount: finalNbbangCount, nbbangNames: finalNbbangNames, perPersonShare: perPersonShare,
                            date: finalDate, timestamp: Date.now()
                          };

                          if (isExpense && isNbbang && finalNbbangCount > 1) {
                             const cleanLogName = logName.replace(/\(.*?(몫|분)\)/g, '').trim();
                             const validPeople = nbbangList.filter(n => n.name.trim() !== '');
                             const myName2 = (myDisplayName || '').trim();
                             const iAmInList2 = myName2 && validPeople.some(p => p.name.trim() === myName2);
                             // 항상 내 로그 생성 (카드 총 사용금액 추적용)
                             // iAmInList2=true → myInNbbang:true (내 몫 소비로 반영)
                             // iAmInList2=false → myInNbbang:false (카드 총액에만 반영, 내 실부담 금액에서는 제외)
                             const myLogAmount = iAmInList2 ? myShare : amt;
                             logsToAdd.push({ ...baseLog, id: Date.now().toString() + '_0', name: cleanLogName, isNbbang: false, myInNbbang: iAmInList2 ? true : false, amount: myLogAmount });
                             // 나를 제외한 다른 멤버들 N빵 로그 생성
                             validPeople.filter(p => p.name.trim() !== myName2).forEach((p, idx) => {
                               logsToAdd.push({
                                 ...baseLog, id: Date.now().toString() + '_' + (idx + 1),
                                 name: cleanLogName, category: logCat, amount: perPersonShare,
                                 timestamp: Date.now() + idx + 1, isNbbang: true, isSettled: false, nbbangTarget: p.name.trim()
                               });
                             });

                             const updatedLogs = [...logsToAdd.reverse(), ...tradeLogs];
                             setTradeLogs(updatedLogs);
                          } else {
                             logTrade(baseLog);
                          }

                          // 고정비 카테고리로 저장 시 fixedExpenses에 자동 등록 (중복 방지)
                          if (logCat === '고정비' && logName.trim()) {
                            const today2 = new Date();
                            const dayNum = expenseDateInput && expenseDateInput.length === 5
                              ? Number(expenseDateInput.split('/')[0])
                              : today2.getDate();
                            const already = fixedExpenses.find(fe => fe.name === logName.trim());
                            if (!already) {
                              const newFe = { id: Date.now().toString(), name: logName.trim(), amount: myShare, day: dayNum, paymentMethod: isExpense ? paymentMethod : '현금', cardName: selectedCard || '' };
                              setFixedExpenses(prev => [...prev, newFe]);
                            }
                          }
                          setIncomeMode(null); setIncomeAmount(''); setIsNbbang(false); setExpenseMemo(''); setExpenseDateInput(''); setUseSpendingPoint(false);
                          showToast(`🎉 ${logCat} 처리 완료!`);
                          saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, updatedGlobalCash);
                        }} className={`${t.main} px-4 py-2 rounded-lg text-[11px] font-black shrink-0 shadow-sm`}>확인</button>
                      </div>
                    </div>
                  )}
                </div> 
              ) : (() => {
                // 이체 가능한 항목 목록 구성:
                // - 주식계좌: 계좌 자체(cash)
                // - 저축/소비 계좌: 그 안의 항목(stocks)만, 계좌 자체는 제외
                const transferOptions = [
                  ...accounts.filter(a => a.type !== 'savings' && a.type !== 'spending' && a.type !== 'card').map(a => ({ key: `acc:${a.id}`, label: `📈 ${a.name}`, balance: toPureNumber(a.cash) })),
                  ...stocks.filter(s => { const acc = accounts.find(a => a.id === (s.accountId || 'default')); return acc?.type === 'savings' || acc?.type === 'spending'; }).map(s => { const acc = accounts.find(a => a.id === (s.accountId || 'default')); return { key: `stock:${s.id}`, label: `${acc?.type === 'spending' ? '🛍️' : '🏦'} ${s.name}`, balance: toPureNumber(s.quantity) }; })
                ];
                const activeFromKey = transferFromId || transferOptions[0]?.key || '';
                const activeToKey = transferToId || transferOptions[1]?.key || transferOptions[0]?.key || '';
                const fromOption = transferOptions.find(o => o.key === activeFromKey);
                return (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-400 text-center">보내는 대상 (출금)</label>
                    <select className="w-full p-3 rounded-xl bg-slate-50 border outline-none font-black text-[10px] md:text-xs text-center" value={activeFromKey} onChange={e=>setTransferFromId(e.target.value)}>
                      {transferOptions.map(o=><option key={`from-${o.key}`} value={o.key}>{o.label} (₩{formatNum(o.balance)})</option>)}
                    </select>
                  </div>
                  <div className="flex justify-center -my-1 text-slate-300 text-[10px]">▼</div>
                  <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-400 text-center">받는 대상 (입금)</label>
                    <select className="w-full p-3 rounded-xl bg-slate-50 border outline-none font-black text-[10px] md:text-xs text-center" value={activeToKey} onChange={e=>setTransferToId(e.target.value)}>
                      {transferOptions.filter(o => o.key !== activeFromKey).map(o=><option key={`to-${o.key}`} value={o.key}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-stretch gap-1.5 mt-2">
                    <input type="text" placeholder="이체 금액 입력" className={`flex-1 p-2.5 rounded-xl font-black text-xs outline-none border-2 focus:${t.border} text-right min-w-0`} value={toCommaString(investInput)} onChange={e=>setInvestInput(e.target.value.replace(/[^0-9]/g, ''))} />
                    <button onClick={() => { setInvestInput(String(fromOption?.balance || 0)); }} className="shrink-0 bg-slate-100 text-slate-600 px-3 rounded-xl font-black text-[10px] border border-slate-200 shadow-sm hover:bg-slate-200">전액</button>
                    <button onClick={(e) => {
                       const amount = toPureNumber(investInput);
                       if (amount <= 0) return showToast("⚠️ 금액을 입력해주세요.");
                       if (activeFromKey === activeToKey) return showToast("⚠️ 출발지와 도착지가 같습니다.");
                       if (!fromOption || fromOption.balance < amount) return showToast("⚠️ 출금 잔액이 부족합니다.");
                       saveStateToHistory();
                       let updatedAccs = [...accounts];
                       let updatedStocks = [...stocks];
                       // 출금
                       if (activeFromKey.startsWith('stock:')) {
                         const sid = activeFromKey.replace('stock:', '');
                         updatedStocks = updatedStocks.map(s => s.id === sid ? { ...s, quantity: String(toPureNumber(s.quantity) - amount) } : s);
                       } else {
                         const aid = activeFromKey.replace('acc:', '');
                         updatedAccs = updatedAccs.map(a => a.id === aid ? { ...a, cash: String(toPureNumber(a.cash) - amount) } : a);
                       }
                       // 입금
                       if (activeToKey.startsWith('stock:')) {
                         const sid = activeToKey.replace('stock:', '');
                         updatedStocks = updatedStocks.map(s => s.id === sid ? { ...s, quantity: String(toPureNumber(s.quantity) + amount) } : s);
                       } else {
                         const aid = activeToKey.replace('acc:', '');
                         updatedAccs = updatedAccs.map(a => a.id === aid ? { ...a, cash: String(toPureNumber(a.cash) + amount) } : a);
                       }
                       setAccounts(updatedAccs); setStocks(updatedStocks); setInvestInput('');
                       showToast(`✅ ₩${formatNum(amount)} 이체 완료!`);
                       saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                    }} className="bg-blue-500 text-white px-4 rounded-xl font-black text-[10px] md:text-xs shadow-sm hover:bg-blue-600">이체</button>
                  </div>
                </div>
                );
              })()}
            </div>
            {/* 🎯 바뀐 하단 확인 버튼 (클릭 시 모달 닫힘) */}
            <button onClick={() => setIsInvestModalOpen(false)} className="w-full bg-slate-800 text-white py-3 md:py-4 rounded-xl text-xs md:text-sm font-black shadow-lg hover:bg-slate-900 mt-auto shrink-0 transition-colors">확인</button>
          </div>
        </div>
      )}

      {isBatchBuyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-hidden" onClick={() => setIsBatchBuyModalOpen(false)}>
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h3 className={`font-black text-sm md:text-base flex justify-center w-full items-center gap-2 ${t.text} tracking-tighter`}><ShoppingCart size={16} className="md:w-[18px] md:h-[18px]"/> 일괄 매수 편집</h3><button onClick={() => setIsBatchBuyModalOpen(false)} className="absolute top-4 md:top-5 right-4 md:right-5 p-1 text-slate-400 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={16}/></button></div>
            <div className={`${t.light} p-3 md:p-4 rounded-xl md:rounded-2xl mb-4 flex justify-between items-center border ${t.border} shadow-sm`}><span className={`text-[10px] md:text-[11px] font-black ${t.text}`}>주문 가능 금액</span><span className={`text-lg md:text-xl font-black ${t.text}`}>₩{formatNum(currentAccountStat.cash)}</span></div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-4">
              {/* 🎯 모바일 2열(grid-cols-2) 병렬 구조 적용 */}
              <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                {currentAccountStat.rebalanceData.map(s => (
                  <div key={s.id} className="bg-slate-50 border border-slate-100 p-2 md:p-3 rounded-xl flex flex-col justify-between mb-1 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] md:text-[11px] font-bold text-slate-800 truncate pr-1">{s.name}</span>
                      <span className="text-[8px] md:text-[9px] text-slate-400 font-bold shrink-0">목표 {s.targetRatio}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-auto">
                      <input type="text" className="w-full text-right text-[10px] md:text-[11px] font-black text-slate-800 border border-slate-200 rounded p-1 outline-none focus:border-blue-400 min-w-0" value={batchBuyInputs[s.id] !== undefined ? batchBuyInputs[s.id] : ''} onChange={(e) => setBatchBuyInputs(p => ({...p, [s.id]: Number(e.target.value.replace(/[^0-9]/g, ''))}))} placeholder="0" />
                      <span className={`font-black text-[9px] md:text-[10px] ${t.text} shrink-0`}>주</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleBatchBuyConfirm} className={`w-full text-white py-3 md:py-4 rounded-xl text-xs md:text-sm font-black shadow-lg ${t.main} transition-colors shrink-0`}>설정한 수량으로 일괄 매수</button>
          </div>
        </div>
      )}

      {isRebalanceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-hidden" onClick={() => setIsRebalanceModalOpen(false)}>
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-2xl relative flex flex-col min-h-[480px] md:min-h-[500px] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsRebalanceModalOpen(false)} className="absolute top-4 md:top-5 right-4 md:right-5 p-1 text-slate-400 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={16}/></button>
            <h3 className={`font-black text-sm md:text-base mb-4 md:mb-5 flex justify-center w-full items-center gap-2 text-slate-800 tracking-tighter`}><Scale size={16} className="md:w-[18px] md:h-[18px]"/> 리밸런싱 가이드</h3>
            <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-xl shrink-0">
              <button onClick={() => setRebalanceTab('overview')} className={`flex-1 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black transition-all ${rebalanceTab === 'overview' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}>전체 현황</button>
              <button onClick={() => setRebalanceTab('sell')} className={`flex-1 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black transition-all ${rebalanceTab === 'sell' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}>매도</button>
              <button onClick={() => setRebalanceTab('buy')} className={`flex-1 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black transition-all ${rebalanceTab === 'buy' ? t.main : 'text-slate-500'}`}>매수</button>
              <div className={`px-2 py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black flex items-center justify-center border bg-white shadow-sm shrink-0 ${currentAccountStat.totalRatio !== 100 ? 'text-rose-500 border-rose-200' : 'text-slate-600 border-slate-200'}`}>총 {currentAccountStat.totalRatio}%</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-4 flex flex-col">
              {rebalanceTab === 'buy' && ( <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shrink-0"><span className="text-[10px] md:text-[11px] font-bold text-slate-500 whitespace-nowrap">추가 투자 금액</span><div className="flex-1 flex items-center gap-1"><span className="text-sm font-black text-slate-400">₩</span><input type="text" className="w-full text-right text-base md:text-lg font-black text-slate-800 outline-none bg-transparent" value={toCommaString(rebalanceInvestAmount)} onChange={e => setRebalanceInvestAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0"/></div></div> )}
              {rebalanceTab === 'sell' && ( <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shrink-0"><span className="text-[10px] md:text-[11px] font-bold text-slate-500">현재 주식 평가 금액</span><span className="text-base md:text-lg font-black text-slate-800">₩{formatNum(currentAccountStat.stockOnlyTotalValue)}</span></div> )}

              {/* 전체 현황 탭 */}
              {rebalanceTab === 'overview' && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500">총 평가금액</span>
                    <span className="text-sm font-black text-slate-800">₩{formatNum(currentAccountStat.stockOnlyTotalValue)}</span>
                  </div>
                  {currentAccountStat.rebalanceData.map(s => {
                    const currentValue = toPureNumber(s.currentPrice) * toPureNumber(s.quantity) * (s.isUSD ? toPureNumber(exchangeRate) : 1);
                    const currentRatio = currentAccountStat.stockOnlyTotalValue > 0 ? (currentValue / currentAccountStat.stockOnlyTotalValue) * 100 : 0;
                    const targetRatio = toPureNumber(s.targetRatio);
                    const ratioDiff = currentRatio - targetRatio;
                    const targetValue = currentAccountStat.stockOnlyTotalValue * (targetRatio / 100);
                    const valueDiff = currentValue - targetValue;
                    const isOver = ratioDiff > 0.5;
                    const isUnder = ratioDiff < -0.5;
                    return (
                      <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-black text-slate-800 truncate pr-2">{s.name}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${isOver ? 'bg-rose-50 text-rose-500' : isUnder ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isOver ? '▲ 초과' : isUnder ? '▼ 부족' : '✓ 적정'}
                          </span>
                        </div>
                        {/* 비중 바 */}
                        <div className="relative h-2 bg-slate-100 rounded-full mb-2 overflow-visible">
                          {/* 목표 비중 마커 */}
                          {targetRatio > 0 && (
                            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-slate-400 rounded-full z-10" style={{ left: `${Math.min(targetRatio, 100)}%` }} />
                          )}
                          {/* 현재 비중 바 */}
                          <div className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-400' : isUnder ? 'bg-blue-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(currentRatio, 100)}%` }} />
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400">현재 <span className="font-black text-slate-700">{currentRatio.toFixed(1)}%</span></span>
                            <span className="text-[9px] text-slate-300">|</span>
                            <span className="text-[9px] text-slate-400">목표 <span className="font-black text-slate-500">{targetRatio}%</span></span>
                          </div>
                          <span className={`text-[9px] font-black ${valueDiff > 0 ? 'text-rose-400' : valueDiff < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                            {valueDiff > 0 ? '+' : ''}{valueDiff !== 0 ? `₩${formatNum(Math.abs(Math.round(valueDiff)))}` : '균형'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 매도/매수 탭 */}
              {(rebalanceTab === 'sell' || rebalanceTab === 'buy') && (
                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                  {currentAccountStat.rebalanceData.map(s => {
                    const targetValue = (rebalanceTab === 'buy' ? currentAccountStat.stockOnlyTotalValue + toPureNumber(rebalanceInvestAmount) : currentAccountStat.stockOnlyTotalValue) * (toPureNumber(s.targetRatio) / 100);
                    const currentValue = toPureNumber(s.currentPrice) * toPureNumber(s.quantity) * (s.isUSD ? toPureNumber(exchangeRate) : 1);
                    const diff = targetValue - currentValue;
                    const sharesDiff = Math.floor(diff / (toPureNumber(s.currentPrice) * (s.isUSD ? toPureNumber(exchangeRate) : 1)));
                    if (rebalanceTab === 'sell' && sharesDiff >= 0) return null;
                    if (rebalanceTab === 'buy' && sharesDiff <= 0) return null;
                    return (
                      <div key={s.id} className="bg-white border border-slate-200 p-2 md:p-3 rounded-xl shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-1.5"><span className="text-[10px] md:text-[11px] font-bold text-slate-800 truncate pr-1">{s.name}</span><span className="text-[8px] md:text-[9px] text-slate-400 font-bold shrink-0">목표 {s.targetRatio}%</span></div>
                        <div className={`mt-auto text-center py-1.5 rounded-lg text-[9px] md:text-[10px] font-black ${sharesDiff > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                          {sharesDiff > 0 ? `+${formatNum(sharesDiff)}주 매수 필요` : `${formatNum(sharesDiff)}주 매도 필요`}
                        </div>
                        <div className="text-center mt-1 text-[8px] md:text-[9px] font-bold text-slate-400">오차 ₩{formatNum(Math.abs(diff))}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {rebalanceTab === 'buy' ? ( <button onClick={handleRebalanceBuyBatch} disabled={currentAccountStat.totalRatio !== 100 || toPureNumber(rebalanceInvestAmount) <= 0} className={`w-full text-white py-3 md:py-4 rounded-xl text-xs md:text-sm font-black shadow-lg ${t.main} transition-colors disabled:bg-slate-300 disabled:shadow-none mt-auto shrink-0`}>안내 수량 자동 매수 (주문가능금액 차감)</button> ) : ( <button onClick={() => setIsRebalanceModalOpen(false)} className={`w-full bg-slate-800 text-white py-3 md:py-4 rounded-xl text-xs md:text-sm font-black shadow-lg hover:bg-slate-900 transition-colors mt-auto shrink-0`}>확인 완료</button> )}
          </div>
        </div>
      )}

      {isGlobalDivModalOpen && (() => {
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth() + 1;
        const viewYear = batchYear || todayYear;
        const viewMonth = batchMonth || todayMonth;
        const mId = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;
        const rate = toPureNumber(exchangeRate) || 1392;

        // 배당일기: 현재 보유 종목 + 과거에 배당 기록이 있는 종목(매도했어도 기록 유지)
        const allStocksWithDiv = stocks.filter(s => {
          const acc = accounts.find(a => a.id === (s.accountId || 'default'));
          if (acc?.type === 'savings') return false;
          if (toPureNumber(s.divPerShare) <= 0) return false;
          if (divModalFilterAccId && s.accountId !== divModalFilterAccId) return false;
          return true;
        });
        // 이 달에 표시할 항목: 현재 보유 중이고 이 달 배당 예정인 것 OR 이미 timeline 기록이 있는 것
        const isPast = viewYear < todayYear || (viewYear === todayYear && viewMonth < todayMonth);
        const isCurrent = viewYear === todayYear && viewMonth === todayMonth;

        let scheduleItems;
        if (isPast) {
          // 과거: timeline에 실제 기록이 있는 종목만 (매도 종목 포함)
          // tradeLogs에서 해당 월 배당 기록으로 찾기 (timeline이 없어도 로그 있으면 표시)
          const paidInMonth = tradeLogs.filter(r => r.type === 'dividend' && r.date?.startsWith(mId));
          const paidNames = [...new Set(paidInMonth.map(r => r.name))];
          // timeline 기반 항목
          const timelineItems = allStocksWithDiv.filter(s => s.dividendTimeline?.[mId]);
          // tradeLogs에만 있는 항목 (이미 매도된 종목)
          const soldItems = paidNames
            .filter(name => !timelineItems.find(s => s.name === name))
            .map(name => {
              const logs = paidInMonth.filter(r => r.name === name);
              const total = logs.reduce((s,r) => s + toPureNumber(r.amount), 0);
              return { id: `sold_${name}`, name, isSold: true, amount: total };
            });
          scheduleItems = [
            ...timelineItems.map(s => ({ ...s, isSold: false })),
            ...soldItems,
          ];
        } else {
          // 현재/미래: 배당 예정인 종목
          scheduleItems = allStocksWithDiv.filter(s => isDivMonth(s, viewMonth)).map(s => ({ ...s, isSold: false }));
        }

        // 이번달 총합
        const totalExpected = scheduleItems.reduce((sum, s) => {
          if (s.isSold) return sum + s.amount;
          const qty = toPureNumber(s.quantity);
          const divPer = toPureNumber(s.divPerShare);
          const mult = s.isUSD ? rate : 1;
          const paid = toPureNumber(s.dividendTimeline?.[mId]);
          return sum + (paid || Math.round(qty * divPer * mult));
        }, 0);

        // 기록수정 탭용 종목목록 (현재 보유 divPerShare > 0)
        const divStocks = allStocksWithDiv;

        // 월 네비게이션 — 이전/다음 월
        const goPrev = () => { let y=viewYear,m=viewMonth-1; if(m<1){m=12;y--;} setBatchYear(y);setBatchMonth(m); };
        const goNext = () => { let y=viewYear,m=viewMonth+1; if(m>12){m=1;y++;} setBatchYear(y);setBatchMonth(m); };

        return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsGlobalDivModalOpen(false)}>
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] w-full max-w-sm md:max-w-md p-5 md:p-6 shadow-2xl flex flex-col max-h-[88vh] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsGlobalDivModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>

            <div className="flex justify-center items-center gap-1.5 mb-3">
              <PiggyBank className="text-orange-500" size={16}/>
              <h3 className="font-black text-sm md:text-base text-slate-800">배당 관리</h3>
            </div>

            {/* 탭 */}
            <div className="flex gap-1.5 mb-3 bg-slate-50 p-1 rounded-xl shrink-0">
              <button onClick={() => setDivInputView('schedule')} className={`flex-1 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${divInputView === 'schedule' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>📔 배당일기</button>
              <button onClick={() => setDivInputView('byStock')} className={`flex-1 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${divInputView === 'byStock' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>✏️ 기록 수정</button>
            </div>

            {/* 배당일기 탭 */}
            {divInputView === 'schedule' && (
              <>
                {/* 월 네비게이션 (스와이프 영역) */}
                <div
                  ref={divDiarySwipeRef}
                  className="flex items-center justify-between mb-2 shrink-0 touch-pan-y select-none"
                  onTouchStart={e => { if (divDiaryWheelLock.current) return; divDiaryTouchStart.current = e.touches[0].clientX; setDivDiarySlide({ dragX: 0, animDir: null }); }}
                  onTouchMove={e => { if (divDiaryTouchStart.current === null || divDiaryWheelLock.current) return; const dx = e.touches[0].clientX - divDiaryTouchStart.current; if (Math.abs(dx) > 8) setDivDiarySlide({ dragX: dx, animDir: null }); }}
                  onTouchEnd={e => {
                    if (divDiaryTouchStart.current === null || divDiaryWheelLock.current) return;
                    const dx = e.changedTouches[0].clientX - divDiaryTouchStart.current;
                    divDiaryTouchStart.current = null;
                    if (Math.abs(dx) < 40) { setDivDiarySlide({ dragX: 0, animDir: null }); return; }
                    const dir = dx < 0 ? 'left' : 'right';
                    divDiaryWheelLock.current = true;
                    setDivDiarySlide({ dragX: 0, animDir: dir });
                    setTimeout(() => { if (dir === 'left') goNext(); else goPrev(); setDivDiarySlide({ dragX: 0, animDir: null }); setTimeout(() => { divDiaryWheelLock.current = false; }, 400); }, 200);
                  }}
                >
                  <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 font-black text-lg">‹</button>
                  <div className="text-center">
                    <p className="text-[12px] font-black text-slate-800">{viewYear}년 {viewMonth}월</p>
                    <p className="text-[9px] text-slate-400">{isPast ? '받았던 배당' : isCurrent ? '이번달 예정' : '예정 배당'}</p>
                  </div>
                  <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 font-black text-lg">›</button>
                </div>

                {/* 총합 요약 */}
                {totalExpected > 0 && (
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-2.5 mb-3 flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-bold text-orange-500">{viewMonth}월 {isPast ? '수령 합계' : '예상 합계'}</span>
                    <span className="text-[14px] font-black text-orange-600">₩{formatNum(totalExpected)}</span>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1"
                  style={{ opacity: divDiarySlide.animDir ? 0 : 1, transition: divDiarySlide.animDir ? 'opacity 0.15s ease-out' : 'opacity 0.2s ease-in' }}>
                  {scheduleItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-[11px] font-bold">
                      {isPast ? `${viewMonth}월 배당 기록이 없습니다.` : `${viewMonth}월에 배당 예정인 종목이 없습니다.`}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {scheduleItems.map(s => {
                        if (s.isSold) {
                          return (
                            <div key={s.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex flex-col gap-1">
                              <p className="text-[10px] font-black text-slate-600 truncate">{s.name}</p>
                              <p className="text-[8px] text-slate-400">매도 종목 · 과거 기록</p>
                              <span className="text-[10px] font-black text-slate-500 mt-auto">₩{formatNum(Math.round(s.amount))}</span>
                            </div>
                          );
                        }
                        const qty = toPureNumber(s.quantity);
                        const divPer = toPureNumber(s.divPerShare);
                        const mult = s.isUSD ? rate : 1;
                        const expected = Math.round(qty * divPer * mult);
                        const alreadyPaid = !!s.dividendTimeline?.[mId];
                        const paidAmt = toPureNumber(s.dividendTimeline?.[mId] || 0);
                        const payDay = s.divDay === '말' ? '말일' : `${s.divDay}일`;
                        return (
                          <div key={s.id} className={`rounded-2xl border p-3 flex flex-col gap-1.5 ${alreadyPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="flex justify-between items-start">
                              <p className="text-[10px] font-black text-slate-800 truncate flex-1 mr-1">{s.name}</p>
                              {alreadyPaid
                                ? <span className="text-[8px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">✓ 완료</span>
                                : <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full shrink-0">{isPast ? '미기록' : '예정'}</span>
                              }
                            </div>
                            <p className="text-[8px] text-slate-400">{viewMonth}월 {payDay}</p>
                            <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-100">
                              <span className="text-[9px] font-black text-slate-700">₩{formatNum(alreadyPaid ? paidAmt : expected)}</span>
                              {alreadyPaid ? (
                                <button onClick={() => {
                                  saveStateToHistory();
                                  const newTimeline = { ...(s.dividendTimeline || {}) };
                                  delete newTimeline[mId];
                                  const updatedStocks = stocks.map(st => st.id === s.id ? { ...st, dividendTimeline: newTimeline } : st);
                                  const accId = s.accountId || 'default';
                                  const updatedAccs = accounts.map(a => a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) - paidAmt) } : a);
                                  setStocks(updatedStocks); setAccounts(updatedAccs);
                                  setTradeLogs(prev => prev.filter(r => !(r.type === 'dividend' && r.name === s.name && r.date?.startsWith(mId))));
                                  showToast('↩️ 배당 수령이 취소됐습니다.');
                                }} className="text-[8px] font-black text-slate-400 hover:text-rose-500 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-rose-50">취소</button>
                              ) : (
                                <button onClick={() => {
                                  saveStateToHistory();
                                  const updatedStocks = stocks.map(st => st.id === s.id ? { ...st, dividendTimeline: { ...(st.dividendTimeline||{}), [mId]: String(expected) } } : st);
                                  const accId = s.accountId || 'default';
                                  const updatedAccs = accounts.map(a => a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) + expected) } : a);
                                  setStocks(updatedStocks); setAccounts(updatedAccs);
                                  setTradeLogs(prev => [{ id: `div_m_${Date.now()}`, date: `${viewYear}-${String(viewMonth).padStart(2,'0')}-${String(s.divDay==='말'?new Date(viewYear,viewMonth,0).getDate():Number(s.divDay||15)).padStart(2,'0')}`, timestamp: Date.now(), type: 'dividend', name: s.name, amount: expected }, ...prev]);
                                  showToast('💰 배당금이 입금됐습니다!');
                                }} className={`${t.main} text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-sm`}>입금</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 기록 수정 탭 */}
            {divInputView === 'byStock' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="flex flex-col gap-2 pb-2">
                  {divStocks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-[11px] font-bold">배당 설정된 종목이 없습니다.</div>
                  ) : divStocks.map(s => {
                    const totalDiv = Object.values(s.dividendTimeline || {}).reduce((sum, v) => sum + toPureNumber(v), 0);
                    return (
                      <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => { setSelectedDivStock(s.id); setSubDivYear(new Date().getFullYear()); setTempTimelines({ [s.id]: { ...(s.dividendTimeline || {}) } }); setIsSubDivModalOpen(true); }}>
                        <div>
                          <p className="text-[11px] font-black text-slate-800">{s.name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">누적 ₩{formatNum(Math.round(totalDiv))}</p>
                        </div>
                        <span className="text-slate-300 text-sm">›</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {isSubDivModalOpen && (() => {
        const selStock = stocks.find(s => s.id === selectedDivStock);
        const timeline = tempTimelines[selectedDivStock] || {};
        // 이 종목에 기록된 연도 목록 + 현재 연도 포함
        const recordedYears = [...new Set(Object.keys(timeline).map(k => Number(k.slice(0,4))))];
        const allYears = [...new Set([...recordedYears, new Date().getFullYear()])].sort((a,b)=>b-a);
        const yearTotal = Object.entries(timeline)
          .filter(([k]) => Number(k.slice(0,4)) === subDivYear)
          .reduce((s,[,v]) => s + toPureNumber(v), 0);
        const todayMId = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
        const originalTimeline = selStock?.dividendTimeline || {};
        const handleSubDivSave = () => {
          saveStateToHistory();
          const edited = tempTimelines[selectedDivStock] || {};
          // 최종 타임라인 계산: 빈 문자열이면 원본 유지, '0'이면 키 삭제
          const newTimeline = { ...originalTimeline };
          Object.entries(edited).forEach(([k, v]) => {
            if (v === '' || v === undefined) {
              // 수정 없음 → 원본 유지 (아무 것도 안 함)
            } else if (v === '0' || v === 0) {
              delete newTimeline[k]; // 0원 입력 → 기록 삭제
            } else {
              newTimeline[k] = String(v);
            }
          });
          // 오늘 날짜 배당이 새로 생겼으면 계좌에도 입금
          const prevAmt = toPureNumber(originalTimeline[todayMId] || 0);
          const newAmt = toPureNumber(newTimeline[todayMId] || 0);
          const diff = newAmt - prevAmt;
          let updatedAccounts = accounts;
          if (diff !== 0 && selStock) {
            const accountId = selStock.accountId || 'default';
            updatedAccounts = accounts.map(a => a.id === accountId ? { ...a, cash: String(toPureNumber(a.cash) + diff) } : a);
            setAccounts(updatedAccounts);
          }
          setStocks(stocks.map(s => s.id === selectedDivStock ? { ...s, dividendTimeline: newTimeline } : s));
          setIsSubDivModalOpen(false);
          showToast('✅ 배당 기록이 수정됐습니다.');
        };
        return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999999] flex items-center justify-center p-4 animate-in zoom-in duration-200" onClick={() => setIsSubDivModalOpen(false)}>
          <div className="bg-white w-full max-w-xs md:max-w-sm rounded-[1.5rem] md:rounded-[2rem] p-5 shadow-2xl flex flex-col max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsSubDivModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
            <h3 className="font-black mb-1 text-sm text-slate-800 text-center">{selStock?.name}</h3>
            <p className="text-[9px] text-slate-400 text-center mb-3">배당 기록 수정 · 0원 입력 시 기록 삭제</p>

            {/* 연도 탭 스크롤 */}
            <div className="flex gap-1 mb-3 overflow-x-auto custom-scrollbar pb-0.5 shrink-0">
              {allYears.map(y => (
                <button key={y} type="button" onClick={() => setSubDivYear(y)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black shrink-0 transition-colors ${subDivYear === y ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {y}년
                </button>
              ))}
            </div>

            {/* 연간 합계 */}
            <div className="flex justify-between items-center bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 mb-3 shrink-0">
              <span className="text-[9px] font-bold text-orange-500">{subDivYear}년 배당 합계</span>
              <span className="text-[12px] font-black text-orange-600">₩{formatNum(Math.round(yearTotal))}</span>
            </div>

            {/* 3열 4행 그리드 (1~12월) */}
            <div className="grid grid-cols-3 gap-1.5 flex-1 overflow-y-auto custom-scrollbar pb-1">
              {Array.from({length:12},(_,i)=>i+1).map(month => {
                const mId = `${subDivYear}-${String(month).padStart(2,'0')}`;
                const originalVal = toPureNumber(originalTimeline[mId] || 0);
                const tempVal = tempTimelines[selectedDivStock]?.[mId];
                // tempVal이 undefined면 아직 손 안 댄 것 → 원본값 표시
                const displayVal = tempVal !== undefined ? tempVal : (originalVal > 0 ? String(originalVal) : '');
                const isModified = tempVal !== undefined;
                return (
                  <div key={mId} className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-500 text-center">{month}월</span>
                    <div className={`flex items-center bg-white border rounded-lg px-1.5 py-1 ${isModified ? 'border-orange-300' : 'border-slate-200'}`}>
                      <span className="text-[8px] text-slate-400 shrink-0">₩</span>
                      <input type="text"
                        className="w-full text-right text-[10px] font-black outline-none bg-transparent min-w-0"
                        value={isModified ? toCommaString(displayVal) : ''}
                        placeholder={originalVal > 0 ? formatNum(originalVal) : '0'}
                        style={{ color: isModified ? '#1e293b' : undefined }}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g,'');
                          setTempTimelines(prev => ({...prev, [selectedDivStock]: {...(prev[selectedDivStock]||{}), [mId]: v}}));
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={handleSubDivSave} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-xs shadow-md hover:bg-slate-900 transition-colors mt-3 shrink-0">수정 사항 반영하기</button>
          </div>
        </div>
        );
      })()}

      {/* 자동 배당 입금 요약 팝업 */}
      {isAutoDivModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl flex flex-col items-center">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-black text-base text-slate-800 mb-1">오늘의 배당금 입금 완료</h3>
            <p className="text-[10px] text-slate-400 mb-4">{new Date().getMonth()+1}월 {new Date().getDate()}일 자동 입금</p>
            <div className="w-full bg-slate-50 rounded-2xl p-3 mb-4 flex flex-col gap-1.5">
              {autoDivSummary.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-700 truncate pr-2">{item.name}</span>
                  <span className="text-[11px] font-black text-emerald-600 shrink-0">+₩{formatNum(Math.round(item.amount))}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-1.5 mt-0.5 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500">합계</span>
                <span className="text-[13px] font-black text-emerald-600">+₩{formatNum(Math.round(autoDivSummary.reduce((s,i)=>s+i.amount,0)))}</span>
              </div>
            </div>
            <button onClick={() => setIsAutoDivModalOpen(false)} className="w-full bg-slate-800 text-white py-3 rounded-xl font-black text-sm shadow-md hover:bg-slate-900 transition-colors">확인</button>
          </div>
        </div>
      )}
    </div>
    {/* 하단 탭바 — transform 스케일 밖에 배치해서 항상 화면 하단 고정 */}
    <div className="fixed bottom-0 left-0 right-0 z-[99999] flex justify-center pb-safe" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-md px-1.5 py-2 rounded-2xl shadow-lg border border-slate-200/80" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <button onClick={() => setActiveTab('portfolio')} className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${activeTab === 'portfolio' ? t.main : 'text-slate-400'}`}>📊 <span>포트폴리오</span></button>
        <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${activeTab === 'dashboard' ? t.main : 'text-slate-400'}`}>🏦 <span>내 자산</span></button>
        <button onClick={() => setActiveTab('yield')} className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${activeTab === 'yield' ? t.main : 'text-slate-400'}`}>🌱 <span>성장일기</span></button>
        <button onClick={() => setActiveTab('expense')} className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${activeTab === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'}`}>💰 <span>머니로그</span></button>
        <button onClick={() => setActiveTab('accountbook')} className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${activeTab === 'accountbook' ? t.main : 'text-slate-400'}`}>📔 <span>가계부</span></button>
      </div>
    </div>
    </>
  );
};

export default function AppWrapper() {
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  useEffect(() => {
    // 1. 이미 디자인 도구가 다운로드되었는지 확인
    if (document.getElementById('tailwind-cdn')) {
      setIsStyleLoaded(true);
      return;
    }

    // 2. 인터넷에서 Tailwind CSS 다운로드 요청
    const script = document.createElement('script');
    script.id = 'tailwind-cdn';
    script.src = 'https://cdn.tailwindcss.com';
    
    // 3. ✨ 핵심: 다운로드가 완료되면 그제서야 화면을 보여주도록 신호(true)를 보냄
    script.onload = () => setIsStyleLoaded(true); 
    document.head.appendChild(script);
  }, []);

  // 디자인이 도착하기 전 아주 짧은 찰나에 보여줄 로딩 화면 (초대형 이미지 폭주 방지)
  if (!isStyleLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
        예쁜 디자인을 입히는 중입니다... 🎨
      </div>
    );
  }

  // 디자인 로딩이 완료되면 정상적인 진짜 앱을 보여줌
  return (
    <ErrorBoundary>
      <style>{`
        @keyframes marqueeFlow { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        .animate-flow { display: inline-block; white-space: nowrap; animation: marqueeFlow 4s linear infinite; padding-right: 20px; }
      `}</style>
      <AppContent />
    </ErrorBoundary>
  );
}