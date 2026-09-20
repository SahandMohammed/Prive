import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../features/home/ui/home_screen.dart';

abstract final class AppRoutes {
  static const root = '/';
  static const home = '/home';
}

GoRouter createRouter() {
  return GoRouter(
    initialLocation: AppRoutes.root,
    routes: [
      GoRoute(
        path: AppRoutes.root,
        builder: (BuildContext context, GoRouterState state) {
          return const HomeScreen();
        },
      ),
      GoRoute(
        path: AppRoutes.home,
        redirect: (BuildContext context, GoRouterState state) => AppRoutes.root,
      ),
    ],
  );
}
