import 'dart:io';
import 'dart:math' as math;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../app_state/course_catalog.dart';
import '../app_state/course_progress.dart';
import '../app_state/mentor_catalog.dart';
import '../app_state/transaction_catalog.dart';
import '../app_state/user_access.dart';
import '../app_state/user_profile.dart';
import '../routes.dart';
import '../services/social_service.dart';
import '../widgets/course_completed_dialog.dart';
import '../utils/image_utils.dart';
import '../utils/security_guard.dart';
import 'certificate_screen.dart';
import 'course_reviews_screen.dart';
import 'lesson_player_screen.dart';
import 'mentor_profile_screen.dart';

class CourseDetailScreen extends StatefulWidget {
  const CourseDetailScreen({super.key});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF7D818F);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _accentGreen = Color(0xFF1F7C64);
  static const Color _chipSelected = Color(0xFFEAF0FF);

  bool _showAbout = true;
  bool _initialized = false;
  bool _isEnrolled = false;
  late CourseDetailArgs _data;
  bool _completionDialogShown = false;
  final TextEditingController _reviewController = TextEditingController();
  final FocusNode _reviewFocus = FocusNode();
  final ImagePicker _picker = ImagePicker();
  XFile? _reviewImage;

  final Set<int> _completedLessons = <int>{};
  late final VoidCallback _transactionListener;

  late List<_CurriculumSection> _curriculum;

  static const List<_CurriculumSection> _fallbackCurriculum = [
    _CurriculumSection(
      title: 'Section 01 - Introduction',
      duration: '25 Mins',
      lessons: [
        _CurriculumLesson(
          id: 1,
          index: '01',
          title: 'Why Using Graphic De..',
          duration: '15 Mins',
          isLocked: false,
        ),
        _CurriculumLesson(
          id: 2,
          index: '02',
          title: 'Setup Your Graphic De..',
          duration: '10 Mins',
          isLocked: false,
        ),
      ],
    ),
    _CurriculumSection(
      title: 'Section 02 - Graphic Design',
      duration: '55 Mins',
      lessons: [
        _CurriculumLesson(
          id: 3,
          index: '03',
          title: 'Take a Look Graphic De..',
          duration: '08 Mins',
          isLocked: true,
        ),
        _CurriculumLesson(
          id: 4,
          index: '04',
          title: 'Working with Graphic De..',
          duration: '25 Mins',
          isLocked: true,
        ),
        _CurriculumLesson(
          id: 5,
          index: '05',
          title: 'Working with Frame & Lay..',
          duration: '12 Mins',
          isLocked: true,
        ),
        _CurriculumLesson(
          id: 6,
          index: '06',
          title: 'Using Graphic Plugins',
          duration: '10 Mins',
          isLocked: true,
        ),
      ],
    ),
    _CurriculumSection(
      title: "Section 03 - Let's Practice",
      duration: '35 Mins',
      lessons: [
        _CurriculumLesson(
          id: 7,
          index: '07',
          title: "Let's Design a Sign Up Fo..",
          duration: '15 Mins',
          isLocked: true,
        ),
        _CurriculumLesson(
          id: 8,
          index: '08',
          title: 'Sharing work with Team',
          duration: '20 Mins',
          isLocked: true,
        ),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _curriculum = _fallbackCurriculum;
    _transactionListener = _handleTransactionsChanged;
    TransactionCatalog.userTransactions.addListener(_transactionListener);
  }

  @override
  void dispose() {
    TransactionCatalog.userTransactions.removeListener(_transactionListener);
    _reviewController.dispose();
    _reviewFocus.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final Object? args = ModalRoute.of(context)?.settings.arguments;
    _data = args is CourseDetailArgs ? args : CourseDetailArgs.fallback();
    _isEnrolled = _data.isEnrolled || UserAccess.isAdmin;
    _curriculum = _buildCurriculumFromSections(_data.sections);
    _completedLessons
      ..clear()
      ..addAll(
        CourseProgressStore.completedLessons(
          _data.title,
          courseId: _data.courseId,
        ),
      );
    final CourseCompletionData? existingCompletion =
        CourseProgressStore.completionFor(
          _data.title,
          courseId: _data.courseId,
        );
    if (existingCompletion != null) {
      _completionDialogShown = true;
    }
    _initialized = true;
    _handleTransactionsChanged();
  }

  void _handleTransactionsChanged() {
    if (!_initialized) return;
    final bool paid =
        UserAccess.isAdmin ||
        TransactionCatalog.hasPaidForCourse(
          courseTitle: _data.title,
          courseId: _data.courseId,
        );
    final bool shouldBeEnrolled = _data.isEnrolled || paid;
    if (shouldBeEnrolled != _isEnrolled) {
      setState(() => _isEnrolled = shouldBeEnrolled);
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

  List<_CurriculumSection> _buildCurriculumFromSections(
    List<CourseSection> sections,
  ) {
    if (sections.isEmpty) {
      return _fallbackCurriculum;
    }
    final List<_CurriculumSection> curriculum = [];
    int lessonCounter = 1;
    for (int sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      final CourseSection section = sections[sectionIndex];
      final String sectionNumber = (sectionIndex + 1).toString().padLeft(
        2,
        '0',
      );
      String sectionTitle = section.title.trim();
      if (sectionTitle.isEmpty) {
        sectionTitle = 'Section $sectionNumber';
      } else if (!sectionTitle.toLowerCase().startsWith('section')) {
        sectionTitle = 'Section $sectionNumber - $sectionTitle';
      }

      final List<_CurriculumLesson> lessons = [];
      for (final CourseLesson lesson in section.lessons) {
        final String index = lessonCounter.toString().padLeft(2, '0');
        lessons.add(
          _CurriculumLesson(
            id: lessonCounter,
            index: index,
            title: lesson.title,
            duration: '',
            isLocked: sectionIndex > 0,
            videoUrl: lesson.videoUrl,
          ),
        );
        lessonCounter++;
      }
      curriculum.add(
        _CurriculumSection(title: sectionTitle, duration: '', lessons: lessons),
      );
    }
    return curriculum;
  }

  int get _totalLessons {
    final int fromCurriculum = _curriculum.fold(
      0,
      (value, section) => value + section.lessons.length,
    );
    if (fromCurriculum > 0) return fromCurriculum;
    if (_data.classes > 0) return _data.classes;
    return 0;
  }

  void _openCertificate(CourseCompletionData completion) {
    final String userName = UserProfile.userName.trim();
    Navigator.of(context).pushNamed(
      AppRoutes.certificate,
      arguments: CertificateArgs(
        courseTitle: completion.title,
        userName: userName,
        certificateId: completion.certificateId,
      ),
    );
  }

  void _maybeShowCompletionDialog() {
    if (_completionDialogShown) return;
    if (_completedLessons.length < _totalLessons) return;
    _completionDialogShown = true;
    final CourseCompletionData completion =
        CourseProgressStore.markCourseCompleted(
          title: _data.title,
          category: _data.category,
          rating: _data.rating,
          price: _data.price,
          classes: _data.classes,
          hours: _data.hours,
          courseId: _data.courseId,
        );
    _showCompletionDialog(completion);
  }

  Future<void> _showCompletionDialog(CourseCompletionData completion) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withValues(alpha: 0.45),
      builder: (dialogContext) {
        return CourseCompletedDialog(
          courseTitle: completion.title,
          onSeeCertificate: () {
            Navigator.of(dialogContext).pop();
            _openCertificate(completion);
          },
        );
      },
    );
  }

  Future<void> _handleLessonTap(
    _CurriculumLesson lesson,
    String sectionTitle,
  ) async {
    final bool isLocked = lesson.isLocked && !_isEnrolled;
    if (isLocked) {
      _showToast('Enroll to unlock this lesson');
      return;
    }
    await Navigator.of(context).pushNamed(
      AppRoutes.lessonPlayer,
      arguments: LessonPlayerArgs(
        sectionTitle: sectionTitle,
        courseTitle: _data.title,
        lessonTitle: lesson.title,
        videoUrl: lesson.videoUrl,
      ),
    );
    if (!mounted) return;
    final bool added = _completedLessons.add(lesson.id);
    CourseProgressStore.markLessonCompleted(
      _data.title,
      lesson.id,
      courseId: _data.courseId,
    );
    if (added) {
      setState(() {});
    }
    _maybeShowCompletionDialog();
  }

  Future<void> _openPaymentMethods() async {
    await Navigator.of(
      context,
    ).pushNamed(AppRoutes.paymentMethods, arguments: _data);
    if (!mounted) return;
    _handleTransactionsChanged();
  }

  Future<void> _authenticateAndPay() async {
    if (UserAccess.isAdmin) {
      setState(() => _isEnrolled = true);
      _showToast('Admin account has direct course access.');
      return;
    }
    if (TransactionCatalog.hasPendingForCourse(
      courseTitle: _data.title,
      courseId: _data.courseId,
    )) {
      _showToast('Payment verification in progress.');
      return;
    }
    final bool unlocked = await SecurityGuard.requireAuth(
      context,
      title: 'Confirm Purchase',
      description: 'Use your PIN or fingerprint to buy this course.',
    );
    if (!mounted || !unlocked) return;
    await _openPaymentMethods();
  }

  void _openEmojiKeyboard() {
    _reviewFocus.requestFocus();
  }

  Future<void> _pickReviewImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (!mounted || image == null) return;
    setState(() => _reviewImage = image);
  }

  void _removeReviewImage() {
    setState(() => _reviewImage = null);
  }

  Future<void> _submitInlineReview() async {
    final String text = _reviewController.text.trim();
    if (text.isEmpty && _reviewImage == null) {
      _showToast('Write a review first');
      return;
    }
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _showToast('Sign in first to write a review.');
      return;
    }
    final String mentorId =
        CourseCatalog.findByTitle(_data.title)?.mentorId ?? '';
    final String courseKey = SocialService.courseKey(
      courseId: _data.courseId,
      courseTitle: _data.title,
    );
    final String mentorKey = SocialService.mentorKey(
      mentorId: mentorId,
      mentorName: _data.mentorName,
    );
    try {
      await SocialService.addCourseReview(
        user: user,
        courseKey: courseKey,
        courseTitle: _data.title,
        mentorKey: mentorKey,
        mentorName: _data.mentorName,
        body: text.isEmpty ? 'Great course!' : text,
      );
    } catch (_) {
      _showToast('Could not submit review. Try again.');
      return;
    }
    setState(() {
      _reviewController.clear();
      _reviewImage = null;
    });
    _showToast('Review submitted');
  }

  List<SocialReview> _resolvePreviewReviews(List<SocialReview> reviews) {
    final List<SocialReview> sorted = List<SocialReview>.from(reviews);
    sorted.sort((a, b) {
      final int likesDiff = b.likesCount.compareTo(a.likesCount);
      if (likesDiff != 0) return likesDiff;
      final DateTime aDate =
          a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final DateTime bDate =
          b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bDate.compareTo(aDate);
    });
    return sorted.take(2).toList();
  }

  @override
  Widget build(BuildContext context) {
    final String courseKey = SocialService.courseKey(
      courseId: _data.courseId,
      courseTitle: _data.title,
    );
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: _isEnrolled
          ? null
          : _EnrollButton(price: _data.price, onTap: _authenticateAndPay),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 420);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );
            final double heroHeight = math.min(
              320,
              constraints.maxHeight * 0.45,
            );

            return SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Stack(
                    children: [
                      Builder(
                        builder: (context) {
                          final DecorationImage? coverImage =
                              resolveDecorationImage(_data.coverImagePath);
                          return Container(
                            height: heroHeight,
                            decoration: BoxDecoration(
                              color: Colors.black,
                              image: coverImage,
                            ),
                            child: coverImage == null
                                ? const Center(
                                    child: Icon(
                                      Icons.image_outlined,
                                      color: Colors.white70,
                                      size: 46,
                                    ),
                                  )
                                : null,
                          );
                        },
                      ),
                      Positioned(
                        top: 12,
                        left: horizontalPadding,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: () => Navigator.of(context).pop(),
                          child: const Padding(
                            padding: EdgeInsets.all(6),
                            child: Icon(
                              Icons.arrow_back,
                              size: 26,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: EdgeInsets.fromLTRB(
                      horizontalPadding,
                      0,
                      horizontalPadding,
                      18,
                    ),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Transform.translate(
                          offset: const Offset(0, -52),
                          child: _CourseInfoCard(
                            data: _data,
                            isEnrolled: _isEnrolled,
                            showAbout: _showAbout,
                            curriculum: _curriculum,
                            completedLessons: _completedLessons,
                            onLessonTap: _handleLessonTap,
                            onShowAbout: () =>
                                setState(() => _showAbout = true),
                            onShowCurriculum: () =>
                                setState(() => _showAbout = false),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: horizontalPadding,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _SectionTitle(text: 'Instructor'),
                        const SizedBox(height: 12),
                        Builder(
                          builder: (context) {
                            final String mentorName =
                                _data.mentorName.trim().isNotEmpty
                                ? _data.mentorName
                                : 'Mentor';
                            final String mentorSubtitle =
                                _data.mentorSubtitle.trim().isNotEmpty
                                ? _data.mentorSubtitle
                                : '${_data.category} Mentor';
                            final MentorItem? mentorData =
                                MentorCatalog.findByName(mentorName);
                            final String? resolvedImagePath =
                                mentorData?.imagePath?.trim().isNotEmpty == true
                                ? mentorData!.imagePath
                                : _data.mentorImagePath;
                            return _InstructorRow(
                              name: mentorName,
                              subtitle: mentorSubtitle,
                              imagePath: resolvedImagePath,
                              onTap: () => Navigator.of(context).pushNamed(
                                AppRoutes.mentorProfile,
                                arguments: MentorProfileArgs(
                                  name: mentorName,
                                  subtitle: mentorSubtitle,
                                  courses: '26',
                                  students: '15800',
                                  ratings: '8750',
                                  imagePath: resolvedImagePath,
                                  mentorId:
                                      CourseCatalog.findByTitle(
                                        _data.title,
                                      )?.mentorId ??
                                      mentorData?.id,
                                  bio: mentorData?.bio ?? '',
                                ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 18),
                        const _SectionTitle(text: "What You'll Get"),
                        const SizedBox(height: 12),
                        _BulletRow(
                          icon: Icons.menu_book_outlined,
                          label:
                              '$_totalLessons ${_totalLessons == 1 ? 'Lesson' : 'Lessons'}',
                        ),
                        const _BulletRow(
                          icon: Icons.devices_outlined,
                          label: 'Access Mobile, Desktop & TV',
                        ),
                        const _BulletRow(
                          icon: Icons.bar_chart_outlined,
                          label: 'Beginner Level',
                        ),
                        const _BulletRow(
                          icon: Icons.graphic_eq_outlined,
                          label: 'Audio Book',
                        ),
                        const _BulletRow(
                          icon: Icons.all_inclusive,
                          label: 'Lifetime Access',
                        ),
                        const _BulletRow(
                          icon: Icons.quiz_outlined,
                          label: '100 Quizzes',
                        ),
                        const _BulletRow(
                          icon: Icons.verified_outlined,
                          label: 'Certificate of Completion',
                        ),
                        const SizedBox(height: 18),
                        Row(
                          children: [
                            const _SectionTitle(text: 'Reviews'),
                            const Spacer(),
                            InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => Navigator.of(context).pushNamed(
                                AppRoutes.reviews,
                                arguments: CourseReviewsArgs(
                                  courseId: _data.courseId,
                                  courseTitle: _data.title,
                                  mentorName: _data.mentorName,
                                ),
                              ),
                              child: Row(
                                children: [
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
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _InlineReviewComposer(
                          controller: _reviewController,
                          focusNode: _reviewFocus,
                          image: _reviewImage,
                          onEmoji: _openEmojiKeyboard,
                          onImage: _pickReviewImage,
                          onRemoveImage: _removeReviewImage,
                          onSend: _submitInlineReview,
                        ),
                        const SizedBox(height: 16),
                        StreamBuilder<List<SocialReview>>(
                          stream: SocialService.watchCourseReviews(courseKey),
                          builder: (context, snapshot) {
                            final List<SocialReview> previewReviews =
                                _resolvePreviewReviews(
                                  snapshot.data ?? const <SocialReview>[],
                                );
                            if (snapshot.connectionState ==
                                    ConnectionState.waiting &&
                                previewReviews.isEmpty) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 18),
                                child: Center(
                                  child: SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                                ),
                              );
                            }
                            if (previewReviews.isEmpty) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Text(
                                  'No reviews yet. Be the first to review.',
                                  style: GoogleFonts.poppins(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    color: _textMuted,
                                  ),
                                ),
                              );
                            }
                            return Column(
                              children: List.generate(previewReviews.length, (
                                index,
                              ) {
                                final SocialReview review =
                                    previewReviews[index];
                                return Padding(
                                  padding: EdgeInsets.only(
                                    bottom: index == previewReviews.length - 1
                                        ? 0
                                        : 14,
                                  ),
                                  child: _ReviewCard(
                                    name: review.userName.trim().isEmpty
                                        ? 'Student'
                                        : review.userName.trim(),
                                    rating: review.rating.toStringAsFixed(1),
                                    body: review.body.trim(),
                                    likes: review.likesCount.toString(),
                                    time: SocialService.formatTimeAgo(
                                      review.createdAt,
                                    ),
                                  ),
                                );
                              }),
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                      ],
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

class _CourseInfoCard extends StatelessWidget {
  const _CourseInfoCard({
    required this.data,
    required this.isEnrolled,
    required this.showAbout,
    required this.curriculum,
    required this.completedLessons,
    required this.onLessonTap,
    required this.onShowAbout,
    required this.onShowCurriculum,
  });

  final CourseDetailArgs data;
  final bool isEnrolled;
  final bool showAbout;
  final List<_CurriculumSection> curriculum;
  final Set<int> completedLessons;
  final void Function(_CurriculumLesson lesson, String sectionTitle)
  onLessonTap;
  final VoidCallback onShowAbout;
  final VoidCallback onShowCurriculum;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
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
              const Icon(Icons.star, color: Color(0xFFF4B400), size: 16),
              const SizedBox(width: 4),
              Text(
                data.rating,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: _CourseDetailScreenState._title,
                ),
              ),
            ],
          ),
          if (data.mentorName.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Builder(
                  builder: (context) {
                    final DecorationImage? mentorImage = resolveDecorationImage(
                      data.mentorImagePath,
                    );
                    return Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: Colors.black,
                        shape: BoxShape.circle,
                        image: mentorImage,
                      ),
                      child: mentorImage == null
                          ? const Icon(
                              Icons.person,
                              size: 12,
                              color: Colors.white,
                            )
                          : null,
                    );
                  },
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Mentor: ${data.mentorName}',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _CourseDetailScreenState._textMuted,
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Text(
            data.title,
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: _CourseDetailScreenState._title,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(
                Icons.people_outline,
                size: 18,
                color: _CourseDetailScreenState._textMuted,
              ),
              const SizedBox(width: 6),
              Text(
                data.classesLabel,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: _CourseDetailScreenState._textMuted,
                ),
              ),
              const SizedBox(width: 14),
              const Text('|', style: TextStyle(color: Color(0xFFB6BED6))),
              const SizedBox(width: 14),
              const Icon(
                Icons.access_time,
                size: 18,
                color: _CourseDetailScreenState._textMuted,
              ),
              const SizedBox(width: 6),
              Text(
                data.hoursLabel,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: _CourseDetailScreenState._textMuted,
                ),
              ),
              const Spacer(),
              Text(
                data.price,
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: _CourseDetailScreenState._primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _TabButton(
                  label: 'About',
                  selected: showAbout,
                  onTap: onShowAbout,
                ),
              ),
              Expanded(
                child: _TabButton(
                  label: 'Curriculum',
                  selected: !showAbout,
                  onTap: onShowCurriculum,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (showAbout)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Graphic Design now a popular profession graphic design by off your carrer about tantas regiones barbarorum pedibus obit',
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: _CourseDetailScreenState._textMuted,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Graphic Design n a popular profession | Cur tantas regiones barbarorum pedibus obit, maria transmi Et ne nimium bedus est; Addidisti ad extremum etiam',
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: _CourseDetailScreenState._textMuted,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Read More',
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: _CourseDetailScreenState._primary,
                  ),
                ),
              ],
            )
          else
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ...curriculum.map(
                  (section) => _CurriculumSectionView(
                    section: section,
                    isEnrolled: isEnrolled,
                    completedLessons: completedLessons,
                    onLessonTap: onLessonTap,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
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
        height: 44,
        decoration: BoxDecoration(
          color: selected
              ? _CourseDetailScreenState._chipSelected
              : Colors.white,
          borderRadius: BorderRadius.circular(18),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: _CourseDetailScreenState._title,
          ),
        ),
      ),
    );
  }
}

class _CurriculumSectionView extends StatelessWidget {
  const _CurriculumSectionView({
    required this.section,
    required this.isEnrolled,
    required this.completedLessons,
    required this.onLessonTap,
  });

  final _CurriculumSection section;
  final bool isEnrolled;
  final Set<int> completedLessons;
  final void Function(_CurriculumLesson lesson, String sectionTitle)
  onLessonTap;

  @override
  Widget build(BuildContext context) {
    final List<String> parts = section.title.split(' - ');
    final String prefix = parts.first;
    final String name = parts.length > 1 ? parts.sublist(1).join(' - ') : '';
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                prefix,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: _CourseDetailScreenState._title,
                ),
              ),
              if (name.isNotEmpty) ...[
                const SizedBox(width: 4),
                Text(
                  name,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: _CourseDetailScreenState._primary,
                  ),
                ),
              ],
              const Spacer(),
              if (section.duration.isNotEmpty)
                Text(
                  section.duration,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _CourseDetailScreenState._primary,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          ...section.lessons.map((lesson) {
            final bool locked = lesson.isLocked && !isEnrolled;
            return _CurriculumLessonRow(
              lesson: lesson,
              locked: locked,
              completed: completedLessons.contains(lesson.id),
              onTap: () => onLessonTap(lesson, section.title),
            );
          }),
        ],
      ),
    );
  }
}

