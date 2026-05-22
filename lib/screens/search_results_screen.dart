import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/course_catalog.dart';
import '../app_state/mentor_catalog.dart';
import '../routes.dart';
import '../utils/image_utils.dart';
import 'course_detail_screen.dart';
import '../widgets/main_bottom_nav.dart';
import 'mentor_profile_screen.dart';

class SearchResultsScreen extends StatefulWidget {
  const SearchResultsScreen({super.key});

  @override
  State<SearchResultsScreen> createState() => _SearchResultsScreenState();
}

class _SearchResultsScreenState extends State<SearchResultsScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF9AA1B8);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _chipSelected = Color(0xFF1F7C64);
  static const Color _chipUnselected = Color(0xFFEAF0FF);

  final TextEditingController _controller = TextEditingController(
    text: 'Graphic Design',
  );
  String _query = 'Graphic Design';
  bool _showCourses = true;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    final String trimmed = value.trim();
    final List<CourseItem> courseMatches = _filterCourses(
      courses: CourseCatalog.items,
      query: trimmed,
    );
    final List<MentorItem> mentorMatches = _filterMentors(
      mentors: MentorCatalog.items,
      query: trimmed,
    );
    setState(() {
      _query = trimmed;
      if (_query.isEmpty) return;
      if (courseMatches.isNotEmpty) {
        _showCourses = true;
      } else if (mentorMatches.isNotEmpty) {
        _showCourses = false;
      }
    });
  }

  List<CourseItem> _filterCourses({
    required List<CourseItem> courses,
    required String query,
  }) {
    final String lower = query.toLowerCase();
    if (lower.isEmpty) return courses;
    return courses
        .where(
          (course) =>
              course.title.toLowerCase().contains(lower) ||
              course.category.toLowerCase().contains(lower),
        )
        .toList();
  }

  List<MentorItem> _filterMentors({
    required List<MentorItem> mentors,
    required String query,
  }) {
    final String lower = query.toLowerCase();
    if (lower.isEmpty) return mentors;
    return mentors
        .where(
          (mentor) =>
              mentor.name.toLowerCase().contains(lower) ||
              mentor.category.toLowerCase().contains(lower),
        )
        .toList();
  }

  Future<void> _toggleBookmark(CourseItem course) async {
    final bool saved = await CourseCatalog.toggleBookmark(course.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          saved ? 'Saved to your courses.' : 'Removed from saved.',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _openFilterSheet() async {
    final bool? showCourses = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Filter',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: _title,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _TabPill(
                      label: 'Courses',
                      selected: _showCourses,
                      onTap: () => Navigator.of(context).pop(true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _TabPill(
                      label: 'Mentors',
                      selected: !_showCourses,
                      onTap: () => Navigator.of(context).pop(false),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );

    if (showCourses != null) {
      setState(() => _showCourses = showCourses);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: const MainBottomNav(currentIndex: 0),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 420);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return ValueListenableBuilder<List<CourseItem>>(
              valueListenable: CourseCatalog.courses,
              builder: (context, courses, _) {
                final List<CourseItem> courseResults = _filterCourses(
                  courses: courses,
                  query: _query,
                );
                final List<MentorItem> mentorResults = _filterMentors(
                  mentors: MentorCatalog.items,
                  query: _query,
                );
                final int foundCount = _showCourses
                    ? courseResults.length
                    : mentorResults.length;
                final String headerTitle = _showCourses
                    ? 'Online Courses'
                    : 'Mentors';
                final String queryLabel = _query.isEmpty ? 'All' : _query;

                return Column(
                  children: [
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        horizontalPadding,
                        18,
                        horizontalPadding,
                        0,
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
                            headerTitle,
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: _title,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        horizontalPadding,
                        18,
                        horizontalPadding,
                        0,
                      ),
                      child: _SearchBar(
                        controller: _controller,
                        onChanged: _onQueryChanged,
                        onFilterTap: _openFilterSheet,
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        horizontalPadding,
                        18,
                        horizontalPadding,
                        0,
                      ),
                      child: _ResultTabs(
                        showCourses: _showCourses,
                        onCourses: () => setState(() => _showCourses = true),
                        onMentors: () => setState(() => _showCourses = false),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        horizontalPadding,
                        16,
                        horizontalPadding,
                        0,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Result for "$queryLabel"',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.poppins(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: _title,
                              ),
                            ),
                          ),
                          const Spacer(),
                          FittedBox(
                            child: Row(
                              children: [
                                Text(
                                  '$foundCount FOUNDS',
                                  style: GoogleFonts.poppins(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: _primary,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Icon(
                                  Icons.arrow_forward_ios,
                                  size: 12,
                                  color: _primary,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          horizontalPadding,
                          0,
                          horizontalPadding,
                          16,
                        ),
                        child: _showCourses
                            ? _SearchCoursesList(
                                items: courseResults,
                                onToggle: _toggleBookmark,
                                onTap: (course) =>
                                    Navigator.of(context).pushNamed(
                                      AppRoutes.courseDetail,
                                      arguments: CourseDetailArgs(
                                        courseId: course.id,
                                        category: course.category,
                                        title: course.title,
                                        mentorName: course.mentorName,
                                        mentorSubtitle: course.mentorSubtitle,
                                        mentorImagePath: course.mentorImagePath,
                                        coverImagePath: course.coverImagePath,
                                        price: course.price,
                                        rating: course.rating,
                                        classes: course.classes,
                                        hours: course.hours,
                                        sections: course.sections,
                                      ),
                                    ),
                              )
                            : _SearchMentorsList(items: mentorResults),
                      ),
                    ),
                  ],
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({
    required this.controller,
    required this.onChanged,
    required this.onFilterTap,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onFilterTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      padding: const EdgeInsets.fromLTRB(16, 8, 10, 8),
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
          SvgPicture.asset(
            'assets/home/Fill 1.svg',
            width: 20,
            height: 20,
            colorFilter: const ColorFilter.mode(
              Color(0xFF1C1F2A),
              BlendMode.srcIn,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1C1F2A),
              ),
              cursorColor: const Color(0xFF0D65FF),
              decoration: InputDecoration(
                hintText: 'Graphic Design',
                hintStyle: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: _SearchResultsScreenState._textMuted,
                ),
                border: InputBorder.none,
                isDense: true,
              ),
            ),
          ),
          Material(
            color: _SearchResultsScreenState._primary,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: onFilterTap,
              borderRadius: BorderRadius.circular(12),
              child: const SizedBox(
                width: 42,
                height: 42,
                child: Icon(Icons.tune_rounded, color: Colors.white, size: 20),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultTabs extends StatelessWidget {
  const _ResultTabs({
    required this.showCourses,
    required this.onCourses,
    required this.onMentors,
  });

  final bool showCourses;
  final VoidCallback onCourses;
  final VoidCallback onMentors;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _TabPill(
            label: 'Courses',
            selected: showCourses,
            onTap: onCourses,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _TabPill(
            label: 'Mentors',
            selected: !showCourses,
            onTap: onMentors,
          ),
        ),
      ],
    );
  }
}

class _TabPill extends StatelessWidget {
  const _TabPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: selected
              ? _SearchResultsScreenState._chipSelected
              : _SearchResultsScreenState._chipUnselected,
          borderRadius: BorderRadius.circular(24),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : const Color(0xFF2A2D3F),
          ),
        ),
      ),
    );
  }
}

