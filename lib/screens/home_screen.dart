import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/admin_access.dart';
import '../app_state/category_catalog.dart';
import '../app_state/course_catalog.dart';
import '../app_state/featured_order_store.dart';
import '../app_state/mentor_catalog.dart';
import '../app_state/transaction_catalog.dart';
import '../app_state/user_access.dart';
import '../app_state/user_profile.dart';
import '../routes.dart';
import '../widgets/search_bottom_sheet.dart';
import '../widgets/main_bottom_nav.dart';
import '../widgets/payment_status_dialogs.dart';
import '../widgets/line_reload_indicator.dart';
import '../utils/image_utils.dart';
import 'course_detail_screen.dart';
import 'notifications_screen.dart';
import 'mentor_profile_screen.dart';
import 'receipt_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static bool _pendingShownInSession = false;
  bool _pendingNoticeShown = false;
  bool _showingDialog = false;
  String? _lastResolvedId;
  late final VoidCallback _transactionsListener;
  late final VoidCallback _resolvedListener;
  late final VoidCallback _resolvedSeenListener;
  late final VoidCallback _adminBadgeListener;
  bool _showAdminBadge = false;
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

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _pendingNoticeShown = _pendingShownInSession;
    _transactionsListener = _handleTransactionsChanged;
    _resolvedListener = _handleResolvedChanged;
    _resolvedSeenListener = _handleResolvedSeenReady;
    _adminBadgeListener = _handleAdminBadgeChanged;
    TransactionCatalog.userTransactions.addListener(_transactionsListener);
    TransactionCatalog.lastResolved.addListener(_resolvedListener);
    TransactionCatalog.resolvedSeenReady.addListener(_resolvedSeenListener);
    TransactionCatalog.adminHasUnread.addListener(_adminBadgeListener);
    _handleTransactionsChanged();
    _handleResolvedChanged();
    _handleResolvedSeenReady();
    _handleAdminBadgeChanged();
  }

  @override
  void dispose() {
    TransactionCatalog.userTransactions.removeListener(_transactionsListener);
    TransactionCatalog.lastResolved.removeListener(_resolvedListener);
    TransactionCatalog.resolvedSeenReady.removeListener(_resolvedSeenListener);
    TransactionCatalog.adminHasUnread.removeListener(_adminBadgeListener);
    super.dispose();
  }

  void _handleTransactionsChanged() {
    if (_pendingNoticeShown || _showingDialog) return;
    if (TransactionCatalog.hasPending()) {
      _pendingNoticeShown = true;
      _pendingShownInSession = true;
      _showPendingDialog();
    }
  }

  void _handleResolvedChanged() {
    if (AdminAccess.isAdmin()) return;
    if (_showingDialog) return;
    if (!TransactionCatalog.resolvedSeenReady.value) return;
    final TransactionItem? item = TransactionCatalog.lastResolved.value;
    if (item == null || item.id == _lastResolvedId) return;
    if (TransactionCatalog.isResolvedSeen(item.id)) {
      _lastResolvedId = item.id;
      return;
    }
    _lastResolvedId = item.id;
    if (item.status == TransactionStatus.paid) {
      _showApprovedDialog(item);
    } else if (item.status == TransactionStatus.rejected) {
      _showRejectedDialog(item.id);
    }
  }

  void _handleResolvedSeenReady() {
    if (!mounted) return;
    if (TransactionCatalog.resolvedSeenReady.value) {
      _handleResolvedChanged();
    }
  }

  void _handleAdminBadgeChanged() {
    if (!AdminAccess.isAdmin()) {
      setState(() => _showAdminBadge = false);
      return;
    }
    setState(() => _showAdminBadge = TransactionCatalog.adminHasUnread.value);
  }

  void _showPendingDialog() {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      _showingDialog = true;
      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        barrierColor: Colors.black.withValues(alpha: 0.45),
        builder: (_) => PaymentPendingDialog(
          onReturnHome: () => Navigator.of(context).pop(),
        ),
      );
      _showingDialog = false;
    });
  }

  void _showApprovedDialog(TransactionItem item) {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      _showingDialog = true;
      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        barrierColor: Colors.black.withValues(alpha: 0.45),
        builder: (_) => PaymentApprovedDialog(
          onReturnHome: () => Navigator.of(context).pop(),
          onWatchCourse: () {
            final CourseDetailArgs args = _buildCourseDetailArgs(item);
            Navigator.of(context).pop();
            Navigator.of(
              context,
            ).pushNamed(AppRoutes.courseDetail, arguments: args);
          },
          onReceipt: () {
            Navigator.of(context).pop();
            Navigator.of(
              context,
            ).pushNamed(AppRoutes.receipt, arguments: ReceiptArgs(item: item));
          },
        ),
      );
      await TransactionCatalog.markResolvedSeen(item.id);
      TransactionCatalog.lastResolved.value = null;
      _showingDialog = false;
    });
  }

  CourseDetailArgs _buildCourseDetailArgs(TransactionItem transaction) {
    final CourseItem? course = _resolveCourseForTransaction(transaction);
    final String category = (course?.category ?? transaction.courseCategory)
        .trim();
    final String title = (course?.title ?? transaction.courseTitle).trim();
    final String mentorName = (course?.mentorName ?? transaction.mentorName)
        .trim();
    final String safeCategory = category.isNotEmpty ? category : 'General';
    final String safeTitle = title.isNotEmpty ? title : 'Course';
    final String safeMentor = mentorName.isNotEmpty ? mentorName : 'Mentor';
    final String safeSubtitle = (course?.mentorSubtitle ?? '').trim().isNotEmpty
        ? course!.mentorSubtitle.trim()
        : '$safeCategory Mentor';
    return CourseDetailArgs(
      courseId: (course?.id ?? transaction.courseId).trim(),
      category: safeCategory,
      title: safeTitle,
      mentorName: safeMentor,
      mentorSubtitle: safeSubtitle,
      mentorImagePath: course?.mentorImagePath,
      coverImagePath:
          course?.coverImagePath ?? transaction.courseCoverImagePath,
      price: (course?.price ?? transaction.priceLabel).trim(),
      rating: (course?.rating ?? '0.0').trim().isEmpty
          ? '0.0'
          : (course?.rating ?? '0.0').trim(),
      classes: course?.classes ?? 0,
      hours: course?.hours ?? 0,
      sections: course?.sections ?? const <CourseSection>[],
      isEnrolled: true,
    );
  }

  CourseItem? _resolveCourseForTransaction(TransactionItem transaction) {
    final String transactionCourseId = transaction.courseId.trim();
    if (transactionCourseId.isNotEmpty) {
      for (final CourseItem course in CourseCatalog.items) {
        if (course.id.trim() == transactionCourseId) {
          return course;
        }
      }
    }
    final CourseItem? exact = CourseCatalog.findByTitle(
      transaction.courseTitle,
    );
    if (exact != null) return exact;
    return _findCourseByTitleFuzzy(transaction.courseTitle);
  }

  CourseItem? _findCourseByTitleFuzzy(String source) {
    final String target = _normalizeTitle(source);
    if (target.isEmpty) return null;
    CourseItem? best;
    int bestScore = 0;
    for (final CourseItem course in CourseCatalog.items) {
      final String candidate = _normalizeTitle(course.title);
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

  String _normalizeTitle(String value) {
    final String lowered = value.trim().toLowerCase();
    if (lowered.isEmpty) return '';
    return lowered
        .replaceAll(RegExp(r'[^a-z0-9\u0600-\u06FF\s]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
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

  void _showRejectedDialog(String resolvedId) {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      _showingDialog = true;
      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        barrierColor: Colors.black.withValues(alpha: 0.45),
        builder: (_) => PaymentRejectedDialog(
          onReturnHome: () => Navigator.of(context).pop(),
        ),
      );
      await TransactionCatalog.markResolvedSeen(resolvedId);
      TransactionCatalog.lastResolved.value = null;
      _showingDialog = false;
    });
  }

  static const Color _primary = Color(0xFF0D65FF);
  static const Color _textMuted = Color(0xFF7D818F);
  static const Color _title = Color(0xFF202244);
  static const Color _accentGreen = Color(0xFF2F8E8A);

  String _selectedFilter = 'All';

  List<String> _buildCategories(List<CourseItem> courses) {
    final List<String> categories = [];
    final Set<String> seen = {};
    for (final CourseItem course in courses) {
      final String category = course.category.trim();
      if (category.isEmpty) continue;
      if (seen.add(category)) {
        categories.add(category);
      }
    }
    if (categories.isEmpty) {
      categories.addAll(CategoryCatalog.items);
    }
    return categories;
  }

  List<String> _buildFilters(List<String> categories) {
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
      await Future.wait<void>([
        CourseCatalog.refresh(),
        MentorCatalog.refresh(),
      ]);
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
    final String userName = UserProfile.userName.trim();
    return ValueListenableBuilder<UserAccessState>(
      valueListenable: UserAccess.current,
      builder: (context, access, _) {
        final bool isAdmin = access.isAdmin;
        final bool isMentor = access.isInstructorApproved;
        final bool showActions = isAdmin || isMentor;
        return Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          bottomNavigationBar: const MainBottomNav(currentIndex: 0),
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

                return Stack(
                  children: [
                    RefreshIndicator(
                      color: Colors.transparent,
                      backgroundColor: Colors.transparent,
                      strokeWidth: 0.01,
                      elevation: 0,
                      onRefresh: _handlePullToRefresh,
                      child: NotificationListener<ScrollNotification>(
                        onNotification: _handlePullScroll,
                        child: SingleChildScrollView(
                          padding: EdgeInsets.fromLTRB(
                            horizontalPadding,
                            18,
                            horizontalPadding,
                            28,
                          ),
                          physics: const AlwaysScrollableScrollPhysics(
                            parent: BouncingScrollPhysics(),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _HeaderRow(
                                userName: userName,
                                titleColor: _title,
                                mutedColor: _textMuted,
                                accentColor: _accentGreen,
                                showAddButton: showActions,
                                showHistoryButton: showActions,
                                showInstructorButton: isAdmin,
                                showSortButton: isAdmin,
                                showNotificationBadge:
                                    isAdmin && _showAdminBadge,
                                onAddTap: () => Navigator.of(context).pushNamed(
                                  isAdmin
                                      ? AppRoutes.adminCourses
                                      : AppRoutes.mentorCourses,
                                ),
                                onHistoryTap: () =>
                                    Navigator.of(context).pushNamed(
                                      isAdmin
                                          ? AppRoutes.adminTransactions
                                          : AppRoutes.mentorTransactions,
                                    ),
                                onInstructorTap: () => Navigator.of(
                                  context,
                                ).pushNamed(AppRoutes.instructorRequests),
                                onSortTap: () => Navigator.of(
                                  context,
                                ).pushNamed(AppRoutes.featuredSort),
                              ),
                              const SizedBox(height: 22),
                              _SearchBar(
                                primary: _primary,
                                mutedColor: _textMuted,
                                onTap: () => showSearchBottomSheet(context),
                                onFilterTap: () => Navigator.of(
                                  context,
                                ).pushNamed(AppRoutes.filter),
                              ),
                              const SizedBox(height: 22),
                              const _PromoCarousel(),
                              const SizedBox(height: 24),
                              ValueListenableBuilder<List<CourseItem>>(
                                valueListenable: CourseCatalog.courses,
                                builder: (context, courses, _) {
                                  final List<String> categories =
                                      _buildCategories(courses);
                                  final List<String> filters = _buildFilters(
                                    categories,
                                  );
                                  final String activeFilter =
                                      filters.contains(_selectedFilter)
                                      ? _selectedFilter
                                      : 'All';
                                  final List<CourseItem> filteredCourses =
                                      _applyFilter(courses, activeFilter);

                                  return Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      _SectionHeader(
                                        title: 'Categories',
                                        onTap: () => Navigator.of(
                                          context,
                                        ).pushNamed(AppRoutes.allCategory),
                                      ),
                                      const SizedBox(height: 12),
                                      _CategoriesRow(
                                        primary: _primary,
                                        mutedColor: _textMuted,
                                        categories: categories,
                                        activeCategory: activeFilter == 'All'
                                            ? null
                                            : activeFilter,
                                        onSelected: (label) => setState(
                                          () => _selectedFilter = label,
                                        ),
                                      ),
                                      const SizedBox(height: 24),
                                      _SectionHeader(
                                        title: 'Popular Courses',
                                        onTap: () => Navigator.of(
                                          context,
                                        ).pushNamed(AppRoutes.popularCourses),
                                      ),
                                      const SizedBox(height: 14),
                                      _CourseFilters(
                                        filters: filters,
                                        selectedFilter: activeFilter,
                                        onSelected: (label) => setState(
                                          () => _selectedFilter = label,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      _PopularCourses(
                                        courses:
                                            FeaturedOrderStore.orderCourses(
                                              filteredCourses,
                                            ),
                                      ),
                                    ],
                                  );
                                },
                              ),
                              const SizedBox(height: 24),
                              _SectionHeader(
                                title: 'Top Mentor',
                                onTap: () => Navigator.of(
                                  context,
                                ).pushNamed(AppRoutes.topMentors),
                              ),
                              const SizedBox(height: 12),
                              const _TopMentors(),
                            ],
                          ),
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
                );
              },
            ),
          ),
        );
      },
    );
  }
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow({
    required this.userName,
    required this.titleColor,
    required this.mutedColor,
    required this.accentColor,
    required this.showAddButton,
    required this.showHistoryButton,
    required this.showInstructorButton,
    required this.showSortButton,
    required this.showNotificationBadge,
    this.onAddTap,
    this.onHistoryTap,
    this.onInstructorTap,
    this.onSortTap,
  });

  final String userName;
  final Color titleColor;
  final Color mutedColor;
  final Color accentColor;
  final bool showAddButton;
  final bool showHistoryButton;
  final bool showInstructorButton;
  final bool showSortButton;
  final bool showNotificationBadge;
  final VoidCallback? onAddTap;
  final VoidCallback? onHistoryTap;
  final VoidCallback? onInstructorTap;
  final VoidCallback? onSortTap;

  @override
  Widget build(BuildContext context) {
    final String greeting = userName.isEmpty ? 'Hi' : 'Hi, $userName';
    final bool isAdmin = showInstructorButton;
    final bool isInstructor = showAddButton && !showInstructorButton;
    final String subtitle = isAdmin
        ? 'Admin Account'
        : isInstructor
        ? 'Instructor Account'
        : 'What would you like to learn today?\nSearch below.';
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                greeting,
                style: GoogleFonts.poppins(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: titleColor,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                subtitle,
                style: GoogleFonts.poppins(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: mutedColor,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        if (showAddButton) ...[
          _OutlineCircleIconButton(icon: Icons.add, onTap: onAddTap),
          const SizedBox(width: 10),
          if (showHistoryButton) ...[
            _OutlineCircleIconButton(
              icon: Icons.history_rounded,
              onTap: onHistoryTap,
            ),
            const SizedBox(width: 10),
          ],
          if (showInstructorButton) ...[
            _OutlineCircleIconButton(
              icon: Icons.verified_user_outlined,
              onTap: onInstructorTap,
            ),
            const SizedBox(width: 10),
          ],
          if (showSortButton) ...[
            _OutlineCircleIconButton(
              icon: Icons.swap_vert_rounded,
              onTap: onSortTap,
            ),
            const SizedBox(width: 10),
          ],
          InkWell(
            borderRadius: BorderRadius.circular(24),
            onTap: () => showNotificationsBottomSheet(context),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                SvgPicture.asset(
                  'assets/home/NOTIFICATIONS.svg',
                  width: 46,
                  height: 46,
                ),
                if (showNotificationBadge)
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE74C3C),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ] else
          InkWell(
            borderRadius: BorderRadius.circular(24),
            onTap: () => showNotificationsBottomSheet(context),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                SvgPicture.asset(
                  'assets/home/NOTIFICATIONS.svg',
                  width: 46,
                  height: 46,
                ),
                if (showNotificationBadge)
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE74C3C),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({
    required this.primary,
    required this.mutedColor,
    required this.onTap,
    required this.onFilterTap,
  });

  final Color primary;
  final Color mutedColor;
  final VoidCallback onTap;
  final VoidCallback onFilterTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          height: 56,
          padding: const EdgeInsets.fromLTRB(16, 8, 12, 8),
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
                child: Text(
                  'Search for..',
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: mutedColor,
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
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: onFilterTap,
                    child: const Center(
                      child: Icon(
                        Icons.tune_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PromoCarousel extends StatefulWidget {
  const _PromoCarousel();

  @override
  State<_PromoCarousel> createState() => _PromoCarouselState();
}

class _PromoCarouselState extends State<_PromoCarousel> {
  static const List<_PromoSlide> _slides = [
    _PromoSlide(
      background: Color(0xFF0D65FF),
      bubbleOne: Color(0x801F77FF),
      bubbleTwo: Color(0xFF1C74FF),
      kicker: '25% OFF*',
      title: "Today's Special",
      body: 'Get a Discount for Every\nCourse Order only Valid for\nToday.!',
      cta: 'See Me',
      textColor: Colors.white,
      shadow: Color(0x330D65FF),
    ),
    _PromoSlide(
      background: Color(0xFFE44B4B),
      bubbleOne: Color(0x66FF7B7B),
      bubbleTwo: Color(0xFFD93A3A),
      kicker: 'NEW',
      title: 'Course Available Now',
      body: 'UI Motion Basics is live.\nJoin the new batch today.',
      cta: 'See Me',
      textColor: Colors.white,
      shadow: Color(0x33E44B4B),
    ),
    _PromoSlide(
      background: Color(0xFF1C1F2A),
      bubbleOne: Color(0x662A2F3F),
      bubbleTwo: Color(0xFF262B3A),
      kicker: 'PRO',
      title: 'Night Class Drops',
      body: 'Master layout and grids.\nLimited seats open.',
      cta: 'See Me',
      textColor: Colors.white,
      shadow: Color(0x331C1F2A),
    ),
  ];

  final PageController _controller = PageController();
  Timer? _timer;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!_controller.hasClients) return;
      final int next = (_index + 1) % _slides.length;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 420),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 172,
      child: Stack(
        children: [
          PageView.builder(
            controller: _controller,
            itemCount: _slides.length,
            onPageChanged: (value) {
              setState(() => _index = value);
            },
            itemBuilder: (context, slideIndex) {
              final _PromoSlide slide = _slides[slideIndex];
              return _PromoSlideCard(slide: slide);
            },
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 12,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _slides.length,
                (dotIndex) => _DotIndicator(active: dotIndex == _index),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OutlineCircleIconButton extends StatelessWidget {
  const _OutlineCircleIconButton({required this.icon, this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    const Color borderColor = Color(0xFF167F71);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: SizedBox(
          width: 46,
          height: 46,
          child: Center(
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: borderColor, width: 2),
              ),
              child: Icon(icon, color: borderColor, size: 22),
            ),
          ),
        ),
      ),
    );
  }
}

class _PromoSlideCard extends StatelessWidget {
  const _PromoSlideCard({required this.slide});

  final _PromoSlide slide;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 2),
      decoration: BoxDecoration(
        color: slide.background,
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: slide.shadow,
            blurRadius: 22,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            left: -40,
            bottom: -30,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: slide.bubbleOne,
                borderRadius: BorderRadius.circular(80),
              ),
            ),
          ),
          Positioned(
            right: -30,
            top: -20,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: slide.bubbleTwo,
                borderRadius: BorderRadius.circular(70),
              ),
            ),
          ),
          Positioned(
            left: 20,
            top: 22,
            child: Text(
              slide.kicker,
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: slide.textColor,
              ),
            ),
          ),
          Positioned(
            left: 20,
            top: 44,
            child: Text(
              slide.title,
              style: GoogleFonts.poppins(
                fontSize: 19,
                fontWeight: FontWeight.w700,
                color: slide.textColor,
              ),
            ),
          ),
          Positioned(
            left: 20,
            top: 76,
            child: SizedBox(
              width: 220,
              child: Text(
                slide.body,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: slide.textColor,
                  height: 1.35,
                ),
              ),
            ),
          ),
          Positioned(
            left: 20,
            bottom: 32,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                slide.cta,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: slide.background,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PromoSlide {
  const _PromoSlide({
    required this.background,
    required this.bubbleOne,
    required this.bubbleTwo,
    required this.kicker,
    required this.title,
    required this.body,
    required this.cta,
    required this.textColor,
    required this.shadow,
  });

  final Color background;
  final Color bubbleOne;
  final Color bubbleTwo;
  final String kicker;
  final String title;
  final String body;
  final String cta;
  final Color textColor;
  final Color shadow;
}

class _DotIndicator extends StatelessWidget {
  const _DotIndicator({required this.active});

  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: active ? 18 : 6,
      height: 6,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: active
            ? const Color(0xFFFFD24C)
            : Colors.white.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.onTap});

  final String title;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF202244),
          ),
        ),
        const Spacer(),
        GestureDetector(
          onTap: onTap,
          child: Row(
            children: [
              Text(
                'SEE ALL',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF0D65FF),
                ),
              ),
              const SizedBox(width: 6),
              const Icon(
                Icons.arrow_forward_ios,
                size: 12,
                color: Color(0xFF0D65FF),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CategoriesRow extends StatelessWidget {
  const _CategoriesRow({
    required this.primary,
    required this.mutedColor,
    required this.categories,
    required this.activeCategory,
    required this.onSelected,
  });

  final Color primary;
  final Color mutedColor;
  final List<String> categories;
  final String? activeCategory;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) {
      return const SizedBox.shrink();
    }
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(categories.length, (index) {
          final String label = categories[index];
          final bool selected = label == activeCategory;
          return Padding(
            padding: EdgeInsets.only(
              right: index == categories.length - 1 ? 0 : 22,
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => onSelected(label),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
                child: Text(
                  label,
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                    color: selected ? primary : mutedColor,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _CourseFilters extends StatelessWidget {
  const _CourseFilters({
    required this.filters,
    required this.selectedFilter,
    required this.onSelected,
  });

  final List<String> filters;
  final String selectedFilter;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    if (filters.isEmpty) {
      return const SizedBox.shrink();
    }
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(filters.length, (index) {
          final String label = filters[index];
          final bool selected = label == selectedFilter;
          return Padding(
            padding: EdgeInsets.only(
              right: index == filters.length - 1 ? 0 : 12,
            ),
            child: _FilterChip(
              label: label,
              selected: selected,
              onTap: () => onSelected(label),
            ),
          );
        }),
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
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFF1F7C64) : const Color(0xFFEAF0FF),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : const Color(0xFF7581A6),
            ),
          ),
        ),
      ),
    );
  }
}

