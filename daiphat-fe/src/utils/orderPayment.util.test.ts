import { describe, expect, it } from 'vitest';
import { OrderType } from '../types/order.type';
import { PaymentGateway, TransactionResponse, TransactionStatus, TransactionType } from '../types/transaction.type';
import { resolveOrderPaymentMethodLabel } from './orderPayment.util';

const createMockTransaction = (overrides: Partial<TransactionResponse>): TransactionResponse => ({
  id: 1,
  amount: 10000,
  gateway: PaymentGateway.PAYOS,
  gatewayOrderCode: 123456,
  paymentRef: 'REF123',
  status: TransactionStatus.COMPLETED,
  type: TransactionType.ONLINE,
  ...overrides,
});

describe('resolveOrderPaymentMethodLabel', () => {
  it('returns PayOS label for online-only counter order', () => {
    expect(
      resolveOrderPaymentMethodLabel(
        [createMockTransaction({ id: 1, type: TransactionType.ONLINE, gateway: PaymentGateway.PAYOS, amount: 10000 })],
        OrderType.DIRECT
      )
    ).toBe('PayOS (Chuyển khoản QR)');
  });

  it('returns cash for offline-only direct order', () => {
    expect(
      resolveOrderPaymentMethodLabel(
        [createMockTransaction({ id: 1, type: TransactionType.OFFLINE, gateway: PaymentGateway.PAYOS, amount: 10000 })],
        OrderType.DIRECT
      )
    ).toBe('Tiền mặt');
  });

  it('returns combined label for partial payment', () => {
    expect(
      resolveOrderPaymentMethodLabel(
        [
          createMockTransaction({ id: 1, type: TransactionType.OFFLINE, gateway: PaymentGateway.PAYOS, amount: 5000 }),
          createMockTransaction({ id: 2, type: TransactionType.ONLINE, gateway: PaymentGateway.PAYOS, amount: 5000 }),
        ],
        OrderType.DIRECT
      )
    ).toBe('Tiền mặt + Chuyển khoản');
  });
});
