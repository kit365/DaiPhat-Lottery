import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:daiphat_mobile/src/features/admin/presentation/widgets/full_screen_photo_viewer.dart';

void main() {
  group('FullScreenPhotoViewer Widget Tests', () {
    testWidgets('renders photo viewer with single photo', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: FullScreenPhotoViewer(
              items: ['assets/images/placeholder.png'],
              canDelete: true,
            ),
          ),
        ),
      );

      expect(find.text('Vé 1 / 1'), findsOneWidget);
      expect(find.byIcon(Icons.close), findsOneWidget);
      expect(find.byIcon(Icons.delete_outline_rounded), findsOneWidget);
    });

    testWidgets('renders photo viewer with multiple photos and navigates', (tester) async {
      final items = [
        'assets/images/ticket1.png',
        'assets/images/ticket2.png',
        'assets/images/ticket3.png',
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FullScreenPhotoViewer(
              items: items,
              initialIndex: 0,
              canDelete: true,
            ),
          ),
        ),
      );

      expect(find.text('Vé 1 / 3'), findsOneWidget);

      // Swipe to next photo
      await tester.drag(find.byType(PageView), const Offset(-500, 0));
      await tester.pumpAndSettle();

      expect(find.text('Vé 2 / 3'), findsOneWidget);
    });

    testWidgets('calls onDelete callback when photo is deleted', (tester) async {
      int? deletedIndex;
      final items = [
        XFile('/tmp/test_ticket_1.jpg'),
        XFile('/tmp/test_ticket_2.jpg'),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FullScreenPhotoViewer(
              items: items,
              initialIndex: 0,
              canDelete: true,
              onDelete: (index) {
                deletedIndex = index;
              },
            ),
          ),
        ),
      );

      expect(find.text('Vé 1 / 2'), findsOneWidget);

      // Tap delete button to open confirm dialog
      await tester.tap(find.byIcon(Icons.delete_outline_rounded));
      await tester.pumpAndSettle();

      expect(find.text('Xóa ảnh này?'), findsOneWidget);

      // Confirm delete
      await tester.tap(find.text('Xóa'));
      await tester.pumpAndSettle();

      expect(deletedIndex, 0);
      expect(find.text('Vé 1 / 1'), findsOneWidget);
    });
  });
}
