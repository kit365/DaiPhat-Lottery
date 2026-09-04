import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';

import '../repositories/orders_repository.dart';

class GetMyOrders {
  final OrdersRepository _repository;

  const GetMyOrders(this._repository);

  Future<OrdersPageResponse> call({
    int page = 1,
    int size = 10,
    String? status,
    String? search,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) {
    return _repository.getMyOrders(
      page: page,
      size: size,
      status: status,
      search: search,
      sortBy: sortBy,
      direction: direction,
    );
  }
}
