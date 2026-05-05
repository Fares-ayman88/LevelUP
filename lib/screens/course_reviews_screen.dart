import 'dart:math' as math;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/social_service.dart';

class CourseReviewsArgs {
  const CourseReviewsArgs({
    required this.courseId,
    required this.courseTitle,
    required this.mentorName,
    this.mentorId,
  });

  final String courseId;
  final String courseTitle;
  final String mentorName;
  final String? mentorId;

  static const CourseReviewsArgs fallback = CourseReviewsArgs(
    courseId: '',
    courseTitle: 'Course',
    mentorName: 'Mentor',
    mentorId: null,
  );
}

class CourseReviewsScreen extends StatefulWidget {
  const CourseReviewsScreen({super.key});

  @override
  State<CourseReviewsScreen> createState() => _CourseReviewsScreenState();
}

class _CourseReviewsScreenState extends State<CourseReviewsScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF7D818F);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _chipSelected = Color(0xFF1F7C64);
  static const Color _chipUnselected = Color(0xFFEAF0FF);

  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _composerFocus = FocusNode();

  bool _initialized = false;
  bool _showComposer = false;
  bool _submitting = false;
  int _selectedFilter = 0;
  late CourseReviewsArgs _args;
  late String _courseKey;
  late String _mentorKey;

  static const List<_ReviewFilter> _filters = [
    _ReviewFilter(label: 'Excellent', minRating: 4.5, maxRating: 5),
    _ReviewFilter(label: 'Good', minRating: 4.0, maxRating: 4.49),
    _ReviewFilter(label: 'Average', minRating: 3.0, maxRating: 3.99),
    _ReviewFilter(label: 'Below Average', minRating: 0.0, maxRating: 2.99),
  ];

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final Object? routeArgs = ModalRoute.of(context)?.settings.arguments;
    _args = routeArgs is CourseReviewsArgs
        ? routeArgs
        : CourseReviewsArgs.fallback;
    _courseKey = SocialService.courseKey(
      courseId: _args.courseId,
      courseTitle: _args.courseTitle,
    );
    _mentorKey = SocialService.mentorKey(
      mentorId: _args.mentorId,
      mentorName: _args.mentorName,
    );
    _initialized = true;
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _composerFocus.dispose();
    super.dispose();
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

  void _toggleComposer() {
    setState(() => _showComposer = !_showComposer);
    if (_showComposer) {
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
      _composerFocus.requestFocus();
    }
  }

  Future<void> _submitReview() async {
    if (_submitting) return;
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _showMessage('Sign in first to write a review.');
      return;
    }
    final String text = _controller.text.trim();
    if (text.isEmpty) {
      _showMessage('Write your review first.');
      return;
    }
    setState(() => _submitting = true);
    try {
      await SocialService.addCourseReview(
        user: user,
        courseKey: _courseKey,
        courseTitle: _args.courseTitle,
        mentorKey: _mentorKey,
        mentorName: _args.mentorName,
        body: text,
      );
      if (!mounted) return;
      _controller.clear();
      _showMessage('Review submitted.');
    } catch (_) {
      _showMessage('Could not submit review. Try again.');
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _toggleLike(SocialReview review) async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _showMessage('Sign in first to like a review.');
      return;
    }
    try {
      final bool currentlyLiked = review.likedByUser(user.uid);
      await SocialService.toggleReviewLike(
        reviewId: review.id,
        userId: user.uid,
        currentlyLiked: currentlyLiked,
      );
    } catch (_) {
      _showMessage('Could not update like. Try again.');
    }
  }

  double _averageRating(List<SocialReview> reviews) {
    if (reviews.isEmpty) return 0;
    final double sum = reviews
        .map((review) => review.rating)
        .fold<double>(0, (a, b) => a + b);
    return sum / reviews.length;
  }

  List<SocialReview> _filteredReviews(List<SocialReview> reviews) {
    final _ReviewFilter filter = _filters[_selectedFilter];
    return reviews
        .where(
          (review) =>
              review.rating >= filter.minRating &&
              review.rating <= filter.maxRating,
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final String currentUid = (FirebaseAuth.instance.currentUser?.uid ?? '')
        .trim();
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: _WriteReviewButton(onTap: _toggleComposer),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 420);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return StreamBuilder<List<SocialReview>>(
              stream: SocialService.watchCourseReviews(_courseKey),
              builder: (context, snapshot) {
                final List<SocialReview> reviews =
                    snapshot.data ?? const <SocialReview>[];
                final List<SocialReview> filtered = _filteredReviews(reviews);
                final double rating = _averageRating(reviews);

                return SingleChildScrollView(
                  controller: _scrollController,
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    18,
                    horizontalPadding,
                    24,
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
                            'Reviews',
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: _title,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _args.courseTitle,
                        style: GoogleFonts.poppins(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: _textMuted,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Center(
                        child: Column(
                          children: [
                            Text(
                              rating.toStringAsFixed(1),
                              style: GoogleFonts.poppins(
                                fontSize: 34,
                                fontWeight: FontWeight.w700,
                                color: _title,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const _StarRow(),
                            const SizedBox(height: 6),
                            Text(
                              'Based on ${reviews.length} Reviews',
                              style: GoogleFonts.poppins(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: _textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: List.generate(_filters.length, (index) {
                            final _ReviewFilter filter = _filters[index];
                            final bool selected = _selectedFilter == index;
                            return Padding(
                              padding: EdgeInsets.only(
                                right: index == _filters.length - 1 ? 0 : 10,
                              ),
                              child: _FilterChip(
                                label: filter.label,
                                selected: selected,
                                onTap: () => setState(() {
                                  _selectedFilter = index;
                                }),
                              ),
                            );
                          }),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (_showComposer) ...[
                        _Composer(
                          controller: _controller,
                          focusNode: _composerFocus,
                          submitting: _submitting,
                          onEmoji: () => _composerFocus.requestFocus(),
                          onSend: _submitReview,
                        ),
                        const SizedBox(height: 16),
                      ],
                      if (snapshot.connectionState == ConnectionState.waiting &&
                          reviews.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(top: 18),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                      if (filtered.isEmpty &&
                          snapshot.connectionState != ConnectionState.waiting)
                        Padding(
                          padding: const EdgeInsets.only(top: 10),
                          child: Center(
                            child: Text(
                              reviews.isEmpty
                                  ? 'No reviews yet. Be the first to review.'
                                  : 'No reviews for this filter.',
                              style: GoogleFonts.poppins(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: _textMuted,
                              ),
                            ),
                          ),
                        ),
                      ...List.generate(filtered.length, (index) {
                        final SocialReview review = filtered[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: _ReviewCard(
                            review: review,
                            likedByCurrentUser: review.likedByUser(currentUid),
                            onLikeTap: () => _toggleLike(review),
                          ),
                        );
                      }),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _StarRow extends StatelessWidget {
  const _StarRow();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(
        5,
        (_) => const Padding(
          padding: EdgeInsets.symmetric(horizontal: 2),
          child: Icon(Icons.star, size: 18, color: Color(0xFFF4B400)),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
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
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? _CourseReviewsScreenState._chipSelected
              : _CourseReviewsScreenState._chipUnselected,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : const Color(0xFF2A2D3F),
          ),
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.focusNode,
    required this.submitting,
    required this.onEmoji,
    required this.onSend,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool submitting;
  final VoidCallback onEmoji;
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
      child: Row(
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
          Container(
            width: 34,
            height: 34,
            decoration: const BoxDecoration(
              color: _CourseReviewsScreenState._primary,
              shape: BoxShape.circle,
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: submitting ? null : onSend,
              child: submitting
                  ? const Padding(
                      padding: EdgeInsets.all(9),
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send, color: Colors.white, size: 16),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({
    required this.review,
    required this.likedByCurrentUser,
    required this.onLikeTap,
  });

  final SocialReview review;
  final bool likedByCurrentUser;
  final VoidCallback onLikeTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
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
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 52,
            height: 52,
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
                        review.userName.isEmpty ? 'Student' : review.userName,
                        style: GoogleFonts.poppins(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: _CourseReviewsScreenState._title,
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
                            review.rating.toStringAsFixed(1),
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: _CourseReviewsScreenState._title,
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
                    color: _CourseReviewsScreenState._textMuted,
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
                          likedByCurrentUser
                              ? Icons.favorite
                              : Icons.favorite_border,
                          size: 16,
                          color: likedByCurrentUser
                              ? const Color(0xFFE04B4B)
                              : _CourseReviewsScreenState._textMuted,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${review.likesCount}',
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _CourseReviewsScreenState._textMuted,
                      ),
                    ),
                    const SizedBox(width: 18),
                    Text(
                      SocialService.formatTimeAgo(review.createdAt),
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _CourseReviewsScreenState._textMuted,
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

class _WriteReviewButton extends StatelessWidget {
  const _WriteReviewButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
        child: Material(
          color: _CourseReviewsScreenState._primary,
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
                      'Write a Review',
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
                        color: _CourseReviewsScreenState._primary,
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

class _ReviewFilter {
  const _ReviewFilter({
    required this.label,
    required this.minRating,
    required this.maxRating,
  });

  final String label;
  final double minRating;
  final double maxRating;
}
