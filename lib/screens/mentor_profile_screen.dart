import 'dart:math' as math;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/course_catalog.dart';
import '../app_state/mentor_catalog.dart';
import '../app_state/mentor_chat_store.dart';
import '../app_state/saved_courses_store.dart';
import '../routes.dart';
import '../services/social_service.dart';
import '../utils/image_utils.dart';
import 'mentor_chat_thread_screen.dart';

class MentorProfileScreen extends StatefulWidget {
  const MentorProfileScreen({super.key});

  @override
  State<MentorProfileScreen> createState() => _MentorProfileScreenState();
}

class _MentorProfileScreenState extends State<MentorProfileScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF8A91A6);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _chipBg = Color(0xFFEAF0FF);

  bool _initialized = false;
  bool _showCourses = true;
  late MentorProfileArgs _data;
  late String _mentorKey;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final Object? args = ModalRoute.of(context)?.settings.arguments;
    _data = args is MentorProfileArgs ? args : MentorProfileArgs.fallback();
    _mentorKey = SocialService.mentorKey(
      mentorId: _data.mentorId,
      mentorName: _data.name,
    );
    _initialized = true;
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

  Future<void> _toggleFollow(bool currentlyFollowing) async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _showMessage('Sign in first to follow mentors.');
      return;
    }
    try {
      await SocialService.toggleMentorFollow(
        mentorKey: _mentorKey,
        mentorName: _data.name,
        user: user,
        currentlyFollowing: currentlyFollowing,
      );
    } catch (_) {
      _showMessage('Could not update follow status. Try again.');
    }
  }

  Future<void> _toggleCourseBookmark(String courseId) async {
    await SavedCoursesStore.toggle(courseId);
  }

  Future<void> _toggleReviewLike(_MentorReview review) async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _showMessage('Sign in first to like comments.');
      return;
    }
    try {
      await SocialService.toggleReviewLike(
        reviewId: review.id,
        userId: user.uid,
        currentlyLiked: review.liked,
      );
    } catch (_) {
      _showMessage('Could not update like. Try again.');
    }
  }

  void _openMentorChat() {
    final List<MentorItem> mentors = MentorCatalog.mentors.value;
    MentorChatStore.syncWithCatalog(mentors);

    final String targetId = (_data.mentorId ?? '').trim();
    final String targetName = _data.name.trim().toLowerCase();
    MentorItem? matched;

    if (targetId.isNotEmpty) {
      for (final MentorItem mentor in mentors) {
        if (mentor.id.trim() == targetId) {
          matched = mentor;
          break;
        }
      }
    }
    if (matched == null && targetName.isNotEmpty) {
      for (final MentorItem mentor in mentors) {
        if (mentor.name.trim().toLowerCase() == targetName) {
          matched = mentor;
          break;
        }
      }
    }
    if (matched == null && targetName.isNotEmpty) {
      for (final MentorItem mentor in mentors) {
        final String mentorName = mentor.name.trim().toLowerCase();
        if (mentorName.contains(targetName) ||
            targetName.contains(mentorName)) {
          matched = mentor;
          break;
        }
      }
    }

    final String chatId = (matched?.id ?? targetId).trim().isNotEmpty
        ? (matched?.id ?? targetId).trim()
        : SocialService.mentorKey(
            mentorId: _data.mentorId,
            mentorName: _data.name,
          );
    final String chatName = matched?.name.trim().isNotEmpty == true
        ? matched!.name.trim()
        : (_data.name.trim().isNotEmpty ? _data.name.trim() : 'Mentor');
    final String chatRole = matched?.subtitle.trim().isNotEmpty == true
        ? matched!.subtitle.trim()
        : (_data.subtitle.trim().isNotEmpty ? _data.subtitle.trim() : 'Mentor');

    Navigator.of(context).pushNamed(
      AppRoutes.mentorChatThread,
      arguments: MentorChatThreadArgs(
        id: chatId,
        name: chatName,
        role: chatRole,
        imagePath: matched?.imagePath ?? _data.imagePath,
      ),
    );
  }

  List<_MentorCourse> _resolveMentorCourses(
    List<CourseItem> allCourses,
    Set<String> savedIds,
  ) {
    final List<_MentorCourse> result = <_MentorCourse>[];
    final String normalizedName = _data.name.trim().toLowerCase();
    for (final CourseItem course in allCourses) {
      final String courseMentorKey = SocialService.mentorKey(
        mentorId: course.mentorId,
        mentorName: course.mentorName,
      );
      final bool matchesKey = courseMentorKey == _mentorKey;
      final bool matchesName =
          course.mentorName.trim().toLowerCase() == normalizedName;
      if (!matchesKey && !matchesName) continue;
      result.add(
        _MentorCourse(
          id: course.id,
          category: course.category,
          title: course.title,
          price: course.price,
          oldPrice: course.oldPrice,
          rating: course.rating,
          students: _studentsLabel(course.students),
          bookmarked: savedIds.contains(course.id),
        ),
      );
    }
    return result;
  }

  List<_MentorReview> _resolveMentorReviews(
    List<SocialReview> reviews,
    String currentUid,
  ) {
    return reviews
        .map(
          (review) => _MentorReview(
            id: review.id,
            name: review.userName.isEmpty ? 'Student' : review.userName,
            rating: review.rating.toStringAsFixed(1),
            body: review.body,
            likes: review.likesCount,
            time: SocialService.formatTimeAgo(review.createdAt),
            liked: review.likedByUser(currentUid),
          ),
        )
        .toList();
  }

  static String _studentsLabel(String raw) {
    final String trimmed = raw.trim();
    if (trimmed.isEmpty) return '0';
    final String normalized = trimmed.toLowerCase();
    if (normalized.contains('std') || normalized.contains('student')) {
      return trimmed;
    }
    return '$trimmed Std';
  }

  static double _averageRating(List<SocialReview> reviews) {
    if (reviews.isEmpty) return 0;
    final double sum = reviews
        .map((review) => review.rating)
        .fold<double>(0, (a, b) => a + b);
    return sum / reviews.length;
  }

  @override
  Widget build(BuildContext context) {
    final User? currentUser = FirebaseAuth.instance.currentUser;
    final String currentUid = (currentUser?.uid ?? '').trim();
    final MentorItem? catalogMentor = MentorCatalog.findByName(_data.name);
    final String mentorBio = _data.bio.trim().isNotEmpty
        ? _data.bio.trim()
        : (catalogMentor?.bio ?? '').trim();
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

            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                12,
                horizontalPadding,
                24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: () => Navigator.of(context).pop(),
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Icon(Icons.arrow_back, size: 26, color: _title),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Center(
                    child: Builder(
                      builder: (context) {
                        final DecorationImage? mentorImage =
                            resolveDecorationImage(_data.imagePath);
                        return Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            color: const Color(0xFFEAF0FF),
                            shape: BoxShape.circle,
                            image: mentorImage,
                          ),
                          child: mentorImage == null
                              ? const Icon(
                                  Icons.person,
                                  color: Color(0xFF7D818F),
                                  size: 42,
                                )
                              : null,
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: Text(
                      _data.name,
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: _title,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: Text(
                      _data.subtitle,
                      style: GoogleFonts.poppins(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: _textMuted,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  StreamBuilder<List<SocialReview>>(
                    stream: SocialService.watchMentorReviews(_mentorKey),
                    builder: (context, reviewsSnapshot) {
                      final List<SocialReview> socialReviews =
                          reviewsSnapshot.data ?? const <SocialReview>[];
                      final List<_MentorReview> reviews = _resolveMentorReviews(
                        socialReviews,
                        currentUid,
                      );
                      final double avgRating = _averageRating(socialReviews);
                      final String ratingLabel = socialReviews.isEmpty
                          ? _data.ratings
                          : avgRating.toStringAsFixed(1);

                      return StreamBuilder<int>(
                        stream: SocialService.watchMentorFollowersCount(
                          _mentorKey,
                        ),
                        initialData: 0,
                        builder: (context, followersSnapshot) {
                          final int followersCount =
                              followersSnapshot.data ?? 0;
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ValueListenableBuilder<List<CourseItem>>(
                                valueListenable: CourseCatalog.courses,
                                builder: (context, courses, _) {
                                  final int liveCount = courses.where((course) {
                                    final String courseMentorKey =
                                        SocialService.mentorKey(
                                          mentorId: course.mentorId,
                                          mentorName: course.mentorName,
                                        );
                                    if (courseMentorKey == _mentorKey) {
                                      return true;
                                    }
                                    return course.mentorName
                                            .trim()
                                            .toLowerCase() ==
                                        _data.name.trim().toLowerCase();
                                  }).length;
                                  final String coursesCount = liveCount > 0
                                      ? liveCount.toString()
                                      : _data.courses;

                                  return Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      _StatItem(
                                        value: coursesCount,
                                        label: 'Courses',
                                      ),
                                      _StatItem(
                                        value: SocialService.formatCompactCount(
                                          followersCount,
                                        ),
                                        label: 'Followers',
                                      ),
                                      _StatItem(
                                        value: ratingLabel,
                                        label: 'Ratings',
                                      ),
                                    ],
                                  );
                                },
                              ),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(
                                    child: currentUser == null
                                        ? _FollowButton(
                                            followed: false,
                                            onTap: () => _showMessage(
                                              'Sign in first to follow mentors.',
                                            ),
                                          )
                                        : StreamBuilder<bool>(
                                            stream:
                                                SocialService.watchIsFollowingMentor(
                                                  mentorKey: _mentorKey,
                                                  userId: currentUser.uid,
                                                ),
                                            initialData: false,
                                            builder: (context, followSnapshot) {
                                              final bool followed =
                                                  followSnapshot.data ?? false;
                                              return _FollowButton(
                                                followed: followed,
                                                onTap: () =>
                                                    _toggleFollow(followed),
                                              );
                                            },
                                          ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: _PrimaryButton(
                                      label: 'Message',
                                      onTap: _openMentorChat,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              Container(
                                padding: const EdgeInsets.fromLTRB(
                                  12,
                                  12,
                                  12,
                                  12,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: const Color(0xFFE2E8F5),
                                  ),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x14697AA0),
                                      blurRadius: 16,
                                      offset: Offset(0, 10),
                                    ),
                                  ],
                                ),
                                child: Text(
                                  mentorBio.isEmpty
                                      ? 'No bio provided yet.'
                                      : mentorBio,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.poppins(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: _textMuted,
                                    height: 1.5,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: _chipBg,
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: _TabButton(
                                        label: 'Courses',
                                        selected: _showCourses,
                                        onTap: () {
                                          if (_showCourses) return;
                                          setState(() => _showCourses = true);
                                        },
                                      ),
                                    ),
                                    Expanded(
                                      child: _TabButton(
                                        label: 'Ratings',
                                        selected: !_showCourses,
                                        onTap: () {
                                          if (!_showCourses) return;
                                          setState(() => _showCourses = false);
                                        },
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                              _showCourses
                                  ? ValueListenableBuilder<List<CourseItem>>(
                                      valueListenable: CourseCatalog.courses,
                                      builder: (context, courses, _) {
                                        return ValueListenableBuilder<
                                          Set<String>
                                        >(
                                          valueListenable:
                                              SavedCoursesStore.savedIds,
                                          builder: (context, savedIds, __) {
                                            final List<_MentorCourse>
                                            mentorCourses =
                                                _resolveMentorCourses(
                                                  courses,
                                                  savedIds,
                                                );
                                            if (mentorCourses.isEmpty) {
                                              return const _EmptyPanel(
                                                message:
                                                    'No courses found for this mentor yet.',
                                              );
                                            }
                                            return _CoursesPanel(
                                              courses: mentorCourses,
                                              onToggleBookmark:
                                                  _toggleCourseBookmark,
                                            );
                                          },
                                        );
                                      },
                                    )
                                  : (reviews.isEmpty
                                        ? const _EmptyPanel(
                                            message:
                                                'No comments yet. Reviews will appear here.',
                                          )
                                        : _RatingsPanel(
                                            reviews: reviews,
                                            onToggleLike: _toggleReviewLike,
                                          )),
                            ],
                          );
                        },
                      );
                    },
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

class _StatItem extends StatelessWidget {
  const _StatItem({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: _MentorProfileScreenState._title,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: _MentorProfileScreenState._textMuted,
          ),
        ),
      ],
    );
  }
}

class _FollowButton extends StatelessWidget {
  const _FollowButton({required this.followed, required this.onTap});

  final bool followed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final Color bg = followed
        ? const Color(0xFF1F7C64)
        : const Color(0xFFEAF0FF);
    final Color border = followed
        ? const Color(0xFF1F7C64)
        : const Color(0xFFC9D6EE);
    final Color text = followed ? Colors.white : const Color(0xFF202244);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      height: 46,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border, width: 1.2),
        boxShadow: followed
            ? const [
                BoxShadow(
                  color: Color(0x331F7C64),
                  blurRadius: 16,
                  offset: Offset(0, 10),
                ),
              ]
            : [],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: onTap,
        child: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (followed) ...[
                const Icon(Icons.check_rounded, color: Colors.white, size: 16),
                const SizedBox(width: 6),
              ],
              Text(
                followed ? 'Following' : 'Follow',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: text,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: _MentorProfileScreenState._primary,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x330D65FF),
            blurRadius: 18,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: onTap,
        child: Center(
          child: Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ),
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
    return Container(
      height: 42,
      decoration: BoxDecoration(
        color: selected ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected ? const Color(0xFFE2E8F5) : Colors.transparent,
          width: 1,
        ),
        boxShadow: selected
            ? const [
                BoxShadow(
                  color: Color(0x10697AA0),
                  blurRadius: 10,
                  offset: Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          splashColor: Colors.transparent,
          highlightColor: Colors.transparent,
          onTap: selected ? null : onTap,
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: _MentorProfileScreenState._title,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CoursesPanel extends StatelessWidget {
  const _CoursesPanel({required this.courses, required this.onToggleBookmark});

  final List<_MentorCourse> courses;
  final ValueChanged<String> onToggleBookmark;

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
            blurRadius: 16,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: List.generate(courses.length, (index) {
          final course = courses[index];
          return Column(
            children: [
              _CourseRow(
                course: course,
                onBookmarkTap: () => onToggleBookmark(course.id),
              ),
              if (index != courses.length - 1)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(height: 1, color: Color(0xFFE2E8F5)),
                ),
            ],
          );
        }),
      ),
    );
  }
}

class _CourseRow extends StatelessWidget {
  const _CourseRow({required this.course, required this.onBookmarkTap});

  final _MentorCourse course;
  final VoidCallback onBookmarkTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 78,
          height: 78,
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
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
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: _MentorProfileScreenState._title,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    course.price,
                    style: GoogleFonts.poppins(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: _MentorProfileScreenState._primary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    course.oldPrice,
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
                  const Icon(Icons.star, size: 14, color: Color(0xFFF4B400)),
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
                  const Text('|', style: TextStyle(color: Color(0xFFB6BED6))),
                  const SizedBox(width: 10),
                  Text(
                    course.students,
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
        const SizedBox(width: 8),
        InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onBookmarkTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: course.bookmarked
                  ? const Color(0xFFEAF6F5)
                  : const Color(0xFFF1F3F9),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: course.bookmarked
                    ? const Color(0xFFBFE6E3)
                    : const Color(0xFFE0E3EF),
                width: 1,
              ),
            ),
            child: Center(
              child: SvgPicture.asset(
                'assets/home/book mark.svg',
                width: 16,
                height: 18,
                colorFilter: ColorFilter.mode(
                  course.bookmarked
                      ? const Color(0xFF2F8E8A)
                      : const Color(0xFFB6BED6),
                  BlendMode.srcIn,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _RatingsPanel extends StatelessWidget {
  const _RatingsPanel({required this.reviews, required this.onToggleLike});

  final List<_MentorReview> reviews;
  final ValueChanged<_MentorReview> onToggleLike;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F5)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 16,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: List.generate(reviews.length, (index) {
          final review = reviews[index];
          return Column(
            children: [
              _ReviewRow(review: review, onLikeTap: () => onToggleLike(review)),
              if (index != reviews.length - 1)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(height: 1, color: Color(0xFFE2E8F5)),
                ),
            ],
          );
        }),
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.review, required this.onLikeTap});

  final _MentorReview review;
  final VoidCallback onLikeTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
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
                        review.name,
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: _MentorProfileScreenState._title,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEAF0FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF7EA1EB)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.star,
                            size: 12,
                            color: Color(0xFFF4B400),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            review.rating,
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: _MentorProfileScreenState._title,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  review.body,
                  style: GoogleFonts.poppins(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: _MentorProfileScreenState._textMuted,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: onLikeTap,
                      child: Padding(
                        padding: const EdgeInsets.all(2),
                        child: Icon(
                          review.liked ? Icons.favorite : Icons.favorite_border,
                          size: 16,
                          color: review.liked
                              ? const Color(0xFFE04B4B)
                              : _MentorProfileScreenState._textMuted,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${review.likes}',
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _MentorProfileScreenState._textMuted,
                      ),
                    ),
                    const SizedBox(width: 18),
                    Text(
                      review.time,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _MentorProfileScreenState._textMuted,
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

class _EmptyPanel extends StatelessWidget {
  const _EmptyPanel({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F5)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 16,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: GoogleFonts.poppins(
          fontSize: 12.5,
          fontWeight: FontWeight.w600,
          color: _MentorProfileScreenState._textMuted,
        ),
      ),
    );
  }
}

class MentorProfileArgs {
  const MentorProfileArgs({
    required this.name,
    required this.subtitle,
    required this.courses,
    required this.students,
    required this.ratings,
    this.imagePath,
    this.mentorId,
    this.bio = '',
  });

  final String name;
  final String subtitle;
  final String courses;
  final String students;
  final String ratings;
  final String? imagePath;
  final String? mentorId;
  final String bio;

  static MentorProfileArgs fallback() {
    return const MentorProfileArgs(
      name: 'Christopher J. Levine',
      subtitle: 'Graphic Designer At Google',
      courses: '26',
      students: '15800',
      ratings: '8750',
      imagePath: null,
      mentorId: null,
      bio: '',
    );
  }
}

class _MentorCourse {
  const _MentorCourse({
    required this.id,
    required this.category,
    required this.title,
    required this.price,
    required this.oldPrice,
    required this.rating,
    required this.students,
    required this.bookmarked,
  });

  final String id;
  final String category;
  final String title;
  final String price;
  final String oldPrice;
  final String rating;
  final String students;
  final bool bookmarked;

  _MentorCourse copyWith({bool? bookmarked}) {
    return _MentorCourse(
      id: id,
      category: category,
      title: title,
      price: price,
      oldPrice: oldPrice,
      rating: rating,
      students: students,
      bookmarked: bookmarked ?? this.bookmarked,
    );
  }
}

class _MentorReview {
  const _MentorReview({
    required this.id,
    required this.name,
    required this.rating,
    required this.body,
    required this.likes,
    required this.time,
    required this.liked,
  });

  final String id;
  final String name;
  final String rating;
  final String body;
  final int likes;
  final String time;
  final bool liked;
}
