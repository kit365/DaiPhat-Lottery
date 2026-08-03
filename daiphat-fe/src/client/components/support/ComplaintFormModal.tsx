"use client";

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    SupportTicketResponse,
    TicketCategoryResponse,
    TicketRefType,
} from '../../../types/support.type';
import { useGetMyOrders } from '../../hooks/useOrder';
import { useGetMyRefunds } from '../../hooks/useRefund';
import {
    useCreateComplaint,
    useGetTicketCategories,
    useUpdateComplaint,
} from '../../hooks/useSupportTicket';
import { ImageUploadPreview } from './ImageUploadPreview';
import { AppToast } from '../../../utils/toast.util';
import { TICKET_REF_TYPE_LABELS } from '../../../types/support.type';
import { SelectOrderModal } from './SelectOrderModal';
import { SelectRefundModal } from './SelectRefundModal';
import { SelectPrizePayoutModal } from './SelectPrizePayoutModal';
import { RefundRequestResponse } from '../../../types/refund.type';
import { useGetMyPrizePayouts } from '../../hooks/usePrizePayout';
import { formatPrizePayoutCurrency, PrizePayoutRequestResponse } from '../../../types/prize-payout.type';

interface ComplaintFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingTicket?: SupportTicketResponse | null;
    defaultOrderId?: string;
    defaultRefundId?: number | string;
    defaultPrizePayoutId?: number | string;
    defaultCategoryCode?: string;
    requireEvidence?: boolean;
}

const getCategoryIcon = (code: string) => {
    if (code.includes('ORDER')) return 'fa-box';
    if (code.includes('PRIZE_PAYOUT') || code.includes('PRIZE')) return 'fa-trophy';
    if (code.includes('PAYMENT') || code.includes('REFUND')) return 'fa-money-bill-wave';
    return 'fa-headset';
};

