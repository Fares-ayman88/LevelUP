import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class PocketBaseConfig {
  PocketBaseConfig._();

  static const String _prefsKey = 'pb_endpoint';

  // Update this when moving from emulator to a real device or VPS.
  // - Android emulator: http://10.0.2.2:8090
  // - Local machine: http://127.0.0.1:8090
  // - Phone on Wi-Fi: http://<LAN-IP>:8090
  static String endpoint = 'http://192.168.1.45:8090';

  static Future<void> init() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? saved = prefs.getString(_prefsKey);
    final List<String> candidates = <String>[];
    if (saved != null && saved.trim().isNotEmpty) {
      candidates.add(saved);
    }
    candidates.add(endpoint);
    candidates.add('http://10.0.2.2:8090');
    candidates.add('http://127.0.0.1:8090');
    String? selected;
    for (final String candidate in candidates) {
      final String normalized = _normalize(candidate);
      if (selected == normalized) continue;
      final bool ok = await _isHealthy(normalized);
      if (ok) {
        selected = normalized;
        break;
      }
    }
    if (selected != null) {
      endpoint = selected;
      await prefs.setString(_prefsKey, selected);
      return;
    }
    if (saved != null && saved.trim().isNotEmpty) {
      endpoint = _normalize(saved);
    }
  }

  static Future<void> saveEndpoint(String value) async {
    final String normalized = _normalize(value);
    endpoint = normalized;
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, normalized);
  }

  static String _normalize(String value) {
    String normalized = value.trim();
    if (normalized.isEmpty) return endpoint;
    if (!normalized.startsWith('http://') &&
        !normalized.startsWith('https://')) {
      normalized = 'http://$normalized';
    }
    if (normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    return normalized;
  }

  static Future<bool> _isHealthy(String baseUrl) async {
    try {
      final Uri uri = Uri.parse('$baseUrl/api/health');
      final http.Response response =
          await http.get(uri).timeout(const Duration(seconds: 2));
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (_) {
      return false;
    }
  }
}
