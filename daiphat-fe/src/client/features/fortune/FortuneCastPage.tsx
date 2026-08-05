'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, ShoppingCart, Shuffle, CalendarHeart } from 'lucide-react';
import { isAxiosError } from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useAuth } from '../../hooks/useAuth';
import {
  castFortune,
  getTodayFortuneCast,
  type CastFortunePayload,
  type FortuneCastResult,
} from '../../services/fortuneCastService';
import { scrollToTop } from '../../../utils/scroll.util';
import { formatFortuneDisplayDate, localizeFortuneProseDates } from '../../utils/vietnameseDate.util';
import { BottomNav } from '../../components/layout/BottomNav';
import { FortuneJarScene } from './components/FortuneJarScene';
import { FortuneStickCard } from './components/FortuneStickCard';
import {
  EJECT_DURATION_MS,
  SHAKE_DURATION_MS,
  elementUi,
  type FortuneAnimPhase,
  type JarSceneMode,
} from './fortuneUi';

type CastMode = 'birthdate' | 'random';

function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message || error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

function splitIsoDate(iso?: string | null) {
  if (!iso) return { day: '', month: '', year: '' };
  const normalized = iso.split('T')[0];
  const [year, month, day] = normalized.split('-');
  return { day: day ?? '', month: month ?? '', year: year ?? '' };
}

function buildBirthDateIso(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today || y < 1900) return null;

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Bold key fortune terms (element, lucky tail, dates) inside prose text. */
function highlightFortuneProse(prose: string, luckyTail?: string) {
  const localized = localizeFortuneProseDates(prose);
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keywords = [
    'Bản mệnh',
    'Hành ngày',
    'đuôi may mắn',
    'Đuôi may mắn',
    'Vận Kim',
    'Vận Mộc',
    'Vận Thủy',
    'Vận Hỏa',
    'Vận Thổ',
    'Kim',
    'Mộc',
    'Thủy',
    'Hỏa',
    'Thổ',
  ];
  if (luckyTail) keywords.unshift(luckyTail);

  const unique = [...new Set(keywords)].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `(${unique.map(escapeRegExp).join('|')}|\\d{2}-\\d{2}-\\d{4}|\\d{4}-\\d{2}-\\d{2})`,
    'g',
  );

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(localized)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`t-${key++}`}>{localized.slice(lastIndex, match.index)}</span>);
    }
    nodes.push(
      <strong key={`b-${key++}`} className="font-bold text-slate-900">
        {match[0]}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < localized.length) {
    nodes.push(<span key={`t-${key++}`}>{localized.slice(lastIndex)}</span>);
  }

  return nodes.length > 0 ? nodes : localized;
}

function getMsUntilUnlock(nextUnlockAt?: string | null): number {
  if (!nextUnlockAt) return 0;
  const target = Date.parse(nextUnlockAt);
  if (Number.isNaN(target)) return 0;
  return Math.max(0, target - Date.now());
}

