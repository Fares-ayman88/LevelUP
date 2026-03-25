import RootRedirect from './pages/RootRedirect.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import FillProfile from './pages/FillProfile.jsx';
import CreatePin from './pages/CreatePin.jsx';
import BiometricSetup from './pages/BiometricSetup.jsx';
import BiometricSuccess from './pages/BiometricSuccess.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ForgotPasswordOtp from './pages/ForgotPasswordOtp.jsx';
import CreateNewPassword from './pages/CreateNewPassword.jsx';
import PasswordResetSuccess from './pages/PasswordResetSuccess.jsx';
import PinAuth from './pages/PinAuth.jsx';
import Home from './pages/Home.jsx';
import MyCourses from './pages/MyCourses.jsx';
import Indox from './pages/Indox.jsx';
import MentorChats from './pages/MentorChats.jsx';
import MentorChatThread from './pages/MentorChatThread.jsx';
import SupportChats from './pages/SupportChats.jsx';
import SupportChatThread from './pages/SupportChatThread.jsx';
import Call from './pages/Call.jsx';
import Transactions from './pages/Transactions.jsx';
import Profile from './pages/Profile.jsx';
import EditProfile from './pages/EditProfile.jsx';
import Security from './pages/Security.jsx';
import Language from './pages/Language.jsx';
import TermsConditions from './pages/TermsConditions.jsx';
import InviteFriends from './pages/InviteFriends.jsx';
import AllCategory from './pages/AllCategory.jsx';
import PopularCourses from './pages/PopularCourses.jsx';
import TopMentors from './pages/TopMentors.jsx';
import SearchResults from './pages/SearchResults.jsx';
import Filter from './pages/Filter.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import MentorProfile from './pages/MentorProfile.jsx';
import Notifications from './pages/Notifications.jsx';
import NotificationSettings from './pages/NotificationSettings.jsx';
import Reviews from './pages/Reviews.jsx';
import PaymentMethods from './pages/PaymentMethods.jsx';
import PaymentOption from './pages/PaymentOption.jsx';
import AddNewCard from './pages/AddNewCard.jsx';
import ManualTransfer from './pages/ManualTransfer.jsx';
import PaymentRequest from './pages/PaymentRequest.jsx';
import Receipt from './pages/Receipt.jsx';
import SavedCourses from './pages/SavedCourses.jsx';
import CompletedCourse from './pages/CompletedCourse.jsx';
import OngoingCourse from './pages/OngoingCourse.jsx';
import Certificate from './pages/Certificate.jsx';
import LessonPlayer from './pages/LessonPlayer.jsx';
import AdminCourses from './pages/AdminCourses.jsx';
import AdminTransactions from './pages/AdminTransactions.jsx';
import InstructorRequests from './pages/InstructorRequests.jsx';
import InstructorDashboard from './pages/InstructorDashboard.jsx';
import InstructorRegistration from './pages/InstructorRegistration.jsx';
import InstructorDocuments from './pages/InstructorDocuments.jsx';
import MentorCourses from './pages/MentorCourses.jsx';
import MentorTransactions from './pages/MentorTransactions.jsx';
import FeaturedSort from './pages/FeaturedSort.jsx';

