import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../widgets/search_bottom_sheet.dart';

class AllCategoryScreen extends StatelessWidget {
  const AllCategoryScreen({super.key});
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF9AA1B8);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _label = Color(0xFF3C3F52);

  static const List<_CategoryData> _categories = [
    _CategoryData(
      label: '3D Design',
      assetPath: 'assets/onboarding/rafiki3.png',
    ),
    _CategoryData(
      label: 'Graphic Design',
      assetPath: 'assets/onboarding/rafiki2.png',
    ),
    _CategoryData(
      label: 'SEO & Marketing',
      assetPath: 'assets/onboarding/rafiki.png',
    ),
    _CategoryData(
      label: 'Finance & Accounting',
      assetPath: 'assets/lets_you_in/rafiki.png',
    ),
    _CategoryData(
      label: 'Personal Development',
      assetPath: 'assets/onboarding/rafiki3.png',
    ),
    _CategoryData(
      label: 'Office Productivity',
      assetPath: 'assets/onboarding/rafiki2.png',
    ),
    _CategoryData(
      label: 'HR Management',
      assetPath: 'assets/onboarding/rafiki.png',
    ),
    _CategoryData(
      label: 'Programming',
      assetPath: 'assets/onboarding/rafiki3.png',
    ),
    _CategoryData(
      label: 'Web Development',
      assetPath: 'assets/lets_you_in/rafiki.png',
    ),
    _CategoryData(
      label: 'Arts & Humanities',
      assetPath: 'assets/onboarding/rafiki2.png',
    ),
    _CategoryData(label: 'Business', assetPath: 'assets/onboarding/rafiki.png'),
    _CategoryData(
      label: 'Photography',
      assetPath: 'assets/onboarding/rafiki3.png',
    ),
  ];

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

            return CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(
                      horizontalPadding,
                      18,
                      horizontalPadding,
                      18,
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
                              'All Category',
                              style: GoogleFonts.poppins(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: _title,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 22),
                        _SearchBar(
                          primary: _primary,
                          mutedColor: _textMuted,
                          onTap: () => showSearchBottomSheet(context),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    14,
                    horizontalPadding,
                    24,
                  ),
                  sliver: SliverGrid.count(
                    crossAxisCount: 2,
                    mainAxisSpacing: 26,
                    crossAxisSpacing: 16,
                    childAspectRatio: 0.92,
                    children: _categories
                        .map(
                          (item) => _CategoryItem(
                            label: item.label,
                            assetPath: item.assetPath,
                            labelColor: _label,
                          ),
                        )
                        .toList(),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({
    required this.primary,
    required this.mutedColor,
    required this.onTap,
  });

  final Color primary;
  final Color mutedColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          height: 56,
          padding: const EdgeInsets.fromLTRB(18, 8, 10, 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1C7C8BB4),
                blurRadius: 22,
                offset: Offset(0, 14),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Search for..',
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: mutedColor,
                  ),
                ),
              ),
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: SvgPicture.asset(
                    'assets/home/Fill 1.svg',
                    width: 20,
                    height: 20,
                    colorFilter: const ColorFilter.mode(
                      Colors.white,
                      BlendMode.srcIn,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryData {
  const _CategoryData({required this.label, required this.assetPath});

  final String label;
  final String assetPath;
}

class _CategoryItem extends StatelessWidget {
  const _CategoryItem({
    required this.label,
    required this.assetPath,
    required this.labelColor,
  });

  final String label;
  final String assetPath;
  final Color labelColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          width: 110,
          height: 96,
          child: Image.asset(assetPath, fit: BoxFit.contain),
        ),
        const SizedBox(height: 10),
        Text(
          label,
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: labelColor,
          ),
        ),
      ],
    );
  }
}
