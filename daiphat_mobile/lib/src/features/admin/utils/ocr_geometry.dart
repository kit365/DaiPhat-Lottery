import 'dart:math' as math;
import 'dart:ui';
import '../domain/models/ocr_models.dart';

/// Bboxes may be normalized fractions or pixels in OCR's resized image space.
class OcrBoundingBox {
  final double x, y, width, height;
  final List<Offset> corners;
  const OcrBoundingBox(
    this.x,
    this.y,
    this.width,
    this.height, [
    this.corners = const [],
  ]);
  factory OcrBoundingBox.fromJson(OcrJson data) => OcrBoundingBox(
    ocrDouble(data['x']) ?? 0,
    ocrDouble(data['y']) ?? 0,
    ocrDouble(data['width']) ?? 0,
    ocrDouble(data['height']) ?? 0,
    data['corners'] is List
        ? (data['corners'] as List)
              .whereType<List>()
              .where((p) => p.length >= 2)
              .map((p) => Offset(ocrDouble(p[0]) ?? 0, ocrDouble(p[1]) ?? 0))
              .toList()
        : [],
  );
  bool get normalized =>
      [x, y, width, height].every((v) => v.isFinite && v >= 0 && v <= 1) &&
      width > 0 &&
      height > 0 &&
      x + width <= 1.01 &&
      y + height <= 1.01;
  Rect get rect => Rect.fromLTWH(x, y, width, height);
  List<Offset> get polygon => corners.length == 4
      ? corners
      : [rect.topLeft, rect.topRight, rect.bottomRight, rect.bottomLeft];
  OcrBoundingBox toNaturalPixels(Size coordinateSize, Size naturalSize) {
    if (normalized)
      return OcrBoundingBox(
        x * naturalSize.width,
        y * naturalSize.height,
        width * naturalSize.width,
        height * naturalSize.height,
        corners
            .map(
              (p) => Offset(
                (p.dx <= 1 ? p.dx : p.dx / math.max(coordinateSize.width, 1)) *
                    naturalSize.width,
                (p.dy <= 1 ? p.dy : p.dy / math.max(coordinateSize.height, 1)) *
                    naturalSize.height,
              ),
            )
            .toList(),
      );
    final sx =
        naturalSize.width /
        (coordinateSize.width > 0 ? coordinateSize.width : naturalSize.width);
    final sy =
        naturalSize.height /
        (coordinateSize.height > 0
            ? coordinateSize.height
            : naturalSize.height);
    return OcrBoundingBox(
      x * sx,
      y * sy,
      width * sx,
      height * sy,
      corners.map((p) => Offset(p.dx * sx, p.dy * sy)).toList(),
    );
  }
}

Rect? containedOcrImageRect(Size container, Size natural) {
  if (container.width <= 0 ||
      container.height <= 0 ||
      natural.width <= 0 ||
      natural.height <= 0)
    return null;
  final scale = math.min(
    container.width / natural.width,
    container.height / natural.height,
  );
  return Rect.fromLTWH(
    (container.width - natural.width * scale) / 2,
    (container.height - natural.height * scale) / 2,
    natural.width * scale,
    natural.height * scale,
  );
}

OcrBoundingBox? sourceOcrFieldBox(OcrReviewRow row, String field) {
  final raw = ocrMap(ocrMap(row.data['sourceFieldBoxes'])[field]);
  if (raw.isEmpty) return null;
  final box = OcrBoundingBox.fromJson(raw);
  return box.width > 0 && box.height > 0 ? box : null;
}

bool isInsideOcrTicketFrame(OcrBoundingBox box, OcrBoundingBox frame) {
  final region = frame.rect.inflate(.005);
  final center = box.rect.center;
  if (center.dx < region.left || center.dx > region.right ||
      center.dy < region.top || center.dy > region.bottom) return false;
  final intersection = region.intersect(box.rect);
  final area = box.width * box.height;
  return area > 0 && math.max(0, intersection.width) * math.max(0, intersection.height) / area >= .6;
}
