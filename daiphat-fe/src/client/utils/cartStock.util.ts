import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { apiApp } from '../../api';
import { useCartStore, type CartItem } from '../../stores/useCartStore';
import { AppToast as toast } from '../../utils/toast.util';
import { buyTicketQueryKeys } from '../features/buy-ticket/constants/queryKeys';
import type { PublicBuyTicketPage } from '../features/buy-ticket/services/buyTicketService';

export interface TicketInventory {
    lotteryTicketId: number;
    availableQuantity: number;
    status: string | null;
    ticketCondition: string | null;
    purchasable: boolean;
    valid: boolean;
    message: string | null;
}

/** Uncached preflight; actual allocation still rechecks inventory in the order transaction. */
export async function validateTicketInventory(
    items: { id: string; quantity: number }[],
    queryClient?: QueryClient,
): Promise<TicketInventory[]> {
    const quantities = new Map<string, number>();
    for (const item of items) {
        quantities.set(item.id, (quantities.get(item.id) ?? 0) + item.quantity);
    }
    if (!quantities.size) return [];
    const response = await apiApp.post('/lottery-tickets/public/validate-inventory',
        [...quantities].map(([id, quantity]) => ({ lotteryTicketId: Number(id), quantity })),
        { skipGlobalErrorToast: true } as Parameters<typeof apiApp.post>[2]);
    const inventory: TicketInventory[] = response.data?.data;
    if (!Array.isArray(inventory) || inventory.length !== quantities.size ||
        new Set(inventory.map(item => String(item.lotteryTicketId))).size !== quantities.size ||
        inventory.some(item => !quantities.has(String(item.lotteryTicketId)))) {
        throw new Error('Không thể kiểm tra tồn kho.');
    }
    const byId = new Map(inventory.map(item => [String(item.lotteryTicketId), item]));
    const sync = (items: CartItem[]) => items.flatMap(item => {
        const latest = byId.get(item.id);
        if (!latest) return [item];
        if (!latest.purchasable) return [];
        return [{ ...item, maxStock: latest.availableQuantity,
            quantity: Math.min(item.quantity, latest.availableQuantity) }];
    });
    useCartStore.setState(state => ({
        items: sync(state.items),
        buyNowItems: state.buyNowItems === null ? null : sync(state.buyNowItems),
    }));
    queryClient?.setQueriesData<InfiniteData<PublicBuyTicketPage>>(
        { queryKey: buyTicketQueryKeys.lists() }, data => !data ? data : ({
            ...data,
            pages: data.pages.map(page => ({ ...page, recordList: page.recordList.flatMap(ticket => {
                const latest = byId.get(String(ticket._id));
                if (!latest) return [ticket];
                return latest.purchasable
                    ? [{ ...ticket, quantity: latest.availableQuantity, status: 'in_stock' }] : [];
            }) })),
        }));
    return inventory;
}

/** Returns true when inventory blocks the requested purchase; network failures throw. */
export const validateAndSyncCartStock = async (
    items = useCartStore.getState().items,
    queryClient?: QueryClient,
): Promise<boolean> => {
    const inventory = await validateTicketInventory(items.filter(item => item.quantity > 0), queryClient);
    const invalid = inventory.filter(item => !item.valid);
    if (invalid.length) toast.error(invalid[0].message ?? 'Tồn kho đã thay đổi. Vui lòng chọn lại vé.');
    return invalid.length > 0;
};
