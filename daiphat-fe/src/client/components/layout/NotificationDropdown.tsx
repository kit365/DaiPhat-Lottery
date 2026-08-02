import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, Newspaper, ShieldCheck, MoreHorizontal, Check, Settings, Trash2 } from "lucide-react";
import {
  useDeleteAllMyReadNotifications,
  useMarkAllMyNotificationsAsRead,
  useMarkMyNotificationAsRead,
  useNotifications
} from "../../hooks/useNotifications";
import { NotificationResponse, NOTIFICATION_TYPE } from "../../../types/notifications.type";
import { resolveNotificationNavigation } from "../../utils/notification.util";
import {
  HEADER_DROPDOWN_ACTION_CLASS,
  HEADER_DROPDOWN_ITEM_TITLE_CLASS,
  HEADER_DROPDOWN_TITLE_CLASS,
} from "./headerDropdown.constants";

const formatRelativeTime = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();
  const diffInMinutes = Math.round((date.getTime() - now.getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

  const absoluteMinutes = Math.abs(diffInMinutes);
  if (absoluteMinutes < 1) {
    return "Vừa xong";
  }
  if (absoluteMinutes < 60) {
    return rtf.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) {
    return rtf.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);
  return rtf.format(diffInDays, "day");
};

const getNotificationMeta = (type: NotificationResponse["type"]) => {
  switch (type) {
    case NOTIFICATION_TYPE.AUTH:
      return {
        icon: ShieldCheck,
        iconClass: "text-[#2065D1] bg-[#F0F5FF]",
      };
    case NOTIFICATION_TYPE.BLOG:
      return {
        icon: Newspaper,
        iconClass: "text-[#1CD162] bg-[#ECFDF5]",
      };
    default:
      return {
        icon: Bell,
        iconClass: "text-[#ee1314] bg-[#FFF0F0]",
      };
  }
};

export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    remainingCount,
  } = useNotifications(4);
  const { mutate: markMyNotificationAsRead } = useMarkMyNotificationAsRead();
  const { mutate: markAllMyNotificationsAsRead } = useMarkAllMyNotificationsAsRead();
  const { mutate: deleteAllMyReadNotifications } = useDeleteAllMyReadNotifications();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const target = loadMoreRef.current;

    if (!root || !target || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root,
        rootMargin: "120px 0px",
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="absolute top-full right-0 mt-2 w-[400px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-[#E5E8EB] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[1100]">
      <div className="p-4 flex items-center justify-between border-b border-[#E5E8EB]">
        <div className="flex items-center gap-2">
          <h4 className={HEADER_DROPDOWN_TITLE_CLASS}>Thông báo</h4>
          {unreadCount > 0 && (
            <span className="bg-[#ee1314] text-white text-[12px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1.5 text-[#637381] hover:text-[#212B36] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <MoreHorizontal size={20} />
          </button>

          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-[240px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[#E5E8EB] py-1.5 z-[1200]">
              <button
                className="w-full px-4 py-2 text-left text-[14px] text-[#212B36] hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                onClick={() => {
                  markAllMyNotificationsAsRead();
                  setIsMenuOpen(false);
                }}
              >
                <Check size={16} className="text-[#637381]" /> Đánh dấu tất cả đã đọc
              </button>
              <button
                className="w-full px-4 py-2 text-left text-[14px] text-[#212B36] hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                onClick={() => setIsMenuOpen(false)}
              >
                <Settings size={16} className="text-[#637381]" /> Cài đặt thông báo
              </button>
              <div className="h-px bg-[#E5E8EB] my-1.5"></div>
              <button
                className="w-full px-4 py-2 text-left text-[14px] text-[#ee1314] hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                onClick={() => {
                  deleteAllMyReadNotifications();
                  setIsMenuOpen(false);
                }}
              >
                <Trash2 size={16} /> Xóa thông báo đã đọc
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollContainerRef} className="max-h-[400px] overflow-y-auto p-2 flex flex-col gap-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex gap-3 p-3 rounded-xl bg-white border border-[#F4F6F8] animate-pulse"
            >
              <div className="w-2 flex justify-center pt-3.5 shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#F4F6F8]"></div>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#F4F6F8] shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 rounded bg-[#F4F6F8] mb-2 w-2/3"></div>
                <div className="h-3 rounded bg-[#F4F6F8] mb-2 w-full"></div>
                <div className="h-3 rounded bg-[#F4F6F8] w-1/3"></div>
              </div>
            </div>
          ))
        ) : notifications.length > 0 ? (
          <>
            {notifications.map((notification) => {
              const meta = getNotificationMeta(notification.type);
              const IconComp = meta.icon;

              return (
                <div
                  key={notification.notificationId}
                  onClick={async () => {
                    if (!notification.isRead) {
                      markMyNotificationAsRead(notification.notificationId);
                    }
                    const result = await resolveNotificationNavigation(notification);
                    if (result.kind === "navigate") {
                      navigate(result.path);
                      return;
                    }
                    if (result.kind === "unavailable") {
                      navigate("/profile/notifications", {
                        state: { unavailableMessage: result.message },
                      } as any);
                    }
                  }}
                  className={`relative flex gap-3 p-3 rounded-xl transition-colors hover:bg-slate-50 ${!notification.isRead ? "bg-[#FFF9F9]" : "bg-white opacity-[0.65]"
                    } cursor-pointer`}
                >
                  <div className="w-2 flex justify-center pt-3.5 shrink-0">
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-[#ee1314]"></div>
                    )}
                  </div>

                  <div className="shrink-0 mt-0.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${meta.iconClass}`}>
                      <IconComp size={20} strokeWidth={2} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={`${HEADER_DROPDOWN_ITEM_TITLE_CLASS} mb-0.5 line-clamp-1`}>
                      {notification.title}
                    </div>
                    <div className="text-[13px] text-[#505050] mb-1.5 leading-snug line-clamp-2">
                      {notification.content}
                    </div>
                    <div className={`text-[12px] font-medium ${!notification.isRead ? "text-[#ee1314]" : "text-[#637381]"}`}>
                      {formatRelativeTime(notification.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
            }

            <div ref={loadMoreRef} className="h-4 shrink-0" />

            {hasNextPage && !isFetchingNextPage && (
              <div className="text-center text-[12px] text-[#637381] py-2">
                Còn {remainingCount} thông báo nữa
              </div>
            )}

            {isFetchingNextPage && (
              <div className="text-center text-[12px] font-medium text-[#637381] py-2">
                Đang tải thêm...
              </div>
            )}
          </>
        ) : (
          <div className="py-10 text-center text-[13px] font-medium text-[#637381]">
            Chưa có thông báo nào.
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#E5E8EB] flex justify-center">
        <Link
          to="/profile/notifications"
          className={`flex items-center gap-1 py-1 font-bold text-[#ee1314] hover:underline transition-colors ${HEADER_DROPDOWN_ACTION_CLASS}`}
        >
          Xem tất cả thông báo <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
};
