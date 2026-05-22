import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../app_state/app_strings.dart';

const Color _title = Color(0xFF202244);
const Color _primary = Color(0xFF0D65FF);
const Color _connected = Color(0xFF1F7C64);

const String _cardsKey = 'profile_payment_cards_v1';

class PaymentOptionScreen extends StatefulWidget {
  const PaymentOptionScreen({super.key});

  @override
  State<PaymentOptionScreen> createState() => _PaymentOptionScreenState();
}

class _PaymentOptionScreenState extends State<PaymentOptionScreen> {
  List<_StoredCard> _cards = [];
  bool _loading = true;

  static const List<_PaymentProvider> _providers = [
    _PaymentProvider(assetPath: 'assets/payment/instapay_logo.jpg'),
    _PaymentProvider(assetPath: 'assets/payment/vodafone_cash.png'),
  ];

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _loadCards();
  }

  Future<void> _loadCards() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? raw = prefs.getString(_cardsKey);
    final List<_StoredCard> cards = [];
    if (raw != null && raw.trim().isNotEmpty) {
      try {
        final List<dynamic> data = jsonDecode(raw) as List<dynamic>;
        for (final item in data) {
          if (item is Map<String, dynamic>) {
            cards.add(_StoredCard.fromMap(item));
          } else if (item is Map) {
            cards.add(
              _StoredCard.fromMap(
                item.map((key, value) => MapEntry(key.toString(), value)),
              ),
            );
          }
        }
      } catch (_) {}
    }
    if (mounted) {
      setState(() {
        _cards = cards;
        _loading = false;
      });
    }
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
                18,
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
                        context.tr('payment_option_title'),
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  ..._providers.map(
                    (provider) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _PaymentRow(
                        leading: _ProviderBadge(assetPath: provider.assetPath),
                        title: ' ',
                      ),
                    ),
                  ),
                  if (_loading)
                    const Padding(
                      padding: EdgeInsets.only(top: 12),
                      child: Center(
                        child: CircularProgressIndicator(
                          color: _primary,
                          strokeWidth: 2.4,
                        ),
                      ),
                    )
                  else if (_cards.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _PaymentRow(
                        leading: const _MaskedBadge(),
                        title: '**** **** **76 3054',
                      ),
                    )
                  else
                    ..._cards.map(
                      (card) => Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _PaymentRow(
                          leading: const _MaskedBadge(),
                          title: card.maskedNumber,
                        ),
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

class _PaymentRow extends StatelessWidget {
  const _PaymentRow({required this.leading, required this.title});

  final Widget leading;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 16,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          leading,
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: GoogleFonts.poppins(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: _title,
              ),
            ),
          ),
          Text(
            context.tr('connected'),
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: _connected,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProviderBadge extends StatelessWidget {
  const _ProviderBadge({required this.assetPath});

  final String assetPath;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 62,
      height: 40,
      decoration: BoxDecoration(
        color: const Color(0xFFF4F7FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE0E6F5)),
      ),
      alignment: Alignment.center,
      child: Image.asset(
        assetPath,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) =>
            const Icon(Icons.credit_card, color: _title, size: 20),
      ),
    );
  }
}

class _MaskedBadge extends StatelessWidget {
  const _MaskedBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 62,
      height: 40,
      decoration: BoxDecoration(
        color: const Color(0xFFF4F7FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE0E6F5)),
      ),
      alignment: Alignment.center,
      child: const Icon(Icons.credit_card, color: _title, size: 20),
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

class _PaymentProvider {
  const _PaymentProvider({required this.assetPath});

  final String assetPath;
}

class _StoredCard {
  _StoredCard({
    required this.id,
    required this.holderName,
    required this.last4,
    required this.expiry,
  });

  final String id;
  final String holderName;
  final String last4;
  final String expiry;

  String get maskedNumber => '**** **** **** $last4';

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'holderName': holderName,
      'last4': last4,
      'expiry': expiry,
    };
  }

  factory _StoredCard.fromMap(Map<String, dynamic> map) {
    return _StoredCard(
      id: (map['id'] ?? '').toString(),
      holderName: (map['holderName'] ?? '').toString(),
      last4: (map['last4'] ?? '').toString(),
      expiry: (map['expiry'] ?? '').toString(),
    );
  }
}

class AddNewCardScreen extends StatefulWidget {
  const AddNewCardScreen({super.key});

  @override
  State<AddNewCardScreen> createState() => _AddNewCardScreenState();
}

