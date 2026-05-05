import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SavedCoursesStore {
  static final ValueNotifier<Set<String>> savedIds =
      ValueNotifier<Set<String>>(<String>{});

  static const String _key = 'saved_courses_v1';
  static bool _loaded = false;

  static Future<void> init() async {
    if (_loaded) return;
    _loaded = true;
    try {
      final SharedPreferences prefs =
          await SharedPreferences.getInstance();
      final List<String>? stored = prefs.getStringList(_key);
      if (stored == null) return;
      savedIds.value = stored.toSet();
    } catch (_) {}
  }

  static bool isSaved(String id) {
    return savedIds.value.contains(id);
  }

  static Future<void> setSaved(String id, bool saved) async {
    final Set<String> next = Set<String>.from(savedIds.value);
    if (saved) {
      next.add(id);
    } else {
      next.remove(id);
    }
    savedIds.value = next;
    await _persist(next);
  }

  static Future<bool> toggle(String id) async {
    final bool next = !savedIds.value.contains(id);
    await setSaved(id, next);
    return next;
  }

  static Future<void> _persist(Set<String> ids) async {
    try {
      final SharedPreferences prefs =
          await SharedPreferences.getInstance();
      await prefs.setStringList(_key, ids.toList());
    } catch (_) {}
  }

  static Future<void> reset() async {
    savedIds.value = <String>{};
    try {
      final SharedPreferences prefs =
          await SharedPreferences.getInstance();
      await prefs.remove(_key);
    } catch (_) {}
  }
}
