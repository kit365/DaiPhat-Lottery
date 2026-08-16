import React from 'react';
import { motion } from 'framer-motion';
import type { ChatSuggestedTicket } from '../../utils/ticketSuggestToken.util';
import { formatTicketDrawDate, formatTicketPrice } from '../../utils/ticketSuggestToken.util';
import { PublicLotteryTicket } from '../../../types/lottery-ticket.type';
import { useCartStore } from '../../../stores/useCartStore';
import {
  addPublicTicketToCart,
  isTicketAtCartLimit,
} from '../../utils/ticketCart.util';
import { LuckyNumber } from '../ui/LuckyNumber';

export interface ChatTicketSuggestCardsProps {
  tickets: ChatSuggestedTicket[];
  onBuy: (ticket: ChatSuggestedTicket) => void;
  disabled?: boolean;
}

const toPublicTicket = (ticket: ChatSuggestedTicket): PublicLotteryTicket => {
  const cartItem = useCartStore.getState().items.find((i) => i.id === String(ticket.id));
  const stock =
    ticket.quantity != null
      ? ticket.quantity
      : (cartItem?.maxStock ?? 1);

  return {
    id: ticket.id,
    stationId: ticket.stationId ?? 0,
    stationName: ticket.stationName,
    numbers: ticket.numbers,
    drawDate: ticket.drawDate ?? '',
    priceSnapshot: ticket.price,
    quantity: Math.max(0, stock),
  };
};

export const ChatTicketSuggestCards = ({
  tickets,
  onBuy,
  disabled = false,
}: ChatTicketSuggestCardsProps) => {
  // Subscribe để nút thêm giỏ cập nhật ngay khi giỏ thay đổi
  useCartStore((s) => s.items);

  if (!tickets.length) {
    return null;
  }

  const handleAddToCart = (ticket: ChatSuggestedTicket) => {
    const publicTicket = toPublicTicket(ticket);
    if (isTicketAtCartLimit(publicTicket)) return;
    addPublicTicketToCart({
      ticket: publicTicket,
      stationName: ticket.stationName || 'Vé số',
      dateLabel: formatTicketDrawDate(ticket.drawDate),
    });
  };

  return (
    <div className="flex gap-2 w-full max-w-[95%] overflow-x-auto flex-nowrap pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tickets.map((ticket, index) => {
        const publicTicket = toPublicTicket(ticket);
        const atLimit = isTicketAtCartLimit(publicTicket);
        const cartDisabled = disabled || atLimit;

        return (
          <motion.article
            key={ticket.id}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.26, ease: 'easeOut', delay: Math.min(index * 0.05, 0.2) }}
            className="shrink-0 w-[148px] bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-3 flex flex-col gap-2"
          >
            <div className="font-mono font-bold text-[22px] leading-none tracking-wider text-[#212B36] tabular-nums">
              <LuckyNumber value={ticket.numbers} ticket className="text-[22px] tracking-wider" />
            </div>
            <div className="text-[11px] leading-snug text-slate-500">
              <div className="truncate">{ticket.stationName || '—'}</div>
              <div>{formatTicketDrawDate(ticket.drawDate)}</div>
              <div className="font-semibold text-[#ee1314] mt-0.5">{formatTicketPrice(ticket.price)}</div>
            </div>
            <div className="mt-auto flex items-center gap-1.5">
              <button
                type="button"
                disabled={cartDisabled}
                title={atLimit ? 'Đã đủ số lượng trong giỏ' : 'Thêm giỏ hàng'}
                aria-label={atLimit ? 'Đã đủ số lượng trong giỏ' : 'Thêm giỏ hàng'}
                onClick={() => handleAddToCart(ticket)}
                className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
                  atLimit
                    ? 'bg-[#C4CDD5] text-white border border-[#C4CDD5] cursor-not-allowed'
                    : 'border border-[#ee1314] text-[#ee1314] bg-white hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed'
                }`}
              >
                <i className="fa-solid fa-cart-plus text-[11px]"></i>
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onBuy(ticket)}
                className="flex-1 min-w-0 py-1.5 text-[12px] font-semibold text-white bg-[#ee1314] rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Mua ngay
              </button>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
};
