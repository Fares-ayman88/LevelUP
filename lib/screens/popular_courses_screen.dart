import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/course_catalog.dart';
import '../app_state/featured_order_store.dart';
import '../utils/image_utils.dart';
import '../widgets/search_bottom_sheet.dart';
import '../widgets/main_bottom_nav.dart';
import '../widgets/line_reload_indicator.dart';
import '../routes.dart';
import 'course_detail_screen.dart';

class PopularCoursesScreen extends StatefulWidget {
  const PopularCoursesScreen({super.key});

  @override
  State<PopularCoursesScreen> createState() => _PopularCoursesScreenState();
}

class _PopularCoursesScreenState extends State<PopularCoursesScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _chipSelected = Color(0xFF1F7C64);
  static const Color _chipUnselected = Color(0xFFEAF0FF);

  String _selectedFilter = 'All';
  bool _isRefreshing = false;
  bool _isPulling = false;

  bool _handlePullScroll(ScrollNotification notification) {
    if (notification is OverscrollNotification && notification.overscroll < 0) {
      if (!_isPulling) {
        setState(() => _isPulling = true);
      }
    } else if ((notification is ScrollEndNotification ||
            (notification is UserScrollNotification &&
                notification.direction == ScrollDirection.idle)) &&
        !_isRefreshing &&
        _isPulling) {
      setState(() => _isPulling = false);
    }
    return false;
  }

  List<String> _buildFilters(List<CourseItem> courses) {
    final Set<String> categories = courses
        .map((course) => course.category)
        .toSet();
    return ['All', ...categories];
  }

  List<CourseItem> _applyFilter(List<CourseItem> courses, String filter) {
    if (filter == 'All') return courses;
    return courses.where((course) => course.category == filter).toList();
  }

  Future<void> _handlePullToRefresh() async {
    if (_isRefreshing) return;
    setState(() {
      _isRefreshing = true;
      _isPulling = true;
    });
    try {
      await CourseCatalog.refresh();
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshing = false;
          _isPulling = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
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
                final List<String> filters = _buildFilters(courses);
                final String activeFilter = filters.contains(_selectedFilter)
                    ? _selectedFilter
                    : 'All';
                final List<CourseItem> filteredCourses = _applyFilter(
                  courses,
                  activeFilter,
                );

                final List<CourseItem> orderedCourses =
                    FeaturedOrderStore.orderCourses(filteredCourses);
                return Column(
                  children: [
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        horizontalPadding,
                        18,
                        horizontalPadding,
                        8,
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
                            'Popular Courses',
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: _title,
                            ),
                          ),
                          const Spacer(),
                          InkWell(
                            borderRadius: BorderRadius.circular(24),
                            onTap: () => showSearchBottomSheet(context),
                            child: Padding(
                              padding: const EdgeInsets.all(6),
                              child: SvgPicture.asset(
                                'assets/home/Fill 1.svg',
                                width: 20,
                                height: 20,
                                colorFilter: const ColorFilter.mode(
                                  _title,
                                  BlendMode.srcIn,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        horizontalPadding,
                        10,
                        horizontalPadding,
                        12,
                      ),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: filters.map((label) {
                            final bool selected = label == activeFilter;
                            return Padding(
                              padding: const EdgeInsets.only(right: 12),
                              child: GestureDetector(
                                onTap: () => setState(() {
                                  _selectedFilter = label;
                                }),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 18,
                                    vertical: 9,
                                  ),
                                  decoration: BoxDecoration(
                                    color: selected
                                        ? _chipSelected
                                        : _chipUnselected,
                                    borderRadius: BorderRadius.circular(24),
                                  ),
                                  child: Text(
                                    label,
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: selected
                                          ? Colors.white
                                          : const Color(0xFF7581A6),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Stack(
                        children: [
                          RefreshIndicator(
                            color: Colors.transparent,
                            backgroundColor: Colors.transparent,
                            strokeWidth: 0.01,
                            elevation: 0,
                            onRefresh: _handlePullToRefresh,
                            child: NotificationListener<ScrollNotification>(
                              onNotification: _handlePullScroll,
                              child: orderedCourses.isEmpty
                                  ? ListView(
                                      physics:
                                          const AlwaysScrollableScrollPhysics(
                                            parent: BouncingScrollPhysics(),
                                          ),
                                      children: [
                                        SizedBox(
                                          height: 220,
                                          child: Center(
                                            child: Text(
                                              'No courses found',
                                              style: GoogleFonts.poppins(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w600,
                                                color: const Color(0xFF9AA1B8),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    )
                                  : ListView.separated(
                                      physics:
                                          const AlwaysScrollableScrollPhysics(
                                            parent: BouncingScrollPhysics(),
                                          ),
                                      padding: EdgeInsets.fromLTRB(
                                        horizontalPadding,
                                        6,
                                        horizontalPadding,
                                        24,
                                      ),
                                      itemCount: orderedCourses.length,
                                      separatorBuilder: (_, __) =>
                                          const SizedBox(height: 16),
                                      itemBuilder: (context, index) {
                                        final course = orderedCourses[index];
                                        return _CourseCard(
                                          data: course,
                                          onToggleBookmark: () =>
                                              CourseCatalog.toggleBookmark(
                                                course.id,
                                              ),
                                          onTap: () =>
                                              Navigator.of(context).pushNamed(
                                                AppRoutes.courseDetail,
                                                arguments: CourseDetailArgs(
                                                  courseId: course.id,
                                                  category: course.category,
                                                  title: course.title,
                                                  mentorName: course.mentorName,
                                                  mentorSubtitle:
                                                      course.mentorSubtitle,
                                                  mentorImagePath:
                                                      course.mentorImagePath,
                                                  coverImagePath:
                                                      course.coverImagePath,
                                                  price: course.price,
                                                  rating: course.rating,
                                                  classes: course.classes,
                                                  hours: course.hours,
                                                  sections: course.sections,
                                                ),
                                              ),
                                        );
                                      },
                                    ),
                            ),
                          ),
                          Positioned.fill(
                            child: Align(
                              alignment: Alignment.topCenter,
                              child: LineReloadIndicator(
                                visible: _isRefreshing || _isPulling,
                              ),
                            ),
                          ),
                        ],
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

class _CourseCard extends StatefulWidget {
  const _CourseCard({
    required this.data,
    required this.onToggleBookmark,
    required this.onTap,
  });

  final CourseItem data;
  final Future<bool> Function() onToggleBookmark;
  final VoidCallback onTap;

  @override
  State<_CourseCard> createState() => _CourseCardState();
}

class _CourseCardState extends State<_CourseCard> {
  late bool _bookmarked;

  bool get _isNewCourse {
    final DateTime? createdAt = widget.data.createdAt;
    if (createdAt == null) return false;
    final DateTime nowUtc = DateTime.now().toUtc();
    final DateTime createdUtc = createdAt.toUtc();
    return createdUtc.isAfter(nowUtc.subtract(const Duration(hours: 24)));
  }

  Widget _buildNewBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D65FF), Color(0xFF3A8BFF)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [
          BoxShadow(
            color: Color(0x400D65FF),
            blurRadius: 14,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.auto_awesome, size: 12, color: Colors.white),
          const SizedBox(width: 5),
          Text(
            'NEW',
            style: GoogleFonts.poppins(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.4,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _bookmarked = widget.data.bookmarked;
  }

  @override
  void didUpdateWidget(covariant _CourseCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.data.bookmarked != widget.data.bookmarked) {
      _bookmarked = widget.data.bookmarked;
    }
  }

  Future<void> _handleToggle() async {
    setState(() {
      _bookmarked = !_bookmarked;
    });
    final bool saved = await widget.onToggleBookmark();
    if (!mounted) return;
    if (saved != _bookmarked) {
      setState(() => _bookmarked = saved);
    }
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
    final bool isBookmarked = _bookmarked;
    final bool isNewCourse = _isNewCourse;
    final Color iconColor = isBookmarked
        ? const Color(0xFF2F8E8A)
        : const Color(0xFFB6BED6);
    final Color badgeColor = isBookmarked
        ? const Color(0xFFEAF6F5)
        : const Color(0xFFF1F3F9);
    final Color badgeBorder = isBookmarked
        ? const Color(0xFFBFE6E3)
        : const Color(0xFFE0E3EF);
    final DecorationImage? coverImage = resolveDecorationImage(
      widget.data.coverImagePath,
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: widget.onTap,
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
                    child: Stack(
                      children: [
                        if (coverImage == null)
                          const Center(
                            child: Icon(
                              Icons.image_outlined,
                              color: Colors.white70,
                            ),
                          ),
                        if (isNewCourse)
                          Positioned(top: 8, left: 8, child: _buildNewBadge()),
                      ],
                    ),
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
                              widget.data.category,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFE2702B),
                              ),
                            ),
                            const Spacer(),
                            GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTap: _handleToggle,
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
                                    key: ValueKey(isBookmarked),
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
                          widget.data.title,
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
                              widget.data.price,
                              style: GoogleFonts.poppins(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0D65FF),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              widget.data.oldPrice,
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
                              widget.data.rating,
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
                              widget.data.students,
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
