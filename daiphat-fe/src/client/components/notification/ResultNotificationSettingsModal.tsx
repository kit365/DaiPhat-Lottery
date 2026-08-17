"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Trophy, BellRing, X } from "lucide-react";
import {
    NOTIFICATION_CHANNEL,
    NOTIFICATION_TYPE,
} from "../../../types/notifications.type";
import {
    useMyNotificationSettings,
    useUpsertMyNotificationSetting,
} from "../../hooks/useNotificationSettings";

interface ResultNotificationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ResultNotificationSettingsModal = ({
    isOpen,
    onClose,
}: ResultNotificationSettingsModalProps) => {
    const { data: settings = [], isLoading } = useMyNotificationSettings(isOpen);
    const upsertMutation = useUpsertMyNotificationSetting();

    const winSetting = settings.find(
        (setting) =>
            setting.type === NOTIFICATION_TYPE.RESULT &&
            setting.channel === NOTIFICATION_CHANNEL.IN_APP
    );
    const drawSetting = settings.find(
        (setting) =>
            setting.type === NOTIFICATION_TYPE.DRAW_RESULT &&
            setting.channel === NOTIFICATION_CHANNEL.IN_APP
    );

    const isWinEnabled = winSetting?.isEnabled ?? true;
    const isDrawEnabled = drawSetting?.isEnabled ?? true;
    const isUpdating = upsertMutation.isPending;

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const handleToggleWin = () => {
        if (isUpdating) return;
        upsertMutation.mutate({
            channel: NOTIFICATION_CHANNEL.IN_APP,
            type: NOTIFICATION_TYPE.RESULT,
            isEnabled: !isWinEnabled,
        });
    };

    const handleToggleDraw = () => {
        if (isUpdating) return;
        upsertMutation.mutate({
            channel: NOTIFICATION_CHANNEL.IN_APP,
            type: NOTIFICATION_TYPE.DRAW_RESULT,
            isEnabled: !isDrawEnabled,
        });
    };

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Đóng"
                className="absolute inset-0 bg-black/45 cursor-pointer"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="notification-settings-title"
                className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(33,43,54,0.18)] border border-[#E5E8EB] overflow-hidden"
            >
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E5E8EB]">
                    <div>
                        <h3 id="notification-settings-title" className="text-[17px] font-bold text-[#212B36]">
                            Cài đặt thông báo
                        </h3>
                        <p className="text-[13px] text-[#637381] mt-1">
                            Chọn loại thông báo bạn muốn nhận.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[#637381] hover:bg-[#F4F6F8] hover:text-[#212B36] transition-colors cursor-pointer shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-3">
                    {isLoading ? (
                        <div className="py-10 text-center text-[14px] text-[#637381]">
                            <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                            Đang tải cài đặt...
                        </div>
                    ) : (
                        <>
                            <label className="flex items-start gap-3 p-4 rounded-xl border border-[#E5E8EB] hover:border-[#ee1314]/30 transition-colors cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isWinEnabled}
                                    disabled={isUpdating}
                                    onChange={handleToggleWin}
                                    className="mt-1 w-4 h-4 accent-[#ee1314] cursor-pointer disabled:cursor-not-allowed"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-8 h-8 rounded-lg bg-[#FFF8E7] text-[#D97706] flex items-center justify-center shrink-0">
                                            <Trophy size={16} />
                                        </span>
                                        <p className="text-[14px] font-bold text-[#212B36]">
                                            Nhận thông báo khi trúng thưởng
                                        </p>
                                    </div>
                                    <p className="text-[13px] text-[#637381] leading-relaxed">
                                        Thông báo in-app khi vé của bạn trúng giải.
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-4 rounded-xl border border-[#E5E8EB] hover:border-[#ee1314]/30 transition-colors cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isDrawEnabled}
                                    disabled={isUpdating}
                                    onChange={handleToggleDraw}
                                    className="mt-1 w-4 h-4 accent-[#ee1314] cursor-pointer disabled:cursor-not-allowed"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                                            <BellRing size={16} />
                                        </span>
                                        <p className="text-[14px] font-bold text-[#212B36]">
                                            Nhận thông báo khi có kết quả xổ số
                                        </p>
                                    </div>
                                    <p className="text-[13px] text-[#637381] leading-relaxed">
                                        Thông báo khi các đài công bố kết quả mở thưởng.
                                    </p>
                                </div>
                            </label>
                        </>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-[#E5E8EB] bg-[#FAFBFC] flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-[#ee1314] text-white text-[14px] font-bold hover:bg-[#c80f11] transition-colors cursor-pointer"
                    >
                        Xong
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
