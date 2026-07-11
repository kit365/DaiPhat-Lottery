import React from 'react';

interface CancelRefundConfirmDialogProps {
    isOpen: boolean;
    isPending?: boolean;
    orderCode?: string | null;
    onKeep: () => void;
    onConfirmCancel: () => void;
}

export const CancelRefundConfirmDialog: React.FC<CancelRefundConfirmDialogProps> = ({
    isOpen,
    isPending = false,
    orderCode,
    onKeep,
    onConfirmCancel,
}) => {
    if (!isOpen) return null;

    const orderLabel = orderCode?.trim()
        ? `đơn hàng #${orderCode.trim()}`
        : 'đơn hàng liên quan';

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                    if (!isPending) onKeep();
                }}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-refund-dialog-title"
                className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="p-6 sm:p-7 flex flex-col gap-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFF4F4] border border-[#ee1314]/15 text-[#ee1314] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-triangle-exclamation text-[20px]" aria-hidden />
                        </div>
                        <div className="min-w-0 pt-0.5">
                            <h2
                                id="cancel-refund-dialog-title"
                                className="text-[18px] font-bold text-[#212B36] leading-snug"
                            >
                                Hủy yêu cầu hoàn tiền?
                            </h2>
                            <p className="text-[14px] text-[#637381] mt-2 leading-relaxed">
                                Bạn sắp hủy yêu cầu hoàn tiền cho {orderLabel}. Hành động này{' '}
                                <span className="font-semibold text-[#212B36]">không thể hoàn tác</span>. Sau khi
                                hủy, yêu cầu hoàn tiền sẽ bị đóng vĩnh viễn và không thể tiếp tục xử lý.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl bg-[#FFF9F3] border border-[#FFB020]/30 px-4 py-3">
                        <p className="text-[13px] text-[#637381] leading-relaxed">
                            <span className="font-semibold text-[#B76E00]">Lưu ý:</span> Nếu vẫn muốn hoàn tiền cho{' '}
                            {orderLabel}, bạn cần tạo yêu cầu mới (nếu còn trong thời gian cho phép).
                        </p>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onKeep}
                            disabled={isPending}
                            className="flex-1 py-3 px-4 rounded-xl border border-[#E5E8EB] bg-white text-[#454F5B] font-bold text-[14px] hover:bg-[#F4F6F8] hover:border-[#C4CDD5] active:bg-[#EDEFF2] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Giữ yêu cầu hoàn tiền
                        </button>
                        <button
                            type="button"
                            onClick={onConfirmCancel}
                            disabled={isPending}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] active:bg-[#b00d0f] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_6px_16px_rgba(238,19,20,0.22)]"
                        >
                            {isPending ? (
                                <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                            ) : (
                                <i className="fa-solid fa-ban text-[13px]" aria-hidden />
                            )}
                            Hủy yêu cầu hoàn tiền
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
