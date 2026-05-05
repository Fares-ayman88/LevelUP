import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/course_progress.dart';
import '../routes.dart';
import '../widgets/course_completed_dialog.dart';
import 'lesson_player_screen.dart';

class OngoingCourseScreen extends StatefulWidget {
  const OngoingCourseScreen({super.key});

  static const Color _background = Color(0xFFF5F9FF);
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF9AA1B8);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _accentGreen = Color(0xFF1F7C64);

  static const List<_CourseSection> _sections = [
    _CourseSection(
      title: 'Section 01 - Introduction',
      duration: '25 Mins',
      lessons: [
        _CourseLesson(
          id: 1,
          index: '01',
          title: 'Why Using Graphic De..',
          duration: '15 Mins',
          isLocked: false,
        ),
        _CourseLesson(
          id: 2,
          index: '02',
          title: 'Setup Your Graphic De..',
          duration: '10 Mins',
          isLocked: false,
        ),
      ],
    ),
    _CourseSection(
      title: 'Section 02 - Graphic Design',
      duration: '55 Mins',
      lessons: [
        _CourseLesson(
          id: 3,
          index: '03',
          title: 'Take a Look Graphic De..',
          duration: '08 Mins',
          isLocked: false,
        ),
        _CourseLesson(
          id: 4,
          index: '04',
          title: 'Working with Graphic De..',
          duration: '25 Mins',
          isLocked: false,
        ),
        _CourseLesson(
          id: 5,
          index: '05',
          title: 'Working with Frame & Lay..',
          duration: '12 Mins',
          isLocked: false,
        ),
      ],
    ),
  ];

  @override
  State<OngoingCourseScreen> createState() => _OngoingCourseScreenState();
}

