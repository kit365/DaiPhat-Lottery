"use client";

import React, { useEffect, useState } from 'react';
import { useSubmitPaymentTimeoutComplaint } from '../../hooks/useOrder';
import { AppToast } from '../../../utils/toast.util';

const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;

interface PaymentTimeoutComplaintModalProps {
    isOpen: boolean;
    orderId: string;
    orderCode?: string;
    amount?: number;
    onClose: () => void;
    onSubmitted?: () => void;
}

const formatCurrency = (value?: number) =>
    typeof value === 'number' ? `${value.toLocaleString('vi-VN')}đ` : '—';

/**
 * Dedicated customer form for an automatic payment-timeout cancellation.
 * This is intentionally separate from the generic support-ticket modal: the
 * backend action only accepts one payment proof image and has a different
 * order-status transition.
 */
export const PaymentTimeoutComplaintModal = ({
    isOpen,
    orderId,
    orderCode,
    amount,
    onClose,
    onSubmitted,
}: PaymentTimeoutComplaintModalProps) => {
    const mutation = useSubmitPaymentTimeoutComplaint();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setPreviewUrl(null);
        }
    }, [isOpen]);

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    if (!isOpen) return null;

    const resetAndClose = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(null);
        setPreviewUrl(null);
        onClose();
    };

    const handleClose = () => {
        if (mutation.isPending) return;
        resetAndClose();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0];
        if (!nextFile) return;

        if (!nextFile.type.startsWith('image/')) {
            AppToast.error('Vui lòng chọn ảnh biên lai thanh toán (JPG, PNG hoặc WEBP).');
            event.target.value = '';
            return;
        }
        if (nextFile.size > MAX_EVIDENCE_SIZE) {
            AppToast.error('Ảnh biên lai không được vượt quá 10MB.');
            event.target.value = '';
            return;
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(nextFile);
        setPreviewUrl(URL.createObjectURL(nextFile));
    };

    const handleSubmit = () => {
        if (!file || mutation.isPending) return;

        mutation.mutate(
            { id: orderId, file },
            {
                onSuccess: (response) => {
                    if (response.success === false || response.isSuccess === false) {
                        AppToast.error(response.message || 'Không thể gửi chứng từ thanh toán.');
                        return;
                    }
                    AppToast.success('Đã gửi chứng từ. Cửa hàng sẽ kiểm tra và phản hồi.');
                    onSubmitted?.();
                    resetAndClose();
                },
                onError: (error: any) => {
                    AppToast.error(
                        error?.response?.data?.message ||
                            'Không thể gửi chứng từ thanh toán. Vui lòng thử lại.',
                    );
                },
            },
        );
    };

    return (
        <div
            className="fixed inset-0 z-[10001] flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-10 sm:pt-16"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) handleClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-timeout-complaint-title"
                className="relative w-full max-w-xl overflow-hidden rounded-[20px] bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-[#E5E8EB] px-6 py-5">
                    <div>
                        <h2 id="payment-timeout-complaint-title" className="text-[18px] font-bold text-[#212B36]">
                            Gửi khiếu nại thanh toán
                        </h2>
                        <p className="mt-1 text-[13px] text-[#637381]">
                            Gửi chứng từ để cửa hàng kiểm tra giao dịch đã thanh toán.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={mutation.isPending}
                        aria-label="Đóng biểu mẫu"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#637381] hover:bg-[#F4F6F8] disabled:opacity-50"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="space-y-5 px-6 py-6">
                    <div className="rounded-xl border border-[#B8E8D0] bg-[#F1FFF7] p-4 text-[13px] leading-relaxed text-[#118D57]">
                        Đơn {orderCode ? <strong>#{orderCode}</strong> : 'hàng của bạn'} đã bị hệ thống hủy do quá thời gian thanh toán.
                        {typeof amount === 'number' && (
                            <span className="ml-1">Giá trị đơn: <strong>{formatCurrency(amount)}</strong>.</span>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-[13px] font-bold text-[#454F5B]">
                            Ảnh biên lai thanh toán <span className="text-[#ee1314]">*</span>
                        </label>
                        <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#B8C2CC] bg-[#FAFBFC] px-5 py-6 text-center transition-colors hover:border-[#ee1314] hover:bg-[#FFF8F8]">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Xem trước biên lai thanh toán" className="max-h-36 max-w-full rounded-lg object-contain" />
                            ) : (
                                <>
                                    <i className="fa-solid fa-cloud-arrow-up mb-3 text-2xl text-[#ee1314]" />
                                    <span className="text-[14px] font-semibold text-[#454F5B]">Chọn ảnh biên lai</span>
                                    <span className="mt-1 text-[12px] text-[#919EAB]">JPG, PNG hoặc WEBP · tối đa 10MB</span>
                                </>
                            )}
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                        </label>
                        {file && (
                            <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-[#637381]">
                                <span className="min-w-0 truncate">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                                        setFile(null);
                                        setPreviewUrl(null);
                                    }}
                                    disabled={mutation.isPending}
                                    className="shrink-0 font-semibold text-[#ee1314] hover:underline disabled:opacity-50"
                                >
                                    Bỏ ảnh
                                </button>
                            </div>
                        )}
                    </div>

                    <p className="text-[12px] leading-relaxed text-[#637381]">
                        Vui lòng gửi đúng biên lai của đơn này. Sau khi gửi, chứng từ sẽ được chuyển sang trạng thái chờ cửa hàng xác minh.
                    </p>
                </div>

                <div className="flex justify-end gap-3 border-t border-[#E5E8EB] px-6 py-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={mutation.isPending}
                        className="rounded-xl border border-[#E5E8EB] px-5 py-2.5 text-[13px] font-bold text-[#454F5B] hover:bg-[#F9FAFB] disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!file || mutation.isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#ee1314] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#c80f11] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {mutation.isPending && <i className="fa-solid fa-spinner fa-spin" />}
                        Gửi khiếu nại
                    </button>
                </div>
            </div>
        </div>
    );
};
