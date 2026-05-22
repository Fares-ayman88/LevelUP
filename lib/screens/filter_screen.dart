import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class FilterScreen extends StatefulWidget {
  const FilterScreen({super.key});

  @override
  State<FilterScreen> createState() => _FilterScreenState();
}

class _FilterScreenState extends State<FilterScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF7D818F);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _accentGreen = Color(0xFF1F7C64);

  final List<_FilterItem> _subCategories = [
    _FilterItem('3D Design'),
    _FilterItem('Web Development', selected: true),
    _FilterItem('3D Animation', selected: true),
    _FilterItem('Graphic Design'),
    _FilterItem('SEO & Marketing'),
    _FilterItem('Arts & Humanities'),
  ];

  final List<_FilterItem> _levels = [
    _FilterItem('All Levels'),
    _FilterItem('Beginners', selected: true),
    _FilterItem('Intermediate', selected: true),
    _FilterItem('Expert'),
  ];

  final List<_FilterItem> _prices = [
    _FilterItem('Paid', selected: true),
    _FilterItem('Free'),
  ];

  final List<_FilterItem> _features = [
    _FilterItem('All Caption'),
    _FilterItem('Quizzes'),
    _FilterItem('Coding Exercise'),
    _FilterItem('Practice Tests'),
  ];

  final List<_FilterItem> _ratings = [
    _FilterItem('4.5 & Up Above'),
    _FilterItem('4.0 & Up Above'),
    _FilterItem('3.5 & Up Above'),
    _FilterItem('3.0 & Up Above'),
  ];

  final List<_FilterItem> _durations = [
    _FilterItem('0-2 Hours'),
    _FilterItem('3-6 Hours'),
    _FilterItem('7-16 Hours'),
    _FilterItem('17+ Hours'),
  ];

  void _clearAll() {
    setState(() {
      for (final item in [
        ..._subCategories,
        ..._levels,
        ..._prices,
        ..._features,
        ..._ratings,
        ..._durations,
      ]) {
        item.selected = false;
      }
    });
  }

  void _toggle(_FilterItem item) {
    setState(() {
      item.selected = !item.selected;
    });
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
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

            return Column(
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    12,
                    horizontalPadding,
                    6,
                  ),
                  child: Row(
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
                        'Filter',
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: _clearAll,
                        child: Text(
                          'Clear',
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: _primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: EdgeInsets.fromLTRB(
                      horizontalPadding,
                      8,
                      horizontalPadding,
                      0,
                    ),
                    children: [
                      _SectionTitle(title: 'SubCategories:'),
                      const SizedBox(height: 6),
                      ..._subCategories.map(
                        (item) =>
                            _FilterTile(item: item, onTap: () => _toggle(item)),
                      ),
                      const SizedBox(height: 12),
                      _SectionTitle(title: 'Levels:'),
                      const SizedBox(height: 6),
                      ..._levels.map(
                        (item) =>
                            _FilterTile(item: item, onTap: () => _toggle(item)),
                      ),
                      const SizedBox(height: 12),
                      _SectionTitle(title: 'Price:'),
                      const SizedBox(height: 6),
                      ..._prices.map(
                        (item) =>
                            _FilterTile(item: item, onTap: () => _toggle(item)),
                      ),
                      const SizedBox(height: 12),
                      _SectionTitle(title: 'Features:'),
                      const SizedBox(height: 6),
                      ..._features.map(
                        (item) =>
                            _FilterTile(item: item, onTap: () => _toggle(item)),
                      ),
                      const SizedBox(height: 12),
                      _SectionTitle(title: 'Rating:'),
                      const SizedBox(height: 6),
                      ..._ratings.map(
                        (item) =>
                            _FilterTile(item: item, onTap: () => _toggle(item)),
                      ),
                      const SizedBox(height: 12),
                      _SectionTitle(title: 'Video Durations:'),
                      const SizedBox(height: 6),
                      ..._durations.map(
                        (item) =>
                            _FilterTile(item: item, onTap: () => _toggle(item)),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    10,
                    horizontalPadding,
                    18,
                  ),
                  child: _ApplyButton(onTap: () => Navigator.of(context).pop()),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: _FilterScreenState._title,
      ),
    );
  }
}

class _FilterTile extends StatelessWidget {
  const _FilterTile({required this.item, required this.onTap});

  final _FilterItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bool selected = item.selected;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: selected
                    ? _FilterScreenState._accentGreen
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: selected
                      ? _FilterScreenState._accentGreen
                      : const Color(0xFFB7C1DA),
                  width: 1.5,
                ),
              ),
              child: selected
                  ? const Icon(Icons.check, size: 16, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 14),
            Text(
              item.label,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: _FilterScreenState._textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ApplyButton extends StatelessWidget {
  const _ApplyButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _FilterScreenState._primary,
      borderRadius: BorderRadius.circular(40),
      child: InkWell(
        borderRadius: BorderRadius.circular(40),
        onTap: onTap,
        child: SizedBox(
          height: 58,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 22),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(),
                Text(
                  'Apply',
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
                    color: _FilterScreenState._primary,
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

class _FilterItem {
  _FilterItem(this.label, {this.selected = false});

  final String label;
  bool selected;
}
