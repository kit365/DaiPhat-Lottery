export const TICKET_SUGGEST_TOKEN_PREFIX = 'TICKET_SUGGEST:';

export interface ChatSuggestedTicket {
  id: number;
  numbers: string;
  stationId?: number;
  stationName?: string;
  drawDate?: string;
  price?: number;
  /** Số vé còn bán (IN_STOCK). */
  quantity?: number;
}

export interface ParsedTicketSuggest {
  /** Human intro shown above cards (fortune text and/or default caption). */
  text: string;
  tickets: ChatSuggestedTicket[];
  /** True when message had an empty-search vibe but still may include fallback tickets. */
  isEmptyMatch?: boolean;
}

const formatPriceVi = (price?: number): string => {
  if (price == null || Number.isNaN(price)) {
    return '—';
  }
  return `${price.toLocaleString('vi-VN')}đ`;
};

export const formatTicketDrawDate = (drawDate?: string): string => {
  if (!drawDate) {
    return '—';
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(drawDate);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return drawDate;
};

export { formatPriceVi as formatTicketPrice };

const normalizeTicket = (raw: Record<string, unknown>): ChatSuggestedTicket | null => {
  const id = Number(raw.id);
  const numbers = typeof raw.numbers === 'string' ? raw.numbers.trim() : '';
  if (!numbers || Number.isNaN(id)) {
    return null;
  }
  const stationIdRaw = raw.stationId;
  const stationId =
    stationIdRaw == null || stationIdRaw === ''
      ? undefined
      : Number(stationIdRaw);
  const priceRaw = raw.price;
  const price =
    priceRaw == null || priceRaw === ''
      ? undefined
      : Number(priceRaw);
  const quantityRaw = raw.quantity;
  const quantity =
    quantityRaw == null || quantityRaw === ''
      ? undefined
      : Number(quantityRaw);

  return {
    id,
    numbers,
    stationId: stationId != null && !Number.isNaN(stationId) ? stationId : undefined,
    stationName: typeof raw.stationName === 'string' ? raw.stationName : undefined,
    drawDate: typeof raw.drawDate === 'string' ? raw.drawDate : undefined,
    price: price != null && !Number.isNaN(price) ? price : undefined,
    quantity: quantity != null && !Number.isNaN(quantity) ? Math.max(0, quantity) : undefined,
  };
};

/**
 * Parses machine content that is either bare `TICKET_SUGGEST:[...]`
 * or leading human text followed by the token (fortune append).
 */
export const parseTicketSuggestToken = (content: string): ParsedTicketSuggest | null => {
  const text = content?.trim() ?? '';
  if (!text) {
    return null;
  }

  const tokenIndex = text.indexOf(TICKET_SUGGEST_TOKEN_PREFIX);
  if (tokenIndex < 0) {
    return null;
  }

  const leading = text.slice(0, tokenIndex).trim();
  const jsonPart = text.slice(tokenIndex + TICKET_SUGGEST_TOKEN_PREFIX.length).trim();

  try {
    const parsed = JSON.parse(jsonPart) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const tickets = parsed
      .map((item) =>
        item && typeof item === 'object'
          ? normalizeTicket(item as Record<string, unknown>)
          : null
      )
      .filter((ticket): ticket is ChatSuggestedTicket => ticket !== null);

    if (tickets.length === 0) {
      if (leading) {
        return {
          text: leading,
          tickets: [],
          isEmptyMatch: /chưa có|không có số|kho chưa/i.test(leading),
        };
      }
      return null;
    }

    const defaultText =
      tickets.length === 1
        ? 'Dưới đây là 1 vé đang bán cho kỳ quay sắp tới dành cho quý khách:'
        : `Dưới đây là ${tickets.length} vé đang bán cho kỳ quay sắp tới dành cho quý khách:`;

    return {
      text: leading || defaultText,
      tickets,
      isEmptyMatch: /chưa có|không có số|kho chưa/i.test(leading),
    };
  } catch {
    return null;
  }
};

/** Human-readable text without the machine `TICKET_SUGGEST:` payload. */
export const stripTicketSuggestToken = (content: string): string => {
  const text = stripChatInternalParams(content);
  if (!text) {
    return '';
  }

  const parsed = parseTicketSuggestToken(text);
  if (parsed?.text) {
    return parsed.text;
  }

  const tokenIndex = text.indexOf(TICKET_SUGGEST_TOKEN_PREFIX);
  if (tokenIndex < 0) {
    return text;
  }

  const leading = text.slice(0, tokenIndex).trim();
  return leading || 'Đại Phát đã gửi gợi ý vé số cho khách.';
};

/** Formats bot content for staff/admin chat (no raw JSON tokens). */
export const formatChatMessageContent = (content: string): string => {
  const text = stripChatInternalParams(content);
  if (!text) {
    return '';
  }

  const parsed = parseTicketSuggestToken(text);
  if (!parsed) {
    return stripTicketSuggestToken(text);
  }

  const lines = [parsed.text].filter(Boolean);
  if (parsed.tickets.length > 0) {
    const ticketLines = parsed.tickets.map((ticket) => {
      const station = ticket.stationName ? ` (${ticket.stationName})` : '';
      const price =
        ticket.price != null && !Number.isNaN(ticket.price)
          ? ` — ${ticket.price.toLocaleString('vi-VN')}đ`
          : '';
      return `• ${ticket.numbers}${station}${price}`;
    });
    lines.push(ticketLines.join('\n'));
  }
  return lines.join('\n\n');
};

/** Removes internal control params (e.g. `|exclude=1,2,3`) from customer-visible text. */
export const stripChatInternalParams = (content: string): string => {
  const text = content?.trim() ?? '';
  if (!text) {
    return '';
  }
  return text.replace(/\|\s*exclude=[0-9,\s]+/gi, '').trim();
};

/** Customer message display for staff — never show API control params. */
export const formatCustomerChatMessageContent = (content: string): string => {
  const cleaned = stripChatInternalParams(content);
  if (!cleaned) {
    return '';
  }
  if (/^gợi ý vé số cho tôi$/i.test(cleaned) || /^gợi ý vé$/i.test(cleaned)) {
    return 'Gợi ý vé số';
  }
  return cleaned;
};

/**
 * Splits fortune/advisory prose from the ticket intro line so the UI can show
 * a bot bubble first, then "Dưới đây là các vé..." + cards.
 * Legacy status lines ("Đang tìm vé...", "tìm thấy...", "Gợi ý...") are dropped.
 */
export const splitTicketSuggestText = (
  text: string
): { reply: string; caption: string } => {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) {
    return { reply: '', caption: '' };
  }

  const isLegacyStatusLine = (part: string): boolean => {
    const line = part.trim();
    return /^(đang|Đang)\s+tìm vé(?:\s|:|$)/.test(line)
      || /^(đại phát|Đại Phát)\s+(gợi ý|tìm thấy)(?:\s|$)/.test(line)
      || /^(gợi ý|tìm thấy)(?:\s|$)/.test(line);
  };

  const isTicketIntroLine = (part: string): boolean => {
    const line = part.trim();
    return /^(dưới đây|Dưới đây)\s+là(?:\s|$)/.test(line)
      || /^(hiện|Hiện)\s+(Đại Phát|đại phát|kho)\s+chưa có vé(?:\s|$)/.test(line)
      || /^(một số|Một số)\s+vé đang bán(?:\s|$)/.test(line)
      || /trong lúc đó,\s+dưới đây là/i.test(line);
  };

  const parts = trimmed
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !isLegacyStatusLine(part));

  if (parts.length === 0) {
    return { reply: '', caption: '' };
  }

  if (parts.length === 1) {
    const only = parts[0] ?? '';
    if (isTicketIntroLine(only)) {
      return { reply: '', caption: only };
    }
    return { reply: only, caption: '' };
  }

  const last = parts[parts.length - 1] ?? '';
  if (isTicketIntroLine(last)) {
    return {
      reply: parts.slice(0, -1).join('\n\n'),
      caption: last,
    };
  }

  return {
    reply: parts.join('\n\n'),
    caption: '',
  };
};
