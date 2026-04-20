import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Trash2, Search, TrendingUp, 
  ShoppingCart, X, Star, Sparkles, Heart, 
  PiggyBank, CalendarDays, Database, Edit2, Wallet, Briefcase, Camera, AlertCircle, Menu, Download, UploadCloud, ChevronRight, ChevronDown, Landmark, PieChart, Scale, Settings, RefreshCw, Upload, CreditCard
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
// Kongeramo 'Upload' muri lucide-react kugira ngo dukemure ikibazo cya ReferenceError

// --- [Supabase 클라우드 연동] ---
import { createClient } from '@supabase/supabase-js';

// ⚠️ 주의: 본인의 Supabase Project URL과 anon key로 반드시 변경하세요!
const supabaseUrl = 'https://slpzlgpbcetnspmjcqee.supabase.co';
const supabaseKey = 'sb_publishable_YjqpB1tMubbU4oV-ZGzOEw_TnVmGzqk';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  // 국내 주식
  { id: 'kr1', name: '삼성전자', ticker: '005930', currentPrice: 74500, isUSD: false, isETF: false },
  { id: 'kr2', name: 'SK하이닉스', ticker: '000660', currentPrice: 155000, isUSD: false, isETF: false },
  { id: 'kr3', name: '현대차', ticker: '005380', currentPrice: 234000, isUSD: false, isETF: false },
  { id: 'kr4', name: '기아', ticker: '000270', currentPrice: 112000, isUSD: false, isETF: false },
  { id: 'kr5', name: 'NAVER', ticker: '035420', currentPrice: 189000, isUSD: false, isETF: false },
  { id: 'kr6', name: '카카오', ticker: '035720', currentPrice: 53000, isUSD: false, isETF: false },
  { id: 'kr7', name: '셀트리온', ticker: '068270', currentPrice: 180000, isUSD: false, isETF: false },
  { id: 'kr8', name: 'LG에너지솔루션', ticker: '373220', currentPrice: 400000, isUSD: false, isETF: false },
  { id: 'kr9', name: 'POSCO홀딩스', ticker: '005490', currentPrice: 380000, isUSD: false, isETF: false },
  { id: 'kr10', name: '삼성바이오로직스', ticker: '207940', currentPrice: 820000, isUSD: false, isETF: false },
  { id: 'kr11', name: 'LG화학', ticker: '051910', currentPrice: 450000, isUSD: false, isETF: false },
  { id: 'kr12', name: '삼성SDI', ticker: '006400', currentPrice: 420000, isUSD: false, isETF: false },
  { id: 'kr13', name: '현대모비스', ticker: '012330', currentPrice: 240000, isUSD: false, isETF: false },
  { id: 'kr14', name: '카카오뱅크', ticker: '323410', currentPrice: 28000, isUSD: false, isETF: false },
  { id: 'kr15', name: '포스코퓨처엠', ticker: '003670', currentPrice: 310000, isUSD: false, isETF: false },
  { id: 'kr16', name: '한화솔루션', ticker: '009830', currentPrice: 31000, isUSD: false, isETF: false },
  { id: 'kr17', name: '에코프로', ticker: '086520', currentPrice: 600000, isUSD: false, isETF: false },
  { id: 'kr18', name: '에코프로비엠', ticker: '247540', currentPrice: 250000, isUSD: false, isETF: false },
  { id: 'kr19', name: '하이브', ticker: '352820', currentPrice: 210000, isUSD: false, isETF: false },
  { id: 'kr20', name: 'SK이노베이션', ticker: '096770', currentPrice: 110000, isUSD: false, isETF: false },
  
  // 미국 주식
  { id: 'us1', name: '애플 (Apple)', ticker: 'AAPL', currentPrice: 175.00, isUSD: true, isETF: false },
  { id: 'us2', name: '마이크로소프트 (Microsoft)', ticker: 'MSFT', currentPrice: 420.55, isUSD: true, isETF: false },
  { id: 'us3', name: '엔비디아 (NVIDIA)', ticker: 'NVDA', currentPrice: 900.20, isUSD: true, isETF: false },
  { id: 'us4', name: '테슬라 (Tesla)', ticker: 'TSLA', currentPrice: 175.34, isUSD: true, isETF: false },
  { id: 'us5', name: '알파벳 A (Google)', ticker: 'GOOGL', currentPrice: 140.20, isUSD: true, isETF: false },
  { id: 'us6', name: '아마존 (Amazon)', ticker: 'AMZN', currentPrice: 180.10, isUSD: true, isETF: false },
  { id: 'us7', name: '메타 (Meta)', ticker: 'META', currentPrice: 500.25, isUSD: true, isETF: false },
  { id: 'us8', name: '버크셔 해서웨이 B', ticker: 'BRK.B', currentPrice: 410.30, isUSD: true, isETF: false },
  { id: 'us9', name: '일라이 릴리 (Eli Lilly)', ticker: 'LLY', currentPrice: 750.40, isUSD: true, isETF: false },
  { id: 'us10', name: '유나이티드헬스 (UNH)', ticker: 'UNH', currentPrice: 480.90, isUSD: true, isETF: false },
  { id: 'us11', name: '비자 (Visa)', ticker: 'V', currentPrice: 280.15, isUSD: true, isETF: false },
  { id: 'us12', name: '존슨앤드존슨 (JNJ)', ticker: 'JNJ', currentPrice: 155.20, isUSD: true, isETF: false },
  { id: 'us13', name: '마스터카드 (Mastercard)', ticker: 'MA', currentPrice: 470.50, isUSD: true, isETF: false },
  { id: 'us14', name: '엑슨모빌 (ExxonMobil)', ticker: 'XOM', currentPrice: 110.25, isUSD: true, isETF: false },
  { id: 'us15', name: '제이피모건 (JPMorgan)', ticker: 'JPM', currentPrice: 195.40, isUSD: true, isETF: false },
  { id: 'us16', name: '브로드컴 (Broadcom)', ticker: 'AVGO', currentPrice: 1300.50, isUSD: true, isETF: false },
  { id: 'us17', name: '월마트 (Walmart)', ticker: 'WMT', currentPrice: 60.10, isUSD: true, isETF: false },
  { id: 'us18', name: '프록터앤갬블 (P&G)', ticker: 'PG', currentPrice: 160.30, isUSD: true, isETF: false },
  { id: 'us19', name: '코스트코 (Costco)', ticker: 'COST', currentPrice: 730.20, isUSD: true, isETF: false },
  { id: 'us20', name: '홈디포 (Home Depot)', ticker: 'HD', currentPrice: 380.45, isUSD: true, isETF: false },

  // ETF
  { id: 'etf1', name: 'TIGER 미국배당다우존스타겟데일리커버드콜', ticker: '0008S0', currentPrice: 10135, isUSD: false, isETF: true },
  { id: 'etf2', name: 'KODEX 200', ticker: '069500', currentPrice: 35000, isUSD: false, isETF: true },
  { id: 'etf3', name: 'TIGER 미국S&P500', ticker: '360750', currentPrice: 15000, isUSD: false, isETF: true },
  { id: 'etf4', name: 'TIGER 미국나스닥100', ticker: '133690', currentPrice: 95000, isUSD: false, isETF: true },
  { id: 'etf5', name: 'KODEX 레버리지', ticker: '122630', currentPrice: 18000, isUSD: false, isETF: true },
  { id: 'etf6', name: 'KODEX 미국S&P500TR', ticker: '379800', currentPrice: 13000, isUSD: false, isETF: true },
  { id: 'etf7', name: 'TIGER 2차전지테마', ticker: '305540', currentPrice: 22000, isUSD: false, isETF: true },
  { id: 'etf10', name: 'SCHD (미국배당 ETF)', ticker: 'SCHD', currentPrice: 77.9, isUSD: true, isETF: true },
  { id: 'etf11', name: 'SPY (S&P 500 ETF)', ticker: 'SPY', currentPrice: 512.3, isUSD: true, isETF: true },
  { id: 'etf12', name: 'QQQ (나스닥 100 ETF)', ticker: 'QQQ', currentPrice: 440.1, isUSD: true, isETF: true },
  { id: 'etf13', name: 'VOO (Vanguard S&P 500)', ticker: 'VOO', currentPrice: 470.5, isUSD: true, isETF: true },
  { id: 'etf14', name: 'IVV (iShares S&P 500)', ticker: 'IVV', currentPrice: 515.2, isUSD: true, isETF: true },
  { id: 'etf15', name: 'VTI (Vanguard Total Stock)', ticker: 'VTI', currentPrice: 260.4, isUSD: true, isETF: true },
  { id: 'etf16', name: 'QQQM (Invesco NASDAQ 100)', ticker: 'QQQM', currentPrice: 180.5, isUSD: true, isETF: true },
  { id: 'etf17', name: 'JEPI (JPMorgan Equity Premium)', ticker: 'JEPI', currentPrice: 56.8, isUSD: true, isETF: true },
  { id: 'etf18', name: 'JEPQ (JPMorgan Nasdaq Premium)', ticker: 'JEPQ', currentPrice: 53.2, isUSD: true, isETF: true }
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
  const [activeTab, setActiveTab] = useState('portfolio'); 
  const [toastMsg, setToastMsg] = useState(''); 
  const toastTimerRef = useRef(null); 
  const fileInputRef = useRef(null);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null, onCancel: null });
  const [inlineConsume, setInlineConsume] = useState({ isOpen: false, amount: '' });
  const [savingsWithdrawModal, setSavingsWithdrawModal] = useState({ isOpen: false, amount: '', targetAccId: 'wallet' });
  const [savingsMaturityModal, setSavingsMaturityModal] = useState({ isOpen: false, targetId: null, finalAmount: '' });
  
  const [itemWithdrawModal, setItemWithdrawModal] = useState({ isOpen: false, targetId: null, amount: '', toAccId: 'wallet' });

  const [appTitle, setAppTitle] = useState(() => getRecoveredValue('kj_final_v87_title', 'kj_final_v86_title', '경준 부자 포트폴리오'));
  const [appSubtitle, setAppSubtitle] = useState(() => getRecoveredValue('kj_final_v87_subtitle', 'kj_final_v86_subtitle', 'Dream Big, Invest Smart'));
  const [characterName, setCharacterName] = useState(() => getRecoveredValue('kj_final_v87_characterName', 'kj_final_v86_characterName', '경준'));
  const [appTheme, setAppTheme] = useState(() => getRecoveredValue('kj_final_v87_theme', 'kj_final_v86_theme', 'pink'));
  const [zoomLevel, setZoomLevel] = useState(() => getRecoveredValue('kj_final_v87_zoom', 'kj_final_v86_zoom', 100));
  
  const t = THEME_STYLES[appTheme] || THEME_STYLES.pink;

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editCharacterName, setEditCharacterName] = useState('');
  const [editProfileImage, setEditProfileImage] = useState(''); 

  const [accounts, setAccounts] = useState(() => getRecoveredValue('kj_final_v87_accounts', 'kj_final_v86_accounts', [{ id: 'default', name: '메인 계좌', cash: "0", type: 'stock', label: '입출금 통장' }]));
  const [selectedAccountId, setSelectedAccountId] = useState('default');
  const [stocks, setStocksState] = useState([]);
  const currentUserId = '00000000-0000-0000-0000-000000000000'; // ⚠️ 임시 유저 ID (추후 로그인 기능 추가 시 변경하세요)

  // 1. 앱 시작 시 Supabase에서 데이터 불러오기
  useEffect(() => {
    const fetchStocksFromDB = async () => {
      try {
        const { data, error } = await supabase
          .from('stocks')
          .select('*')
          .eq('user_id', currentUserId);

        if (error) {
          console.error('❌ Supabase 불러오기 실패:', error.message);
          return;
        }
        if (data && data.length > 0) {
          setStocksState(data);
        }
      } catch (err) {
        console.error('❌ DB 연결 에러:', err);
      }
    };
    fetchStocksFromDB();
  }, []);

  // 2. 스마트 자동 저장 함수 (기존 setStocks를 완벽히 대체)
  const setStocks = async (newStocks) => {
    setStocksState(newStocks); // 화면 즉시 업데이트

    // 🎯 해결 1: 하드코딩된 임시 ID 대신 실제 로그인된 유저 ID 사용 (없으면 방어코드)
    const userIdToSave = session?.user?.id || currentUserId;

    try {
      // (1) 화면에서 삭제된 항목 찾아 DB에서도 지우기
      const currentIds = newStocks.map(s => s.id);
      const { data: existing } = await supabase.from('stocks').select('id').eq('user_id', userIdToSave);
      
      if (existing) {
        const idsToDelete = existing.map(e => e.id).filter(id => !currentIds.includes(id));
        if (idsToDelete.length > 0) {
          await supabase.from('stocks').delete().in('id', idsToDelete);
        }
      }

      // (2) 남은 항목들은 DB에 추가 또는 덮어쓰기 (Upsert)
      if (newStocks.length > 0) {
        const mappedStocks = newStocks.map(s => ({
          id: s.id,
          user_id: userIdToSave, // 🎯 수정됨: 실제 유저 ID
          name: s.name,
          ticker: s.ticker || '',
          buyprice: s.buyPrice,       
          currentprice: s.currentPrice,
          quantity: s.quantity,
          isusd: s.isUSD,             
          targetratio: s.targetRatio, 
          accountid: s.accountId || 'default', // 🎯 해결 2: DB 소문자 컬럼명(accountid)에 완벽 매칭
        }));

        const { error: stocksError } = await supabase.from('stocks').upsert(mappedStocks);
      
        if (stocksError) {
          console.error("🚨 [Supabase] stocks 테이블 저장 실패! 상세 원인:", stocksError.message, stocksError.details, stocksError.hint);
        }
      }
    } catch (err) {
      console.error('❌ DB 동기화 중 에러 발생:', err);
    }
  };
  const [exchangeRate, setExchangeRate] = useState(() => getRecoveredValue('kj_final_v87_fx', 'kj_final_v86_fx', "1392"));
  const [isFetchingStocks, setIsFetchingStocks] = useState(false);
  
  const [historyRecords, setHistoryRecords] = useState(() => getRecoveredValue('kj_final_v87_history', 'kj_final_v86_history', [])); 
  const [tradeLogs, setTradeLogs] = useState(() => getRecoveredValue('kj_final_v87_tradeLogs', 'kj_final_v86_tradeLogs', [])); 

  const [profileImage, setProfileImage] = useState(() => getRecoveredValue('kj_final_v87_profile', 'kj_final_v86_profile', PRESET_PROFILES[0].url)); 
  const [globalCash, setGlobalCash] = useState(() => getRecoveredValue('kj_final_v87_globalCash', 'kj_final_v86_globalCash', 0));
  const [lastFetchTime, setLastFetchTime] = useState(() => localStorage.getItem('kj_final_v87_lastFetchTime') || localStorage.getItem('kj_final_v86_lastFetchTime') || '');

  const [pastStates, setPastStates] = useState([]);
  const [futureStates, setFutureStates] = useState([]);

  const [chartViewMode, setChartViewMode] = useState('month'); 
  const [pendingDivs, setPendingDivs] = useState({});
  const [pendingBuys, setPendingBuys] = useState({});
  const [pendingSells, setPendingSells] = useState({});
  
  const [activeDepositId, setActiveDepositId] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSourceId, setDepositSourceId] = useState('wallet');
  
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchBuyModalOpen, setIsBatchBuyModalOpen] = useState(false);
  const [batchBuyInputs, setBatchBuyInputs] = useState({}); // 일괄매수 수량 사용자 입력 저장용
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false); 
  const [isEditLabelModalOpen, setIsEditLabelModalOpen] = useState(false);
  const [editLabelInput, setEditLabelInput] = useState('');

  const [isEditingAccCash, setIsEditingAccCash] = useState(false);
  const [editAccCashAmount, setEditAccCashAmount] = useState('');

  const [rebalanceTab, setRebalanceTab] = useState('standard'); 
  const [rebalanceInvestAmount, setRebalanceInvestAmount] = useState(''); 

  const [investTab, setInvestTab] = useState('transfer');
  const [incomeMode, setIncomeMode] = useState(null); // 'salary' 또는 'bonus'
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('성과급'); // 🎯 기타수익 종류
  const [expenseCategory, setExpenseCategory] = useState('식비');
  const [expenseMemo, setExpenseMemo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('현금/체크카드');
  const [selectedCard, setSelectedCard] = useState('');
  const [myCards, setMyCards] = useState([]); 
  const [isNbbang, setIsNbbang] = useState(false);
  const [nbbangCount, setNbbangCount] = useState(1);
  const [nbbangNames, setNbbangNames] = useState('');
  const [nbbangList, setNbbangList] = useState([{ id: Date.now(), name: '' }]); // 🎯 다이나믹 N빵 멤버
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [newCardTarget, setNewCardTarget] = useState('');
  const [newCardPeriod, setNewCardPeriod] = useState(''); // 🎯 카드 실적 인정 기간
  const [isNbbangConfirmed, setIsNbbangConfirmed] = useState(false); // 🎯 N빵 입력 완료 상태
  const [nbbangFilter, setNbbangFilter] = useState('person'); // 🎯 N빵 필터링 (person, history)
  const [expandedPersons, setExpandedPersons] = useState({}); // 🎯 N빵 인원별 아코디언 상태
  const [expandedRestaurants, setExpandedRestaurants] = useState({}); // 🎯 N빵 식당별 아코디언 상태
  const [editingNbbang, setEditingNbbang] = useState(null); // 🎯 N빵 개별 금액 수정 상태 { id, amount }
  const [prepayModalState, setPrepayModalState] = useState({ isOpen: false, cardName: '' }); // 🎯 카드 선결제 모달 상태
  const [expenseDateInput, setExpenseDateInput] = useState(''); // 🎯 소비 날짜 입력
  const [isSettledHistoryView, setIsSettledHistoryView] = useState(false); // 🎯 N빵 완료내역 뷰
  const [newCardType, setNewCardType] = useState('신용'); // 🎯 등록 카드 종류 (신용/체크)
  const [newCardLinkedAcc, setNewCardLinkedAcc] = useState('wallet'); // 🎯 체크카드 연동 계좌
  const [accountbookTab, setAccountbookTab] = useState('calendar');
  const [newCardName, setNewCardName] = useState('');
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

  // 1. 로그인 상태 확인 로직
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. 클라우드에서 내 데이터 불러오기 엔진
  useEffect(() => {
    if (!session?.user?.id) return;
    const loadCloudData = async () => {
       const { data } = await supabase.from('app_data').select('*').eq('user_id', session.user.id).single();
       if (data) {
          if(data.global_cash) setGlobalCash(data.global_cash);
          if(data.accounts) setAccounts(data.accounts);
          if(data.stocks) setStocks(data.stocks);
          if(data.trade_logs) setTradeLogs(data.trade_logs);
          if(data.my_cards) setMyCards(data.my_cards);
       }
    };
    loadCloudData();
  }, [session]);

  // 3. 내 데이터를 클라우드에 2초마다 자동 저장하는 엔진
  useEffect(() => {
    if (!session?.user?.id) return;
    const saveToCloud = async () => {
       await supabase.from('app_data').upsert({
         user_id: session.user.id,
         global_cash: globalCash,
         accounts: accounts,
         stocks: stocks,
         trade_logs: tradeLogs,
         my_cards: myCards
       });
    };
    const timeoutId = setTimeout(saveToCloud, 2000); 
    return () => clearTimeout(timeoutId);
  }, [globalCash, accounts, stocks, tradeLogs, myCards, session]);

  // 4. 나만의 아이디(영문/숫자) 로그인 실행 로직
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    
    // 🎯 아이디 로그인 핵심: 사용자가 입력한 아이디 뒤에 몰래 주소를 붙여서 Supabase를 속입니다.
    const fakeEmail = `${authId}@richapp.com`;

    if (isSignUpMode) {
      const { error } = await supabase.auth.signUp({ email: fakeEmail, password: authPassword });
      if (error) showToast(`❌ 가입 실패: 이미 있는 아이디거나 비밀번호가 짧습니다.`);
      else showToast('✅ 가입 성공! 이제 로그인해주세요.');
    } else {
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
    showToast('👋 로그아웃 되었습니다.');
  };
  const [calendarDate, setCalendarDate] = useState(new Date()); // 🎯 가계부 달력 현재 달
  const [selectedDay, setSelectedDay] = useState(null); // 🎯 가계부 선택된 날짜
  const [investInput, setInvestInput] = useState(''); 
  const [transferFromId, setTransferFromId] = useState('wallet');
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
  const [isSubDivModalOpen, setIsSubDivModalOpen] = useState(false); 
  const [isGlobalDivModalOpen, setIsGlobalDivModalOpen] = useState(false);
  const [divInputView, setDivInputView] = useState('batch'); 
  const [selectedDivStock, setSelectedDivStock] = useState('');
  const [tempTimelines, setTempTimelines] = useState({});
  
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('stock'); 
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [editAccountName, setEditAccountName] = useState('');

  const [editingStockId, setEditingStockId] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null); // 모바일 터치(클릭) 상태 관리를 위한 변수
  const [newStock, setNewStock] = useState({ 
    name: '', ticker: '', buyPrice: '', quantity: '', targetRatio: '', isUSD: false, 
    currentPrice: '', dividendTimeline: {}, divPerShare: '', divFreq: '월', divDay: '15',
    maturityDate: '', interestRate: '', interestType: '단리'
  });

  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const [batchYear, setBatchYear] = useState(currentYearNum);
  const [batchMonth, setBatchMonth] = useState(currentMonthNum);
  const [expandedHistoryYears, setExpandedHistoryYears] = useState({ [currentYearNum]: true }); 
  
  const [expandedLogYears, setExpandedLogYears] = useState({ [currentYearNum]: true }); 
  const [expandedLogMonths, setExpandedLogMonths] = useState({}); 

  const [draggedAccIdx, setDraggedAccIdx] = useState(null); 

  const yearOptions = Array.from({ length: 20 }, (_, i) => 2020 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const todayDate = new Date();
  const dateString = `${todayDate.getFullYear()}.${String(todayDate.getMonth() + 1).padStart(2, '0')}.${String(todayDate.getDate()).padStart(2, '0')}`;

  const stocksRef = useRef(stocks);
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);

  // --- Live API Fetch (Auto) ---
  useEffect(() => {
    let isMounted = true;
    const fetchPrices = async () => {
      try {
        const resFx = await fetch('https://open.er-api.com/v6/latest/USD');
        const dataFx = await resFx.json();
        if (dataFx?.rates?.KRW) {
          const liveRate = Math.round(dataFx.rates.KRW).toString();
          setExchangeRate(liveRate);
          localStorage.setItem('kj_final_v87_fx', liveRate);
        }
      } catch (error) {}

      let updated = false;
      let successCount = 0;
      let newStocks = [...stocksRef.current];
      for (let i = 0; i < newStocks.length; i++) {
        let s = newStocks[i];
        if (!s.ticker) continue; 
        try {
          const ticker = s.isUSD ? s.ticker : `${s.ticker}.KS`;
          const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`)}`);
          const data = await res.json();
          const parsed = JSON.parse(data.contents);
          const price = parsed.chart.result[0].meta.regularMarketPrice;
          if (price && !isNaN(price)) {
            successCount++;
            if (Number(s.currentPrice) !== price) {
              newStocks[i] = { ...s, currentPrice: String(price) };
              updated = true;
            }
          }
        } catch(e) {}
      }
      
      if (successCount > 0 && isMounted) {
        const now = new Date();
        const timeStr = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        setLastFetchTime(timeStr);
        localStorage.setItem('kj_final_v87_lastFetchTime', timeStr);
        
        if (updated) {
          setStocks(newStocks);
        }
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, 10 * 60 * 1000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const handleUpdateStockPrices = async () => {
    setIsFetchingStocks(true);
    showToast("🔄 주식 현재가를 업데이트합니다...");
    let updatedStocks = [...stocks];
    let successCount = 0;
    let updated = false;

    for (let i = 0; i < updatedStocks.length; i++) {
        let s = updatedStocks[i];
        if (!s.ticker) continue;
        try {
            const ticker = s.isUSD ? s.ticker : `${s.ticker}.KS`; 
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`)}`);
            const data = await res.json();
            const parsed = JSON.parse(data.contents);
            const price = parsed.chart.result[0].meta.regularMarketPrice;
            if (price && !isNaN(price)) {
              successCount++;
              if (Number(s.currentPrice) !== price) {
                updatedStocks[i] = { ...s, currentPrice: String(price) };
                updated = true;
              }
            }
        } catch(e) {}
    }
    
    if (successCount > 0) {
      const now = new Date();
      const timeStr = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      setLastFetchTime(timeStr);
      localStorage.setItem('kj_final_v87_lastFetchTime', timeStr);
      
      if (updated) {
        setStocks(updatedStocks);
      }
    }
    
    setIsFetchingStocks(false);
    saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash, zoomLevel);
    showToast(successCount > 0 ? `✅ 업데이트 완료!` : "⚠️ 실시간 연동에 실패하여 기존 데이터를 유지합니다.");
  };

  // --- Calculations ---
  const accountStatsList = useMemo(() => {
    const rate = toPureNumber(exchangeRate) || 1392;
    return accounts.map(acc => {
      const accStocks = stocks.filter(s => (s.accountId || 'default') === acc.id);
      const currentCash = toPureNumber(acc.cash);
      const isSavingsAcc = acc.type === 'savings';
      let stockOnlyTotalValue = 0;
      let savingsExpectedTotal = 0;
      let futureTotalDiv = 0; // 🎯 핵심: 연간 총 예상 배당금 메모리 추가

      accStocks.forEach(s => {
         const curP = isSavingsAcc ? 1 : toPureNumber(s.currentPrice);
         const mult = (s.isUSD && !isSavingsAcc) ? rate : 1;
         const qty = toPureNumber(s.quantity);
         stockOnlyTotalValue += curP * qty * mult;
         
         if (isSavingsAcc) {
           const R = toPureNumber(s.interestRate) / 100;
           const expected = s.interestType === '복리' ? qty * Math.pow(1 + R, 1) : qty * (1 + R);
           savingsExpectedTotal += Math.floor(expected);
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
        futureTotalDiv, futureExpectedTotalROI // UI에 뿌려줄 데이터 반환
      };
    });
  }, [accounts, stocks, exchangeRate, currentYearNum]);

  const globalStats = useMemo(() => {
    let globalInvested = 0, globalValue = 0, globalProfit = 0, accountCashSum = 0, globalReceivedDiv = 0; 
    const rate = toPureNumber(exchangeRate) || 1392;
    accounts.forEach(acc => {
      const isSav = acc.type === 'savings';
      const cStocks = stocks.filter(s => (s.accountId || 'default') === acc.id);
      let tInvested = 0, tValue = 0, tDiv = 0;
      cStocks.forEach(s => {
        const qty = toPureNumber(s.quantity), curP = isSav ? 1 : toPureNumber(s.currentPrice), buyP = isSav ? 1 : toPureNumber(s.buyPrice), mult = (s.isUSD && !isSav) ? rate : 1;
        tInvested += buyP * qty * mult; tValue += curP * qty * mult;
        Object.values(s.dividendTimeline || {}).forEach(v => tDiv += toPureNumber(v));
      });
      globalInvested += tInvested; globalValue += tValue; globalReceivedDiv += tDiv;
      globalProfit += (tValue - tInvested) + tDiv; accountCashSum += toPureNumber(acc.cash);
    });
    const totalAssets = globalValue + accountCashSum + globalCash;
    const totalPrincipal = globalInvested + accountCashSum + globalCash;
    return { globalInvested, globalValue, globalProfit, accountCashSum, globalReceivedDiv, totalAssets, totalPrincipal, totalROI: globalInvested > 0 ? (globalProfit / globalInvested) * 100 : 0 };
  }, [accounts, stocks, exchangeRate, globalCash]);

  const currentAccountStat = accountStatsList.find(a => a.id === selectedAccountId) || accountStatsList[0];
  
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
      localStorage.setItem('kj_final_v87_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, [globalStats, currentYearNum, currentMonthNum]);

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
    localStorage.setItem('kj_final_v87_accounts', JSON.stringify(accs));
    localStorage.setItem('kj_final_v87_fx', fx);
    localStorage.setItem('kj_final_v87_title', title);
    localStorage.setItem('kj_final_v87_subtitle', subtitle);
    localStorage.setItem('kj_final_v87_characterName', charName);
    localStorage.setItem('kj_final_v87_theme', theme);
    localStorage.setItem('kj_final_v87_zoom', JSON.stringify(zLevel));
    localStorage.setItem('kj_final_v87_globalCash', JSON.stringify(gCash));
  };

  const logTrade = (tradeDetails) => {
    const newLog = { id: Date.now().toString(), date: dateString, timestamp: Date.now(), ...tradeDetails };
    const updatedLogs = [newLog, ...tradeLogs];
    setTradeLogs(updatedLogs);
    localStorage.setItem('kj_final_v87_tradeLogs', JSON.stringify(updatedLogs));
  };

  const handleExportData = () => {
    const backupData = JSON.stringify({ accounts, stocks, historyRecords, tradeLogs, globalCash, appTitle, appSubtitle, characterName, appTheme, zoomLevel, exchangeRate, profileImage });
    navigator.clipboard.writeText(backupData).then(() => showToast("✅ 복사되었습니다! 메모장에 보관하세요.")).catch(() => showToast("❌ 복사에 실패했습니다."));
  };
  
  const handleImportData = () => {
    const input = prompt("복사해둔 백업 데이터를 여기에 붙여넣기 하세요:");
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
      
      saveConfig(data.accounts || accounts, data.exchangeRate || exchangeRate, data.appTitle || appTitle, data.appSubtitle || appSubtitle, data.characterName || characterName, data.appTheme || appTheme, data.globalCash ?? globalCash, data.zoomLevel || zoomLevel);
      showToast("✅ 복원되었습니다!");
    } catch (e) { showToast("❌ 데이터 형식이 올바르지 않습니다."); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditProfileImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddClick = () => {
    setEditingStockId(null);
    setNewStock({ 
      name: '', ticker: '', buyPrice: '', quantity: '', targetRatio: '', isUSD: false, 
      currentPrice: '', dividendTimeline: {}, divPerShare: '', divFreq: '월', divDay: '15',
      maturityDate: '', interestRate: '', interestType: '단리' 
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
        logTrade({ type: 'sell', name: target.name, notes: '수동 삭제됨' });
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

  const handleDeleteAccount = (idToDel) => {
    if (accounts.length <= 1) return showToast("⚠️ 최소 하나 이상의 계좌가 필요합니다.");
    setConfirmModal({
      isOpen: true, message: "계좌를 삭제하시겠습니까?\n계좌 내 모든 항목이 지워집니다.",
      onConfirm: () => {
        saveStateToHistory();
        const updatedAccs = accounts.filter(a => a.id !== idToDel);
        const updatedStocks = stocks.filter(s => s.accountId !== idToDel);
        setAccounts(updatedAccs);
        setStocks(updatedStocks);
        if (selectedAccountId === idToDel) setSelectedAccountId(updatedAccs[0].id);
        saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, globalCash);
        showToast("🗑️ 삭제되었습니다.");
      }
    });
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
    localStorage.setItem('kj_final_v87_history', JSON.stringify(updated));
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

    if (itemWithdrawModal.toAccId === 'wallet') {
      newGlobalCash += amount;
      showToast(`💸 ₩${formatNum(amount)} 지갑으로 이동 완료!`);
    } else {
      updatedAccs = updatedAccs.map(a => a.id === itemWithdrawModal.toAccId ? { ...a, cash: String(toPureNumber(a.cash) + amount) } : a);
      const targetName = accounts.find(a => a.id === itemWithdrawModal.toAccId)?.name;
      showToast(`💸 ₩${formatNum(amount)} '${targetName}'(으)로 이동 완료!`);
    }

    logTrade({ type: 'sell', name: target.name, shares: amount, sellPrice: 1, isUSD: false, profit: 0, roi: 0, notes: '저축 출금' });

    setItemWithdrawModal({ isOpen: false, targetId: null, amount: '', toAccId: 'wallet' });
    
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

    const targetId = savingsWithdrawModal.targetAccId || 'wallet';
    if (targetId === 'wallet') {
      newGlobalCash += amount;
      showToast(`💸 ₩${formatNum(amount)} 지갑으로 이동 완료!`);
    } else {
      updatedAccs = updatedAccs.map(a => a.id === targetId ? { ...a, cash: String(toPureNumber(a.cash) + amount) } : a);
      const targetName = accounts.find(a => a.id === targetId)?.name;
      showToast(`💸 ₩${formatNum(amount)} '${targetName}'(으)로 이동 완료!`);
    }

    setGlobalCash(newGlobalCash);
    setAccounts(updatedAccs);
    setSavingsWithdrawModal({ isOpen: false, amount: '', targetAccId: 'wallet' });
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
    const newCash = globalCash + income;
    
    let updatedStocks = stocks.map(s => s.id === id ? updatedStock : s);
    setStocks(updatedStocks);
    setGlobalCash(newCash);
    setPendingSells(p => ({...p, [id]: false}));
    setSellAmount('');
    
    const profit = income - (sellQty * toPureNumber(target.buyPrice) * mult);
    const roi = toPureNumber(target.buyPrice) > 0 ? ((toPureNumber(target.currentPrice) - toPureNumber(target.buyPrice)) / toPureNumber(target.buyPrice)) * 100 : 0;
    logTrade({ type: 'sell', name: target.name, shares: sellQty, sellPrice: target.currentPrice, isUSD: target.isUSD, profit, roi });
    showToast(`💰 지갑으로 입금되었습니다.`);

    if (newQty === 0) {
      showConfirm("남은 주식을 전부 매도하였습니다.\n해당 카드를 삭제할까요?", () => {
        saveStateToHistory();
        const finalStocks = updatedStocks.filter(s => s.id !== id);
        setStocks(finalStocks);
        setGlobalCash(newCash);
        localStorage.setItem('kj_final_v87_globalCash', JSON.stringify(newCash));
      }, () => {
        setStocks(updatedStocks);
        setGlobalCash(newCash);
        localStorage.setItem('kj_final_v87_globalCash', JSON.stringify(newCash));
      });
    } else {
      setStocks(updatedStocks);
      setGlobalCash(newCash);
      localStorage.setItem('kj_final_v87_globalCash', JSON.stringify(newCash));
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

    if (depositSourceId === 'wallet') {
      if (amount > globalCash) return showToast("⚠️ 지갑 잔액이 부족합니다.");
      updatedGlobalCash -= amount;
    } else {
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
    setDepositSourceId('wallet');
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
    const newCash = globalCash + finalAmt;
    const newStocks = stocks.filter(s => s.id !== target.id);
    const principal = toPureNumber(target.quantity);
    const profit = finalAmt - principal;
    const roi = principal > 0 ? (profit / principal) * 100 : 0;

    logTrade({ type: 'maturity', name: target.name, principal, finalAmount: finalAmt, profit, roi });
    setStocks(newStocks);
    setGlobalCash(newCash);
    setSavingsMaturityModal({ isOpen: false, targetId: null, finalAmount: '' });
    showToast(`🎉 축하합니다!\n노력의 결실 ₩${formatNum(finalAmt)} 입금 완료! 🥳`);

    localStorage.setItem('kj_final_v87_globalCash', JSON.stringify(newCash));
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
    setIsModalOpen(false);
    showToast(editingStockId ? `✅ 수정되었습니다.` : `✅ 추가되었습니다.`);
    
  };

  const handleFormattedChange = (field, value) => {
    let clean = value.replace(/[^0-9.]/g, "");
    setNewStock(prev => ({ ...prev, [field]: clean }));
  };

  const openGlobalDivModal = (mode = 'batch', stockId = null) => {
    if (stocks.length === 0) return showToast("⚠️ 항목을 추가해주세요.");
    const temp = {};
    stocks.forEach(s => { temp[s.id] = { ...(s.dividendTimeline || {}) }; });
    setTempTimelines(temp); 
    setDivInputView(mode);
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

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-md">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-2">{characterName} 부자 포트폴리오</h1>
          <p className="text-xs font-bold text-slate-400 mb-8 text-center">원하는 아이디를 만들어 시작하세요</p>
          
          <form onSubmit={handleAuthSubmit} className="w-full flex flex-col gap-3">
            <input type="text" placeholder="아이디 (영문/숫자)" className="w-full bg-slate-50 p-3.5 rounded-xl font-bold text-sm outline-none border focus:border-slate-800 transition-colors" value={authId} onChange={e => setAuthId(e.target.value.replace(/[^A-Za-z0-9]/g, ''))} required />
            <input type="password" placeholder="비밀번호 (6자리 이상)" className="w-full bg-slate-50 p-3.5 rounded-xl font-bold text-sm outline-none border focus:border-slate-800 transition-colors" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required minLength={6} />
            
            {/* 🎯 해결: ID/PW 저장 체크박스 추가 */}
            <label className="flex items-center gap-2 mt-1 cursor-pointer w-fit">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 accent-slate-800 cursor-pointer" />
              <span className="text-xs font-bold text-slate-500">ID / PW 기억하기</span>
            </label>

            <button type="submit" className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-black text-sm mt-2 shadow-md hover:bg-slate-900 transition-colors">{isSignUpMode ? '가입하고 시작하기' : '안전하게 로그인'}</button>
          </form>
          
          <button onClick={() => setIsSignUpMode(!isSignUpMode)} className="mt-5 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors">
            {isSignUpMode ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 1초 만에 가입하기'}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`min-h-screen ${t.bg} text-slate-800 pb-16 selection:bg-slate-200 transition-colors duration-500`} style={{ fontFamily: "'Pretendard', sans-serif", zoom: zoomLevel / 100 }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        html { overflow-y: scroll; }
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
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">🇺🇸 $1 = ₩{formatNum(exchangeRate)}</span>
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
              {/* 모바일에서만 보이는 갱신 버튼 그룹 */}
              <div className="md:hidden flex items-center gap-1 shrink-0 ml-2 h-[28px]">
                {activeTab === 'accountbook' && (
                  <div className="bg-slate-800 text-white px-2.5 h-full rounded-full text-[10px] font-black flex items-center shadow-sm">
                    ₩{formatNum(globalCash)}
                  </div>
                )}
                <div className="flex items-center gap-1 bg-white/60 p-1 rounded-full border border-slate-200 shadow-sm h-full">
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
            <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black transition-all whitespace-nowrap tracking-tighter ${activeTab === 'history' ? t.main : 'text-slate-500 hover:bg-slate-50'}`}>🐾 재테크</button>
            <button onClick={() => setActiveTab('yield')} className={`flex-1 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black transition-all whitespace-nowrap tracking-tighter ${activeTab === 'yield' ? t.main : 'text-slate-500 hover:bg-slate-50'}`}>🌱 성장일기</button>
            <button onClick={() => setActiveTab('accountbook')} className={`flex-1 py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-[10px] sm:text-xs font-black transition-all whitespace-nowrap tracking-tighter ${activeTab === 'accountbook' ? t.main : 'text-slate-500 hover:bg-slate-50'}`}>📔 가계부</button>
          </div>
          {/* 웹에서만 보이는 갱신 버튼 그룹 */}
          <div className="hidden md:flex items-center justify-end gap-1.5 w-full relative z-20 h-[32px]">
            <div className="flex items-center gap-1 shrink-0 bg-white/60 p-1.5 rounded-full border border-slate-200 shadow-sm h-full">
              <button onClick={handleUpdateStockPrices} disabled={isFetchingStocks} className={`px-2.5 h-full rounded-full text-[10px] font-black transition-all whitespace-nowrap flex items-center gap-1 text-slate-500 hover:bg-slate-200 ${isFetchingStocks ? 'opacity-50 cursor-wait' : ''}`}><RefreshCw size={10} className={isFetchingStocks ? 'animate-spin' : ''}/> 현재가 갱신</button>
              <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
              <button onClick={handleUndo} disabled={pastStates.length === 0} className={`px-2.5 h-full rounded-full text-[10px] font-black transition-all whitespace-nowrap ${pastStates.length > 0 ? `${t.light}` : 'text-slate-300 cursor-not-allowed'}`}>슝💨</button>
              <button onClick={handleRedo} disabled={futureStates.length === 0} className={`px-2.5 h-full rounded-full text-[10px] font-black transition-all whitespace-nowrap ${futureStates.length > 0 ? `${t.light}` : 'text-slate-300 cursor-not-allowed'}`}>뿅✨</button>
            </div>
          </div>
        </div>
      </header>

      {/* Account Tabs & Wallet (분리형) */}
      {activeTab === 'portfolio' && (
        <div className="max-w-5xl mx-auto px-4 mb-4 mt-2 animate-in fade-in zoom-in duration-300 relative z-20">
          <div className="flex flex-row items-stretch gap-2 w-full">
            {/* Left: Accounts Container */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 bg-white p-2 md:p-1.5 rounded-[1.25rem] md:rounded-[1rem] shadow-sm border border-slate-200">
              {accounts.map((acc, index) => (
                <button 
                  key={acc.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} onDragEnd={handleDragEnd} onClick={() => setSelectedAccountId(acc.id)} 
                  className={`px-3 py-1.5 rounded-xl md:rounded-lg text-[11px] md:text-xs font-black whitespace-nowrap transition-all duration-300 shrink-0 cursor-grab active:cursor-grabbing ${selectedAccountId === acc.id ? (acc.type === 'savings' ? t.accSavings : t.accStock) : 'bg-slate-50 text-slate-500 hover:bg-slate-100'} ${draggedAccIdx === index ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}
                >
                  {acc.type === 'savings' ? '🏦 ' : '📈 '}{acc.name}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); setEditAccountName(currentAccountStat?.name); setIsEditAccountOpen(true); }} className="bg-slate-50 text-slate-500 px-2 py-1.5 rounded-lg font-bold text-[10px] hover:bg-slate-200"><Edit2 size={12}/></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteAccount(selectedAccountId); }} className={`bg-slate-50 text-slate-400 px-2 py-1.5 rounded-lg font-bold text-[10px] hover:${t.light.split(' ')[0]} transition-colors`}><Trash2 size={12}/></button>
                <button type="button" onClick={() => setIsAddAccountOpen(true)} className={`${t.light} px-2 py-1.5 rounded-lg font-black text-[10px] flex items-center gap-1`}><Plus size={12}/> 추가</button>
              </div>
            </div>

            {/* Right: Wallet Button (독립형) */}
            <button onClick={() => { setInvestTab('wallet'); setIsInvestModalOpen(true); }} className="shrink-0 bg-slate-800 text-white px-3 md:px-4 py-2 md:py-1.5 rounded-[1.25rem] md:rounded-[1rem] text-[11px] md:text-xs font-black flex flex-col md:flex-row justify-center items-center md:gap-1.5 hover:bg-slate-700 transition-colors shadow-sm whitespace-nowrap border border-slate-700">
              <span className="flex items-center gap-1"><Wallet size={12} className="md:hidden" />👛 지갑</span>
              <span className="text-emerald-400 mt-0.5 md:mt-0">₩{formatNum(globalCash)}</span>
            </button>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 mt-2">
        {/* --- PORTFOLIO TAB --- */}
        {activeTab === 'portfolio' && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 min-h-[70px] flex flex-col justify-center overflow-hidden relative">
                 <div className="flex justify-between items-center mb-1">
                   <span className={`text-[10px] sm:text-[11px] font-black text-slate-500 flex items-center gap-1 sm:gap-1.5 truncate ${currentAccountStat?.type === 'savings' ? `cursor-pointer hover:${t.text} transition-colors group/label` : ''}`} onClick={() => { if(currentAccountStat?.type === 'savings') { setEditLabelInput(currentAccountStat.label || '입출금 통장'); setIsEditLabelModalOpen(true); } }}>
                     <PieChart size={12} className="shrink-0"/> <span className="truncate">[{currentAccountStat?.name}] {currentAccountStat?.type === 'savings' ? currentAccountStat.label : '총 평가액'}</span>
                     {currentAccountStat?.type === 'savings' && <Edit2 size={10} className="ml-0.5 opacity-50 group-hover/label:opacity-100 shrink-0" />}
                   </span>
                   <div className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black text-white shrink-0 ml-1 ${currentAccountStat?.type === 'stock' ? (currentAccountStat?.totalROI >= 0 ? t.main.split(' ')[0] : 'bg-blue-400') : 'opacity-0 invisible'}`}>
                     {currentAccountStat?.totalROI >= 0 ? '▲' : '▼'} {formatNum(Math.abs(currentAccountStat?.totalROI), 1)}%
                   </div>
                 </div>
                 <div className="flex items-baseline gap-1 sm:gap-1.5 overflow-hidden">
                   <span className="text-slate-400 text-xs sm:text-sm font-black shrink-0">₩</span>
                   {isEditingAccCash && currentAccountStat?.type === 'savings' ? (
                      <div className="flex items-center gap-1 z-20"><input type="text" className="w-16 sm:w-24 text-right border-b border-slate-300 font-black text-slate-800 text-sm sm:text-xl outline-none bg-transparent" value={toCommaString(editAccCashAmount)} onChange={e => setEditAccCashAmount(e.target.value.replace(/[^0-9]/g, ''))} autoFocus /><button onClick={() => { const val = editAccCashAmount.trim() === '' ? currentAccountStat?.cash : toPureNumber(editAccCashAmount); setAccounts(accounts.map(a => a.id === selectedAccountId ? { ...a, cash: String(val) } : a)); setIsEditingAccCash(false); }} className={`${t.main} px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold`}>저장</button></div>
                   ) : (
                     <span className="text-[17px] sm:text-2xl font-black text-slate-800 tracking-tight leading-none cursor-pointer flex items-center gap-1.5 truncate py-1" onClick={() => { if(currentAccountStat?.type === 'savings') { setEditAccCashAmount(''); setIsEditingAccCash(true); } }}>
                       {formatNum(currentAccountStat?.type === 'savings' ? currentAccountStat?.cash : (currentAccountStat?.totalValue || 0) + (currentAccountStat?.cash || 0))}
                       {currentAccountStat?.type === 'savings' && <Edit2 size={10} className="text-slate-300 hover:text-slate-500 shrink-0"/>}
                     </span>
                   )}
                   {currentAccountStat?.type === 'stock' && <span className="text-[8px] sm:text-[9px] font-black text-slate-400 ml-1 opacity-80 uppercase hidden sm:inline whitespace-nowrap">원금 ₩{formatNum(currentAccountStat?.totalInvestedKRW)}</span>}
                   {currentAccountStat?.type === 'savings' && !inlineConsume.isOpen && (
                     <div className="flex items-center gap-0.5 sm:gap-1 ml-auto shrink-0 relative -top-0.5">
                       <button onClick={(e) => { e.stopPropagation(); setInlineConsume({isOpen: true, amount: ''}) }} className={`${t.light} px-1.5 sm:px-2 py-1 rounded shadow-sm text-[8px] sm:text-[9px] font-black transition-colors`}>🛍️ 소비</button>
                       <button onClick={(e) => { e.stopPropagation(); setSavingsWithdrawModal({ isOpen: true, amount: '', targetAccId: 'wallet' }) }} className="bg-slate-100 text-slate-600 px-1.5 sm:px-2 py-1 rounded shadow-sm text-[8px] sm:text-[9px] font-black hover:bg-slate-200 transition-colors">💸 출금</button>
                     </div>
                   )}
                   {currentAccountStat?.type === 'savings' && inlineConsume.isOpen && (
                     <div className="flex items-center gap-1 ml-auto shrink-0 relative -top-0.5">
                       <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-50 rounded p-1 border border-slate-200">
                         <input type="text" className="w-12 sm:w-16 text-[9px] sm:text-[10px] p-0.5 rounded text-right outline-none text-slate-600 font-black bg-white" placeholder="금액" value={toCommaString(inlineConsume.amount)} onChange={e => setInlineConsume({...inlineConsume, amount: e.target.value.replace(/[^0-9]/g, '')})} autoFocus />
                         <button onClick={handleInlineConsumeConfirm} className={`${t.main} px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black whitespace-nowrap`}>확정</button>
                         <button onClick={() => setInlineConsume({isOpen: false, amount: ''})} className="bg-slate-200 text-slate-600 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black hover:bg-slate-300 whitespace-nowrap">취소</button>
                       </div>
                     </div>
                   )}
                 </div>
              </div>
              
              <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-3 sm:p-4 min-h-[70px] flex flex-col justify-center overflow-hidden">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] sm:text-[11px] font-black text-orange-500 flex items-center gap-1 sm:gap-1.5 truncate">
                     {currentAccountStat?.type === 'stock' ? <><Star size={12} className="shrink-0"/> <span className="truncate">예상 연 배당금</span></> : <><Landmark size={12} className="shrink-0"/> <span className="truncate">현재 저축 합계</span></>}
                   </span>
                   {currentAccountStat?.type === 'stock' ? (
                     <div className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black border border-orange-100 text-orange-600 bg-orange-50 shrink-0 ml-1 ${currentAccountStat?.futureExpectedTotalROI >= 0 ? '' : 'text-blue-500 bg-blue-50 border-blue-100'}`}>
                       <span className="opacity-90 hidden lg:inline">배당포함</span> {formatNum(Math.abs(currentAccountStat?.futureExpectedTotalROI), 1)}%
                     </div>
                   ) : (
                     <div className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black shrink-0 ml-1 ${t.altText} ${t.altBgOnly}`}>
                       <span className="hidden sm:inline">만기 예상</span> ₩{formatNum(currentAccountStat?.savingsExpectedTotal)}
                     </div>
                   )}
                 </div>
                 <div className="flex items-baseline gap-1 sm:gap-1.5 overflow-hidden">
                   <span className="text-orange-400 text-xs sm:text-sm font-black shrink-0">₩</span>
                   <span className="text-[17px] sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none truncate py-1">{formatNum(currentAccountStat?.type === 'stock' ? currentAccountStat?.futureTotalDiv : currentAccountStat?.totalValue)}</span>
                   <span className={`text-[8px] sm:text-[9px] font-black text-slate-400 ml-1 opacity-80 uppercase hidden sm:inline whitespace-nowrap ${currentAccountStat?.type === 'savings' ? 'opacity-0 invisible' : ''}`}>누적 ₩{formatNum(currentAccountStat?.totalReceivedDivKRW)}</span>
                 </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-3 px-1 gap-1 w-full">
              <h3 className={`font-black text-slate-800 flex items-center gap-1 text-[11px] sm:text-sm h-[28px] shrink-0`}>
                <Heart size={14} className={t.text} /> 내 {currentAccountStat?.type === 'stock' ? '보유 종목' : '저축 상품'}
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

            {/* 컴팩트화된 종목 리스트 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2">
              {currentAccountStat?.rebalanceData.length === 0 ? (
                <button onClick={handleAddClick} className={`col-span-full picture-card p-4 flex flex-col items-center justify-center ${t.light} border-2 border-dashed ${t.border} transition-colors group min-h-[90px] md:min-h-[110px]`}><div className={`bg-white p-2 md:p-2.5 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-1.5 md:mb-2`}><Plus className={t.text} size={16} /></div><span className={`font-black text-[10px] md:text-[11px] ${t.text}`}>{stocks.length === 0 ? '텅 비어있어요! 첫 항목 추가' : '새 항목 추가'}</span></button>
              ) : (
                <>
                  {currentAccountStat?.rebalanceData.map(s => {
                    const isP = s.stockROI >= 0, isSavings = currentAccountStat.type === 'savings';
                    const divAmount = toPureNumber(s.quantity) * toPureNumber(s.divPerShare) * (s.isUSD ? toPureNumber(exchangeRate) : 1);
                    
                    const availableSources = [];
                    if (globalCash > 0) availableSources.push({ id: 'wallet', name: '지갑', cash: globalCash });
                    accounts.filter(a => toPureNumber(a.cash) > 0 && a.id !== selectedAccountId).forEach(a => availableSources.push({ id: a.id, name: a.name, cash: toPureNumber(a.cash) }));
                    if (isSavings && currentAccountStat.cash > 0) {
                      if (!availableSources.some(src => src.id === selectedAccountId)) {
                         availableSources.push({ id: selectedAccountId, name: '입출금 통장', cash: currentAccountStat.cash });
                      }
                    }
                    const canDeposit = availableSources.length > 0;

                    return (
                      <div key={s.id} onClick={() => setActiveCardId(activeCardId === s.id ? null : s.id)} className={`picture-card p-2 md:p-3 relative cursor-pointer transition-all group flex flex-col justify-between gap-1 md:gap-1.5 overflow-hidden min-h-[95px] md:min-h-[110px] ${activeCardId === s.id ? 'border-slate-400 ring-2 ring-slate-100 shadow-md' : 'hover:border-slate-300 border-transparent'}`}>
                        <div className="flex justify-between items-start"><div className="flex flex-col min-w-0 pr-1"><h4 className="font-bold text-slate-800 text-[11px] md:text-[12px] truncate leading-tight flex items-center gap-0.5 md:gap-1">{s.name}{isSavings && <button onClick={(e)=>{ e.stopPropagation(); setSavingsMaturityModal({ isOpen: true, targetId: s.id, finalAmount: String(Math.floor(toPureNumber(s.quantity) * (s.interestType==='복리'?Math.pow(1+toPureNumber(s.interestRate)/100,1):(1+toPureNumber(s.interestRate)/100)))) }); }} className="bg-amber-100 text-amber-600 px-1 md:px-1.5 py-0.5 rounded text-[7px] md:text-[8px] font-black shrink-0 ml-0.5 hover:bg-amber-200 transition-colors shadow-sm">🎉 만기</button>}</h4><span className="text-[8px] md:text-[9px] font-bold text-slate-400 mt-0.5 truncate">{isSavings ? `${s.interestType} ${s.interestRate}%` : <>{s.targetRatio !== '' && s.targetRatio !== undefined ? `목표 ${s.targetRatio}% ` : ''}<span className="text-slate-500 font-black">({formatNum(s.currentRatio, 1)}%)</span></>}</span></div>
                        {!isSavings && toPureNumber(s.divPerShare) > 0 && <span className={`text-[7px] md:text-[8px] font-black ${t.text} ${t.light.split(' ')[0]} px-1 py-0.5 rounded shadow-sm shrink-0 whitespace-nowrap`}>배당 ₩{formatNum(s.divPerShare)}</span>}{isSavings && <span className={`text-[8px] md:text-[9px] font-black ${t.altText} ${t.altBgOnly} px-1 md:px-1.5 py-0.5 rounded shadow-sm shrink-0 whitespace-nowrap`}>저축</span>}</div>
                        <div className="flex justify-between items-end bg-slate-50 rounded-md md:rounded-lg p-1.5 md:p-2 border border-slate-100">
                          <div className="flex flex-col gap-0.5 min-w-0"><span className="text-slate-500 font-bold text-[8px] md:text-[9px] truncate">{isSavings ? `만기: ${s.maturityDate || '-'}` : `${s.isUSD ? '$' : '₩'}${formatNum(s.currentPrice, s.isUSD ? 2 : 0)}`}</span><span className="text-slate-800 font-black text-[9px] md:text-[10px] truncate">{isSavings ? `원금 ₩${formatNum(s.investedKRW)}` : `${formatNum(s.quantity)}주 보유`}</span></div>
                          <div className="flex flex-col items-end gap-0.5 ml-1 text-right min-w-0">{!isSavings ? (<><span className="text-slate-800 font-black text-[9px] md:text-[10px] truncate w-full">₩{formatNum(toPureNumber(s.currentPrice) * toPureNumber(s.quantity) * (s.isUSD ? toPureNumber(exchangeRate) : 1))}</span><span className={`text-[8px] md:text-[9px] font-black ${isP?t.text:'text-blue-500'}`}>{isP?'▲':'▼'}{formatNum(Math.abs(s.stockROI), 1)}%</span></>) : (<><span className="text-slate-800 font-black text-[9px] md:text-[10px] truncate w-full">₩{formatNum(s.quantity)}</span>{s.interestRate && <span className={`${t.altText} font-black text-[8px] md:text-[9px] truncate`}>예상 ₩{formatNum(Math.floor(s.interestType==='복리' ? toPureNumber(s.quantity)*Math.pow(1+toPureNumber(s.interestRate)/100,1) : toPureNumber(s.quantity)*(1+toPureNumber(s.interestRate)/100)))}</span>}</>)}</div>
                        </div>
                        <div className="flex gap-1 mt-1 h-[20px] md:h-[24px]">
                          {!isSavings ? ( <>
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
                        </div>
                        <div className={`absolute top-1.5 md:top-2 right-1.5 md:right-2 flex gap-0.5 md:gap-1 bg-white/90 backdrop-blur-sm p-0.5 md:p-1 rounded-md md:rounded-lg border border-slate-100 shadow-sm transition-all duration-200 ${activeCardId === s.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'}`}>
                          <button className="p-1 md:p-1.5 text-slate-400 hover:text-blue-500 transition-colors rounded" onClick={(e) => { e.stopPropagation(); handleEditClick(s); }}><Edit2 size={12} className="md:w-3.5 md:h-3.5"/></button>
                          <button className="p-1 md:p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded" onClick={(e) => { e.stopPropagation(); handleDeleteStock(e, s.id); }}><Trash2 size={12} className="md:w-3.5 md:h-3.5"/></button>
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
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500 flex flex-col mt-2">
            <div className="flex flex-row gap-2 mb-3 items-stretch min-h-[85px] w-full shrink-0">
              <div className="bg-slate-800 rounded-xl p-3 text-white shadow-md flex flex-row flex-1 items-center gap-3 min-w-0">
                <div className="flex flex-col justify-center shrink-0 w-[40%] sm:w-[35%] border-r border-slate-600/50 pr-2 h-full">
                   <span className="text-slate-300 font-bold text-[9px] mb-1 flex items-center gap-1"><Briefcase size={10}/> 전체 총 자산</span>
                   <span className="text-[17px] sm:text-xl font-black break-words leading-tight mb-1">₩{formatNum(globalStats.totalAssets)}</span>
                   <div className="flex gap-2 text-[8px]">
                    <span className="text-slate-400">수익률 <span className={globalStats.totalROI >=0 ? t.text : 'text-blue-400'}>{formatNum(globalStats.totalROI, 1)}%</span></span>
                    <span className="text-slate-400 hidden sm:inline">원금 ₩{formatNum(globalStats.totalPrincipal)}</span>
                  </div>
                </div>
                <div className="flex-1 h-full flex flex-col justify-end relative min-w-0 pb-0.5">
                  <div className="absolute top-0 right-0 flex gap-1 z-10">
                      <button onClick={() => setChartViewMode('month')} className={`text-[8px] px-1.5 py-0.5 rounded ${chartViewMode === 'month' ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-400'}`}>월별</button>
                      <button onClick={() => setChartViewMode('year')} className={`text-[8px] px-1.5 py-0.5 rounded ${chartViewMode === 'year' ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-400'}`}>연별</button>
                  </div>
                  {chartDataFinal.length > 0 ? ( <div className="w-full h-[45px] relative"><svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none"><path d={`M ${chartPointsFinal}`} fill="none" stroke="#94a3b8" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  ) : ( <div className="text-[9px] font-bold text-slate-500 opacity-60 flex items-center justify-center h-full w-full">데이터 없음</div> )}
                </div>
              </div>
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl w-[70px] sm:w-[90px] flex flex-col items-center justify-center shrink-0 p-1.5">
                <img src={easterEgg.img} alt="level" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-sm mb-1 bg-slate-50" />
                <span className="text-[8px] font-black text-slate-700 text-center tracking-tighter truncate w-full px-0.5">{easterEgg.msg}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <div className="bg-slate-800 text-white rounded-xl p-3.5 shadow-sm border border-slate-700 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex justify-between items-center mb-1.5">
                    <h4 className="font-bold text-[12px] truncate flex items-center gap-1.5"><Wallet size={12} className="text-emerald-400"/> 지갑</h4>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]"><span className="text-slate-400 font-bold whitespace-nowrap">금액</span><span className="font-black text-white truncate ml-1 text-right">₩{formatNum(globalCash)}</span></div>
                    <div className="w-full border-t border-dashed border-slate-600 my-0.5"></div>
                    <div className="flex justify-between text-[10px]"><span className="text-slate-400 font-bold">유형</span><span className="font-black text-emerald-400">현금</span></div>
                  </div>
                </div>

                {accountStatsList.map(acc => (
                <div key={acc.id} className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-100 flex flex-col justify-between relative group overflow-hidden">
                  <div className="flex justify-between items-center mb-2.5"><h4 className="font-bold text-slate-800 text-[12px] truncate flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${acc.type === 'stock' ? t.main.split(' ')[0] : t.altMain.split(' ')[0]}`}></div> {acc.name}</h4></div>
                  <div className="space-y-1.5"><div className="flex justify-between text-[11px]"><span className="text-slate-500 font-bold whitespace-nowrap">평가액</span><span className="font-black text-slate-800 truncate ml-1 text-right">₩{formatNum(acc.totalValue + acc.cash)}</span></div><div className="flex justify-between text-[10px]"><span className="text-slate-400 font-bold whitespace-nowrap">{acc.type === 'savings' ? '여분 금액' : '계좌 잔여금'}</span><span className="font-bold text-slate-600 truncate ml-1 text-right">₩{formatNum(acc.cash)}</span></div><div className="w-full border-t border-dashed border-slate-100 my-1"></div><div className="flex justify-between text-[10px]"><span className="text-slate-500 font-bold">유형</span><span className={`font-black whitespace-nowrap ${acc.type === 'stock' ? t.text : t.altText}`}>{acc.type === 'stock' ? '주식' : '저축'}</span></div></div>
                </div>
              ))}</div>
            </div>
          </div>
        )}

        {/* --- HISTORY TAB --- */}
        {activeTab === 'history' && (
          <section className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm min-h-[400px] mt-2 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h2 className={`font-bold text-sm sm:text-base ${t.text} flex items-center gap-1.5`}><span className="text-[16px]">🐾</span> 재테크 발자취</h2>
              <span className="text-[10px] font-bold text-slate-400">나의 투자 기록</span>
            </div>
            {(!tradeLogs || tradeLogs.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400"><Database size={32} className="mb-3 opacity-30"/><p className="text-xs font-bold">아직 기록된 발자취가 없습니다.</p></div>
            ) : (
              <div className="space-y-4">
                {Object.keys(groupedTradeLogs || {}).filter(y => y && y.length >= 4).sort((a,b)=>b.localeCompare(a)).map(year => (
                   <div key={year} className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4">
                     <button onClick={() => setExpandedLogYears(p => ({...p, [year]: !p[year]}))} className="flex items-center gap-2 font-black text-sm text-slate-700 w-full mb-2">
                        {expandedLogYears[year] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>} {year}년
                     </button>
                     {expandedLogYears[year] && Object.keys(groupedTradeLogs[year] || {}).filter(m => m).sort((a,b)=>b.localeCompare(a)).map(month => (
                        <div key={month} className="ml-2 pl-2 border-l-2 border-slate-200 mb-3">
                           <button onClick={() => setExpandedLogMonths(p => ({...p, [`${year}-${month}`]: !p[`${year}-${month}`]}))} className="flex items-center gap-1 font-bold text-xs text-slate-500 w-full mb-2 hover:text-slate-700">
                             {expandedLogMonths[`${year}-${month}`] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} {month}월
                           </button>
                           
                           {expandedLogMonths[`${year}-${month}`] && ['dividend', 'maturity', 'sell', 'buy', 'income', 'expense'].map(type => {
                             if (!groupedTradeLogs[year][month][type] || groupedTradeLogs[year][month][type].length === 0) return null;
                             return (
                               <div key={type} className="mb-2 ml-2">
                                 <h5 className="font-bold text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                                   {type === 'buy' ? '📉 매수' : type === 'sell' ? '📈 매도' : type === 'maturity' ? '🎉 만기' : type === 'dividend' ? '💰 배당' : type === 'income' ? '💵 수익(급여/기타)' : '💳 소비'}
                                 </h5>
                                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                   {groupedTradeLogs[year][month][type].map(log => {
                                     if (!log) return null;
                                     return (
                                     <div key={log.id} className={`bg-white p-2.5 rounded-xl shadow-sm border flex flex-col gap-1 hover:shadow-md transition-shadow ${type === 'income' ? 'border-emerald-100' : type === 'expense' ? 'border-rose-100' : 'border-slate-100'}`}>
                                       <span className="text-[9px] text-slate-400 font-bold text-right w-full">{log.date ? log.date.substring(5) : '날짜없음'}</span>
                                       <h4 className="font-black text-[11px] text-slate-800 truncate text-center">{log.name}</h4>
                                       
                                       {(type === 'income' || type === 'expense') && log.category && (
                                          <span className="text-[9px] font-bold text-slate-500 text-center bg-slate-50 rounded-md py-0.5 mt-0.5">{log.category}</span>
                                       )}

                                       <div className="flex flex-col mt-auto pt-1.5 border-t border-slate-50">
                                         <span className="text-[10px] font-black text-slate-600 flex justify-between items-center">
                                            <span>금액</span> 
                                            <span className={type === 'income' || type === 'sell' || type === 'dividend' ? 'text-blue-600' : 'text-rose-600'}>
                                              {type === 'buy' || type === 'expense' ? '-' : '+'}₩{formatNum(log.totalAmount || log.total || (log.sellPrice * log.shares * (log.isUSD?toPureNumber(exchangeRate):1)) || log.finalAmount || log.amount || 0)}
                                            </span>
                                         </span>
                                       </div>
                                     </div>
                                   )})}
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                     ))}
                   </div>
                ))}
              </div>
            )}
          </section>
        )}

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
        const stats = {
          year: { income: 0, expense: 0, invest: 0, salary: 0 },
          month: { income: 0, expense: 0, invest: 0, salary: 0 },
          daily: {}
        };

        safeRecords.forEach(r => {
          if (!r) return;
          const d = new Date(r?.date || r?.timestamp || Date.now());
          if (isNaN(d.getTime())) return; 

          const rYear = d.getFullYear();
          const rMonth = d.getMonth();
          const rDay = d.getDate();
          
          const amt = Number(r?.amount || r?.totalAmount || r?.total || 0);
          
          let cat = 'income'; 
          if (r?.type === 'buy') cat = 'invest';
          else if (r?.type === 'expense') cat = 'expense';
          else if (r?.type === 'income' && r?.category === '급여') cat = 'salary';
          else if (r?.type === 'income' || r?.type === 'dividend' || r?.type === 'sell' || r?.type === 'deposit') cat = 'income';

          if (rYear === calYear) {
             stats.year[cat] += amt;
             if (rMonth === calMonth) {
               stats.month[cat] += amt;
               if (!stats.daily[rDay]) stats.daily[rDay] = { income: 0, expense: 0, invest: 0, salary: 0, records: [] };
               stats.daily[rDay][cat] += amt;
               stats.daily[rDay].records.push({...r, viewCategory: cat});
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

            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 mb-3">
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100 mb-3">
                <button onClick={() => { setCalendarDate(new Date(calYear, calMonth - 1, 1)); setSelectedDay(null); }} className="px-3 text-slate-400 hover:text-slate-800 text-lg font-black">&lt;</button>
                <span className="text-sm md:text-base font-black text-slate-800">{calYear}년 {calMonth + 1}월</span>
                <button onClick={() => { setCalendarDate(new Date(calYear, calMonth + 1, 1)); setSelectedDay(null); }} className="px-3 text-slate-400 hover:text-slate-800 text-lg font-black">&gt;</button>
              </div>
              
              {accountbookTab === 'calendar' && (
                <>
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 flex flex-col gap-1">
                      <div className="text-[10px] md:text-[11px] font-black text-slate-500 text-center border-b border-slate-200 pb-1 mb-0.5">{calYear}년 요약</div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-emerald-600 font-bold">급여</span><span className="font-black text-slate-700">{formatNum(stats.year.salary)}</span></div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-blue-500 font-bold">수익</span><span className="font-black text-slate-700">{formatNum(stats.year.income)}</span></div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-purple-500 font-bold">투자</span><span className="font-black text-slate-700">{formatNum(stats.year.invest)}</span></div>
                      <div className="flex justify-between text-[9px] md:text-[10px]"><span className="text-rose-500 font-bold">소비</span><span className="font-black text-slate-700">{formatNum(stats.year.expense)}</span></div>
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
                </>
              )}

              {/* 엔빵 정산소 탭 */}
              {accountbookTab === 'dutch' && (() => {
                const othersOweMe = nbbangRecords.filter(r => r?.category === 'N빵' && !r?.isSettled);
                const totalOwed = othersOweMe.reduce((sum, r) => sum + Number(r?.amount || 0), 0);
                
                // 🎯 인원별 그룹화
                const groupedByPerson = {};
                othersOweMe.forEach(r => {
                   const match = r.name.match(/\((.*?)\s*몫\)/);
                   const personName = match ? match[1] : '일행';
                   if(!groupedByPerson[personName]) groupedByPerson[personName] = { total: 0, details: [] };
                   groupedByPerson[personName].total += Number(r.amount || 0);
                   groupedByPerson[personName].details.push(r);
                });

                // 🎯 식당(건별) 통합 그룹화
                const groupedByRestaurant = {};
                othersOweMe.forEach(r => {
                   const baseName = r.name.replace(/\s*\(.*?몫\)/, '').trim();
                   const key = `${r.date}_${baseName}`;
                   if(!groupedByRestaurant[key]) groupedByRestaurant[key] = { name: baseName, date: r.date, total: 0, details: [] };
                   groupedByRestaurant[key].total += Number(r.amount || 0);
                   groupedByRestaurant[key].details.push(r);
                });

                // 🎯 개별 정산 금액 수정 로직
                const handleEditNbbangAmount = (logId, newAmount) => {
                   const amt = toPureNumber(newAmount);
                   if (amt < 0) return;
                   saveStateToHistory();
                   const updatedLogs = tradeLogs.map(r => r.id === logId ? { ...r, amount: amt } : r);
                   setTradeLogs(updatedLogs);
                   localStorage.setItem('kj_final_v87_tradeLogs', JSON.stringify(updatedLogs));
                   setEditingNbbang(null);
                   showToast('✅ 정산 금액이 수정되었습니다.');
                };

                const handleSettleNbbang = () => {
                   if (totalOwed <= 0) return showToast('⚠️ 정산할 금액이 없습니다.');
                   saveStateToHistory();
                   const newCash = globalCash + totalOwed;
                   setGlobalCash(newCash);
                   const updatedLogs = tradeLogs.map(r => {
                     if (r.category === 'N빵' && !r.isSettled) return { ...r, isSettled: true };
                     return r;
                   });
                   setTradeLogs(updatedLogs);
                   saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newCash);
                   showToast(`🎉 정산 완료! 지갑에 ₩${formatNum(totalOwed)} 합산되었습니다.`);
                };

                return (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                     <div className="flex justify-between items-center bg-purple-50 rounded-xl p-3 border border-purple-100 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-purple-600">미정산된 N빵 총액</span>
                          <span className="text-lg font-black text-purple-800">₩{formatNum(totalOwed)}</span>
                        </div>
                        <button onClick={handleSettleNbbang} disabled={totalOwed <= 0} className="bg-purple-500 text-white px-3 py-2 rounded-lg text-[10px] font-black shadow-sm hover:bg-purple-600 disabled:bg-slate-300 transition-colors">💰 일괄 정산받기</button>
                     </div>

                     <div className="flex gap-2 mb-1 mt-1 bg-slate-50 p-1 rounded-lg">
                        <button onClick={() => { setNbbangFilter('person'); setIsSettledHistoryView(false); }} className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-colors ${nbbangFilter === 'person' && !isSettledHistoryView ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>인원별 모아보기</button>
                        <button onClick={() => { setNbbangFilter('history'); setIsSettledHistoryView(false); }} className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-colors ${nbbangFilter === 'history' && !isSettledHistoryView ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>식당별 상세내역</button>
                        <button onClick={() => setIsSettledHistoryView(true)} className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-colors ${isSettledHistoryView ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-500'}`}>완료 내역보기</button>
                     </div>

                     {isSettledHistoryView ? (
                        <div className="space-y-2 mt-2">
                          {nbbangRecords.filter(r => r?.category === 'N빵' && r?.isSettled).length === 0 ? (
                            <div className="text-center py-6 text-[10px] font-bold text-slate-400">정산 완료된 내역이 없습니다.</div>
                          ) : (
                            nbbangRecords.filter(r => r?.category === 'N빵' && r?.isSettled).map((r, i) => (
                              <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-purple-100 shadow-sm opacity-60">
                                <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                                  <span className="text-[10px] font-black text-slate-800 truncate">{r.name}</span>
                                  <span className="text-[8px] font-bold text-slate-400">{r.date || '날짜 없음'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-black text-slate-500 line-through">₩{formatNum(r.amount)}</span>
                                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-1 py-0.5 rounded">완료</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                     ) : othersOweMe.length === 0 ? (
                       <div className="text-center py-6 text-[10px] font-bold text-slate-400">받을 돈이 없습니다! 모두 정산 완료✨</div>
                     ) : (
                       <div className="space-y-2">
                         {nbbangFilter === 'person' ? (
                            // 🎯 인원별 3열(grid-cols-3) 컴팩트 뷰
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {Object.keys(groupedByPerson).map(person => (
                                <div key={person} className="bg-slate-50 p-2.5 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
                                   <div className="text-center border-b border-slate-200 pb-1.5 mb-1.5">
                                     <span className="text-[11px] font-black text-slate-800"><Heart size={10} className="inline text-purple-400 relative -top-0.5"/> {person}</span>
                                     <div className="text-[13px] font-black text-rose-500 mt-0.5">₩{formatNum(groupedByPerson[person].total)}</div>
                                   </div>
                                   <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1 max-h-[90px]">
                                     {groupedByPerson[person].details.map(detail => (
                                       <div key={detail.id} className="text-[9px] flex justify-between items-center bg-white p-1.5 rounded-md border border-slate-100 cursor-pointer hover:border-purple-300 transition-colors" onClick={() => setEditingNbbang({id: detail.id, amount: String(detail.amount)})}>
                                         {editingNbbang?.id === detail.id ? (
                                            <input type="text" className="w-full text-right outline-none bg-slate-100 px-1 rounded font-black text-blue-500 py-0.5" value={toCommaString(editingNbbang.amount)} onChange={e=>setEditingNbbang({...editingNbbang, amount: e.target.value.replace(/[^0-9]/g, '')})} autoFocus onBlur={()=>handleEditNbbangAmount(detail.id, editingNbbang.amount)} onKeyDown={(e) => e.key==='Enter' && handleEditNbbangAmount(detail.id, editingNbbang.amount)} />
                                         ) : (
                                            <><span className="truncate w-[55%] font-bold text-slate-500">{detail.name.replace(`(${person} 몫)`, '').trim()}</span><span className="font-black text-slate-700">₩{formatNum(detail.amount)}</span></>
                                         )}
                                       </div>
                                     ))}
                                   </div>
                                </div>
                              ))}
                            </div>
                         ) : (
                            // 🎯 식당별 통합 뷰 (아코디언)
                            <div className="space-y-2">
                              {Object.keys(groupedByRestaurant).map(key => (
                                <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedRestaurants(p=>({...p, [key]: !p[key]}))}>
                                    <div className="flex flex-col">
                                      <span className="text-[12px] font-black text-slate-800">{groupedByRestaurant[key].name}</span>
                                      <span className="text-[9px] font-bold text-slate-400">{groupedByRestaurant[key].date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-black text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md">총 ₩{formatNum(groupedByRestaurant[key].total)}</span>
                                      {expandedRestaurants[key] ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-400"/>}
                                    </div>
                                  </div>
                                  {expandedRestaurants[key] && (
                                     <div className="mt-2.5 pt-2.5 border-t border-slate-200 grid grid-cols-2 gap-1.5">
                                        {groupedByRestaurant[key].details.map(detail => {
                                           const personName = detail.name.match(/\((.*?)\s*몫\)/)?.[1] || '일행';
                                           return (
                                             <div key={detail.id} className="text-[9px] flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 cursor-pointer hover:border-purple-300 transition-colors shadow-sm" onClick={() => setEditingNbbang({id: detail.id, amount: String(detail.amount)})}>
                                                {editingNbbang?.id === detail.id ? (
                                                   <input type="text" className="w-full text-right outline-none bg-slate-100 px-1 rounded font-black text-blue-500 py-0.5" value={toCommaString(editingNbbang.amount)} onChange={e=>setEditingNbbang({...editingNbbang, amount: e.target.value.replace(/[^0-9]/g, '')})} autoFocus onBlur={()=>handleEditNbbangAmount(detail.id, editingNbbang.amount)} onKeyDown={(e) => e.key==='Enter' && handleEditNbbangAmount(detail.id, editingNbbang.amount)} />
                                                ) : (
                                                   <><span className="font-bold text-slate-500 flex items-center gap-1"><Heart size={8} className="text-purple-400"/> {personName}</span><span className="font-black text-slate-700">₩{formatNum(detail.amount)}</span></>
                                                )}
                                             </div>
                                           )
                                        })}
                                     </div>
                                  )}
                                </div>
                              ))}
                            </div>
                         )}
                       </div>
                     )}
                  </div>
                );
              })()}

              {/* 카드 내역서 탭 */}
              {accountbookTab === 'card' && (() => {
                const unpaidCardRecords = cardRecords.filter(r => r?.paymentMethod === '신용카드' && !r?.isPaid);
                const totalUnpaid = unpaidCardRecords.reduce((sum, r) => sum + Number(r?.amount || 0), 0);

                // 🎯 카드 내역 모달창에서 '단건 선결제' 실행 로직
                const handlePaySingleItem = (log) => {
                   if (globalCash < Number(log.amount)) return showToast('⚠️ 지갑 잔액이 부족합니다.');
                   saveStateToHistory();
                   const newCash = globalCash - Number(log.amount);
                   setGlobalCash(newCash);
                   
                   const updatedLogs = tradeLogs.map(r => r.id === log.id ? { ...r, isPaid: true } : r);
                   const paymentLog = {
                      id: Date.now().toString(), type: 'expense', name: `${log.name} 개별 선결제`, category: '카드대금', amount: Number(log.amount), totalAmount: Number(log.amount), date: new Date().toISOString().substring(0, 10), timestamp: Date.now()
                   };
                   
                   setTradeLogs([paymentLog, ...updatedLogs]);
                   saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newCash);
                   showToast(`💳 ${log.name} ₩${formatNum(log.amount)} 결제 완료!`);
                   
                   // 모달 내역이 0개가 되면 자동 닫기
                   if (unpaidCardRecords.filter(r => r.cardName === prepayModalState.cardName && r.id !== log.id).length === 0) {
                     setPrepayModalState({ isOpen: false, cardName: '' });
                   }
                };

                return (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                     <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex justify-between items-center shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-blue-600">이번 달 결제 예정 금액</span>
                          <span className="text-lg font-black text-blue-800">₩{formatNum(totalUnpaid)}</span>
                        </div>
                     </div>
                     
                     {myCards.length > 0 ? (
                       <div className="flex flex-col gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                         <span className="text-[10px] font-black text-slate-500 flex items-center gap-1"><TrendingUp size={12}/> 내 카드 실적 및 결제 관리</span>
                         {myCards.map(c => {
                           const totalUsed = cardRecords.filter(r => r.cardName === c.name).reduce((sum, r) => sum + Number(r.amount || 0), 0);
                           const toPay = unpaidCardRecords.filter(r => r.cardName === c.name).reduce((sum, r) => sum + Number(r.amount || 0), 0);
                           const target = Number(c.target || 0);
                           const percent = target > 0 ? Math.min((totalUsed / target) * 100, 100) : 0;
                           const isReached = target > 0 && totalUsed >= target;
                           
                           return (
                             <div key={`prog-${c.id}`} className="flex flex-col bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                               <div className="flex justify-between items-center mb-1.5">
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-slate-800">{c.name} {isReached && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded shadow-sm ml-1">실적 달성!</span>}</span>
                                    {c.period && <span className="text-[8px] font-bold text-slate-400 mt-0.5">결제기준: 매월 {c.period}일</span>}
                                 </div>
                                 <button onClick={() => setPrepayModalState({ isOpen: true, cardName: c.name })} disabled={toPay <= 0} className="px-2 py-1.5 bg-blue-500 text-white rounded shadow-sm text-[9px] font-black hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">미리 갚기</button>
                               </div>

                               <div className="flex justify-between items-center mb-1 bg-slate-50 p-1.5 rounded-md border border-slate-100">
                                 <span className="text-[9px] font-bold text-slate-500">결제 예정</span>
                                 <span className="text-[10px] font-black text-rose-500">₩{formatNum(toPay)}</span>
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
                       </div>
                     ) : (
                        <div className="text-center py-6 text-[10px] font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">우측 상단 톱니바퀴 > 내 카드에서<br/>카드를 먼저 등록해주세요.</div>
                     )}

                     {/* 🎯 카드 선결제 상세 모달 UI */}
                     {prepayModalState.isOpen && (
                       <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
                         <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl p-5 shadow-2xl relative flex flex-col max-h-[80vh] animate-in zoom-in duration-200">
                           <button onClick={() => setPrepayModalState({ isOpen: false, cardName: '' })} className="absolute top-4 right-4 p-1.5 text-slate-400 bg-slate-50 rounded-full hover:bg-slate-100"><X size={14}/></button>
                           <h3 className="font-black text-sm mb-1 text-slate-800">💳 {prepayModalState.cardName} 미결제 내역</h3>
                           <p className="text-[9px] font-bold text-slate-400 mb-4">내역을 클릭하면 지갑 잔액으로 즉시 결제됩니다.</p>
                           
                           {/* 모바일 최적화 가로 2열, PC 3열 그리드 (동일 결제건 자동 합산 처리) */}
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto custom-scrollbar pr-1 pb-2">
                             {Object.values(unpaidCardRecords.filter(r => r.cardName === prepayModalState.cardName).reduce((acc, log) => {
                                const groupKey = log.isNbbang ? `${log.date}_${log.memo||log.name.split('(')[0].trim()}` : log.id;
                                if (!acc[groupKey]) acc[groupKey] = { ...log, combinedIds: [log.id], combinedAmount: Number(log.amount), displayTitle: log.isNbbang ? (log.memo || log.name.split('(')[0].trim()) : log.name };
                                else {
                                  acc[groupKey].combinedIds.push(log.id);
                                  acc[groupKey].combinedAmount += Number(log.amount);
                                }
                                return acc;
                             }, {})).map(log => (
                               <div key={log.id} onClick={() => {
                                  const totalAmt = log.combinedAmount;
                                  if (globalCash < totalAmt) return showToast('⚠️ 지갑 잔액이 부족합니다.');
                                  saveStateToHistory();
                                  const newCash = globalCash - totalAmt;
                                  setGlobalCash(newCash);
                                  const updatedLogs = tradeLogs.map(r => log.combinedIds.includes(r.id) ? { ...r, isPaid: true } : r);
                                  const paymentLog = {
                                     id: Date.now().toString(), type: 'expense', name: `${log.displayTitle} 선결제`, category: '카드대금', amount: totalAmt, totalAmount: totalAmt, date: new Date().toISOString().substring(0, 10), timestamp: Date.now()
                                  };
                                  setTradeLogs([paymentLog, ...updatedLogs]);
                                  saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newCash);
                                  showToast(`💳 ${log.displayTitle} ₩${formatNum(totalAmt)} 결제 완료!`);
                                  
                                  if (unpaidCardRecords.filter(r => r.cardName === prepayModalState.cardName && !log.combinedIds.includes(r.id)).length === 0) {
                                    setPrepayModalState({ isOpen: false, cardName: '' });
                                  }
                               }} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col justify-between min-h-[75px] group">
                                 <div className="flex justify-between items-start mb-1.5">
                                   <span className="text-[10px] font-black text-slate-800 truncate pr-1">{log.displayTitle}</span>
                                   <span className="text-[8px] font-bold text-slate-400 shrink-0">{log.date?.substring(5)}</span>
                                 </div>
                                 <div className="flex justify-between items-end mt-auto">
                                   <span className="text-[9px] font-bold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">결제하기</span>
                                   <span className="text-[11px] font-black text-rose-500 ml-auto">₩{formatNum(log.combinedAmount)}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                     )}
                  </div>
                );
              })()}
            </div>

            {/* 달력 하단 상세 내역 팝업 */}
            {accountbookTab === 'calendar' && (
              <>
                <div className="bg-white rounded-2xl p-2 md:p-3 shadow-sm border border-slate-200 mb-2">
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] md:text-[10px] font-black text-slate-400 mb-1">
                    <div className="text-rose-400">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div className="text-blue-400">토</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                    {blanks.map(b => <div key={`blank-${b}`} className="h-12 md:h-14 rounded-lg bg-slate-50/50"></div>)}
                    {daysArray.map(day => {
                      const data = stats.daily[day] || { income: 0, expense: 0, invest: 0, salary: 0 };
                      const isSelected = selectedDay === day;
                      const isToday = new Date().getDate() === day && new Date().getMonth() === calMonth && new Date().getFullYear() === calYear;
                      return (
                        <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)} className={`h-12 md:h-14 border rounded-lg p-1 flex flex-col cursor-pointer transition-colors overflow-hidden ${isSelected ? 'border-slate-800 bg-slate-800 text-white shadow-md' : 'border-slate-100 bg-white hover:bg-slate-50'} ${isToday && !isSelected ? 'ring-1 ring-blue-300' : ''}`}>
                          <span className={`text-[9px] font-black leading-none mb-0.5 ${isSelected ? 'text-white' : (firstDay + day - 1) % 7 === 0 ? 'text-rose-500' : (firstDay + day - 1) % 7 === 6 ? 'text-blue-500' : 'text-slate-600'}`}>{day}</span>
                          <div className="flex flex-col gap-[1px] mt-auto">
                            {data.salary > 0 && <span className="text-[7px] font-black text-emerald-400 text-right truncate">+{formatNum(data.salary)}</span>}
                            {data.income > 0 && <span className="text-[7px] font-black text-blue-400 text-right truncate">+{formatNum(data.income)}</span>}
                            {data.invest > 0 && <span className="text-[7px] font-black text-purple-400 text-right truncate">-{formatNum(data.invest)}</span>}
                            {data.expense > 0 && <span className="text-[7px] font-black text-rose-400 text-right truncate">-{formatNum(data.expense)}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedDay && stats.daily[selectedDay]?.records?.length > 0 && (
                  <div className="bg-slate-800 text-white rounded-2xl p-3 animate-in slide-in-from-bottom-2 duration-200 shadow-lg flex flex-col gap-3">
                    {/* 상단 50:50 요약 (수익 vs 지출) */}
                    <div className="flex gap-2">
                      <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center">
                        <div className="text-[9px] font-black text-emerald-400 mb-0.5">수익 합계</div>
                        <div className="text-xs font-black text-emerald-300">+₩{formatNum((stats.daily[selectedDay]?.salary || 0) + (stats.daily[selectedDay]?.income || 0))}</div>
                      </div>
                      <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2 text-center">
                        <div className="text-[9px] font-black text-rose-400 mb-0.5">지출/투자 합계</div>
                        <div className="text-xs font-black text-rose-300">-₩{formatNum((stats.daily[selectedDay]?.invest || 0) + (stats.daily[selectedDay]?.expense || 0))}</div>
                      </div>
                    </div>

                    {/* 하단 2열 내역 리스트 */}
                    <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                      {/* 좌측: 수익 리스트 */}
                      <div className="space-y-2 border-r border-slate-700/50 pr-2">
                        {stats.daily[selectedDay].records.filter(r => r?.viewCategory === 'salary' || r?.viewCategory === 'income').map((r, idx) => {
                          let badgeColor = r?.viewCategory === 'salary' ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300";
                          let badgeText = r?.viewCategory === 'salary' ? "급여" : "수익";
                          let amtColor = r?.viewCategory === 'salary' ? "text-emerald-400" : "text-blue-400";
                          return (
                            <div key={`inc-${idx}`} className="flex flex-col gap-1 border-b border-slate-700/50 pb-1.5 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                 <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${badgeColor}`}>{badgeText}</span>
                                 <span className={`text-[9px] md:text-[10px] font-black ${amtColor}`}>+₩{formatNum(Number(r?.amount || r?.total || 0))}</span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-300 truncate">{r?.name || '내역'}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* 우측: 지출/투자 리스트 */}
                      <div className="space-y-2 pl-1">
                        {stats.daily[selectedDay].records.filter(r => r?.viewCategory === 'invest' || r?.viewCategory === 'expense').map((r, idx) => {
                          let badgeColor = r?.viewCategory === 'invest' ? "bg-purple-500/20 text-purple-300" : "bg-rose-500/20 text-rose-300";
                          let badgeText = r?.viewCategory === 'invest' ? "투자" : "소비";
                          let amtColor = r?.viewCategory === 'invest' ? "text-purple-400" : "text-rose-400";
                          return (
                            <div key={`exp-${idx}`} className="flex flex-col gap-1 border-b border-slate-700/50 pb-1.5 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                 <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${badgeColor}`}>{badgeText}</span>
                                 <span className={`text-[9px] md:text-[10px] font-black ${amtColor}`}>-₩{formatNum(Number(r?.amount || r?.total || 0))}</span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-300 truncate">{r?.name || '내역'} {r?.isNbbang && <span className="text-[8px] text-purple-400 ml-0.5">(N빵)</span>}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}
        {/* --- YIELD TAB --- */}
        {activeTab === 'yield' && (() => {
          // 🎯 원형 차트에 들어갈 자산 데이터 계산 (현금, 저축, 주식 각각 분리)
          // 🎯 다양한 색상 팔레트 적용
          const pieColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292', '#AED581', '#FFD54F', '#4DB6AC', '#7986CB', '#A1887F', '#90A4AE'];
          const pieData = [
            { name: '지갑 (현금)', value: Number(globalCash), color: pieColors[0] },
            ...accounts.filter(a => a.type === 'savings').map((a, i) => ({ name: a.name, value: Number(a.cash), color: pieColors[(i + 1) % pieColors.length] })),
            ...stocks.map((s, i) => ({ name: s.name, value: Number(s.quantity) * Number(s.currentPrice) * (s.isUSD ? toPureNumber(exchangeRate) : 1), color: pieColors[(i + 1 + accounts.filter(a=>a.type==='savings').length) % pieColors.length] }))
          ].filter(d => d.value > 0).sort((a,b) => b.value - a.value);

          return (
            <section className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm min-h-[400px] mt-2 animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <div>
                  <h2 className={`font-bold text-sm sm:text-base ${t.text} flex items-center gap-1.5 whitespace-nowrap`}><CalendarDays size={16}/> 🌱 {characterName} 성장일기</h2>
                  <p className="text-[9px] font-bold text-slate-500 mt-1">총 자산: <span className={`font-black ${t.text}`}>₩{formatNum(globalStats.totalAssets)}</span></p>
                </div>
              </div>

              {/* 🎯 원형 차트 (도넛 모양) UI - 시인성 강화 (라벨 기본 표시) */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-5 flex flex-col md:flex-row items-center gap-4 shadow-inner">
                <div className="w-full md:w-1/2 h-[220px] md:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                        className="text-[9px] md:text-[10px] font-black fill-slate-600"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₩${formatNum(value)}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: '900', fontSize: '12px' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* 🎯 차트 우측 (자산 비중 퍼센트 리스트) */}
                <div className="w-full md:w-1/2 flex flex-col gap-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[10px] md:text-xs font-black text-slate-700 truncate max-w-[100px] md:max-w-[120px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">{((item.value / (globalStats.totalAssets || 1)) * 100).toFixed(1)}%</span>
                        <span className="text-[11px] md:text-xs font-black text-slate-800">₩{formatNum(item.value)}</span>
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
      </main>

      {/* --- Modals (High Z-Index) --- */}
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
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
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
            <h3 className="font-black text-base mb-5 flex items-center justify-center w-full gap-2 text-slate-800"><Heart size={16} className={t.text} fill="currentColor"/> 설정</h3>
            <div className="mb-3 flex items-center gap-3 overflow-x-auto py-2 px-2 -mx-2 custom-scrollbar">{PRESET_PROFILES.map(p => (<button key={p.id} type="button" onClick={() => setEditProfileImage(p.url)} className={`w-10 h-10 rounded-full shrink-0 transition-all ${editProfileImage === p.url ? `ring-2 ${t.border} ring-offset-2 scale-110` : 'opacity-60 hover:opacity-100'}`}><img src={p.url} className="w-full h-full object-cover rounded-full bg-slate-50"/></button>))}<button type="button" onClick={() => fileInputRef.current.click()} className="w-10 h-10 rounded-full shrink-0 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 hover:bg-slate-100"><Upload size={14} className="text-slate-400"/></button><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/></div>
            <input type="text" placeholder="캐릭터명 (예: 경준)" className={`w-full bg-slate-50 p-2.5 text-sm rounded-xl font-bold mb-2 outline-none border focus:${t.border} text-center`} value={editCharacterName} onChange={e=>setEditCharacterName(e.target.value)} />
            <input type="text" placeholder="앱 이름" className={`w-full bg-slate-50 p-2.5 text-sm rounded-xl font-bold mb-2 outline-none border focus:${t.border} text-center`} value={editTitle} onChange={e=>setEditTitle(e.target.value)} /><input type="text" placeholder="부제목" className={`w-full bg-slate-50 p-2.5 text-sm rounded-xl font-bold mb-4 outline-none border focus:${t.border} text-center`} value={editSubtitle} onChange={e=>setEditSubtitle(e.target.value)} />
            <div className="flex gap-2 mb-3"><button type="button" onClick={handleExportData} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-1 hover:bg-slate-200"><Download size={12}/> 백업</button><button type="button" onClick={handleImportData} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-1 hover:bg-slate-200"><UploadCloud size={12}/> 복원</button></div>
            <button type="submit" className={`w-full ${t.main} py-2.5 rounded-xl font-black text-xs shadow-md transition-colors`}>설정 저장하기</button></form>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-200 relative">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors z-50"><X size={14}/></button>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 shrink-0"><h3 className="font-black text-sm text-slate-800 flex justify-center items-center w-full gap-1.5"><Heart size={14} fill="currentColor" className={t.text} /> {editingStockId ? '항목 수정' : '새 항목 추가'}</h3></div>
            <form onSubmit={handleEditStockSubmit} className="flex flex-col flex-1 overflow-hidden relative">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5 pb-2">
                
                {isDropdownOpen && currentAccountStat?.type === 'stock' && (
                  <div className="fixed inset-0 z-[50]" onClick={() => setIsDropdownOpen(false)}></div>
                )}
                <div className="relative z-[55]">
                  {currentAccountStat?.type === 'stock' && <Search className="absolute right-3 top-2 text-slate-300" size={14}/>}
                  <input type="text" placeholder={currentAccountStat?.type === 'stock' ? "종목명 검색 (클릭 시 전체)" : "예: 정기예금, 파킹통장"} className={`w-full bg-slate-50 py-2 rounded-xl outline-none border focus:${t.border} font-bold text-xs text-center ${currentAccountStat?.type === 'stock' ? 'px-8' : 'px-3'}`} value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setNewStock(p=>({...p, name: e.target.value})); if(currentAccountStat?.type === 'stock') setIsDropdownOpen(true);}} onClick={() => { if(currentAccountStat?.type === 'stock') setIsDropdownOpen(true); }} onFocus={() => { if(currentAccountStat?.type === 'stock') setIsDropdownOpen(true); }}/>
                  {isDropdownOpen && currentAccountStat?.type === 'stock' && (
                    <div className="absolute z-[60] w-full mt-1 bg-white border rounded-xl shadow-xl max-h-[200px] flex divide-x overflow-hidden border-slate-200 text-left"><div className="w-1/2 p-2 overflow-y-auto custom-scrollbar bg-white"><div className={`text-[9px] font-black ${t.text} mb-1 border-b ${t.border} pb-1 sticky top-0 bg-white whitespace-nowrap`}>📈 주식</div>{filteredSList.map(db => (<div key={db.id} onClick={() => { setNewStock({...newStock, name: db.name, ticker: db.ticker, isUSD: db.isUSD, currentPrice: String(db.currentPrice)}); setSearchQuery(db.name); setIsDropdownOpen(false); }} className={`p-1.5 hover:${t.light.split(' ')[0]} rounded-lg cursor-pointer flex flex-col gap-0.5`}><span className="font-bold text-[10px] truncate text-slate-800">{db.name}</span><span className="text-slate-400 text-[8px] font-black">{db.ticker}</span></div>))}</div><div className="w-1/2 p-2 overflow-y-auto custom-scrollbar bg-slate-50"><div className="text-[9px] font-black text-indigo-500 mb-1 border-b border-indigo-100 pb-1 sticky top-0 bg-slate-50 whitespace-nowrap">📊 ETF</div>{filteredEList.map(db => (<div key={db.id} onClick={() => { setNewStock({...newStock, name: db.name, ticker: db.ticker, isUSD: db.isUSD, currentPrice: String(db.currentPrice)}); setSearchQuery(db.name); setIsDropdownOpen(false); }} className="p-1.5 hover:bg-indigo-100 rounded-lg cursor-pointer flex flex-col gap-0.5"><span className="font-bold text-[10px] truncate text-slate-800">{db.name}</span><span className="text-indigo-400 text-[8px] font-black">{db.ticker}</span></div>))}</div></div>
                  )}
                </div>
              {currentAccountStat?.type === 'stock' ? ( 
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">현재가</label><div className="relative flex items-center"><span className="absolute left-2.5 text-xs font-bold text-slate-400">{newStock.isUSD ? '$' : '₩'}</span><input type="text" className={`w-full bg-slate-50 py-2 pl-6 pr-2.5 rounded-xl font-bold text-xs outline-none focus:${t.border} border text-right`} value={toCommaString(newStock.currentPrice)} onChange={e => handleFormattedChange('currentPrice', e.target.value)} placeholder="0" required /></div></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">평단가</label><div className="relative flex items-center"><span className="absolute left-2.5 text-xs font-bold text-slate-400">{newStock.isUSD ? '$' : '₩'}</span><input type="text" className={`w-full bg-slate-50 py-2 pl-6 pr-2.5 rounded-xl font-bold text-xs outline-none focus:${t.border} border text-right`} value={toCommaString(newStock.buyPrice)} onChange={e => handleFormattedChange('buyPrice', e.target.value)} placeholder="0" required /></div></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">보유 수량</label><div className="relative flex items-center"><input type="text" className={`w-full bg-slate-50 py-2 pl-2.5 pr-6 rounded-xl font-bold text-xs outline-none focus:${t.border} border text-right`} value={toCommaString(newStock.quantity)} onChange={e => handleFormattedChange('quantity', e.target.value)} placeholder="0" required /><span className="absolute right-2.5 text-xs font-bold text-slate-400">주</span></div></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">목표 비중</label><div className="relative flex items-center"><input type="text" className={`w-full py-2 pl-2.5 pr-6 rounded-xl font-black text-xs outline-none border transition-colors text-right ${isRatioExceededModal ? 'bg-red-50 border-red-500 text-red-500' : `bg-slate-50 focus:${t.border}`}`} value={newStock.targetRatio} onChange={e => handleFormattedChange('targetRatio', e.target.value)} placeholder="자유입력" />{newStock.targetRatio && <span className="absolute right-2.5 text-xs font-bold text-slate-400">%</span>}</div></div>
                </div> 
              ) : ( 
                <>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 block text-center">현재 금액 (원금)</label><div className="relative flex items-center"><span className="absolute left-2.5 text-xs font-bold text-slate-400">₩</span><input type="text" className="w-full bg-slate-50 py-2 pl-6 pr-2.5 rounded-xl font-bold text-xs outline-none border focus:border-emerald-300 text-right" value={toCommaString(newStock.quantity)} onChange={e => handleFormattedChange('quantity', e.target.value)} placeholder="0" required /></div></div>
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
              {currentAccountStat?.type === 'stock' && ( 
                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl mb-1.5">
                    <label className="text-[9px] font-black text-slate-500 block mb-1.5 text-center">배당금 / 지급 주기 설정</label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex items-center w-1/3"><span className="absolute left-2.5 text-[10px] font-bold text-slate-400">{newStock.isUSD ? '$' : '₩'}</span><input type="text" className={`w-full bg-white border rounded-lg py-2 pl-6 pr-2 font-black text-[10px] outline-none focus:${t.border} text-right`} value={toCommaString(newStock.divPerShare)} onChange={e => handleFormattedChange('divPerShare', e.target.value)} placeholder="0"/></div>
                      <select className="w-1/3 bg-white border rounded-lg p-2 text-[10px] font-black outline-none text-center" value={newStock.divFreq || '월'} onChange={e => setNewStock(p=>({...p, divFreq: e.target.value}))}><option value="월">월</option><option value="분기">분기</option><option value="반기">반기</option><option value="연">연</option></select>
                      <select className="w-1/3 bg-white border rounded-lg p-2 text-[10px] font-black outline-none text-center" value={newStock.divDay || '15'} onChange={e => setNewStock(p=>({...p, divDay: e.target.value}))}>{Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}일</option>)}<option value="말">말일</option></select>
                    </div>
                  </div>
                </div> 
              )}
              </div>
              <div className="pt-3 shrink-0 flex flex-col gap-1.5">
                {isRatioExceededModal && <div className="text-[9px] text-red-500 font-bold bg-red-50 border border-red-100 p-2 rounded-lg text-center">⚠️ 목표 비중 총합이 100%를 초과할 수 없습니다. ({currentModalTotalRatio}%)</div>}
                {isDuplicateStock && <div className="text-[9px] text-red-500 font-bold bg-red-50 border border-red-100 p-2 rounded-lg text-center">⚠️ 이미 동일한 이름의 종목이 존재합니다.</div>}
                <button type="submit" disabled={isRatioExceededModal || isDuplicateStock} className={`w-full py-2.5 rounded-xl font-black text-xs text-white shadow-md transition-colors ${(isRatioExceededModal || isDuplicateStock) ? 'bg-slate-300 cursor-not-allowed' : t.main}`}>포트폴리오에 반영하기</button>
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

              {newCardType === '체크' && (
                <select className="w-full p-2.5 rounded-xl text-[10px] font-black outline-none border focus:border-blue-400 bg-slate-50 text-center" value={newCardLinkedAcc} onChange={e=>setNewCardLinkedAcc(e.target.value)}>
                  <option value="wallet">체크 연동: 내 지갑 출금</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>체크 연동: {a.name}</option>)}
                </select>
              )}

              <select className="w-full p-2.5 rounded-xl text-[10px] font-black outline-none border focus:border-blue-400 bg-slate-50 text-center text-slate-700" value={newCardPeriod} onChange={e=>setNewCardPeriod(e.target.value)}>
                <option value="">실적 인정 기준일 (예: 매월 말일)</option>
                {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>매월 {d}일 기준</option>)}
                <option value="말일">매월 말일 기준</option>
              </select>
            </div>
            <button onClick={() => { 
              if(!newCardName) return; 
              setMyCards([...myCards, {id: Date.now(), name: newCardName, target: toPureNumber(newCardTarget), period: newCardPeriod, type: newCardType, linkedAcc: newCardLinkedAcc}]); 
              setNewCardName(''); setNewCardTarget(''); setNewCardPeriod(''); 
            }} className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black shadow-md hover:bg-slate-900 transition-colors">새 카드 추가</button>
          </div>
        </div>
      )}
      {isAddAccountOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleAddAccountSubmit} className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl relative"><button type="button" onClick={() => setIsAddAccountOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={14}/></button><h3 className="font-black text-sm mb-4 text-slate-800 flex justify-center w-full">새 계좌 추가</h3><div className="flex gap-2 mb-3 bg-slate-50 p-1 rounded-xl"><button type="button" onClick={()=>setNewAccountType('stock')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${newAccountType === 'stock' ? `${t.main}` : 'text-slate-400'}`}>주식 계좌</button><button type="button" onClick={()=>setNewAccountType('savings')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${newAccountType === 'savings' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}>저축 계좌</button></div><input type="text" placeholder="계좌 별칭 (예: 미래에셋)" autoFocus className={`w-full p-2.5 rounded-xl text-sm font-bold mb-4 outline-none border focus:${t.border} text-center`} value={newAccountName} onChange={e=>setNewAccountName(e.target.value)} required /><button type="submit" className={`w-full text-white py-2.5 rounded-xl text-xs font-black transition-colors shadow-md ${newAccountType === 'stock' ? `${t.main}` : 'bg-emerald-500 hover:bg-emerald-600'}`}>계좌 생성하기</button></form>
        </div>
      )}

      {isEditLabelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
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
                  <option value="wallet">👛 지갑</option>
                  {accounts.map(a=><option key={a.id} value={a.id}>{a.type === 'savings' ? '🏦 ' : '📈 '}{a.name}</option>)}
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
            <button onClick={handleSavingsMaturitySubmit} className={`w-full py-2.5 rounded-xl font-black text-white text-xs shadow-md ${t.main}`}>지갑으로 입금</button>
          </div>
        </div>
      )}

      {isInvestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => { if(e.target === e.currentTarget) setIsInvestModalOpen(false); }}>
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-2xl relative flex flex-col min-h-[460px] md:min-h-[500px]">
            <button onClick={() => setIsInvestModalOpen(false)} className="absolute top-4 md:top-5 right-4 md:right-5 p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
            <h3 className="font-black text-sm md:text-base mb-4 flex justify-center w-full items-center gap-2 text-slate-800 tracking-tighter"><Wallet size={16} className="md:w-[18px] md:h-[18px]"/> 자금 관리</h3>
            
            <div className="flex gap-1.5 mb-4 bg-slate-50 p-1 rounded-xl shrink-0">
              <button onClick={() => setInvestTab('wallet')} className={`flex-1 py-2 md:py-2.5 rounded-lg text-[10px] md:text-xs font-black transition-all ${investTab === 'wallet' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}>지갑</button>
              <button onClick={() => openTransferModal('wallet', accounts.find(a => a.type === 'savings')?.id || '')} className={`flex-1 py-2 md:py-2.5 rounded-lg text-[10px] md:text-xs font-black transition-all ${investTab === 'transfer' ? t.main : 'text-slate-500'}`}>계좌 이체</button>
            </div>
            
            <div className="mb-4 flex flex-col justify-center flex-1 overflow-y-auto custom-scrollbar pr-1">
              {investTab === 'wallet' ? ( 
                <div className="flex flex-col gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center border border-slate-100">
                    <span className="text-[10px] md:text-xs font-black text-slate-500">현재 지갑 잔액</span>
                    <span className="text-lg md:text-xl font-black text-slate-800">₩{formatNum(globalCash)}</span>
                  </div>
                  
                  {/* 외부 자금 충전 영역 */}
                  <div className="flex items-stretch gap-1.5">
                    <input type="text" placeholder="충전할 금액 입력" className={`flex-1 p-2.5 rounded-xl font-black text-[11px] md:text-xs outline-none border-2 focus:${t.border} text-right min-w-0 bg-slate-50 focus:bg-white transition-colors`} value={toCommaString(investInput)} onChange={e=>setInvestInput(e.target.value.replace(/[^0-9]/g, ''))} />
                    <button onClick={() => {
                      const amount = toPureNumber(investInput);
                      if (amount <= 0) return showToast("⚠️ 금액을 입력해주세요.");
                      saveStateToHistory();
                      const newCash = globalCash + amount;
                      setGlobalCash(newCash);
                      setInvestInput('');
                      logTrade({ type: 'income', name: '지갑 충전', category: '충전', amount: amount });
                      showToast(`✅ ₩${formatNum(amount)} 충전되었습니다.`);
                      saveConfig(accounts, exchangeRate, appTitle, appSubtitle, characterName, appTheme, newCash);
                    }} className="bg-slate-800 text-white px-4 rounded-xl font-black text-[10px] md:text-xs whitespace-nowrap shadow-sm hover:bg-slate-900 transition-colors">충전</button>
                  </div>

                  {/* 🎯 가계부 연동을 위한 수익/소비 버튼 */}
                  <div className="flex justify-between items-center mt-2 mb-1">
                    <div className="flex gap-1.5 flex-1">
                      <button onClick={() => { setIncomeMode('salary'); setIncomeAmount(''); setIsNbbang(false); setExpenseDateInput(''); }} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-colors ${incomeMode === 'salary' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>월급 💵</button>
                      <button onClick={() => { setIncomeMode('bonus'); setIncomeAmount(''); setIsNbbang(false); setExpenseDateInput(''); }} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-colors ${incomeMode === 'bonus' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>수익 🧧</button>
                      <button onClick={() => { setIncomeMode('expense'); setIncomeAmount(''); setIsNbbang(false); setIsNbbangConfirmed(false); setNbbangList([{id:Date.now(), name:''}]); setExpenseDateInput(''); }} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-colors ${incomeMode === 'expense' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>소비 💳</button>
                    </div>
                    <button onClick={() => setIsCardModalOpen(true)} className="ml-2 px-2 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black shadow-sm flex items-center gap-1 hover:bg-slate-200"><CreditCard size={12}/> 내 카드</button>
                  </div>
                  
                  {incomeMode && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-2">
                      {incomeMode === 'bonus' && (
                        <select className="w-full text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={incomeCategory} onChange={e => setIncomeCategory(e.target.value)}>
                          <option value="출장비">출장비</option><option value="성과급">성과급</option><option value="복지비">복지비</option><option value="자기계발비">자기계발</option><option value="기타 수익">기타</option>
                        </select>
                      )}
                      
                      {incomeMode === 'expense' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1.5">
                            <select className="flex-1 text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                              <option value="식비">식비</option><option value="생필품">생필품</option><option value="의류비">의류비</option><option value="공과금">공과금</option><option value="기타">기타</option>
                            </select>
                            <select className="flex-1 text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg p-2 outline-none bg-white" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                              <option value="현금/체크카드">현금/체크</option><option value="신용카드">신용카드</option>
                            </select>
                          </div>
                          {paymentMethod === '신용카드' && (
                            <select className="w-full text-[10px] font-black text-blue-600 border border-blue-200 rounded-lg p-2 outline-none bg-blue-50" value={selectedCard} onChange={e => setSelectedCard(e.target.value)}>
                              <option value="">결제할 카드 선택</option>
                              {myCards.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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
                                  <div className="grid grid-cols-5 gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                                    {nbbangList.map((person, index) => (
                                      <input key={person.id} type="text" className="w-full text-[10px] font-black text-slate-800 border border-purple-200 rounded-lg p-1.5 outline-none focus:border-purple-400 bg-white text-center shadow-sm" placeholder={`인원${index+1}`} value={person.name} onChange={e => { const newList = [...nbbangList]; newList[index].name = e.target.value; setNbbangList(newList); }} />
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
                          let isPaidNow = false;

                          if (!isExpense) {
                            updatedGlobalCash += amt;
                            isPaidNow = true;
                          } else {
                            if (paymentMethod === '현금/체크카드') {
                               updatedGlobalCash -= myShare; 
                               if (updatedGlobalCash < 0) return showToast("⚠️ 지갑 잔액이 부족합니다.");
                               isPaidNow = true;
                            } else if (paymentMethod === '신용카드') {
                               const selectedCardInfo = myCards.find(c => c.name === selectedCard);
                               if (selectedCardInfo && selectedCardInfo.type === '체크') {
                                  const linkedAccId = selectedCardInfo.linkedAcc || 'wallet';
                                  if (linkedAccId === 'wallet') {
                                     updatedGlobalCash -= myShare;
                                     if (updatedGlobalCash < 0) return showToast("⚠️ 지갑 잔액이 부족합니다.");
                                  } else {
                                     const acc = updatedAccs.find(a => a.id === linkedAccId);
                                     if (!acc || toPureNumber(acc.cash) < myShare) return showToast("⚠️ 연동된 계좌 잔액이 부족합니다.");
                                     updatedAccs = updatedAccs.map(a => a.id === linkedAccId ? { ...a, cash: String(toPureNumber(a.cash) - myShare) } : a);
                                  }
                                  isPaidNow = true;
                               } else {
                                  isPaidNow = false;
                               }
                            }
                          }
                          
                          setGlobalCash(updatedGlobalCash);
                          setAccounts(updatedAccs);
                          
                          let logType = 'income'; let logCat = '기타'; let logName = ''; let logMemo = expenseMemo;
                          if (incomeMode === 'salary') { logCat = '급여'; logName = '월급 입금'; }
                          else if (incomeMode === 'bonus') { logCat = incomeCategory; logName = `${incomeCategory} 입금`; }
                          else if (incomeMode === 'expense') { logType = 'expense'; logCat = expenseCategory; logName = expenseMemo || '소비'; }
                          
                          let finalDate = new Date().toISOString().substring(0, 10);
                          if (expenseDateInput && expenseDateInput.length === 5) {
                             const year = new Date().getFullYear();
                             const formatted = expenseDateInput.replace('/', '-');
                             finalDate = `${year}-${formatted}`;
                          }

                          let logsToAdd = [];
                          const baseLog = { 
                            type: logType, name: logName, category: logCat, amount: myShare, totalAmount: amt, 
                            memo: logMemo, paymentMethod: isExpense ? paymentMethod : null, cardName: paymentMethod === '신용카드' ? selectedCard : null,
                            isPaid: isPaidNow, isNbbang: isExpense ? isNbbang : false, nbbangCount: finalNbbangCount, nbbangNames: finalNbbangNames, perPersonShare: perPersonShare,
                            date: finalDate, timestamp: Date.now()
                          };

                          if (isExpense && isNbbang && finalNbbangCount > 1) {
                             baseLog.name = `${logName} (본인 몫)`;
                             logsToAdd.push({ ...baseLog, id: Date.now().toString() + '_0' });
                             
                             const validPeople = nbbangList.filter(n => n.name.trim() !== '');
                             validPeople.forEach((p, idx) => {
                               logsToAdd.push({
                                 ...baseLog, id: Date.now().toString() + '_' + (idx + 1), name: `${logName} (${p.name.trim()} 몫)`,
                                 category: 'N빵', amount: perPersonShare, timestamp: Date.now() + idx + 1
                               });
                             });
                             
                             const updatedLogs = [...logsToAdd.reverse(), ...tradeLogs];
                             setTradeLogs(updatedLogs);
                             localStorage.setItem('kj_final_v87_tradeLogs', JSON.stringify(updatedLogs));
                          } else {
                             logTrade(baseLog);
                          }

                          setIncomeMode(null); setIncomeAmount(''); setIsNbbang(false); setExpenseMemo(''); setExpenseDateInput('');
                          showToast(`🎉 ${logCat} 처리 완료!`);
                          saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, updatedGlobalCash);
                        }} className={`${t.main} px-4 py-2 rounded-lg text-[11px] font-black shrink-0 shadow-sm`}>확인</button>
                      </div>
                    </div>
                  )}
                </div> 
              ) : ( 
                <div className="space-y-3">
                  <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-400 text-center">보내는 대상 (출금)
                  </label>
                    <select className="w-full p-3 rounded-xl bg-slate-50 border outline-none font-black text-[10px] md:text-xs text-center" value={transferFromId} onChange={e=>setTransferFromId(e.target.value)}>
                      <option value="wallet">👛 지갑 (₩{formatNum(globalCash)})</option>
                      {accounts.map(a=><option key={`from-${a.id}`} value={a.id}>{a.type === 'savings' ? '🏦' : '📈'} {a.name} (₩{formatNum(a.cash)})</option>)}
                    </select>
                  </div>
                  <div className="flex justify-center -my-1 text-slate-300 text-[10px]">▼</div>
                  <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-400 text-center">받는 대상 (입금)</label>
                    <select className="w-full p-3 rounded-xl bg-slate-50 border outline-none font-black text-[10px] md:text-xs text-center" value={transferToId} onChange={e=>setTransferToId(e.target.value)}>
                      <option value="wallet">👛 지갑</option>
                      {accounts.map(a=><option key={`to-${a.id}`} value={a.id}>{a.type === 'savings' ? '🏦' : '📈'} {a.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-stretch gap-1.5 mt-2">
                    <input type="text" placeholder="이체 금액 입력" className={`flex-1 p-2.5 rounded-xl font-black text-xs outline-none border-2 focus:${t.border} text-right min-w-0`} value={toCommaString(investInput)} onChange={e=>setInvestInput(e.target.value.replace(/[^0-9]/g, ''))} />
                    <button onClick={() => {
                      const maxAmount = transferFromId === 'wallet' ? globalCash : toPureNumber(accounts.find(a => a.id === transferFromId)?.cash || 0);
                      setInvestInput(String(maxAmount));
                    }} className="shrink-0 bg-slate-100 text-slate-600 px-3 rounded-xl font-black text-[10px] border border-slate-200 shadow-sm hover:bg-slate-200">전액</button>
                    <button onClick={(e) => {
                       const amount = toPureNumber(investInput);
                       if (amount <= 0) return showToast("⚠️ 금액을 입력해주세요.");
                       saveStateToHistory();
                       let updatedAccs = [...accounts];
                       let updatedGlobalCash = globalCash;
                       const activeFromId = transferFromId || 'wallet';
                       const activeToId = transferToId || (accounts[0] ? accounts[0].id : '');
                       if (activeFromId === activeToId) return showToast("⚠️ 출발지와 도착지가 같습니다.");
                       if (activeFromId === 'wallet') {
                         if (updatedGlobalCash < amount) return showToast("⚠️ 지갑 잔액이 부족합니다.");
                         updatedGlobalCash -= amount;
                       } else {
                         const fromAcc = updatedAccs.find(a => a.id === activeFromId);
                         if (!fromAcc || toPureNumber(fromAcc.cash) < amount) return showToast("⚠️ 출금 잔액이 부족합니다.");
                         updatedAccs = updatedAccs.map(a => a.id === activeFromId ? { ...a, cash: String(toPureNumber(a.cash) - amount) } : a);
                       }
                       if (activeToId === 'wallet') { updatedGlobalCash += amount; } 
                       else { updatedAccs = updatedAccs.map(a => a.id === activeToId ? { ...a, cash: String(toPureNumber(a.cash) + amount) } : a); }
                       setGlobalCash(updatedGlobalCash); setAccounts(updatedAccs); setInvestInput('');
                       showToast(`✅ ₩${formatNum(amount)} 이체 완료!`);
                       saveConfig(updatedAccs, exchangeRate, appTitle, appSubtitle, characterName, appTheme, updatedGlobalCash);
                    }} className="bg-blue-500 text-white px-4 rounded-xl font-black text-[10px] md:text-xs shadow-sm hover:bg-blue-600">이체</button>
                  </div>
                </div> 
              )}
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
            <div className="flex gap-1.5 md:gap-2 mb-4 bg-slate-50 p-1 rounded-xl shrink-0"><button onClick={() => setRebalanceTab('sell')} className={`flex-1 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black transition-all ${rebalanceTab === 'sell' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}>매도 리밸런싱</button><button onClick={() => setRebalanceTab('buy')} className={`flex-1 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black transition-all ${rebalanceTab === 'buy' ? t.main : 'text-slate-500'}`}>매수 리밸런싱</button>
            <div className={`px-2 py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black flex items-center justify-center border bg-white shadow-sm shrink-0 ${currentAccountStat.totalRatio !== 100 ? 'text-rose-500 border-rose-200' : 'text-slate-600 border-slate-200'}`}>총 비중: {currentAccountStat.totalRatio}%</div></div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-4 flex flex-col">
              {rebalanceTab === 'buy' && ( <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shrink-0"><span className="text-[10px] md:text-[11px] font-bold text-slate-500 whitespace-nowrap">추가 투자 금액</span><div className="flex-1 flex items-center gap-1"><span className="text-sm font-black text-slate-400">₩</span><input type="text" className="w-full text-right text-base md:text-lg font-black text-slate-800 outline-none bg-transparent" value={toCommaString(rebalanceInvestAmount)} onChange={e => setRebalanceInvestAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0"/></div></div> )}
              {rebalanceTab === 'sell' && ( <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shrink-0"><span className="text-[10px] md:text-[11px] font-bold text-slate-500">현재 주식 평가 금액</span><span className="text-base md:text-lg font-black text-slate-800">₩{formatNum(currentAccountStat.stockOnlyTotalValue)}</span></div> )}
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
            </div>
            {rebalanceTab === 'buy' ? ( <button onClick={handleRebalanceBuyBatch} disabled={currentAccountStat.totalRatio !== 100 || toPureNumber(rebalanceInvestAmount) <= 0} className={`w-full text-white py-3 md:py-4 rounded-xl text-xs md:text-sm font-black shadow-lg ${t.main} transition-colors disabled:bg-slate-300 disabled:shadow-none mt-auto shrink-0`}>안내 수량 자동 매수 (주문가능금액 차감)</button> ) : ( <button onClick={() => setIsRebalanceModalOpen(false)} className={`w-full bg-slate-800 text-white py-3 md:py-4 rounded-xl text-xs md:text-sm font-black shadow-lg hover:bg-slate-900 transition-colors mt-auto shrink-0`}>확인 완료</button> )}
          </div>
        </div>
      )}

      {isGlobalDivModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] w-full max-w-sm md:max-w-md p-5 md:p-7 shadow-2xl flex flex-col max-h-[85vh] relative">
             <button onClick={() => setIsGlobalDivModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
             <div className="flex justify-between items-center mb-4"><h3 className="font-black text-sm md:text-base flex justify-center w-full items-center gap-1.5 text-slate-800"><PiggyBank className="text-orange-500" size={16}/> 누적 배당 기록 관리</h3></div>
             <div className="flex gap-1.5 mb-4 bg-slate-50 p-1 rounded-xl shrink-0"><button onClick={() => setDivInputView('batch')} className={`flex-1 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${divInputView === 'batch' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>월별 일괄 기록</button><button onClick={() => setDivInputView('byStock')} className={`flex-1 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${divInputView === 'byStock' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>개별 타임라인</button></div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
               {divInputView === 'batch' ? ( 
                 <div className="flex flex-col h-full">
                   <div className="flex gap-1.5 md:gap-2 mb-3 shrink-0"><select className="flex-1 p-2 border border-slate-200 rounded-lg text-[10px] md:text-xs font-bold bg-slate-50 outline-none text-center" value={batchYear} onChange={e=>setBatchYear(Number(e.target.value))}>{yearOptions.map(y=><option key={y} value={y}>{y}년</option>)}</select><select className="flex-1 p-2 border border-slate-200 rounded-lg text-[10px] md:text-xs font-bold bg-slate-50 outline-none text-center" value={batchMonth} onChange={e=>setBatchMonth(Number(e.target.value))}>{monthOptions.map(m=><option key={m} value={m}>{m}월</option>)}</select></div>
                   {/* 🎯 모바일 2열(grid-cols-2) 병렬 배치 적용 */}
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-2 pb-2">
                     {stocks.filter(s => accounts.find(a=>a.id===(s.accountId||'default'))?.type!=='savings').map(s => {
                       const mId = `${batchYear}-${String(batchMonth).padStart(2, '0')}`;
                       return (
                         <div key={s.id} className="flex flex-col justify-between bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100 min-h-[70px] shadow-sm">
                           <span className="text-[10px] md:text-[11px] font-bold truncate text-slate-800 mb-2">{s.name}</span>
                           <div className="flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-1 rounded-md shadow-sm mt-auto">
                             <span className="text-[9px] font-bold text-slate-400 shrink-0">₩</span>
                             <input type="text" className="w-full text-right text-[10px] md:text-[11px] font-black outline-none bg-transparent min-w-0" value={toCommaString(tempTimelines[s.id]?.[mId] || '')} onChange={e => setTempTimelines(prev=>({...prev,[s.id]:{...(prev[s.id]||{}),[mId]:e.target.value.replace(/[^0-9]/g,'')}}))} placeholder="0" />
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div> 
               ) : ( 
                 /* 🎯 모바일 2열(grid-cols-2) 병렬 배치 적용 */
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-2 pb-2">
                   {stocks.filter(s => accounts.find(a=>a.id===(s.accountId||'default'))?.type!=='savings').map(s => (
                     <div key={s.id} className="flex flex-col justify-between bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100 min-h-[70px] shadow-sm">
                       <span className="text-[10px] md:text-[11px] font-bold truncate text-slate-800 mb-2">{s.name}</span>
                       <button onClick={() => { setSelectedDivStock(s.id); setTempTimelines({[s.id]: {...(s.dividendTimeline||{})}}); setIsSubDivModalOpen(true); }} className="w-full text-[9px] md:text-[10px] bg-white border border-slate-200 text-slate-600 py-1.5 rounded-md font-bold shadow-sm hover:bg-slate-100 mt-auto transition-colors">상세 편집</button>
                     </div>
                   ))}
                 </div> 
               )}
             </div>
             {divInputView === 'batch' && ( <button onClick={handleGlobalDivSave} className="w-full bg-slate-800 text-white py-3 md:py-4 mt-4 rounded-xl text-xs md:text-sm font-bold shadow-md shrink-0 transition-colors hover:bg-slate-900">저장 (기록에만 반영됨)</button> )}
          </div>
        </div>
      )}

      {isSubDivModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999999] flex items-center justify-center p-4 animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-xs md:max-w-sm rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-2xl flex flex-col max-h-[80vh] relative">
            <button onClick={() => setIsSubDivModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
            <h3 className="font-black mb-5 text-sm md:text-base text-slate-800 border-b border-slate-100 pb-3 flex justify-center w-full">상세 배당 기록 수정</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 mb-5">
              {Object.keys(tempTimelines[selectedDivStock] || {}).sort((a,b)=>b.localeCompare(a)).map(mId => (
                <div key={mId} className="flex justify-between items-center bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100 shadow-sm"><span className="text-[10px] md:text-[11px] font-bold text-slate-600 pl-2">{mId}</span><div className="relative flex items-center"><span className="absolute left-2 text-[9px] font-bold text-slate-400">₩</span><input type="text" className="w-24 md:w-28 text-right bg-white border border-slate-200 rounded-lg p-2 pl-4 text-[10px] md:text-[11px] font-black outline-none shadow-sm focus:border-blue-400" value={toCommaString(tempTimelines[selectedDivStock][mId])} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setTempTimelines(prev => ({...prev, [selectedDivStock]: {...prev[selectedDivStock], [mId]: val}})); }} /></div></div>
              ))}
            </div>
            <button onClick={() => { saveStateToHistory(); setStocks(stocks.map(s => s.id === selectedDivStock ? {...s, dividendTimeline: tempTimelines[selectedDivStock]} : s)); setIsSubDivModalOpen(false); }} className="w-full bg-slate-800 text-white py-3 md:py-4 rounded-xl font-bold text-xs md:text-sm shadow-md hover:bg-slate-900 transition-colors">수정 사항 반영하기</button>
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
      <AppContent />
    </ErrorBoundary>
  );
}