import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Newspaper, ShieldCheck, Check, Trash2 } from "lucide-react";
import {
    useDeleteAllMyReadNotifications,
    useMarkAllMyNotificationsAsRead,
    useMarkMyNotificationAsRead,
    useNotifications
} from "../../../../hooks/useNotifications";
import { NotificationResponse, NOTIFICATION_TYPE } from "../../../../../types/notifications.type";
import { getNotificationPath } from "../../../../utils/notification.util";

const formatDateTime = (value?: string) => {
    if (!value) return "";

    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
                        date.getMonth() === yesterday.getMonth() &&
                        date.getFullYear() === yesterday.getFullYear();

    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;

    if (isToday) {
        if (diffHours < 4) return `${diffHours} giờ trước`;
        return `Hôm nay, ${timeStr}`;
    }

    if (isYesterday) {
        return `Hôm qua, ${timeStr}`;
    }

    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}, ${timeStr}`;
};

const getTypeMeta = (type: NotificationResponse["type"]) => {
    switch (type) {
        case NOTIFICATION_TYPE.AUTH:
            return {
                icon: ShieldCheck,
                iconWrapperClass: "bg-[#F0F5FF] text-[#2065D1]",
                actionLabel: "Bảo mật",
            };
        case NOTIFICATION_TYPE.BLOG:
            return {
                icon: Newspaper,
                iconWrapperClass: "bg-[#ECFDF5] text-[#1CD162]",
                actionLabel: "Bài viết",
            };
        default:
            return {
                icon: Bell,
                iconWrapperClass: "bg-[#FFF4F4] text-[#ee1314]",
                actionLabel: "Hệ thống",
            };
    }
};

export const NotificationsTab = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const {
        notifications: allNotifications,
        unreadCount,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useNotifications(7);
    const { mutate: markMyNotificationAsRead } = useMarkMyNotificationAsRead();
    const { mutate: markAllMyNotificationsAsRead } = useMarkAllMyNotificationsAsRead();
    const { mutate: deleteAllMyReadNotifications } = useDeleteAllMyReadNotifications();

    const notifications = useMemo(
        () => activeTab === 'unread'
            ? allNotifications.filter((notification) => !notification.isRead)
            : allNotifications,
        [activeTab, allNotifications]
    );

    useEffect(() => {
        if (activeTab !== 'all') {
            return;
        }

        const root = scrollContainerRef.current;
        const target = loadMoreRef.current;

        if (!root || !target || !hasNextPage) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;

                if (entry?.isIntersecting && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            {
                root,
                rootMargin: "160px 0px",
                threshold: 0.1,
            }
        );

        observer.observe(target);

        return () => observer.disconnect();
    }, [activeTab, fetchNextPage, hasNextPage, isFetchingNextPage]);

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <div>
                    <h2 className="text-[24px] font-bold text-[#212B36] font-client-display mb-1">Thông báo</h2>
                    <p className="text-[14px] text-[#637381]">Xem các thông báo của bạn</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => deleteAllMyReadNotifications()}
                        className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#212B36] border border-[#E5E8EB] rounded-xl hover:bg-slate-50 transition-colors bg-white cursor-pointer"
                    >
                        <Trash2 size={16} className="text-[#637381]" /> Xóa đã đọc
                    </button>
                    <button
                        onClick={() => markAllMyNotificationsAsRead()}
                        className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#ee1314] border border-[#ffcdcd] rounded-xl hover:bg-[#FFF4F4] transition-colors bg-white cursor-pointer"
                    >
                        <Check size={16} strokeWidth={2.5} /> Đánh dấu tất cả đã đọc
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-[#E5E8EB] mb-6">
                <button
                    className={`pb-3 text-[15px] font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'all' ? 'border-[#ee1314] text-[#ee1314]' : 'border-transparent text-[#637381] hover:text-[#212B36]'}`}
                    onClick={() => setActiveTab('all')}
                >
                    Tất cả
                </button>
                <button
                    className={`pb-3 text-[15px] font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'unread' ? 'border-[#ee1314] text-[#ee1314]' : 'border-transparent text-[#637381] hover:text-[#212B36]'}`}
                    onClick={() => setActiveTab('unread')}
                >
                    Chưa đọc ({unreadCount})
                </button>
            </div>



            {/* List */}
            <div
                ref={scrollContainerRef}
                className="flex flex-col gap-4 max-h-[640px] overflow-y-auto pr-1"
            >
                {isLoading ? (
                    <div className="flex flex-col gap-4">
                        {Array.from({ length: 7 }).map((_, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-[#E5E8EB] p-4 animate-pulse"
                            >
                                <div className="flex gap-4">
                                    <div className="w-11 h-11 rounded-full bg-[#F4F6F8] shrink-0"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-[#F4F6F8] rounded w-1/2 mb-2"></div>
                                        <div className="h-3 bg-[#F4F6F8] rounded w-full mb-2"></div>
                                        <div className="h-3 bg-[#F4F6F8] rounded w-1/3"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {notifications.map((notification) => {
                            const meta = getTypeMeta(notification.type);
                            const IconComp = meta.icon;
                            const path = getNotificationPath(notification);

                            return (
                                <div
                                    key={notification.notificationId}
                                    onClick={() => {
                                        if (!notification.isRead) {
                                            markMyNotificationAsRead(notification.notificationId);
                                        }
                                        if (path) {
                                            navigate(path);
                                        }
                                    }}
                                    className={`rounded-2xl border p-4 transition-colors ${
                                        notification.isRead
                                            ? "bg-white border-[#E5E8EB] opacity-[0.65]"
                                            : "bg-[#FFF9F9] border-[#FFE5E5]"
                                    } cursor-pointer hover:shadow-sm`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-start gap-4 relative pl-4">
                                        {/* Unread indicator dot */}
                                        {!notification.isRead && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#ee1314]"></div>
                                        )}

                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${meta.iconWrapperClass}`}>
                                            <IconComp size={20} strokeWidth={2} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                <h4 className="text-[14px] font-bold text-[#212B36]">{notification.title}</h4>
                                                <span className="bg-[#F4F6F8] text-[#637381] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    {meta.actionLabel}
                                                </span>
                                            </div>

                                            <p className="text-[13px] text-[#454F5B] leading-relaxed">
                                                {notification.content}
                                            </p>
                                        </div>

                                        <div className="md:text-right md:shrink-0 flex md:flex-col items-center md:items-end gap-2 md:gap-1 text-[12px]">
                                            <span className="text-[#637381]">
                                                {formatDateTime(notification.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {activeTab === 'all' && hasNextPage && (
                            <div
                                ref={loadMoreRef}
                                className="text-center text-[13px] text-[#919EAB] font-medium pt-2"
                            >
                                Cuộn xuống để xem các thông báo trước đó
                            </div>
                        )}

                        {isFetchingNextPage && (
                            <div className="text-center text-[13px] font-medium text-[#637381] py-4">
                                Đang tải thêm thông báo...
                            </div>
                        )}

                        {!hasNextPage && (
                            <div className="text-center text-[13px] text-[#919EAB] font-medium pt-4">
                                Không còn thông báo nào khác
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center">
                            <Bell size={24} strokeWidth={2} />
                        </div>
                        <p className="text-[15px] font-bold text-[#212B36] mb-1">Bạn chưa có thông báo nào</p>
                        <p className="text-[13px] text-[#637381]">Khi có cập nhật mới từ hệ thống, chúng sẽ xuất hiện tại đây.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
