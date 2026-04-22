import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { ApiResponse } from '../config/type';

const BASE_URL = '/admin/coupon';

/** Header auth dùng chung */
const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

/** Lấy tất cả mã giảm giá */
import { mockCoupons } from '../data/coupons';

export const getCoupons = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: mockCoupons,
            pagination: {
                totalRecords: mockCoupons.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: mockCoupons.length,
                active: mockCoupons.filter(c => c.status === 'active').length,
                inactive: mockCoupons.filter(c => c.status === 'inactive').length,
            }
        }
    } as any;
};





/** Lấy mã giảm giá theo ID */
export const getCouponById = async (id: string | number): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/detail/${id}`, withAuth());
    return response.data;
};

/** Tạo mã giảm giá */
export const createCoupon = async (data: any): Promise<any> => {
    // Map data từ FE sang BE format
    const payload = {
        code: data.code,
        name: data.name,
        description: data.description || '',
        typeDiscount: data.typeDiscount || 'percentage',
        value: data.value || 0,
        minOrderValue: data.minOrderValue || 0,
        maxDiscountValue: data.maxDiscountValue || 0,
        usageLimit: data.usageLimit || 0,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        typeDisplay: data.typeDisplay || 'private',
        status: data.status || 'inactive',
    };
    const response = await apiApp.post(BASE_URL, payload, withAuth());
    return response.data;
};

/** Cập nhật mã giảm giá */
export const updateCoupon = async (id: string | number, data: any): Promise<any> => {
    // Map data từ FE sang BE format
    const payload = {
        code: data.code,
        name: data.name,
        description: data.description || '',
        typeDiscount: data.typeDiscount || 'percentage',
        value: data.value || 0,
        minOrderValue: data.minOrderValue || 0,
        maxDiscountValue: data.maxDiscountValue || 0,
        usageLimit: data.usageLimit || 0,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        typeDisplay: data.typeDisplay || 'private',
        status: data.status || 'inactive',
    };
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, payload, withAuth());
    return response.data;
};

export const deleteCoupon = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/delete/${id}`, {}, withAuth());
    return response.data;
};

/** Khôi phục mã giảm giá */
export const restoreCoupon = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

/** Xóa vĩnh viễn mã giảm giá */
export const forceDeleteCoupon = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/force-delete/${id}`, withAuth());
    return response.data;
};
