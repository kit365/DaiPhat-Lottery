import React from 'react';
import { ApiResponse } from '../../admin/config/type';

// --- TYPES ---
export interface LotteryPrizes {
  special: string;
  first: string;
  second: string;
  third: string[];
  fourth: string[];
  fifth: string;
  sixth: string[];
  seventh: string;
  eighth: string;
}

export interface LotteryResult {
  province: string;
  date: string;
  dayOfWeek: string;
  prizes: LotteryPrizes;
}

export type DisplayType = 'full' | '2-digit' | '3-digit';

export interface LotoRow {
  head: string;   // The focus digit (0-9)
  heads: string;  // Heads digits when focus is tail (Left column)
  tails: string;  // Tails digits when focus is head (Right column)
}

// --- MOCK DATA ---
// Detailed database organized by Province
export const MOCK_DATABASE: Record<string, LotteryResult[]> = {
  "TP. Hồ Chí Minh": [
    {
      province: "TP. Hồ Chí Minh", date: "24/05/2024", dayOfWeek: "Thứ Sáu",
      prizes: {
        special: "458120", first: "99312", second: "45102",
        third: ["45102", "99321"],
        fourth: ["45821", "90123", "77124", "09541", "10092", "88345", "33414"],
        fifth: "1204", sixth: ["4582", "9012", "3341"],
        seventh: "468", eighth: "35"
      }
    },
    {
      province: "TP. Hồ Chí Minh", date: "20/05/2024", dayOfWeek: "Thứ Hai",
      prizes: {
        special: "112233", first: "88776", second: "55443",
        third: ["12345", "67890"],
        fourth: ["11111", "22222", "33333", "44444", "55555", "66666", "77777"],
        fifth: "4455", sixth: ["1122", "3344", "5566"],
        seventh: "778", eighth: "99"
      }
    },
    {
      province: "TP. Hồ Chí Minh", date: "17/05/2024", dayOfWeek: "Thứ Sáu",
      prizes: {
        special: "998877", first: "11223", second: "33445",
        third: ["55667", "77889"],
        fourth: ["12121", "34343", "56565", "78787", "90909", "12321", "45654"],
        fifth: "8899", sixth: ["1212", "3434", "5656"],
        seventh: "123", eighth: "45"
      }
    },
    {
      province: "TP. Hồ Chí Minh", date: "13/05/2024", dayOfWeek: "Thứ Hai",
      prizes: {
        special: "001122", first: "33445", second: "66778",
        third: ["12321", "54345"],
        fourth: ["00001", "00002", "00003", "00004", "00005", "00006", "00007"],
        fifth: "9988", sixth: ["1010", "2020", "3030"],
        seventh: "456", eighth: "78"
      }
    }
  ],
  "Đồng Tháp": [
    {
      province: "Đồng Tháp", date: "24/05/2024", dayOfWeek: "Thứ Sáu",
      prizes: {
        special: "654321", first: "12345", second: "67890",
        third: ["54321", "09876"],
        fourth: ["11122", "33344", "55566", "77788", "99900", "12121", "34343"],
        fifth: "1234", sixth: ["5678", "9012", "3456"],
        seventh: "789", eighth: "01"
      }
    },
    {
      province: "Đồng Tháp", date: "17/05/2024", dayOfWeek: "Thứ Sáu",
      prizes: {
        special: "778899", first: "11223", second: "44556",
        third: ["77665", "44332"],
        fourth: ["10101", "20202", "30303", "40404", "50505", "60606", "70707"],
        fifth: "8080", sixth: ["9090", "1010", "1111"],
        seventh: "222", eighth: "33"
      }
    }
  ],
  "Cà Mau": [
    {
      province: "Cà Mau", date: "24/05/2024", dayOfWeek: "Thứ Sáu",
      prizes: {
        special: "135790", first: "24680", second: "13579",
        third: ["98765", "43210"],
        fourth: ["12345", "67890", "54321", "09876", "11223", "44556", "77889"],
        fifth: "9900", sixth: ["1122", "3344", "5566"],
        seventh: "778", eighth: "99"
      }
    }
  ]
};

// Legacy support
export const MOCK_RESULTS: Record<string, LotteryResult> = {
  "TP. Hồ Chí Minh": MOCK_DATABASE["TP. Hồ Chí Minh"][0],
  "Đồng Tháp": MOCK_DATABASE["Đồng Tháp"][0],
  "Cà Mau": MOCK_DATABASE["Cà Mau"][0]
};

// --- HELPERS ---
export const getDisplayNumber = (num: string, type: DisplayType): string => {
  if (type === '2-digit') return num.slice(-2);
  if (type === '3-digit') return num.slice(-3);
  return num;
};

export const calculateLotoTable = (prizes: LotteryPrizes): LotoRow[] => {
  const allNumbers = [
    prizes.special, prizes.first, prizes.second,
    ...prizes.third, ...prizes.fourth,
    prizes.fifth, ...prizes.sixth,
    prizes.seventh, prizes.eighth
  ].filter(Boolean);

  const asHead: Record<string, Record<string, number>> = {};
  const asTail: Record<string, Record<string, number>> = {};

  for (let i = 0; i <= 9; i++) {
    asHead[i.toString()] = {};
    asTail[i.toString()] = {};
  }

  allNumbers.forEach(num => {
    const lastTwo = num.slice(-2);
    if (lastTwo.length === 2) {
      const head = lastTwo[0];
      const tail = lastTwo[1];
      asHead[head][tail] = (asHead[head][tail] || 0) + 1;
      asTail[tail][head] = (asTail[tail][head] || 0) + 1;
    }
  });

  const formatList = (counts: Record<string, number>): string => {
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([digit, count]) => {
        if (count > 1) return `${digit}^${count}`;
        return digit;
      })
      .join(', ');
  };

  return Array.from({ length: 10 }, (_, i) => {
    const focus = i.toString();
    return {
      head: focus,
      heads: formatList(asTail[focus]),
      tails: formatList(asHead[focus])
    };
  });
};
