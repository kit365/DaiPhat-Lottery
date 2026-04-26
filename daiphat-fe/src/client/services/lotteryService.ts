import { LotteryResult, MOCK_DATABASE } from '../types/lottery';
import { ApiResponse } from '../../admin/config/type';

export const lotteryService = {
  /**
   * Fetches the latest lottery result for a specific province.
   */
  getResultsByProvince: async (province: string): Promise<ApiResponse<LotteryResult>> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const provinceResults = MOCK_DATABASE[province];
    const data = provinceResults ? provinceResults[0] : undefined;

    if (!data) {
      return {
        success: false,
        data: undefined,
        message: `Chưa có kết quả cho tỉnh ${province}`,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data,
      message: "Lấy dữ liệu thành công",
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Fetches a specific result for a province on a specific date.
   */
  getResultByDate: async (province: string, date: string): Promise<ApiResponse<LotteryResult>> => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const provinceResults = MOCK_DATABASE[province];
    const data = provinceResults?.find(r => r.date === date);

    if (!data) {
      return {
        success: false,
        data: undefined,
        message: `Chưa có kết quả cho tỉnh ${province} vào ngày ${date}`,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data,
      message: "Lấy dữ liệu thành công",
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Fetches historical results for a specific province.
   */
  getHistoryByProvince: async (province: string): Promise<ApiResponse<LotteryResult[]>> => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const history = MOCK_DATABASE[province] || [];

    return {
      success: true,
      data: history,
      message: "Lấy lịch sử thành công",
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Fetches the latest results for all supported provinces.
   */
  getAllResults: async (): Promise<ApiResponse<LotteryResult[]>> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Return the latest result for each province
    const allLatest = Object.values(MOCK_DATABASE).map(list => list[0]);

    return {
      success: true,
      data: allLatest,
      message: "Lấy tất cả dữ liệu thành công",
      timestamp: new Date().toISOString()
    };
  }
};
