import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/utils/api_error_message.dart';

void main() {
  test('maps EXPIRED ticket status to Vietnamese message', () {
    const raw =
        'Ve so #9 dang o trang thai EXPIRED nen khong the thuc hien thao tac nay. Trang thai hop le: [IN_STOCK].';
    expect(
      toUserFacingApiMessage(raw),
      'Vé đã chọn đã hết hạn bán nên không thể đặt mua. Vui lòng chọn vé khác.',
    );
  });

  test('maps SOLD_OUT ticket status', () {
    const raw =
        'Ve so #12 dang o trang thai SOLD_OUT nen khong the thuc hien thao tac nay. Trang thai hop le: [IN_STOCK].';
    expect(
      toUserFacingApiMessage(raw),
      'Vé đã chọn đã hết hàng. Vui lòng chọn vé khác.',
    );
  });

  test('keeps unrelated messages', () {
    expect(
      toUserFacingApiMessage('Không thể kết nối đến máy chủ.'),
      'Không thể kết nối đến máy chủ.',
    );
  });
}
