"use client";

import { Trophy, BellRing } from "lucide-react";
import {
    NOTIFICATION_CHANNEL,
    NOTIFICATION_TYPE,
} from "../../../../../types/notifications.type";
import {
    useMyNotificationSettings,
    useUpsertMyNotificationSetting,
} from "../../../../hooks/useNotificationSettings";

export const ResultNotificationSettingsTab = () => {
    const { data: settings = [], isLoading } = useMyNotificationSettings();
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

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h2 className="client-heading m-0 mb-1">Thông báo kết quả xổ số</h2>
                <p className="text-[14px] text-[#637381] mt-1">
                    Tùy chỉnh các loại thông báo liên quan đến kết quả mở thưởng và vé trúng thưởng của bạn.
                </p>
            </div>

            <div className="flex flex-col gap-4">
                {isLoading ? (
                    <div className="bg-white border border-[#E5E8EB] rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] p-16 text-center text-[14px] text-[#637381]">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải cài đặt...
                    </div>
                ) : (
                    <>
                        {/* Item 1: Win Notification */}
                        <div className="bg-white border border-[#E5E8EB] rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#FFF8E7] text-[#D97706] flex items-center justify-center shrink-0">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-bold text-[#212B36]">
                                    Nhận thông báo khi trúng thưởng
                                </p>
                                <p className="text-[13px] text-[#637381] mt-1">
                                    {isWinEnabled
                                        ? "Đang bật — bạn sẽ nhận thông báo in-app (và push nếu có) khi vé trúng."
                                        : "Đang tắt — hệ thống sẽ không gửi thông báo kết quả trúng thưởng."}
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isWinEnabled}
                                aria-label="Bật hoặc tắt thông báo vé trúng thưởng"
                                disabled={isUpdating}
                                onClick={handleToggleWin}
                                className={[
                                    "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                                    isWinEnabled ? "bg-[#1CD162]" : "bg-[#DFE3E8]",
                                    isUpdating ? "opacity-60 cursor-not-allowed" : "",
                                ].join(" ")}
                            >
                                <span
                                    className={[
                                        "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
                                        isWinEnabled ? "translate-x-7" : "translate-x-1",
                                    ].join(" ")}
                                />
                            </button>
                        </div>

                        {/* Item 2: Draw Result Notification */}
                        <div className="bg-white border border-[#E5E8EB] rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                                <BellRing className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-bold text-[#212B36]">
                                    Nhận thông báo khi có kết quả xổ số
                                </p>
                                <p className="text-[13px] text-[#637381] mt-1">
                                    {isDrawEnabled
                                        ? "Đang bật — bạn sẽ nhận thông báo ngay khi các đài quay công bố kết quả mở thưởng."
                                        : "Đang tắt — hệ thống sẽ không gửi thông báo khi có kết quả xổ số mới."}
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isDrawEnabled}
                                aria-label="Bật hoặc tắt thông báo khi có kết quả xổ số"
                                disabled={isUpdating}
                                onClick={handleToggleDraw}
                                className={[
                                    "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                                    isDrawEnabled ? "bg-[#1CD162]" : "bg-[#DFE3E8]",
                                    isUpdating ? "opacity-60 cursor-not-allowed" : "",
                                ].join(" ")}
                            >
                                <span
                                    className={[
                                        "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
                                        isDrawEnabled ? "translate-x-7" : "translate-x-1",
                                    ].join(" ")}
                                />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