class _OngoingCourseScreenState extends State<OngoingCourseScreen> {
  bool _initialized = false;
  late OngoingCourseArgs _data;
  final Set<int> _completedLessons = <int>{};
  OngoingCourseCompletion? _completionResult;
  bool _completionDialogShown = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final Object? args = ModalRoute.of(context)?.settings.arguments;
    _data = args is OngoingCourseArgs
        ? args
        : const OngoingCourseArgs(title: 'Intro to UI/UX Design');
    _completedLessons
      ..clear()
      ..addAll(CourseProgressStore.completedLessons(_data.title));
    final CourseCompletionData? existingCompletion =
        CourseProgressStore.completionFor(_data.title);
    if (existingCompletion != null) {
      _completionResult = OngoingCourseCompletion.fromData(existingCompletion);
      _completionDialogShown = true;
    }
    _initialized = true;
  }

  int get _totalLessons => OngoingCourseScreen._sections.fold(
    0,
    (value, section) => value + section.lessons.length,
  );

  OngoingCourseCompletion _buildCompletionResult({
    bool showCertificate = false,
  }) {
    final CourseCompletionData completion =
        CourseProgressStore.markCourseCompleted(
          title: _data.title,
          category: _data.category,
          rating: _data.rating,
          price: _data.price,
          classes: _data.classes,
          hours: _data.hours,
        );
    return OngoingCourseCompletion.fromData(
      completion,
      showCertificate: showCertificate,
    );
  }

  Future<void> _handleLessonTap(
    _CourseLesson lesson,
    String sectionTitle,
  ) async {
    final bool added = _completedLessons.add(lesson.id);
    CourseProgressStore.markLessonCompleted(_data.title, lesson.id);
    if (added) {
      setState(() {});
    }
    await Navigator.of(context).pushNamed(
      AppRoutes.lessonPlayer,
      arguments: LessonPlayerArgs(
        sectionTitle: sectionTitle,
        courseTitle: _data.title,
        lessonTitle: lesson.title,
      ),
    );
    if (!mounted) return;
    _maybeShowCompletionDialog();
  }

  void _maybeShowCompletionDialog() {
    if (_completionDialogShown) return;
    if (_completedLessons.length < _totalLessons) return;
    _completionDialogShown = true;
    _completionResult ??= _buildCompletionResult();
    _showCompletionDialog();
  }

  Future<void> _showCompletionDialog() async {
    final OngoingCourseCompletion? result =
        await showDialog<OngoingCourseCompletion>(
          context: context,
          barrierDismissible: true,
          barrierColor: Colors.black.withValues(alpha: 0.45),
          builder: (dialogContext) {
            return CourseCompletedDialog(
              courseTitle: _data.title,
              onSeeCertificate: () {
                final OngoingCourseCompletion next =
                    (_completionResult ?? _buildCompletionResult()).copyWith(
                      showCertificate: true,
                    );
                Navigator.of(dialogContext).pop(next);
              },
            );
          },
        );
    if (!mounted) return;
    if (result != null) {
      _completionResult = result;
      Navigator.of(context).pop(result);
    }
  }

  Future<bool> _handleWillPop() async {
    Navigator.of(context).pop(_completionResult);
    return false;
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    final _CourseSection resumeSection = OngoingCourseScreen._sections.first;
    final _CourseLesson resumeLesson = resumeSection.lessons.first;

    // ignore: deprecated_member_use
    return WillPopScope(
      onWillPop: _handleWillPop,
      child: Scaffold(
        backgroundColor: OngoingCourseScreen._background,
        bottomNavigationBar: _ContinueCourseBar(
          sectionTitle: resumeSection.title,
          lessonTitle: resumeLesson.title,
          courseTitle: _data.title,
        ),
        body: SafeArea(
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

              return SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  horizontalPadding,
                  20,
                  horizontalPadding,
                  90,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: () =>
                              Navigator.of(context).pop(_completionResult),
                          child: const Padding(
                            padding: EdgeInsets.all(6),
                            child: Icon(
                              Icons.arrow_back,
                              size: 26,
                              color: OngoingCourseScreen._title,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'My Courses',
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: OngoingCourseScreen._title,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    const _SearchBar(),
                    const SizedBox(height: 20),
                    ...OngoingCourseScreen._sections.map(
                      (section) => Padding(
                        padding: const EdgeInsets.only(bottom: 18),
                        child: _SectionCard(
                          section: section,
                          completedLessons: _completedLessons,
                          onLessonTap: _handleLessonTap,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar();

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
            child: Text(
              'Search for ...',
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: OngoingCourseScreen._muted,
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

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.section,
    required this.completedLessons,
    required this.onLessonTap,
  });

  final _CourseSection section;
  final Set<int> completedLessons;
  final void Function(_CourseLesson lesson, String sectionTitle) onLessonTap;

  @override
  Widget build(BuildContext context) {
    final List<String> parts = section.title.split(' - ');
    final String leading = parts.first;
    final String trailing = parts.length > 1
        ? parts.sublist(1).join(' - ')
        : '';

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE5ECF8)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 18,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              RichText(
                text: TextSpan(
                  style: GoogleFonts.poppins(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: OngoingCourseScreen._title,
                  ),
                  children: [
                    TextSpan(text: leading),
                    if (trailing.isNotEmpty) ...[
                      const TextSpan(text: ' - '),
                      TextSpan(
                        text: trailing,
                        style: GoogleFonts.poppins(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          color: OngoingCourseScreen._primary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const Spacer(),
              Text(
                section.duration,
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: OngoingCourseScreen._primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...section.lessons.asMap().entries.map((entry) {
            final int index = entry.key;
            final _CourseLesson lesson = entry.value;
            final bool completed = completedLessons.contains(lesson.id);
            return Column(
              children: [
                _LessonRow(
                  lesson: lesson,
                  completed: completed,
                  onPlay: () => onLessonTap(lesson, section.title),
                ),
                if (index != section.lessons.length - 1)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 4),
                    child: Divider(color: Color(0xFFE5ECF8), height: 1),
                  ),
              ],
            );
          }),
        ],
      ),
    );
  }
}

class _LessonRow extends StatelessWidget {
  const _LessonRow({
    required this.lesson,
    required this.completed,
    this.onPlay,
  });

  final _CourseLesson lesson;
  final bool completed;
  final VoidCallback? onPlay;

  @override
  Widget build(BuildContext context) {
    final Color circleBorder = completed
        ? OngoingCourseScreen._accentGreen
        : const Color(0xFFE1E9F5);
    final Color circleText = completed
        ? OngoingCourseScreen._accentGreen
        : OngoingCourseScreen._title;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onPlay,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: circleBorder),
              ),
              alignment: Alignment.center,
              child: Text(
                lesson.index,
                style: GoogleFonts.poppins(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: circleText,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    lesson.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: OngoingCourseScreen._title,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    lesson.duration,
                    style: GoogleFonts.poppins(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF7D818F),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: onPlay,
              child: Container(
                width: 34,
                height: 34,
                decoration: const BoxDecoration(
                  color: OngoingCourseScreen._primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.play_arrow,
                  color: Colors.white,
                  size: 19,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ContinueCourseBar extends StatelessWidget {
  const _ContinueCourseBar({
    required this.sectionTitle,
    required this.lessonTitle,
    required this.courseTitle,
  });

  final String sectionTitle;
  final String lessonTitle;
  final String courseTitle;

  @override
  Widget build(BuildContext context) {
    const double barHeight = 56;
    const double barContainerHeight = 96;
    const double pillRadius = 30;
    const double arrowSize = 38;

    return SafeArea(
      top: false,
      child: Container(
        height: barContainerHeight,
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE6EDF8))),
          boxShadow: [
            BoxShadow(
              color: Color(0x140D1A2C),
              blurRadius: 18,
              offset: Offset(0, -6),
            ),
          ],
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Container(
              height: barHeight,
              decoration: BoxDecoration(
                color: OngoingCourseScreen._primary,
                borderRadius: BorderRadius.circular(pillRadius),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x2E0D65FF),
                    blurRadius: 16,
                    offset: Offset(0, 10),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(pillRadius),
                child: InkWell(
                  borderRadius: BorderRadius.circular(pillRadius),
                  onTap: () => Navigator.of(context).pushNamed(
                    AppRoutes.lessonPlayer,
                    arguments: LessonPlayerArgs(
                      sectionTitle: sectionTitle,
                      courseTitle: courseTitle,
                      lessonTitle: lessonTitle,
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 22),
                    child: Row(
                      children: [
                        const Spacer(),
                        Text(
                          'Continue Courses',
                          style: GoogleFonts.poppins(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          width: arrowSize,
                          height: arrowSize,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.arrow_forward,
                            size: 19,
                            color: OngoingCourseScreen._primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CourseSection {
  const _CourseSection({
    required this.title,
    required this.duration,
    required this.lessons,
  });

  final String title;
  final String duration;
  final List<_CourseLesson> lessons;
}

class _CourseLesson {
  const _CourseLesson({
    required this.id,
    required this.index,
    required this.title,
    required this.duration,
    required this.isLocked,
  });

  final int id;
  final String index;
  final String title;
  final String duration;
  final bool isLocked;
}

class OngoingCourseArgs {
  const OngoingCourseArgs({
    required this.title,
    this.category = 'UI/UX Design',
    this.rating = '4.4',
    this.price = 'EGP 1650',
    this.classes = 125,
    this.hours = 3,
  });

  final String title;
  final String category;
  final String rating;
  final String price;
  final int classes;
  final int hours;
}

class OngoingCourseCompletion {
  const OngoingCourseCompletion({
    required this.title,
    required this.category,
    required this.rating,
    required this.price,
    required this.classes,
    required this.hours,
    required this.certificateId,
    this.showCertificate = false,
  });

  factory OngoingCourseCompletion.fromData(
    CourseCompletionData data, {
    bool showCertificate = false,
  }) {
    return OngoingCourseCompletion(
      title: data.title,
      category: data.category,
      rating: data.rating,
      price: data.price,
      classes: data.classes,
      hours: data.hours,
      certificateId: data.certificateId,
      showCertificate: showCertificate,
    );
  }

  final String title;
  final String category;
  final String rating;
  final String price;
  final int classes;
  final int hours;
  final String certificateId;
  final bool showCertificate;

  OngoingCourseCompletion copyWith({
    String? certificateId,
    bool? showCertificate,
  }) {
    return OngoingCourseCompletion(
      title: title,
      category: category,
      rating: rating,
      price: price,
      classes: classes,
      hours: hours,
      certificateId: certificateId ?? this.certificateId,
      showCertificate: showCertificate ?? this.showCertificate,
    );
  }
}
