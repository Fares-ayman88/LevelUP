import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:local_auth/local_auth.dart';

import 'biometric_success_screen.dart';
import '../app_state/security_store.dart';
import '../guards/role_guard.dart';
import '../providers/auth_provider.dart';

class BiometricSetupScreen extends StatefulWidget {
  const BiometricSetupScreen({super.key});

  @override
  State<BiometricSetupScreen> createState() => _BiometricSetupScreenState();
}

class _BiometricSetupScreenState extends State<BiometricSetupScreen> {
  final LocalAuthentication _auth = LocalAuthentication();
  bool _checking = true;
  bool _authenticating = false;
  bool _supportsFace = false;
  bool _supportsFingerprint = false;
  bool _supportsGenericBiometric = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _checkAvailability();
  }

  Future<void> _checkAvailability() async {
    try {
      final bool supported = await _auth.isDeviceSupported();
      final bool canCheck = await _auth.canCheckBiometrics;
      final List<BiometricType> biometrics = canCheck
          ? await _auth.getAvailableBiometrics()
          : const [];
      final bool supportsFace = biometrics.contains(BiometricType.face);
      final bool supportsFingerprint = biometrics.contains(
        BiometricType.fingerprint,
      );
      final bool supportsGeneric =
          biometrics.contains(BiometricType.strong) ||
          biometrics.contains(BiometricType.weak);
      if (!mounted) return;
      setState(() {
        _supportsFace = supportsFace;
        _supportsFingerprint = supportsFingerprint;
        _supportsGenericBiometric = supportsGeneric;
        _error = supported && biometrics.isEmpty
            ? 'Biometrics not enrolled. Add one in settings.'
            : null;
        _checking = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not check biometrics.';
        _checking = false;
      });
    }
  }

  Future<void> _authenticate() async {
    setState(() {
      _authenticating = true;
      _error = null;
    });
    try {
      final bool success = await _auth.authenticate(
        localizedReason: _supportsFace
            ? 'Use Face ID to secure your account'
            : 'Use fingerprint to secure your account',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
      if (!mounted) return;
      if (success) {
        await SecurityStore.setBiometricEnabled(true);
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) => BiometricSuccessScreen(label: _label),
          ),
        );
      } else {
        setState(() {
          _error = 'Authentication canceled.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Authentication failed. Try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _authenticating = false;
        });
      }
    }
  }

  Future<void> _skip() async {
    await SecurityStore.setBiometricEnabled(false);
    if (!mounted) return;
    final String route = RoleGuard.routeForRole(AuthProvider.instance.role);
    Navigator.of(context).pushReplacementNamed(route);
  }

  String get _label {
    if (_supportsFace) return 'Face ID';
    if (_supportsFingerprint) return 'Fingerprint';
    return 'Biometric';
  }

  @override
  Widget build(BuildContext context) {
    final bool hasBiometricOption =
        _supportsFace || _supportsFingerprint || _supportsGenericBiometric;
    final String label = _label;
    final IconData icon = _supportsFace
        ? Icons.face_rounded
        : Icons.fingerprint_rounded;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 420);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                20,
                horizontalPadding,
                24,
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: () => Navigator.of(context).pop(),
                          child: const Padding(
                            padding: EdgeInsets.all(6),
                            child: Icon(
                              Icons.arrow_back,
                              size: 26,
                              color: Color(0xFF1C2040),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Enable Biometric',
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF1C2040),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),
                    Center(
                      child: Container(
                        width: 160,
                        height: 160,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x17697AA0),
                              blurRadius: 22,
                              offset: Offset(0, 14),
                            ),
                          ],
                        ),
                        child: Icon(
                          icon,
                          size: 72,
                          color: const Color(0xFF0D65FF),
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),
                    Center(
                      child: Text(
                        'Use $label to secure your account',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF1B1E3B),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Center(
                      child: SizedBox(
                        width: maxContentWidth * 0.88,
                        child: Text(
                          _checking
                              ? 'Checking device capability...'
                              : hasBiometricOption
                              ? 'Enable ${label.toLowerCase()} for faster, safer sign-ins.'
                              : 'No biometric enrolled. You can skip for now.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF7D818F),
                            height: 1.6,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Center(
                          child: Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Colors.red.shade600,
                            ),
                          ),
                        ),
                      ),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D65FF),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 6,
                          shadowColor: const Color(0x590D65FF),
                        ),
                        onPressed:
                            (!_checking &&
                                hasBiometricOption &&
                                !_authenticating)
                            ? _authenticate
                            : null,
                        child: _authenticating
                            ? SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.6,
                                  valueColor:
                                      const AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                  backgroundColor: Colors.white.withValues(
                                    alpha: 0.3,
                                  ),
                                ),
                              )
                            : Text(
                                hasBiometricOption
                                    ? 'Enable $label'
                                    : 'Not available',
                                style: GoogleFonts.poppins(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Center(
                      child: TextButton(
                        onPressed: _skip,
                        child: Text(
                          'Skip for now',
                          style: GoogleFonts.poppins(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF4A4E5F),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
