import 'package:flutter/material.dart';

import '../app_state/admin_access.dart';
import '../app_state/security_store.dart';
import '../routes.dart';
import '../screens/pin_auth_screen.dart';

class SecurityGuard {
  static Future<bool> requireAuth(
    BuildContext context, {
    required String title,
    required String description,
  }) async {
    if (AdminAccess.isAdmin()) return true;

    final bool hasPin = await SecurityStore.hasPin();
    if (!context.mounted) return false;
    if (!hasPin) {
      final bool goSetup = await showDialog<bool>(
            context: context,
            builder: (dialogContext) {
              return AlertDialog(
                title: const Text('Set up PIN'),
                content: const Text(
                  'Create your PIN to secure payments and transactions.',
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(false),
                    child: const Text('Not now'),
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.of(dialogContext).pop(true),
                    child: const Text('Set PIN'),
                  ),
                ],
              );
            },
          ) ??
          false;
      if (goSetup && context.mounted) {
        Navigator.of(context).pushNamed(AppRoutes.createPin);
      }
      return false;
    }

    final bool allowBiometric = await SecurityStore.isBiometricAllowed();
    if (!context.mounted) return false;
    final bool? unlocked = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => PinAuthScreen(
          title: title,
          description: description,
          allowBiometric: allowBiometric,
        ),
      ),
    );
    return unlocked ?? false;
  }
}
