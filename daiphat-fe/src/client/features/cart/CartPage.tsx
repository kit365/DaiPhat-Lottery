"use client";

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ChevronRight } from 'lucide-react';
import { useCartStore, CartItem } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { Checkbox } from '../../components/ui/Checkbox';
import OrderSummary from './components/OrderSummary';
import { CartQuantityControl } from './components/CartQuantityControl';
import { validateAndSyncCartStock } from '../../utils/cartStock.util';
import { AppToast as toast } from '../../../utils/toast.util';

export const CartPage = () => {
    const navigate = useNavigate();
    const { items, updateQuantity, removeItem, clearBuyNow } = useCartStore();
    const { token, openLoginModal } = useAuthStore();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Đồng bộ tồn kho thực tế từ DB khi vào giỏ
    useEffect(() => {
        // Rời phiên mua ngay (nếu còn) — giỏ chính phải hiển thị đầy đủ.
        clearBuyNow();
        validateAndSyncCartStock();
    }, [clearBuyNow]);

    // Auto-select new items
    useEffect(() => {
        setSelectedIds(items.map(i => i.id));
    }, [items.length]);

    const getMaxStock = (item: CartItem) =>
        typeof item.maxStock === 'number' ? item.maxStock : 999;

    const handleIncreaseQty = (item: CartItem) => {
        const max = getMaxStock(item);
        if (item.quantity >= max) {
            toast.error(`Vé số ${item.numbers} chỉ còn ${max} vé`);
            return;
        }
        updateQuantity(item.id, 1);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(i => i.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleClearCart = () => {
        const remainingIds = selectedIds.filter(id => !selectedIds.includes(id));
        selectedIds.forEach(id => removeItem(id));
        setSelectedIds(remainingIds);
    };

    const selectedItems = items.filter(i => selectedIds.includes(i.id) && i.quantity > 0);
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalTickets = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div 
            className="client-page min-h-screen flex flex-col pb-20 bg-fixed bg-cover bg-center"
            style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
        >
            {/* Top Section for Breadcrumb & Title (Transparent to show background) */}
            <div className="w-full mt-[70px] lg:mt-[80px] py-4 lg:py-6">
                <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-[13px] text-[#637381] mb-2 font-medium">
                            <Link to="/" className="hover:text-[#ee1314] transition-colors">Trang chủ</Link>
                            <ChevronRight size={14} />
                            <span className="text-[#212B36] font-medium">Giỏ hàng</span>
                        </div>
                        <h1 className="client-heading mb-1 tracking-tight">Giỏ hàng</h1>
                        <p className="client-body">Kiểm tra lại vé số trước khi thanh toán</p>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-8 flex flex-col">

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* Left Content */}
                    <div className="flex-1 w-full flex flex-col gap-6">

                        {/* Header & Items List */}
                        <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E8EB] p-5">
                            {/* Table Header Controls */}
                            <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#E5E8EB]">
                                <Checkbox 
                                    checked={items.length > 0 && selectedIds.length === items.length}
                                    onChange={toggleSelectAll}
                                    label={<span className="text-[15px] font-bold text-[#212B36]">Đã chọn {selectedIds.length} sản phẩm</span>}
                                />
                                <button
                                    onClick={handleClearCart}
                                    disabled={selectedIds.length === 0}
                                    className="flex items-center gap-1.5 text-[14px] font-medium text-[#ee1314] hover:text-[#d00f10] transition-colors disabled:opacity-50"
                                >
                                    <Trash2 size={16} /> Xóa tất cả
                                </button>
                            </div>

                            {/* Table Column Headers (Desktop only) */}
                            <div className="hidden lg:grid grid-cols-[30px_1.5fr_1.5fr_100px_100px_100px_80px] gap-4 mb-4 text-[13px] font-bold text-[#212B36] uppercase items-center border-b border-[#E5E8EB] pb-3">
                                <div></div> {/* Checkbox placeholder */}
                                <div className="text-left">Vé số</div>
                                <div className="text-left">Đài & Ngày quay</div>
                                <div className="text-center">Số lượng</div>
                                <div className="text-center">Đơn giá</div>
                                <div className="text-center">Thành tiền</div>
                                <div className="text-center">Thao tác</div>
                            </div>

                            <div className="flex flex-col">
                                {items.map((item) => {
                                    const isSelected = selectedIds.includes(item.id);
                                    
                                    return (
                                        <div key={item.id} className="flex flex-col lg:grid lg:grid-cols-[30px_1.5fr_1.5fr_100px_100px_100px_80px] gap-4 items-center py-4 border-b border-dashed border-[#E5E8EB] last:border-b-0">
                                            {/* Checkbox */}
                                            <div className="flex justify-center w-full lg:w-auto mb-3 lg:mb-0">
                                                <Checkbox 
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(item.id)}
                                                />
                                            </div>

                                            {/* Vé số */}
                                            <div className="flex items-center gap-3">
                                                <img src={item.ticketImg || 'https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png'} alt="Vé" className="w-[80px] h-[50px] object-cover mix-blend-multiply border border-gray-100 rounded shrink-0" />
                                                <div className="font-bold text-[16px] text-[#212B36] tracking-tight">{item.numbers}</div>
                                            </div>

                                            {/* Đài & Ngày quay */}
                                            <div className="flex flex-col items-start gap-1">
                                                <div className="flex items-center gap-2">
                                                    <img src={item.provinceIcon || 'https://i.ibb.co/XrKTHt8g/t-i-xu-ng.png'} alt="Logo" className="w-5 h-5 rounded-full border border-gray-200" />
                                                    <span className="font-bold text-[13px] text-[#212B36]">{item.province}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[12px] text-[#637381] pl-7">
                                                    <span className="font-medium text-[#212B36]">{item.date}</span>
                                                    <span>•</span>
                                                    <span>{item.time}</span>
                                                </div>
                                            </div>

                                            {/* Số lượng */}
                                            <div className="flex flex-col items-center">
                                                <CartQuantityControl
                                                    item={item}
                                                    onDecrease={() => updateQuantity(item.id, -1)}
                                                    onIncrease={() => handleIncreaseQty(item)}
                                                    onRemove={() => removeItem(item.id)}
                                                />
                                            </div>

                                            {/* Đơn giá */}
                                            <div className="text-center text-[13px] text-[#637381]">
                                                {(item.price).toLocaleString('vi-VN')}đ
                                            </div>

                                            {/* Thành tiền */}
                                            <div className="text-center text-[14px] font-bold text-[#ee1314]">
                                                {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                            </div>

                                            {/* Thao tác */}
                                            <div className="flex justify-center">
                                                <button onClick={() => removeItem(item.id)} className="text-[#ee1314] hover:text-[#d00f10] transition-colors w-8 h-8 rounded-full hover:bg-[#FFF4F4] flex items-center justify-center">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {items.length === 0 && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-24 h-24 mb-4 opacity-50"><i className="fa-solid fa-cart-arrow-down text-[60px] text-gray-300"></i></div>
                                        <p className="text-[16px] text-[#212B36] font-medium mb-2">Giỏ hàng của bạn đang trống.</p>
                                        <button onClick={() => navigate('/mua-ve')} className="text-[#ee1314] font-bold hover:underline">Mua vé ngay</button>
                                    </div>
                                )}
                            </div>

                            {/* Bottom actions */}
                            {items.length > 0 && (
                                <div className="mt-4 pt-5 border-t border-[#E5E8EB]">
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6 sticky top-[100px]">

                        <OrderSummary 
                            totalTickets={totalTickets}
                            totalAmount={totalAmount}
                            actions={
                                <button
                                    onClick={() => {
                                        if (!token) {
                                            openLoginModal();
                                            return;
                                        }
                                        navigate('/checkout');
                                    }}
                                    disabled={selectedItems.length === 0}
                                    className="w-full h-[48px] bg-[#ee1314] text-white font-bold rounded-lg hover:bg-[#d00f10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#ee1314]/20"
                                >
                                    <i className="fa-solid fa-lock"></i> Thanh toán
                                </button>
                            }
                        />

                    </div>

                </div>

            </main>

        </div>
    );
};