class _SearchCoursesList extends StatelessWidget {
  const _SearchCoursesList({
    required this.items,
    required this.onToggle,
    required this.onTap,
  });

  final List<CourseItem> items;
  final ValueChanged<CourseItem> onToggle;
  final ValueChanged<CourseItem> onTap;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Center(
        child: Text(
          'No courses found',
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: _SearchResultsScreenState._textMuted,
          ),
        ),
      );
    }
    return ListView.separated(
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final CourseItem course = items[index];
        return _SearchCourseCard(
          data: course,
          onToggle: () => onToggle(course),
          onTap: () => onTap(course),
        );
      },
    );
  }
}

class _SearchCourseCard extends StatelessWidget {
  const _SearchCourseCard({
    required this.data,
    required this.onToggle,
    required this.onTap,
  });

  final CourseItem data;
  final VoidCallback onToggle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final Color iconColor = data.bookmarked
        ? const Color(0xFF2F8E8A)
        : const Color(0xFFB6BED6);
    final Color badgeColor = data.bookmarked
        ? const Color(0xFFEAF6F5)
        : const Color(0xFFF1F3F9);
    final Color badgeBorder = data.bookmarked
        ? const Color(0xFFBFE6E3)
        : const Color(0xFFE0E3EF);
    final DecorationImage? coverImage = resolveDecorationImage(
      data.coverImagePath,
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 140),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1C7C8BB4),
                blurRadius: 22,
                offset: Offset(0, 14),
              ),
            ],
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(20),
                  ),
                  child: Container(
                    width: 120,
                    decoration: BoxDecoration(
                      color: Colors.black,
                      image: coverImage,
                    ),
                    child: coverImage == null
                        ? const Center(
                            child: Icon(
                              Icons.image_outlined,
                              color: Colors.white70,
                            ),
                          )
                        : null,
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              data.category,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFE2702B),
                              ),
                            ),
                            const Spacer(),
                            GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTap: onToggle,
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: badgeColor,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: badgeBorder,
                                    width: 1,
                                  ),
                                ),
                                child: Center(
                                  child: SvgPicture.asset(
                                    'assets/home/book mark.svg',
                                    width: 16,
                                    height: 18,
                                    colorFilter: ColorFilter.mode(
                                      iconColor,
                                      BlendMode.srcIn,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          data.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF1C2140),
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(
                              data.price,
                              style: GoogleFonts.poppins(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0D65FF),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              data.oldPrice,
                              style: GoogleFonts.poppins(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFFB6BED6),
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(
                              Icons.star,
                              size: 14,
                              color: Color(0xFFF4B400),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              data.rating,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF4A4E5F),
                              ),
                            ),
                            const SizedBox(width: 10),
                            const Text(
                              '|',
                              style: TextStyle(color: Color(0xFFB6BED6)),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              data.students,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF4A4E5F),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
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

class _SearchMentorsList extends StatelessWidget {
  const _SearchMentorsList({required this.items});

  final List<MentorItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Center(
        child: Text(
          'No mentors found',
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: _SearchResultsScreenState._textMuted,
          ),
        ),
      );
    }
    return ListView.separated(
      itemCount: items.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final MentorItem mentor = items[index];
        return InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => Navigator.of(context).pushNamed(
            AppRoutes.mentorProfile,
            arguments: MentorProfileArgs(
              name: mentor.name,
              subtitle: mentor.subtitle,
              courses: mentor.courses,
              students: mentor.students,
              ratings: mentor.ratings,
              imagePath: mentor.imagePath,
              mentorId: mentor.id,
              bio: mentor.bio,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        mentor.name,
                        textAlign: TextAlign.right,
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF202244),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        mentor.category,
                        textAlign: TextAlign.right,
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF7D818F),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Builder(
                  builder: (context) {
                    final DecorationImage? mentorImage = resolveDecorationImage(
                      mentor.imagePath,
                    );
                    return Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEAF0FF),
                        shape: BoxShape.circle,
                        image: mentorImage,
                      ),
                      child: mentorImage == null
                          ? const Icon(Icons.person, color: Color(0xFF7D818F))
                          : null,
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
