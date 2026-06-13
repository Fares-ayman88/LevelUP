import { Link } from 'react-router-dom';
import './AppFooter.css';

const HIDDEN_ROUTE_PATHS = ['/', '/presentation'];
const HIDDEN_ROUTE_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/verify-otp',
  '/verify-email',
  '/fill-profile',
  '/create-pin',
  '/biometric',
  '/forgot-password',
  '/create-new-password',
  '/password-reset-success',
  '/pin-auth',
  '/call',
  '/lesson-player',
  '/mentor-chat-thread',
  '/support-chat-thread',
];

const footerSections = [
  {
    title: 'Certifications by Issuer',
    links: [
      { label: 'LevelUp Certificates', to: '/certificate' },
      { label: 'Programming Certificates', to: '/search-results' },
      { label: 'Design Certificates', to: '/search-results' },
      { label: 'Business Certificates', to: '/search-results' },
      { label: 'View all certificates', to: '/all-category' },
    ],
  },
  {
    title: 'Web Development',
    links: [
      { label: 'Web Development', to: '/search-results' },
      { label: 'JavaScript', to: '/search-results' },
      { label: 'React JS', to: '/search-results' },
      { label: 'Programming', to: '/search-results' },
      { label: 'Mobile Development', to: '/search-results' },
    ],
  },
  {
    title: 'IT & Technology',
    links: [
      { label: 'Programming', to: '/search-results' },
      { label: 'Flutter Development', to: '/search-results' },
      { label: 'Dart Essentials', to: '/search-results' },
      { label: 'AI Chat', to: '/indox' },
      { label: 'Saved Courses', to: '/saved-courses' },
    ],
  },
  {
    title: 'Leadership',
    links: [
      { label: 'Personal Development', to: '/search-results' },
      { label: 'HR Management', to: '/search-results' },
      { label: 'Project Guidance', to: '/user-flow' },
      { label: 'Mentors', to: '/top-mentors' },
      { label: 'Learning Progress', to: '/my-courses' },
    ],
  },
  {
    title: 'Business & Data',
    links: [
      { label: 'Finance & Accounting', to: '/search-results' },
      { label: 'Office Productivity', to: '/search-results' },
      { label: 'Business', to: '/search-results' },
      { label: 'Transactions', to: '/transactions' },
      { label: 'Payment Methods', to: '/payment-methods' },
    ],
  },
  {
    title: 'Communication',
    links: [
      { label: 'Support Chats', to: '/support-chats' },
      { label: 'Mentor Chats', to: '/mentor-chats' },
      { label: 'Invite Friends', to: '/invite-friends' },
      { label: 'Reviews', to: '/reviews' },
      { label: 'Notifications', to: '/notifications' },
    ],
  },
  {
    title: 'Design & Creativity',
    links: [
      { label: 'Graphic Design', to: '/search-results' },
      { label: '3D Design', to: '/search-results' },
      { label: 'Photography', to: '/search-results' },
      { label: 'Arts & Humanities', to: '/search-results' },
      { label: 'Popular Courses', to: '/popular-courses' },
    ],
  },
  {
    title: 'LevelUp',
    links: [
      { label: 'Home', to: '/home' },
      { label: 'All Categories', to: '/all-category' },
      { label: 'Profile', to: '/profile' },
      { label: 'Security', to: '/security' },
      { label: 'Terms & Conditions', to: '/terms-conditions' },
    ],
  },
];

export default function AppFooter() {
  return null;
}