class _PopularCourses extends StatelessWidget {
  const _PopularCourses({required this.courses});

  final List<CourseItem> courses;

  @override
  Widget build(BuildContext context) {
    if (courses.isEmpty) {
      return SizedBox(
        height: 160,
        child: Center(
          child: Text(
            'No courses found',
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF7D818F),
            ),
          ),
        ),
      );
    }
    final int itemCount = math.min(courses.length, 5);
    return SizedBox(
      height: 236,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        itemBuilder: (context, index) {
          final CourseItem course = courses[index];
          return _CourseCard(
            course: course,
            onToggleBookmark: () => CourseCatalog.toggleBookmark(course.id),
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
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemCount: itemCount,
      ),
    );
  }
}

class _CourseCard extends StatefulWidget {
  const _CourseCard({
    required this.course,
    required this.onToggleBookmark,
    required this.onTap,
  });

  final CourseItem course;
  final Future<bool> Function() onToggleBookmark;
  final VoidCallback onTap;

  @override
  State<_CourseCard> createState() => _CourseCardState();
}

class _CourseCardState extends State<_CourseCard> {
  late bool _bookmarked;
  bool _removalConfirmed = false;
  bool get _isNewCourse {
    final DateTime? createdAt = widget.course.createdAt;
    if (createdAt == null) return false;
    final DateTime nowUtc = DateTime.now().toUtc();
    final DateTime createdUtc = createdAt.toUtc();
    return createdUtc.isAfter(nowUtc.subtract(const Duration(hours: 24)));
  }