export const ComplaintFormModal: React.FC<ComplaintFormModalProps> = ({
    isOpen,
    onClose,
    editingTicket,
    defaultOrderId,
    defaultRefundId,
    defaultPrizePayoutId,
    defaultCategoryCode,
    requireEvidence = false,
}) => {
    const navigate = useNavigate();
    const isEditing = !!editingTicket;

    const { data: categoriesData } = useGetTicketCategories();
    const { data: ordersData } = useGetMyOrders({ page: 1, limit: 100 });
    const { data: refundsData } = useGetMyRefunds({ page: 1, limit: 100 });
    const { data: payoutsData } = useGetMyPrizePayouts({ page: 1, limit: 100 }, isOpen);
    const createMutation = useCreateComplaint();
    const updateMutation = useUpdateComplaint();

    const categories = categoriesData?.data || [];
    
    // Selectable categories (exclude GROUP_ categories)
    const selectableCategories = useMemo(() => {
        return categories.filter(c => !c.code.startsWith('GROUP_'));
    }, [categories]);

    const visibleCategories = useMemo(() => {
        if (defaultCategoryCode) {
            return selectableCategories.filter((category) => category.code === defaultCategoryCode);
        }
        if (defaultPrizePayoutId != null) {
            return selectableCategories.filter((category) => category.requiredRefType === TicketRefType.PRIZE_CLAIM);
        }
        if (defaultRefundId != null) {
            return selectableCategories.filter((category) => category.requiredRefType === TicketRefType.REFUND_REQUEST);
        }
        if (defaultOrderId) {
            return selectableCategories.filter((category) => category.requiredRefType === TicketRefType.ORDER);
        }
        return selectableCategories;
    }, [selectableCategories, defaultCategoryCode, defaultRefundId, defaultPrizePayoutId, defaultOrderId]);

    const groupedCategories = useMemo(() => {
        const groups: Record<number, { parent: TicketCategoryResponse | undefined; items: TicketCategoryResponse[] }> = {};
        const ungrouped: TicketCategoryResponse[] = [];

        visibleCategories.forEach(cat => {
            if (cat.parentId) {
                if (!groups[cat.parentId]) {
                    groups[cat.parentId] = {
                        parent: categories.find(c => c.id === cat.parentId),
                        items: []
                    };
                }
                groups[cat.parentId].items.push(cat);
            } else {
                ungrouped.push(cat);
            }
        });
        
        return { groups: Object.values(groups), ungrouped };
    }, [visibleCategories, categories]);

    const orders = ordersData?.data?.recordList || [];
    const refunds = (refundsData?.data?.recordList || []) as RefundRequestResponse[];
    const payouts = (payoutsData?.data?.recordList || []) as PrizePayoutRequestResponse[];

    const [ticketCategoryId, setTicketCategoryId] = useState<number | ''>('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [refId, setRefId] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [isPrizePayoutModalOpen, setIsPrizePayoutModalOpen] = useState(false);

    const selectedCategory = useMemo(
        () => categories.find((c) => c.id === ticketCategoryId),
        [categories, ticketCategoryId]
    );

    const requiredRefType = selectedCategory?.requiredRefType;
    const evidenceRequired =
        requireEvidence || selectedCategory?.code === 'PAYMENT_SYNC_ERROR';

    const selectedOrder = useMemo(() => orders.find(o => o.id === refId), [orders, refId]);
    const selectedRefund = useMemo(() => refunds.find(r => String(r.id) === refId), [refunds, refId]);
    const selectedPrizePayout = useMemo(() => payouts.find(p => String(p.id) === refId), [payouts, refId]);

    useEffect(() => {
        if (!isOpen) return;

        if (editingTicket) {
            setTicketCategoryId(editingTicket.ticketCategoryId);
            setTitle(editingTicket.title);
            setDescription(editingTicket.description);
            setRefId(editingTicket.refId || '');
            setAttachmentFile(null);
        } else {
            const preferredCategory =
                (defaultCategoryCode
                    ? visibleCategories.find((category) => category.code === defaultCategoryCode)
                    : undefined) ||
                visibleCategories[0];

            setTicketCategoryId(preferredCategory?.id || '');
            setTitle('');
            setDescription('');
            if (defaultPrizePayoutId != null) {
                setRefId(String(defaultPrizePayoutId));
            } else if (defaultRefundId != null) {
                setRefId(String(defaultRefundId));
            } else {
                setRefId(defaultOrderId || '');
            }
            setAttachmentFile(null);
        }
    }, [isOpen, editingTicket, categories, visibleCategories, defaultOrderId, defaultRefundId, defaultPrizePayoutId, defaultCategoryCode]);

    useEffect(() => {
        if (!isOpen || isEditing || !defaultOrderId || !selectedCategory) return;
        if (selectedCategory.requiredRefType === TicketRefType.ORDER) {
            setRefId(defaultOrderId);
        }
    }, [isOpen, isEditing, defaultOrderId, selectedCategory]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCategoryChange = (categoryId: number) => {
        setTicketCategoryId(categoryId);
        setIsDropdownOpen(false);
        const category = visibleCategories.find((c) => c.id === categoryId);
        if (!category?.requiredRefType) {
            setRefId('');
        } else if (category.requiredRefType === TicketRefType.ORDER && defaultOrderId) {
            setRefId(defaultOrderId);
        } else if (category.requiredRefType === TicketRefType.REFUND_REQUEST && defaultRefundId != null) {
            setRefId(String(defaultRefundId));
        } else if (category.requiredRefType === TicketRefType.PRIZE_CLAIM && defaultPrizePayoutId != null) {
            setRefId(String(defaultPrizePayoutId));
        } else {
            setRefId('');
        }
    };

    const validateForm = (): boolean => {
        if (!ticketCategoryId) {
            AppToast.error('Vui lòng chọn danh mục khiếu nại');
            return false;
        }
        if (!title.trim()) {
            AppToast.error('Vui lòng nhập tiêu đề');
            return false;
        }
        if (title.trim().length > 200) {
            AppToast.error('Tiêu đề tối đa 200 ký tự');
            return false;
        }
        if (!description.trim()) {
            AppToast.error('Vui lòng nhập mô tả chi tiết');
            return false;
        }
        if (requiredRefType) {
            if (!refId.trim()) {
                AppToast.error(`Vui lòng chọn ${TICKET_REF_TYPE_LABELS[requiredRefType].toLowerCase()}`);
                return false;
            }
        }
        if (evidenceRequired && !attachmentFile && !editingTicket?.attachmentUrl) {
            AppToast.error('Vui lòng đính kèm biên lai chuyển khoản cho khiếu nại này.');
            return false;
        }
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const refPayload = requiredRefType
            ? { refId: refId.trim(), refType: requiredRefType }
            : {};

        if (isEditing && editingTicket) {
            updateMutation.mutate(
                {
                    id: editingTicket.id,
                    data: {
                        title: title.trim(),
                        description: description.trim(),
                        ...refPayload,
                    },
                    file: attachmentFile,
                },
                {
                    onSuccess: (res) => {
                        if (res.success) {
                            onClose();
                        }
                    },
                }
            );
        } else {
            createMutation.mutate(
                {
                    data: {
                        ticketCategoryId: Number(ticketCategoryId),
                        title: title.trim(),
                        description: description.trim(),
                        ...refPayload,
                    },
                    file: attachmentFile,
                },
                {
                    onSuccess: (res) => {
                        if (res.success && res.data) {
                            onClose();
                            navigate(`/profile/complaints/${res.data.id}`);
                        }
                    },
                }
            );
        }
    };

    if (!isOpen) return null;

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-[#E5E8EB] bg-white z-10">
                    <h2 className="text-[18px] font-bold text-[#212B36]">
                        {isEditing ? 'Chỉnh sửa khiếu nại' : 'Tạo khiếu nại mới'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-[#F4F6F8] flex items-center justify-center text-[#637381] cursor-pointer"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Cột trái */}
                        <div className="flex flex-col gap-6">
                            {/* Danh mục Dropdown */}
                            <div className="flex flex-col gap-2" ref={dropdownRef}>
                                <label className="text-[13px] font-bold text-[#454F5B]">Danh mục *</label>
                                <div className="relative">
                                    <div
                                        className={`w-full px-4 py-3 bg-white border ${isDropdownOpen ? 'border-[#ee1314]' : 'border-[#E5E8EB]'} rounded-xl text-[14px] flex items-center justify-between cursor-pointer transition-colors ${isEditing || defaultCategoryCode ? 'bg-[#F4F6F8] cursor-not-allowed opacity-80' : 'hover:border-[#ee1314]'}`}
                                        onClick={() => {
                                            if (!isEditing && !defaultCategoryCode) {
                                                setIsDropdownOpen(!isDropdownOpen);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            {selectedCategory ? (
                                                <>
                                                    <i className={`fa-solid ${getCategoryIcon(selectedCategory.code)} text-[#ee1314]`}></i>
                                                    <span className="text-[#212B36] font-medium">{selectedCategory.name}</span>
                                                </>
                                            ) : (
                                                <span className="text-[#919EAB]">Chọn danh mục...</span>
                                            )}
                                        </div>
                                        <i className={`fa-solid fa-chevron-down text-[#919EAB] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
                                    </div>

                                    {/* Dropdown Menu */}
                                    {isDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E8EB] rounded-xl shadow-lg z-20 max-h-[280px] overflow-y-auto overflow-x-hidden p-2">
                                            {groupedCategories.groups.map((group, idx) => (
                                                <div key={idx} className="mb-2 last:mb-0">
                                                    {group.parent && (
                                                        <div className="px-3 py-2 text-[12px] font-bold text-[#919EAB] uppercase tracking-wider">
                                                            {group.parent.name}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-1">
                                                        {group.items.map(cat => (
                                                            <div
                                                                key={cat.id}
                                                                className={`px-3 py-2.5 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${ticketCategoryId === cat.id ? 'bg-[#FFF4F4] text-[#ee1314]' : 'hover:bg-[#F4F6F8] text-[#212B36]'}`}
                                                                onClick={() => handleCategoryChange(cat.id)}
                                                            >
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ticketCategoryId === cat.id ? 'bg-[#ee1314]/10' : 'bg-white shadow-sm border border-[#E5E8EB]'}`}>
                                                                    <i className={`fa-solid ${getCategoryIcon(cat.code)} ${ticketCategoryId === cat.id ? 'text-[#ee1314]' : 'text-[#637381]'}`}></i>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-[13px]">{cat.name}</span>
                                                                    {cat.description && <span className="text-[11px] text-[#919EAB] line-clamp-1">{cat.description}</span>}
                                                                </div>
                                                                {ticketCategoryId === cat.id && (
                                                                    <i className="fa-solid fa-check ml-auto text-[#ee1314]"></i>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {groupedCategories.ungrouped.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-[#E5E8EB]">
                                                    <div className="px-3 py-2 text-[12px] font-bold text-[#919EAB] uppercase tracking-wider">
                                                        Khác
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {groupedCategories.ungrouped.map(cat => (
                                                            <div
                                                                key={cat.id}
                                                                className={`px-3 py-2.5 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${ticketCategoryId === cat.id ? 'bg-[#FFF4F4] text-[#ee1314]' : 'hover:bg-[#F4F6F8] text-[#212B36]'}`}
                                                                onClick={() => handleCategoryChange(cat.id)}
                                                            >
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ticketCategoryId === cat.id ? 'bg-[#ee1314]/10' : 'bg-white shadow-sm border border-[#E5E8EB]'}`}>
                                                                    <i className={`fa-solid ${getCategoryIcon(cat.code)} ${ticketCategoryId === cat.id ? 'text-[#ee1314]' : 'text-[#637381]'}`}></i>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-[13px]">{cat.name}</span>
                                                                    {cat.description && <span className="text-[11px] text-[#919EAB] line-clamp-1">{cat.description}</span>}
                                                                </div>
                                                                {ticketCategoryId === cat.id && (
                                                                    <i className="fa-solid fa-check ml-auto text-[#ee1314]"></i>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {selectedCategory?.description && (
                                    <p className="text-[12px] text-[#919EAB] mt-1">{selectedCategory.description}</p>
                                )}
                            </div>

                            {requiredRefType === TicketRefType.ORDER && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-bold text-[#454F5B]">Đơn hàng liên quan *</label>
                                    {defaultOrderId ? (
                                        <div className="w-full px-4 py-3 bg-[#F4F6F8] border border-[#E5E8EB] rounded-xl text-[14px] text-[#212B36] font-semibold">
                                            #{(selectedOrder?.orderCode || defaultOrderId).toString()}
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setIsOrderModalOpen(true)}
                                            className="w-full px-4 py-3 bg-white border border-[#E5E8EB] hover:border-[#ee1314] rounded-xl text-[14px] flex items-center justify-between cursor-pointer transition-colors"
                                        >
                                            {selectedOrder ? (
                                                <div className="flex items-center gap-3">
                                                    <i className="fa-solid fa-file-invoice text-[#637381]"></i>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[#212B36]">
                                                            #{selectedOrder.id.slice(0, 8).toUpperCase()}
                                                        </span>
                                                        <span className="text-[12px] text-[#919EAB]">
                                                            {selectedOrder.totalAmount?.toLocaleString('vi-VN')}đ
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[#919EAB]">Chọn đơn hàng...</span>
                                            )}
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 bg-[#F4F6F8] text-[#454F5B] text-[12px] font-bold rounded-lg hover:bg-[#DFE3E8]"
                                            >
                                                {selectedOrder ? 'Thay đổi' : 'Chọn'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {requiredRefType === TicketRefType.REFUND_REQUEST && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-bold text-[#454F5B]">
                                        {TICKET_REF_TYPE_LABELS[requiredRefType]} *
                                    </label>
                                    {defaultRefundId != null ? (
                                        <div className="w-full px-4 py-3 bg-[#F4F6F8] border border-[#E5E8EB] rounded-xl text-[14px] text-[#212B36] font-semibold">
                                            #{defaultRefundId}
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setIsRefundModalOpen(true)}
                                            className="w-full px-4 py-3 bg-white border border-[#E5E8EB] hover:border-[#ee1314] rounded-xl text-[14px] flex items-center justify-between cursor-pointer transition-colors"
                                        >
                                            {selectedRefund ? (
                                                <div className="flex items-center gap-3">
                                                    <i className="fa-solid fa-rotate-left text-[#637381]"></i>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[#212B36]">
                                                            #{selectedRefund.id}
                                                        </span>
                                                        <span className="text-[12px] text-[#919EAB]">
                                                            {selectedRefund.refundAmount?.toLocaleString('vi-VN')}đ
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[#919EAB]">Chọn yêu cầu hoàn tiền...</span>
                                            )}
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 bg-[#F4F6F8] text-[#454F5B] text-[12px] font-bold rounded-lg hover:bg-[#DFE3E8]"
                                            >
                                                {selectedRefund ? 'Thay đổi' : 'Chọn'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {requiredRefType === TicketRefType.PRIZE_CLAIM && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-bold text-[#454F5B]">
                                        {TICKET_REF_TYPE_LABELS[requiredRefType]} *
                                    </label>
                                    {defaultPrizePayoutId != null ? (
                                        <div className="w-full px-4 py-3 bg-[#F4F6F8] border border-[#E5E8EB] rounded-xl text-[14px] text-[#212B36] font-semibold">
                                            #{defaultPrizePayoutId}
                                            {selectedPrizePayout?.requestCode ? ` · ${selectedPrizePayout.requestCode}` : ''}
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setIsPrizePayoutModalOpen(true)}
                                            className="w-full px-4 py-3 bg-white border border-[#E5E8EB] hover:border-[#ee1314] rounded-xl text-[14px] flex items-center justify-between cursor-pointer transition-colors"
                                        >
                                            {selectedPrizePayout ? (
                                                <div className="flex items-center gap-3">
                                                    <i className="fa-solid fa-trophy text-[#637381]"></i>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[#212B36]">
                                                            {selectedPrizePayout.requestCode}
                                                        </span>
                                                        <span className="text-[12px] text-[#919EAB]">
                                                            {formatPrizePayoutCurrency(
                                                                selectedPrizePayout.netAmount ?? selectedPrizePayout.grossAmount
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[#919EAB]">Chọn yêu cầu trả thưởng...</span>
                                            )}
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 bg-[#F4F6F8] text-[#454F5B] text-[12px] font-bold rounded-lg hover:bg-[#DFE3E8]"
                                            >
                                                {selectedPrizePayout ? 'Thay đổi' : 'Chọn'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {requiredRefType
                                && requiredRefType !== TicketRefType.ORDER
                                && requiredRefType !== TicketRefType.REFUND_REQUEST
                                && requiredRefType !== TicketRefType.PRIZE_CLAIM && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-bold text-[#454F5B]">
                                        {TICKET_REF_TYPE_LABELS[requiredRefType]} *
                                    </label>
                                    <input
                                        type="text"
                                        value={refId}
                                        onChange={(e) => setRefId(e.target.value)}
                                        placeholder={`Nhập mã ${TICKET_REF_TYPE_LABELS[requiredRefType].toLowerCase()}`}
                                        className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314]"
                                        required
                                        maxLength={100}
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-bold text-[#454F5B]">Tiêu đề *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                                    placeholder="Tóm tắt vấn đề của bạn..."
                                    className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314]"
                                    required
                                />
                                <span className="text-[11px] text-[#919EAB] text-right">{title.length}/200</span>
                            </div>
                        </div>

                        {/* Cột phải */}
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2 flex-1">
                                <label className="text-[13px] font-bold text-[#454F5B]">Mô tả chi tiết *</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                                    className="w-full flex-1 min-h-[140px] px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] resize-none"
                                    required
                                />
                            </div>

                            <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E8EB] shadow-sm">
                                <ImageUploadPreview
                                    value={attachmentFile}
                                    existingUrl={editingTicket?.attachmentUrl}
                                    onChange={setAttachmentFile}
                                    required={evidenceRequired}
                                    label="Hình ảnh đính kèm"
                                    helperText={
                                        evidenceRequired
                                            ? 'Bắt buộc đính kèm biên lai chuyển khoản để đối soát'
                                            : 'Hình ảnh minh chứng (không bắt buộc)'
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-8 mt-4 border-t border-[#E5E8EB] justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 rounded-xl border border-[#E5E8EB] text-[#637381] font-bold text-[14px] hover:bg-[#F4F6F8] transition-colors cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-8 py-3 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] transition-colors disabled:opacity-50 cursor-pointer min-w-[160px] flex justify-center items-center"
                        >
                            {isPending ? (
                                <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : isEditing ? (
                                'Lưu thay đổi'
                            ) : (
                                'Gửi yêu cầu'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <SelectOrderModal 
                isOpen={isOrderModalOpen} 
                onClose={() => setIsOrderModalOpen(false)} 
                onSelect={(id) => setRefId(id)} 
                selectedOrderId={refId}
            />

            <SelectRefundModal 
                isOpen={isRefundModalOpen} 
                onClose={() => setIsRefundModalOpen(false)} 
                onSelect={(id) => setRefId(id)} 
                selectedRefundId={refId}
            />

            <SelectPrizePayoutModal
                isOpen={isPrizePayoutModalOpen}
                onClose={() => setIsPrizePayoutModalOpen(false)}
                onSelect={(id) => setRefId(id)}
                selectedPrizePayoutId={refId}
            />
        </div>
    );
};
