'use client';

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Loader2, ShoppingCart, Shuffle, CalendarHeart, ArrowLeft } from 'lucide-react';
import { isAxiosError } from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useAuth } from '../../hooks/useAuth';
import { CLIENT_PAGE_BACKGROUND } from '../../constants/clientBannerAssets';
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
import { FortuneStageBackdrop } from './components/FortuneStageBackdrop';
import { FortuneDobPicker } from './components/FortuneDobPicker';
import {
  EJECT_DURATION_MS,
  SHAKE_DURATION_MS,
  elementUi,
  type FortuneAnimPhase,
  type JarSceneMode,
} from './fortuneUi';
import {
  fireFortuneEjectBurst,
  originFromElement,
  rattleDevice,
  startFortuneResultFireworks,
  startFortuneShakeSparkles,
} from './fortuneCelebration';

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
      <strong key={`b-${key++}`} className="font-bold text-amber-200">
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-[#2A0C0E]/80 font-semibold text-amber-50 w-full ${
        compact ? 'px-2 py-1 text-[11px] rounded-full' : 'px-4 py-3 text-[15px]'
      }`}
    >
      <span className="text-amber-200/70 font-medium">{title}:</span>
      <strong className="text-amber-100">{ui.label}</strong>
    </span>
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function FortuneCastPage() {
  const pathname = usePathname() ?? '';
    const searchParamsForLocation = useSearchParams();
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
  const jarRef = useRef<HTMLDivElement>(null);
  const fireworksStopRef = useRef<(() => void) | null>(null);

  // Tạm tắt khóa lượt để test gieo liên tục — nhớ bật lại trước khi ship.
  const skipDailyLimit = true;
  const alreadyCastToday = skipDailyLimit
    ? false
    : hasCastToday || Boolean(result?.alreadyCastToday);
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
  }, [pathname]);

  useLayoutEffect(() => {
    if (loadingToday) return;
    scrollToTop();
  }, [loadingToday, phase, sceneKey]);

  useEffect(() => {
    if (phase !== 'shaking') return;
    const sparkles = startFortuneShakeSparkles(() => originFromElement(jarRef.current, 0.28));
    return () => sparkles.stop();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'ejecting') return;
    fireFortuneEjectBurst(originFromElement(jarRef.current, 0.22));
  }, [phase]);

  useEffect(() => {
    return () => {
      fireworksStopRef.current?.();
      fireworksStopRef.current = null;
    };
  }, []);

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
    rattleDevice([40, 30, 40, 30, 80, 40, 50]);

    const apiPromise = castFortune(opts.payload);

    try {
      await sleep(SHAKE_DURATION_MS);
      setPhase('ejecting');

      const [castResult] = await Promise.all([apiPromise, waitForEjectComplete()]);
      setResult(castResult);
      setHasCastToday(Boolean(castResult.alreadyCastToday));
      rattleDevice([20, 40, 120]);
      setPhase('result');
      fireworksStopRef.current?.();
      fireworksStopRef.current = startFortuneResultFireworks().stop;
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
      <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#7a1f22]/80">
        Chọn cách gieo
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => selectCastMode('random')}
          onKeyDown={(event) => handleCastModeKeyDown(event, 'random')}
          className={`relative cursor-pointer overflow-hidden rounded-xl p-4 text-left transition-all md:p-[18px] ${
            castMode === 'random'
              ? 'bg-gradient-to-b from-[#8B1A1C] to-[#4A0E10] shadow-[0_0_0_1px_#E8C872,0_12px_28px_rgba(0,0,0,0.35)]'
              : 'border border-amber-700/25 bg-[#2A0C0E]/70 hover:border-amber-500/45'
          }`}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-3 -top-4 font-serif text-[72px] leading-none text-amber-400/10"
          >
            運
          </span>
          <div className="relative flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                castMode === 'random'
                  ? 'border-amber-300 bg-gradient-to-br from-amber-200 to-amber-600 text-[#6B1012]'
                  : 'border-amber-700/40 bg-black/20 text-amber-400/80'
              }`}
            >
              <Shuffle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-black tracking-[0.08em] text-amber-100 md:text-[14px]">
                Gieo ngẫu nhiên
              </p>
              <p className="mt-1 text-[12px] leading-snug text-amber-100/65">
                Để vận khí hôm nay chọn bản mệnh giúp bạn.
              </p>
            </div>
          </div>
          {castMode === 'random' && (
            <span className="absolute right-3 top-3 rounded-sm bg-amber-400 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-[#5A1012]">
              CHỌN
            </span>
          )}
        </button>

        <div
          role="button"
          tabIndex={0}
          onClick={() => selectCastMode('birthdate')}
          onKeyDown={(event) => handleCastModeKeyDown(event, 'birthdate')}
          className={`relative z-10 cursor-pointer rounded-xl p-4 text-left transition-all md:p-[18px] ${
            castMode === 'birthdate'
              ? 'bg-gradient-to-b from-[#8B1A1C] to-[#4A0E10] shadow-[0_0_0_1px_#E8C872,0_12px_28px_rgba(0,0,0,0.35)]'
              : 'border border-amber-700/25 bg-[#2A0C0E]/70 hover:border-amber-500/45'
          }`}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-5 font-serif text-[72px] leading-none text-amber-400/10"
          >
            命
          </span>
          {castMode === 'birthdate' && (
            <span className="absolute right-3 top-3 rounded-sm bg-amber-400 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-[#5A1012]">
              CHỌN
            </span>
          )}
          <div className="relative mb-3 flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                castMode === 'birthdate'
                  ? 'border-amber-300 bg-gradient-to-br from-amber-200 to-amber-600 text-[#6B1012]'
                  : 'border-amber-700/40 bg-black/20 text-amber-400/80'
              }`}
            >
              <CalendarHeart className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-black tracking-[0.08em] text-amber-100 md:text-[14px]">
                Gieo theo ngày sinh
              </p>
              <p className="mt-1 text-[12px] leading-snug text-amber-100/65">
                Luận quẻ đúng bản mệnh của bạn.
              </p>
            </div>
          </div>
          <FortuneDobPicker
            day={birthDay}
            month={birthMonth}
            year={birthYearInput}
            onDayChange={setBirthDay}
            onMonthChange={setBirthMonth}
            onYearChange={setBirthYearInput}
            onInteract={() => selectCastMode('birthdate')}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="client-page relative min-h-[100dvh] overflow-x-hidden bg-fixed bg-cover bg-center">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${CLIENT_PAGE_BACKGROUND}")` }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#f7e4d8]/50 via-transparent to-[#7a1f22]/20" />

      <main className="relative z-1 min-h-[100dvh] pt-20 lg:pt-24 pb-24 lg:pb-10 flex flex-col">
        <div className="max-w-[1280px] mx-auto px-4 xl:px-0 w-full flex-1 flex flex-col min-h-0">
          <section className="mb-2 text-center shrink-0">
            <p className="client-body mb-0.5">Mỗi ngày một quẻ · Đón vận may</p>
            <h1 className="client-heading">Gieo quẻ tài lộc</h1>
          </section>

          <div className="relative w-full flex-1 flex flex-col min-h-[min(720px,calc(100dvh-11rem))] overflow-hidden rounded-[28px] border border-white/40 shadow-[0_20px_50px_rgba(122,31,34,0.22)]">
          <FortuneStageBackdrop />
          <div className="relative px-4 py-4 md:px-6 md:py-5 flex-1 flex flex-col min-h-0">
            {loadingToday && phase === 'idle' ? (
              <div className="flex flex-col flex-1 items-center justify-center gap-3 py-20 text-[#7a1f22]">
                <Loader2 className="w-8 h-8 animate-spin text-[#c45a4c]" />
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
                        <p className="rounded-xl border border-amber-600/30 bg-[#2A0C0E]/70 px-4 py-2 text-sm text-amber-100/85">
                          Đăng nhập để gieo quẻ và lưu kết quả trong ngày.
                        </p>
                      )}

                      {showCastSetup && <CastSetupPanel />}

                      {errorMessage && (
                        <p className="mx-auto w-full max-w-[720px] rounded-xl border border-amber-500/30 bg-[#5A1012]/80 px-4 py-2 text-sm font-semibold text-amber-100">
                          {errorMessage}
                        </p>
                      )}

                      <div className="space-y-0.5 pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9b2b2b]">
                          Thần Tài
                        </p>
                        <h2 className="text-base font-black tracking-tight text-[#5A1012] md:text-lg">
                          Ống quẻ tài lộc
                        </h2>
                        <p className="text-[12px] leading-snug text-[#6B1012]/75 md:text-[13px]">
                          Lắc ống — số trên que là <strong className="text-[#9b2b2b]">đuôi may mắn</strong> hôm nay.
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    ref={jarRef}
                    className="relative w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[360px] flex-1 flex items-center justify-center min-h-[280px]"
                  >
                    <FortuneJarScene
                      mode={jarMode}
                      winningTail={result?.luckyTail}
                      onEjectComplete={handleEjectComplete}
                      onClick={canJarClick ? handlePrimaryClick : undefined}
                    />
                  </div>

                  {(phase === 'shaking' || phase === 'ejecting') && (
                    <div className="mt-auto w-full max-w-[680px] shrink-0 space-y-1 rounded-2xl border border-amber-500/25 bg-[#2A0C0E]/80 p-5">
                      <div className="flex items-center justify-center gap-2 text-[15px] font-black text-amber-50">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                        {phase === 'shaking' ? 'Đang lắc ống quẻ…' : 'Một que đang bay ra…'}
                      </div>
                      <p className="text-[13px] text-amber-100/65">
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
                    <div className="flex h-full min-h-full flex-col justify-between gap-5 rounded-2xl border border-amber-500/25 bg-[#2A0C0E]/75 p-5 text-center md:p-7">
                      <div className="space-y-1.5 shrink-0">
                        <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-amber-400/85 md:text-[13px]">
                          Quẻ xăm tài lộc hôm nay
                        </p>
                        <h2 className="text-2xl font-black leading-tight text-amber-50 md:text-[28px]">
                          Thẻ may mắn của bạn
                        </h2>
                      </div>

                      <FortuneStickCard luckyTail={result.luckyTail} reveal large className="my-0 mx-auto w-full" />

                      <div className="mx-auto grid w-full max-w-[420px] shrink-0 grid-cols-2 gap-3">
                        <ElementPill title="Bản mệnh" value={result.userElement} />
                        <ElementPill title="Hành ngày" value={result.dayElement} />
                      </div>

                      <Link
                        href={result.buyPath}
                        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#ee1314] px-4 py-3.5 text-center text-[15px] font-black text-white no-underline shadow-[0_8px_20px_rgba(238,19,20,0.35)] hover:bg-red-700 md:py-4 md:text-[16px]"
                      >
                        <ShoppingCart className="h-5 w-5" />
                        Mua vé đuôi {result.luckyTail}
                      </Link>
                    </div>

                    <div className="flex h-full min-h-full flex-col justify-between gap-4 rounded-2xl border border-amber-500/25 bg-[#2A0C0E]/75 p-5 md:p-6">
                      <div className="shrink-0 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-amber-400/70">
                            Kết quả hôm nay
                          </p>
                          <h3 className="text-xl font-black leading-tight text-amber-50 md:text-2xl">
                            Lời luận quẻ
                          </h3>
                        </div>
                        <div className="rounded-2xl border border-amber-500/20 bg-[#1A0808]/70 p-4 md:p-6">
                          <p className="whitespace-pre-wrap text-[15px] leading-[1.85] text-amber-50/85 md:text-[16px]">
                            {highlightFortuneProse(result.prose, result.luckyTail)}
                          </p>
                        </div>
                      </div>

                      {alreadyCastToday ? (
                        <div className="flex shrink-0 flex-col items-center gap-2.5 rounded-2xl border border-amber-500/20 bg-[#1A0808]/70 p-4 text-center md:p-5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/60">
                            Thời gian chờ giữa các lần gieo
                          </p>
                          <div className="w-full max-w-[280px] rounded-xl border border-amber-500/30 bg-[#3d1012]/80 px-4 py-3">
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-200/60">
                              Lượt tiếp theo
                            </p>
                            <p className="text-3xl font-black tabular-nums tracking-tight text-amber-300 md:text-4xl">
                              {formatCountdownHms(nextCastCountdownMs)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPhase('idle')}
                          className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-amber-300 px-4 py-3.5 text-[15px] font-black text-[#6B1012] shadow-[0_8px_20px_rgba(122,31,34,0.22)] transition hover:from-white hover:to-amber-200 md:py-4 md:text-[16px]"
                        >
                          <ArrowLeft className="h-5 w-5" />
                          Về ống quẻ
                        </button>
                      )}

                      {result.previousCastSummary ? (
                        <div className="shrink-0 rounded-2xl border border-amber-500/20 bg-[#1A0808]/70 p-4 text-center md:p-6">
                          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-amber-200/60">
                            Quẻ gần nhất
                          </p>
                          <p className="text-[16px] font-black text-amber-50">
                            Đuôi may mắn{' '}
                            <span className="text-amber-300">{result.previousCastSummary.luckyTail}</span>
                          </p>
                          <p className="mt-1 text-[13px] text-amber-100/55">
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
