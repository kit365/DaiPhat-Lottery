"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../constants/queryKeys';
import { PurchasedTicket } from '../../../types/lottery-ticket.type';
import { formatPrizePayoutCurrency, buildStationOfficeRedemptionMessage, PrizePayoutPreviewResponse } from '../../../types/prize-payout.type';
import { useGetBankAccounts } from '../../hooks/useBankAccount';
import { useCreatePrizePayout } from '../../hooks/usePrizePayout';
import { UserBankAccountResponse } from '../../../types/refund.type';
import { BankAccountFormModal } from '../refund/BankAccountFormModal';
import { prizePayoutService } from '../../services/prizePayoutService';
import dayjs from 'dayjs';
import { LuckyNumber } from '../ui/LuckyNumber';
import { AppToast as toast } from '../../../utils/toast.util';
import { axiosRequestErrorMessage } from '../../../api/requestError';

interface PrizePayoutRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: PurchasedTicket;
}

const CCCD_MAX_MB = 10;

/**
 * Nén và thu nhỏ ảnh CCCD trước khi tải lên (giữ nguyên độ nét cho OCR, giảm kích thước từ nhiều MB xuống vài trăm KB)
 * giúp tránh lỗi timeout mạng khi tải ảnh dung lượng lớn từ điện thoại.
 */
const compressCccdImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        return file;
    }
    // Nếu tệp nhỏ hơn 500KB và là JPEG thì không cần nén thêm
    if (file.size <= 500 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/jpg')) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const maxDim = 2048;
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob && blob.size < file.size) {
                            const newFileName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
                            resolve(
                                new File([blob], newFileName, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                })
                            );
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    0.88
                );
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

const CCCD_FIELD_LABELS: Record<string, string> = {
    personal_identification_number: 'Số CCCD',
    full_name: 'Họ và tên',
    date_of_birth: 'Ngày sinh',
    gender: 'Giới tính',
    nationality: 'Quốc tịch',
    place_of_birth_registration: 'Nơi sinh / Quê quán',
    place_of_residence: 'Nơi thường trú',
    issue_date: 'Ngày cấp',
    expiry_date: 'Ngày hết hạn',
};

type CccdSide = 'front' | 'back';

const CCCD_SIDE_LABELS: Record<CccdSide, string> = {
    front: 'Mặt trước',
    back: 'Mặt sau',
};

/** Fallback when the backend does not report sides (CCCD 2016/2021 layout). */
const CCCD_FIELD_DEFAULT_SIDE: Record<string, CccdSide> = {
    issue_date: 'back',
};

interface OcrMissingField {
    label: string;
    side: CccdSide | null;
}

interface OcrErrorInfo {
    message?: string;
    missingFields: OcrMissingField[];
}

const parseOcrMissingFields = (dataObj: any, errorMsg: unknown): OcrMissingField[] => {
    const keys: string[] = Array.isArray(dataObj?.missingFields) ? dataObj.missingFields : [];
    const labels: string[] = Array.isArray(dataObj?.missingFieldLabels) ? dataObj.missingFieldLabels : [];
    const sides: Record<string, string> =
        dataObj?.missingFieldSides && typeof dataObj.missingFieldSides === 'object' ? dataObj.missingFieldSides : {};

    if (keys.length > 0) {
        return keys.map((key, idx) => {
            const side = sides[key] ?? CCCD_FIELD_DEFAULT_SIDE[key] ?? 'front';
            return {
                label: String(labels[idx] ?? CCCD_FIELD_LABELS[key] ?? key).trim(),
                side: side === 'back' ? 'back' : 'front',
            };
        });
    }
    if (labels.length > 0) {
        return labels.map((s) => String(s).trim()).filter(Boolean).map((label) => ({ label, side: null }));
    }
    if (typeof errorMsg === 'string') {
        const match = errorMsg.match(/Thiếu\/(?:không rõ|không hợp lệ):\s*([^.\)]+)/i);
        if (match && match[1]) {
            return match[1]
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((trim) => ({ label: CCCD_FIELD_LABELS[trim] || trim, side: CCCD_FIELD_DEFAULT_SIDE[trim] ?? null }));
        }
    }
    return [];
};

