import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';

void openRebuyTicket(BuildContext context, PurchasedTicket ticket) {
  final digits = ticket.numbers.replaceAll(RegExp(r'\D'), '');
  final params = <String, String>{};
  if (digits.isNotEmpty) {
    params['ticketNumber'] = digits;
  }
  final drawDate = _normalizeDrawDateIso(ticket.drawDate);
  if (drawDate != null) {
    params['drawDate'] = drawDate;
  }
  final station = ticket.stationName?.trim();
  if (station != null && station.isNotEmpty) {
    params['station'] = station;
  }
  if (ticket.ticketId > 0) {
    params['ticketId'] = '${ticket.ticketId}';
  }

  final uri = Uri(
    path: AppRoute.buyTicket.path,
    queryParameters: params.isEmpty ? null : params,
  );
  // Ticket detail sits on the root navigator; buy-ticket is a shell tab.
  // go() switches tabs without pushing a duplicate page key.
  context.go(uri.toString());
}

String? _normalizeDrawDateIso(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;
  final isoMatch = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(trimmed);
  if (isoMatch != null) {
    return '${isoMatch.group(1)}-${isoMatch.group(2)}-${isoMatch.group(3)}';
  }
  final parsed = DateTime.tryParse(trimmed);
  if (parsed == null) return null;
  final local = parsed.toLocal();
  final y = local.year.toString().padLeft(4, '0');
  final m = local.month.toString().padLeft(2, '0');
  final d = local.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}
