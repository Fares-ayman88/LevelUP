import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../enums/user_role.dart';
import '../providers/auth_provider.dart';
import '../routes.dart';

class RoleGuard extends StatelessWidget {
  const RoleGuard({
    super.key,
    required this.allowedRoles,
    required this.child,
    this.deniedMessage,
  });

  final Set<UserRole> allowedRoles;
  final Widget child;
  final String? deniedMessage;

  static String routeForRole(UserRole role) {
    switch (role) {
      case UserRole.admin:
        return AppRoutes.home;
      case UserRole.instructor:
        return AppRoutes.home;
      case UserRole.student:
        return AppRoutes.home;
    }
  }

  @override
  Widget build(BuildContext context) {
    final AuthProvider auth = AuthProvider.instance;
    return AnimatedBuilder(
      animation: auth,
      builder: (context, _) {
        if (auth.status == AuthStatus.loading ||
            auth.status == AuthStatus.authenticating ||
            auth.status == AuthStatus.idle) {
          return const _RoleGuardLoading();
        }

        if (!auth.isAuthenticated) {
          return _RoleGuardMessage(
            title: 'Sign in required',
            message: 'Please sign in to continue.',
            actionLabel: 'Go to sign in',
            onAction: () => Navigator.of(context).pushNamedAndRemoveUntil(
              AppRoutes.signIn,
              (route) => false,
            ),
          );
        }

        if (!allowedRoles.contains(auth.role)) {
          return _RoleGuardMessage(
            title: 'Access denied',
            message: deniedMessage ?? 'You do not have access to this area.',
            actionLabel: 'Go to home',
            onAction: () => Navigator.of(context).pushNamedAndRemoveUntil(
              routeForRole(auth.role),
              (route) => false,
            ),
          );
        }

        return child;
      },
    );
  }
}

class _RoleGuardLoading extends StatelessWidget {
  const _RoleGuardLoading();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}

class _RoleGuardMessage extends StatelessWidget {
  const _RoleGuardMessage({
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF202244),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                message,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF7D818F),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 18),
              ElevatedButton(
                onPressed: onAction,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0D65FF),
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  actionLabel,
                  style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
