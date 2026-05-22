// ignore_for_file: deprecated_member_use

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'app_state/course_catalog.dart';
import 'app_state/course_progress.dart';
import 'app_state/email_verification_gate.dart';
import 'app_state/language_store.dart';
import 'app_state/mentor_catalog.dart';
import 'app_state/onboarding_store.dart';
import 'app_state/theme_store.dart';
import 'app_state/transaction_catalog.dart';
import 'app_state/user_access.dart';
import 'app_state/user_profile.dart';
import 'app_state/saved_courses_store.dart';
import 'app_state/ai_chat_store.dart';
import 'enums/user_role.dart';
import 'guards/role_guard.dart';
import 'providers/auth_provider.dart';
import 'models/user_model.dart';
import 'routes.dart';
import 'screens/lets_you_in_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/fill_profile_screen.dart';
import 'screens/sign_in_screen.dart';
import 'screens/sign_up_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/create_pin_screen.dart';
import 'screens/biometric_setup_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/home_screen.dart';
import 'screens/all_category_screen.dart';
import 'screens/popular_courses_screen.dart';
import 'screens/top_mentors_screen.dart';
import 'screens/search_results_screen.dart';
import 'screens/filter_screen.dart';
import 'screens/course_detail_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/notification_settings_screen.dart';
import 'screens/mentor_profile_screen.dart';
import 'screens/course_reviews_screen.dart';
import 'screens/payment_methods_screen.dart';
import 'screens/payment_option_screen.dart';
import 'screens/my_courses_screen.dart';
import 'screens/indox_screen.dart';
import 'screens/mentor_chats_screen.dart';
import 'screens/mentor_chat_thread_screen.dart';
import 'screens/support_chats_screen.dart';
import 'screens/support_chat_thread_screen.dart';
import 'screens/completed_course_screen.dart';
import 'screens/ongoing_course_screen.dart';
import 'screens/certificate_screen.dart';
import 'screens/lesson_player_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/edit_profile_screen.dart';
import 'screens/security_screen.dart';
import 'screens/language_screen.dart';
import 'screens/terms_conditions_screen.dart';
import 'screens/help_center_screen.dart';
import 'screens/invite_friends_screen.dart';
import 'screens/admin_courses_screen.dart';
import 'screens/admin_transactions_screen.dart';
import 'screens/instructor_requests_screen.dart';
import 'screens/instructor_dashboard_screen.dart';
import 'screens/instructor_registration_screen.dart';
import 'screens/instructor_documents_screen.dart';
import 'screens/mentor_transactions_screen.dart';
import 'screens/featured_sort_screen.dart';
import 'screens/google_authenticator_screen.dart';
import 'screens/call_screen.dart';
import 'screens/transactions_screen.dart';
import 'screens/manual_transfer_screen.dart';
import 'screens/payment_request_screen.dart';
import 'screens/receipt_screen.dart';
import 'screens/saved_courses_screen.dart';
import 'services/pocketbase_config.dart';
import 'services/pocketbase_service.dart';

class NoTransitionsBuilder extends PageTransitionsBuilder {
  const NoTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return child;
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AiChatStore.ensureInitialized();
  await ThemeStore.init();
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  runApp(const LevelUpApp(logoImage: AssetImage('assets/logo.png')));
}

class LevelUpApp extends StatelessWidget {
  const LevelUpApp({super.key, required this.logoImage});

  final ImageProvider logoImage;
  static const Color _primaryBlue = Color(0xFF0D65FF);
  static const Color _surfaceWhite = Color(0xFFFFFFFF);
  static const Color _surfaceSoft = Color(0xFFF8FAFF);
  static const Color _outlineSoft = Color(0xFFE2E6F4);

