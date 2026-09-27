import 'package:image_picker/image_picker.dart';
import '../../../../shared/network/api_client.dart';
import '../../domain/models/ocr_models.dart';
import 'ticket_ocr_service.dart';

/// Same template, layout and rule contracts as the website. Rule execution and
/// reference lookups stay on the backend, shared by web and mobile scans.
class OcrTemplateService {
  final ApiClient client;
  OcrTemplateService(this.client);
  static const base = '/ocr-templates';
  Future<OcrJson> defaultReady() async => TicketOcrService.requireData(
    await client.get(
      '$base/default-ready',
      timeout: const Duration(seconds: 30),
    ),
  );
  Future<List<OcrJson>> listByStation(int stationId) async => ocrMaps(
    (await client.get(
      base,
      queryParameters: {'stationId': stationId},
      timeout: const Duration(seconds: 30),
    ))['data'],
  );
  Future<OcrJson> create(OcrJson payload) async =>
      TicketOcrService.requireData(await client.post(base, data: payload));
  Future<OcrJson> setDefault(int id) async =>
      TicketOcrService.requireData(await client.post('$base/$id/set-default'));
  Future<OcrJson> uploadSample(int id, XFile file) async =>
      TicketOcrService.requireData(
        await client.post(
          '$base/$id/sample-image',
          data: await TicketOcrService(client).imageForm(file),
          timeout: const Duration(seconds: 120),
        ),
      );
  Future<OcrJson> clearSample(int id) async => TicketOcrService.requireData(
    await client.delete('$base/$id/sample-image'),
  );
  Future<List<OcrJson>> fieldLayouts(int templateId) async =>
      ocrMaps((await client.get('$base/$templateId/field-layouts'))['data']);
  Future<OcrJson> createFieldLayout(int templateId, OcrJson payload) async =>
      TicketOcrService.requireData(
        await client.post('$base/$templateId/field-layouts', data: payload),
      );
  Future<OcrJson> updateFieldLayout(
    int templateId,
    int layoutId,
    OcrJson payload,
  ) async => TicketOcrService.requireData(
    await client.put(
      '$base/$templateId/field-layouts/$layoutId',
      data: payload,
    ),
  );
  Future<void> deleteFieldLayout(int templateId, int layoutId) async {
    await client.delete('$base/$templateId/field-layouts/$layoutId');
  }

  Future<List<OcrJson>> validationRules(int templateId) async =>
      ocrMaps((await client.get('$base/$templateId/validation-rules'))['data']);
  Future<OcrJson> createValidationRule(int templateId, OcrJson payload) async =>
      TicketOcrService.requireData(
        await client.post('$base/$templateId/validation-rules', data: payload),
      );
  Future<OcrJson> updateValidationRule(
    int templateId,
    int ruleId,
    OcrJson payload,
  ) async => TicketOcrService.requireData(
    await client.put(
      '$base/$templateId/validation-rules/$ruleId',
      data: payload,
    ),
  );
  Future<void> deleteValidationRule(int templateId, int ruleId) async {
    await client.delete('$base/$templateId/validation-rules/$ruleId');
  }
}