  @override
  void initState() {
    super.initState();
    _bookmarked = widget.course.bookmarked;
  }

  @override
  void didUpdateWidget(covariant _CourseCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.course.bookmarked != widget.course.bookmarked) {
      _bookmarked = widget.course.bookmarked;
    }
  }

  Future<void> _toggleBookmark() async {
    if (_bookmarked) {
      final bool confirmed = await _confirmBookmarkRemoval();
      if (!confirmed) return;
    }
    setState(() {
      _bookmarked = !_bookmarked;
      _removalConfirmed = false;
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

  Future<bool> _confirmBookmarkRemoval() async {
    if (_removalConfirmed) return true;
    final bool? result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.45),
      builder: (context) => _RemoveBookmarkDialog(course: widget.course),
    );
    final bool confirmed = result ?? false;
    if (confirmed) _removalConfirmed = true;
    return confirmed;
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
  Widget build(BuildContext context) {
    final Color badgeColor = _bookmarked
        ? const Color(0xFFEAF6F5)
        : const Color(0xFFF1F3F9);
    final Color badgeBorder = _bookmarked
        ? const Color(0xFFBFE6E3)
        : const Color(0xFFE0E3EF);
    final Color iconColor = _bookmarked
        ? const Color(0xFF2F8E8A)
        : const Color(0xFFB6BED6);
    final bool isNewCourse = _isNewCourse;

    return SizedBox(
      width: 220,
      height: 230,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: widget.onTap,
          child: Container(
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 108,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
                    image: resolveDecorationImage(widget.course.coverImagePath),
                  ),
                  child: Stack(
                    children: [
                      if ((widget.course.coverImagePath ?? '').trim().isEmpty)
                        const Center(
                          child: Icon(
                            Icons.image_outlined,
                            color: Colors.white70,
                          ),
                        ),
                      if (isNewCourse)
                        Positioned(top: 10, left: 10, child: _buildNewBadge()),
                    ],
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
                              widget.course.category,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFE2702B),
                              ),
                            ),
                            const Spacer(),
                            InkWell(
                              borderRadius: BorderRadius.circular(10),
                              onTap: _toggleBookmark,
                              child: Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: badgeColor,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: badgeBorder,
                                    width: 1,
                                  ),
                                ),
                                child: Center(
                                  child: SvgPicture.asset(
                                    'assets/home/book mark.svg',
                                    width: 14,
                                    height: 16,
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
                          widget.course.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF1C2140),
                            height: 1.25,
                          ),
                        ),
                        const Spacer(),
                        Row(
                          children: [
                            Text(
                              widget.course.price,
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0D65FF),
                              ),
                            ),
                            const SizedBox(width: 10),
                            const Text(
                              '|',
                              style: TextStyle(color: Color(0xFFB6BED6)),
                            ),
                            const SizedBox(width: 10),
                            const Icon(
                              Icons.star,
                              size: 14,
                              color: Color(0xFFF4B400),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              widget.course.rating,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF4A4E5F),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              '|',
                              style: TextStyle(color: Color(0xFFB6BED6)),
                            ),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                widget.course.students,
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