  ThemeData _buildTheme({required bool dark}) {
    final ColorScheme scheme = dark
        ? const ColorScheme.dark(
            primary: _primaryBlue,
            onPrimary: Colors.white,
            secondary: _primaryBlue,
            onSecondary: Colors.white,
            surface: Color(0xFF000000),
            onSurface: Color(0xFFF5F5F5),
            error: Color(0xFFFF6B6B),
            onError: Colors.black,
          )
        : const ColorScheme.light(
            primary: _primaryBlue,
            onPrimary: Colors.white,
            secondary: _primaryBlue,
            onSecondary: Colors.white,
            surface: _surfaceWhite,
            onSurface: Color(0xFF202244),
            error: Color(0xFFE74C3C),
            onError: Colors.white,
          );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: dark ? const Color(0xFF000000) : _surfaceWhite,
      canvasColor: scheme.surface,
      cardColor: scheme.surface,
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: scheme.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(
            color: dark ? const Color(0xFF2A2A2A) : _outlineSoft,
          ),
        ),
      ),
      dropdownMenuTheme: DropdownMenuThemeData(
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: dark ? const Color(0xFF0A0A0A) : _surfaceSoft,
          border: OutlineInputBorder(
            borderRadius: const BorderRadius.all(Radius.circular(14)),
            borderSide: BorderSide(
              color: dark ? const Color(0xFF2A2A2A) : _outlineSoft,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: const BorderRadius.all(Radius.circular(14)),
            borderSide: BorderSide(
              color: dark ? const Color(0xFF2A2A2A) : _outlineSoft,
            ),
          ),
          focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(14)),
            borderSide: BorderSide(color: _primaryBlue, width: 1.2),
          ),
        ),
      ),
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: _primaryBlue,
        selectionColor: Color(0x332E7DFF),
        selectionHandleColor: _primaryBlue,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: NoTransitionsBuilder(),
          TargetPlatform.iOS: NoTransitionsBuilder(),
          TargetPlatform.macOS: NoTransitionsBuilder(),
          TargetPlatform.linux: NoTransitionsBuilder(),
          TargetPlatform.windows: NoTransitionsBuilder(),
          TargetPlatform.fuchsia: NoTransitionsBuilder(),
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<LanguageOption>(
      valueListenable: LanguageStore.current,
      builder: (context, selection, _) {
        return ValueListenableBuilder<bool>(
          valueListenable: ThemeStore.isDark,
          builder: (context, isDark, __) {
            return MaterialApp(
              debugShowCheckedModeBanner: false,
              locale: selection.locale,
              supportedLocales: LanguageStore.supportedLocales,
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
              theme: _buildTheme(dark: false),
              darkTheme: _buildTheme(dark: true),
              initialRoute: AppRoutes.splash,
              routes: {
                AppRoutes.onboarding: (_) => const OnboardingScreen(),
                AppRoutes.letsYouIn: (_) => const LetsYouInScreen(),
                AppRoutes.signIn: (_) => const SignInScreen(),
                AppRoutes.signUp: (_) => const SignUpScreen(),
                AppRoutes.fillProfile: (_) => const FillProfileScreen(),
                AppRoutes.createPin: (_) => const CreatePinScreen(),
                AppRoutes.biometricSetup: (_) => const BiometricSetupScreen(),
                AppRoutes.forgotPassword: (_) => const ForgotPasswordScreen(),
                AppRoutes.home: (_) => const HomeScreen(),
                AppRoutes.allCategory: (_) => const AllCategoryScreen(),
                AppRoutes.popularCourses: (_) => const PopularCoursesScreen(),
                AppRoutes.topMentors: (_) => const TopMentorsScreen(),
                AppRoutes.searchResults: (_) => const SearchResultsScreen(),
                AppRoutes.filter: (_) => const FilterScreen(),
                AppRoutes.courseDetail: (_) => const CourseDetailScreen(),
                AppRoutes.notifications: (_) => const NotificationsScreen(),
                AppRoutes.notificationSettings: (_) =>
                    const NotificationSettingsScreen(),
                AppRoutes.mentorProfile: (_) => const MentorProfileScreen(),
                AppRoutes.reviews: (_) => const CourseReviewsScreen(),
                AppRoutes.paymentMethods: (_) => const PaymentMethodsScreen(),
                AppRoutes.paymentOption: (_) => const PaymentOptionScreen(),
                AppRoutes.addNewCard: (_) => const AddNewCardScreen(),
                AppRoutes.myCourses: (_) => const MyCoursesScreen(),
                AppRoutes.indox: (_) => const IndoxScreen(),
                AppRoutes.mentorChats: (_) => const MentorChatsScreen(),
                AppRoutes.mentorChatThread: (_) =>
                    const MentorChatThreadScreen(),
                AppRoutes.supportChats: (_) => const SupportChatsScreen(),
                AppRoutes.supportChatThread: (_) =>
                    const SupportChatThreadScreen(),
                AppRoutes.call: (_) => const CallScreen(),
                AppRoutes.transactions: (_) => const TransactionsScreen(),
                AppRoutes.manualTransfer: (_) => const ManualTransferScreen(),
                AppRoutes.paymentRequest: (_) => const PaymentRequestScreen(),
                AppRoutes.receipt: (_) => const ReceiptScreen(),
                AppRoutes.savedCourses: (_) => const SavedCoursesScreen(),
                AppRoutes.completedCourse: (_) => const CompletedCourseScreen(),
                AppRoutes.ongoingCourse: (_) => const OngoingCourseScreen(),
                AppRoutes.certificate: (_) => const CertificateScreen(),
                AppRoutes.lessonPlayer: (_) => const LessonPlayerScreen(),
                AppRoutes.profile: (_) => const ProfileScreen(),
                AppRoutes.editProfile: (_) => const EditProfileScreen(),
                AppRoutes.security: (_) => const SecurityScreen(),
                AppRoutes.language: (_) => const LanguageScreen(),
                AppRoutes.termsConditions: (_) => const TermsConditionsScreen(),
                AppRoutes.helpCenter: (_) => const HelpCenterScreen(),
                AppRoutes.inviteFriends: (_) => const InviteFriendsScreen(),
                AppRoutes.adminCourses: (_) => const RoleGuard(
                  allowedRoles: {UserRole.admin},
                  child: AdminCoursesScreen(),
                ),
                AppRoutes.adminTransactions: (_) => const RoleGuard(
                  allowedRoles: {UserRole.admin},
                  child: AdminTransactionsScreen(),
                ),
                AppRoutes.instructorRequests: (_) => const RoleGuard(
                  allowedRoles: {UserRole.admin},
                  child: InstructorRequestsScreen(),
                ),
                AppRoutes.instructorDashboard: (_) => const RoleGuard(
                  allowedRoles: {UserRole.instructor},
                  child: InstructorDashboardScreen(),
                ),
                AppRoutes.instructorRegistration: (_) =>
                    const InstructorRegistrationScreen(),
                AppRoutes.instructorDocuments: (_) =>
                    const InstructorDocumentsScreen(),
                AppRoutes.mentorCourses: (_) => const RoleGuard(
                  allowedRoles: {UserRole.instructor},
                  child: AdminCoursesScreen(isMentorMode: true),
                ),
                AppRoutes.mentorTransactions: (_) => const RoleGuard(
                  allowedRoles: {UserRole.instructor},
                  child: MentorTransactionsScreen(),
                ),
                AppRoutes.featuredSort: (_) => const RoleGuard(
                  allowedRoles: {UserRole.admin},
                  child: FeaturedSortScreen(),
                ),
                AppRoutes.googleAuthenticator: (_) =>
                    const GoogleAuthenticatorScreen(),
              },
              onGenerateRoute: (settings) {
                if (settings.name == AppRoutes.splash) {
                  return MaterialPageRoute<void>(
                    builder: (_) => SplashScreen(
                      logoImage: logoImage,
                      bootstrap: () async {
                        await Firebase.initializeApp();
                        await PocketBaseConfig.init();
                        PocketBaseService.reset();
                        await AuthProvider.instance.init();
                        UserAccess.bindAuth();
                        TransactionCatalog.bindAuth();
                        CourseProgressStore.bindAuth();
                        await GoogleSignIn.instance.initialize();
                        await SavedCoursesStore.init();
                        await MentorCatalog.bind();
                        await CourseCatalog.bind();
                        await LanguageStore.init();
                        await Future.delayed(const Duration(seconds: 2));
                        final User? user = FirebaseAuth.instance.currentUser;
                        if (user == null) {
                          final bool seen = await OnboardingStore.seen();
                          return seen
                              ? AppRoutes.letsYouIn
                              : AppRoutes.onboarding;
                        }
                        if (await requiresEmailVerification(user)) {
                          await AuthProvider.instance.signOut(clearLocal: true);
                          return AppRoutes.signIn;
                        }
                        await UserAccess.refreshCurrent();
                        final String displayName = (user.displayName ?? '')
                            .trim();
                        if (displayName.isNotEmpty) {
                          UserProfile.userName = displayName;
                        } else {
                          final String? email = user.email;
                          if (email != null && email.contains('@')) {
                            UserProfile.userName = email.split('@').first;
                          }
                        }
                        final UserModel? profile = await AuthProvider.instance
                            .waitForProfile();
                        if (profile != null && !profile.isActive) {
                          await AuthProvider.instance.signOut();
                          return AppRoutes.signIn;
                        }
                        final UserRole role = profile?.role ?? UserRole.student;
                        if (role == UserRole.admin) {
                          unawaited(
                            CourseCatalog.ensureWelcomeReferenceCourse(),
                          );
                        }
                        return RoleGuard.routeForRole(role);
                      },
                    ),
                  );
                }
                return null;
              },
            );
          },
        );
      },
    );
  }
}
