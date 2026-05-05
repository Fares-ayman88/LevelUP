import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../app_state/app_strings.dart';
import '../routes.dart';

const Color _title = Color(0xFF202244);
const Color _primary = Color(0xFF0D65FF);
const Color _trackOn = Color(0xFFD9E7FF);
const Color _trackOff = Color(0xFFE7EDF7);
const Color _thumbOff = Color(0xFFBFC9DA);

const String _prefPrefix = 'security_setting_';

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  final List<_SecurityOption> _options = const [
    _SecurityOption(
      id: 'remember_me',
      labelKey: 'remember_me',
      defaultValue: true,
    ),
    _SecurityOption(
      id: 'biometric_id',
      labelKey: 'biometric_id',
      defaultValue: true,
    ),
    _SecurityOption(id: 'face_id', labelKey: 'face_id', defaultValue: false),
  ];

  late Map<String, bool> _values;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _values = {for (final option in _options) option.id: option.defaultValue};
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final Map<String, bool> updated = {};
    for (final option in _options) {
      final String key = _prefPrefix + option.id;
      updated[option.id] = prefs.getBool(key) ?? option.defaultValue;
    }
    if (mounted) {
      setState(() {
        _values = updated;
        _isLoading = false;
      });
    }
  }

  Future<void> _toggle(String id, bool value) async {
    setState(() => _values[id] = value);
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefPrefix + id, value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _OutlineButton(
                label: context.tr('change_pin'),
                onTap: () =>
                    Navigator.of(context).pushNamed(AppRoutes.createPin),
              ),
              const SizedBox(height: 12),
              _PrimaryButton(
                label: context.tr('change_password'),
                onTap: () =>
                    Navigator.of(context).pushNamed(AppRoutes.forgotPassword),
              ),
            ],
          ),
        ),
      ),
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
                16,
                horizontalPadding,
                140,
              ),
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
                            color: _title,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        context.tr('security'),
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  if (_isLoading)
                    const Padding(
                      padding: EdgeInsets.only(top: 12),
                      child: Center(
                        child: CircularProgressIndicator(
                          color: _primary,
                          strokeWidth: 2.4,
                        ),
                      ),
                    )
                  else ...[
                    ..._options.map(
                      (option) => _ToggleRow(
                        label: context.tr(option.labelKey),
                        value: _values[option.id] ?? option.defaultValue,
                        onChanged: (value) => _toggle(option.id, value),
                        activeThumbColor: _primary,
                        activeTrackColor: _trackOn,
                        inactiveTrackColor: _trackOff,
                        inactiveThumbColor: _thumbOff,
                      ),
                    ),
                    _NavigationRow(
                      label: context.tr('google_authenticator'),
                      onTap: () => Navigator.of(
                        context,
                      ).pushNamed(AppRoutes.googleAuthenticator),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  const _ToggleRow({
    required this.label,
    required this.value,
    required this.onChanged,
    required this.activeThumbColor,
    required this.activeTrackColor,
    required this.inactiveTrackColor,
    required this.inactiveThumbColor,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  final Color activeThumbColor;
  final Color activeTrackColor;
  final Color inactiveTrackColor;
  final Color inactiveThumbColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 15.5,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1C2040),
              ),
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: activeThumbColor,
            activeTrackColor: activeTrackColor,
            inactiveTrackColor: inactiveTrackColor,
            inactiveThumbColor: inactiveThumbColor,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }
}

class _NavigationRow extends StatelessWidget {
  const _NavigationRow({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.poppins(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF1C2040),
                  ),
                ),
              ),
              const Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: Color(0xFF9AA1B8),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OutlineButton extends StatelessWidget {
  const _OutlineButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          side: const BorderSide(color: Color(0xFFD3DBED)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        child: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 14.5,
            fontWeight: FontWeight.w700,
            color: _title,
          ),
        ),
      ),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _primary,
      borderRadius: BorderRadius.circular(40),
      child: InkWell(
        borderRadius: BorderRadius.circular(40),
        onTap: onTap,
        child: SizedBox(
          height: 58,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 22),
            child: Row(
              children: [
                const Spacer(),
                Text(
                  label,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const Spacer(),
                Container(
                  width: 34,
                  height: 34,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.arrow_forward,
                    size: 18,
                    color: _primary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SecurityOption {
  const _SecurityOption({
    required this.id,
    required this.labelKey,
    required this.defaultValue,
  });

  final String id;
  final String labelKey;
  final bool defaultValue;
}
