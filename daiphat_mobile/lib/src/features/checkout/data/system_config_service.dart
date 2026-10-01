import 'package:daiphat_mobile/src/shared/network/api_client.dart';

class SiteOperatingHours {
  final int openHour;
  final int closeHour;
  final String openTime;
  final String closeTime;

  const SiteOperatingHours({
    this.openHour = 8,
    this.closeHour = 22,
    this.openTime = '08:00',
    this.closeTime = '22:00',
  });

  @override
  String toString() => 'SiteOperatingHours($openTime - $closeTime)';
}

class SystemConfigService {
  final ApiClient _apiClient;

  SystemConfigService({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<SiteOperatingHours> getOperatingHours() async {
    try {
      final res = await _apiClient.get(
        '/public/system-configs/batch',
        queryParameters: {
          'keys': 'SITE_SUPPORT_OPEN_TIME,SITE_SUPPORT_CLOSE_TIME',
        },
        includeAuth: false,
      );

      final data = res['data'];
      String openStr = '08:00';
      String closeStr = '22:00';

      if (data is Map<String, dynamic>) {
        final openObj = data['SITE_SUPPORT_OPEN_TIME'];
        final closeObj = data['SITE_SUPPORT_CLOSE_TIME'];
        if (openObj is Map && openObj['configValue'] != null) {
          final val = openObj['configValue'].toString().trim();
          if (val.isNotEmpty) openStr = val;
        }
        if (closeObj is Map && closeObj['configValue'] != null) {
          final val = closeObj['configValue'].toString().trim();
          if (val.isNotEmpty) closeStr = val;
        }
      }

      final openHour = int.tryParse(openStr.split(':').first) ?? 8;
      final closeHour = int.tryParse(closeStr.split(':').first) ?? 22;

      return SiteOperatingHours(
        openHour: openHour,
        closeHour: closeHour,
        openTime: openStr,
        closeTime: closeStr,
      );
    } catch (_) {
      // Fallback khi offline hoặc lỗi API
      return const SiteOperatingHours();
    }
  }

  Future<String> getSitePhone() async {
    try {
      final res = await _apiClient.get(
        '/public/system-configs/batch',
        queryParameters: {
          'keys': 'SITE_PHONE',
        },
        includeAuth: false,
      );

      final data = res['data'];
      if (data is Map<String, dynamic>) {
        final phoneObj = data['SITE_PHONE'];
        if (phoneObj is Map && phoneObj['configValue'] != null) {
          final val = phoneObj['configValue'].toString().trim();
          if (val.isNotEmpty) return val;
        }
      }
      return '1900 636 365';
    } catch (_) {
      return '1900 636 365';
    }
  }
}
