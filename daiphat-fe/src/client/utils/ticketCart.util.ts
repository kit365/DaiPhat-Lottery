import { useCartStore } from '../../stores/useCartStore';
import { AppToast as toast } from '../../utils/toast.util';
import { PublicLotteryTicket } from '../../types/lottery-ticket.type';

interface AddTicketToCartParams {
    ticket: PublicLotteryTicket;
    stationName: string;
    drawTime?: string;
    dateLabel: string;
    quantity?: number;
}

/** Số vé còn bán theo DB (IN_STOCK). */
export const getTicketStock = (ticket: PublicLotteryTicket): number =>
    Math.max(0, Number(ticket.quantity ?? 0));

/** Số lượng vé này đang có trong giỏ. */
export const getCartQtyForTicket = (ticketId: string | number): number => {
    const item = useCartStore.getState().items.find((i) => i.id === String(ticketId));
    return item?.quantity ?? 0;
};

/** Vé đã hết hàng — nên ẩn khỏi danh sách bán. */
export const isTicketSoldOut = (ticket: PublicLotteryTicket): boolean => {
    if (ticket.quantity == null) return false;
    return getTicketStock(ticket) <= 0;
};

export const ticketSaleGroupKey = (ticket: PublicLotteryTicket): string =>
    `${ticket.stationId ?? ticket.providerId ?? ''}|${ticket.numbers}|${ticket.drawDate ?? ''}`;

export type GroupedPublicTicket = PublicLotteryTicket & {
    groupKey: string;
    stock: number;
};

const ticketDisplayStock = (ticket: PublicLotteryTicket): number =>
    ticket.quantity == null ? 1 : getTicketStock(ticket);

/** Gom nhiều serial cùng số / đài / ngày thành 1 dòng bán. */
export const groupSellableTickets = (tickets: PublicLotteryTicket[]): GroupedPublicTicket[] => {
    const map = new Map<string, GroupedPublicTicket>();
    for (const ticket of filterSellableTickets(tickets)) {
        const groupKey = ticketSaleGroupKey(ticket);
        const stock = ticketDisplayStock(ticket);
        if (stock <= 0) continue;
        const existing = map.get(groupKey);
        if (!existing) {
            map.set(groupKey, { ...ticket, groupKey, stock, quantity: stock });
        } else {
            existing.stock += stock;
            existing.quantity = existing.stock;
        }
    }
    return Array.from(map.values());
};

/**
 * Đã đủ số lượng trong giỏ so với tồn DB
 * (vd: còn 1 vé và đã thêm 1 vào giỏ → không cho mua thêm).
 */
export const isTicketAtCartLimit = (ticket: PublicLotteryTicket): boolean => {
    const stock = getTicketStock(ticket);
    if (stock <= 0) return true;
    return getCartQtyForTicket(ticket.id) >= stock;
};

export const canAddTicketToCart = (ticket: PublicLotteryTicket, quantity = 1): boolean => {
    const stock = getTicketStock(ticket);
    if (stock <= 0) return false;
    return getCartQtyForTicket(ticket.id) + quantity <= stock;
};

/** Lọc bỏ vé hết hàng khỏi danh sách bán. */
export const filterSellableTickets = (tickets: PublicLotteryTicket[]): PublicLotteryTicket[] =>
    tickets.filter((ticket) => !isTicketSoldOut(ticket));

export const addPublicTicketToCart = ({
    ticket,
    stationName,
    drawTime = '',
    dateLabel,
    quantity = 1,
}: AddTicketToCartParams): boolean => {
    if (!ticket?.id) {
        toast.error('Không tìm thấy thông tin vé');
        return false;
    }

    const maxAvailableQty = getTicketStock(ticket);
    const currentCartQty = getCartQtyForTicket(ticket.id);

    if (maxAvailableQty <= 0) {
        toast.error(`Vé số ${ticket.numbers} đã hết hàng`);
        return false;
    }

    if (currentCartQty + quantity > maxAvailableQty) {
        toast.error(`Vé số ${ticket.numbers} chỉ còn ${maxAvailableQty} vé (bạn đã có ${currentCartQty} vé trong giỏ)`);
        return false;
    }

    useCartStore.getState().addItem({
        id: String(ticket.id),
        province: stationName,
        date: dateLabel,
        time: drawTime,
        kyHieu: ticket.serialNumber || 'VE',
        numbers: ticket.numbers,
        price: ticket.priceSnapshot ?? 10000,
        quantity,
        color: '#f59e0b',
        maxStock: maxAvailableQty,
    });

    toast.success(`Đã thêm vé ${ticket.numbers} vào giỏ hàng`);
    return true;
};
