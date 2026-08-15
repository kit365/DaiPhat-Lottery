'use client';

import '../fortune-stage.css';

/** Silk-wash stage: pale red/white ink lines, drifting mist, faint deity silhouette. */
export function FortuneStageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f7e4d8_0%,#f0c4b4_28%,#c45a4c_72%,#7a1f22_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(255,255,255,0.55),transparent_52%)]" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="fortune-line-red" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff7f2" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#e38a7a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#9b2b2b" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Corner 回纹 */}
        <g fill="none" stroke="url(#fortune-line-red)" strokeWidth="1.4">
          <path d="M48 48 h140 v28 h-112 v112 h-28 z" />
          <path d="M68 68 h100 v18 h-82 v82 h-18 z" />
          <path d="M1152 48 h-140 v28 h112 v112 h28 z" />
          <path d="M1132 68 h-100 v18 h82 v82 h18 z" />
          <path d="M48 852 h140 v-28 h-112 v-112 h-28 z" />
          <path d="M1152 852 h-140 v-28 h112 v-112 h28 z" />
        </g>

        {/* 祥云 — pale red + white ink */}
        <g fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.42">
          <path d="M90 168c38-42 118-48 168-12 22-38 88-52 128-18 48-28 122-18 148 22 62-8 96 48 78 92-18 8-248 14-390-8-72 18-168 4-132-76z" />
          <path d="M820 210c44-36 128-40 176-6 20-32 82-44 118-12 42-24 108-14 128 22 48-4 78 42 58 78-220 22-410-8-480-82z" />
        </g>
        <g fill="none" stroke="#c45c52" strokeWidth="1.35" opacity="0.55">
          <path d="M70 190c42-40 122-44 170-8 24-36 90-48 130-14 50-26 124-16 150 24 60-6 94 50 76 94" />
          <path d="M140 620c70-36 190-28 248 18 36-40 128-52 186-8 70-32 168-10 196 48" />
          <path d="M760 680c56-30 150-24 198 16 28-32 102-40 148-4" />
        </g>

        {/* Bottom wave / 水纹 */}
        <g fill="none" stroke="#fff7f2" strokeWidth="1.2" opacity="0.35">
          <path d="M-20 780c80 28 160-18 240 8s160-22 240 6 160-20 240 8 160-18 240 6 160-20 240 10" />
          <path d="M-20 812c80 24 160-14 240 6s160-18 240 4 160-16 240 6 160-14 240 4 160-16 240 8" />
        </g>

        {/* Faint seal script */}
        <text
          x="96"
          y="430"
          fill="#fff"
          fillOpacity="0.12"
          fontFamily="serif"
          fontSize="120"
          fontWeight="700"
        >
          福
        </text>
        <text
          x="1020"
          y="470"
          fill="#9b2b2b"
          fillOpacity="0.16"
          fontFamily="serif"
          fontSize="110"
          fontWeight="700"
        >
          財
        </text>
      </svg>

      {/* Sương khói */}
      <div className="fortune-mist-drift absolute -left-[12%] top-[8%] h-[46%] w-[58%] rounded-[50%] bg-[radial-gradient(circle,rgba(255,255,255,0.55)_0%,rgba(255,236,228,0.18)_48%,transparent_70%)] blur-2xl" />
      <div className="fortune-mist-drift-slow absolute -right-[10%] top-[22%] h-[50%] w-[52%] rounded-[50%] bg-[radial-gradient(circle,rgba(255,255,255,0.42)_0%,rgba(220,90,80,0.16)_50%,transparent_72%)] blur-3xl" />
      <div className="fortune-mist-drift-late absolute left-[18%] bottom-[6%] h-[38%] w-[70%] rounded-[50%] bg-[radial-gradient(circle,rgba(255,248,242,0.5)_0%,rgba(196,90,76,0.2)_46%,transparent_70%)] blur-2xl" />

      {/* Mờ nhân ảnh — Thần Tài silhouette in the mist */}
      <svg
        className="fortune-figure-breathe absolute bottom-[8%] left-1/2 h-[58%] w-[min(420px,70%)] -translate-x-1/2"
        viewBox="0 0 200 320"
        fill="none"
      >
        <g fill="#6b1518" fillOpacity="0.55">
          <ellipse cx="100" cy="48" rx="22" ry="24" />
          <path d="M62 44h76l-8 14H70z" />
          <rect x="88" y="68" width="24" height="18" rx="6" />
          <path d="M38 250c8-78 28-118 62-128 34 10 54 50 62 128L148 292H52z" />
          <path d="M72 118c-28 8-48 42-54 88h40c4-32 12-58 28-72z" />
          <path d="M128 118c28 8 48 42 54 88h-40c-4-32-12-58-28-72z" />
        </g>
        <g stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2">
          <path d="M78 44c8-18 36-18 44 0" />
          <path d="M70 210c18 14 42 14 60 0" />
        </g>
      </svg>
    </div>
  );
}
