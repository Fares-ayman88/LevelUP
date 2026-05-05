import 'package:flutter/foundation.dart';

import 'user_access.dart';

class AdminAccess {
  static bool isAdmin() {
    return UserAccess.isAdmin;
  }

  static ValueListenable<bool> get listenable =>
      UserAccess.isAdminListenable;
}
