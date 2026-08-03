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
}

export const castFortune = async (birthYear?: number): Promise<FortuneCastResult> => {
  const response = await apiApp.post<ApiResponse<FortuneCastResult>>(
    '/fortune/cast',
    birthYear != null ? { birthYear } : {},
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
