import dayjs from 'dayjs';
import {
  DEFAULT_SOUTHERN_DRAW_TIME,
  isTodayDrawPassed,
  todayIsoVn,
  vietnamNowParts,
} from './sellableDrawDate.util';

const DAY_IDS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

/** Ngày quay sắp tới của đài (bỏ qua hôm nay nếu đã qua giờ xổ). */
export const resolveNextStationDrawDateIso = (
  drawDays: string[],
  drawTime: string = DEFAULT_SOUTHERN_DRAW_TIME,
  now: Date = new Date()
): string | null => {
  if (!drawDays.length) {
    return null;
  }

  const normalizedDays = new Set(drawDays.map((day) => day.toUpperCase()));
  const { dateIso } = vietnamNowParts(now);
  const todayPassed = isTodayDrawPassed(drawTime, now);

  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = dayjs(`${dateIso}T12:00:00`).add(offset, 'day');
    const dayId = DAY_IDS[candidate.day()];
    if (!normalizedDays.has(dayId)) {
      continue;
    }
    if (offset === 0 && todayPassed) {
      continue;
    }
    return candidate.format('YYYY-MM-DD');
  }

  return null;
};
