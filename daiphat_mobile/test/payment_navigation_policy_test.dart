import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/features/checkout/utils/payment_navigation_policy.dart';

void main() {
  const policy = PaymentNavigationPolicy();

  test('only accepts the PayOS HTTPS checkout origin', () {
    expect(
      policy.isTrustedCheckoutUrl('https://pay.payos.vn/web/checkout-id'),
      isTrue,
    );
    expect(
      policy.isTrustedCheckoutUrl('https://pay.payos.vn.evil.test/web/id'),
      isFalse,
    );
    expect(policy.isTrustedCheckoutUrl('http://pay.payos.vn/web/id'), isFalse);
  });

  test('does not treat arbitrary payment parameters as callbacks', () {
    expect(
      policy.isCallbackUrl('https://evil.test/payment?code=00&orderCode=123'),
      isFalse,
    );
    expect(policy.isCallbackUrl('daiphat://payment?code=00'), isTrue);
    expect(policy.isCallbackUrl('https://dai-phat.vn/payment?code=00'), isTrue);
  });

  test('accepts standard PayOS return and cancel callback URLs', () {
    expect(
      policy.isCallbackUrl(
        'https://daiphat.id.vn/payment/payos/return?code=00&status=PAID&orderCode=123',
      ),
      isTrue,
    );
    expect(
      policy.isCallbackUrl(
        'https://www.dai-phat.vn/payment/payos/cancel?code=01&cancel=true',
      ),
      isTrue,
    );
    expect(
      policy.isCallbackUrl(
        'http://localhost:3000/payment/payos/return?code=00&status=PAID',
      ),
      isTrue,
    );
    expect(
      policy.isCallbackUrl(
        'http://10.0.2.2:5173/payment/payos/return?code=00',
      ),
      isTrue,
    );
  });

  test('configured callbackBaseUrl supports custom staging or external origins', () {
    const configured = PaymentNavigationPolicy(
      callbackBaseUrl: 'https://staging.daiphat.id.vn/payment/payos/return',
    );
    expect(
      configured.isCallbackUrl(
        'https://staging.daiphat.id.vn/payment/payos/return?code=00&status=PAID',
      ),
      isTrue,
    );
    expect(
      configured.isCallbackUrl(
        'https://staging.daiphat.id.vn/payment/payos/return/unrelated?code=00',
      ),
      isFalse,
    );
  });
}
