import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeStore {
  ThemeStore._();

  static const String _prefKey = 'dark_mode_enabled_v1';

  static final ValueNotifier<bool> isDark = ValueNotifier<bool>(false);

  static Future<void> init() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    isDark.value = prefs.getBool(_prefKey) ?? false;
  }

  static ThemeMode get mode => isDark.value ? ThemeMode.dark : ThemeMode.light;

  static Future<void> setDarkMode(bool enabled) async {
    isDark.value = enabled;
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefKey, enabled);
  }
}
