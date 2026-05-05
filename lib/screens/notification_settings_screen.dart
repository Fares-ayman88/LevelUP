import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../app_state/app_strings.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends State<NotificationSettingsScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _trackOn = Color(0xFFD9E7FF);
  static const Color _trackOff = Color(0xFFE7EDF7);
  static const Color _thumbOff = Color(0xFFBFC9DA);

  static const String _prefPrefix = 'notif_setting_';

  final List<_SettingOption> _options = const [
    _SettingOption(
      id: 'special_offers',
      labelKey: 'special_offers',
      defaultValue: true,
    ),
    _SettingOption(id: 'sound', labelKey: 'sound', defaultValue: true),
    _SettingOption(id: 'vibrate', labelKey: 'vibrate', defaultValue: false),
    _SettingOption(
      id: 'general',
      labelKey: 'general_notification',
      defaultValue: true,
    ),
    _SettingOption(
      id: 'promo_discount',
      labelKey: 'promo_discount',
      defaultValue: false,
    ),
    _SettingOption(
      id: 'payment_options',
      labelKey: 'payment_options',
      defaultValue: true,
    ),
    _SettingOption(
      id: 'app_update',
      labelKey: 'app_update',
      defaultValue: true,
    ),
    _SettingOption(
      id: 'new_service',
      labelKey: 'new_service_available',
      defaultValue: false,
    ),
    _SettingOption(
      id: 'new_tips',
      labelKey: 'new_tips_available',
      defaultValue: false,
    ),
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
                24,
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
                        context.tr('notification_title'),
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
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Center(
                        child: CircularProgressIndicator(
                          color: _primary,
                          strokeWidth: 2.4,
                        ),
                      ),
                    )
                  else
                    ..._options.map(
                      (option) => _SettingRow(
                        label: context.tr(option.labelKey),
                        value: _values[option.id] ?? option.defaultValue,
                        onChanged: (value) => _toggle(option.id, value),
                        activeThumbColor: _primary,
                        activeTrackColor: _trackOn,
                        inactiveTrackColor: _trackOff,
                        inactiveThumbColor: _thumbOff,
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SettingRow extends StatelessWidget {
  const _SettingRow({
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
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
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

class _SettingOption {
  const _SettingOption({
    required this.id,
    required this.labelKey,
    required this.defaultValue,
  });

  final String id;
  final String labelKey;
  final bool defaultValue;
}