class _CurriculumLessonRow extends StatelessWidget {
  const _CurriculumLessonRow({
    required this.lesson,
    required this.locked,
    required this.completed,
    required this.onTap,
  });

  final _CurriculumLesson lesson;
  final bool locked;
  final bool completed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final Color circleBorder = completed
        ? _CourseDetailScreenState._accentGreen
        : const Color(0xFFE0E6F5);
    final Color circleText = completed
        ? _CourseDetailScreenState._accentGreen
        : _CourseDetailScreenState._title;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF7FAFF),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE5ECF8)),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: circleBorder),
              ),
              alignment: Alignment.center,
              child: Text(
                lesson.index,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: circleText,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    lesson.title,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: _CourseDetailScreenState._title,
                    ),
                  ),
                  if (lesson.duration.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      lesson.duration,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _CourseDetailScreenState._textMuted,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (locked)
              const Icon(Icons.lock_outline, size: 20, color: Color(0xFF2D3148))
            else
              Container(
                width: 30,
                height: 30,
                decoration: const BoxDecoration(
                  color: _CourseDetailScreenState._primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.play_arrow,
                  color: Colors.white,
                  size: 18,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: _CourseDetailScreenState._title,
      ),
    );
  }
}

class _InstructorRow extends StatelessWidget {
  const _InstructorRow({
    required this.name,
    required this.subtitle,
    required this.onTap,
    this.imagePath,
  });

