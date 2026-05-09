import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Flame, LogOut, Target, Clock, Plus, Trash2, Search, TrendingUp, 
  ShoppingCart, X, Star, Sparkles, Heart, 
  PiggyBank, CalendarDays, Database, Edit2, CircleDollarSign, Briefcase, Camera, AlertCircle, Menu, Download, UploadCloud, ChevronRight, ChevronDown, Landmark, PieChart, Scale, Settings, RefreshCw, Upload, CreditCard
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
// Kongeramo 'Upload' muri lucide-react kugira ngo dukemure ikibazo cya ReferenceError

// --- [Supabase 클라우드 연동] ---
import { createClient } from '@supabase/supabase-js';

// ⚠️ 주의: 본인의 Supabase Project URL과 anon key로 반드시 변경하세요!
const supabaseUrl = 'https://slpzlgpbcetnspmjcqee.supabase.co';
const supabaseKey = 'sb_publishable_YjqpB1tMubbU4oV-ZGzOEw_TnVmGzqk';
const supabase = createClient(supabaseUrl, supabaseKey);
// 🎯 Edge Function을 통해 시세/지수 일괄 조회 (서버에서 Yahoo 호출, CORS 안전, 안정적)
const fetchMarketDataViaEdgeFn = async (symbols) => {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/get-market-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
  { id: 'etf_req10', name: 'TIGER 미국배당다우존스타겟데일리커버드콜', ticker: '476060', currentPrice: 10000, isUSD: false, isETF: true, tickerSuffix: '.KQ' },
  { id: 'etf_req11', name: 'TIGER 미국S&P500', ticker: '360750', currentPrice: 15000, isUSD: false, isETF: true },
  { id: 'etf_req12', name: 'ACE 미국하이일드액티브(H)', ticker: '466740', currentPrice: 10000, isUSD: false, isETF: true },
  { id: 'etf_req13', name: 'KODEX 한국부동산리츠인프라', ticker: '474920', currentPrice: 5000, isUSD: false, isETF: true },
  { id: 'etf_req14', name: 'KODEX 코스닥150', ticker: '229200', currentPrice: 12000, isUSD: false, isETF: true },
  { id: 'etf_req15', name: 'KODEX 코스피100', ticker: '237350', currentPrice: 25000, isUSD: false, isETF: true },
  { id: 'etf_req16', name: 'ACE KRX금현물', ticker: '411060', currentPrice: 13000, isUSD: false, isETF: true },
  { id: 'etf_req17', name: 'PLUS 미국고배당주액티브', ticker: '485080', currentPrice: 10000, isUSD: false, isETF: true },

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
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // 1. 계좌 탭 카드 외부 클릭 시 수정/삭제 툴팁 닫기
      if (!e.target.closest('.account-card-area')) {
        setActiveCardId(null);
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

  const [appTitle, setAppTitle] = useState('경준 부자 포트폴리오');
  const [appSubtitle, setAppSubtitle] = useState('Dream Big, Invest Smart');
  const [characterName, setCharacterName] = useState('경준');
  const [appTheme, setAppTheme] = useState('pink');
 
  
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
  const [selectedAccountId, setSelectedAccountId] = useState('default');

  // 🎯 accounts가 로드되거나 바뀌면, selectedAccountId가 실제 계좌 중 하나를 가리키도록 자동 동기화
  useEffect(() => {
    if (accounts.length === 0) return;
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
  // 상시 노출로 변경되어 activeChartLabels 상태가 제거되었습니다.
  const [pendingDivs, setPendingDivs] = useState({});
  const [pendingBuys, setPendingBuys] = useState({});
  const [pendingSells, setPendingSells] = useState({});
  
  const [activeDepositId, setActiveDepositId] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSourceId, setDepositSourceId] = useState('');
  
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [nbbangFilter, setNbbangFilter] = useState('person');
  const [expandedPersons, setExpandedPersons] = useState({}); 
  const [expandedRestaurants, setExpandedRestaurants] = useState({}); 
  const [editingNbbang, setEditingNbbang] = useState(null); 
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
  const [expectedReturn, setExpectedReturn] = useState('5');
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
  const [fixedExpenses, setFixedExpenses] = useState([]); // [{id, name, amount, day, category, paymentMethod, cardName}]
  const [showGoalModal, setShowGoalModal] = useState(false);
  useEffect(() => {
    document.body.style.removeProperty('transform');
    document.body.style.removeProperty('transform-origin');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('min-height');
    // zoom CSS 속성 대신 meta viewport scale로 처리 (모바일/트랙패드 스크롤 호환)
    document.documentElement.style.removeProperty('zoom');
    const scale = zoomLevel / 100;
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement('meta'); vp.name = 'viewport'; document.head.appendChild(vp); }
    vp.content = `width=device-width, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=5, viewport-fit=cover`;
  }, [zoomLevel]);
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
       } else {
          // 신규 가입자: 모든 데이터 빈 상태로 초기화
          await supabase.from('app_data').insert([{ user_id: user.id, global_cash: 0, settings: {}, history_records: [] }]);
          setGlobalCash(0);
          setAccounts([{ id: 'default', name: '메인 계좌', cash: "0", type: 'stock', label: '입출금 통장' }]);
          setStocks([]);
          setTradeLogs([]);
          setMyCards([]);
          setHistoryRecords([]);
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
         settings: { ...settings, monthlyGoals, fixedExpenses },
         updated_at: new Date().toISOString()
       }, { onConflict: 'user_id' });

       if (error) console.error("❌ 클라우드 저장 실패:", error);
    };

    const timeoutId = setTimeout(saveToCloud, 2000);
    return () => clearTimeout(timeoutId);
  }, [globalCash, accounts, stocks, tradeLogs, myCards, historyRecords, appTitle, appSubtitle, characterName, appTheme, profileImage, fireTarget, annualLimit, zoomLevel, exchangeRate, myDisplayName, session, isCloudDataLoaded, monthlyGoals, fixedExpenses]);

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
      };
    });
    setTradeLogs(prev => [...newLogs, ...prev]);
  }, [isCloudDataLoaded, fixedExpenses]);

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
    summary.forEach(({ name, amount }) => {
      setTradeLogs(prev => [{ id: `div_auto_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, date: `${todayYear}-${String(todayMonth).padStart(2,'0')}-${String(todayDay).padStart(2,'0')}`, timestamp: Date.now(), type: 'dividend', name, amount }, ...prev]);
    });
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
  const [isEditingWallet, setIsEditingWallet] = useState(false); 
  const [editWalletAmount, setEditWalletAmount] = useState('');   

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // Yahoo 실시간 검색 결과
  const [isSearching, setIsSearching] = useState(false);  // 검색 로딩 중
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
  const [activeTypePopup, setActiveTypePopup] = useState(null); // 하단 탭 더블클릭 팝업용 type key
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('stock');
  const [newLoanAmount, setNewLoanAmount] = useState('');
  const [newLoanRate, setNewLoanRate] = useState('');
  const [newLoanPayDay, setNewLoanPayDay] = useState('');
  const [newLoanPeriod, setNewLoanPeriod] = useState('');
  const [loanItemModal, setLoanItemModal] = useState({ isOpen: false, loanId: null, amount: '', rate: '', payDay: '', period: '', linkedAccId: '' });
  const [spendingChargeModal, setSpendingChargeModal] = useState({ isOpen: false, stockId: null, amount: '', fromAccId: '' });
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [editAccountName, setEditAccountName] = useState('');

  const [editingStockId, setEditingStockId] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null); // 모바일 터치(클릭) 상태 관리를 위한 변수
  const [newStock, setNewStock] = useState({
    name: '', ticker: '', buyPrice: '', quantity: '', targetRatio: '', isUSD: false,
    currentPrice: '', dividendTimeline: {}, divPerShare: '', divFreq: '월', divDay: '15', divMonths: [], divExDay: '1', divExMonths: [],
    maturityDate: '', interestRate: '', interestType: '단리', benefit: '',
    cardType: '체크', performance: '', isNbbang: false, cardPayDay: '', cardPeriod: '', cardLinkedAcc: 'wallet'
  });

  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const [batchYear, setBatchYear] = useState(currentYearNum);
  const [batchMonth, setBatchMonth] = useState(currentMonthNum);
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

  // 달력 트랙패드 가로 스와이프 (non-passive wheel + 슬라이드 애니메이션)
  useEffect(() => {
    const onWheel = (e) => {
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
        return { id: acc.id, name: acc.name, type: 'loan', cash: 0, loanAmount: toPureNumber(acc.loanAmount), loanRate: acc.loanRate || '', loanPayDay: acc.loanPayDay || '', loanPeriod: acc.loanPeriod || '', linkedAccId: acc.linkedAccId || '', totalValue: 0, rebalanceData: [], totalROI: 0, stockOnlyTotalValue: 0 };
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
           const rawLogs = (tradeLogs || []).filter(r => r.cardName === s.name && r.paymentMethod === '신용카드' && !r.isNbbang);
           const cardLogs = filterByCurrentMonth(rawLogs);
           // 전체 카드 사용금액: N빵 원본은 전체금액(perPersonShare*nbbangCount)으로 복원
           const totalUsed = cardLogs.reduce((sum, r) => {
             const full = (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare) * Number(r.nbbangCount) : toPureNumber(r.amount);
             return sum + full;
           }, 0);
           // N빵제외(내 몫만): 내 몫 금액(amount) 그대로
           const myUsed = cardLogs.reduce((sum, r) => sum + toPureNumber(r.amount), 0);
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
          const rawLogs = (tradeLogs || []).filter(r => r.cardName === s.name && r.paymentMethod === '신용카드' && !r.isNbbang);
          const cardLogs = filterByCurrentMonth(rawLogs);
          const myUsed = cardLogs.reduce((sum, r) => sum + toPureNumber(r.amount), 0);
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

  // FIRE: 과거 historyRecords 기반 CAGR 계산 (시세차익 기준 — 배당은 totalAssets에 이미 포함)
  const fireCAGR = useMemo(() => {
    const sorted = [...historyRecords].sort((a, b) => a.id.localeCompare(b.id));
    if (sorted.length < 2) return null;
    const oldest = sorted[0];
    const latest = sorted[sorted.length - 1];
    const yearsDiff = ((latest.year - oldest.year) * 12 + (latest.month - oldest.month)) / 12;
    if (yearsDiff <= 0 || oldest.invested <= 0 || latest.current <= 0) return null;
    // latest.current(totalAssets)에 계좌 현금이 포함 → 배당 입금분도 이미 반영됨
    const cagr = Math.pow(latest.current / oldest.invested, 1 / yearsDiff) - 1;
    return isFinite(cagr) && cagr > -1 ? parseFloat((cagr * 100).toFixed(1)) : null;
  }, [historyRecords]);

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

  // FIRE: CAGR이 계산되면 expectedReturn 기본값으로 자동 세팅 (사용자 수동 수정 우선)
  const fireCAGRApplied = useRef(false);
  useEffect(() => {
    if (fireCAGR !== null && !fireCAGRApplied.current) {
      setExpectedReturn(String(fireCAGR));
      fireCAGRApplied.current = true;
    }
  }, [fireCAGR]);

  // FIRE: 복리+저축+배당 월별 시뮬레이션으로 은퇴 기간 계산
  const fireYearsCalc = useMemo(() => {
    const r = toPureNumber(expectedReturn) / 100 / 12;
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

  // 성장일기 자동 동기화 
  useEffect(() => {
    if (globalStats.totalAssets === 0) return;
    const id = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;
    
    setHistoryRecords(prev => {
      const cur = prev.find(r => r.id === id);
      if (cur && cur.current === globalStats.totalAssets && cur.dividend === globalStats.globalReceivedDiv && cur.invested === globalStats.totalPrincipal && cur.profit === globalStats.globalProfit) {
        return prev;
      }
      const rec = { id, year: currentYearNum, month: currentMonthNum, invested: globalStats.totalPrincipal, current: globalStats.totalAssets, profit: globalStats.globalProfit, roi: globalStats.totalROI, dividend: globalStats.globalReceivedDiv };
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
      finalNbbangCount = validPeople.length + 1;
      if (finalNbbangCount > 1) {
        myShare = Math.floor(amt / finalNbbangCount);
        perPersonShare = Math.floor(amt / finalNbbangCount);
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
            if (!item || toPureNumber(item.quantity) < myShare) { showToast("⚠️ 잔액이 부족합니다."); return; }
            const benefit = toPureNumber(item.benefit) || 0;
            const accumulation = Math.floor(myShare * benefit / 100);
            updatedStocks = updatedStocks.map(s => s.id === spendingItem ? { ...s, quantity: String(toPureNumber(s.quantity) - myShare + accumulation) } : s);
            if (accumulation > 0) showToast(`✅ ₩${formatNum(accumulation)} 적립!`);
          } else {
            const srcAcc = updatedAccs.find(a => a.id === cashSource);
            if (!srcAcc || toPureNumber(srcAcc.cash) < myShare) { showToast("⚠️ 소비계좌 잔액이 부족합니다."); return; }
            updatedAccs = updatedAccs.map(a => a.id === cashSource ? { ...a, cash: String(toPureNumber(a.cash) - myShare) } : a);
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
        const linkedAccId = selectedCardInfo?.linkedAcc || selectedCardInfo?.cardLinkedAcc || '';
        const deductFrom = linkedAccId || '';
        if (deductFrom.startsWith('stock:')) {
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
      const myLog = { ...baseLog, id: Date.now().toString() + '_0', name: cleanLogName, isNbbang: false, amount: myShare };
      logsToAdd.push(myLog);
      const validPeople = nbbangList.filter(n => n.name.trim() !== '');
      validPeople.forEach((p, idx) => {
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
    setIncomeMode(null); setIncomeAmount(''); setIsNbbang(false); setExpenseMemo(''); setExpenseDateInput(''); setBonusDestAccId('');
    showToast(`🎉 ${logCat} 처리 완료!`);
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, updatedGlobalCash);
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
    setEditingStockId(null);
    setNewStock({
      name: '', ticker: '', buyPrice: '', quantity: '', targetRatio: '', isUSD: false,
      currentPrice: '', dividendTimeline: {}, divPerShare: '', divFreq: '월', divDay: '15', divMonths: [], divExDay: '1', divExMonths: [],
      maturityDate: '', interestRate: '', interestType: '단리', benefit: '',
      cardType: '체크', performance: '', isNbbang: false, cardPayDay: '', cardPeriod: '', cardLinkedAcc: 'wallet'
    });
    setSearchQuery('');
    setIsModalOpen(true);
  };

  const handleEditClick = (stock) => {
    setEditingStockId(stock.id);
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
    const updated = accounts.map(a => a.id === selectedAccountId ? { ...a, name: editAccountName } : a);
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
    if (!window.confirm('정말 이 계좌를 삭제하시겠습니까? (관련 주식은 별도 삭제 필요)')) return;
    
    // 🎯 화면 상태만 지우면 2초 뒤 자동 저장 엔진이 알아서 app_data에 덮어씁니다.
    setAccounts(prev => prev.filter(a => a.id !== id));
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
    let updatedGlobalCash = globalCash;

    if (investTab === 'wallet') {
      if (type === 'deposit') {
        updatedGlobalCash += amount;
        showToast(`✅ 지갑에 충전되었습니다.`);
      }
    } 
    else if (investTab === 'transfer') {
      const activeFromId = transferFromId || 'wallet';
      const activeToId = transferToId || (accounts[0] ? accounts[0].id : '');
      if (activeFromId === activeToId) return showToast("⚠️ 보내는 계좌와 받는 계좌가 같습니다.");

      // 1. 출금 처리
      if (activeFromId === 'wallet') {
        if (updatedGlobalCash < amount) return showToast("⚠️ 지갑 잔액이 부족합니다.");
        updatedGlobalCash -= amount;
      } else {
        const fromAcc = updatedAccs.find(a => a.id === activeFromId);
        if (!fromAcc || toPureNumber(fromAcc.cash) < amount) return showToast("⚠️ 출금 계좌의 잔액이 부족합니다.");
        updatedAccs = updatedAccs.map(a => a.id === activeFromId ? { ...a, cash: String(toPureNumber(a.cash) - amount) } : a);
      }

      // 2. 입금 처리
      if (activeToId === 'wallet') {
        updatedGlobalCash += amount;
      } else {
        updatedAccs = updatedAccs.map(a => a.id === activeToId ? { ...a, cash: String(toPureNumber(a.cash) + amount) } : a);
      }
      showToast(`✅ ₩${formatNum(amount)} 성공적으로 이체되었습니다.`);
    }

    setGlobalCash(updatedGlobalCash);
    setAccounts(updatedAccs); 
    setIsInvestModalOpen(false); 
    setInvestInput(''); 
    saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, updatedGlobalCash);
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

    // 🎯 에러 원인 1 완벽 차단: 아이폰 사진(HEIC) 등 호환되지 않는 포맷 튕겨내기
    if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
      showToast("⚠️ 아이폰 원본 사진(HEIC)은 분석할 수 없습니다.\n화면을 '스크린샷(캡처)'한 JPG/PNG 파일을 올려주세요!");
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
      return;
    }

    setIsOcrLoading(true);
    showToast("🔍 AI가 스크린샷을 판독 중입니다...\n(최초 실행 시 10~20초 소요)");

    try {
      // 🎯 에러 원인 2 해결: 최신/안정화된 Tesseract v5 엔진 사용 및 CORS 에러 방지
      if (!window.Tesseract) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          script.crossOrigin = 'anonymous'; 
          script.onload = resolve;
          script.onerror = () => reject(new Error("Tesseract 엔진 로드 실패"));
          document.head.appendChild(script);
        });
      }

      // OCR 텍스트 추출 실행
      const worker = await window.Tesseract.createWorker('kor+eng');
      const ret = await worker.recognize(file);
      const text = ret.data.text;
      await worker.terminate();

      // 정규식을 통한 종목명, 수량, 평단가 분석
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const foundStocks = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matchedDb = STOCK_DATABASE.find(db => line.replace(/\s/g, '').includes(db.name.replace(/\s/g, '')));

        if (matchedDb) {
           const searchContext = [line, lines[i+1], lines[i+2], lines[i+3]].filter(Boolean).join(' ');
           
           // 🎯 깐깐했던 Tesseract 정규식을 완화하여 인식률 대폭 향상
           const qtyMatch = searchContext.match(/([0-9,]+)\s*(주|좌|수량|보유|잔고)/) || searchContext.match(/수량\s*([0-9,]+)/);
           const priceMatch = searchContext.match(/([0-9,]+)\s*(원|USD)/) || searchContext.match(/평?단가?\s*[:\-]?\s*([0-9,]+)/) || searchContext.match(/매입가\s*([0-9,]+)/);

           if (qtyMatch) {
              const qty = Number(qtyMatch[1].replace(/,/g, ''));
              const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : Number(matchedDb.currentPrice);

              foundStocks.push({
                id: `ocr_${Date.now()}_${i}`,
                accountId: selectedAccountId,
                name: matchedDb.name,
                ticker: matchedDb.ticker,
                isUSD: matchedDb.isUSD,
                quantity: String(qty),
                buyPrice: String(price),
                currentPrice: String(matchedDb.currentPrice),
                targetRatio: '',
                dividendTimeline: {}, divPerShare: '', divFreq: '월', divDay: '15',
                interestRate: '', interestType: '단리'
              });
           }
        }
      }

      // Supabase DB 일괄 Insert 및 상태 즉시 반영
      if (foundStocks.length > 0) {
         // 🎯 임시 ID 사용 금지, 반드시 현재 로그인한 실제 유저 ID만 격리하여 사용
             const userIdToSave = session?.user?.id;
             if (!userIdToSave) {
                 showToast("⚠️ 로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
                 setIsOcrLoading(false);
                 return;
             }

         setStocks([...stocks, ...foundStocks]);
         setIsModalOpen(false);
         showToast(`✨ ${foundStocks.length}개의 종목을 완벽하게 자동 등록했습니다!`);
      } else {
         showToast("⚠️ 분석된 종목이나 수량이 없습니다.\n글자가 선명한 증권사 앱 잔고 화면을 올려주세요.");
      }

    } catch (err) {
      console.error(err);
      showToast("❌ 이미지 분석 중 오류가 발생했습니다. (새로고침 후 다시 시도)");
    } finally {
      setIsOcrLoading(false);
      if(ocrFileInputRef.current) ocrFileInputRef.current.value = '';
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
    const finalStock = { ...newStock, id, accountId: selectedAccountId }; 
    const updatedStocks = editingStockId ? stocks.map(s => s.id === id ? finalStock : s) : [...stocks, finalStock];
    
    setStocks(updatedStocks);

    if (!editingStockId) {
      const accountType = currentAccountStat?.type;
      if (accountType === 'stock') {
        const total = toPureNumber(finalStock.quantity) * toPureNumber(finalStock.buyPrice) * (finalStock.isUSD ? toPureNumber(exchangeRate) : 1);
        logTrade({ type: 'buy', name: finalStock.name, shares: toPureNumber(finalStock.quantity), price: finalStock.buyPrice, amount: total, total, isUSD: finalStock.isUSD });
      } else if (accountType === 'spending') {
        // 소비계좌 항목은 가계부 로그 없음
      } else {
        const amount = toPureNumber(finalStock.quantity);
        logTrade({ type: 'deposit', name: finalStock.name, amount, category: '저축/예금' });
      }
    }

    setIsModalOpen(false);
    showToast(editingStockId ? `✅ 수정되었습니다.` : `✅ 추가되었습니다.`);

  };

  const handleFormattedChange = (field, value) => {
    let clean = value.replace(/[^0-9.]/g, "");
    setNewStock(prev => ({ ...prev, [field]: clean }));
  };

  const openGlobalDivModal = (mode = 'schedule', stockId = null) => {
    if (stocks.length === 0) return showToast("⚠️ 항목을 추가해주세요.");
    const temp = {};
    stocks.forEach(s => { temp[s.id] = { ...(s.dividendTimeline || {}) }; });
    setTempTimelines(temp);
    setDivInputView('schedule'); // 항상 배당일기 탭으로 시작
    setBatchYear(new Date().getFullYear());
    setBatchMonth(new Date().getMonth() + 1);
    setSelectedDivStock(stockId || stocks[0]?.id || '');
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
  return (
    <div className={`min-h-screen ${t.bg} text-slate-800 pb-16 selection:bg-slate-200 transition-colors duration-500`} style={{ fontFamily: "'Pretendard', sans-serif", paddingBottom: 'max(64px, env(safe-area-inset-bottom))', paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        body { font-family: 'Pretendard', sans-serif !important; overflow-x: hidden; background-color: transparent; }
        .picture-card { background: white; border-radius: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.03); transition: transform 0.2s; }
        .bubbly-btn:active { transform: scale(0.96); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4">
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
          const parsed = Number(editFixedAmount.replace(/[^0-9]/g, ''));
          const dayNum = Number(editFixedDay);
          if (!parsed || !dayNum || dayNum < 1 || dayNum > 31) { showToast('금액과 날짜(일)를 올바르게 입력하세요'); return; }
          setFixedExpenses(fixedExpenses.map(f => f.id === fe.id ? { ...f, amount: parsed, day: dayNum, paymentMethod: editFixedPayment.method, cardName: editFixedPayment.cardName, transferAccId: editFixedPayment.transferAccId, isUSD: editFixedIsUSD } : f));
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
                    <input type="text" autoFocus className="flex-1 text-right text-[12px] font-black text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400" placeholder={editFixedIsUSD ? 'USD 금액' : '금액'} value={toCommaString(editFixedAmount)} onChange={e => setEditFixedAmount(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') doSave(); }} />
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 text-slate-700 border border-slate-200 px-5 py-3 rounded-2xl shadow-xl z-[999999] font-bold text-xs animate-in fade-in slide-in-from-bottom-4 flex items-center justify-center gap-3 w-[90%] max-w-sm cursor-pointer hover:bg-slate-50 transition-colors backdrop-blur-sm" onClick={dismissToast}>
          <span className="flex-1 text-center whitespace-pre-line">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="max-w-5xl mx-auto pt-6 pb-3 px-4 flex flex-col md:flex-row items-center md:items-stretch justify-between gap-3 md:gap-6 relative z-10">
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-center md:justify-start">
          <button onClick={() => setIsGlobalSettingsOpen(true)} className="p-1 text-slate-400 hover:text-slate-800 transition-colors shrink-0 -ml-1">
            <Menu size={20} strokeWidth={2.5} />
          </button>
          <div className={`w-[45px] h-[45px] sm:w-[55px] sm:h-[55px] rounded-full border-2 ${t.border} overflow-hidden shadow-md bg-white cursor-pointer relative group shrink-0`} onClick={openSettings} style={{ width: '45px', height: '45px', minWidth: '45px', minHeight: '45px' }}>
            <img src={profileImage} alt="Profile" className="w-full h-full object-cover group-hover:opacity-60 bg-white transition-opacity" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 text-white"><Camera size={14}/></div>
          </div>
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 min-h-[18px]">
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">{dateString}</span>
              {/* 🎯 기존 환율 대신 지수확인 버튼 신설 */}
              <button onClick={() => setShowIndices(!showIndices)} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-colors flex items-center gap-1 shrink-0">
                📈 {showIndices ? '닫기' : '지수확인'}
              </button>
              <button onClick={() => setIsFireModalOpen(true)} className="bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-md text-[9px] font-bold border border-rose-100 shadow-sm hover:bg-rose-100 transition-colors flex items-center gap-1 shrink-0">
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
          {/* 메뉴 탭 영역 */}
          <div className="bg-white p-1 sm:p-1.5 rounded-[1.25rem] sm:rounded-full flex shadow-sm border border-slate-200 w-full mx-auto md:mx-0 shrink-0 overflow-hidden">
            <button onClick={() => setActiveTab('portfolio')} className={`flex-1 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black transition-all whitespace-nowrap tracking-tighter ${activeTab === 'portfolio' ? t.main : 'text-slate-500 hover:bg-slate-50'}`}>📊 포트폴리오</button>
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black transition-all whitespace-nowrap tracking-tighter ${activeTab === 'dashboard' ? t.main : 'text-slate-500 hover:bg-slate-50'}`}>🏦 내 자산</button>
            <button onClick={() => setActiveTab('yield')} className={`flex-1 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black transition-all whitespace-nowrap tracking-tighter ${activeTab === 'yield' ? t.main : 'text-slate-500 hover:bg-slate-50'}`}>🌱 성장일기</button>
            <button onClick={() => setActiveTab('expense')} className={`flex-1 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black transition-all whitespace-nowrap tracking-tighter ${activeTab === 'expense' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>💰 머니로그</button>
            <button onClick={() => setActiveTab('accountbook')} className={`flex-1 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black transition-all whitespace-nowrap tracking-tighter ${activeTab === 'accountbook' ? t.main : 'text-slate-500 hover:bg-slate-50'}`}>📔 가계부</button>
          </div>
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

      {/* 계좌 선택 바 (포트폴리오 탭) */}
      {activeTab === 'portfolio' && (() => {
        const typeOrder = ['stock','savings','spending','card','loan'];
        const typeDot = { stock: t.main.split(' ')[0], savings: 'bg-emerald-400', spending: 'bg-rose-400', card: 'bg-purple-400', loan: 'bg-orange-400' };
        const typeActive = {
          stock: t.accStock,
          savings: 'bg-emerald-500 text-white shadow-sm',
          spending: 'bg-rose-500 text-white shadow-sm',
          card: 'bg-purple-500 text-white shadow-sm',
          loan: 'bg-orange-500 text-white shadow-sm',
        };
        const accsOfType = accounts.filter(a => a.type === portfolioTypeTab);
        const isAll = selectedAccountId === '__all__' + portfolioTypeTab;
        return (
          <div className="max-w-5xl mx-auto px-4 mb-3 mt-2 animate-in fade-in zoom-in duration-300 relative z-20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar">
              {/* 전체 버튼 */}
              <button
                onClick={() => setSelectedAccountId('__all__' + portfolioTypeTab)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all duration-200 shrink-0 whitespace-nowrap ${isAll ? typeActive[portfolioTypeTab] || typeActive.stock : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                전체
              </button>
              <div className="w-px h-4 bg-slate-100 shrink-0" />
              {/* 해당 타입 계좌들 */}
              {accsOfType.map((acc) => {
                const globalIndex = accounts.findIndex(a => a.id === acc.id);
                const isSelected = selectedAccountId === acc.id;
                return (
                  <div key={acc.id} className="account-card-area relative flex items-center shrink-0">
                    <button
                      draggable onDragStart={(e) => handleDragStart(e, globalIndex)} onDragEnter={(e) => handleDragEnter(e, globalIndex)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, globalIndex)} onDragEnd={handleDragEnd}
                      onClick={() => setSelectedAccountId(acc.id)}
                      onDoubleClick={(e) => { e.stopPropagation(); setActiveCardId(acc.id); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all duration-200 cursor-grab active:cursor-grabbing max-w-[140px] overflow-hidden ${isSelected ? typeActive[portfolioTypeTab] || typeActive.stock : 'text-slate-500 hover:bg-slate-50'} ${draggedAccIdx === globalIndex ? 'opacity-30 scale-95' : ''} ${activeCardId === acc.id ? 'ring-2 ring-inset ring-white/50' : ''}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white/70' : typeDot[portfolioTypeTab] || typeDot.stock}`} />
                      <span className="truncate">{acc.name}</span>
                    </button>
                    {activeCardId === acc.id && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-lg p-1 flex gap-1 shadow-xl z-50 animate-in fade-in zoom-in duration-200 after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-800">
                        <button onClick={(e) => { e.stopPropagation(); setEditAccountName(acc.name); setIsEditAccountOpen(true); setActiveCardId(null); }} className="p-1.5 hover:bg-indigo-500 rounded transition-colors"><Edit2 size={12}/></button>
                        {acc.id !== 'default' && <button onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id); setActiveCardId(null); }} className="p-1.5 hover:bg-rose-500 rounded transition-colors"><Trash2 size={12}/></button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 하단 플로팅 타입 탭 (포트폴리오 탭) */}
      {activeTab === 'portfolio' && (() => {
        const typeOrder = ['stock','savings','spending','card','loan'];
        const typeLabel = { stock: '주식', savings: '저축', spending: '소비', card: '카드', loan: '대출' };
        const typeEmoji = { stock: '📈', savings: '🏦', spending: '🛍️', card: '💳', loan: '💸' };
        const typeActive = {
          stock: t.main,
          savings: 'bg-emerald-500 text-white',
          spending: 'bg-rose-500 text-white',
          card: 'bg-purple-500 text-white',
          loan: 'bg-orange-500 text-white',
        };
        const existingTypes = typeOrder.filter(type => accounts.some(a => a.type === type));
        const allTypesAdded = existingTypes.length >= typeOrder.length;
        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300" onClick={() => setActiveTypePopup(null)}>
            <div className="flex items-center gap-1 bg-white/85 backdrop-blur-md px-2 py-2 rounded-2xl shadow-lg border border-slate-200/80" onClick={e => e.stopPropagation()}>
              {existingTypes.map(type => {
                const isActive = portfolioTypeTab === type;
                const isPopupOpen = activeTypePopup === type;
                return (
                  <div key={type} className="relative">
                    {/* 더블클릭 팝업 */}
                    {isPopupOpen && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-xl px-1 py-1 flex gap-1 shadow-xl z-50 animate-in fade-in zoom-in duration-150 whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-800">
                        <button onClick={(e) => { e.stopPropagation(); setNewAccountType(type); setNewAccountName(''); setIsAddAccountOpen(true); setActiveTypePopup(null); }} className="px-2 py-1 text-[10px] font-black hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1"><Plus size={10}/> 계좌추가</button>
                      </div>
                    )}
                    <button
                      onClick={() => { setActiveTypePopup(null); setPortfolioTypeTab(type); const first = accounts.find(a => a.type === type); if (first) setSelectedAccountId(first.id); }}
                      onDoubleClick={(e) => { e.stopPropagation(); setActiveTypePopup(isPopupOpen ? null : type); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all duration-200 whitespace-nowrap select-none ${isActive ? typeActive[type] + ' shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="text-[13px] leading-none">{typeEmoji[type]}</span>
                      <span>{typeLabel[type]}</span>
                    </button>
                  </div>
                );
              })}
              {!allTypesAdded && (
                <>
                  {existingTypes.length > 0 && <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => setIsAddAccountOpen(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all font-black shrink-0"
                  >
                    <Plus size={14} strokeWidth={2.5}/>
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })()}

      <main className="max-w-5xl mx-auto px-4 mt-2">
        {/* --- PORTFOLIO TAB --- */}
        {activeTab === 'portfolio' && (
          <div className="animate-in fade-in duration-500 pb-28">
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
                    <span className="text-[10px] sm:text-[11px] font-black text-orange-500 flex items-center gap-1 sm:gap-1.5 truncate"><CreditCard size={12} className="shrink-0"/><span className="truncate">엔빵 제외 카드 사용금액</span></span>
                  </div>
                  <div className="flex items-baseline gap-1 sm:gap-1.5 overflow-hidden"><span className="text-orange-400 text-xs sm:text-sm font-black shrink-0">₩</span><span className="text-[17px] sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none truncate py-1">{formatNum(currentAccountStat?.cardItemsNonNbbang)}</span></div>
                </div>
              </div>
            )}
            <div className={`grid grid-cols-2 gap-2 sm:gap-3 mb-4 ${['card','loan'].includes(currentAccountStat?.type) ? 'hidden' : ''}`}>
              {!['savings','spending','card','loan'].includes(currentAccountStat?.type) && <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 min-h-[70px] flex flex-col justify-center overflow-hidden relative col-span-1">
                 <div className="flex justify-between items-center mb-1">
                   <span className={`text-[10px] sm:text-[11px] font-black text-slate-500 flex items-center gap-1 sm:gap-1.5 truncate ${currentAccountStat?.type === 'savings' ? `cursor-pointer hover:${t.text} transition-colors group/label` : ''}`} onClick={() => { if(currentAccountStat?.type === 'savings') { setEditLabelInput(currentAccountStat.label || '입출금 통장'); setIsEditLabelModalOpen(true); } }}>
                     <PieChart size={12} className="shrink-0"/> <span className="truncate">[{currentAccountStat?.name}] {currentAccountStat?.type === 'savings' ? currentAccountStat.label : currentAccountStat?.type === 'spending' ? '소비 계좌' : '총 평가액'}</span>
                   </span>
                   <div className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black text-white shrink-0 ml-1 ${currentAccountStat?.type === 'stock' ? (currentAccountStat?.totalROI >= 0 ? t.main.split(' ')[0] : 'bg-blue-400') : 'opacity-0 invisible'}`}>
                     {currentAccountStat?.totalROI >= 0 ? '▲' : '▼'} {formatNum(Math.abs(currentAccountStat?.totalROI), 1)}%
                   </div>
                 </div>
                 <div className="flex items-baseline gap-1 sm:gap-1.5 overflow-hidden">
                   <span className="text-slate-400 text-xs sm:text-sm font-black shrink-0">₩</span>
                   {isEditingAccCash && ['savings','spending'].includes(currentAccountStat?.type) ? (
                      <div className="flex items-center gap-1 z-20"><input type="text" className="w-16 sm:w-24 text-right border-b border-slate-300 font-black text-slate-800 text-sm sm:text-xl outline-none bg-transparent" value={toCommaString(editAccCashAmount)} onChange={e => setEditAccCashAmount(e.target.value.replace(/[^0-9]/g, ''))} autoFocus /><button onClick={() => { const val = editAccCashAmount.trim() === '' ? currentAccountStat?.cash : toPureNumber(editAccCashAmount); setAccounts(accounts.map(a => a.id === selectedAccountId ? { ...a, cash: String(val) } : a)); setIsEditingAccCash(false); }} className={`${t.main} px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold`}>저장</button></div>
                   ) : (
                     <span className="text-[17px] sm:text-2xl font-black text-slate-800 tracking-tight leading-none cursor-pointer flex items-center gap-1.5 truncate py-1" onClick={() => { if(['savings','spending'].includes(currentAccountStat?.type)) { setEditAccCashAmount(''); setIsEditingAccCash(true); } }}>
                       {formatNum(['savings','spending'].includes(currentAccountStat?.type) ? currentAccountStat?.cash : (currentAccountStat?.totalValue || 0) + (currentAccountStat?.cash || 0))}
                       {['savings','spending'].includes(currentAccountStat?.type) && <Edit2 size={10} className="text-slate-300 hover:text-slate-500 shrink-0"/>}
                     </span>
                   )}
                   {currentAccountStat?.type === 'stock' && <span className="text-[8px] sm:text-[9px] font-black text-slate-400 ml-1 opacity-80 uppercase hidden sm:inline whitespace-nowrap">원금 ₩{formatNum(currentAccountStat?.totalInvestedKRW)}</span>}
                   {['savings','spending'].includes(currentAccountStat?.type) && !inlineConsume.isOpen && (
                     <div className="flex items-center gap-0.5 sm:gap-1 ml-auto shrink-0 relative -top-0.5">
                       <button onClick={(e) => { e.stopPropagation(); setInlineConsume({isOpen: true, amount: ''}) }} className={`${t.light} px-1.5 sm:px-2 py-1 rounded shadow-sm text-[8px] sm:text-[9px] font-black transition-colors`}>🛍️ 소비</button>
                       <button onClick={(e) => { e.stopPropagation(); setSavingsWithdrawModal({ isOpen: true, amount: '', targetAccId: '' }) }} className="bg-slate-100 text-slate-600 px-1.5 sm:px-2 py-1 rounded shadow-sm text-[8px] sm:text-[9px] font-black hover:bg-slate-200 transition-colors">💸 출금</button>
                     </div>
                   )}
                   {['savings','spending'].includes(currentAccountStat?.type) && inlineConsume.isOpen && (
                     <div className="flex items-center gap-1 ml-auto shrink-0 relative -top-0.5">
                       <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-50 rounded p-1 border border-slate-200">
                         <input type="text" className="w-12 sm:w-16 text-[9px] sm:text-[10px] p-0.5 rounded text-right outline-none text-slate-600 font-black bg-white" placeholder="금액" value={toCommaString(inlineConsume.amount)} onChange={e => setInlineConsume({...inlineConsume, amount: e.target.value.replace(/[^0-9]/g, '')})} autoFocus />
                         <button onClick={handleInlineConsumeConfirm} className={`${t.main} px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black whitespace-nowrap`}>확정</button>
                         <button onClick={() => setInlineConsume({isOpen: false, amount: ''})} className="bg-slate-200 text-slate-600 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black hover:bg-slate-300 whitespace-nowrap">취소</button>
                       </div>
                     </div>
                   )}
                 </div>
              </div>}

              <div className={`bg-white rounded-xl border border-orange-100 shadow-sm p-3 sm:p-4 min-h-[70px] flex flex-col justify-center overflow-hidden ${['savings','spending'].includes(currentAccountStat?.type) ? 'col-span-2' : 'col-span-1'}`}>
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] sm:text-[11px] font-black text-orange-500 flex items-center gap-1 sm:gap-1.5 truncate">
                     {currentAccountStat?.type === 'stock' ? <><Star size={12} className="shrink-0"/> <span className="truncate">예상 연 배당금</span></> : <><Landmark size={12} className="shrink-0"/> <span className="truncate">{currentAccountStat?.type === 'spending' ? '현재 잔액' : '현재 저축 합계'}</span></>}
                   </span>
                   {currentAccountStat?.type === 'stock' ? (
                     <div className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black border border-orange-100 text-orange-600 bg-orange-50 shrink-0 ml-1 ${currentAccountStat?.futureExpectedTotalROI >= 0 ? '' : 'text-blue-500 bg-blue-50 border-blue-100'}`}>
                       <span className="opacity-90 hidden lg:inline">배당포함</span> {formatNum(Math.abs(currentAccountStat?.futureExpectedTotalROI), 1)}%
                     </div>
                   ) : currentAccountStat?.type === 'savings' ? (
                     <div className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black shrink-0 ml-1 ${t.altText} ${t.altBgOnly}`}>
                       <span className="hidden sm:inline">만기 예상</span> ₩{formatNum(currentAccountStat?.savingsExpectedTotal)}
                     </div>
                   ) : null}
                 </div>
                 <div className="flex items-baseline gap-1 sm:gap-1.5 overflow-hidden">
                   <span className="text-orange-400 text-xs sm:text-sm font-black shrink-0">₩</span>
                   <span className="text-[17px] sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none truncate py-1">{formatNum(currentAccountStat?.type === 'stock' ? currentAccountStat?.futureTotalDiv : currentAccountStat?.type === 'spending' ? currentAccountStat?.spendingItemsTotal : currentAccountStat?.totalValue)}</span>
                   <span className={`text-[8px] sm:text-[9px] font-black text-slate-400 ml-1 opacity-80 uppercase hidden sm:inline whitespace-nowrap ${currentAccountStat?.type === 'savings' ? 'opacity-0 invisible' : ''}`}>누적 ₩{formatNum(currentAccountStat?.totalReceivedDivKRW)}</span>
                 </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-3 px-1 gap-1 w-full">
              <h3 className={`font-black text-slate-800 flex items-center gap-1 text-[11px] sm:text-sm h-[28px] shrink-0`}>
                <Heart size={14} className={t.text} /> 내 {currentAccountStat?.type === 'stock' ? '보유 종목' : currentAccountStat?.type === 'card' ? '카드 항목' : currentAccountStat?.type === 'spending' ? '소비 항목' : currentAccountStat?.type === 'loan' ? '대출 상품' : '저축 상품'}
              </h3>
              {currentAccountStat?.type === 'stock' && (
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 justify-end flex-1">
                  <span onClick={() => openTransferModal(currentAccountStat.id, '')} className="px-1.5 sm:px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] sm:text-[10px] font-black border border-blue-100 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors shrink-0 whitespace-nowrap">주문가능 ₩{formatNum(currentAccountStat?.cash)}</span>
                  <button onClick={() => openGlobalDivModal('batch')} className={`${t.light} px-1.5 sm:px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black shadow-sm whitespace-nowrap shrink-0`}>💰 배당관리</button>
<button onClick={() => { 
  const initial = {}; 
  const currentCash = toPureNumber(currentAccountStat?.cash || 0);
  const rate = toPureNumber(exchangeRate) || 1392;
  currentAccountStat?.rebalanceData.forEach(s => { 
    const targetR = toPureNumber(s.targetRatio);
    if(targetR > 0) {
      const allocated = currentCash * (targetR / 100);
      const curP = toPureNumber(s.currentPrice);
      const mult = s.isUSD ? rate : 1;
      const shares = (curP > 0 && mult > 0) ? Math.floor(allocated / (curP * mult)) : 0;
      if(shares > 0) initial[s.id] = shares;
    }
  }); 
  setBatchBuyInputs(initial); 
  setIsBatchBuyModalOpen(true); 
}} className={`bg-blue-500 text-white px-1.5 sm:px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black shadow-sm whitespace-nowrap flex items-center gap-1 shrink-0`}><ShoppingCart size={10}/> 일괄구매</button> 
<button onClick={() => setIsRebalanceModalOpen(true)} className={`${t.main} px-1.5 sm:px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black shadow-sm whitespace-nowrap flex items-center gap-1 hover:opacity-80 transition-opacity shrink-0`}><Scale size={10}/> 리밸런싱</button>
               </div>
              )}
            </div>

            {/* 대출 계좌: 새 항목 추가 버튼 (전체 모드 제외) */}
            {currentAccountStat?.type === 'loan' && !selectedAccountId.startsWith('__all__') && (
              <button onClick={() => setLoanItemModal({ isOpen: true, loanId: currentAccountStat.id, amount: currentAccountStat.loanAmount ? String(currentAccountStat.loanAmount) : '', rate: currentAccountStat.loanRate || '', payDay: currentAccountStat.loanPayDay || '', period: currentAccountStat.loanPeriod || '', linkedAccId: currentAccountStat.linkedAccId || '' })} className="w-full picture-card p-4 flex flex-col items-center justify-center bg-orange-50 border-2 border-dashed border-orange-200 transition-colors group min-h-[70px] mb-4">
                <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-1.5"><Plus className="text-orange-500" size={16} /></div>
                <span className="font-black text-[10px] text-orange-600">새 항목 추가</span>
              </button>
            )}
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
                              {isSavings && <button onClick={(e)=>{ e.stopPropagation(); setSavingsMaturityModal({ isOpen: true, targetId: s.id, finalAmount: String(Math.floor(toPureNumber(s.quantity) * (s.interestType==='복리'?Math.pow(1+toPureNumber(s.interestRate)/100,1):(1+toPureNumber(s.interestRate)/100)))) }); }} className="bg-amber-100 text-amber-600 px-1 md:px-1.5 py-0.5 rounded text-[7px] md:text-[8px] font-black shrink-0 ml-0.5 hover:bg-amber-200 transition-colors shadow-sm">🎉 만기</button>}
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
                              {isCard ? `${s.cardPayDay ? `결제 ${s.cardPayDay}일` : (s.cardType === '신용' ? '결제일 미설정' : '')}${s.cardPeriod ? ` · 기준 ${s.cardPeriod}일` : ''}` :isSpending ? `혜택 ${s.benefit || 0}%` : isSavings ? `${s.interestType} ${s.interestRate}%` : <>{s.targetRatio !== '' && s.targetRatio !== undefined ? `목표 ${s.targetRatio}% ` : ''}<span className="text-slate-500 font-black">({formatNum(s.currentRatio, 1)}%)</span></>}
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
                              const used = cardLogs.reduce((sum, r) => { const full = (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare)*Number(r.nbbangCount) : toPureNumber(r.amount); return sum + full; }, 0);
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
                            <div className="flex flex-col gap-0.5 min-w-0 w-full items-center"><span className="text-slate-800 font-black text-[11px] md:text-[12px] truncate">₩{formatNum(s.quantity)}</span></div>
                          ) : (<>
                          <div className="flex flex-col gap-0.5 min-w-0"><span className="text-slate-500 font-bold text-[8px] md:text-[9px] truncate">{isSavings ? `만기: ${s.maturityDate || '-'}` : `${s.isUSD ? '$' : '₩'}${formatNum(s.currentPrice, s.isUSD ? 2 : 0)}`}</span><span className="text-slate-800 font-black text-[9px] md:text-[10px] truncate">{isSavings ? `원금 ₩${formatNum(s.investedKRW)}` : `${formatNum(s.quantity)}주 보유`}</span></div>
                          <div className="flex flex-col items-end gap-0.5 ml-1 text-right min-w-0">{!isSavings ? (()=>{const curVal=toPureNumber(s.currentPrice)*toPureNumber(s.quantity)*(s.isUSD?toPureNumber(exchangeRate):1);const profitAmt=curVal-(s.investedKRW||0);const profitPct=s.stockROI;return(<><span className="text-slate-800 font-black text-[9px] md:text-[10px] truncate w-full">₩{formatNum(curVal)}</span><span className={`text-[8px] md:text-[9px] font-black ${isP?t.text:'text-blue-500'}`}>{isP?'+':''}{formatNum(profitAmt)} ({isP?'▲':'▼'}{formatNum(Math.abs(profitPct),1)}%)</span></>);})() : (<><span className="text-slate-800 font-black text-[9px] md:text-[10px] truncate w-full">₩{formatNum(s.quantity)}</span>{s.interestRate && <span className={`${t.altText} font-black text-[8px] md:text-[9px] truncate`}>예상 ₩{formatNum(Math.floor(s.interestType==='복리' ? toPureNumber(s.quantity)*Math.pow(1+toPureNumber(s.interestRate)/100,1) : toPureNumber(s.quantity)*(1+toPureNumber(s.interestRate)/100)))}</span>}</>)}</div>
                          </>)}
                        </div>
                        {!isCard && <div className="flex gap-1 h-[20px] md:h-[24px]">
                          {isSpending ? (
                            <div className="flex gap-1 w-full">
                              <button onClick={(e)=>{e.stopPropagation(); const savAccs = accounts.filter(a=>a.type==='savings'); const defaultFrom = s.linkedAccId || savAccs[0]?.id || ''; setSpendingChargeModal({ isOpen: true, stockId: s.id, amount: '', fromAccId: defaultFrom }); }} className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] md:text-[10px] font-black shadow-sm flex items-center justify-center gap-1 w-full whitespace-nowrap py-0.5 md:py-1">💳 충전</button>
                            </div>
                          ) : !isSavings ? ( <>
                            {pendingBuys[s.id] ? ( <div className="flex gap-1 flex-1"><input type="text" className={`w-8 md:w-10 flex-1 min-w-0 text-[9px] md:text-[10px] px-1 border rounded text-right outline-none font-black ${t.text} py-0.5 md:py-1`} placeholder="수량" value={buyAmount} onChange={e => setBuyAmount(e.target.value.replace(/[^0-9]/g, ''))} onClick={e => e.stopPropagation()} autoFocus /><button onClick={(e) => handleBuyStock(e, s.id, buyAmount)} className={`flex-[0.8] ${t.main} rounded text-[9px] md:text-[10px] font-black py-0.5 md:py-1 shadow-sm px-1.5 md:px-2`}>확인</button><button onClick={(e)=>{e.stopPropagation();setPendingBuys(p=>({...p,[s.id]:false}));}} className="bg-slate-200 text-slate-600 rounded px-1.5 md:px-2 text-[9px] md:text-[10px] font-black py-0.5 md:py-1 shrink-0">X</button></div> ) : 
                             pendingSells[s.id] ? ( <div className="flex gap-1 flex-1"><input type="text" className={`w-8 md:w-10 flex-1 min-w-0 text-[9px] md:text-[10px] px-1 border rounded text-right outline-none font-black text-slate-600 py-0.5 md:py-1`} placeholder="수량" value={sellAmount} onChange={e => setSellAmount(e.target.value.replace(/[^0-9]/g, ''))} onClick={e => e.stopPropagation()} autoFocus /><button onClick={(e) => { e.stopPropagation(); setSellAmount(s.quantity); }} className="px-1 md:px-1.5 bg-slate-200 text-slate-600 rounded text-[8px] md:text-[9px] font-black py-0.5 md:py-1 shrink-0 hover:bg-slate-300">전체</button><button onClick={(e) => handleSellStock(e, s.id, sellAmount)} className="flex-[0.8] bg-slate-500 text-white rounded text-[9px] md:text-[10px] font-black py-0.5 md:py-1 shadow-sm px-1.5 md:px-2 hover:bg-slate-600">확인</button><button onClick={(e)=>{e.stopPropagation();setPendingSells(p=>({...p,[s.id]:false}));}} className="bg-slate-200 text-slate-600 rounded px-1.5 md:px-2 text-[9px] md:text-[10px] font-black py-0.5 md:py-1 shrink-0">X</button></div> ) : (
                                <div className="flex gap-1 flex-1"><button onClick={(e)=>{e.stopPropagation();setPendingBuys(p=>({...p,[s.id]:true}));}} className={`flex-1 ${t.light} rounded text-[9px] md:text-[10px] font-black bubbly-btn py-0.5 md:py-1 shadow-sm`}>매수</button><button onClick={(e)=>{e.stopPropagation();setPendingSells(p=>({...p,[s.id]:true}));}} className="flex-1 bg-slate-50 text-slate-600 border border-slate-200 rounded text-[9px] md:text-[10px] font-black bubbly-btn py-0.5 md:py-1 shadow-sm hover:bg-slate-100">매도</button></div>
                             )}
                            {!pendingBuys[s.id] && !pendingSells[s.id] && toPureNumber(s.divPerShare) > 0 && ( pendingDivs[s.id] ? ( <div className="flex gap-1 flex-1"><button onClick={(e) => handleReceiveDividend(e, s)} className={`flex-1 ${t.main} rounded text-[9px] md:text-[10px] font-black shadow-md py-0.5 md:py-1 truncate px-1`}>+{formatNum(divAmount)}원</button><button onClick={(e)=>{e.stopPropagation();setPendingDivs(p=>({...p,[s.id]:false}));}} className="bg-slate-200 text-slate-600 rounded px-1.5 md:px-2 text-[9px] md:text-[10px] font-black py-0.5 md:py-1 shrink-0">X</button></div> ) : ( <button onClick={(e)=>{e.stopPropagation();setPendingDivs(p=>({...p,[s.id]:true}));}} className={`flex-1 ${t.light} rounded text-[9px] md:text-[10px] font-black shadow-sm bubbly-btn whitespace-nowrap py-0.5 md:py-1`}>💰 배당</button> ) )}
                          </> ) : (
                            <div className="flex gap-1 w-full">{activeDepositId === s.id ? ( <div className="flex gap-1 w-full">{availableSources.length > 1 ? ( <select className={`w-[35%] text-[8px] md:text-[9px] px-1 border rounded outline-none font-black ${t.altLight} shrink-0 text-right`} value={depositSourceId} onChange={e=>setDepositSourceId(e.target.value)} onClick={e=>e.stopPropagation()}>{availableSources.map(src => <option key={src.id} value={src.id}>{src.name}</option>)}</select> ) : ( <div className={`w-[35%] text-[8px] md:text-[9px] px-1 border rounded font-black ${t.altLight} flex items-center justify-center truncate shrink-0`}>{availableSources[0]?.name || '지갑'}</div> )}<input type="text" className={`flex-1 text-[9px] md:text-[10px] px-1 border rounded text-right outline-none font-black ${t.altText} py-0.5 md:py-1 min-w-0`} placeholder="금액" value={toCommaString(depositAmount)} onChange={e => setDepositAmount(e.target.value.replace(/[^0-9]/g, ''))} onClick={e => e.stopPropagation()} autoFocus /><button onClick={(e) => handleSavingsDeposit(e, s.id)} className={`${t.altMain} rounded text-[9px] md:text-[10px] font-black py-0.5 md:py-1 px-1 md:px-1.5 shadow-sm shrink-0`}>확인</button><button onClick={(e)=>{e.stopPropagation();setActiveDepositId(null);}} className="bg-slate-200 text-slate-600 rounded px-1 md:px-1.5 text-[9px] md:text-[10px] font-black py-0.5 md:py-1 shrink-0">X</button></div> ) : ( 
                              <div className="flex gap-1 w-full">
                                <button onClick={(e)=>{e.stopPropagation(); if(!canDeposit){ showToast("⚠️ 지갑이나 입출금 계좌에 잔액이 없습니다."); return; } setActiveDepositId(s.id);setDepositAmount('');setDepositSourceId(availableSources.find(a=>a.id === selectedAccountId)?.id || availableSources[0]?.id || 'wallet');}} className={`flex-1 ${t.altLight} border ${t.border} rounded text-[9px] md:text-[10px] font-black shadow-sm flex items-center justify-center gap-1 w-full whitespace-nowrap py-0.5 md:py-1`}><Landmark size={10} className="md:w-3 md:h-3"/> 저축하기</button>
                                <button onClick={(e)=>{ e.stopPropagation(); setItemWithdrawModal({ isOpen: true, targetId: s.id, amount: '', toAccId: 'wallet' }); }} className="flex-[0.4] bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] md:text-[10px] font-black shadow-sm hover:bg-slate-200 transition-colors py-0.5 md:py-1 shrink-0 flex items-center justify-center gap-1">💸 출금</button>
                              </div>
                            )}</div>
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
                  <button onClick={handleAddClick} className={`picture-card p-2 md:p-3 flex flex-col items-center justify-center ${t.light} border-dashed ${t.border} transition-colors group min-h-[90px] md:min-h-[110px]`}><div className={`bg-white p-2 md:p-2.5 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-1.5 md:mb-2`}><Plus className={t.text} size={14} className="md:w-4 md:h-4" /></div><span className={`font-black text-[10px] md:text-[11px] ${t.text}`}>{stocks.length === 0 ? '텅 비어있어요! 첫 항목 추가' : '새 항목 추가'}</span></button>
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
          <div className="animate-in fade-in duration-500 flex flex-col mt-2">
            {/* 상단 총자산 카드 */}
            <div className="flex flex-row gap-2 mb-4 items-stretch min-h-[85px] w-full shrink-0">
              <div className="bg-slate-800 rounded-xl p-3 text-white shadow-md flex flex-row flex-1 items-center gap-3 min-w-0">
                <div className="flex flex-col justify-center shrink-0 w-[40%] sm:w-[35%] border-r border-slate-600/50 pr-2 h-full">
                  <span className="text-slate-300 font-bold text-[9px] mb-1 flex items-center gap-1"><Briefcase size={10}/> 전체 총 자산</span>
                  <span className="text-[17px] sm:text-xl font-black break-words leading-tight mb-1">₩{formatNum(globalStats.totalAssets)}</span>
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
                return (
                  <button key={type} onClick={() => setDashboardTypeTab(isActive ? null : type)}
                    className={`text-left rounded-xl p-3.5 border transition-all duration-200 shadow-sm ${isActive ? c.activeBg + ' ' + c.activeBorder : 'bg-white border-slate-100 hover:border-slate-200'}`}
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

            {/* 선택된 타입의 계좌 리스트 */}
            {dashboardTypeTab && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
                  <span className={`text-[11px] font-black text-slate-500`}>{typeEmoji[dashboardTypeTab]} {typeLabel[dashboardTypeTab]} 계좌</span>
                  <button onClick={() => setDashboardTypeTab(null)} className="ml-auto text-slate-300 hover:text-slate-500 transition-colors"><X size={14}/></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {detailAccs.map(acc => {
                    const isLoan = acc.type === 'loan';
                    const isCard = acc.type === 'card';
                    const isSpending = acc.type === 'spending';
                    const mainVal = isLoan ? -acc.loanAmount : isCard ? -acc.cardItemsNonNbbang : isSpending ? acc.spendingItemsTotal : acc.totalValue + acc.cash;
                    const subLabel = isLoan ? '이자율' : isCard ? '총 사용액' : isSpending ? '잔여금' : '계좌 잔여금';
                    const subVal = isLoan ? (acc.loanRate ? `연 ${acc.loanRate}%` : '-') : isCard ? `-₩${formatNum(acc.cardItemsTotal)}` : `₩${formatNum(acc.cash)}`;
                    return (
                      <div key={acc.id} className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColor[acc.type]?.dot || 'bg-slate-300'}`} />
                          <span className="font-black text-[12px] text-slate-700 truncate">{acc.name}</span>
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
                  })}
                </div>
              </div>
            )}
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
           if (r.type === 'expense' && r.isNbbang) {
              const isMyShare = r.name.includes('(본인 몫)') || (cleanMyName && r.name.includes(`${cleanMyName} 몫`));
              const groupId = `${r.date}_${r.memo || 'nbbang'}`; // 🎯 고유 그룹키
              if (isMyShare && !processedNbbangIds.has(groupId)) {
                 processedNbbangIds.add(groupId);
                 myUniqueRecords.push({...r, amount: Number(r.amount || 0)}); // 🎯 전체 금액이 아닌 1인분만 저장!
              }
           } else {
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
          if (r.type === 'deposit') return; // 카드/계좌 입금은 수익 집계 제외
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
              onTouchStart={e => { if (calSwipeWheelLock.current) return; calSwipeTouchStart.current = e.touches[0].clientX; setCalSlide({ dragX: 0, animDir: null }); }}
              onTouchMove={e => {
                if (calSwipeTouchStart.current === null || calSwipeWheelLock.current) return;
                const dx = e.touches[0].clientX - calSwipeTouchStart.current;
                if (Math.abs(dx) > 8) setCalSlide({ dragX: dx, animDir: null });
              }}
              onTouchEnd={e => {
                if (calSwipeTouchStart.current === null || calSwipeWheelLock.current) return;
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
                      <button onClick={() => setShowYearSummary(true)} className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">📅 {calYear}년 요약</button>
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
                  {showYearSummary && (
                    <div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowYearSummary(false)}>
                      <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-black text-sm text-slate-800">📅 {calYear}년 요약</h3>
                          <button onClick={() => setShowYearSummary(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100"><span className="text-[10px] font-black text-emerald-600">급여</span><span className="font-black text-[12px] text-slate-800">₩{formatNum(stats.year.salary)}</span></div>
                          <div className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-xl border border-blue-100"><span className="text-[10px] font-black text-blue-600">수익</span><span className="font-black text-[12px] text-slate-800">₩{formatNum(stats.year.income)}</span></div>
                          <div className="flex justify-between items-center bg-purple-50 px-3 py-2 rounded-xl border border-purple-100"><span className="text-[10px] font-black text-purple-600">투자</span><span className="font-black text-[12px] text-slate-800">₩{formatNum(stats.year.invest)}</span></div>
                          <div className="flex justify-between items-center bg-rose-50 px-3 py-2 rounded-xl border border-rose-100"><span className="text-[10px] font-black text-rose-600">소비</span><span className="font-black text-[12px] text-slate-800">₩{formatNum(stats.year.expense)}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
                );
              })()}

              {/* 엔빵 정산소 탭 */}
              {accountbookTab === 'dutch' && (() => {
                const othersOweMe = nbbangRecords.filter(r => (r?.category === 'N빵' || r?.isNbbang) && !r?.isSettled);
                const totalOwed = othersOweMe.reduce((sum, r) => sum + Number(r?.amount || 0), 0);
                
                const groupedByPerson = {};
                othersOweMe.forEach(r => {
                   // 🎯 기존 괄호(몫) 데이터와 새로운 nbbangTarget 데이터를 모두 완벽 호환
                   const personName = r.nbbangTarget || (r.name||'').match(/\((.*?)\s*몫\)/)?.[1] || '일행';
                   if(!groupedByPerson[personName]) groupedByPerson[personName] = { total: 0, details: [] };
                   groupedByPerson[personName].total += Number(r.amount || 0);
                   groupedByPerson[personName].details.push(r);
                });

                const handleEditNbbangAmount = (logId, newAmount) => {
                   const amt = toPureNumber(newAmount);
                   if (amt < 0) return;
                   saveStateToHistory();
                   const updatedLogs = tradeLogs.map(r => String(r.id) === String(logId) ? { ...r, amount: amt } : r);
                   setTradeLogs(updatedLogs);
                   setEditingNbbang(null);
                   showToast('✅ 금액이 수정되었습니다.');
                };

                const handleSettleSelected = () => {
                   if (selectedPersonsToSettle.length === 0) return showToast('⚠️ 정산받을 인원을 클릭해서 선택해주세요.');
                   
                   const targets = othersOweMe.filter(r => {
                      const pName = r.nbbangTarget || (r.name||'').match(/\((.*?)\s*몫\)/)?.[1] || '일행';
                      return selectedPersonsToSettle.includes(pName);
                   });
                   
                   const amtToSettle = targets.reduce((sum, r) => sum + Number(r.amount || 0), 0);
                   saveStateToHistory();
                   const newCash = globalCash + amtToSettle;
                   setGlobalCash(newCash);
                   
                   // 🎯 1. 정산 기간 자동 생성 및 타이틀 로직
                   const dates = targets.map(r => new Date(r.date || r.timestamp || Date.now()));
                   const minDate = new Date(Math.min(...dates));
                   const maxDate = new Date(Math.max(...dates));
                   const batchTitle = `(${minDate.getMonth()+1}.${minDate.getDate()} ~ ${maxDate.getMonth()+1}.${maxDate.getDate()}) 정산내역`;
                   
                   const batchId = `batch_${Date.now()}`;
                   const updatedLogs = tradeLogs.map(r => {
                     if (targets.find(t => String(t.id) === String(r.id))) {
                         return { 
                             ...r, 
                             isSettled: true, 
                             settledBatchId: batchId,
                             settledBatchTitle: batchTitle,
                             settledStartDate: minDate.toISOString(),
                             settledEndDate: maxDate.toISOString()
                         };
                     }
                     return r;
                   });
                   
                   setTradeLogs(updatedLogs);
                   setSelectedPersonsToSettle([]); 
                   saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newCash);
                   showToast(`🎉 정산 완료! ₩${formatNum(amtToSettle)} 처리되었습니다.`);
                };

                const togglePersonSelection = (person) => {
                   setSelectedPersonsToSettle(prev => prev.includes(person) ? prev.filter(p => p !== person) : [...prev, person]);
                };

                const selectedTotal = othersOweMe.filter(r => {
                   const pName = r.nbbangTarget || (r.name||'').match(/\((.*?)\s*몫\)/)?.[1] || '일행';
                   return selectedPersonsToSettle.includes(pName);
                }).reduce((sum, r) => sum + Number(r.amount||0), 0);

                return (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                     <div className="flex justify-between items-center bg-purple-50 rounded-xl p-3 border border-purple-100 shadow-sm relative">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-black text-purple-600 truncate">미정산된 N빵 총액</span>
                          <span className="text-lg font-black text-purple-800 truncate">₩{formatNum(totalOwed)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setIsNameSettingOpen(!isNameSettingOpen)} className="bg-white border border-purple-200 text-purple-600 px-2 py-2 rounded-lg text-[9px] font-black shadow-sm hover:bg-purple-100 transition-colors whitespace-nowrap">
                            {myDisplayName ? `${myDisplayName}` : '👤 이름 설정'}
                          </button>
                          {isNameSettingOpen && (
                             <input type="text" className="absolute top-[110%] right-0 text-[10px] font-black text-purple-700 border border-purple-300 outline-none text-center w-24 bg-white px-2 py-2 rounded-lg shadow-xl z-10" placeholder="내 이름" value={myDisplayName} onChange={e=>setMyDisplayName(e.target.value)} autoFocus onBlur={()=>{ setIsNameSettingOpen(false); }} onKeyDown={e=>{ if(e.key==='Enter'){ setIsNameSettingOpen(false); } }} />
                          )}
                          <button onClick={handleSettleSelected} disabled={selectedPersonsToSettle.length === 0} className={`text-white px-3 py-2 rounded-lg text-[10px] font-black shadow-sm transition-all whitespace-nowrap ${selectedPersonsToSettle.length > 0 ? 'bg-emerald-500 hover:bg-emerald-600 animate-pulse' : 'bg-slate-300'}`}>
                            {selectedPersonsToSettle.length > 0 ? `₩${formatNum(selectedTotal)} 정산 완료` : '선택 정산하기'}
                          </button>
                        </div>
                     </div>

                     <div className="flex gap-2 mb-1 mt-1 bg-slate-50 p-1 rounded-lg">
                        <button onClick={() => { setNbbangFilter('person'); setIsSettledHistoryView(false); }} className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-colors ${nbbangFilter === 'person' && !isSettledHistoryView ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>인원별 모아보기</button>
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
                             {currentMonthBatches.map(batch => (
                                <div key={batch.id} className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-purple-300 flex flex-col justify-between">
                                   {/* 타이틀 및 총액 바 (클릭 시 아코디언 토글) */}
                                   <div className="flex justify-between items-start cursor-pointer mb-2" onClick={() => setExpandedBatches(p => ({...p, [batch.id]: !p[batch.id]}))}>
                                      <span className="text-[10px] font-black text-slate-800 flex items-start gap-1 leading-tight"><Heart size={10} className="text-purple-500 mt-0.5 shrink-0"/> {batch.title}</span>
                                      <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                                         <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">₩{formatNum(batch.total)}</span>
                                         {expandedBatches[batch.id] ? <ChevronDown size={12} className="text-slate-400"/> : <ChevronRight size={12} className="text-slate-400"/>}
                                      </div>
                                   </div>
                                   
                                   {/* 🎯 스크롤 없는 한눈에 보기 인원별 그리드 (가로 2열) */}
                                   {expandedBatches[batch.id] && (
                                      <div className="grid grid-cols-2 gap-1.5 mt-auto pt-2 border-t border-slate-200/60 animate-in slide-in-from-top-1">
                                         {Object.keys(batch.persons).map(pName => (
                                            <div key={pName} className="bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:bg-purple-50 transition-colors">
                                               <span className="text-[9px] font-bold text-slate-500 mb-0.5">{pName}</span>
                                               <span className="text-[10px] font-black text-slate-800">₩{formatNum(batch.persons[pName])}</span>
                                            </div>
                                         ))}
                                      </div>
                                   )}
                                </div>
                             ))}
                          </div>
                        );
                     })()
                     : othersOweMe.length === 0 ? (
                       <div className="text-center py-6 text-[10px] font-bold text-slate-400">받을 돈이 없습니다! 모두 정산 완료✨</div>
                     ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.keys(groupedByPerson).map(person => {
                            const isSelected = selectedPersonsToSettle && selectedPersonsToSettle.includes(person);
                            return (
                            // 🎯 선택 시 카드가 회색으로 변하고 취소선(strikethrough) 생성
                            <div key={person} onClick={() => togglePersonSelection(person)} className={`p-2 rounded-xl shadow-sm border transition-all cursor-pointer flex flex-col h-full ${isSelected ? 'bg-slate-200 border-slate-300 opacity-50 grayscale line-through' : 'bg-slate-50 border-slate-100 hover:border-purple-200'}`}>
                               <div className="text-center border-b border-slate-300 pb-1 mb-1">
                                 <span className="text-[11px] font-black text-slate-800"><Heart size={10} className={`inline ${isSelected?'text-slate-500':'text-purple-400'} relative -top-0.5`}/> {person}</span>
                                 <div className="text-[12px] font-black text-rose-500 mt-0.5">₩{formatNum(groupedByPerson[person].total)}</div>
                               </div>
                               <div className="grid grid-cols-2 gap-1.5 overflow-y-auto custom-scrollbar flex-1 max-h-[100px] p-0.5">
                                 {groupedByPerson[person].details.map(detail => (
                                   <div key={detail.id} className="text-[8px] flex flex-col justify-center bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm min-h-[38px] transition-colors" onClick={(e) => { e.stopPropagation(); if(!isSelected) setEditingNbbang({id: detail.id, amount: String(detail.amount)}); }}>
                                     {editingNbbang?.id === detail.id ? (
                                        <input type="text" className="w-full text-right outline-none bg-slate-100 px-1 rounded font-black text-blue-500 py-0.5" value={toCommaString(editingNbbang.amount)} autoFocus onBlur={()=>handleEditNbbangAmount(detail.id, editingNbbang.amount)} onChange={e=>setEditingNbbang({...editingNbbang, amount: e.target.value.replace(/[^0-9]/g, '')})} onKeyDown={e=>e.key==='Enter' && handleEditNbbangAmount(detail.id, editingNbbang.amount)}/>
                                     ) : (
                                        <>
                                          <span className="truncate w-full font-bold text-slate-500 mb-0.5">{detail.name.replace(`(${person} 몫)`, '').trim()}</span>
                                          <span className="font-black text-slate-700 text-right">₩{formatNum(detail.amount)}</span>
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
                      return r.name.includes('(본인 몫)') || (cleanMyName && r.name.includes(`${cleanMyName} 몫`));
                   }
                   return true;
                }).map(r => ({
                   ...r, 
                   name: r.name.replace(/\(.*?(몫|분)\)/g, '').replace(/\(N빵\)/g, '').trim(), 
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
                         const amt = (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare) * Number(r.nbbangCount) : toPureNumber(r.amount);
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
                           const periodFiltered = (tradeLogs || []).filter(r => r.cardName === c.name && (r.paymentMethod === '체크카드' || r.paymentMethod === '신용카드') && !r.isNbbang && (() => { const d = parseLocalDate(r.date || r.timestamp); return d && d.getFullYear() === calYear && d.getMonth() === calMonth; })());
                           const totalUsed = periodFiltered.reduce((sum, r) => { const full = (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare)*Number(r.nbbangCount) : toPureNumber(r.amount); return sum + full; }, 0);
                           const target = Number(c.target || 0);
                           const percent = target > 0 ? Math.min((totalUsed / target) * 100, 100) : 0;
                           const isReached = target > 0 && totalUsed >= target;
                           // 이번달/다음달 결제예정 분리: 이번달 = 현재 기준일 범위, 다음달 = 다음 기준일 범위
                           const [_curS, _curE] = getCardPeriodRange(c.period, calYear, calMonth);
                           const _nextS = _curE ? new Date(_curE.getFullYear(), _curE.getMonth(), _curE.getDate() + 1) : null;
                           const _nextE = _curE ? new Date(_curE.getFullYear(), _curE.getMonth() + 1, _curE.getDate()) : null;
                           const _allUnpaid = (tradeLogs || []).filter(r => r.cardName === c.name && r.paymentMethod === '신용카드' && !r.isPaid && !r.isNbbang);
                           const _toAmt = r => (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare) * Number(r.nbbangCount) : toPureNumber(r.amount);
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
                           const rawUsedLogs = (tradeLogs || []).filter(r => r.cardName === s.name && (r.paymentMethod === '체크카드' || r.paymentMethod === '신용카드') && !r.isNbbang);
                           const totalUsed = rawUsedLogs.filter(r => { const d = parseLocalDate(r.date || r.timestamp); return d && d.getFullYear() === calYear && d.getMonth() === calMonth; }).reduce((sum, r) => { const full = (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare)*Number(r.nbbangCount) : toPureNumber(r.amount); return sum + full; }, 0);
                           const target = toPureNumber(s.performance);
                           // 이번달/다음달 결제예정 분리: 이번달 = 현재 기준일 범위, 다음달 = 다음 기준일 범위
                           const [_cs2, _ce2] = getCardPeriodRange(s.cardPeriod, calYear, calMonth);
                           const _ns2 = _ce2 ? new Date(_ce2.getFullYear(), _ce2.getMonth(), _ce2.getDate() + 1) : null;
                           const _ne2 = _ce2 ? new Date(_ce2.getFullYear(), _ce2.getMonth() + 1, _ce2.getDate()) : null;
                           const _unpaid2 = (tradeLogs || []).filter(r => r.cardName === s.name && r.paymentMethod === '신용카드' && !r.isPaid && !r.isNbbang);
                           const _toAmt2 = r => (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare) * Number(r.nbbangCount) : toPureNumber(r.amount);
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
                         const nbbangTotal = (log.nbbangCount > 1 && log.perPersonShare) ? Number(log.perPersonShare) * Number(log.nbbangCount) : null;
                         // 항상 전체금액 표시 (N빵이면 카드 실제 결제금액 = perPersonShare * nbbangCount)
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
                                 <button onClick={() => { if (!window.confirm(`₩${formatNum(totalUnpaid)} 전액을 결제하시겠습니까?`)) return; handleAutoPayCard(prepayModalState.cardName, totalUnpaid); closeModal(); }}
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
                                         if (!window.confirm(`₩${formatNum(log.combinedAmount)} 결제하시겠습니까?`)) return;
                                         handlePaySingleItem(log);
                                         setPrepaySelectedKey(null);
                                       }}
                                       onDoubleClick={() => { setPrepayEditKey(isEditing ? null : itemKey); setPrepaySelectedKey(null); }}
                                       className={`p-2 rounded-xl border shadow-sm transition-all flex flex-col gap-0.5 cursor-pointer ${isEditing ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200' : isActive ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : isPaidItem ? 'border-slate-100 bg-slate-50 opacity-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                                       <div className="flex items-center justify-between gap-1">
                                         <span className="text-[9px] font-black text-slate-800 truncate leading-tight flex-1">{log.displayTitle}</span>
                                         <div className="flex items-center gap-0.5 shrink-0">
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
                                           <div className="flex gap-1 mt-1 animate-in fade-in duration-150" onClick={e => e.stopPropagation()}>
                                             <button onClick={() => handleDeleteItem(log)} className="flex-1 py-1 bg-rose-500 text-white rounded-lg text-[8px] font-black hover:bg-rose-600 active:scale-95 transition-all">🗑 삭제</button>
                                             <button onClick={() => setPrepayEditKey(null)} className="flex-1 py-1 bg-slate-200 text-slate-600 rounded-lg text-[8px] font-black hover:bg-slate-300 active:scale-95 transition-all">취소</button>
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
              <>
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
                      onTouchStart={e => { if (calSwipeWheelLock.current) return; calSwipeTouchStart.current = e.touches[0].clientX; setCalSlide({ dragX: 0, animDir: null }); }}
                      onTouchMove={e => {
                        if (calSwipeTouchStart.current === null || calSwipeWheelLock.current) return;
                        const dx = e.touches[0].clientX - calSwipeTouchStart.current;
                        if (Math.abs(dx) > 8) setCalSlide({ dragX: dx, animDir: null });
                      }}
                      onTouchEnd={e => {
                        if (calSwipeTouchStart.current === null || calSwipeWheelLock.current) return;
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
                    r?.category !== '카드대금' && !r?.isNbbang
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
              </>
            )}
          </div>
        );
      })()}
        {/* --- YIELD TAB --- */}
        {activeTab === 'yield' && (() => {
          // 🎯 원형 차트에 들어갈 자산 데이터 계산 (현금, 저축, 주식 각각 분리)
          // 🎯 다양한 색상 팔레트 적용
          // 🎯 세련된 파스텔/네온톤 팔레트로 전면 교체
          const pieColors = ['#fb7185', '#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#f472b6', '#2dd4bf', '#818cf8', '#fb923c', '#60a5fa', '#94a3b8', '#ec4899'];
          const pieData = [
            ...accounts.filter(a => a.type === 'savings').map((a, i) => ({ name: a.name, value: Number(a.cash), color: pieColors[i % pieColors.length] })),
            ...stocks.map((s, i) => ({ name: s.name, value: Number(s.quantity) * Number(s.currentPrice) * (s.isUSD ? toPureNumber(exchangeRate) : 1), color: pieColors[(i + accounts.filter(a=>a.type==='savings').length) % pieColors.length] }))
          ].filter(d => d.value > 0).sort((a,b) => b.value - a.value);

          return (
            <section className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm min-h-[400px] mt-2 animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <div>
                  <h2 className={`font-bold text-sm sm:text-base ${t.text} flex items-center gap-1.5 whitespace-nowrap`}><CalendarDays size={16}/> 🌱 {characterName} 성장일기</h2>
                  <p className="text-[9px] font-bold text-slate-500 mt-1">총 자산: <span className={`font-black ${t.text}`}>₩{formatNum(globalStats.totalAssets)}</span></p>
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
                    <span className="text-[13px] md:text-[16px] font-black text-slate-700">₩{formatNum(globalStats.totalAssets)}</span>
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
                        <span className="text-[12px] md:text-[14px] font-black text-slate-800">{((item.value / globalStats.totalAssets) * 100).toFixed(1)}%</span>
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
            r.type === 'expense' && !r.isNbbang && r.category !== '카드대금' && r.category !== '투자/저축' && r.category !== '고정비'
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
                      const savingsAccs = accounts.filter(a => a.type === 'savings');
                      const savingsStocks = stocks.filter(s => accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'savings');
                      const allDest = [
                        ...savingsAccs.map(a => ({ key: `acc:${a.id}`, label: `🏦 ${a.name}`, sub: `₩${formatNum(a.cash)}`, isSalary: a.name.includes('월급') })),
                        ...savingsStocks.map(s => ({ key: `stock:${s.id}`, label: `🏦 ${s.name}`, sub: `₩${formatNum(toPureNumber(s.quantity))}`, isSalary: s.name.includes('월급') })),
                      ].sort((a, b) => (b.isSalary ? 1 : 0) - (a.isSalary ? 1 : 0));
                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {allDest.map(d => (
                            <button key={d.key} type="button" onClick={() => setBonusDestAccId(bonusDestAccId === d.key ? '' : d.key)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${bonusDestAccId === d.key ? 'bg-emerald-500 text-white border-emerald-500' : d.isSalary ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                              {d.label} <span className="opacity-70">{d.sub}</span>
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
                          {accounts.filter(a => a.type === 'savings').map(a => (
                            <button key={a.id} type="button" onClick={() => setBonusDestAccId(bonusDestAccId === `acc:${a.id}` ? '' : `acc:${a.id}`)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${bonusDestAccId === `acc:${a.id}` ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                              🏦 {a.name} <span className="opacity-70">₩{formatNum(a.cash)}</span>
                            </button>
                          ))}
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
                            {['식비', '생필품', '의류비', '공과금'].includes(expenseCategory) ? (
                              <select className="w-full text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                                <option value="식비">식비</option><option value="생필품">생필품</option><option value="의류비">의류비</option><option value="공과금">공과금</option><option value="기타">기타</option>
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
                            const rawLogs = (tradeLogs || []).filter(r => r.cardName === selectedCard && (r.paymentMethod === '체크카드' || r.paymentMethod === '신용카드') && !r.isNbbang);
                            const totalUsed = filterByCurrentMonth(rawLogs).reduce((sum, r) => {
                              const full = (r.nbbangCount > 1 && r.perPersonShare) ? Number(r.perPersonShare) * Number(r.nbbangCount) : toPureNumber(r.amount);
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
                                onClick={() => { setCashSource(cashSource === a.id ? '' : a.id); setSelectedCard(''); setSpendingItem(''); }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${cashSource === a.id ? 'bg-rose-500 text-white border-rose-500' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}>
                                🛍️ {a.name} <span className="opacity-70">₩{formatNum(a.cash)}</span>
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
                          return (
                            <div className="flex flex-wrap gap-1.5 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                              <span className="w-full text-[9px] font-black text-rose-400 mb-0.5">결제 수단 선택 (선택 안 하면 계좌 잔액에서 차감)</span>
                              {items.length === 0 ? (
                                <span className="text-[9px] text-slate-400 font-bold">이 소비계좌에 저장된 항목이 없습니다</span>
                              ) : (
                                items.map(s => (
                                  <button key={s.id} type="button"
                                    onClick={() => setSpendingItem(spendingItem === s.id ? '' : s.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${spendingItem === s.id ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-100'}`}>
                                    {s.name} <span className="text-[9px] opacity-70">₩{formatNum(s.quantity)}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          );
                        })()}
                        {paymentMethod === '현금' && cashSource === 'transfer' && (() => {
                          const savingsAccounts = accounts.filter(a => a.type === 'savings');
                          const savingsStocks = stocks.filter(s => {
                            const acc = accounts.find(a => a.id === (s.accountId || 'default'));
                            return acc?.type === 'savings';
                          });
                          return (
                            <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <span className="w-full text-[9px] font-black text-slate-400 mb-0.5">출금 항목 선택</span>
                              {savingsAccounts.map(a => (
                                <button key={`acc-${a.id}`} type="button"
                                  onClick={() => setTransferAccId(transferAccId === `acc:${a.id}` ? '' : `acc:${a.id}`)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${transferAccId === `acc:${a.id}` ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                                  🏦 {a.name} <span className="opacity-70">₩{formatNum(a.cash)}</span>
                                </button>
                              ))}
                              {savingsStocks.map(s => (
                                <button key={`stk-${s.id}`} type="button"
                                  onClick={() => setTransferAccId(transferAccId === `stock:${s.id}` ? '' : `stock:${s.id}`)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${transferAccId === `stock:${s.id}` ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                                  🏦 {s.name} <span className="opacity-70">₩{formatNum(toPureNumber(s.quantity))}</span>
                                </button>
                              ))}
                              {savingsAccounts.length === 0 && savingsStocks.length === 0 && (
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
                                  <span className="text-[9px] font-black text-purple-600">총 인원 설정 (본인 제외)</span>
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
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (index < nbbangList.length - 1) document.getElementById(`ec-nbbang-input-${index + 1}`)?.focus(); } }}
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
                            setFixedExpenses([...fixedExpenses, { id: Date.now().toString(), name, amount: amt, day, paymentMethod: newFixedPayment.method, cardName: newFixedPayment.cardName, transferAccId: newFixedPayment.transferAccId, isUSD: newFixedIsUSD }]);
                            setNewFixedName(''); setNewFixedSub(''); setNewFixedAmount(''); setNewFixedDay(''); setNewFixedPayment({ method: '현금', cardName: '', transferAccId: '' }); setNewFixedIsUSD(false);
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
                                <input id="fixedAmtInput" type="text" className="flex-1 min-w-0 text-right text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-amber-400 bg-white" placeholder={newFixedIsUSD ? 'USD 금액' : '금액'} value={toCommaString(newFixedAmount)} onChange={e => setNewFixedAmount(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('fixedDayInput')?.focus(); }} />
                                <input id="fixedDayInput" type="text" inputMode="numeric" className="w-[46px] text-center text-[10px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-amber-400 bg-white shrink-0" placeholder="일" value={newFixedDay} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); if (Number(v) <= 31) setNewFixedDay(v); }} onKeyDown={e => { if (e.key === 'Enter') doRegister(); }} />
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
                        {/* 고정비 목록 — 대분류 카드, 수에 따라 유동 크기 */}
                        {fixedExpenses.length === 0 ? (
                          <div className="text-center text-[9px] text-slate-400 py-4 bg-slate-50/60 rounded-lg border border-dashed border-slate-200 mt-1">
                            📌 등록된 고정비가 없습니다
                          </div>
                        ) : (() => {
                          // 대분류명 기반 이모지
                          const catIconMap = {
                            '월세/관리비/공과금': '🏠', '관리비': '🏠', '월세': '🏠', '공과금': '🏠',
                            '구독료/통신비': '📱', '구독료': '📱', '통신비': '📱',
                            '보험료/교육비/교통비': '🛡️', '보험료': '🛡️', '교육비': '📚', '교통비': '🚌',
                            '대출상환': '💰', '대출': '💰',
                          };
                          const getFeIcon = (fe) => {
                            const dashIdx = fe.name.indexOf('-');
                            const cat = dashIdx > 0 ? fe.name.slice(0, dashIdx).trim() : fe.name.trim();
                            return catIconMap[cat] || '📌';
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
                          const totalMonthly = fixedExpenses.reduce((s, fe) => s + (fe.isUSD ? Math.round(Number(fe.amount) * (exchangeRate || 1350)) : Number(fe.amount)), 0);
                          return (
                            <div className="flex flex-col gap-1.5 mt-2">
                              <div className="flex items-center justify-between px-0.5 mb-0.5">
                                <span className="text-[9px] font-bold text-slate-400">총 {fixedExpenses.length}건</span>
                                <span className="text-[10px] font-black text-slate-700">월 ₩{formatNum(totalMonthly)}</span>
                              </div>
                              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <div className="flex flex-col divide-y divide-slate-50">
                                  {fixedExpenses.map(fe => {
                                    const krwAmt = fe.isUSD ? Math.round(Number(fe.amount) * (exchangeRate || 1350)) : Number(fe.amount);
                                    const icon = getFeIcon(fe);
                                    const subLabel = getFeSubLabel(fe);
                                    return (
                                      <div key={fe.id}
                                        onDoubleClick={() => {
                                          setEditFixedModal({ fe });
                                          setEditFixedAmount(String(fe.amount));
                                          setEditFixedDay(String(fe.day));
                                          setEditFixedPayment({ method: fe.paymentMethod || '현금', cardName: fe.cardName || '', transferAccId: fe.transferAccId || '' });
                                          setEditFixedIsUSD(!!fe.isUSD);
                                        }}
                                        className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 active:bg-amber-50 cursor-pointer select-none transition-colors">
                                        <span className="text-[13px] shrink-0">{icon}</span>
                                        <div className="flex flex-col min-w-0 flex-1">
                                          <span className="text-[9px] font-bold text-slate-700 truncate">{fe.name}</span>
                                          <span className="text-[7.5px] text-slate-400">{subLabel} · {fe.day}일</span>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                          <span className="text-[9px] font-black text-slate-800">{fe.isUSD ? `$${formatNum(fe.amount)}` : `₩${formatNum(krwAmt)}`}</span>
                                          {fe.isUSD && <span className="text-[7px] text-slate-400">≈₩{formatNum(krwAmt)}</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
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
                      <input type="text" className="flex-1 text-right text-[11px] font-black text-slate-800 border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-400 min-w-0" placeholder="총 금액 입력" value={toCommaString(incomeAmount)} onChange={e => setIncomeAmount(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') handleMoneyLogSubmit(); }} />
                      <button onClick={handleMoneyLogSubmit} className="bg-rose-500 text-white px-4 py-2 rounded-lg text-[11px] font-black shrink-0 shadow-sm hover:bg-rose-600 transition-colors">확인</button>
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
                                                  setTradeLogs(prev => prev.filter(l => l.id !== r.id));
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
                    {((globalStats.totalAssets / (fireTarget || 1000000000)) * 100).toFixed(1)}%
                  </h2>
                  <span className="text-sm font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-md border border-white/5">달성 중</span>
                </div>
              </div>

              {/* 진행 바 */}
              <div className="bg-slate-950/50 h-4 rounded-full overflow-hidden shadow-inner border border-white/5 mb-6 relative">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-rose-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(244,63,94,0.6)] relative" 
                  style={{ width: `${Math.min(100, (globalStats.totalAssets / (fireTarget || 1000000000)) * 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-white/50 mb-1 flex items-center gap-1"><TrendingUp size={10}/> 은퇴까지 남은 금액</p>
                  <p className="text-[13px] font-black text-white">₩{formatNum(Math.max(0, (fireTarget || 1000000000) - globalStats.totalAssets))}</p>
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
                  <span className="text-[9px] font-bold text-white/40 flex items-center gap-1">
                    <TrendingUp size={9}/> 현재까지 수익률 반영
                  </span>
                  {fireCAGR !== null
                    ? <span className="text-[10px] font-black text-emerald-400">{fireCAGR > 0 ? '+' : ''}{fireCAGR}% <span className="text-[8px] font-bold text-white/30">({historyRecords.length}개월 기록)</span></span>
                    : <span className="text-[9px] text-white/30"> </span>
                  }
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-white/60 flex items-center gap-1"><Flame size={10}/> 예상 연 수익률</label>
                  <div className="flex items-center bg-slate-900/50 rounded-lg border border-white/10 px-2 py-1.5 w-28 focus-within:border-emerald-400 transition-colors">
                    <input type="text" className="w-full bg-transparent text-white text-right text-[11px] font-black outline-none" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value.replace(/[^0-9.]/g, ''))} />
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
            </div>
          </div>
        </div>
      )}
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
            <button onClick={() => setIsGlobalSettingsOpen(false)} className={`w-full ${t.main} mt-5 py-2.5 rounded-xl text-xs font-black shadow-md transition-colors shrink-0`}>확인</button>
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
            <h3 className="font-black text-base mb-5 flex items-center justify-center w-full gap-2 text-slate-800"><Heart size={16} className={t.text} fill="currentColor"/> 프로필 및 설정</h3>
            
            <div className="mb-3 flex items-center gap-3 overflow-x-auto py-2 px-2 -mx-2 custom-scrollbar">
              {PRESET_PROFILES.map(p => (<button key={p.id} type="button" onClick={() => setEditProfileImage(p.url)} className={`w-10 h-10 rounded-full shrink-0 transition-all ${editProfileImage === p.url ? `ring-2 ${t.border} ring-offset-2 scale-110` : 'opacity-60 hover:opacity-100'}`}><img src={p.url} className="w-full h-full object-cover rounded-full bg-slate-50"/></button>))}
              <button type="button" onClick={() => fileInputRef.current.click()} className="w-10 h-10 rounded-full shrink-0 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 hover:bg-slate-100"><Upload size={14} className="text-slate-400"/></button><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
            </div>
            
            <input type="text" placeholder="캐릭터명 (예: 경준)" className={`w-full bg-slate-50 p-2.5 text-sm rounded-xl font-bold mb-2 outline-none border focus:${t.border} text-center`} value={editCharacterName} onChange={e=>setEditCharacterName(e.target.value)} />
            <input type="text" placeholder="앱 이름" className={`w-full bg-slate-50 p-2.5 text-sm rounded-xl font-bold mb-2 outline-none border focus:${t.border} text-center`} value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
            <input type="text" placeholder="부제목" className={`w-full bg-slate-50 p-2.5 text-sm rounded-xl font-bold mb-4 outline-none border focus:${t.border} text-center`} value={editSubtitle} onChange={e=>setEditSubtitle(e.target.value)} />
            
            <div className="flex gap-2 mb-3">
            </div>

            {/* 🎯 FIRE 및 로그아웃 버튼 신규 탑재 영역 */}
            <div className="flex flex-col gap-2 mb-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => { setIsEditHeaderOpen(false); setIsFireModalOpen(true); }} className="w-full py-2.5 bg-amber-50 text-amber-600 rounded-xl font-black text-xs shadow-sm border border-amber-100 flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors">
                <Flame size={14} /> FIRE 시뮬레이터
              </button>
              <button type="button" onClick={handleLogoutAction} className="w-full py-2.5 bg-slate-50 text-slate-500 rounded-xl font-black text-xs shadow-sm border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100 hover:text-rose-500 transition-colors">
                <LogOut size={14} /> 로그아웃
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
            {/* 🎯 모달 타이틀 및 우측 상단 미니멀 OCR 버튼 */}
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 shrink-0 relative">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5 pl-1"><Heart size={14} fill="currentColor" className={t.text} /> {editingStockId ? '항목 수정' : '새 항목 추가'}</h3>
              <div className="flex items-center pr-8">
                {!editingStockId && (
                  <button type="button" disabled={isOcrLoading} onClick={() => ocrFileInputRef.current?.click()} className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black flex items-center gap-1 transition-colors ${isOcrLoading ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'}`}>
                    <Camera size={12} className={isOcrLoading ? 'animate-pulse' : ''} />
                    {isOcrLoading ? '분석 중...' : '📷 사진 첨부'}
                  </button>
                )}
                <input type="file" accept="image/*" className="hidden" ref={ocrFileInputRef} onChange={handleScreenshotOcr} />
              </div>
            </div>
            <form onSubmit={handleEditStockSubmit} className="flex flex-col flex-1 overflow-hidden relative" onClick={e => { if ((showDivMonthPicker || showDivExPicker) && !e.target.closest('[data-picker]')) { setShowDivMonthPicker(false); setShowDivExPicker(false); setTimeout(() => { stockFormScrollRef.current?.scrollTo({ top: stockFormScrollRef.current.scrollHeight, behavior: 'smooth' }); }, 50); } }}>
              <div ref={stockFormScrollRef} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5 pb-2">

                {isDropdownOpen && currentAccountStat?.type === 'stock' && (
                  <div className="fixed inset-0 z-[50]" onClick={() => setIsDropdownOpen(false)}></div>
                )}
                <div className="relative z-[55]">
                  {currentAccountStat?.type === 'stock' && <Search className="absolute right-3 top-2 text-slate-300" size={14}/>}
                  <input type="text" placeholder={currentAccountStat?.type === 'stock' ? "종목명 또는 티커 검색" : currentAccountStat?.type === 'spending' ? "예: 네이버페이, 삼성월렛" : currentAccountStat?.type === 'card' ? "예: 국민카드, 신한카드" : "예: 정기예금, 파킹통장"} className={`w-full bg-slate-50 py-2 rounded-xl outline-none border focus:${t.border} font-bold text-xs text-center ${currentAccountStat?.type === 'stock' ? 'px-8' : 'px-3'}`} value={searchQuery}
                    onChange={e => {
                      const q = e.target.value;
                      setSearchQuery(q);
                      setNewStock(p => ({...p, name: q}));
                      if (currentAccountStat?.type === 'stock') {
                        setIsDropdownOpen(true);
                        // debounce: 400ms 후 Yahoo 검색
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
                      }
                    }}
                    onClick={() => { if(currentAccountStat?.type === 'stock') setIsDropdownOpen(true); }}
                    onFocus={() => { if(currentAccountStat?.type === 'stock') setIsDropdownOpen(true); }}
                  />
                  {isDropdownOpen && currentAccountStat?.type === 'stock' && (
                    <div className="absolute z-[60] w-full mt-1 bg-white border rounded-xl shadow-xl max-h-[240px] overflow-hidden border-slate-200 text-left flex flex-col">
                      {/* 내장 DB 결과 */}
                      {(filteredSList.length > 0 || filteredEList.length > 0) && (
                        <div className="flex divide-x max-h-[120px] shrink-0">
                          <div className="w-1/2 p-2 overflow-y-auto custom-scrollbar bg-white">
                            <div className={`text-[9px] font-black ${t.text} mb-1 border-b ${t.border} pb-1 sticky top-0 bg-white whitespace-nowrap`}>📈 주식</div>
                            {filteredSList.map(db => (
                              <div key={db.id} onClick={() => { setNewStock({...newStock, name: db.name, ticker: db.ticker, isUSD: db.isUSD, currentPrice: String(db.currentPrice), tickerSuffix: db.tickerSuffix || ''}); setSearchQuery(db.name); setIsDropdownOpen(false); setSearchResults([]); }} className={`p-1.5 hover:${t.light.split(' ')[0]} rounded-lg cursor-pointer flex flex-col gap-0.5`}>
                                <span className="font-bold text-[10px] truncate text-slate-800">{db.name}</span>
                                <span className="text-slate-400 text-[8px] font-black">{db.ticker}</span>
                              </div>
                            ))}
                          </div>
                          <div className="w-1/2 p-2 overflow-y-auto custom-scrollbar bg-slate-50">
                            <div className="text-[9px] font-black text-indigo-500 mb-1 border-b border-indigo-100 pb-1 sticky top-0 bg-slate-50 whitespace-nowrap">📊 ETF</div>
                            {filteredEList.map(db => (
                              <div key={db.id} onClick={() => { setNewStock({...newStock, name: db.name, ticker: db.ticker, isUSD: db.isUSD, currentPrice: String(db.currentPrice), tickerSuffix: db.tickerSuffix || ''}); setSearchQuery(db.name); setIsDropdownOpen(false); setSearchResults([]); }} className="p-1.5 hover:bg-indigo-100 rounded-lg cursor-pointer flex flex-col gap-0.5">
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
                              <div key={i} onClick={() => {
                                // suffix 정보를 ticker에 저장하지 않고 별도 필드로 보관
                                setNewStock({...newStock, name: item.name, ticker: item.ticker, isUSD: item.isUSD, currentPrice: '0', tickerSuffix: item.suffix || ''});
                                setSearchQuery(item.name);
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
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">현재가 <span className="text-slate-300 font-normal">(빈칸=자동)</span></label><div className="relative flex items-center"><span className="absolute left-2.5 text-xs font-bold text-slate-400">{newStock.isUSD ? '$' : '₩'}</span><input type="text" className={`w-full bg-slate-50 py-2 pl-6 pr-2.5 rounded-xl font-bold text-xs outline-none focus:${t.border} border text-right`} value={toCommaString(newStock.currentPrice)} onChange={e => { handleFormattedChange('currentPrice', e.target.value); setNewStock(prev => ({...prev, manualPrice: e.target.value.replace(/,/g,'') !== ''})); }} placeholder="빈칸=자동갱신" /></div></div>
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
                    <label className="text-[9px] font-black text-slate-400 block text-center">충전 출금 계좌 (저축계좌)</label>
                    <select className="w-full bg-slate-50 py-2 px-2 rounded-xl font-bold text-xs outline-none border focus:border-rose-300 text-center" value={newStock.linkedAccId || ''} onChange={e => setNewStock({...newStock, linkedAccId: e.target.value})}>
                      <option value="">선택 안 함</option>
                      {accounts.filter(a => a.type === 'savings').map(a => (
                        <option key={a.id} value={a.id}>🏦 {a.name} (₩{formatNum(a.cash)})</option>
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
                        <option value="wallet">내 지갑</option>
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
      {isAddAccountOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={e => { if (e.target === e.currentTarget) setIsAddAccountOpen(false); }}>
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
            <button type="button" onClick={() => setIsAddAccountOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            <h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center w-full">➕ 내 자산 추가</h3>
            <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-xl">
              {[['stock','📈','주식',t.main],['savings','🏦','저축','bg-emerald-500 text-white shadow-sm'],['spending','🛍️','소비','bg-rose-500 text-white shadow-sm'],['card','💳','카드','bg-slate-700 text-white shadow-sm'],['loan','💸','대출','bg-orange-500 text-white shadow-sm']].map(([type,icon,label,active]) => {
                const alreadyHas = accounts.some(a => a.type === type);
                return (
                <button key={type} type="button" disabled={alreadyHas} onClick={()=>{ if(!alreadyHas){ setNewAccountType(type); setNewAccountName(''); } }} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${newAccountType === type ? active : alreadyHas ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600'}`}>{icon}<br/>{label}</button>
                );
              })}
            </div>
            <input type="text" placeholder={newAccountType === 'card' ? '카드 별칭 (예: 신한카드)' : newAccountType === 'loan' ? '대출명 (예: 전세대출)' : '계좌 별칭 (예: 생활비 통장)'} autoFocus className={`w-full p-2.5 rounded-xl text-sm font-bold outline-none border mb-3 ${newAccountType === 'loan' ? 'focus:border-orange-400' : `focus:${t.border}`} text-center`} value={newAccountName} onChange={e=>setNewAccountName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') e.currentTarget.nextElementSibling?.click(); }} />
            <button type="button" onClick={() => {
              const name = newAccountName.trim();
              if (!name) return showToast('⚠️ 이름을 입력해주세요.');
              if (newAccountType === 'loan') {
                saveStateToHistory();
                const newAcc = { id: 'acc_' + Date.now(), name, cash: "0", type: 'loan', loanAmount: 0, loanRate: '', loanPayDay: '', loanPeriod: '', linkedAccId: '' };
                const updated = [...accounts, newAcc];
                setAccounts(updated); setSelectedAccountId(newAcc.id);
                setIsAddAccountOpen(false); setNewAccountName('');
                saveConfig(updated, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                showToast('✅ 대출이 등록되었습니다.');
              } else {
                saveStateToHistory();
                const newAcc = { id: 'acc_' + Date.now(), name, cash: "0", type: newAccountType, label: '입출금 통장' };
                const updated = [...accounts, newAcc];
                setAccounts(updated); setSelectedAccountId(newAcc.id); setIsAddAccountOpen(false); setNewAccountName('');
                saveConfig(updated, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                showToast('✅ 계좌가 생성되었습니다.');
              }
            }} className={`w-full text-white py-2.5 rounded-xl text-xs font-black transition-colors shadow-md ${newAccountType === 'stock' ? `${t.main}` : newAccountType === 'spending' ? 'bg-rose-500 hover:bg-rose-600' : newAccountType === 'card' ? 'bg-slate-700 hover:bg-slate-800' : newAccountType === 'loan' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>{newAccountType === 'loan' ? '대출 등록하기' : '계좌 생성하기'}</button>
          </div>
        </div>
      )}

      {isEditLabelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={e => { if (e.target === e.currentTarget) setIsEditLabelModalOpen(false); }}>
          <form onSubmit={handleEditLabelSubmit} className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative"><button type="button" onClick={() => setIsEditLabelModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button><h3 className="font-black text-sm mb-4 flex justify-center w-full items-center gap-1.5"><Edit2 size={14}/> 통장 명칭 변경</h3><input type="text" placeholder="새로운 통장 이름" autoFocus className="w-full p-2.5 rounded-xl text-sm font-black mb-4 outline-none border focus:border-slate-400 text-center" value={editLabelInput} onChange={e=>setEditLabelInput(e.target.value)} required /><button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black shadow-md">이름 저장하기</button></form>
        </div>
      )}

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
      {spendingChargeModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative">
            <button onClick={() => setSpendingChargeModal({ isOpen: false, stockId: null, amount: '', fromAccId: '' })} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            <h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center w-full">💳 충전하기</h3>
            <div className="mb-4 space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 text-center">출금 저축 계좌</label>
                <select className="w-full p-2.5 rounded-xl bg-slate-50 border outline-none font-black text-xs text-center" value={spendingChargeModal.fromAccId} onChange={e=>setSpendingChargeModal({...spendingChargeModal, fromAccId: e.target.value})}>
                  <option value="">선택 안 함 (잔액 차감 없음)</option>
                  {accounts.filter(a => a.type === 'savings').map(a => (
                    <option key={a.id} value={a.id}>🏦 {a.name} (₩{formatNum(a.cash)})</option>
                  ))}
                </select>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-slate-400">₩</span>
                <input type="text" placeholder="충전 금액" className="w-full p-2.5 pl-7 rounded-xl bg-slate-50 border outline-none font-black text-sm text-right text-rose-600" value={toCommaString(spendingChargeModal.amount)} onChange={e=>setSpendingChargeModal({...spendingChargeModal, amount: e.target.value.replace(/[^0-9]/g, '')})} autoFocus />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSpendingChargeModal({ isOpen: false, stockId: null, amount: '', fromAccId: '' })} className="flex-1 py-2.5 rounded-xl font-black text-slate-600 text-xs bg-slate-100 hover:bg-slate-200 transition-colors">취소</button>
              <button onClick={() => {
                const amt = toPureNumber(spendingChargeModal.amount);
                if (amt <= 0) return showToast('⚠️ 금액을 입력해주세요.');
                saveStateToHistory();
                let updatedStocks = stocks.map(s => s.id === spendingChargeModal.stockId ? { ...s, quantity: String(toPureNumber(s.quantity) + amt) } : s);
                let updatedAccs = [...accounts];
                if (spendingChargeModal.fromAccId) {
                  const fromAcc = updatedAccs.find(a => a.id === spendingChargeModal.fromAccId);
                  if (!fromAcc || toPureNumber(fromAcc.cash) < amt) return showToast('⚠️ 저축 계좌 잔액이 부족합니다.');
                  updatedAccs = updatedAccs.map(a => a.id === spendingChargeModal.fromAccId ? { ...a, cash: String(toPureNumber(a.cash) - amt) } : a);
                }
                setStocks(updatedStocks);
                setAccounts(updatedAccs);
                setSpendingChargeModal({ isOpen: false, stockId: null, amount: '', fromAccId: '' });
                showToast(`✅ ₩${formatNum(amt)} 충전 완료!`);
              }} className="flex-1 py-2.5 rounded-xl font-black text-white text-xs bg-rose-500 hover:bg-rose-600 shadow-md transition-colors">충전</button>
            </div>
          </div>
        </div>
      )}

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
            <button onClick={() => setLoanItemModal({ isOpen: false, loanId: null, amount: '', rate: '', payDay: '', period: '', linkedAccId: '' })} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button>
            <h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center w-full">💸 대출 상세 입력</h3>
            <div className="flex flex-col gap-2.5 mb-4">
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-slate-400">₩</span>
                <input type="text" placeholder="대출 잔액 (원금)" className="w-full p-2.5 pl-7 rounded-xl bg-slate-50 border outline-none font-black text-sm text-right focus:border-orange-400" value={toCommaString(loanItemModal.amount)} onChange={e=>setLoanItemModal({...loanItemModal, amount: e.target.value.replace(/[^0-9]/g,'')})} autoFocus />
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
              <div className="relative flex items-center">
                <input type="text" placeholder="계약기간 (개월)" className="w-full p-2.5 pr-10 rounded-xl bg-slate-50 border outline-none font-black text-sm text-right focus:border-orange-400" value={loanItemModal.period} onChange={e=>setLoanItemModal({...loanItemModal, period: e.target.value.replace(/[^0-9]/g,'')})} />
                <span className="absolute right-3 text-xs font-bold text-slate-400">개월</span>
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
              <button onClick={() => setLoanItemModal({ isOpen: false, loanId: null, amount: '', rate: '', payDay: '', period: '', linkedAccId: '' })} className="flex-1 py-2.5 rounded-xl font-black text-slate-600 text-xs bg-slate-100 hover:bg-slate-200 transition-colors">취소</button>
              <button onClick={() => {
                if (!loanItemModal.amount) return showToast('⚠️ 대출 잔액을 입력해주세요.');
                saveStateToHistory();
                const loanAcc = accounts.find(a => a.id === loanItemModal.loanId);
                const updated = accounts.map(a => a.id === loanItemModal.loanId ? { ...a, loanAmount: toPureNumber(loanItemModal.amount), loanRate: loanItemModal.rate, loanPayDay: loanItemModal.payDay, loanPeriod: loanItemModal.period, linkedAccId: loanItemModal.linkedAccId } : a);
                setAccounts(updated);
                // 납입일과 이자율이 설정됐으면 고정비로 자동 등록
                if (loanItemModal.payDay && loanItemModal.rate && loanItemModal.amount) {
                  const interestAmt = Math.round(toPureNumber(loanItemModal.amount) * toPureNumber(loanItemModal.rate) / 100 / 12);
                  const loanName = loanAcc?.name || '대출';
                  const feId = `loan_interest_${loanItemModal.loanId}`;
                  const newFe = { id: feId, name: `${loanName} 이자`, amount: interestAmt, day: Number(loanItemModal.payDay), paymentMethod: '현금', cardName: '', linkedStockId: loanItemModal.linkedAccId.startsWith('stock:') ? loanItemModal.linkedAccId.replace('stock:','') : '' };
                  setFixedExpenses(prev => {
                    const filtered = prev.filter(fe => fe.id !== feId);
                    return [...filtered, newFe];
                  });
                }
                saveConfig(updated, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
                setLoanItemModal({ isOpen: false, loanId: null, amount: '', rate: '', payDay: '', period: '', linkedAccId: '' });
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
                      {accounts.filter(a => a.type === 'savings').map(a => (
                        <button key={a.id} type="button" onClick={() => setSalaryDestAccId(salaryDestAccId === `acc:${a.id}` ? '' : `acc:${a.id}`)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${salaryDestAccId === `acc:${a.id}` ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                          🏦 {a.name} <span className="opacity-70">₩{formatNum(a.cash)}</span>
                        </button>
                      ))}
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
                      {accounts.filter(a => a.type === 'savings').map(a => (
                        <button key={a.id} type="button" onClick={() => setBonusDestAccId(bonusDestAccId === `acc:${a.id}` ? '' : `acc:${a.id}`)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${bonusDestAccId === `acc:${a.id}` ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                          🏦 {a.name} <span className="opacity-70">₩{formatNum(a.cash)}</span>
                        </button>
                      ))}
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
                            {['식비', '생필품', '의류비', '공과금', '고정비'].includes(expenseCategory) ? (
                             <select className="w-full text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                             <option value="식비">식비</option><option value="생필품">생필품</option><option value="의류비">의류비</option><option value="공과금">공과금</option><option value="고정비">고정비</option><option value="기타">기타</option>
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
                                  onClick={() => { setCashSource(cashSource === a.id ? '' : a.id); setSelectedCard(''); setSpendingItem(''); }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${cashSource === a.id ? 'bg-rose-500 text-white border-rose-500' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}>
                                  🛍️ {a.name} <span className="opacity-70">₩{formatNum(a.cash)}</span>
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
                            return (
                              <div className="flex flex-wrap gap-1.5 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                                <span className="w-full text-[9px] font-black text-rose-400 mb-0.5">결제 수단 선택 (선택 안 하면 계좌 잔액에서 차감)</span>
                                {items.length === 0 ? (
                                  <span className="text-[9px] text-slate-400 font-bold">이 소비계좌에 저장된 항목이 없습니다</span>
                                ) : (
                                  items.map(s => (
                                    <button key={s.id} type="button"
                                      onClick={() => setSpendingItem(spendingItem === s.id ? '' : s.id)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors border ${spendingItem === s.id ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-100'}`}>
                                      {s.name} <span className="text-[9px] opacity-70">₩{formatNum(s.quantity)}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            );
                          })()}
                          {paymentMethod === '현금' && cashSource === 'transfer' && (
                            <select className="w-full text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-slate-50"
                              value={transferAccId} onChange={e => setTransferAccId(e.target.value)}>
                              <option value="">계좌 선택 (없으면 현금 처리)</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.type === 'savings' ? '🏦' : a.type === 'spending' ? '🛍️' : '📈'} {a.name} (₩{formatNum(a.cash)})</option>)}
                            </select>
                          )}
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
                                    <span className="text-[9px] font-black text-purple-600">총 인원 설정 (본인 제외)</span>
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
                                          if (e.key === 'Enter') { 
                                            e.preventDefault(); 
                                            if (index < nbbangList.length - 1) { 
                                              document.getElementById(`nbbang-input-${index + 1}`)?.focus(); 
                                            // 삭제된 공간에는 아무것도 넣지 않거나, 아래와 같이 깔끔하게 닫아줍니다.
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
                            finalNbbangCount = validPeople.length + 1; 
                            if (finalNbbangCount > 1) {
                              myShare = Math.floor(amt / finalNbbangCount);
                              perPersonShare = Math.floor(amt / finalNbbangCount);
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
                                     if (!item || toPureNumber(item.quantity) < myShare) return showToast("⚠️ 잔액이 부족합니다.");
                                     const benefit = toPureNumber(item.benefit) || 0;
                                     const accumulation = Math.floor(myShare * benefit / 100);
                                     updatedStocks = updatedStocks.map(s => s.id === spendingItem ? { ...s, quantity: String(toPureNumber(s.quantity) - myShare + accumulation) } : s);
                                     if (accumulation > 0) showToast(`✅ ₩${formatNum(accumulation)} 적립!`);
                                  } else {
                                     const srcAcc = updatedAccs.find(a => a.id === cashSource);
                                     if (!srcAcc || toPureNumber(srcAcc.cash) < myShare) return showToast("⚠️ 소비계좌 잔액이 부족합니다.");
                                     updatedAccs = updatedAccs.map(a => a.id === cashSource ? { ...a, cash: String(toPureNumber(a.cash) - myShare) } : a);
                                  }
                               } else if (cashSource === 'transfer' && transferAccId) {
                                  const srcAcc = updatedAccs.find(a => a.id === transferAccId);
                                  if (!srcAcc || toPureNumber(srcAcc.cash) < myShare) return showToast("⚠️ 계좌 잔액이 부족합니다.");
                                  updatedAccs = updatedAccs.map(a => a.id === transferAccId ? { ...a, cash: String(toPureNumber(a.cash) - myShare) } : a);
                               } else {
                                  isPaidNow = true;
                               }
                               isPaidNow = true;
                            } else {
                               const selectedCardInfo = myCards.find(c => c.name === selectedCard)
                                 || stocks.find(s => s.name === selectedCard && accounts.find(a => a.id === (s.accountId || 'default'))?.type === 'card');
                               const linkedAccId = selectedCardInfo?.linkedAcc || selectedCardInfo?.cardLinkedAcc || '';
                               const deductFrom = linkedAccId || '';
                               if (deductFrom.startsWith('stock:')) {
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
                             
                             // 1. 본인 몫: 일반 소비로 둔갑시켜 달력/발자취에 중복 없이 1건만 깔끔하게 저장
                             const myLog = {
                                ...baseLog,
                                id: Date.now().toString() + '_0',
                                name: cleanLogName, // 괄호 꼬리표 없는 깔끔한 이름
                                isNbbang: false,    // 일반 소비로 인식되도록 강제 설정
                                amount: myShare
                             };
                             logsToAdd.push(myLog);
                             
                             // 2. 친구들 몫: 달력에서는 숨기고 정산소 탭으로만 데이터 전달
                             const validPeople = nbbangList.filter(n => n.name.trim() !== '');
                             validPeople.forEach((p, idx) => {
                               logsToAdd.push({
                                 ...baseLog, 
                                 id: Date.now().toString() + '_' + (idx + 1), 
                                 name: cleanLogName, 
                                 category: logCat, // 'N빵' 대신 원래 카테고리(식비 등) 유지
                                 amount: perPersonShare, 
                                 timestamp: Date.now() + idx + 1,
                                 isNbbang: true,
                                 isSettled: false,
                                 nbbangTarget: p.name.trim() // 정산소를 위한 확실한 타겟 지정
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
                          setIncomeMode(null); setIncomeAmount(''); setIsNbbang(false); setExpenseMemo(''); setExpenseDateInput('');
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-2xl relative flex flex-col max-h-[85vh]">
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-2xl relative flex flex-col min-h-[480px] md:min-h-[500px]">
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
        // 과거 기록이 있는 종목 id 집합 (timeline에 데이터 있는 것)
        const allStocksWithDiv = stocks.filter(s =>
          accounts.find(a => a.id === (s.accountId || 'default'))?.type !== 'savings' &&
          toPureNumber(s.divPerShare) > 0
        );
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
                  <div className="flex flex-col gap-2">
                    {scheduleItems.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-[11px] font-bold">
                        {isPast ? `${viewMonth}월 배당 기록이 없습니다.` : `${viewMonth}월에 배당 예정인 종목이 없습니다.`}
                      </div>
                    ) : scheduleItems.map(s => {
                      if (s.isSold) {
                        // 매도된 종목 — 기록만 표시
                        return (
                          <div key={s.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-[11px] font-black text-slate-600 truncate">{s.name}</p>
                                <p className="text-[9px] text-slate-400">매도 종목 · 과거 기록</p>
                              </div>
                              <span className="text-[10px] font-black text-slate-500">₩{formatNum(Math.round(s.amount))}</span>
                            </div>
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
                        <div key={s.id} className={`rounded-2xl border p-3 ${alreadyPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-[11px] font-black text-slate-800 truncate">{s.name}</p>
                              <p className="text-[9px] text-slate-400">{viewMonth}월 {payDay} · {s.divFreq}배당</p>
                            </div>
                            {alreadyPaid
                              ? <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">✓ 완료</span>
                              : <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full shrink-0">{isPast ? '미기록' : '예정'}</span>
                            }
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">
                              {alreadyPaid ? '수령액' : (isPast ? '예상' : '예상')} <span className="font-black text-slate-700">₩{formatNum(alreadyPaid ? paidAmt : expected)}</span>
                            </span>
                            {alreadyPaid ? (
                              <div className="flex items-center gap-1">
                                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
                                  <span className="text-[9px] text-slate-400 mr-1">₩</span>
                                  <input type="text" className="w-16 text-right text-[10px] font-black outline-none bg-transparent"
                                    value={toCommaString(tempTimelines[s.id]?.[mId] ?? String(paidAmt))}
                                    onChange={e => setTempTimelines(prev => ({ ...prev, [s.id]: { ...(prev[s.id] || s.dividendTimeline || {}), [mId]: e.target.value.replace(/[^0-9]/g,'') } }))} />
                                </div>
                                <button onClick={() => { saveStateToHistory(); setStocks(prev => prev.map(st => st.id === s.id ? { ...st, dividendTimeline: { ...(st.dividendTimeline||{}), [mId]: tempTimelines[s.id]?.[mId] ?? String(paidAmt) } } : st)); showToast('✅ 수정됐습니다.'); }} className="bg-slate-700 text-white text-[9px] font-black px-2 py-1 rounded-lg">저장</button>
                              </div>
                            ) : (
                              <button onClick={() => {
                                saveStateToHistory();
                                const updatedStocks = stocks.map(st => st.id === s.id ? { ...st, dividendTimeline: { ...(st.dividendTimeline||{}), [mId]: String(expected) } } : st);
                                const accId = s.accountId || 'default';
                                const updatedAccs = accounts.map(a => a.id === accId ? { ...a, cash: String(toPureNumber(a.cash) + expected) } : a);
                                setStocks(updatedStocks); setAccounts(updatedAccs);
                                setTradeLogs(prev => [{ id: `div_m_${Date.now()}`, date: `${viewYear}-${String(viewMonth).padStart(2,'0')}-${String(s.divDay==='말'?new Date(viewYear,viewMonth,0).getDate():Number(s.divDay||15)).padStart(2,'0')}`, timestamp: Date.now(), type: 'dividend', name: s.name, amount: expected }, ...prev]);
                                showToast('💰 배당금이 입금됐습니다!');
                              }} className={`${t.main} text-white text-[9px] font-black px-3 py-1.5 rounded-xl shadow-sm`}>수동 입금</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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