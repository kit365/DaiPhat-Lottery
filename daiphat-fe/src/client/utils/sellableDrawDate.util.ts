/** Giờ xổ miền Nam mặc định — khớp SouthernLotteryStationCatalog.DRAW_TIME trên BE. */
export const DEFAULT_SOUTHERN_DRAW_TIME = '16:15';
export const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Lấy ngày/giờ hiện tại theo timezone Việt Nam. */
export const vietnamNowParts = (now: Date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: VIETNAM_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(now);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? '';

    const year = Number(get('year'));
    const month = Number(get('month'));
    const day = Number(get('day'));
    const hour = Number(get('hour'));
    const minute = Number(get('minute'));

    return {
        dateIso: `${year}-${pad2(month)}-${pad2(day)}`,
        minutesOfDay: hour * 60 + minute,
    };
};

export const parseHhMmToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map((v) => Number(v));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
};

export const todayIsoVn = (now: Date = new Date()) => vietnamNowParts(now).dateIso;

export const tomorrowIsoVn = (now: Date = new Date()) => {
    const today = todayIsoVn(now);
    const noonVn = new Date(`${today}T12:00:00+07:00`);
    noonVn.setTime(noonVn.getTime() + 24 * 60 * 60 * 1000);
    return todayIsoVn(noonVn);
};

/** true khi đã tới/qua giờ xổ hôm nay (vé hôm nay không còn bán). */
export const isTodayDrawPassed = (
    drawTime: string = DEFAULT_SOUTHERN_DRAW_TIME,
    now: Date = new Date()
): boolean => vietnamNowParts(now).minutesOfDay >= parseHhMmToMinutes(drawTime);

/** Ngày quay mặc định khi mở “vé đang bán”. */
export const defaultSellableDrawDate = (
    now: Date = new Date(),
    drawTime: string = DEFAULT_SOUTHERN_DRAW_TIME
): string => (isTodayDrawPassed(drawTime, now) ? tomorrowIsoVn(now) : todayIsoVn(now));

export const minSellableDrawDate = (
    now: Date = new Date(),
    drawTime: string = DEFAULT_SOUTHERN_DRAW_TIME
): string => defaultSellableDrawDate(now, drawTime);

export const maxSellableDrawDate = (now: Date = new Date()): string => tomorrowIsoVn(now);

/** true khi kỳ quay đã diễn ra (hoặc trước hôm nay) → nên mở trang kết quả thay vì mua vé. */
export const shouldOfferLotteryResults = (
  drawDateIso: string | undefined,
  drawTime: string = DEFAULT_SOUTHERN_DRAW_TIME,
  now: Date = new Date()
): boolean => {
  if (!drawDateIso || !ISO_DATE_RE.test(drawDateIso)) {
    return false;
  }

  const today = todayIsoVn(now);
  if (drawDateIso < today) {
    return true;
  }
  if (drawDateIso === today) {
    return isTodayDrawPassed(drawTime, now);
  }
  return false;
};

export const resolveSellableDrawDateParam = (
  raw: string | null | undefined,
  now: Date = new Date(),
  drawTime: string = DEFAULT_SOUTHERN_DRAW_TIME
): string => {
    const min = minSellableDrawDate(now, drawTime);
    const max = maxSellableDrawDate(now);

    if (!raw || raw === 'today') return defaultSellableDrawDate(now, drawTime);
    if (raw === 'tomorrow') return tomorrowIsoVn(now);

    if (ISO_DATE_RE.test(raw)) {
        if (raw < min) return min;
        if (raw > max) return max;
        return raw;
    }

    return defaultSellableDrawDate(now, drawTime);
};
