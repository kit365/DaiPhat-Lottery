import { apiApp } from '../../api';
import type { ApiResponse } from '../../types/api.type';
import type { AxiosRequestConfig } from 'axios';

interface CustomAxiosConfig extends AxiosRequestConfig {
  skipGlobalErrorToast?: boolean;
}

export interface FortuneCastPreviousSummary {
  castDate: string;
  luckyTail: string;
  userElement: string;
}

export interface FortuneCastResult {
  luckyTail: string;
  primaryTail: string;
  fallbackUsed: boolean;
  fallbackReason?: string | null;
  userElement: string;
  dayElement: string;
  prose: string;
  proseSource: 'AI' | 'TEMPLATE' | string;
  castDate: string;
  sellableDrawDate: string;
  buyPath: string;
  alreadyCastToday: boolean;
  previousCastSummary?: FortuneCastPreviousSummary | null;
  /** ISO-8601 instant when the next cast unlocks; null when not in cooldown */
  nextUnlockAt?: string | null;
}

export interface CastFortunePayload {
  birthYear?: number;
  /** ISO date YYYY-MM-DD */
  birthDate?: string;
  randomElement?: boolean;
}

export const castFortune = async (payload?: CastFortunePayload): Promise<FortuneCastResult> => {
  const body: CastFortunePayload = {};
  const currentYear = new Date().getFullYear();
  if (payload?.birthDate) {
    body.birthDate = payload.birthDate;
  } else if (payload?.birthYear != null) {
    body.birthYear = payload.birthYear;
  }
  if (payload?.randomElement) {
    body.randomElement = true;
    // Defensive fallback: keep request valid even if backend ignores randomElement flag.
    if (body.birthYear == null && !body.birthDate) {
      body.birthYear = currentYear;
    }
  }

  const response = await apiApp.post<ApiResponse<FortuneCastResult>>(
    '/fortune/cast',
    Object.keys(body).length > 0 ? body : {},
    { skipGlobalErrorToast: true } as CustomAxiosConfig
  );
  if (!response.data?.data) {
    throw new Error(response.data?.message || 'Fortune cast failed');
  }
  return response.data.data;
};

export const getTodayFortuneCast = async (): Promise<FortuneCastResult | null> => {
  const response = await apiApp.get<ApiResponse<FortuneCastResult | null>>('/fortune/cast/today', {
    skipGlobalErrorToast: true,
  } as CustomAxiosConfig);
  return response.data?.data ?? null;
};
