import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Navbar,
  NavbarContent,
} from '@heroui/react';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';

const NAV_ITEMS = [
  { route: '/home', label: 'Home', icon: <HomeRoundedIcon /> },
  { route: '/my-courses', label: 'Courses', icon: <AutoStoriesRoundedIcon /> },
  { route: '/indox', label: 'Inbox', icon: <ForumRoundedIcon /> },
  { route: '/transactions', label: 'Wallet', icon: <ReceiptLongRoundedIcon /> },
  { route: '/profile', label: 'Profile', icon: <PersonRoundedIcon /> },
];

const TOP_NAV_ITEMS = [
  { route: '/home', label: 'Home' },
  { route: '/profile', label: 'Profile' },
  { route: '/security', label: 'Settings' },
];

const AUTH_TOP_NAV_ITEMS = [
  { route: '/sign-in', label: 'Login' },
  { route: '/sign-up', label: 'Sign Up' },
];

function indexFromPath(pathname = '') {
  const index = NAV_ITEMS.findIndex((item) => pathname.startsWith(item.route));
  return index >= 0 ? index : 0;
}

export default function MainBottomNav({ currentIndex, mode = 'main' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthMode = mode === 'auth';
  const topNavItems = isAuthMode ? AUTH_TOP_NAV_ITEMS : TOP_NAV_ITEMS;
  const fallbackIndex = useMemo(
    () => indexFromPath(location.pathname),
    [location.pathname]
  );
  const activeIndex = typeof currentIndex === 'number' ? currentIndex : fallbackIndex;
  const desktopActivePath = useMemo(() => {
    const matched = topNavItems.find((item) => location.pathname.startsWith(item.route));
    return matched?.route || '';
  }, [location.pathname, topNavItems]);

  useEffect(() => {
    document.body.classList.add('has-main-nav');
    return () => {
      document.body.classList.remove('has-main-nav');
    };
  }, []);

  const handleSelect = (newValue) => {
    const item = NAV_ITEMS[newValue];
    if (!item) return;
    navigate(item.route);
  };

  return (
    <>
      <Navbar
        as="nav"
        maxWidth="xl"
        className="main-app-nav main-app-nav--top"
        classNames={{
          base: 'main-top-nav__base',
          wrapper: 'main-top-nav__wrapper',
        }}
        height="72px"
        shouldHideOnScroll={false}
        disableAnimation
        isBordered={false}
      >
        <div className="main-top-nav__row">
          <button
            type="button"
            className="main-top-nav__brand"
            onClick={() => navigate(isAuthMode ? '/sign-in' : '/home')}
          >
            <span className="main-top-nav__brand-logo-shell" aria-hidden>
              <img
                src="/assets/ul_logo.png"
                alt=""
                className="main-top-nav__brand-logo"
                loading="eager"
              />
            </span>
            <div className="main-top-nav__brand-copy">
              <strong>LevelUp</strong>
              <span>Learn and grow</span>
            </div>
          </button>
          <div className="main-top-nav__links">
            {topNavItems.map((item) => {
              const isActive = desktopActivePath === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  className={`main-top-nav__link${isActive ? ' is-active' : ''}`}
                  onClick={() => navigate(item.route)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

      </Navbar>

      {!isAuthMode ? (
        <Navbar
          as="nav"
          maxWidth="full"
          className="main-app-nav main-app-nav--bottom"
          classNames={{
            base: 'main-bottom-nav__base',
            wrapper: 'main-bottom-nav__wrapper',
          }}
          height="auto"
          shouldHideOnScroll={false}
          disableAnimation
          isBordered={false}
        >
          <NavbarContent justify="center" className="main-bottom-nav__inner">
            {NAV_ITEMS.map((item, index) => {
              const isActive = activeIndex === index;
              return (
                <button
                  key={item.route}
                  type="button"
                  className={`main-bottom-nav__action-btn${isActive ? ' is-active' : ''}`}
                  onClick={() => handleSelect(index)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </NavbarContent>
        </Navbar>
      ) : null}
    </>
  );
}
