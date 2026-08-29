import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/utils/api_error_message.dart';

void main() {
  test('maps EXPIRED ticket status to Vietnamese message', () {
    const raw =
        'Vé số #9 đang ở trạng thái EXPIRED nên không thể thực hiện thao tác này. Trạng thái hợp lệ: [IN_STOCK].';
    expect(
      toUserFacingApiMessage(raw),
      'Vé đã chọn đã hết hạn bán nên không thể đặt mua. Vui lòng chọn vé khác.',
    );
  });

  test('maps SOLD_OUT ticket status', () {
    const raw =
        'Vé số #12 đang ở trạng thái SOLD_OUT nên không thể thực hiện thao tác này. Trạng thái hợp lệ: [IN_STOCK].';
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
