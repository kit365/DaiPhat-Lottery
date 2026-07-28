import { describe, expect, it } from 'vitest';
import { OrderType } from '../types/order.type';
import { PaymentGateway, TransactionType } from '../types/transaction.type';
import { resolveOrderPaymentMethodLabel } from './orderPayment.util';

describe('resolveOrderPaymentMethodLabel', () => {
  it('returns PayOS label for online-only counter order', () => {
    expect(
      resolveOrderPaymentMethodLabel(
        [{ id: 1, type: TransactionType.ONLINE, gateway: PaymentGateway.PAYOS, amount: 10000 } as any],
        OrderType.DIRECT
      )
    ).toBe('PayOS (Chuyển khoản QR)');
  });

  it('returns cash for offline-only direct order', () => {
    expect(
      resolveOrderPaymentMethodLabel(
        [{ id: 1, type: TransactionType.OFFLINE, gateway: PaymentGateway.PAYOS, amount: 10000 } as any],
        OrderType.DIRECT
      )
    ).toBe('Tiền mặt');
  });

  it('returns combined label for partial payment', () => {
    expect(
      resolveOrderPaymentMethodLabel(
        [
          { id: 1, type: TransactionType.OFFLINE, gateway: PaymentGateway.PAYOS, amount: 5000 } as any,
          { id: 2, type: TransactionType.ONLINE, gateway: PaymentGateway.PAYOS, amount: 5000 } as any,
        ],
        OrderType.DIRECT
      )
    ).toBe('Tiền mặt + Chuyển khoản');
  });
});
