import { apiApp } from '../../api';
import { useCartStore } from '../../stores/useCartStore';
import { AppToast as toast } from '../../utils/toast.util';

/**
 * Đồng bộ maxStock từ API và kẹp số lượng về tồn thực tế.
 * Trả về true nếu có item bị chỉnh/xóa do vượt tồn.
 */
export const validateAndSyncCartStock = async (): Promise<boolean> => {
    const { items, removeItem, syncItemStock } = useCartStore.getState();
    if (items.length === 0) return false;

    let hasAdjustment = false;

    await Promise.all(
        items.map(async (item) => {
            try {
                const response = await apiApp.get(`/lottery-tickets/${item.id}`);
                const ticketData = response.data?.data;
                if (!ticketData) return;

                const maxStock = Number(ticketData.quantity ?? 0);

                if (maxStock <= 0) {
                    toast.error(`Vé số ${item.numbers} đã hết hàng. Vui lòng chọn vé khác.`);
                    removeItem(item.id);
                    hasAdjustment = true;
                    return;
                }

                const previousQty = item.quantity;
                syncItemStock(item.id, maxStock);

                if (previousQty > maxStock) {
                    toast.error(
                        `Vé số ${item.numbers} chỉ còn ${maxStock} vé. Hệ thống đã tự cập nhật lại giỏ hàng.`
                    );
                    hasAdjustment = true;
                }
            } catch (error) {
                console.error(`Lỗi kiểm tra tồn kho vé ${item.id}:`, error);
            }
        })
    );

    return hasAdjustment;
};
