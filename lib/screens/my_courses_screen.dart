import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/course_catalog.dart';
import '../app_state/course_progress.dart';
import '../app_state/transaction_catalog.dart';
import '../app_state/user_profile.dart';
import '../routes.dart';
import '../widgets/main_bottom_nav.dart';
import 'completed_course_screen.dart';
import 'certificate_screen.dart';
import 'course_detail_screen.dart';

class MyCoursesScreen extends StatefulWidget {
  const MyCoursesScreen({super.key});

  @override
  State<MyCoursesScreen> createState() => _MyCoursesScreenState();
}

class _MyCoursesScreenState extends State<MyCoursesScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _accentGreen = Color(0xFF1F7C64);
  static const Color _chipUnselected = Color(0xFFEAF0FF);

  static const List<Color> _progressPalette = <Color>[
    Color(0xFF1F7C64),
    Color(0xFFF4B400),
    Color(0xFFF28B30),
  ];
  static const int _fallbackLessonCount = 8;

  bool _showCompleted = false;
  final TextEditingController _searchController = TextEditingController();
  String _query = '';
  final List<_MyCourse> _completedCourses = <_MyCourse>[];
  final List<_MyCourse> _ongoingCourses = <_MyCourse>[];
  late final VoidCallback _transactionsListener;
  late final VoidCallback _catalogListener;
  late final VoidCallback _progressListener;

  List<_MyCourse> get _visibleCourses {
    final List<_MyCourse> source = _showCompleted
        ? _completedCourses
        : _ongoingCourses;
    final String trimmed = _query.trim().toLowerCase();
    if (trimmed.isEmpty) return source;
    return source
        .where(
          (course) =>
              course.title.toLowerCase().contains(trimmed) ||
              course.category.toLowerCase().contains(trimmed),
        )
        .toList();
  }

  @override
  void initState() {
    super.initState();
    _transactionsListener = _rebuildCourses;
    _catalogListener = _rebuildCourses;
    _progressListener = _rebuildCourses;
    TransactionCatalog.userTransactions.addListener(_transactionsListener);
    CourseCatalog.courses.addListener(_catalogListener);
    CourseProgressStore.revision.addListener(_progressListener);
    _rebuildCourses();
  }

  void _rebuildCourses() {
    final Map<String, CourseItem> catalogById = <String, CourseItem>{};
    final Map<String, CourseItem> catalogByTitle = <String, CourseItem>{};
    for (final CourseItem course in CourseCatalog.items) {
      final String normalizedId = course.id.trim();
      if (normalizedId.isNotEmpty) {
        catalogById[normalizedId] = course;
      }
      final String normalizedTitle = _normalizeCourseTitle(course.title);
      if (normalizedTitle.isEmpty) continue;
      catalogByTitle[normalizedTitle] = course;
    }

    final List<TransactionItem> paidTransactions =
        TransactionCatalog.userTransactions.value
            .where((item) => item.status == TransactionStatus.paid)
            .toList()
          ..sort((a, b) {
            final DateTime aTime =
                a.updatedAt ??
                a.createdAt ??
                DateTime.fromMillisecondsSinceEpoch(0);
            final DateTime bTime =
                b.updatedAt ??
                b.createdAt ??
                DateTime.fromMillisecondsSinceEpoch(0);
            return bTime.compareTo(aTime);
          });

    final Set<String> seenCourseKeys = <String>{};
    final List<_MyCourse> completed = <_MyCourse>[];
    final List<_MyCourse> ongoing = <_MyCourse>[];

    for (final TransactionItem transaction in paidTransactions) {
      final String transactionCourseId = transaction.courseId.trim();
      final String normalizedTitle = _normalizeCourseTitle(
        transaction.courseTitle,
      );
      final String dedupeKey = transactionCourseId.isNotEmpty
          ? 'id:$transactionCourseId'
          : (normalizedTitle.isNotEmpty ? 'title:$normalizedTitle' : '');
      if (dedupeKey.isEmpty || !seenCourseKeys.add(dedupeKey)) {
        continue;
      }

      CourseItem? course;
      if (transactionCourseId.isNotEmpty) {
        course = catalogById[transactionCourseId];
      }
      course ??= catalogByTitle[normalizedTitle];
      course ??= _findCourseByTitleFuzzy(
        source: transaction.courseTitle,
        items: CourseCatalog.items,
      );
      final String title = (course?.title ?? transaction.courseTitle).trim();
      if (title.isEmpty) continue;
      final String category =
          (course?.category ?? transaction.courseCategory).trim().isEmpty
          ? 'General'
          : (course?.category ?? transaction.courseCategory).trim();
      final String courseId = (course?.id ?? transactionCourseId).trim();
      final String rating = _normalizeRating(course?.rating ?? '');
      final int hours = course?.hours ?? 0;
      final String price =
          (course?.price ?? transaction.priceLabel).trim().isEmpty
          ? transaction.priceLabel
          : (course?.price ?? transaction.priceLabel);

      final CourseCompletionData? existingCompletion =
          CourseProgressStore.completionFor(title, courseId: courseId);
      final int totalLessons = _resolveProgressTotal(
        course: course,
        completion: existingCompletion,
      );
      final Set<int> watchedLessons = CourseProgressStore.completedLessons(
        title,
        courseId: courseId,
      );
      int watchedCount = watchedLessons.length;
      if (totalLessons > 0) {
        watchedCount = watchedCount.clamp(0, totalLessons).toInt();
      }

      CourseCompletionData? completion = existingCompletion;
      if (completion == null &&
          totalLessons > 0 &&
          watchedCount >= totalLessons) {
        completion = CourseProgressStore.markCourseCompleted(
          title: title,
          category: category,
          rating: rating,
          price: price,
          classes: totalLessons,
          hours: hours,
          courseId: courseId,
        );
      }

      final bool isCompleted =
          completion != null ||
          (totalLessons > 0 && watchedCount >= totalLessons);
      final _MyCourse item = _MyCourse(
        courseId: courseId,
        category: category,
        title: title,
        rating: rating,
        duration: _formatDuration(hours),
        price: price,
        classes: totalLessons > 0 ? totalLessons : (course?.classes ?? 0),
        hours: hours,
        certificateId: completion?.certificateId ?? '',
        completed: isCompleted,
        progress: isCompleted && totalLessons > 0 ? totalLessons : watchedCount,
        progressTotal: totalLessons,
        progressColor: _progressColorForTitle(title),
        mentorName: course?.mentorName ?? '',
        mentorSubtitle: course?.mentorSubtitle ?? '',
        mentorImagePath: course?.mentorImagePath,
        coverImagePath: course?.coverImagePath,
        sections: course?.sections ?? const <CourseSection>[],
      );

      if (isCompleted) {
        completed.add(item.copyWith(completed: true));
      } else {
        ongoing.add(item.copyWith(completed: false));
      }
    }

    if (!mounted) {
      _completedCourses
        ..clear()
        ..addAll(completed);
      _ongoingCourses
        ..clear()
        ..addAll(ongoing);
      return;
    }

    setState(() {
      _completedCourses
        ..clear()
        ..addAll(completed);
      _ongoingCourses
        ..clear()
        ..addAll(ongoing);
      if (_showCompleted &&
          _completedCourses.isEmpty &&
          _ongoingCourses.isNotEmpty) {
        _showCompleted = false;
      }
    });
  }

  int _resolveProgressTotal({
    required CourseItem? course,
    required CourseCompletionData? completion,
  }) {
    if (course != null) {
      final int fromSections = _countLessons(course.sections);
      if (fromSections > 0) return fromSections;
      if (course.classes > 0) {
        return math.min(course.classes, _fallbackLessonCount);
      }
    }
    if (completion != null && completion.classes > 0) {
      return completion.classes;
    }
    return 0;
  }

  int _countLessons(List<CourseSection> sections) {
    return sections.fold<int>(
      0,
      (value, section) => value + section.lessons.length,
    );
  }

  String _normalizeRating(String raw) {
    final String trimmed = raw.trim();
    final double? parsed = double.tryParse(trimmed);
    if (parsed == null) return trimmed.isEmpty ? '0.0' : trimmed;
    return parsed.toStringAsFixed(1);
  }

  String _normalizeCourseTitle(String raw) {
    final String lowered = raw.trim().toLowerCase();
    if (lowered.isEmpty) return '';
    return lowered
        .replaceAll(RegExp(r'[^a-z0-9\u0600-\u06FF\s]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  CourseItem? _findCourseByTitleFuzzy({
    required String source,
    required List<CourseItem> items,
  }) {
    final String target = _normalizeCourseTitle(source);
    if (target.isEmpty) return null;
    CourseItem? best;
    int bestScore = 0;
    for (final CourseItem course in items) {
      final String candidate = _normalizeCourseTitle(course.title);
      if (candidate.isEmpty) continue;
      if (candidate == target) return course;
      if ((candidate.length >= 8 && candidate.contains(target)) ||
          (target.length >= 8 && target.contains(candidate))) {
        return course;
      }
      final int score = _titleTokenScore(target, candidate);
      if (score > bestScore) {
        best = course;
        bestScore = score;
      }
    }
    return bestScore > 0 ? best : null;
  }

  int _titleTokenScore(String left, String right) {
    final Set<String> leftTokens = left
        .split(' ')
        .where((token) => token.length >= 3)
        .toSet();
    final Set<String> rightTokens = right
        .split(' ')
        .where((token) => token.length >= 3)
        .toSet();
    if (leftTokens.isEmpty || rightTokens.isEmpty) return 0;
    return leftTokens.intersection(rightTokens).length;
  }

  String _formatDuration(int hours) {
    if (hours <= 0) return '0 Hrs';
    return '$hours Hrs';
  }

  Color _progressColorForTitle(String title) {
    if (title.trim().isEmpty) return _progressPalette.first;
    final int hash = title.runes.fold<int>(
      0,
      (value, rune) => (value + rune) & 0x7fffffff,
    );
    return _progressPalette[hash % _progressPalette.length];
  }

  @override
  void dispose() {
    TransactionCatalog.userTransactions.removeListener(_transactionsListener);
    CourseCatalog.courses.removeListener(_catalogListener);
    CourseProgressStore.revision.removeListener(_progressListener);
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: const MainBottomNav(currentIndex: 1),
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
                    18,
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
                        'My Courses',
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                      const Spacer(),
                      InkWell(
                        borderRadius: BorderRadius.circular(22),
                        onTap: () =>
                            Navigator.of(context).pushNamed(AppRoutes.profile),
                        child: const Padding(
                          padding: EdgeInsets.all(6),
                          child: Icon(
                            Icons.person_outline,
                            size: 26,
                            color: _title,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    12,
                    horizontalPadding,
                    16,
                  ),
                  child: _SearchBar(
                    muted: _muted,
                    placeholder: 'Search for ...',
                    controller: _searchController,
                    onChanged: (value) => setState(() {
                      _query = value;
                    }),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    0,
                    horizontalPadding,
                    18,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _TabPill(
                          label: 'Ongoing',
                          selected: !_showCompleted,
                          selectedColor: _accentGreen,
                          unselectedColor: _chipUnselected,
                          onTap: () => setState(() {
                            _showCompleted = false;
                          }),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: _TabPill(
                          label: 'Completed',
                          selected: _showCompleted,
                          selectedColor: _accentGreen,
                          unselectedColor: _chipUnselected,
                          onTap: () => setState(() {
                            _showCompleted = true;
                          }),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: _visibleCourses.isEmpty
                      ? Center(
                          child: Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: horizontalPadding,
                            ),
                            child: Text(
                              _showCompleted
                                  ? 'No completed courses yet.'
                                  : 'No ongoing courses yet.',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: _muted,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        )
                      : ListView.separated(
                          padding: EdgeInsets.fromLTRB(
                            horizontalPadding,
                            0,
                            horizontalPadding,
                            24,
                          ),
                          itemCount: _visibleCourses.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 16),
                          itemBuilder: (context, index) {
                            final _MyCourse course = _visibleCourses[index];
                            return _CourseCard(
                              course: course,
                              onCertificateTap: course.completed
                                  ? () {
                                      final String userName = UserProfile
                                          .userName
                                          .trim();
                                      Navigator.of(context).pushNamed(
                                        AppRoutes.certificate,
                                        arguments: CertificateArgs(
                                          courseTitle: course.title,
                                          userName: userName,
                                          certificateId: course.certificateId,
                                        ),
                                      );
                                    }
                                  : null,
                              onTap: () async {
                                if (course.completed) {
                                  Navigator.of(context).pushNamed(
                                    AppRoutes.completedCourse,
                                    arguments: CompletedCourseArgs(
                                      title: course.title,
                                      category: course.category,
                                      rating: course.rating,
                                      price: course.price,
                                      classes: course.classes,
                                      hours: course.hours,
                                      certificateId: course.certificateId,
                                    ),
                                  );
                                  return;
                                }

                                await Navigator.of(context).pushNamed(
                                  AppRoutes.courseDetail,
                                  arguments: CourseDetailArgs(
                                    courseId: course.courseId,
                                    category: course.category,
                                    title: course.title,
                                    mentorName: course.mentorName,
                                    mentorSubtitle:
                                        course.mentorSubtitle.trim().isNotEmpty
                                        ? course.mentorSubtitle
                                        : '${course.category} Mentor',
                                    mentorImagePath: course.mentorImagePath,
                                    coverImagePath: course.coverImagePath,
                                    price: course.price,
                                    rating: course.rating,
                                    classes: course.progressTotal > 0
                                        ? course.progressTotal
                                        : course.classes,
                                    hours: course.hours,
                                    sections: course.sections,
                                    isEnrolled: true,
                                  ),
                                );
                                if (!mounted) return;
                                _rebuildCourses();
                              },
                            );
                          },
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
    required this.muted,
    required this.placeholder,
    required this.controller,
    required this.onChanged,
  });

  final Color muted;
  final String placeholder;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 58,
      padding: const EdgeInsets.fromLTRB(18, 6, 12, 6),
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
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              textInputAction: TextInputAction.search,
              cursorColor: const Color(0xFF0D65FF),
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF202244),
              ),
              decoration: InputDecoration(
                hintText: placeholder,
                hintStyle: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: muted,
                ),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
          SvgPicture.asset(
            'assets/my_courses/search.svg',
            width: 42,
            height: 42,
          ),
        ],
      ),
    );
  }
}

