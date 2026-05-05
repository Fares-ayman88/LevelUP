import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/user_profile.dart';
import '../routes.dart';
import 'certificate_screen.dart';
import 'course_detail_screen.dart';
import 'lesson_player_screen.dart';

class CompletedCourseScreen extends StatelessWidget {
  const CompletedCourseScreen({super.key});
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _accentGreen = Color(0xFF1F7C64);

  static const List<_CourseSection> _sections = [
    _CourseSection(
      title: 'Section 01 - Introduction',
      duration: '25 Mins',
      lessons: [
        _CourseLesson(
          index: '01',
          title: 'Why Using 3D Blender',
          duration: '15 Mins',
        ),
        _CourseLesson(
          index: '02',
          title: '3D Blender Installation',
          duration: '10 Mins',
        ),
      ],
    ),
    _CourseSection(
      title: 'Section 02 - Graphic Design',
      duration: '125 Mins',
      lessons: [
        _CourseLesson(
          index: '03',
          title: 'Take a Look Blender Interfa...',
          duration: '20 Mins',
        ),
        _CourseLesson(
          index: '04',
          title: 'The Basic of 3D Modelling',
          duration: '25 Mins',
        ),
        _CourseLesson(
          index: '05',
          title: 'Shading and Lighting',
          duration: '36 Mins',
        ),
        _CourseLesson(
          index: '06',
          title: 'Rendering for Final Output',
          duration: '24 Mins',
        ),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    final Object? args = ModalRoute.of(context)?.settings.arguments;
    final CompletedCourseArgs data = args is CompletedCourseArgs
        ? args
        : const CompletedCourseArgs(title: '3D Design Illustration');
    final String userName = UserProfile.userName.trim();
    final CourseDetailArgs detailArgs = CourseDetailArgs(
      category: data.category,
      title: data.title,
      mentorName: 'Mentor',
      mentorSubtitle: '${data.category} Mentor',
      mentorImagePath: null,
      price: data.price,
      rating: data.rating,
      classes: data.classes,
      hours: data.hours,
      sections: const [],
      isEnrolled: true,
    );
    final CertificateArgs certificateArgs = CertificateArgs(
      courseTitle: data.title,
      userName: userName,
      certificateId: data.certificateId,
    );

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: _StartCourseAgainBar(
        detailArgs: detailArgs,
        certificateArgs: certificateArgs,
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
                    ],
                  ),
                  const SizedBox(height: 18),
                  _SearchBar(muted: _muted, value: data.title),
                  const SizedBox(height: 20),
                  ..._sections.map(
                    (section) => Padding(
                      padding: const EdgeInsets.only(bottom: 18),
                      child: _SectionCard(
                        section: section,
                        courseTitle: data.title,
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

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.muted, required this.value});

  final Color muted;
  final String value;

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
              value,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: muted,
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
  const _SectionCard({required this.section, required this.courseTitle});

  final _CourseSection section;
  final String courseTitle;

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
                    color: CompletedCourseScreen._title,
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
                          color: CompletedCourseScreen._primary,
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
                  color: CompletedCourseScreen._primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...section.lessons.asMap().entries.map((entry) {
            final int index = entry.key;
            final _CourseLesson lesson = entry.value;
            return Column(
              children: [
                _LessonRow(
                  lesson: lesson,
                  onPlay: () => Navigator.of(context).pushNamed(
                    AppRoutes.lessonPlayer,
                    arguments: LessonPlayerArgs(
                      sectionTitle: section.title,
                      courseTitle: courseTitle,
                      lessonTitle: lesson.title,
                    ),
                  ),
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
  const _LessonRow({required this.lesson, required this.onPlay});

  final _CourseLesson lesson;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
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
                color: CompletedCourseScreen._accentGreen,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                lesson.index,
                style: GoogleFonts.poppins(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
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
                      color: CompletedCourseScreen._title,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    lesson.duration,
                    style: GoogleFonts.poppins(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: CompletedCourseScreen._muted,
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
                  color: CompletedCourseScreen._primary,
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

class _StartCourseAgainBar extends StatelessWidget {
  const _StartCourseAgainBar({
    required this.detailArgs,
    required this.certificateArgs,
  });

  final CourseDetailArgs detailArgs;
  final CertificateArgs certificateArgs;

  @override
  Widget build(BuildContext context) {
    const double barHeight = 56;
    const double pillRadius = 30;
    const double arrowSize = 38;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 16),
        child: Row(
          children: [
            Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () => Navigator.of(
                  context,
                ).pushNamed(AppRoutes.certificate, arguments: certificateArgs),
                child: Container(
                  width: 64,
                  height: barHeight,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE7F0FF),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFD2E0FF)),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x143C4B8B),
                        blurRadius: 10,
                        offset: Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Center(
                    child: SvgPicture.asset(
                      'assets/my_courses/certificate.svg',
                      width: 26,
                      height: 22,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Container(
                height: barHeight,
                decoration: BoxDecoration(
                  color: CompletedCourseScreen._primary,
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
                    onTap: () => Navigator.of(
                      context,
                    ).pushNamed(AppRoutes.courseDetail, arguments: detailArgs),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        children: [
                          const Spacer(),
                          Text(
                            'Start Course Again',
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
                              color: CompletedCourseScreen._primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
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
    required this.index,
    required this.title,
    required this.duration,
  });

  final String index;
  final String title;
  final String duration;
}

class CompletedCourseArgs {
  const CompletedCourseArgs({
    required this.title,
    this.category = '3D Design',
    this.rating = '4.8',
    this.price = 'EGP 1650',
    this.classes = 18,
    this.hours = 32,
    this.certificateId = '',
  });

  final String title;
  final String category;
  final String rating;
  final String price;
  final int classes;
  final int hours;
  final String certificateId;
}
