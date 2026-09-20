import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../features/appointments/ui/appointments_screen.dart';
import '../features/home/ui/home_screen.dart';
import '../features/prive/ui/prive_screen.dart';
import '../features/profile/ui/profile_screen.dart';
import 'bottom_nav_bar.dart';

abstract final class AppRoutes {
  static const root = '/';
  static const home = '/home';
  static const appointments = '/appointments';
  static const prive = '/prive';
  static const profile = '/profile';
}

GoRouter createRouter() {
  return GoRouter(
    initialLocation: AppRoutes.root,
    routes: [
      StatefulShellRoute.indexedStack(
        builder:
            (
              BuildContext context,
              GoRouterState state,
              StatefulNavigationShell navigationShell,
            ) {
              return ScaffoldWithNavBar(navigationShell: navigationShell);
            },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.root,
                builder: (BuildContext context, GoRouterState state) {
                  return const HomeScreen();
                },
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.appointments,
                builder: (BuildContext context, GoRouterState state) {
                  return const AppointmentsScreen();
                },
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.prive,
                builder: (BuildContext context, GoRouterState state) {
                  return const PriveScreen();
                },
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.profile,
                builder: (BuildContext context, GoRouterState state) {
                  return const ProfileScreen();
                },
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.home,
        redirect: (BuildContext context, GoRouterState state) => AppRoutes.root,
      ),
    ],
  );
}
