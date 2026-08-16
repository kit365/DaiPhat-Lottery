'use client';

import { Box, Stack, Typography } from '@mui/material';
import type { ChatSuggestedTicket } from '../../../../../client/utils/ticketSuggestToken.util';
import {
  formatTicketDrawDate,
  formatTicketPrice,
} from '../../../../../client/utils/ticketSuggestToken.util';
import { AdminLuckyDisplay } from '@/shared/lucky-number';

export interface AdminChatTicketSuggestCardsProps {
  tickets: ChatSuggestedTicket[];
}

/** Read-only ticket cards for admin chat (no buy/cart actions). */
export const AdminChatTicketSuggestCards = ({ tickets }: AdminChatTicketSuggestCardsProps) => {
  if (!tickets.length) {
    return null;
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        mt: 1,
        width: '100%',
        overflowX: 'auto',
        pb: 0.5,
        '&::-webkit-scrollbar': { height: 4 },
      }}
    >
      {tickets.map((ticket) => (
        <Box
          key={ticket.id}
          sx={{
            flex: '0 0 auto',
            width: 148,
            px: 1.5,
            py: 1.25,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <AdminLuckyDisplay
            value={ticket.numbers}
            ticket
            sx={{
              fontWeight: 700,
              fontSize: '1.25rem',
              letterSpacing: '0.06em',
              lineHeight: 1.1,
              color: 'text.primary',
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, lineHeight: 1.35 }}>
            {ticket.stationName || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
            {formatTicketDrawDate(ticket.drawDate)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 0.5, fontWeight: 700, color: 'error.main', lineHeight: 1.35 }}
          >
            {formatTicketPrice(ticket.price)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};
