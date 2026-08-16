/**
 * Đổi thông báo lỗi kỹ thuật từ API sang câu dễ hiểu cho người dùng (client).
 */
export function toUserFacingApiMessage(raw?: string | null): string {
    const message = (raw ?? '').trim();
    if (!message) {
        return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
    }

    const ticketStatusMatch = message.match(
        /[Vv]e\s+so\s+#?(\d+)\s+dang\s+o\s+trang\s+thai\s+(\w+)/i
    );
    if (ticketStatusMatch) {
        return ticketUnavailableMessage(ticketStatusMatch[2]?.toUpperCase());
    }

    const unicodeMatch = message.match(
        /[Vv]é\s+số\s+#?(\d+).{0,40}trạng\s*thái\s+(\w+)/i
    );
    if (unicodeMatch) {
        return ticketUnavailableMessage(unicodeMatch[2]?.toUpperCase());
    }

    if (/\bEXPIRED\b/.test(message) && /(vé|ticket|trang thai|trạng thái)/i.test(message)) {
        return 'Vé đã chọn đã hết hạn bán nên không thể đặt mua. Vui lòng chọn vé khác.';
    }
    if (/\bSOLD_OUT\b/.test(message)) {
        return 'Vé đã chọn đã hết hàng. Vui lòng chọn vé khác.';
    }
    if (/\bIMPORTING\b/.test(message)) {
        return 'Vé đã chọn chưa sẵn sàng bán. Vui lòng chọn vé khác.';
    }

    return message;
}

function ticketUnavailableMessage(status?: string): string {
    switch (status) {
        case 'EXPIRED':
            return 'Vé đã chọn đã hết hạn bán nên không thể đặt mua. Vui lòng chọn vé khác.';
        case 'SOLD_OUT':
            return 'Vé đã chọn đã hết hàng. Vui lòng chọn vé khác.';
        case 'IMPORTING':
            return 'Vé đã chọn chưa sẵn sàng bán. Vui lòng chọn vé khác.';
        default:
            return 'Vé đã chọn hiện không thể đặt mua. Vui lòng chọn vé khác.';
    }
}
