import { apiApp } from '../../api';
import Cookies from 'js-cookie';

const BASE_URL = '/admin/notifications';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getNotifications = async () => {
    return {
        success: true,
        data: [
            {
                _id: "1",
                title: "Đơn hàng mới",
                content: "Chúc mừng! Bạn có đơn hàng mới từ Nguyễn Văn A",
                type: "order",
                status: "unread",
                createdAt: new Date().toISOString()
            },
            {
                _id: "2",
                title: "Gia hạn dịch vụ",
                content: "Khách hàng Trần Văn B đã thanh toán cho dịch vụ Spa thú cưng",
                type: "ticketService",
                status: "read",
                createdAt: new Date(Date.now() - 3600000).toISOString()
            }
        ]
    };
};



export const markAsRead = async (id: string) => {
    return { success: true };
};

export const markAllAsRead = async () => {
    return { success: true };
};

export const archiveNotification = async (id: string) => {
    return { success: true };
};

export const archiveAllNotifications = async () => {
    return { success: true };
};

export const deleteNotification = async (id: string) => {
    return { success: true };
};

export const deleteAllNotifications = async () => {
    return { success: true };
};

