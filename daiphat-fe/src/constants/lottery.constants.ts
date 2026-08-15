/** Khớp enum LotteryTicketStatus trên backend — dùng khi lọc vé còn bán. */
export enum LotteryTicketStatus {
    IMPORTING = 'IMPORTING',
    IN_STOCK = 'IN_STOCK',
    SOLD_OUT = 'SOLD_OUT',
    EXPIRED = 'EXPIRED',
}
