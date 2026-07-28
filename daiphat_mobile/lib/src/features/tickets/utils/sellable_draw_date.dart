/// Logic ngày bán vé — khớp FE `sellableDrawDate.util.ts` và BE DrawScheduleUtils.
class SellableDrawDate {
  SellableDrawDate._();

  /// Giờ xổ miền Nam mặc định (16:15 VN).
  static const int defaultDrawHour = 16;
  static const int defaultDrawMinute = 15;

  static const Duration _vietnamOffset = Duration(hours: 7);

  /// Thời điểm hiện tại theo múi giờ Việt Nam (UTC+7).
  static DateTime vietnamNow([DateTime? now]) {
    final utc = (now ?? DateTime.now()).toUtc();
    return utc.add(_vietnamOffset);
  }

  static DateTime todayVn([DateTime? now]) {
    final vn = vietnamNow(now);
    return DateTime(vn.year, vn.month, vn.day);
  }

  static DateTime tomorrowVn([DateTime? now]) {
    return todayVn(now).add(const Duration(days: 1));
  }

  static String toIsoDate(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  static String todayIsoVn([DateTime? now]) => toIsoDate(todayVn(now));

  static String tomorrowIsoVn([DateTime? now]) => toIsoDate(tomorrowVn(now));

  /// true khi đã tới/qua giờ xổ hôm nay (vé hôm nay không còn bán).
  static bool isTodayDrawPassed([DateTime? now]) {
    final vn = vietnamNow(now);
    final minutes = vn.hour * 60 + vn.minute;
    return minutes >= defaultDrawHour * 60 + defaultDrawMinute;
  }

  /// Ngày quay mặc định khi mở “vé đang bán”.
  static String defaultSellableDrawDateIso([DateTime? now]) {
    return isTodayDrawPassed(now) ? tomorrowIsoVn(now) : todayIsoVn(now);
  }
}