export const routeConfig = [
  { path: '/', title: 'Root', component: RootRedirect },
  { path: '/sign-in', title: 'Sign In', component: SignIn },
  { path: '/sign-up', title: 'Sign Up', component: SignUp },
  { path: '/fill-profile', title: 'Fill Profile', component: FillProfile },
  { path: '/create-pin', title: 'Create PIN', component: CreatePin },
  { path: '/biometric-setup', title: 'Biometric Setup', component: BiometricSetup },
  { path: '/biometric-success', title: 'Biometric Success', component: BiometricSuccess },
  { path: '/forgot-password', title: 'Forgot Password', component: ForgotPassword },
  { path: '/forgot-password-otp', title: 'Forgot Password OTP', component: ForgotPasswordOtp },
  { path: '/create-new-password', title: 'Create New Password', component: CreateNewPassword },
  { path: '/password-reset-success', title: 'Password Reset Success', component: PasswordResetSuccess },
  { path: '/pin-auth', title: 'PIN Auth', component: PinAuth },
  { path: '/home', title: 'Home', component: Home },
  { path: '/all-category', title: 'All Categories', component: AllCategory },
  { path: '/popular-courses', title: 'Popular Courses', component: PopularCourses },
  { path: '/top-mentors', title: 'Top Mentors', component: TopMentors },
  { path: '/search-results', title: 'Search Results', component: SearchResults },
  { path: '/filter', title: 'Filter', component: Filter },
  { path: '/course-detail', title: 'Course Detail', component: CourseDetail },
  { path: '/notifications', title: 'Notifications', component: Notifications },
  { path: '/notification-settings', title: 'Notification Settings', component: NotificationSettings },
  { path: '/mentor-profile', title: 'Mentor Profile', component: MentorProfile },
  { path: '/reviews', title: 'Reviews', component: Reviews },
  { path: '/payment-methods', title: 'Payment Methods', component: PaymentMethods },
  { path: '/payment-option', title: 'Payment Option', component: PaymentOption },
  { path: '/add-new-card', title: 'Add New Card', component: AddNewCard },
  { path: '/language', title: 'Language', component: Language },
  { path: '/terms-conditions', title: 'Terms & Conditions', component: TermsConditions },
  { path: '/invite-friends', title: 'Invite Friends', component: InviteFriends },
  { path: '/my-courses', title: 'My Courses', component: MyCourses },
  { path: '/indox', title: 'Inbox', component: Indox },
  { path: '/mentor-chats', title: 'Mentor Chats', component: MentorChats },
  { path: '/mentor-chat-thread', title: 'Mentor Chat Thread', component: MentorChatThread },
  { path: '/support-chats', title: 'Support Chats', component: SupportChats },
  { path: '/support-chat-thread', title: 'Support Chat Thread', component: SupportChatThread },
  { path: '/call', title: 'Call', component: Call },
  { path: '/transactions', title: 'Transactions', component: Transactions },
  { path: '/manual-transfer', title: 'Manual Transfer', component: ManualTransfer },
  { path: '/payment-request', title: 'Payment Request', component: PaymentRequest },
  { path: '/receipt', title: 'Receipt', component: Receipt },
  { path: '/saved-courses', title: 'Saved Courses', component: SavedCourses },
  { path: '/completed-course', title: 'Completed Course', component: CompletedCourse },
  { path: '/ongoing-course', title: 'Ongoing Course', component: OngoingCourse },
  { path: '/certificate', title: 'Certificate', component: Certificate },
  { path: '/lesson-player', title: 'Lesson Player', component: LessonPlayer },
  { path: '/profile', title: 'Profile', component: Profile },
  { path: '/edit-profile', title: 'Edit Profile', component: EditProfile },
  { path: '/security', title: 'Security', component: Security },
  { path: '/admin-courses', title: 'Admin Courses', component: AdminCourses, roles: ['admin'] },
  { path: '/admin-transactions', title: 'Admin Transactions', component: AdminTransactions, roles: ['admin'] },
  { path: '/instructor-requests', title: 'Instructor Requests', component: InstructorRequests, roles: ['admin'] },
  { path: '/instructor-dashboard', title: 'Instructor Dashboard', component: InstructorDashboard, roles: ['instructor'] },
  { path: '/instructor-registration', title: 'Instructor Registration', component: InstructorRegistration },
  { path: '/instructor-documents', title: 'Instructor Documents', component: InstructorDocuments },
  { path: '/mentor-courses', title: 'Mentor Courses', component: MentorCourses, roles: ['instructor'] },
  { path: '/mentor-transactions', title: 'Mentor Transactions', component: MentorTransactions, roles: ['instructor'] },
  { path: '/featured-sort', title: 'Featured Sort', component: FeaturedSort, roles: ['admin'] },
];