export const PrizePayoutRequestModal: React.FC<PrizePayoutRequestModalProps> = ({
    isOpen,
    onClose,
    ticket,
}) => {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [bankAccountId, setBankAccountId] = useState<number | ''>('');
    const [showBankForm, setShowBankForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState<UserBankAccountResponse | null>(null);
    const [preview, setPreview] = useState<PrizePayoutPreviewResponse | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [frontImageUrl, setFrontImageUrl] = useState('');
    const [backImageUrl, setBackImageUrl] = useState('');
    const [frontPreview, setFrontPreview] = useState('');
    const [backPreview, setBackPreview] = useState('');
    const [uploadingFront, setUploadingFront] = useState(false);
    const [uploadingBack, setUploadingBack] = useState(false);
    const [ocrErrorInfo, setOcrErrorInfo] = useState<OcrErrorInfo | null>(null);
    const frontInputRef = useRef<HTMLInputElement>(null);
    const backInputRef = useRef<HTMLInputElement>(null);
    const { data: bankAccountsData, isLoading: isLoadingBanks } = useGetBankAccounts(isOpen);
    const createMutation = useCreatePrizePayout();
    const queryClient = useQueryClient();

    const bankAccounts = bankAccountsData?.data || [];

    const handleAddBank = () => {
        setEditingAccount(null);
        setShowBankForm(true);
    };

    const handleEditBank = (account: UserBankAccountResponse) => {
        setEditingAccount(account);
        setShowBankForm(true);
    };

    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setBankAccountId('');
        setEditingAccount(null);
        setShowBankForm(false);
        setPreview(null);
        setPreviewError(null);
        setFrontImageUrl('');
        setBackImageUrl('');
        setFrontPreview('');
        setBackPreview('');
        setOcrErrorInfo(null);
        setPreviewLoading(true);
        prizePayoutService
            .preview({ orderDetailId: ticket.orderDetailId, serialId: ticket.serialId })
            .then((res) => {
                if (res.success && res.data) {
                    setPreview(res.data);
                    setPreviewError(null);
                } else {
                    setPreview(null);
                    setPreviewError(res.message || 'Không tải được thông tin trả thưởng cho vé này.');
                }
            })
            .catch((error: any) => {
                setPreview(null);
                setPreviewError(
                    error?.response?.data?.message ||
                        error?.message ||
                        'Không tải được thông tin trả thưởng cho vé này.'
                );
            })
            .finally(() => setPreviewLoading(false));
    }, [isOpen, ticket.orderDetailId, ticket.serialId]);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (bankAccountId === '' && bankAccounts.length === 1) {
            setBankAccountId(bankAccounts[0].id);
        }
    }, [bankAccounts, bankAccountId]);

    if (!isOpen || typeof document === 'undefined') return null;

    const retakeSides = new Set<CccdSide>(
        (ocrErrorInfo?.missingFields ?? []).flatMap((f) => (f.side ? [f.side] : [])),
    );

    /** Retaking one side keeps the fields still reported for the other side. */
    const clearOcrErrorForSide = (side: CccdSide) => {
        setOcrErrorInfo((prev) => {
            if (!prev) return null;
            const remaining = prev.missingFields.filter((f) => f.side && f.side !== side);
            return remaining.length > 0 ? { ...prev, missingFields: remaining } : null;
        });
    };

    const handleUpload = async (file: File, side: CccdSide) => {
        const maxBytes = CCCD_MAX_MB * 1024 * 1024;
        if (!file.type.startsWith('image/')) {
            toast.error('Chỉ chấp nhận file ảnh CCCD');
            return;
        }
        if (file.size > maxBytes) {
            toast.error(`Ảnh vượt quá ${CCCD_MAX_MB}MB. Vui lòng chọn ảnh nhỏ hơn.`);
            return;
        }

        clearOcrErrorForSide(side);
        const localPreview = URL.createObjectURL(file);
        if (side === 'front') {
            setFrontPreview(localPreview);
            setUploadingFront(true);
        } else {
            setBackPreview(localPreview);
            setUploadingBack(true);
        }

        try {
            const preparedFile = await compressCccdImage(file);
            const url = await prizePayoutService.uploadRecipientIdImage(preparedFile);
            if (side === 'front') {
                setFrontImageUrl(url);
            } else {
                setBackImageUrl(url);
            }
        } catch (error: any) {
            toast.error(
                axiosRequestErrorMessage(
                    error,
                    'Tải ảnh CCCD thất bại. Vui lòng thử lại.',
                    'Thời gian tải ảnh lên quá lâu. Vui lòng thử lại với ảnh nhỏ hơn hoặc kiểm tra kết nối mạng.'
                )
            );
            if (side === 'front') {
                setFrontPreview('');
                setFrontImageUrl('');
            } else {
                setBackPreview('');
                setBackImageUrl('');
            }
        } finally {
            if (side === 'front') setUploadingFront(false);
            else setUploadingBack(false);
        }
    };

    const canContinueIdentity =
        !!frontImageUrl &&
        !!backImageUrl &&
        !uploadingFront &&
        !uploadingBack;

    const handleSubmit = () => {
        if (bankAccountId === '' || !canContinueIdentity) return;
        if (!ticket.orderDetailId && !ticket.serialId) {
            toast.error('Thiếu mã vé để tạo yêu cầu trả thưởng. Vui lòng đóng và mở lại từ danh sách vé.');
            return;
        }
        if (!frontImageUrl || !backImageUrl) {
            toast.error('Cần tải ảnh CCCD mặt trước và mặt sau.');
            return;
        }
        setOcrErrorInfo(null);
        createMutation.mutate(
            {
                orderDetailId: ticket.orderDetailId,
                serialId: ticket.serialId,
                bankAccountId: Number(bankAccountId),
                recipientIdImageUrl: frontImageUrl,
                recipientIdImageBackUrl: backImageUrl,
            },
            {
                onSuccess: (response) => {
                    if (response.success && response.data?.id) {
                        onClose();
                        router.push(`/profile/prize-payouts/${response.data.id}`);
                        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                    }
                },
                onError: (error: any) => {
                    if (error?.response?.status === 404) {
                        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_TICKETS] });
                        onClose();
                        return;
                    }
                    const errorData = error?.response?.data;
                    const errorMsg = errorData?.message || error?.message || 'Có lỗi xảy ra khi xử lý yêu cầu.';
                    const dataObj = errorData?.data;
                    const fields = parseOcrMissingFields(dataObj, errorMsg);

                    const isOcrError =
                        fields.length > 0 ||
                        (typeof errorMsg === 'string' &&
                            (errorMsg.toLowerCase().includes('cccd') ||
                             errorMsg.toLowerCase().includes('ảnh') ||
                             errorMsg.toLowerCase().includes('ocr')));

                    if (isOcrError) {
                        setOcrErrorInfo({
                            message: errorMsg,
                            missingFields: fields.length > 0
                                ? fields
                                : [{ label: 'Số CCCD và thông tin nhân thân', side: null }],
                        });
                    }
                },
            }
        );
    };

    const gross = preview?.grossAmount ?? ticket.prizeAmount;
    const tax = preview?.taxAmount;
    const commission = preview?.commissionAmount;
    const net = preview?.netAmount;

    const stationOfficeOnly = preview?.requiresStationOfficeRedemption === true
        || ticket.matchedPrizeCode?.toUpperCase() === 'DB'
        || ticket.requiresStationOfficeRedemption === true;
    // Require a successful preview — previously null preview still allowed Continue, then create 404'd.
    const canContinueOnline =
        !previewLoading &&
        !previewError &&
        preview != null &&
        !stationOfficeOnly &&
        preview.canClaimOnline === true;

    const renderCccdUpload = (
        side: CccdSide,
        label: string,
        previewUrl: string,
        uploadedUrl: string,
        uploading: boolean,
        inputRef: React.RefObject<HTMLInputElement | null>,
        onClear: () => void,
    ) => (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#212B36]">{label} *</span>
                {retakeSides.has(side) && (
                    <span className="text-[11px] font-bold text-red-600">
                        <i className="fa-solid fa-camera-rotate mr-1" />
                        Cần chụp lại
                    </span>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void handleUpload(file, side);
                }}
            />
            {previewUrl || uploadedUrl ? (
                <div
                    className={`relative rounded-xl border overflow-hidden bg-[#F9FAFB] ${
                        retakeSides.has(side) ? 'border-red-400 ring-2 ring-red-200' : 'border-[#E5E8EB]'
                    }`}
                >
                    <img
                        src={previewUrl || uploadedUrl}
                        alt={label}
                        className="w-full h-36 object-cover"
                    />
                    {uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[13px] font-bold">
                            Đang tải…
                        </div>
                    )}
                    {!uploading && (
                        <div className="absolute top-2 right-2 flex gap-1">
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="px-2 py-1 rounded-lg bg-white/95 text-[12px] font-bold cursor-pointer border-none"
                            >
                                Đổi ảnh
                            </button>
                            <button
                                type="button"
                                onClick={onClear}
                                className="px-2 py-1 rounded-lg bg-white/95 text-[12px] font-bold text-[#ee1314] cursor-pointer border-none"
                            >
                                Xóa
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="h-36 rounded-xl border border-dashed border-[#DFE3E8] bg-[#F9FAFB] text-[#637381] text-[13px] font-medium cursor-pointer disabled:opacity-50"
                >
                    Chọn ảnh {label.toLowerCase()}
                </button>
            )}
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-[#E5E8EB]">
                    <h3 className="text-[18px] font-bold text-[#212B36]">Yêu cầu trả thưởng</h3>
                    <button type="button" onClick={onClose} className="text-[#919EAB] hover:text-[#212B36] cursor-pointer">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div className="px-5 pt-4 pb-2">
                    <div className="flex gap-2 mb-2">
                        {[1, 2].map((s) => (
                            <div
                                key={s}
                                className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s ? 'bg-[#ee1314]' : 'bg-[#E5E8EB]'}`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between text-[12px] font-medium text-[#637381]">
                        <span className={step === 1 ? 'font-bold text-[#ee1314]' : ''}>1. Xác nhận vé trúng</span>
                        <span className={step === 2 ? 'font-bold text-[#ee1314]' : ''}>2. Thông tin nhận thưởng</span>
                    </div>
                </div>

                {step === 1 ? (
                    <div className="p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[14px] font-bold text-[#212B36]">Thông tin vé trúng thưởng</span>
                            <span className="text-[12px] bg-red-50 text-[#ee1314] font-semibold px-2.5 py-0.5 rounded-full border border-red-100 flex items-center gap-1">
                                <i className="fa-solid fa-circle-check text-[11px]" />
                                Trúng thưởng
                            </span>
                        </div>

                        {/* Card: Ticket Information & Breakdown */}
                        <div className="rounded-2xl border border-[#E5E8EB] bg-white overflow-hidden shadow-xs">
                            {/* Station & Draw Date Header */}
                            <div className="bg-[#F9FAFB] px-4 py-3 border-b border-[#E5E8EB] flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-8 h-8 rounded-lg bg-red-100 text-[#ee1314] flex items-center justify-center text-[13px] shrink-0">
                                        <i className="fa-solid fa-ticket" />
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#919EAB] uppercase font-bold tracking-wider leading-none">
                                            Nhà đài
                                        </span>
                                        <span className="text-[14px] font-bold text-[#212B36] mt-0.5">
                                            {ticket.stationName || '—'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#E5E8EB] text-[#637381] text-[12px] font-medium shadow-2xs">
                                    <i className="fa-regular fa-calendar-days text-[#919EAB]" />
                                    <span>{ticket.drawDate ? dayjs(ticket.drawDate).format('DD/MM/YYYY') : '—'}</span>
                                </div>
                            </div>

                            {/* Winning Number & Prize Hero Banner */}
                            <div className="p-4 flex flex-col items-center justify-center bg-gradient-to-b from-[#FFFDFD] to-[#FFF8F8] border-b border-[#F0F2F5]">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#919EAB] mb-1">
                                    Dãy số trúng thưởng
                                </span>
                                <div className="text-[26px] font-black tracking-widest text-[#ee1314] font-mono py-1">
                                    <LuckyNumber value={ticket.numbers} ticket className="font-mono" />
                                </div>
                                <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-amber-900 text-[12px] font-bold shadow-2xs">
                                    <i className="fa-solid fa-award text-amber-500 text-[13px]" />
                                    <span>{ticket.matchedPrizeDisplayName || ticket.matchedPrizeCode}</span>
                                </div>
                            </div>

                            {/* Prize Breakdown details */}
                            <div className="p-4 flex flex-col gap-2.5 text-[13px]">
                                <div className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider pb-1 border-b border-[#F0F2F5]">
                                    Chi tiết giải & khấu trừ
                                </div>
                                <div className="flex justify-between items-center py-0.5">
                                    <span className="text-[#637381]">Giá trị giải thưởng (Gross)</span>
                                    <span className="font-semibold text-[#212B36]">{formatPrizePayoutCurrency(gross)}</span>
                                </div>
                                <div className="flex justify-between items-center py-0.5">
                                    <div className="flex items-center gap-1 text-[#637381]">
                                        <span>Thuế TNCN</span>
                                        <span className="text-[11px] text-[#919EAB]">(10% phần &gt; 10tr)</span>
                                    </div>
                                    <span className={`font-semibold ${tax && tax > 0 ? 'text-[#ee1314]' : 'text-[#637381]'}`}>
                                        {previewLoading ? '…' : tax && tax > 0 ? `-${formatPrizePayoutCurrency(tax)}` : '0 đ (Miễn thuế)'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-0.5">
                                    <span className="text-[#637381]">Hoa hồng đại lý</span>
                                    <span className={`font-semibold ${commission && commission > 0 ? 'text-[#ee1314]' : 'text-[#637381]'}`}>
                                        {previewLoading ? '…' : commission && commission > 0 ? `-${formatPrizePayoutCurrency(commission)}` : '0 đ'}
                                    </span>
                                </div>
                            </div>

                            {/* Net Payout Highlight Box */}
                            <div className="mx-4 mb-4 rounded-xl bg-gradient-to-r from-[#FFF5F5] via-[#FFF0F0] to-[#FFEBEB] border border-[#FFCDD2] p-4 flex items-center justify-between shadow-2xs">
                                <div>
                                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#C62828]">
                                        Thực nhận chuyển khoản
                                    </span>
                                    <p className="text-[11px] text-[#D32F2F] mt-0.5 mb-0">
                                        Sau khi khấu trừ thuế và phí hoa hồng
                                    </p>
                                </div>
                                <div className="text-right">
                                    {previewLoading ? (
                                        <span className="text-[13px] text-[#637381]">Đang tính…</span>
                                    ) : (
                                        <span className="text-[22px] font-black text-[#ee1314] tracking-tight">
                                            {formatPrizePayoutCurrency(net ?? gross)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {stationOfficeOnly && (
                            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-[13px] text-orange-800">
                                {buildStationOfficeRedemptionMessage(preview?.stationName ?? ticket.stationName)}
                            </div>
                        )}
                        {previewError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
                                {previewError}
                            </div>
                        )}
                        {!previewLoading && preview && !preview.canClaimOnline && !stationOfficeOnly && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">
                                Vé này hiện không thể nhận thưởng trực tuyến. Vui lòng mang vé đến đại lý.
                            </div>
                        )}

                        <div className="flex items-start gap-2 bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E8EB] text-[12px] text-[#637381]">
                            <i className="fa-solid fa-circle-info text-[#919EAB] mt-0.5 shrink-0" />
                            <span>
                                Yêu cầu vẫn cần nhân viên duyệt đối soát trước khi giải ngân chuyển khoản.
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            disabled={previewLoading || !canContinueOnline}
                            className="w-full py-3.5 bg-[#ee1314] hover:bg-[#d41112] text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            <span>Tiếp tục</span>
                            <i className="fa-solid fa-arrow-right text-[13px]" />
                        </button>
                    </div>
                ) : (
                    <div className="p-5 flex flex-col gap-4">
                        <div>
                            <h4 className="text-[15px] font-bold text-[#212B36] m-0">Thông tin nhận thưởng & xác minh</h4>
                            <p className="text-[13px] text-[#637381] mt-0.5 mb-0">
                                Tải CCCD để trích xuất số thẻ qua OCR và chọn tài khoản nhận tiền thưởng.
                            </p>
                        </div>

                        {ocrErrorInfo && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col gap-2.5 text-[13px] text-red-800 animate-fadeIn">
                                <div className="flex items-start gap-2.5 font-bold text-red-900">
                                    <i className="fa-solid fa-circle-exclamation text-[16px] text-red-600 mt-0.5 shrink-0" />
                                    <div>
                                        <span>Không thể nhận diện thông tin từ ảnh CCCD</span>
                                        <p className="font-normal text-[12px] text-red-700 mt-0.5 mb-0">
                                            Hệ thống không thể đọc được các trường thông tin sau từ ảnh đã tải lên:
                                        </p>
                                    </div>
                                </div>
                                {(['front', 'back', null] as const).map((side) => {
                                    const group = ocrErrorInfo.missingFields.filter((f) => f.side === side);
                                    if (group.length === 0) return null;
                                    return (
                                        <div key={side ?? 'unknown'} className="flex flex-wrap items-center gap-1.5 pl-6">
                                            {side && (
                                                <span className="text-[12px] font-bold text-red-900 mr-1">
                                                    {CCCD_SIDE_LABELS[side]}:
                                                </span>
                                            )}
                                            {group.map((f, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-red-300 text-red-700 font-semibold text-[12px] shadow-xs"
                                                >
                                                    <i className="fa-solid fa-xmark text-[11px] text-red-500" />
                                                    {f.label}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                })}
                                <div className="pl-6 text-[12px] text-red-700 leading-relaxed">
                                    <span className="font-semibold">Khắc phục:</span> Vui lòng chụp lại{' '}
                                    <strong>
                                        {retakeSides.size === 2
                                            ? 'cả mặt trước và mặt sau CCCD'
                                            : retakeSides.has('back')
                                                ? 'mặt sau CCCD'
                                                : retakeSides.has('front')
                                                    ? 'mặt trước CCCD'
                                                    : 'ảnh CCCD'}
                                    </strong>{' '}
                                    rõ nét, không bị lóa đèn flash, đủ 4 góc và không bị mất chữ, sau đó bấm <strong>Đổi ảnh</strong> ở mặt tương ứng để tải lại.
                                </div>
                            </div>
                        )}

                        {/* Section 1: CCCD Upload */}
                        <div className="flex flex-col gap-2.5 pt-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#ee1314] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                                    <span className="text-[14px] font-bold text-[#212B36]">Ảnh căn cước công dân (CCCD)</span>
                                </div>
                                <span className="text-[12px] text-[#919EAB]">Bắt buộc 2 mặt</span>
                            </div>
                            <p className="text-[12px] text-[#637381] m-0">
                                Số CCCD được trích xuất tự động qua OCR (không cần nhập tay, không cần selfie).
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                                {renderCccdUpload(
                                    'front',
                                    'CCCD mặt trước',
                                    frontPreview,
                                    frontImageUrl,
                                    uploadingFront,
                                    frontInputRef,
                                    () => {
                                        setFrontPreview('');
                                        setFrontImageUrl('');
                                        clearOcrErrorForSide('front');
                                    },
                                )}
                                {renderCccdUpload(
                                    'back',
                                    'CCCD mặt sau',
                                    backPreview,
                                    backImageUrl,
                                    uploadingBack,
                                    backInputRef,
                                    () => {
                                        setBackPreview('');
                                        setBackImageUrl('');
                                        clearOcrErrorForSide('back');
                                    },
                                )}
                            </div>
                        </div>

                        <hr className="border-t border-[#E5E8EB] my-1" />

                        {/* Section 2: Bank Account Selection */}
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#ee1314] text-white text-[11px] font-bold flex items-center justify-center">2</span>
                                    <span className="text-[14px] font-bold text-[#212B36]">Tài khoản ngân hàng nhận tiền</span>
                                </div>
                                {bankAccounts.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleAddBank}
                                        className="text-[12px] text-[#ee1314] font-bold cursor-pointer bg-transparent border-none hover:underline"
                                    >
                                        + Thêm tài khoản
                                    </button>
                                )}
                            </div>

                            {isLoadingBanks ? (
                                <div className="text-[#637381] text-[13px] py-2">Đang tải tài khoản…</div>
                            ) : bankAccounts.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-[#DFE3E8] bg-[#F9FAFB] p-4 text-center">
                                    <p className="text-[13px] text-[#637381] mb-2.5">Bạn chưa có tài khoản ngân hàng nào.</p>
                                    <button
                                        type="button"
                                        onClick={handleAddBank}
                                        className="px-4 py-2 bg-[#212B36] text-white rounded-lg text-[13px] font-bold cursor-pointer hover:bg-[#343d46] transition-colors"
                                    >
                                        Thêm tài khoản
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {bankAccounts.map((account) => {
                                        const isSelected = bankAccountId === account.id;
                                        return (
                                            <div
                                                key={account.id}
                                                onClick={() => setBankAccountId(account.id)}
                                                className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'border-[#ee1314] bg-[#FFF5F5]'
                                                        : 'border-[#E5E8EB] hover:border-[#C4CDD5] hover:bg-[#FAFBFC]'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <input
                                                        type="radio"
                                                        name="bankAccount"
                                                        checked={isSelected}
                                                        onChange={() => setBankAccountId(account.id)}
                                                        className="mt-1 accent-[#ee1314] cursor-pointer shrink-0"
                                                    />
                                                    <div className="flex flex-col gap-0.5 text-[13px] min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-[#212B36]">{account.bankName}</span>
                                                            {account.isDefault && (
                                                                <span className="text-[10px] font-bold text-[#ee1314] bg-[#FFF4F4] px-1.5 py-0.5 rounded border border-[#FFEBEE] shrink-0">
                                                                    Mặc định
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="font-mono text-[#454F5B]">{account.bankAccountNo}</span>
                                                        <span className="text-[#637381] uppercase text-[12px]">{account.bankAccountName}</span>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditBank(account);
                                                    }}
                                                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E8EB] bg-white text-[#637381] hover:text-[#ee1314] hover:border-[#ee1314] text-[12px] font-semibold transition-colors cursor-pointer shadow-xs"
                                                    title="Chỉnh sửa thông tin tài khoản"
                                                >
                                                    <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                                    <span>Sửa</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Step 2 Actions */}
                        <div className="flex gap-2 pt-2 border-t border-[#E5E8EB]">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setOcrErrorInfo(null);
                                }}
                                className="flex-1 py-3 border border-[#E5E8EB] rounded-xl font-bold cursor-pointer text-[#212B36] hover:bg-[#F9FAFB] transition-colors"
                            >
                                Quay lại
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={
                                    bankAccountId === '' ||
                                    !canContinueIdentity ||
                                    createMutation.isPending
                                }
                                className="flex-1 py-3 bg-[#ee1314] text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {createMutation.isPending && (
                                    <i className="fa-solid fa-spinner fa-spin text-sm" />
                                )}
                                <span>{createMutation.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <BankAccountFormModal
                isOpen={showBankForm}
                editingAccount={editingAccount}
                onClose={() => {
                    setShowBankForm(false);
                    setEditingAccount(null);
                }}
                onSuccess={(account) => {
                    setBankAccountId(account.id);
                }}
            />
        </div>,
        document.body
    );
};
