"use client";

import React, { useEffect, useState } from 'react';
import { OrderStatus } from '../../../types/order.type';
import { useSubmitPaymentTimeoutComplaint } from '../../hooks/useOrder';
import { AppToast } from '../../../utils/toast.util';

const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;

interface PaymentTimeoutComplaintCardProps {
    orderId: string;
    status: OrderStatus;
    cancelType?: string | null;
    evidenceUrl?: string | null;
    submittedAt?: string | null;
    resolvedAt?: string | null;
    resolutionReason?: string | null;
    onSubmitted?: () => void;
}

/**
 * Customer-facing proof upload for an automatic payment-timeout cancellation.
 * It intentionally stays separate from the generic support-ticket action: this
 * upload is the only path that can move a timeout cancellation back to PAID.
 */
export const PaymentTimeoutComplaintCard = ({
    orderId,
    status,
    cancelType,
    evidenceUrl,
    submittedAt,
    resolvedAt,
    resolutionReason,
    onSubmitted,
}: PaymentTimeoutComplaintCardProps) => {
    const mutation = useSubmitPaymentTimeoutComplaint();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    if (
        cancelType !== 'SYSTEM_PAYMENT_TIMEOUT' ||
        ![OrderStatus.CANCELLED, OrderStatus.PAYMENT_COMPLAINT_PENDING].includes(status)
    ) {
        return null;
    }

    const isPending = status === OrderStatus.PAYMENT_COMPLAINT_PENDING;
    const isRejected = status === OrderStatus.CANCELLED && Boolean(resolutionReason);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0];
        if (!nextFile) return;
        if (!nextFile.type.startsWith('image/')) {
            AppToast.error('Vui lòng chọn ảnh biên lai thanh toán.');
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
                    setFile(null);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    onSubmitted?.();
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
        <section className="rounded-[20px] border border-[#E5E8EB] bg-white p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E5] text-[#B76E00]">
                    <i className="fa-solid fa-receipt" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] font-bold text-[#212B36]">Chứng từ thanh toán</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#637381]">
                        Đơn đã bị hệ thống hủy do quá thời gian thanh toán. Nếu bạn đã thanh toán,
                        hãy gửi ảnh biên lai để cửa hàng kiểm tra.
                    </p>
                </div>
            </div>

            {isPending ? (
                <div className="mt-5 rounded-xl border border-[#B8E8D0] bg-[#F1FFF7] p-4 text-[13px] text-[#118D57]">
                    <div className="flex items-center gap-2 font-semibold">
                        <i className="fa-solid fa-clock" /> Đang chờ cửa hàng xác minh
                    </div>
                    {submittedAt && (
                        <p className="mt-1 text-[#637381]">
                            Đã gửi lúc {new Date(submittedAt).toLocaleString('vi-VN')}
                        </p>
                    )}
                    {evidenceUrl && (
                        <a
                            href={evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-2 font-semibold text-[#118D57] underline"
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square" /> Xem chứng từ đã gửi
                        </a>
                    )}
                </div>
            ) : (
                <>
                    {isRejected && (
                        <div className="mt-5 rounded-xl border border-[#FFCDD2] bg-[#FFF4F4] p-4 text-[13px] text-[#B71D18]">
                            <p className="font-semibold">Chứng từ trước đó chưa được chấp nhận</p>
                            <p className="mt-1">Lý do: {resolutionReason}</p>
                            {resolvedAt && (
                                <p className="mt-1 text-[#637381]">
                                    Đã xử lý lúc {new Date(resolvedAt).toLocaleString('vi-VN')}
                                </p>
                            )}
                        </div>
                    )}

                    {evidenceUrl && !isRejected && (
                        <a
                            href={evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-[#ee1314] underline"
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square" /> Xem chứng từ đã gửi
                        </a>
                    )}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E5E8EB] bg-white px-4 text-[13px] font-bold text-[#454F5B] transition-colors hover:bg-[#F9FAFB]">
                            <i className="fa-solid fa-upload" />
                            {file ? 'Đổi ảnh biên lai' : isRejected ? 'Gửi lại chứng từ' : 'Chọn ảnh biên lai'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                        <button
                            type="button"
                            disabled={!file || mutation.isPending}
                            onClick={handleSubmit}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#ee1314] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#c80f11] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {mutation.isPending && <i className="fa-solid fa-spinner fa-spin" />}
                            Gửi chứng từ
                        </button>
                    </div>
                    {previewUrl && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-3">
                            <img src={previewUrl} alt="Xem trước biên lai" className="h-20 w-20 rounded-lg object-cover" />
                            <div className="min-w-0 text-[13px] text-[#637381]">
                                <p className="truncate font-semibold text-[#212B36]">{file?.name}</p>
                                <p className="mt-1">Kiểm tra ảnh trước khi gửi.</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};