  final String name;
  final String subtitle;
  final String? imagePath;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Row(
        children: [
          Builder(
            builder: (context) {
              final DecorationImage? mentorImage = resolveDecorationImage(
                imagePath,
              );
              return Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: Colors.black,
                  shape: BoxShape.circle,
                  image: mentorImage,
                ),
                child: mentorImage == null
                    ? const Icon(Icons.person, color: Colors.white)
                    : null,
              );
            },
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: _CourseDetailScreenState._title,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _CourseDetailScreenState._textMuted,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: const Color(0xFFEAF0FF),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.chat_bubble_outline,
              size: 18,
              color: _CourseDetailScreenState._primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _BulletRow extends StatelessWidget {
  const _BulletRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: _CourseDetailScreenState._textMuted, size: 20),
          const SizedBox(width: 12),
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: _CourseDetailScreenState._textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({
    required this.name,
    required this.rating,
    required this.body,
    required this.likes,
    required this.time,
  });

  final String name;
  final String rating;
  final String body;
  final String likes;
  final String time;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
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
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: const BoxDecoration(
              color: Colors.black,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: _CourseDetailScreenState._title,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF2F6FF),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.star,
                            size: 14,
                            color: Color(0xFFF4B400),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            rating,
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: _CourseDetailScreenState._title,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  body,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: _CourseDetailScreenState._textMuted,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(
                      Icons.favorite,
                      size: 14,
                      color: Color(0xFFE04B4B),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      likes,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _CourseDetailScreenState._textMuted,
                      ),
                    ),
                    const SizedBox(width: 18),
                    Text(
                      time,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _CourseDetailScreenState._textMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineReviewComposer extends StatelessWidget {
  const _InlineReviewComposer({
    required this.controller,
    required this.focusNode,
    required this.image,
    required this.onEmoji,
    required this.onImage,
    required this.onRemoveImage,
    required this.onSend,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final XFile? image;
  final VoidCallback onEmoji;
  final VoidCallback onImage;
  final VoidCallback onRemoveImage;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F5)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 14,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: Colors.black,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  maxLines: 2,
                  minLines: 1,
                  style: GoogleFonts.poppins(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF202244),
                  ),
                  decoration: InputDecoration(
                    hintText: 'Write your review...',
                    hintStyle: GoogleFonts.poppins(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF9AA1B8),
                    ),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
              IconButton(
                onPressed: onEmoji,
                icon: const Icon(
                  Icons.emoji_emotions_outlined,
                  color: Color(0xFF7D818F),
                  size: 20,
                ),
              ),
              IconButton(
                onPressed: onImage,
                icon: const Icon(
                  Icons.image_outlined,
                  color: Color(0xFF7D818F),
                  size: 20,
                ),
              ),
              Container(
                width: 34,
                height: 34,
                decoration: const BoxDecoration(
                  color: _CourseDetailScreenState._primary,
                  shape: BoxShape.circle,
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: onSend,
                  child: const Icon(Icons.send, color: Colors.white, size: 16),
                ),
              ),
            ],
          ),
          if (image != null) ...[
            const SizedBox(height: 10),
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(
                    File(image!.path),
                    height: 80,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned(
                  right: 8,
                  top: 8,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: onRemoveImage,
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: const BoxDecoration(
                        color: Color(0xCC1C1F2A),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _EnrollButton extends StatelessWidget {
  const _EnrollButton({required this.price, required this.onTap});

  final String price;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
        child: Material(
          color: _CourseDetailScreenState._primary,
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
                      'Enroll Course - $price',
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
                        color: _CourseDetailScreenState._primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CurriculumSection {
  const _CurriculumSection({
    required this.title,
    required this.duration,
    required this.lessons,
  });

  final String title;
  final String duration;
  final List<_CurriculumLesson> lessons;
}

class _CurriculumLesson {
  const _CurriculumLesson({
    required this.id,
    required this.index,
    required this.title,
    required this.duration,
    required this.isLocked,
    this.videoUrl = '',
  });

  final int id;
  final String index;
  final String title;
  final String duration;
  final bool isLocked;
  final String videoUrl;
}

class CourseDetailArgs {
  const CourseDetailArgs({
    this.courseId = '',
    required this.category,
    required this.title,
    required this.mentorName,
    required this.mentorSubtitle,
    this.mentorImagePath,
    this.coverImagePath,
    required this.price,
    required this.rating,
    required this.classes,
    required this.hours,
    this.sections = const [],
    this.isEnrolled = false,
  });

  final String courseId;
  final String category;
  final String title;
  final String mentorName;
  final String mentorSubtitle;
  final String? mentorImagePath;
  final String? coverImagePath;
  final String price;
  final String rating;
  final int classes;
  final int hours;
  final List<CourseSection> sections;
  final bool isEnrolled;

  String get classesLabel {
    final String label = classes == 1 ? 'Section' : 'Sections';
    return '$classes $label';
  }

  String get hoursLabel => '$hours Hours';

  static CourseDetailArgs fallback() {
    return const CourseDetailArgs(
      courseId: '',
      category: 'Graphic Design',
      title: 'Design Principles: Organizing ..',
      mentorName: 'Sonja',
      mentorSubtitle: 'Graphic Design Mentor',
      mentorImagePath: null,
      coverImagePath: null,
      price: 'EGP 1450',
      rating: '4.2',
      classes: 21,
      hours: 42,
      sections: [],
      isEnrolled: false,
    );
  }
}
