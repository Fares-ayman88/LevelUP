import 'dart:convert';
import 'dart:math' as math;

import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecurityStore {
  static const String _pinHashKey = 'security_pin_hash_v1';
  static const String _pinSaltKey = 'security_pin_salt_v1';
  static const String _biometricEnabledKey =
      'security_biometric_enabled_v1';
  static const String _prefPrefix = 'security_setting_';
  static const String _biometricToggle = 'biometric_id';
  static const String _faceToggle = 'face_id';

  static Future<bool> hasPin() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String hash = prefs.getString(_pinHashKey) ?? '';
    return hash.trim().isNotEmpty;
  }

  static Future<void> savePin(String pin) async {
    final String normalized = pin.trim();
    if (!RegExp(r'^\d{4}$').hasMatch(normalized)) {
      throw ArgumentError('Pin must be 4 digits.');
    }
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String salt = _generateSalt();
    final String hash = _hashPin(normalized, salt);
    await prefs.setString(_pinSaltKey, salt);
    await prefs.setString(_pinHashKey, hash);
  }

  static Future<bool> verifyPin(String pin) async {
    final String normalized = pin.trim();
    if (!RegExp(r'^\d{4}$').hasMatch(normalized)) {
      return false;
    }
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? salt = prefs.getString(_pinSaltKey);
    final String? hash = prefs.getString(_pinHashKey);
    if (salt == null || hash == null || salt.isEmpty || hash.isEmpty) {
      return false;
    }
    return _hashPin(normalized, salt) == hash;
  }

  static Future<void> setBiometricEnabled(bool enabled) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_biometricEnabledKey, enabled);
  }

  static Future<bool> isBiometricAllowed() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final bool toggleBiometric =
        prefs.getBool(_prefPrefix + _biometricToggle) ?? true;
    final bool toggleFace =
        prefs.getBool(_prefPrefix + _faceToggle) ?? false;
    final bool setupEnabled =
        prefs.getBool(_biometricEnabledKey) ?? false;
    return (toggleBiometric || toggleFace) && setupEnabled;
  }

  static math.Random _secureRandom() {
    try {
      return math.Random.secure();
    } catch (_) {
      return math.Random();
    }
  }

  static String _generateSalt() {
    final math.Random random = _secureRandom();
    final List<int> bytes =
        List<int>.generate(16, (_) => random.nextInt(256));
    return base64UrlEncode(bytes);
  }

  static String _hashPin(String pin, String salt) {
    final List<int> bytes = utf8.encode('$salt:$pin');
    return sha256.convert(bytes).toString();
  }
}
