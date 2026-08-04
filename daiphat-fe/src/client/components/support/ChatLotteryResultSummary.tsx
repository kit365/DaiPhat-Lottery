"use client";

import { useEffect, useMemo, useState } from 'react';
import { lotteryService } from '../../services/lotteryService';
import { formatApiDateToDisplay, type LotteryPrizes, type LotteryResult } from '../../types/lottery';

interface ChatLotteryResultSummaryProps {
  region?: string;
  stationId?: number;
  stationIds?: number[];
  drawDate?: string;
}

const REGION_LABELS: Record<string, string> = {
  MIEN_NAM: 'Miền Nam',
  MIEN_TRUNG: 'Miền Trung',
  MIEN_BAC: 'Miền Bắc',
};

const PRIZE_ROWS: Array<{ key: keyof LotteryPrizes; label: string; accent?: boolean }> = [
  { key: 'special', label: 'Đặc biệt', accent: true },
  { key: 'first', label: 'Giải 1' },
  { key: 'second', label: 'Giải 2' },
  { key: 'third', label: 'Giải 3' },
  { key: 'fourth', label: 'Giải 4' },
  { key: 'fifth', label: 'Giải 5' },
  { key: 'sixth', label: 'Giải 6' },
  { key: 'seventh', label: 'Giải 7' },
  { key: 'eighth', label: 'Giải 8' },
];

const formatDrawDateLabel = (drawDate?: string): string => {
  if (!drawDate) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
    return formatApiDateToDisplay(drawDate);
  }
  return drawDate;
};

const hasValidStationId = (stationId?: number): stationId is number =>
  stationId != null && !Number.isNaN(stationId);

const filterResults = (
  results: LotteryResult[],
  stationId?: number,
  stationIds?: number[]
): LotteryResult[] => {
  if (hasValidStationId(stationId)) {
    return results.filter((item) => item.stationId === stationId);
  }
  if (stationIds && stationIds.length > 0) {
    const idSet = new Set(stationIds.filter((id) => !Number.isNaN(id)));
    if (idSet.size === 0) {
      return results;
    }
    return results.filter((item) => item.stationId != null && idSet.has(item.stationId));
  }
  return results;
};

const formatPrizeValue = (value: string | string[] | undefined): string => {
  if (value == null) {
    return '—';
  }
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(' · ');
    return joined || '—';
  }
  return value.trim() ? value : '—';
};

const FullPrizeTable = ({ result }: { result: LotteryResult }) => (
  <div className="overflow-hidden rounded-xl border border-gray-100">
    <div className="bg-slate-50 px-3 py-2 border-b border-gray-100">
      <p className="text-[14px] font-semibold text-gray-900">{result.province}</p>
      {result.date && (
        <p className="text-[12px] text-gray-500 mt-0.5">{result.date}</p>
      )}
    </div>
    <div className="divide-y divide-gray-100">
      {PRIZE_ROWS.map((row) => {
        const value = formatPrizeValue(result.prizes[row.key]);
        return (
          <div
            key={row.key}
            className={`flex items-start gap-3 px-3 py-2 ${row.accent ? 'bg-red-50/60' : 'bg-white'}`}
          >
            <span
              className={`w-[72px] shrink-0 text-[12px] font-semibold ${
                row.accent ? 'text-red-600' : 'text-slate-600'
              }`}
            >
              {row.label}
            </span>
            <span
              className={`flex-1 text-[14px] font-bold tracking-wide break-words ${
                row.accent ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {value}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export const ChatLotteryResultSummary = ({
  region,
  stationId,
  stationIds,
  drawDate,
}: ChatLotteryResultSummaryProps) => {
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayDate = useMemo(() => formatDrawDateLabel(drawDate), [drawDate]);
  const regionLabel = region ? (REGION_LABELS[region] ?? region) : null;
  const stationIdsKey = stationIds?.join(',') ?? '';
  const singleStation = hasValidStationId(stationId) && (!stationIds || stationIds.length === 0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!drawDate) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const display = /^\d{4}-\d{2}-\d{2}$/.test(drawDate)
          ? formatApiDateToDisplay(drawDate)
          : drawDate;
        const summaryResponse = await lotteryService.getBoard(display, region);
        let boardResults = summaryResponse.data?.results ?? [];
        boardResults = filterResults(boardResults, stationId, stationIds);

        const resultIds = boardResults
          .map((item) => item.id)
          .filter((id): id is number => typeof id === 'number');

        if (resultIds.length > 0) {
          try {
            const details = await lotteryService.getDetails(resultIds);
            boardResults = lotteryService.mergeBoardWithDetails(boardResults, details);
          } catch {
            // Giữ summary board khi /details lỗi.
          }
        }

        if (!cancelled) {
          setResults(boardResults);
        }
      } catch {
        if (!cancelled) {
          setError('Không thể tải kết quả. Bạn có thể xem chi tiết trên trang Kết quả.');
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [drawDate, stationId, stationIdsKey, region, stationIds]);

  if (isLoading) {
    return (
      <div className="px-4 py-3 text-[14px] text-gray-500">
        Đang tải kết quả{displayDate ? ` ngày ${displayDate}` : ''}...
      </div>
    );
  }

  if (error) {
    return <div className="px-4 py-3 text-[14px] text-gray-600">{error}</div>;
  }

  if (results.length === 0) {
    return (
      <div className="px-4 py-3 text-[14px] text-gray-600">
        Chưa có kết quả{displayDate ? ` cho ngày ${displayDate}` : ''}
        {regionLabel ? ` (${regionLabel})` : ''}.
      </div>
    );
  }

  // Một đài (flow Kết quả sau khi chọn đài) → bảng full giải.
  if (singleStation || results.length === 1) {
    return (
      <div className="p-3 space-y-3">
        {results.map((item) => (
          <FullPrizeTable key={`${item.stationId ?? item.province}-${item.date}`} result={item} />
        ))}
      </div>
    );
  }

  // Nhiều đài (legacy summary) → vẫn hiện full từng đài, gọn trong chat.
  return (
    <div className="p-3 space-y-3">
      {results.map((item) => (
        <FullPrizeTable key={`${item.stationId ?? item.province}-${item.date}`} result={item} />
      ))}
    </div>
  );
};