class _RemoveBookmarkDialog extends StatelessWidget {
  const _RemoveBookmarkDialog({required this.course});

  final CourseItem course;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 8),
          Container(
            width: 48,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFBFC6D8),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              color: Color(0xFFF6F8FF),
              borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            ),
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Remove From Bookmark?',
                  style: GoogleFonts.poppins(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1B2345),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 18),
                _RemoveBookmarkCourseCard(course: course),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFFCBD5EF)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(50),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: Text(
                          'Cancel',
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF6E7592),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D65FF),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(50),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Yes, Remove',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.arrow_forward, size: 18),
                          ],
                        ),
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

class _RemoveBookmarkCourseCard extends StatelessWidget {
  const _RemoveBookmarkCourseCard({required this.course});

  final CourseItem course;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C7C8BB4),
            blurRadius: 22,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 100,
            height: 90,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: const Color(0xFFE0E8F7),
              image: resolveDecorationImage(course.coverImagePath),
            ),
            child: (course.coverImagePath ?? '').trim().isEmpty
                ? const Center(child: Icon(Icons.image, color: Colors.white70))
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      course.category,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFFF57C00),
                      ),
                    ),
                    const Spacer(),
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEAF6F5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: SvgPicture.asset(
                          'assets/home/book mark.svg',
                          width: 16,
                          height: 18,
                          colorFilter: const ColorFilter.mode(
                            Color(0xFF1F7C64),
                            BlendMode.srcIn,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  course.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1B2345),
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  course.price,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0D65FF),
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F3FF),
                        borderRadius: BorderRadius.circular(12),
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
                            course.rating,
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF4A4E5F),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        course.students,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF7D818F),
                        ),
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

