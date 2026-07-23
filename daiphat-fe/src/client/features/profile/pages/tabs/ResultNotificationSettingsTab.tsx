import { Trophy } from "lucide-react";
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

    const resultSetting = settings.find(
        (setting) =>
            setting.type === NOTIFICATION_TYPE.RESULT &&
            setting.channel === NOTIFICATION_CHANNEL.IN_APP
    );
    const isEnabled = resultSetting?.isEnabled ?? true;
    const isUpdating = upsertMutation.isPending;

    const handleToggle = () => {
        if (isUpdating) return;
        upsertMutation.mutate({
            channel: NOTIFICATION_CHANNEL.IN_APP,
            type: NOTIFICATION_TYPE.RESULT,
            isEnabled: !isEnabled,
        });
    };

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h2 className="text-[20px] font-bold text-[#212B36]">Thông báo kết quả xổ số</h2>
                <p className="text-[14px] text-[#637381] mt-1">
                    Bật để nhận thông báo khi vé của bạn trúng thưởng. Tắt đi thì hệ thống sẽ không
                    gửi thông báo dù vé có trúng.
                </p>
            </div>

            <div className="bg-white border border-[#E5E8EB] rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
                {isLoading ? (
                    <div className="py-16 text-center text-[14px] text-[#637381]">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải cài đặt...
                    </div>
                ) : (
                    <div className="p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#FFF8E7] text-[#D97706] flex items-center justify-center shrink-0">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-bold text-[#212B36]">
                                Nhận thông báo khi trúng thưởng
                            </p>
                            <p className="text-[13px] text-[#637381] mt-1">
                                {isEnabled
                                    ? "Đang bật — bạn sẽ nhận thông báo in-app (và push nếu có) khi vé trúng."
                                    : "Đang tắt — hệ thống sẽ không gửi thông báo kết quả trúng thưởng."}
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            aria-label="Bật hoặc tắt thông báo kết quả xổ số"
                            disabled={isUpdating}
                            onClick={handleToggle}
                            className={[
                                "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                                isEnabled ? "bg-[#1CD162]" : "bg-[#DFE3E8]",
                                isUpdating ? "opacity-60 cursor-not-allowed" : "",
                            ].join(" ")}
                        >
                            <span
                                className={[
                                    "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
                                    isEnabled ? "translate-x-7" : "translate-x-1",
                                ].join(" ")}
                            />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
