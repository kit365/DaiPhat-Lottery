'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, ShoppingCart } from 'lucide-react';
import { isAxiosError } from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  castFortune,
  getTodayFortuneCast,
  type FortuneCastResult,
} from '../../services/fortuneCastService';
import { BottomNav } from '../../components/layout/BottomNav';
import { FortuneJarScene } from './components/FortuneJarScene';
import { FortuneStickCard } from './components/FortuneStickCard';
import {
  EJECT_DURATION_MS,
  SHAKE_DURATION_MS,
  elementUi,
  formatCountdown,
  msUntilNextLocalMidnight,
  type FortuneAnimPhase,
  type JarSceneMode,
} from './fortuneUi';

const BIRTH_YEAR_REQUIRED_HINT = 'Birth year is required';

function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message || error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

function ElementPill({ title, value }: { title: string; value?: string | null }) {
  const ui = elementUi(value);
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF8E7] border border-amber-200/80 text-[13px] font-semibold text-slate-700 shadow-sm">
      <span className="text-base leading-none" aria-hidden>
        {ui.emoji}
      </span>
      <span className="text-slate-500 font-medium">{title}:</span>
      <strong className="text-amber-900">{ui.label}</strong>
    </span>
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function FortuneCastPage() {
  const token = useAuthStore((s) => s.token);
  const openLoginModal = useAuthStore((s) => s.openLoginModal);
  const navigate = useNavigate();

  const [phase, setPhase] = useState<FortuneAnimPhase>('idle');
  const [birthYear, setBirthYear] = useState('');
  const [result, setResult] = useState<FortuneCastResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingToday, setLoadingToday] = useState(false);
  const [countdownMs, setCountdownMs] = useState(() => msUntilNextLocalMidnight());
  const [sceneKey, setSceneKey] = useState(0);
  const ejectDoneRef = useRef<(() => void) | null>(null);

  const alreadyCastToday = Boolean(result?.alreadyCastToday);

  const jarMode: JarSceneMode = useMemo(() => {
    if (phase === 'shaking') return 'shaking';
    if (phase === 'ejecting') return 'ejecting';
    if (phase === 'result') return 'settled';
    return 'idle';
  }, [phase]);

  const loadToday = useCallback(async () => {
    if (!token) return;
    setLoadingToday(true);
    try {
      const today = await getTodayFortuneCast();
      if (today) {
        setResult(today);
        setPhase('idle');
      }
    } catch {
      // ignore
    } finally {
      setLoadingToday(false);
    }
  }, [token]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  useEffect(() => {
    if (!alreadyCastToday || phase !== 'result') return;
    const tick = () => setCountdownMs(msUntilNextLocalMidnight());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [alreadyCastToday, phase]);

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

  /** Shake → eject → result (no blank mid-frame). API optional when replaying today. */
  const playCinematic = async (opts: {
    year?: number;
    replayResult?: FortuneCastResult;
  }) => {
    setBusy(true);
    setErrorMessage(null);
    setSceneKey((k) => k + 1);
    setPhase('shaking');

    const apiPromise = opts.replayResult
      ? Promise.resolve(opts.replayResult)
      : castFortune(opts.year);

    try {
      await sleep(SHAKE_DURATION_MS);
      setPhase('ejecting');

      const [castResult] = await Promise.all([apiPromise, waitForEjectComplete()]);
      setResult(castResult);
      setPhase('result');
    } catch (error) {
      const message = extractErrorMessage(error);
      if (message.includes(BIRTH_YEAR_REQUIRED_HINT)) {
        setPhase('needBirthYear');
      } else {
        setErrorMessage(message);
        setPhase('error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePrimaryClick = () => {
    if (busy) return;
    if (!ensureAuth()) return;

    if (result && alreadyCastToday) {
      void playCinematic({ replayResult: result });
      return;
    }
    void playCinematic({});
  };

  const handleSubmitBirthYear = () => {
    const year = Number(birthYear);
    if (!Number.isFinite(year) || year < 1900 || year > new Date().getFullYear()) {
      setErrorMessage('Vui lòng nhập năm sinh hợp lệ.');
      return;
    }
    void playCinematic({ year });
  };

  const primaryLabel = result && alreadyCastToday ? 'Xem quẻ hôm nay' : 'Gieo quẻ ngay';
  const showJarStage =
    phase === 'idle' ||
    phase === 'error' ||
    phase === 'needBirthYear' ||
    phase === 'shaking' ||
    phase === 'ejecting';

  return (
    <div
      className="client-page relative min-h-screen overflow-x-hidden bg-fixed bg-cover bg-center"
      style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25" />

      <main className="relative z-1 pt-16 lg:pt-24 pb-28 lg:pb-20">
        <div className="max-w-[720px] mx-auto px-4">
          <section className="mb-6 text-center">
            <p className="client-body mb-1 text-amber-950/85">Mỗi ngày một quẻ · Đón vận may</p>
            <h1 className="client-heading text-slate-900 drop-shadow-sm">Gieo quẻ tài lộc</h1>
          </section>

          <motion.div
            layout
            transition={{ layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
            className="rounded-[28px] border border-amber-200/80 bg-[#FFF8E8] shadow-[0_20px_55px_rgba(80,20,10,0.16)] overflow-hidden"
          >
            <motion.div
              layout
              className="px-4 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10"
              style={{ minHeight: phase === 'result' ? 560 : 480 }}
              transition={{ layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
            >
              {loadingToday && phase === 'idle' ? (
                <div className="flex flex-col items-center justify-center gap-3 py-28 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-[#ee1314]" />
                  <span className="text-sm font-medium">Đang chuẩn bị ống quẻ…</span>
                </div>
              ) : null}

              <AnimatePresence mode="popLayout" initial={false}>
                {showJarStage && !loadingToday && (
                  <motion.div
                    key={`jar-${sceneKey}`}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12, transition: { duration: 0.22 } }}
                    transition={{ duration: 0.28 }}
                    className="flex flex-col items-center text-center gap-4 max-w-md mx-auto"
                  >
                    <FortuneJarScene
                      mode={jarMode}
                      winningTail={result?.luckyTail}
                      onEjectComplete={handleEjectComplete}
                      onClick={
                        phase === 'idle' || phase === 'error' ? handlePrimaryClick : undefined
                      }
                    />

                    {(phase === 'idle' || phase === 'error') && (
                      <>
                        <div className="space-y-2 -mt-2">
                          <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            Ống quẻ Thần Tài
                          </h2>
                          <p className="text-[14.5px] text-slate-600 leading-relaxed px-2">
                            Lắc ống — một que xăm sẽ bay ra. Số trên que chính là{' '}
                            <strong className="text-red-700">đuôi may mắn</strong> của bạn hôm nay.
                          </p>
                        </div>

                        {errorMessage && (
                          <p className="text-sm text-red-700 font-semibold bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                            {errorMessage}
                          </p>
                        )}

                        {!token && (
                          <p className="text-sm text-amber-900/90 bg-amber-100/70 border border-amber-200/80 rounded-xl px-4 py-2.5">
                            Đăng nhập để gieo quẻ và lưu kết quả trong ngày.
                          </p>
                        )}

                        {result && alreadyCastToday && (
                          <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                            Bạn đã gieo quẻ hôm nay — vẫn có thể xem lại với hiệu ứng lắc ống.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={handlePrimaryClick}
                          disabled={busy}
                          className="mt-1 px-10 py-3.5 rounded-full bg-[#ee1314] text-white font-black text-[16px] hover:bg-red-700 disabled:opacity-60 shadow-[0_12px_30px_rgba(238,19,20,0.38)] hover:shadow-lg hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
                        >
                          <Sparkles className="w-5 h-5 text-amber-200" />
                          {primaryLabel}
                        </button>
                      </>
                    )}

                    {phase === 'needBirthYear' && (
                      <div className="flex flex-col gap-4 w-full max-w-md text-center">
                        <h3 className="text-lg font-black text-slate-900">Nhập năm sinh</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Để xác định bản mệnh ngũ hành. Hệ thống lưu vào hồ sơ cho lần sau.
                        </p>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Ví dụ: 1998"
                          value={birthYear}
                          onChange={(e) => setBirthYear(e.target.value)}
                          className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-[16px] text-center font-bold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                        />
                        {errorMessage && (
                          <p className="text-sm text-red-600 font-semibold">{errorMessage}</p>
                        )}
                        <button
                          type="button"
                          onClick={handleSubmitBirthYear}
                          disabled={busy}
                          className="px-8 py-3.5 rounded-full bg-[#ee1314] text-white font-black text-[15px] hover:bg-red-700 disabled:opacity-60"
                        >
                          Tiếp tục & gieo quẻ
                        </button>
                      </div>
                    )}

                    {(phase === 'shaking' || phase === 'ejecting') && (
                      <div className="space-y-2 -mt-1">
                        <div className="flex items-center justify-center gap-2.5 text-slate-800 text-[16px] font-black">
                          <Loader2 className="w-5 h-5 animate-spin text-[#ee1314]" />
                          {phase === 'shaking' ? 'Đang lắc ống quẻ…' : 'Một que đang bay ra…'}
                        </div>
                        <p className="text-sm text-slate-500">
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
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-6 max-w-lg mx-auto"
                  >
                    <div className="text-center space-y-1">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-800">
                        Quẻ xăm tài lộc hôm nay
                      </p>
                      <h2 className="text-xl font-black text-slate-900">Thẻ may mắn của bạn</h2>
                    </div>

                    <FortuneStickCard luckyTail={result.luckyTail} reveal />

                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <ElementPill title="Bản mệnh" value={result.userElement} />
                      <ElementPill title="Hành ngày" value={result.dayElement} />
                    </div>

                    <div className="rounded-2xl bg-white/85 border border-amber-100 p-5 text-[15px] text-slate-700 leading-relaxed shadow-sm">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 mb-2">
                        Lời luận quẻ
                      </p>
                      <div className="whitespace-pre-wrap font-medium text-slate-800">{result.prose}</div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        to={result.buyPath}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#ee1314] text-white font-black text-[15px] hover:bg-red-700 text-center shadow-[0_10px_24px_rgba(238,19,20,0.28)] no-underline"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Mua vé đuôi {result.luckyTail}
                      </Link>
                      <button
                        type="button"
                        onClick={() => navigate('/buy-ticket')}
                        className="flex-1 inline-flex items-center justify-center px-5 py-3.5 rounded-full border border-amber-300/90 bg-transparent text-amber-950 font-bold text-[14px] hover:bg-amber-50/80 cursor-pointer"
                      >
                        Xem tất cả vé số
                      </button>
                    </div>

                    <div className="space-y-3 pt-1">
                      {alreadyCastToday ? (
                        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3.5 text-center">
                          <p className="text-[12px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                            Lượt gieo tiếp theo
                          </p>
                          <p className="text-lg font-black text-amber-950 tabular-nums">
                            Còn {formatCountdown(countdownMs)} đến nửa đêm
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPhase('idle')}
                          className="w-full text-sm font-semibold text-amber-900/80 hover:text-red-700 cursor-pointer"
                        >
                          ← Về ống quẻ
                        </button>
                      )}

                      {result.previousCastSummary && (
                        <div className="rounded-2xl border border-amber-100 bg-white/75 px-4 py-3">
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                            Quẻ gần nhất
                          </p>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                Đuôi may mắn{' '}
                                <span className="text-red-700">{result.previousCastSummary.luckyTail}</span>
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {result.previousCastSummary.castDate}
                                {result.previousCastSummary.userElement
                                  ? ` · Mệnh ${elementUi(result.previousCastSummary.userElement).label}`
                                  : ''}
                              </p>
                            </div>
                            <span className="text-2xl" aria-hidden>
                              {elementUi(result.previousCastSummary.userElement).emoji}
                            </span>
                          </div>
                        </div>
                      )}

                      {alreadyCastToday && (
                        <button
                          type="button"
                          onClick={() => {
                            setSceneKey((k) => k + 1);
                            setPhase('idle');
                          }}
                          className="w-full text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer py-1"
                        >
                          ← Quay lại ống quẻ
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