class _TopMentors extends StatelessWidget {
  const _TopMentors();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<List<MentorItem>>(
      valueListenable: MentorCatalog.mentors,
      builder: (context, mentors, _) {
        final List<MentorItem> orderedMentors = FeaturedOrderStore.orderMentors(
          mentors,
        );
        if (orderedMentors.isEmpty) {
          return SizedBox(
            height: 110,
            child: Center(
              child: Text(
                'No mentors available',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF7D818F),
                ),
              ),
            ),
          );
        }
        final int itemCount = math.min(orderedMentors.length, 6);
        return SizedBox(
          height: 110,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: itemCount,
            separatorBuilder: (_, __) => const SizedBox(width: 18),
            itemBuilder: (context, index) {
              final MentorItem mentor = orderedMentors[index];
              return _MentorItem(
                mentor: mentor,
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
              );
            },
          ),
        );
      },
    );
  }
}

class _MentorItem extends StatelessWidget {
  const _MentorItem({required this.mentor, required this.onTap});

  final MentorItem mentor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Column(
        children: [
          Builder(
            builder: (context) {
              final DecorationImage? mentorImage = resolveDecorationImage(
                mentor.imagePath,
              );
              return Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF0FF),
                  borderRadius: BorderRadius.circular(18),
                  image: mentorImage,
                ),
                child: mentorImage == null
                    ? const Icon(Icons.person, color: Color(0xFF3F465C))
                    : null,
              );
            },
          ),
          const SizedBox(height: 8),
          Text(
            mentor.name,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF3F465C),
            ),
          ),
        ],
      ),
    );
  }
}
