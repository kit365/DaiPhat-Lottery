import React from 'react';
import type { ChatSuggestedTicket } from '../../utils/ticketSuggestToken.util';
import { formatTicketDrawDate, formatTicketPrice } from '../../utils/ticketSuggestToken.util';

export interface ChatTicketSuggestCardsProps {
  tickets: ChatSuggestedTicket[];
  onBuy: (ticket: ChatSuggestedTicket) => void;
  disabled?: boolean;
}

export const ChatTicketSuggestCards = ({
  tickets,
  onBuy,
  disabled = false,
}: ChatTicketSuggestCardsProps) => {
  if (!tickets.length) {
    return null;
  }

  return (
    <div className="flex gap-2 w-full max-w-[95%] overflow-x-auto flex-nowrap pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tickets.map((ticket) => (
        <article
          key={ticket.id}
          className="shrink-0 w-[148px] bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-3 flex flex-col gap-2"
        >
          <div className="font-mono font-bold text-[22px] leading-none tracking-wider text-[#212B36] tabular-nums">
            {ticket.numbers}
          </div>
          <div className="text-[11px] leading-snug text-slate-500">
            <div className="truncate">{ticket.stationName || '—'}</div>
            <div>{formatTicketDrawDate(ticket.drawDate)}</div>
            <div className="font-semibold text-[#ee1314] mt-0.5">{formatTicketPrice(ticket.price)}</div>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onBuy(ticket)}
            className="mt-auto w-full py-1.5 text-[12px] font-semibold text-white bg-[#ee1314] rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Mua ngay
          </button>
        </article>
      ))}
    </div>
  );
};
