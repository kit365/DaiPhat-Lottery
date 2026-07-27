import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { CartItem } from '../../../../stores/useCartStore';

interface CartQuantityControlProps {
    item: CartItem;
    onDecrease: () => void;
    onIncrease: () => void;
    onRemove: () => void;
}

export const CartQuantityControl: React.FC<CartQuantityControlProps> = ({
    item,
    onDecrease,
    onIncrease,
    onRemove,
}) => {
    const maxStock = typeof item.maxStock === 'number' ? item.maxStock : 999;
    const atZero = item.quantity <= 0;
    const atMax = item.quantity >= maxStock;

    return (
        <div className="flex items-center border border-[#E5E8EB] rounded bg-white h-7 min-w-[88px] overflow-hidden">
            <button
                type="button"
                onClick={onDecrease}
                disabled={atZero}
                aria-label="Giảm số lượng"
                className="flex-1 h-full flex items-center justify-center text-[#637381] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-1"
            >
                <Minus size={12} />
            </button>

            {atZero ? (
                <button
                    type="button"
                    onClick={onRemove}
                    title="Xóa khỏi giỏ"
                    aria-label="Xóa khỏi giỏ"
                    className="min-w-[36px] h-full flex items-center justify-center text-[12px] font-bold text-[#ee1314] border-x border-[#E5E8EB] hover:bg-[#FFF4F4] transition-colors px-1"
                >
                    Xóa
                </button>
            ) : (
                <span className="min-w-[28px] h-full flex items-center justify-center text-[13px] font-bold text-[#212B36] border-x border-[#E5E8EB]">
                    {item.quantity}
                </span>
            )}

            <button
                type="button"
                onClick={onIncrease}
                disabled={atMax}
                aria-label="Tăng số lượng"
                className="flex-1 h-full flex items-center justify-center text-[#637381] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-1"
            >
                <Plus size={12} />
            </button>
        </div>
    );
};
