import 'package:shared_preferences/shared_preferences.dart';

class OnboardingStore {
  static const String _key = 'onboarding_seen_v1';

  static Future<bool> seen() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_key) ?? false;
  }

  static Future<void> markSeen() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, true);
  }

  static Future<void> reset() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, false);
  }
}
