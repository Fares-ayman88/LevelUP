import 'dart:math';

import 'package:pocketbase/pocketbase.dart';

import 'pocketbase_config.dart';

class PocketBaseEmailOtpException implements Exception {
  const PocketBaseEmailOtpException(
    this.message, {
    this.configurationIssue = false,
  });

  final String message;
  final bool configurationIssue;

  @override
  String toString() => message;
}

class PocketBaseEmailOtpService {
  PocketBaseEmailOtpService({
    PocketBase? client,
    this.collectionName = 'email_otp_users',
  }) : _client = client ?? PocketBase(PocketBaseConfig.endpoint);

  final PocketBase _client;
  final String collectionName;

  Future<String> requestCode(String email) async {
    final String normalizedEmail = _normalizeEmail(email);
    if (normalizedEmail.isEmpty || !normalizedEmail.contains('@')) {
      throw const PocketBaseEmailOtpException('Enter a valid email first.');
    }

    await _ensureOtpRecord(normalizedEmail);

    try {
      final OTPResponse response = await _client
          .collection(collectionName)
          .requestOTP(normalizedEmail);
      final String otpId = response.otpId.trim();
      if (otpId.isEmpty) {
        throw const PocketBaseEmailOtpException(
          'OTP request failed. Try again.',
        );
      }
      return otpId;
    } on ClientException catch (e) {
      throw _mapRequestError(e);
    } catch (_) {
      throw const PocketBaseEmailOtpException(
        'Could not send verification code. Try again.',
      );
    }
  }

  Future<void> verifyCode({required String otpId, required String code}) async {
    final String trimmedOtpId = otpId.trim();
    final String trimmedCode = code.trim();
    if (trimmedOtpId.isEmpty) {
      throw const PocketBaseEmailOtpException(
        'Request a new code and try again.',
      );
    }
    if (!_isSixDigits(trimmedCode)) {
      throw const PocketBaseEmailOtpException('Enter the 6-digit code.');
    }

    try {
      await _client
          .collection(collectionName)
          .authWithOTP(trimmedOtpId, trimmedCode);
      _client.authStore.clear();
    } on ClientException catch (e) {
      throw _mapVerifyError(e);
    } catch (_) {
      throw const PocketBaseEmailOtpException(
        'Could not verify the code. Try again.',
      );
    }
  }

  Future<void> _ensureOtpRecord(String email) async {
    final String password = _randomPassword();
    try {
      await _client
          .collection(collectionName)
          .create(
            body: <String, dynamic>{
              'email': email,
              'password': password,
              'passwordConfirm': password,
              'emailVisibility': true,
            },
          );
    } on ClientException catch (e) {
      if (_isDuplicateEmailError(e)) return;
      if (_isMissingCollection(e)) {
        throw const PocketBaseEmailOtpException(
          'PocketBase OTP is not ready. Create auth collection "email_otp_users".',
          configurationIssue: true,
        );
      }
      throw _mapRequestError(e);
    }
  }

  PocketBaseEmailOtpException _mapRequestError(ClientException error) {
    final String message = (error.response['message'] ?? '')
        .toString()
        .toLowerCase();
    if (_isMissingCollection(error)) {
      return const PocketBaseEmailOtpException(
        'PocketBase OTP is not ready. Create auth collection "email_otp_users".',
        configurationIssue: true,
      );
    }
    if (message.contains('otp') && message.contains('enable')) {
      return const PocketBaseEmailOtpException(
        'Enable OTP auth method for collection "email_otp_users" in PocketBase.',
        configurationIssue: true,
      );
    }
    if (message.contains('smtp') || message.contains('mail')) {
      return const PocketBaseEmailOtpException(
        'Configure SMTP mail settings in PocketBase dashboard first.',
        configurationIssue: true,
      );
    }
    return const PocketBaseEmailOtpException(
      'Could not send verification code. Try again.',
    );
  }

  PocketBaseEmailOtpException _mapVerifyError(ClientException error) {
    final String message = (error.response['message'] ?? '')
        .toString()
        .toLowerCase();
    if (message.contains('invalid') ||
        message.contains('expired') ||
        message.contains('otp')) {
      return const PocketBaseEmailOtpException(
        'Invalid or expired code. Request a new code.',
      );
    }
    return const PocketBaseEmailOtpException(
      'Could not verify the code. Try again.',
    );
  }

  bool _isDuplicateEmailError(ClientException error) {
    if (error.statusCode != 400) return false;
    final dynamic data = error.response['data'];
    if (data is! Map<String, dynamic>) return false;
    final dynamic emailField = data['email'];
    if (emailField is! Map<String, dynamic>) return false;
    final String code = (emailField['code'] ?? '').toString().toLowerCase();
    if (code == 'validation_not_unique') return true;
    final String message = (emailField['message'] ?? '')
        .toString()
        .toLowerCase();
    return message.contains('already');
  }

  bool _isMissingCollection(ClientException error) {
    if (error.statusCode != 404) return false;
    final String message = (error.response['message'] ?? '')
        .toString()
        .toLowerCase();
    return message.contains('missing') ||
        message.contains('collection') ||
        message.contains('not found');
  }

  static String _normalizeEmail(String email) => email.trim().toLowerCase();

  static bool _isSixDigits(String value) =>
      RegExp(r'^\d{6}$').hasMatch(value.trim());

  static String _randomPassword() {
    const String chars =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#\$%^&*()_+';
    final Random random = Random.secure();
    return List<String>.generate(
      20,
      (_) => chars[random.nextInt(chars.length)],
    ).join();
  }
}
