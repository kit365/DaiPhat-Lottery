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

  test('configured callbacks require an exact origin and path match', () {
    const configured = PaymentNavigationPolicy(
      callbackBaseUrl: 'https://api.dai-phat.vn/payment/payos/return',
    );
    expect(
      configured.isCallbackUrl(
        'https://api.dai-phat.vn/payment/payos/return?code=00',
      ),
      isTrue,
    );
    expect(
      configured.isCallbackUrl(
        'https://api.dai-phat.vn/payment/payos/return/fake?code=00',
      ),
      isFalse,
    );
  });
}
