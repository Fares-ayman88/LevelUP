import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:local_auth/local_auth.dart';

import '../app_state/security_store.dart';
import '../routes.dart';
import 'sign_in_screen.dart';

const Color _textMuted = Color(0xFF7D818F);

class PinAuthScreen extends StatefulWidget {
  const PinAuthScreen({
    super.key,
    required this.title,
    required this.description,
    required this.allowBiometric,
  });

  final String title;
  final String description;
  final bool allowBiometric;

  @override
  State<PinAuthScreen> createState() => _PinAuthScreenState();
}

class _PinAuthScreenState extends State<PinAuthScreen> {
  final LocalAuthentication _auth = LocalAuthentication();
  List<int> _input = [];
  bool _mismatch = false;
  bool _verifying = false;
  bool _checkingBiometric = true;
  bool _canUseBiometric = false;
  bool _authenticatingBiometric = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _checkBiometric();
  }

  Future<void> _checkBiometric() async {
    if (!widget.allowBiometric) {
      setState(() {
        _checkingBiometric = false;
        _canUseBiometric = false;
      });
      return;
    }
    try {
      final bool supported = await _auth.isDeviceSupported();
      final bool canCheck = await _auth.canCheckBiometrics;
      final List<BiometricType> biometrics = canCheck
          ? await _auth.getAvailableBiometrics()
          : const [];
      if (!mounted) return;
      setState(() {
        _canUseBiometric = supported && biometrics.isNotEmpty;
        _checkingBiometric = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _canUseBiometric = false;
        _checkingBiometric = false;
      });
    }
  }

  void _handleDigit(int digit) {
    if (_input.length >= 4 || _verifying || _authenticatingBiometric) return;
    setState(() {
      _input = [..._input, digit];
      _mismatch = false;
    });
  }

  void _handleBackspace() {
    if (_input.isEmpty || _verifying || _authenticatingBiometric) return;
    setState(() {
      _input = _input.sublist(0, _input.length - 1);
      _mismatch = false;
    });
  }

  Future<void> _onContinue() async {
    if (_verifying || _authenticatingBiometric) return;
    if (_input.length < 4) {
      _showToast('Enter 4 digits to continue');
      return;
    }
    setState(() => _verifying = true);
    final bool matches = await SecurityStore.verifyPin(_input.join());
    if (!mounted) return;
    if (matches) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() {
      _mismatch = true;
      _input = [];
      _verifying = false;
    });
    _showToast('Incorrect PIN. Try again.');
  }

  Future<void> _authenticateBiometric() async {
    if (!_canUseBiometric || _authenticatingBiometric) return;
    setState(() => _authenticatingBiometric = true);
    try {
      final bool success = await _auth.authenticate(
        localizedReason: 'Confirm your identity',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
      if (!mounted) return;
      if (success) {
        Navigator.of(context).pop(true);
      } else {
        _showToast('Biometric authentication canceled.');
      }
    } catch (_) {
      if (!mounted) return;
      _showToast('Biometric authentication failed.');
    } finally {
      if (mounted) {
        setState(() => _authenticatingBiometric = false);
      }
    }
  }

  Future<void> _openForgotPin() async {
    if (_verifying || _authenticatingBiometric) return;
    final bool? signedIn = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => const SignInScreen(mode: SignInMode.resetPin),
      ),
    );
    if (!mounted || signedIn != true) return;
    Navigator.of(context).pushReplacementNamed(AppRoutes.createPin);
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool showBiometric = !_checkingBiometric && _canUseBiometric;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double bottomHeight = math.min(
              420,
              math.max(320, constraints.maxHeight * 0.52),
            );

            return Column(
              children: [
                Expanded(
                  child: _PinStep(
                    title: widget.title,
                    description: widget.description,
                    digits: _input,
                    mismatch: _mismatch,
                    onBack: () => Navigator.of(context).pop(false),
                    onForgotPin: _openForgotPin,
                  ),
                ),
                _PinBottomSection(
                  height: bottomHeight,
                  onDigit: _handleDigit,
                  onBackspace: _handleBackspace,
                  onContinue: _onContinue,
                  showBiometric: showBiometric,
                  biometricBusy: _authenticatingBiometric,
                  onBiometric: _authenticateBiometric,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _PinStep extends StatelessWidget {
  const _PinStep({
    required this.title,
    required this.description,
    required this.digits,
    required this.mismatch,
    required this.onBack,
    required this.onForgotPin,
  });

  final String title;
  final String description;
  final List<int> digits;
  final bool mismatch;
  final VoidCallback onBack;
  final VoidCallback onForgotPin;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double gapAfterDescription = (constraints.maxHeight * 0.10)
            .clamp(24.0, 80.0)
            .toDouble();
        final double afterBoxesGap = (constraints.maxHeight * 0.04)
            .clamp(10.0, 24.0)
            .toDouble();

        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      GestureDetector(
                        onTap: onBack,
                        behavior: HitTestBehavior.opaque,
                        child: const Padding(
                          padding: EdgeInsets.all(6),
                          child: Icon(
                            Icons.arrow_back,
                            size: 26,
                            color: Color(0xFF1C2040),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          title,
                          style: GoogleFonts.poppins(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF1C2040),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 300),
                      child: Text(
                        description,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.poppins(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: _textMuted,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: gapAfterDescription),
                  Center(
                    child: _PinBoxes(filled: digits.length, mismatch: mismatch),
                  ),
                  SizedBox(height: afterBoxesGap),
                  AnimatedOpacity(
                    duration: const Duration(milliseconds: 200),
                    opacity: mismatch ? 1 : 0,
                    child: Text(
                      mismatch ? 'Incorrect PIN' : '',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Colors.red.shade600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: TextButton(
                      onPressed: onForgotPin,
                      child: Text(
                        'Forgot PIN?',
                        style: GoogleFonts.poppins(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF4C5AE0),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PinBoxes extends StatelessWidget {
  const _PinBoxes({required this.filled, required this.mismatch});

  final int filled;
  final bool mismatch;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(4, (index) {
        final bool hasDigit = index < filled;
        return Container(
          margin: EdgeInsets.only(right: index == 3 ? 0 : 14),
          width: 64,
          height: 66,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: mismatch ? Colors.red.shade300 : Colors.transparent,
              width: mismatch ? 1.4 : 0,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x17697AA0),
                blurRadius: 18,
                offset: Offset(0, 10),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Text(
            hasDigit ? '*' : '',
            style: GoogleFonts.poppins(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF2D3148),
            ),
          ),
        );
      }),
    );
  }
}

class _PinBottomSection extends StatelessWidget {
  const _PinBottomSection({
    required this.height,
    required this.onDigit,
    required this.onBackspace,
    required this.onContinue,
    required this.showBiometric,
    required this.biometricBusy,
    required this.onBiometric,
  });

  final double height;
  final ValueChanged<int> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onContinue;
  final bool showBiometric;
  final bool biometricBusy;
  final VoidCallback onBiometric;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: SizedBox(
        height: height,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: LayoutBuilder(
          builder: (context, constraints) {
              final double continueWidth = math.min(
                MediaQuery.of(context).size.width - 48,
                320,
              );
              const double baseWidth = 366;
              const double baseHeight = 76;
              final double continueHeight =
                  continueWidth * (baseHeight / baseWidth);
              final double biometricHeight = showBiometric ? 48 : 0;
              final double reserved =
                  continueHeight +
                  12 +
                  (showBiometric ? (biometricHeight + 12) : 0);
              double available = constraints.maxHeight - reserved;
              if (available < 0) available = 0;
              double rowGap = 12;
              double buttonSize = (available - 3 * rowGap) / 4;
              const double maxButton = 68;
              const double minButton = 52;
              if (buttonSize < minButton) {
                rowGap = 8;
                buttonSize = (available - 3 * rowGap) / 4;
              }
              buttonSize = buttonSize.clamp(minButton, maxButton);
              final double keypadWidth = math.min(320, constraints.maxWidth);

              return Column(
                children: [
                  _ContinueButton(onTap: onContinue),
                  const SizedBox(height: 12),
                  if (showBiometric)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: biometricBusy ? null : onBiometric,
                        icon: const Icon(Icons.fingerprint),
                        label: Text(
                          biometricBusy
                              ? 'Authenticating...'
                              : 'Use fingerprint',
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          side: const BorderSide(color: Color(0xFFCCD6EA)),
                          foregroundColor: const Color(0xFF1C2040),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),
                  if (showBiometric) const SizedBox(height: 12),
                  Expanded(
                    child: _PinKeypad(
                      onDigit: onDigit,
                      onBackspace: onBackspace,
                      buttonSize: buttonSize,
                      rowGap: rowGap,
                      width: keypadWidth,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ContinueButton extends StatelessWidget {
  const _ContinueButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final double width = math.min(MediaQuery.of(context).size.width - 48, 320);
    const double baseWidth = 366;
    const double baseHeight = 76;
    final double height = width * (baseHeight / baseWidth);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(40),
        onTap: onTap,
        child: Ink.image(
          image: const AssetImage('assets/fill_profile/BUTTON (3).png'),
          width: width,
          height: height,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

class _PinKeypad extends StatelessWidget {
  const _PinKeypad({
    required this.onDigit,
    required this.onBackspace,
    required this.buttonSize,
    required this.rowGap,
    required this.width,
  });

  final ValueChanged<int> onDigit;
  final VoidCallback onBackspace;
  final double buttonSize;
  final double rowGap;
  final double width;

  @override
  Widget build(BuildContext context) {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['*', '0', 'back'],
    ];

    return Center(
      child: SizedBox(
        width: width,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(rows.length, (rowIndex) {
            final row = rows[rowIndex];
            return Padding(
              padding: EdgeInsets.only(top: rowIndex == 0 ? 0 : rowGap),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: row.map((value) {
                  if (value == 'back') {
                    return _KeyButton(
                      onTap: onBackspace,
                      size: buttonSize,
                      child: const Icon(
                        Icons.backspace_outlined,
                        color: Color(0xFF4A4E5F),
                        size: 22,
                      ),
                    );
                  }
                  final bool isStar = value == '*';
                  return _KeyButton(
                    onTap: isStar ? () {} : () => onDigit(int.parse(value)),
                    size: buttonSize,
                    child: Text(
                      value,
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF4A4E5F),
                      ),
                    ),
                  );
                }).toList(),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class _KeyButton extends StatelessWidget {
  const _KeyButton({
    required this.onTap,
    required this.child,
    required this.size,
  });

  final VoidCallback onTap;
  final Widget child;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(size * 0.5),
          onTap: onTap,
          child: Center(child: child),
        ),
      ),
    );
  }
}
