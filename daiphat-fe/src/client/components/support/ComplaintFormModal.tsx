import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    SupportTicketResponse,
    TicketCategoryResponse,
    TicketRefType,
} from '../../../types/support.type';
import { useGetMyOrders } from '../../hooks/useOrder';
import {
    useCreateComplaint,
    useGetTicketCategories,
    useUpdateComplaint,
} from '../../hooks/useSupportTicket';
import { ImageUploadPreview } from './ImageUploadPreview';
import { AppToast } from '../../utils/toast.util';
import { TICKET_REF_TYPE_LABELS } from '../../../types/support.type';

interface ComplaintFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingTicket?: SupportTicketResponse | null;
    defaultOrderId?: string;
}

export const ComplaintFormModal: React.FC<ComplaintFormModalProps> = ({
    isOpen,
    onClose,
    editingTicket,
    defaultOrderId,
}) => {
    const navigate = useNavigate();
    const isEditing = !!editingTicket;

    const { data: categoriesData } = useGetTicketCategories();
    const { data: ordersData } = useGetMyOrders({ page: 1, limit: 100 });
    const createMutation = useCreateComplaint();
    const updateMutation = useUpdateComplaint();

    const categories = categoriesData?.data || [];
    const orders = ordersData?.data?.recordList || [];

    const [ticketCategoryId, setTicketCategoryId] = useState<number | ''>('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [refId, setRefId] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

    const selectedCategory = useMemo(
        () => categories.find((c) => c.id === ticketCategoryId),
        [categories, ticketCategoryId]
    );

    const requiredRefType = selectedCategory?.requiredRefType;

    useEffect(() => {
        if (!isOpen) return;

        if (editingTicket) {
            setTicketCategoryId(editingTicket.ticketCategoryId);
            setTitle(editingTicket.title);
            setDescription(editingTicket.description);
            setRefId(editingTicket.refId || '');
            setAttachmentFile(null);
        } else {
            setTicketCategoryId(categories[0]?.id || '');
            setTitle('');
            setDescription('');
            setRefId(defaultOrderId || '');
            setAttachmentFile(null);
        }
    }, [isOpen, editingTicket, categories, defaultOrderId]);

    useEffect(() => {
        if (!isOpen || isEditing || !defaultOrderId || !selectedCategory) return;
        if (selectedCategory.requiredRefType === TicketRefType.ORDER) {
            setRefId(defaultOrderId);
        }
    }, [isOpen, isEditing, defaultOrderId, selectedCategory]);

    const handleCategoryChange = (categoryId: number) => {
        setTicketCategoryId(categoryId);
        const category = categories.find((c) => c.id === categoryId);
        if (!category?.requiredRefType) {
            setRefId('');
        } else if (category.requiredRefType === TicketRefType.ORDER && defaultOrderId) {
            setRefId(defaultOrderId);
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
            <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-[#E5E8EB] sticky top-0 bg-white z-10">
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

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-bold text-[#454F5B]">Danh mục *</label>
                        <select
                            value={ticketCategoryId}
                            onChange={(e) => handleCategoryChange(Number(e.target.value))}
                            disabled={isEditing}
                            className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] cursor-pointer disabled:bg-[#F4F6F8] disabled:cursor-not-allowed"
                            required
                        >
                            <option value="" disabled>
                                Chọn danh mục...
                            </option>
                            {categories.map((cat: TicketCategoryResponse) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        {selectedCategory?.description && (
                            <p className="text-[12px] text-[#919EAB]">{selectedCategory.description}</p>
                        )}
                    </div>

                    {requiredRefType === TicketRefType.ORDER && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">Đơn hàng liên quan *</label>
                            <select
                                value={refId}
                                onChange={(e) => setRefId(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] cursor-pointer"
                                required
                            >
                                <option value="" disabled>
                                    Chọn đơn hàng...
                                </option>
                                {orders.map((order) => (
                                    <option key={order.id} value={order.id}>
                                        #{order.id.slice(0, 8).toUpperCase()} —{' '}
                                        {order.totalAmount?.toLocaleString('vi-VN')}đ — {order.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {requiredRefType && requiredRefType !== TicketRefType.ORDER && (
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

                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-bold text-[#454F5B]">Mô tả chi tiết *</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                            className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] resize-none"
                            required
                        />
                    </div>

                    <ImageUploadPreview
                        value={attachmentFile}
                        existingUrl={editingTicket?.attachmentUrl}
                        onChange={setAttachmentFile}
                        label="Hình ảnh đính kèm"
                        helperText="Tải lên hình ảnh minh chứng (không bắt buộc)"
                    />

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[#637381] font-bold text-[14px] hover:bg-[#F4F6F8] transition-colors cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 py-3 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] transition-colors disabled:opacity-50 cursor-pointer"
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
        </div>
    );
};
