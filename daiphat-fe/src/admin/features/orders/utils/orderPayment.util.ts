import { OrderType } from '@/types/order.type';
import { PaymentGateway, TransactionResponse, TransactionType } from '@/types/transaction.type';

const isPaymentTransaction = (tx: TransactionResponse) =>
    tx.type === TransactionType.OFFLINE || tx.type === TransactionType.ONLINE;

/** Suy ra nhãn phương thức thanh toán từ danh sách giao dịch của đơn. */
export const resolveOrderPaymentMethodLabel = (
    transactions?: TransactionResponse[] | null,
    orderType?: OrderType | string | null,
): string => {
    const paymentTxs = (transactions ?? []).filter(isPaymentTransaction);

    if (paymentTxs.length === 0) {
        return orderType === OrderType.DIRECT || orderType === 'DIRECT'
            ? 'Tiền mặt'
            : 'PayOS (Chuyển khoản QR)';
    }

    const types = new Set(paymentTxs.map((tx) => tx.type));

    if (types.has(TransactionType.OFFLINE) && types.has(TransactionType.ONLINE)) {
        return 'Tiền mặt + Chuyển khoản';
    }

    if (types.has(TransactionType.ONLINE)) {
        const onlineTx = paymentTxs.find((tx) => tx.type === TransactionType.ONLINE);
        if (onlineTx?.gateway === PaymentGateway.PAYOS) {
            return 'PayOS (Chuyển khoản QR)';
        }
        return 'Chuyển khoản';
    }

    return 'Tiền mặt';
};
