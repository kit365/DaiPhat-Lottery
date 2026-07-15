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

    const maxAvailableQty = ticket.quantity ?? 1;
    const currentCartItem = useCartStore.getState().items.find((i) => i.id === String(ticket.id));
    const currentCartQty = currentCartItem?.quantity ?? 0;

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
    });

    toast.success(`Đã thêm vé ${ticket.numbers} vào giỏ hàng`);
    return true;
};
