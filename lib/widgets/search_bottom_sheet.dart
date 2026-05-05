import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/course_catalog.dart';
import '../app_state/mentor_catalog.dart';
import '../routes.dart';
import '../screens/course_detail_screen.dart';
import '../screens/mentor_profile_screen.dart';
import '../utils/image_utils.dart';

Future<void> showSearchBottomSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.2),
    builder: (context) => const _SearchBottomSheetContent(),
  );
}

class _SearchBottomSheetContent extends StatefulWidget {
  const _SearchBottomSheetContent();

  @override
  State<_SearchBottomSheetContent> createState() =>
      _SearchBottomSheetContentState();
}

class _SearchBottomSheetContentState extends State<_SearchBottomSheetContent> {
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF9AA1B8);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _chipSelected = Color(0xFF1F7C64);
  static const Color _chipUnselected = Color(0xFFEAF0FF);

  static const List<String> _categories = [
    '3D Design',
    'Graphic Design',
    'SEO & Marketing',
    'Finance & Accounting',
    'Personal Development',
    'Office Productivity',
    'HR Management',
    'Programming',
    'Web Development',
    'Arts & Humanities',
    'Business',
    'Photography',
  ];

  static const List<String> _instructors = [
    'Sonja',
    'Jensen',
    'Victoria',
    'Castaldo',
  ];

  final TextEditingController _controller = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  late List<String> _recent;
  String _query = '';
  bool _showCourses = true;
  late List<_SearchCourse> _courses;
  late List<MentorItem> _mentors;

  @override
  void initState() {
    super.initState();
    _recent = List<String>.from(_SearchHistory.items);
    _courses = CourseCatalog.items.map(_SearchCourse.fromCourseItem).toList();
    _mentors = List<MentorItem>.from(MentorCatalog.items);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _searchFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _removeRecent(String item) {
    setState(() {
      _recent.remove(item);
      _SearchHistory.items
        ..clear()
        ..addAll(_recent);
    });
  }

  void _addRecent(String item) {
    setState(() {
      _recent.remove(item);
      _recent.insert(0, item);
      if (_recent.length > 10) {
        _recent = _recent.sublist(0, 10);
      }
      _SearchHistory.items
        ..clear()
        ..addAll(_recent);
    });
  }

  void _onQueryChanged(String value) {
    final String trimmed = value.trim();
    final List<_SearchCourse> courseMatches = _filterCourses(query: trimmed);
    final List<MentorItem> mentorMatches = _filterMentors(query: trimmed);
    setState(() {
      _query = trimmed;
      if (_query.isEmpty) return;
      if (courseMatches.isNotEmpty) {
        _showCourses = true;
      } else if (mentorMatches.isNotEmpty) {
        _showCourses = false;
      }
      if (_query.isEmpty) {
        _showCourses = true;
      }
    });
  }

  void _selectResult(String item) {
    _controller.text = item;
    _controller.selection = TextSelection.fromPosition(
      TextPosition(offset: item.length),
    );
    _addRecent(item);
    _onQueryChanged(item);
  }

  void _openCourseDetail(_SearchCourse course) {
    Navigator.of(context).pop();
    Navigator.of(context, rootNavigator: true).pushNamed(
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
    );
  }

  List<String> _filteredRecents() {
    final String query = _query.toLowerCase();
    if (query.isEmpty) return _recent;
    final List<String> source = [..._categories, ..._instructors];
    return source.where((item) => item.toLowerCase().contains(query)).toList();
  }

  List<_SearchCourse> _filterCourses({required String query}) {
    final String lower = query.toLowerCase();
    if (lower.isEmpty) return _courses;
    return _courses
        .where(
          (course) =>
              course.title.toLowerCase().contains(lower) ||
              course.category.toLowerCase().contains(lower),
        )
        .toList();
  }

  List<MentorItem> _filterMentors({required String query}) {
    final String lower = query.toLowerCase();
    if (lower.isEmpty) return _mentors;
    return _mentors
        .where(
          (mentor) =>
              mentor.name.toLowerCase().contains(lower) ||
              mentor.category.toLowerCase().contains(lower),
        )
        .toList();
  }

  Future<void> _toggleBookmark(_SearchCourse course) async {
    setState(() {
      final int index = _courses.indexWhere((item) => item.id == course.id);
      if (index == -1) return;
      _courses[index] = course.copyWith(bookmarked: !course.bookmarked);
    });
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

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    final double height = MediaQuery.of(context).size.height * 0.94;
    final bool showingResults = _query.isNotEmpty;
    final List<String> items = _filteredRecents();
    final List<_SearchCourse> courseResults = _filterCourses(query: _query);
    final List<MentorItem> mentorResults = _filterMentors(query: _query);
    final int foundCount = _showCourses
        ? courseResults.length
        : mentorResults.length;

    const double glassHeight = 120;
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
      child: SizedBox(
        height: height,
        child: Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0.0, 0.25, 0.6, 1.0],
                  colors: [
                    Color(0x33F5F9FF),
                    Color(0x99F5F9FF),
                    Color(0xE6F5F9FF),
                    Color(0xFFF5F9FF),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              height: glassHeight,
              child: ClipRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      border: Border(
                        bottom: BorderSide(
                          color: Colors.white.withValues(alpha: 0.7),
                          width: 1,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            SafeArea(
              top: false,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final double maxContentWidth = math.min(
                    constraints.maxWidth,
                    420,
                  );
                  final double horizontalPadding = math.max(
                    20,
                    (constraints.maxWidth - maxContentWidth) / 2,
                  );

                  return Padding(
                    padding: EdgeInsets.fromLTRB(
                      horizontalPadding,
                      18,
                      horizontalPadding,
                      20,
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
                              'Search',
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
                          controller: _controller,
                          focusNode: _searchFocus,
                          onChanged: _onQueryChanged,
                        ),
                        const SizedBox(height: 22),
                        if (showingResults) ...[
                          _ResultTabs(
                            showCourses: _showCourses,
                            onCourses: () =>
                                setState(() => _showCourses = true),
                            onMentors: () =>
                                setState(() => _showCourses = false),
                          ),
                          const SizedBox(height: 18),
                        ],
                        Row(
                          children: [
                            Text(
                              showingResults
                                  ? 'Result for "${_query.isEmpty ? '' : _query}"'
                                  : 'Recents Search',
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: _title,
                              ),
                            ),
                            const Spacer(),
                            if (showingResults) ...[
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
                            ] else ...[
                              Text(
                                'SEE ALL',
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
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
                          ],
                        ),
                        const SizedBox(height: 18),
                        Expanded(
                          child: showingResults
                              ? _showCourses
                                    ? _SearchCoursesList(
                                        items: courseResults,
                                        onToggle: _toggleBookmark,
                                        onTap: _openCourseDetail,
                                      )
                                    : _SearchMentorsList(items: mentorResults)
                              : items.isEmpty
                              ? Center(
                                  child: Text(
                                    'No recent searches',
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: _textMuted,
                                    ),
                                  ),
                                )
                              : ListView.separated(
                                  itemCount: items.length,
                                  separatorBuilder: (_, __) =>
                                      const SizedBox(height: 10),
                                  itemBuilder: (context, index) {
                                    final String item = items[index];
                                    return InkWell(
                                      borderRadius: BorderRadius.circular(12),
                                      onTap: () => _selectResult(item),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 14,
                                          vertical: 12,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(
                                            alpha: 0.85,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: Colors.white.withValues(
                                              alpha: 0.9,
                                            ),
                                            width: 1,
                                          ),
                                          boxShadow: const [
                                            BoxShadow(
                                              color: Color(0x14697AA0),
                                              blurRadius: 12,
                                              offset: Offset(0, 8),
                                            ),
                                          ],
                                        ),
                                        child: Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                item,
                                                style: GoogleFonts.poppins(
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.w600,
                                                  color: _title,
                                                ),
                                              ),
                                            ),
                                            GestureDetector(
                                              onTap: () => _removeRecent(item),
                                              child: const Icon(
                                                Icons.close,
                                                size: 18,
                                                color: _title,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({
    required this.primary,
    required this.mutedColor,
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  final Color primary;
  final Color mutedColor;
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

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
              focusNode: focusNode,
              autofocus: true,
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
                  color: mutedColor,
                ),
                border: InputBorder.none,
                isDense: true,
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
    );
  }
}

class _SearchHistory {
  static final List<String> items = [
    '3D Design',
    'Graphic Design',
    'SEO & Marketing',
    'Office Productivity',
    'Personal Development',
    'Finance & Accounting',
  ];
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
              ? _SearchBottomSheetContentState._chipSelected
              : _SearchBottomSheetContentState._chipUnselected,
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

  final List<_SearchCourse> items;
  final ValueChanged<_SearchCourse> onToggle;
  final ValueChanged<_SearchCourse> onTap;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Center(
        child: Text(
          'No courses found',
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: _SearchBottomSheetContentState._textMuted,
          ),
        ),
      );
    }
    return ListView.separated(
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final _SearchCourse course = items[index];
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

  final _SearchCourse data;
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
            color: _SearchBottomSheetContentState._textMuted,
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
          onTap: () {
            Navigator.of(context).pop();
            Navigator.of(context, rootNavigator: true).pushNamed(
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
            );
          },
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

class _SearchCourse {
  const _SearchCourse({
    required this.id,
    required this.category,
    required this.title,
    required this.mentorName,
    required this.mentorSubtitle,
    required this.mentorImagePath,
    required this.coverImagePath,
    required this.price,
    required this.oldPrice,
    required this.rating,
    required this.students,
    required this.classes,
    required this.hours,
    required this.bookmarked,
    required this.sections,
  });

  final String id;
  final String category;
  final String title;
  final String mentorName;
  final String mentorSubtitle;
  final String? mentorImagePath;
  final String? coverImagePath;
  final String price;
  final String oldPrice;
  final String rating;
  final String students;
  final int classes;
  final int hours;
  final bool bookmarked;
  final List<CourseSection> sections;

  factory _SearchCourse.fromCourseItem(CourseItem course) {
    return _SearchCourse(
      id: course.id,
      category: course.category,
      title: course.title,
      mentorName: course.mentorName,
      mentorSubtitle: course.mentorSubtitle,
      mentorImagePath: course.mentorImagePath,
      coverImagePath: course.coverImagePath,
      price: course.price,
      oldPrice: course.oldPrice,
      rating: course.rating,
      students: course.students,
      classes: course.classes,
      hours: course.hours,
      bookmarked: course.bookmarked,
      sections: course.sections,
    );
  }

  _SearchCourse copyWith({
    bool? bookmarked,
    List<CourseSection>? sections,
    String? mentorName,
    String? mentorSubtitle,
    String? mentorImagePath,
    String? coverImagePath,
  }) {
    return _SearchCourse(
      id: id,
      category: category,
      title: title,
      mentorName: mentorName ?? this.mentorName,
      mentorSubtitle: mentorSubtitle ?? this.mentorSubtitle,
      mentorImagePath: mentorImagePath ?? this.mentorImagePath,
      coverImagePath: coverImagePath ?? this.coverImagePath,
      price: price,
      oldPrice: oldPrice,
      rating: rating,
      students: students,
      classes: classes,
      hours: hours,
      bookmarked: bookmarked ?? this.bookmarked,
      sections: sections ?? this.sections,
    );
  }
}
