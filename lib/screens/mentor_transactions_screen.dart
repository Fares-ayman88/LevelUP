import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/transaction_catalog.dart';
import '../app_state/user_profile.dart';

class MentorTransactionsScreen extends StatefulWidget {
  const MentorTransactionsScreen({super.key});

  @override
  State<MentorTransactionsScreen> createState() =>
      _MentorTransactionsScreenState();
}

class _MentorTransactionsScreenState extends State<MentorTransactionsScreen> {
  static const Color _muted = Color(0xFF7D818F);

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  Color _statusColor(TransactionStatus status) {
    switch (status) {
      case TransactionStatus.paid:
        return const Color(0xFF1F7C64);
      case TransactionStatus.rejected:
        return const Color(0xFFE74C3C);
      case TransactionStatus.waiting:
        return const Color(0xFFE2702B);
    }
  }

  DateTime _resolveDate(TransactionItem item) {
    return item.updatedAt ?? item.createdAt ?? DateTime.now();
  }

  String _formatDateTime(DateTime date) {
    final String y = date.year.toString();
    final String m = date.month.toString().padLeft(2, '0');
    final String d = date.day.toString().padLeft(2, '0');
    final String h = date.hour.toString().padLeft(2, '0');
    final String min = date.minute.toString().padLeft(2, '0');
    return '$y-$m-$d $h:$min';
  }

  List<TransactionItem> _filterForMentor(
    List<TransactionItem> items,
    String mentorId,
    String mentorName,
  ) {
    return items.where((item) {
      if (mentorId.isNotEmpty && item.mentorId == mentorId) {
        return true;
      }
      if (mentorId.isEmpty &&
          mentorName.isNotEmpty &&
          item.mentorName == mentorName) {
        return true;
      }
      return false;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Center(
          child: Text(
            'Sign in required.',
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: _muted,
            ),
          ),
        ),
      );
    }
    final String mentorId = user.uid;
    final String mentorName = UserProfile.userName.trim();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: TransactionCatalog.forceLocal
            ? ValueListenableBuilder<List<TransactionItem>>(
                valueListenable: TransactionCatalog.adminTransactions,
                builder: (context, transactions, _) {
                  final List<TransactionItem> filtered = _filterForMentor(
                    transactions,
                    mentorId,
                    mentorName,
                  )..sort((a, b) => _resolveDate(b).compareTo(_resolveDate(a)));
                  return _MentorTransactionsBody(
                    items: filtered,
                    statusColor: _statusColor,
                    formatDate: _formatDateTime,
                  );
                },
              )
            : StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                stream: FirebaseFirestore.instance
                    .collection('transactions')
                    .where('mentorId', isEqualTo: mentorId)
                    .snapshots(),
                builder: (context, snapshot) {
                  final List<TransactionItem> items =
                      snapshot.data?.docs
                          .map(
                            (doc) =>
                                TransactionItem.fromMap(doc.id, doc.data()),
                          )
                          .toList() ??
                      [];
                  items.sort(
                    (a, b) => _resolveDate(b).compareTo(_resolveDate(a)),
                  );
                  return _MentorTransactionsBody(
                    items: items,
                    statusColor: _statusColor,
                    formatDate: _formatDateTime,
                  );
                },
              ),
      ),
    );
  }
}

class _MentorTransactionsBody extends StatelessWidget {
  const _MentorTransactionsBody({
    required this.items,
    required this.statusColor,
    required this.formatDate,
  });

  final List<TransactionItem> items;
  final Color Function(TransactionStatus) statusColor;
  final String Function(DateTime) formatDate;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
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
                    color: Color(0xFF202244),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Recent Payments',
                  style: GoogleFonts.poppins(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF202244),
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: items.isEmpty
              ? Center(
                  child: Text(
                    'No payments yet.',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF7D818F),
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final TransactionItem item = items[index];
                    final Color color = statusColor(item.status);
                    return _MentorTransactionCard(
                      item: item,
                      statusColor: color,
                      formattedDate: formatDate(
                        item.updatedAt ?? item.createdAt ?? DateTime.now(),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _MentorTransactionCard extends StatelessWidget {
  const _MentorTransactionCard({
    required this.item,
    required this.statusColor,
    required this.formattedDate,
  });

  final TransactionItem item;
  final Color statusColor;
  final String formattedDate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C7C8BB4),
            blurRadius: 18,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.courseTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1C2140),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.courseCategory,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF7D818F),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.userName.isNotEmpty ? item.userName : item.userEmail,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF202244),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.priceLabel,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF7D818F),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  formattedDate,
                  style: GoogleFonts.poppins(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF7D818F),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: statusColor.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  item.status == TransactionStatus.paid
                      ? Icons.check_circle
                      : item.status == TransactionStatus.rejected
                      ? Icons.cancel
                      : Icons.schedule,
                  size: 14,
                  color: statusColor,
                ),
                const SizedBox(width: 6),
                Text(
                  item.status.label,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: statusColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
