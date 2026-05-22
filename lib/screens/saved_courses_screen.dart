import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/course_catalog.dart';
import '../routes.dart';
import '../utils/image_utils.dart';
import 'course_detail_screen.dart';

class SavedCoursesScreen extends StatefulWidget {
  const SavedCoursesScreen({super.key});

  @override
  State<SavedCoursesScreen> createState() => _SavedCoursesScreenState();
}

class _SavedCoursesScreenState extends State<SavedCoursesScreen> {
  static const Color _title = Color(0xFF202244);

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  void _showMessage(String message) {
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

  Future<void> _toggleBookmark(CourseItem course) async {
    final bool saved = await CourseCatalog.toggleBookmark(course.id);
    if (!mounted) return;
    _showMessage(saved ? 'Saved to your courses.' : 'Removed from saved.');
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

            return ValueListenableBuilder<List<CourseItem>>(
              valueListenable: CourseCatalog.courses,
              builder: (context, courses, _) {
                final List<CourseItem> savedCourses = courses
                    .where((course) => course.bookmarked)
                    .toList();

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
                            'Saved Courses',
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: _title,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: savedCourses.isEmpty
                          ? Center(
                              child: Text(
                                'No saved courses yet',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF9AA1B8),
                                ),
                              ),
                            )
                          : ListView.separated(
                              padding: EdgeInsets.fromLTRB(
                                horizontalPadding,
                                6,
                                horizontalPadding,
                                24,
                              ),
                              itemCount: savedCourses.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 16),
                              itemBuilder: (context, index) {
                                final CourseItem course = savedCourses[index];
                                return _CourseCard(
                                  data: course,
                                  onToggleBookmark: () =>
                                      _toggleBookmark(course),
                                  onTap: () => Navigator.of(context).pushNamed(
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
                                );
                              },
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
  final VoidCallback onToggleBookmark;
  final VoidCallback onTap;

  @override
  State<_CourseCard> createState() => _CourseCardState();
}

class _CourseCardState extends State<_CourseCard> {
  late bool _bookmarked;

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

  void _handleToggle() {
    setState(() {
      _bookmarked = !_bookmarked;
    });
    widget.onToggleBookmark();
  }

  @override
  Widget build(BuildContext context) {
    final bool isBookmarked = _bookmarked;
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
