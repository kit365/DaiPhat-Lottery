import 'package:flutter_riverpod/flutter_riverpod.dart';

class BuyTicketState {
  final String selectedDate;
  final String dateDetail;
  final String selectedProvince;
  final String provinceDetail;
  final String? selectedNumber;
  final int quantity;

  BuyTicketState({
    required this.selectedDate,
    required this.dateDetail,
    required this.selectedProvince,
    required this.provinceDetail,
    this.selectedNumber,
    this.quantity = 1,
  });

  BuyTicketState copyWith({
    String? selectedDate,
    String? dateDetail,
    String? selectedProvince,
    String? provinceDetail,
    String? selectedNumber,
    int? quantity,
  }) {
    return BuyTicketState(
      selectedDate: selectedDate ?? this.selectedDate,
      dateDetail: dateDetail ?? this.dateDetail,
      selectedProvince: selectedProvince ?? this.selectedProvince,
      provinceDetail: provinceDetail ?? this.provinceDetail,
      selectedNumber: selectedNumber ?? this.selectedNumber,
      quantity: quantity ?? this.quantity,
    );
  }
}

class BuyTicketViewModel extends Notifier<BuyTicketState> {
  @override
  BuyTicketState build() {
    return BuyTicketState(
      selectedDate: 'Hôm nay',
      dateDetail: '09/02/2025 (Chủ nhật)',
      selectedProvince: 'TP. Hồ Chí Minh',
      provinceDetail: '16:15 • Hôm nay',
      selectedNumber: '853911',
      quantity: 1,
    );
  }

  void selectDate(String date, String detail) {
    state = state.copyWith(selectedDate: date, dateDetail: detail);
  }

  void selectProvince(String province, String detail) {
    state = state.copyWith(selectedProvince: province, provinceDetail: detail);
  }

  void selectNumber(String number) {
    state = state.copyWith(selectedNumber: number);
  }

  void updateQuantity(int delta) {
    final newQuantity = state.quantity + delta;
    if (newQuantity > 0) {
      state = state.copyWith(quantity: newQuantity);
    }
  }

  void clearSelection() {
    state = state.copyWith(selectedNumber: null, quantity: 1);
  }
}

final buyTicketViewModelProvider = NotifierProvider<BuyTicketViewModel, BuyTicketState>(BuyTicketViewModel.new);
