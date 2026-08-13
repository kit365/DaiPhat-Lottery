import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { apiApp } from '../../api';
import { useCartStore, type CartItem } from '../../stores/useCartStore';
import { AppToast as toast } from '../../utils/toast.util';

dayjs.extend(customParseFormat);

const PUBLIC_STOCK_REQUEST = { skipGlobalErrorToast: true } as const;

function parseCartDrawDate(label: string): string | undefined {
    const parsed = dayjs(label, 'DD/MM/YYYY', true);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined;
}

/** Gom vé theo ngày quay để gọi API public theo lô, tránh N request riêng lẻ. */
function groupItemsByDrawDate(items: CartItem[]): Map<string, CartItem[]> {
    const groups = new Map<string, CartItem[]>();

    for (const item of items) {
        const drawDate = parseCartDrawDate(item.date) ?? 'unknown';
        const bucket = groups.get(drawDate);
        if (bucket) {
            bucket.push(item);
        } else {
            groups.set(drawDate, [item]);
        }
    }

    return groups;
}

async function fetchPublicStockByIds(items: CartItem[]): Promise<Map<string, number>> {
    const stockById = new Map<string, number>();
    const groups = groupItemsByDrawDate(items);

    for (const [drawDate, groupItems] of groups) {
        try {
            const searches = [...new Set(groupItems.map((item) => item.numbers))];
            const params: Record<string, unknown> = {
                page: 1,
                size: Math.max(searches.length * 2, 20),
                searches,
            };

            if (drawDate !== 'unknown') {
                params.drawDate = drawDate;
            }

            const response = await apiApp.get('/lottery-tickets/public', {
                params,
                paramsSerializer: { indexes: null },
                ...PUBLIC_STOCK_REQUEST,
            });

            for (const ticket of response.data?.data?.recordList ?? []) {
                stockById.set(String(ticket.id), Number(ticket.quantity ?? 0));
            }
        } catch {
            // API lỗi / mạng — giữ tồn trong giỏ, không chặn trang.
        }
    }

    return stockById;
}

/**
 * Đồng bộ maxStock từ API public và kẹp số lượng về tồn thực tế.
 * Trả về true nếu có item bị chỉnh/xóa do vượt tồn.
 */
export const validateAndSyncCartStock = async (): Promise<boolean> => {
    const { items, removeItem, syncItemStock } = useCartStore.getState();
    if (items.length === 0) return false;

    let hasAdjustment = false;
    let stockById: Map<string, number>;

    try {
        stockById = await fetchPublicStockByIds(items);
    } catch {
        return false;
    }

    for (const item of items) {
        const maxStock = stockById.get(item.id);
        if (maxStock === undefined) {
            continue;
        }

        if (maxStock <= 0) {
            toast.error(`Vé số ${item.numbers} đã hết hàng. Vui lòng chọn vé khác.`);
            removeItem(item.id);
            hasAdjustment = true;
            continue;
        }

        const previousQty = item.quantity;
        syncItemStock(item.id, maxStock);

        if (previousQty > maxStock) {
            toast.error(
                `Vé số ${item.numbers} chỉ còn ${maxStock} vé. Hệ thống đã tự cập nhật lại giỏ hàng.`
            );
            hasAdjustment = true;
        }
    }

    return hasAdjustment;
};