class _AddNewCardScreenState extends State<AddNewCardScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _numberController = TextEditingController();
  final TextEditingController _expiryController = TextEditingController();
  final TextEditingController _cvvController = TextEditingController();

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _numberController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    super.dispose();
  }

  String _formatCardNumber(String input) {
    final digits = input.replaceAll(RegExp(r'[^0-9]'), '');
    final buffer = StringBuffer();
    for (int i = 0; i < digits.length && i < 16; i++) {
      if (i != 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(digits[i]);
    }
    return buffer.toString();
  }

  String _formatExpiry(String input) {
    final digits = input.replaceAll(RegExp(r'[^0-9]'), '');
    final buffer = StringBuffer();
    for (int i = 0; i < digits.length && i < 4; i++) {
      if (i == 2) buffer.write('/');
      buffer.write(digits[i]);
    }
    return buffer.toString();
  }

  Future<void> _saveCard() async {
    if (_isSaving) return;
    final String name = _nameController.text.trim();
    final String number = _numberController.text.replaceAll(
      RegExp(r'[^0-9]'),
      '',
    );
    if (name.isEmpty || number.length < 4) {
      _showToast(context.tr('card_details_required'));
      return;
    }
    final String last4 = number.substring(number.length - 4);
    setState(() => _isSaving = true);

    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final List<_StoredCard> cards = await _readCards(prefs);
    cards.add(
      _StoredCard(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        holderName: name,
        last4: last4,
        expiry: _expiryController.text.trim(),
      ),
    );
    await prefs.setString(
      _cardsKey,
      jsonEncode(cards.map((e) => e.toMap()).toList()),
    );

    if (!mounted) return;
    setState(() => _isSaving = false);
    _showToast(context.tr('card_added'));
    Navigator.of(context).pop(true);
  }

  Future<List<_StoredCard>> _readCards(SharedPreferences prefs) async {
    final String? raw = prefs.getString(_cardsKey);
    if (raw == null || raw.trim().isEmpty) return [];
    try {
      final List<dynamic> data = jsonDecode(raw) as List<dynamic>;
      return data.map((item) {
        if (item is Map<String, dynamic>) {
          return _StoredCard.fromMap(item);
        }
        return _StoredCard.fromMap(
          item.map((key, value) => MapEntry(key.toString(), value)),
        );
      }).toList();
    } catch (_) {
      return [];
    }
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
    final String previewNumber = _numberController.text.isEmpty
        ? '1234 5678 8765 0876'
        : _numberController.text;
    final String previewName = _nameController.text.isEmpty
        ? 'TIMMY C. HERNANDEZ'
        : _nameController.text.toUpperCase();
    final String previewExpiry = _expiryController.text.isEmpty
        ? '12/28'
        : _expiryController.text;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 16),
          child: _PrimaryButton(
            label: _isSaving
                ? context.tr('saving')
                : context.tr('add_new_card'),
            onTap: _isSaving ? () {} : _saveCard,
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
                18,
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
                        context.tr('add_new_card'),
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _CardPreview(
                    number: previewNumber,
                    expiry: previewExpiry,
                    name: previewName,
                  ),
                  const SizedBox(height: 18),
                  _Label(context.tr('card_name')),
                  const SizedBox(height: 8),
                  _TextFieldCard(
                    controller: _nameController,
                    hintText: 'Belinda C. Cullen',
                    keyboardType: TextInputType.name,
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 16),
                  _Label(context.tr('card_number')),
                  const SizedBox(height: 8),
                  _TextFieldCard(
                    controller: _numberController,
                    hintText: '**** **65 8765 3456',
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(19),
                    ],
                    onChanged: (value) {
                      final formatted = _formatCardNumber(value);
                      if (formatted != value) {
                        _numberController.value = TextEditingValue(
                          text: formatted,
                          selection: TextSelection.collapsed(
                            offset: formatted.length,
                          ),
                        );
                      }
                      setState(() {});
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Label(context.tr('expiry_date')),
                            const SizedBox(height: 8),
                            _TextFieldCard(
                              controller: _expiryController,
                              hintText: '12/28',
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(4),
                              ],
                              onChanged: (value) {
                                final formatted = _formatExpiry(value);
                                if (formatted != value) {
                                  _expiryController.value = TextEditingValue(
                                    text: formatted,
                                    selection: TextSelection.collapsed(
                                      offset: formatted.length,
                                    ),
                                  );
                                }
                                setState(() {});
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Label(context.tr('cvv')),
                            const SizedBox(height: 8),
                            _TextFieldCard(
                              controller: _cvvController,
                              hintText: '***',
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(3),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
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

class _CardPreview extends StatelessWidget {
  const _CardPreview({
    required this.number,
    required this.expiry,
    required this.name,
  });

  final String number;
  final String expiry;
  final String name;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 190,
      decoration: BoxDecoration(
        color: const Color(0xFF1B63E8),
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2E73F0), Color(0xFF0D5CE2)],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: 24,
            left: 24,
            child: Container(
              width: 36,
              height: 26,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Icon(Icons.sim_card, size: 16, color: Colors.white),
            ),
          ),
          Positioned(
            left: 24,
            bottom: 24,
            right: 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  number,
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'VALID',
                          style: GoogleFonts.poppins(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Colors.white70,
                          ),
                        ),
                        Text(
                          'THRU',
                          style: GoogleFonts.poppins(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 10),
                    Text(
                      expiry,
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  name,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: const Color(0xFF1C2040),
      ),
    );
  }
}

class _TextFieldCard extends StatelessWidget {
  const _TextFieldCard({
    required this.controller,
    required this.hintText,
    this.keyboardType,
    this.inputFormatters,
    this.onChanged,
  });

  final TextEditingController controller;
  final String hintText;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 18,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        onChanged: onChanged,
        style: GoogleFonts.poppins(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: const Color(0xFF363F5A),
        ),
        cursorColor: _primary,
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: hintText,
          hintStyle: GoogleFonts.poppins(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF9AA1B8),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 18,
            vertical: 18,
          ),
        ),
      ),
    );
  }
}