class _TabPill extends StatelessWidget {
  const _TabPill({
    required this.label,
    required this.selected,
    required this.selectedColor,
    required this.unselectedColor,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color selectedColor;
  final Color unselectedColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          color: selected ? selectedColor : unselectedColor,
          borderRadius: BorderRadius.circular(28),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : const Color(0xFF3C4466),
          ),
        ),
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({
    required this.course,
    required this.onTap,
    this.onCertificateTap,
  });

  final _MyCourse course;
  final VoidCallback onTap;
  final VoidCallback? onCertificateTap;

  @override
  Widget build(BuildContext context) {
    final double rawProgress = course.progressTotal == 0
        ? 0
        : course.progress / course.progressTotal;
    final double progressValue = rawProgress.clamp(0.0, 1.0).toDouble();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x1C7C8BB4),
                    blurRadius: 22,
                    offset: Offset(0, 14),
                  ),
                ],
              ),
              constraints: const BoxConstraints(minHeight: 140),
              child: SizedBox(
                height: 140,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.horizontal(
                        left: Radius.circular(22),
                      ),
                      child: Container(width: 118, color: Colors.black),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 14, 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              course.category,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFE2702B),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              course.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.poppins(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1C2140),
                                height: 1.25,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(
                                  Icons.star,
                                  size: 14,
                                  color: Color(0xFFF4B400),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  course.rating,
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
                                Expanded(
                                  child: Text(
                                    course.duration,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFF4A4E5F),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            if (course.completed)
                              GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: onCertificateTap,
                                child: Text(
                                  'VIEW CERTIFICATE',
                                  style: GoogleFonts.poppins(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF1F7C64),
                                    decoration: TextDecoration.underline,
                                    decorationThickness: 1.6,
                                  ),
                                ),
                              )
                            else
                              Row(
                                children: [
                                  Expanded(
                                    child: _ProgressBar(
                                      value: progressValue,
                                      color: course.progressColor,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    '${course.progress}/${course.progressTotal}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF2B3045),
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
            if (course.completed)
              Positioned(
                right: 12,
                top: 12,
                child: Container(
                  width: 34,
                  height: 34,
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: SvgPicture.asset('assets/my_courses/complete.svg'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MyCourse {
  const _MyCourse({
    required this.courseId,
    required this.category,
    required this.title,
    required this.rating,
    required this.duration,
    required this.price,
    required this.classes,
    required this.hours,
    required this.certificateId,
    required this.completed,
    this.progress = 0,
    this.progressTotal = 0,
    this.progressColor = const Color(0xFF1F7C64),
    this.mentorName = '',
    this.mentorSubtitle = '',
    this.mentorImagePath,
    this.coverImagePath,
    this.sections = const <CourseSection>[],
  });

  final String courseId;
  final String category;
  final String title;
  final String rating;
  final String duration;
  final String price;
  final int classes;
  final int hours;
  final String certificateId;
  final bool completed;
  final int progress;
  final int progressTotal;
  final Color progressColor;
  final String mentorName;
  final String mentorSubtitle;
  final String? mentorImagePath;
  final String? coverImagePath;
  final List<CourseSection> sections;

  _MyCourse copyWith({
    String? courseId,
    String? category,
    String? title,
    String? rating,
    String? duration,
    String? price,
    int? classes,
    int? hours,
    String? certificateId,
    bool? completed,
    int? progress,
    int? progressTotal,
    Color? progressColor,
    String? mentorName,
    String? mentorSubtitle,
    String? mentorImagePath,
    String? coverImagePath,
    List<CourseSection>? sections,
  }) {
    return _MyCourse(
      courseId: courseId ?? this.courseId,
      category: category ?? this.category,
      title: title ?? this.title,
      rating: rating ?? this.rating,
      duration: duration ?? this.duration,
      price: price ?? this.price,
      classes: classes ?? this.classes,
      hours: hours ?? this.hours,
      certificateId: certificateId ?? this.certificateId,
      completed: completed ?? this.completed,
      progress: progress ?? this.progress,
      progressTotal: progressTotal ?? this.progressTotal,
      progressColor: progressColor ?? this.progressColor,
      mentorName: mentorName ?? this.mentorName,
      mentorSubtitle: mentorSubtitle ?? this.mentorSubtitle,
      mentorImagePath: mentorImagePath ?? this.mentorImagePath,
      coverImagePath: coverImagePath ?? this.coverImagePath,
      sections: sections ?? this.sections,
    );
  }
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.value, required this.color});

  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double width = (constraints.maxWidth * value)
            .clamp(0.0, constraints.maxWidth)
            .toDouble();
        return Container(
          height: 6,
          decoration: BoxDecoration(
            color: const Color(0xFFE8EDF7),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Container(
              width: width,
              height: 6,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        );
      },
    );
  }
}
