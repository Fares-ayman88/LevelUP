import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/admin_access.dart';
import '../app_state/transaction_catalog.dart';
import '../routes.dart';
import 'payment_request_screen.dart';

Future<void> showNotificationsBottomSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.12),
    builder: (_) => const _NotificationsSheet(),
  );
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF7D818F);
  static const Color _cardFill = Color(0xFFEFF4FF);
  static const Color _cardBorder = Color(0xFFDCE6F7);
  static const Color _primary = Color(0xFF0D65FF);

  static const List<_NotificationSection> _sections = [
    _NotificationSection(
      title: 'Today',
      items: [
        _NotificationItem(
          title: 'New Category Course.!',
          message: 'New the 3D Design Course is Availa..',
          asset: 'assets/notifications/Circle.svg',
          isNew: true,
        ),
        _NotificationItem(
          title: 'Flash Sale 25% Off',
          message: 'Enroll today and save your seat.',
          asset: 'assets/notifications/Circle (1).svg',
          isNew: true,
        ),
        _NotificationItem(
          title: "Today's Special Offers",
          message: 'You Have made a Coure Payment.',
          asset: 'assets/notifications/Circle (2).svg',
          isNew: true,
        ),
        _NotificationItem(
          title: 'Mentor replied to you',
          message: 'Your question got a new reply.',
          asset: 'assets/notifications/Circle (3).svg',
          isNew: true,
        ),
      ],
    ),
    _NotificationSection(
      title: 'Yesterday',
      items: [
        _NotificationItem(
          title: 'Credit Card Connected.!',
          message: 'Credit Card has been Linked.!',
          asset: 'assets/notifications/Circle (4).svg',
          isNew: false,
        ),
        _NotificationItem(
          title: 'Course Updated',
          message: '2 new lessons added to your class.',
          asset: 'assets/notifications/Circle (1).svg',
          isNew: false,
        ),
      ],
    ),
    _NotificationSection(
      title: 'Nov 20, 2022',
      items: [
        _NotificationItem(
          title: 'Account Setup Successful.!',
          message: 'Your Account has been Created.',
          asset: 'assets/notifications/Circle.svg',
          isNew: false,
        ),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: _NotificationsContent(onBack: () => Navigator.of(context).pop()),
      ),
    );
  }
}

class _NotificationsSheet extends StatelessWidget {
  const _NotificationsSheet();

  @override
  Widget build(BuildContext context) {
    final double height = MediaQuery.of(context).size.height * 0.92;
    const double glassHeight = 180;
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
      child: SizedBox(
        height: height,
        child: Stack(
          children: [
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0.0, 0.35, 1.0],
                  colors: [
                    Color(0x00F5F9FF),
                    Color(0xCCF5F9FF),
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
                  filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.28),
                      gradient: const LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0xB3FFFFFF),
                          Color(0x66FFFFFF),
                          Color(0x00FFFFFF),
                        ],
                      ),
                      border: Border(
                        bottom: BorderSide(
                          color: Color(0x80FFFFFF),
                          width: 1.2,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              height: 1.5,
              child: Container(color: const Color(0x99FFFFFF)),
            ),
            SafeArea(
              top: false,
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  Center(
                    child: Container(
                      width: 42,
                      height: 5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCED7EC).withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Expanded(
                    child: _NotificationsContent(
                      onBack: () => Navigator.of(context).pop(),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationsContent extends StatelessWidget {
  const _NotificationsContent({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final bool isAdmin = AdminAccess.isAdmin();
    if (isAdmin) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        TransactionCatalog.markAdminNotificationsSeen();
      });
    }
    return LayoutBuilder(
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
              Row(
                children: [
                  InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: onBack,
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Icon(
                        Icons.arrow_back,
                        size: 26,
                        color: NotificationsScreen._title,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Notifications',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: NotificationsScreen._title,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (isAdmin)
                ValueListenableBuilder<List<TransactionItem>>(
                  valueListenable: TransactionCatalog.adminTransactions,
                  builder: (context, transactions, _) {
                    final List<TransactionItem> pending = transactions
                        .where(
                          (item) => item.status == TransactionStatus.waiting,
                        )
                        .toList();
                    if (pending.isEmpty) {
                      return const SizedBox.shrink();
                    }
                    final _NotificationSection section = _NotificationSection(
                      title: 'Payment Requests',
                      items: pending
                          .map(
                            (item) => _NotificationItem(
                              title: 'Payment request',
                              message:
                                  '${item.userName.isNotEmpty ? item.userName : item.userEmail} Ã¢â‚¬Â¢ ${item.courseTitle}',
                              asset: 'assets/notifications/Circle (2).svg',
                              isNew: true,
                              onTap: () {
                                Navigator.of(context).pushNamed(
                                  AppRoutes.paymentRequest,
                                  arguments: PaymentRequestArgs(
                                    transactionId: item.id,
                                  ),
                                );
                              },
                            ),
                          )
                          .toList(),
                    );
                    return _NotificationSectionView(section: section);
                  },
                ),
              ...NotificationsScreen._sections.map((section) {
                return _NotificationSectionView(section: section);
              }),
            ],
          ),
        );
      },
    );
  }
}

class _NotificationSectionView extends StatelessWidget {
  const _NotificationSectionView({required this.section});

  final _NotificationSection section;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            section.title,
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: NotificationsScreen._title,
            ),
          ),
          const SizedBox(height: 12),
          ...section.items.map((item) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _NotificationCard(item: item),
            );
          }),
        ],
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({required this.item});

  final _NotificationItem item;

  @override
  Widget build(BuildContext context) {
    final Widget card = Stack(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
          decoration: BoxDecoration(
            color: NotificationsScreen._cardFill,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: NotificationsScreen._cardBorder),
            boxShadow: const [
              BoxShadow(
                color: Color(0x14697AA0),
                blurRadius: 16,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            children: [
              SizedBox(
                width: 52,
                height: 52,
                child: SvgPicture.asset(item.asset, fit: BoxFit.contain),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: NotificationsScreen._title,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.message,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: NotificationsScreen._textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (item.isNew)
          Positioned(
            right: 14,
            top: 12,
            child: Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: NotificationsScreen._primary,
                shape: BoxShape.circle,
              ),
            ),
          ),
      ],
    );

    if (item.onTap == null) return card;
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: item.onTap,
      child: card,
    );
  }
}

class _NotificationSection {
  const _NotificationSection({required this.title, required this.items});

  final String title;
  final List<_NotificationItem> items;
}

class _NotificationItem {
  const _NotificationItem({
    required this.title,
    required this.message,
    required this.asset,
    required this.isNew,
    this.onTap,
  });

  final String title;
  final String message;
  final String asset;
  final bool isNew;
  final VoidCallback? onTap;
}
