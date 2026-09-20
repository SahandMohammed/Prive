import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'router.dart';

part 'providers.g.dart';

@riverpod
GoRouter appRouter(Ref ref) {
  final router = createRouter();
  ref.onDispose(router.dispose);
  return router;
}