function formatCountdownHms(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

function ElementPill({ title, value, compact }: { title: string; value?: string | null; compact?: boolean }) {
  const ui = elementUi(value);
  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 w-full ${
        compact ? 'px-2 py-1 text-[11px] rounded-full' : 'px-4 py-3 text-[15px]'
      }`}
    >
      <span className="text-slate-500 font-medium">{title}:</span>
      <strong className="text-slate-900">{ui.label}</strong>
    </span>
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function FortuneCastPage() {
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useAuthStore((s) => s.openLoginModal);
  const { user } = useAuth();

  const [phase, setPhase] = useState<FortuneAnimPhase>('idle');
  const [castMode, setCastMode] = useState<CastMode | null>(null);
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYearInput, setBirthYearInput] = useState('');
  const [result, setResult] = useState<FortuneCastResult | null>(null);
  const [hasCastToday, setHasCastToday] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingToday, setLoadingToday] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [nextCastCountdownMs, setNextCastCountdownMs] = useState(0);
  const ejectDoneRef = useRef<(() => void) | null>(null);

  const alreadyCastToday = hasCastToday || Boolean(result?.alreadyCastToday);
  const profileHasDob = Boolean(user?.dob);
  const showCastSetup =
    Boolean(token) &&
    !loadingToday &&
    !alreadyCastToday &&
    (phase === 'idle' || phase === 'error');

  useEffect(() => {
    if (!alreadyCastToday || phase !== 'result' || !result?.nextUnlockAt) {
      setNextCastCountdownMs(0);
      return;
    }
    const tick = () => {
      const remaining = getMsUntilUnlock(result.nextUnlockAt);
      setNextCastCountdownMs(remaining);
      if (remaining <= 0) {
        setHasCastToday(false);
        setResult((prev) =>
          prev
            ? {
                ...prev,
                alreadyCastToday: false,
                nextUnlockAt: null,
              }
            : prev,
        );
        setCastMode(null);
        setPhase('idle');
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [alreadyCastToday, phase, result?.nextUnlockAt]);

  const jarMode: JarSceneMode = useMemo(() => {
    if (phase === 'shaking') return 'shaking';
    if (phase === 'ejecting') return 'ejecting';
    if (phase === 'result') return 'settled';
    return 'idle';
  }, [phase]);

  const showJarStage =
    phase === 'idle' || phase === 'error' || phase === 'shaking' || phase === 'ejecting';

  useEffect(() => {
    if (!user?.dob) return;
    const parts = splitIsoDate(user.dob);
    setBirthDay(parts.day);
    setBirthMonth(parts.month);
    setBirthYearInput(parts.year);
  }, [user?.dob]);

  const loadToday = useCallback(async (opts?: { silent?: boolean }) => {
    if (!token) return;
    if (!opts?.silent) setLoadingToday(true);
    try {
      const today = await getTodayFortuneCast();
      if (today) {
        setResult(today);
        setHasCastToday(true);
        setPhase('result');
      } else {
        setHasCastToday(false);
        setResult((prev) => {
          if (!prev?.alreadyCastToday && !prev?.nextUnlockAt) return prev;
          return {
            ...prev,
            alreadyCastToday: false,
            nextUnlockAt: null,
          };
        });
        setPhase((prev) => (prev === 'result' ? 'idle' : prev));
      }
    } catch {
      // ignore
    } finally {
      if (!opts?.silent) setLoadingToday(false);
    }
  }, [token]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  // Re-sync unlock time when admin changes cooldown (or user returns to this tab).
  useEffect(() => {
    if (!token) return;

    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      setPhase((current) => {
        // Don't interrupt an in-progress cast animation.
        if (current === 'shaking' || current === 'ejecting') return current;
        void loadToday({ silent: true });
        return current;
      });
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    const poll = window.setInterval(refresh, 30_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
      window.clearInterval(poll);
    };
  }, [token, loadToday]);

  useLayoutEffect(() => {
    scrollToTop();
  }, [location.pathname]);

  useLayoutEffect(() => {
    if (loadingToday) return;
    scrollToTop();
  }, [loadingToday, phase, sceneKey]);

  const ensureAuth = () => {
    if (token) return true;
    openLoginModal();
    return false;
  };

  const waitForEjectComplete = () =>
    new Promise<void>((resolve) => {
      ejectDoneRef.current = resolve;
      window.setTimeout(() => {
        if (ejectDoneRef.current) {
          ejectDoneRef.current();
          ejectDoneRef.current = null;
        }
      }, EJECT_DURATION_MS + 120);
    });

  const handleEjectComplete = useCallback(() => {
    if (ejectDoneRef.current) {
      ejectDoneRef.current();
      ejectDoneRef.current = null;
    }
  }, []);

  const playCinematic = async (opts: { payload: CastFortunePayload }) => {
    setBusy(true);
    setErrorMessage(null);
    setSceneKey((k) => k + 1);
    setPhase('shaking');

    const apiPromise = castFortune(opts.payload);

    try {
      await sleep(SHAKE_DURATION_MS);
      setPhase('ejecting');

      const [castResult] = await Promise.all([apiPromise, waitForEjectComplete()]);
      setResult(castResult);
      setHasCastToday(true);
      setPhase('result');
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
      setPhase('error');
    } finally {
      setBusy(false);
    }
  };

  const resolveCastPayload = (): CastFortunePayload | null => {
    if (castMode === 'random') {
      return { randomElement: true };
    }

    if (castMode !== 'birthdate') {
      return null;
    }

    const birthDate = buildBirthDateIso(birthDay, birthMonth, birthYearInput);
    if (birthDate) {
      return { birthDate };
    }

    if (profileHasDob && user?.dob) {
      return { birthDate: user.dob.split('T')[0] };
    }

    return null;
  };

  const selectCastMode = (mode: CastMode) => {
    setCastMode(mode);
    setErrorMessage(null);
  };

  const handleCastModeKeyDown = (event: KeyboardEvent, mode: CastMode) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectCastMode(mode);
    }
  };

  const handlePrimaryClick = () => {
    if (busy) return;
    if (!ensureAuth()) return;
    setErrorMessage(null);

    // One cast per day — return to today's result instead of re-rolling.
    if (alreadyCastToday && result) {
      setPhase('result');
      return;
    }

    if (castMode === null) {
      setErrorMessage('Vui lòng chọn cách gieo quẻ trước khi lắc.');
      return;
    }

    if (castMode === 'random') {
      void playCinematic({ payload: { randomElement: true, birthYear: new Date().getFullYear() } });
      return;
    }

    const payload = resolveCastPayload();
    if (!payload?.birthDate) {
      setErrorMessage('Vui lòng nhập ngày sinh hợp lệ (ngày / tháng / năm).');
      return;
    }

    void playCinematic({ payload });
  };

  const canJarClick = !busy && !alreadyCastToday;

  const CastSetupPanel = () => (
    <div className="w-full text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => selectCastMode('random')}
          onKeyDown={(event) => handleCastModeKeyDown(event, 'random')}
          className={`rounded-2xl border p-4 md:p-5 transition-all cursor-pointer ${
            castMode === 'random'
              ? 'border-red-200 bg-red-50/40 shadow-sm ring-1 ring-red-100'
              : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-[#6F2A12] font-black text-[14px] md:text-[15px] mb-1.5">
            <Shuffle className="w-5 h-5 text-[#ee1314]" />
            GIEO QUẺ NGẪU NHIÊN
          </div>
          <p className="text-[12px] md:text-[13px] text-slate-600 leading-snug">
            Hệ thống chọn bản mệnh ngẫu nhiên theo vận khí hôm nay.
          </p>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => selectCastMode('birthdate')}
          onKeyDown={(event) => handleCastModeKeyDown(event, 'birthdate')}
          className={`rounded-2xl border p-4 md:p-5 transition-all cursor-pointer ${
            castMode === 'birthdate'
              ? 'border-red-200 bg-red-50/40 shadow-sm ring-1 ring-red-100'
              : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-[#6F2A12] font-black text-[14px] md:text-[15px] mb-2">
            <CalendarHeart className="w-5 h-5 text-[#ee1314]" />
            GIEO THEO NGÀY SINH
          </div>
          <div
            className="grid grid-cols-3 gap-2"
            onClick={(event) => {
              event.stopPropagation();
              selectCastMode('birthdate');
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              placeholder="Ngày"
              value={birthDay}
              onFocus={() => selectCastMode('birthdate')}
              onChange={(e) => setBirthDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px] text-center font-bold outline-none focus:border-red-500"
            />
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              placeholder="Tháng"
              value={birthMonth}
              onFocus={() => selectCastMode('birthdate')}
              onChange={(e) => setBirthMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px] text-center font-bold outline-none focus:border-red-500"
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="Năm"
              value={birthYearInput}
              onFocus={() => selectCastMode('birthdate')}
              onChange={(e) => setBirthYearInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px] text-center font-bold outline-none focus:border-red-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="client-page relative min-h-[100dvh] overflow-x-hidden bg-fixed bg-cover bg-center">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10" />

      <main className="relative z-1 min-h-[100dvh] pt-20 lg:pt-24 pb-24 lg:pb-10 flex flex-col">
        <div className="max-w-[1280px] mx-auto px-4 xl:px-0 w-full flex-1 flex flex-col min-h-0">
          <section className="mb-2 text-center shrink-0">
            <p className="client-body mb-0.5">Mỗi ngày một quẻ · Đón vận may</p>
            <h1 className="client-heading">Gieo quẻ tài lộc</h1>
          </section>

          <div className="w-full flex-1 flex flex-col min-h-[min(720px,calc(100dvh-11rem))] rounded-[28px] border border-gray-100 bg-white/90 backdrop-blur-[1px] shadow-[0_15px_40px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-4 py-4 md:px-6 md:py-5 flex-1 flex flex-col min-h-0">
            {loadingToday && phase === 'idle' ? (
              <div className="flex flex-col flex-1 items-center justify-center gap-3 py-20 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#ee1314]" />
                <span className="text-sm font-medium">Đang chuẩn bị ống quẻ…</span>
              </div>
            ) : null}

            <AnimatePresence mode="popLayout" initial={false}>
              {showJarStage && !loadingToday && (
                <motion.div
                  key={`jar-${sceneKey}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12, transition: { duration: 0.22 } }}
                  transition={{ duration: 0.28 }}
                  className="w-full flex-1 flex flex-col items-center text-center gap-3 min-h-0"
                >
                  {(phase === 'idle' || phase === 'error') && (
                    <div className="w-full shrink-0 space-y-3">
                      {!token && (
                        <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                          Đăng nhập để gieo quẻ và lưu kết quả trong ngày.
                        </p>
                      )}

                      {showCastSetup && <CastSetupPanel />}

                      {errorMessage && (
                        <p className="text-sm text-red-700 font-semibold bg-red-50 border border-red-100 rounded-xl px-4 py-2 w-full max-w-[720px] mx-auto">
                          {errorMessage}
                        </p>
                      )}

                      <div className="space-y-0.5 pt-1">
                        <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">Ống quẻ Thần Tài</h2>
                        <p className="text-[12px] md:text-[13px] text-slate-600 leading-snug">
                          Lắc ống — số trên que là <strong className="text-red-700">đuôi may mắn</strong> hôm nay.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="relative w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[360px] flex-1 flex items-center justify-center min-h-[280px]">
                    <FortuneJarScene
                      mode={jarMode}
                      winningTail={result?.luckyTail}
                      onEjectComplete={handleEjectComplete}
                      onClick={canJarClick ? handlePrimaryClick : undefined}
                    />
                  </div>

                  {(phase === 'shaking' || phase === 'ejecting') && (
                    <div className="mt-auto shrink-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-1 w-full max-w-[680px]">
                      <div className="flex items-center justify-center gap-2 text-slate-800 text-[15px] font-black">
                        <Loader2 className="w-4 h-4 animate-spin text-[#ee1314]" />
                        {phase === 'shaking' ? 'Đang lắc ống quẻ…' : 'Một que đang bay ra…'}
                      </div>
                      <p className="text-[13px] text-slate-500">
                        {phase === 'shaking'
                          ? 'Que xăm đang nhảy trong ống — giữ vững tâm thế.'
                          : 'Que may mắn sắp chạm đất.'}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {phase === 'result' && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full flex-1 flex flex-col min-h-0"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 items-stretch flex-1 min-h-0">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 md:p-7 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full min-h-full flex flex-col justify-between gap-5">
                      <div className="space-y-1.5 shrink-0">
                        <p className="text-[12px] md:text-[13px] font-extrabold uppercase tracking-[0.18em] text-red-800">
                          Quẻ xăm tài lộc hôm nay
                        </p>
                        <h2 className="text-2xl md:text-[28px] font-black text-slate-900 leading-tight">
                          Thẻ may mắn của bạn
                        </h2>
                      </div>

                      <FortuneStickCard luckyTail={result.luckyTail} reveal large className="my-0 mx-auto w-full" />

                      <div className="grid grid-cols-2 gap-3 w-full max-w-[420px] mx-auto shrink-0">
                        <ElementPill title="Bản mệnh" value={result.userElement} />
                        <ElementPill title="Hành ngày" value={result.dayElement} />
                      </div>

                      <Link
                        to={result.buyPath}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 md:py-4 rounded-full bg-[#ee1314] text-white font-black text-[15px] md:text-[16px] hover:bg-red-700 text-center shadow-[0_8px_20px_rgba(238,19,20,0.24)] no-underline shrink-0"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Mua vé đuôi {result.luckyTail}
                      </Link>
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-100 p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full min-h-full flex flex-col justify-between gap-4">
                      {/* 1. Lời luận */}
                      <div className="shrink-0 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                            Kết quả hôm nay
                          </p>
                          <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                            Lời luận quẻ
                          </h3>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-gray-50 p-4 md:p-6">
                          <p className="text-[15px] md:text-[16px] text-slate-700 leading-[1.85] whitespace-pre-wrap">
                            {highlightFortuneProse(result.prose, result.luckyTail)}
                          </p>
                        </div>
                      </div>

                      {/* 2. Daily limit notice — expands to close gaps with neighbors */}
                      {alreadyCastToday ? (
                        <div className="rounded-2xl border border-slate-200 bg-gray-50 p-4 md:p-5 text-center shrink-0 flex flex-col items-center gap-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Thời gian chờ giữa các lần gieo
                          </p>
                          <div className="w-full max-w-[280px] rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Lượt tiếp theo
                            </p>
                            <p className="text-3xl md:text-4xl font-black tabular-nums text-[#ee1314] tracking-tight">
                              {formatCountdownHms(nextCastCountdownMs)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPhase('idle')}
                          className="w-full text-[13px] font-semibold text-slate-600 hover:text-red-700 cursor-pointer shrink-0"
                        >
                          ← Về ống quẻ
                        </button>
                      )}

                      {/* 3. Quẻ gần nhất */}
                      {result.previousCastSummary ? (
                        <div className="rounded-2xl border border-slate-200 bg-gray-50 p-4 md:p-6 shrink-0 text-center">
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                            Quẻ gần nhất
                          </p>
                          <p className="text-[16px] font-black text-slate-900">
                            Đuôi may mắn{' '}
                            <span className="text-red-700">{result.previousCastSummary.luckyTail}</span>
                          </p>
                          <p className="text-[13px] text-slate-500 mt-1">
                            {formatFortuneDisplayDate(result.previousCastSummary.castDate)}
                            {result.previousCastSummary.userElement
                              ? ` · Mệnh ${elementUi(result.previousCastSummary.userElement).label}`
                              : ''}
                          </p>
                        </div>
                      ) : (
                        <div className="shrink-0" aria-hidden />
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
