import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Navbar,
  NavbarContent,
} from '@heroui/react';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import SearchFilterPopover from './SearchFilterPopover.jsx';
import { filtersToSearchParams } from './searchFiltersLogic.js';
import { createSearchFilterState } from './searchFiltersData.js';
import { resolveAuthRole, signOut, useAuth } from '../state/auth.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import './MainBottomNav.css';

const NAV_ITEMS = [
  { route: '/home', label: 'Home', icon: <HomeRoundedIcon /> },
  { route: '/my-courses', label: 'Courses', icon: <AutoStoriesRoundedIcon /> },
  { route: '/indox', label: 'Inbox', icon: <ForumRoundedIcon /> },
  { route: '/transactions', label: 'Wallet', icon: <ReceiptLongRoundedIcon /> },
  { route: '/profile', label: 'Profile', icon: <PersonRoundedIcon /> },
];

const TOP_NAV_ITEMS = [
  { route: '/notifications', label: 'Notifications', icon: <NotificationsNoneRoundedIcon />, badge: true },
  { route: '/saved-courses', label: 'Saved Courses', icon: <BookmarkBorderRoundedIcon /> },
  { route: '/indox', label: 'AI Chat', icon: <SmartToyRoundedIcon /> },
];

const PROFILE_MENU_ITEMS = [
  { route: '/profile', label: 'My Profile', icon: <PersonRoundedIcon /> },
  { route: '/my-courses', label: 'My Courses', icon: <AutoStoriesRoundedIcon /> },
  { route: '/saved-courses', label: 'Saved Courses', icon: <BookmarkBorderRoundedIcon /> },
  { route: '/certificate', label: 'Certificates', icon: <WorkspacePremiumRoundedIcon /> },
  { route: '/notifications', label: 'Notifications', icon: <NotificationsNoneRoundedIcon /> },
  { route: '/security', label: 'Settings', icon: <SettingsRoundedIcon /> },
];

const AUTH_TOP_NAV_ITEMS = [
  { route: '/sign-in', label: 'Login' },
  { route: '/sign-up', label: 'Sign Up' },
];

function indexFromPath(pathname = '') {
  const index = NAV_ITEMS.findIndex((item) => pathname.startsWith(item.route));
  return index >= 0 ? index : 0;
}

function MainBottomNav({ currentIndex, mode = 'main', showSearch = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [homeSearchFilters, setHomeSearchFilters] = useState(() => createSearchFilterState());
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profileAvatarFailed, setProfileAvatarFailed] = useState(false);
  const profileMenuRef = useRef(null);
  const isAuthMode = mode === 'auth';
  const showTopSearch = !isAuthMode && showSearch;
  const showProfileMenu = !isAuthMode;
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

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (profileMenuRef.current?.contains(event.target)) return;
      setIsProfileMenuOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const profileEmail = (profile?.email || user?.email || '').toString().trim();
  const profileNameSource = (profile?.name || user?.displayName || profileEmail || 'Student')
    .toString()
    .trim();
  const profileName = profileNameSource.includes('@')
    ? profileNameSource.split('@')[0]
    : profileNameSource;
  const profileInitial = (profileName || 'U').charAt(0).toUpperCase();
  const profilePhotoUrl = profile?.photoUrl || user?.photoURL || '';
  const showProfilePhoto = Boolean(profilePhotoUrl) && !profileAvatarFailed;
  const role = resolveAuthRole(profile, user);
  const roleLabel = role === 'admin' ? 'Admin' : role === 'instructor' ? 'Instructor' : 'Student';

  useEffect(() => {
    setProfileAvatarFailed(false);
  }, [profilePhotoUrl]);

  const handleSelect = (newValue) => {
    const item = NAV_ITEMS[newValue];
    if (!item) return;
    navigate(item.route);
  };

  const handleProfileMenuNavigate = (route) => {
    setIsProfileMenuOpen(false);
    navigate(route);
  };

  const handleProfileSignOut = async () => {
    setIsProfileMenuOpen(false);
    try {
      await signOut();
      navigate('/sign-in', { replace: true });
    } catch {
      // Keep the current session if the backend cannot sign out cleanly.
    }
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
        height="auto"
        shouldHideOnScroll={false}
        disableAnimation
        isBordered={false}
      >
        <div className={`main-top-nav__row${showTopSearch ? ' has-search' : ''}`}>
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
          {showTopSearch ? (
            <div className="main-top-nav__search" role="search" aria-label="Site search">
              <button
                type="button"
                className="main-top-nav__search-field"
                onClick={() => {
                  const nextParams = filtersToSearchParams(homeSearchFilters);
                  navigate({
                    pathname: '/search-results',
                    search: nextParams.toString() ? `?${nextParams.toString()}` : '',
                  });
                }}
                aria-label="Open search"
              >
                <span className="material-icons-round" aria-hidden>
                  search
                </span>
                <span className="main-top-nav__search-text">
                  Search courses, mentors, or topics
                </span>
              </button>
              <SearchFilterPopover
                triggerClassName="main-top-nav__search-filter"
                value={homeSearchFilters}
                onApply={(nextFilters) => {
                  setHomeSearchFilters(nextFilters);
                  const nextParams = filtersToSearchParams(nextFilters);
                  navigate({
                    pathname: '/search-results',
                    search: nextParams.toString() ? `?${nextParams.toString()}` : '',
                  });
                }}
              />
            </div>
          ) : null}
          <div
            className={`main-top-nav__right${
              topNavItems.length === 0 ? ' main-top-nav__right--profile-only' : ''
            }`}
          >
            {topNavItems.length > 0 ? (
              <div
                className={`main-top-nav__links${
                  isAuthMode ? '' : ' main-top-nav__links--icon'
                }`}
              >
                {topNavItems.map((item) => {
                  const isActive = desktopActivePath === item.route;
                  const isIconLink = Boolean(item.icon);
                  return (
                    <button
                      key={item.route}
                      type="button"
                      className={`${
                        isIconLink ? 'main-top-nav__icon-link' : 'main-top-nav__link'
                      }${isActive ? ' is-active' : ''}`}
                      onClick={() => navigate(item.route)}
                      aria-label={isIconLink ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      title={isIconLink ? item.label : undefined}
                      style={{ position: 'relative' }}
                    >
                      {isIconLink ? (
                        <>
                          <span className="main-top-nav__nav-icon" aria-hidden>
                            {item.icon}
                          </span>
                          {item.badge && unreadCount > 0 && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: '#e74c3c',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #fff',
                                boxShadow: '0 2px 8px rgba(231, 76, 60, 0.3)',
                              }}
                              aria-label={`${unreadCount} new notifications`}
                            >
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                          <span className="main-top-nav__icon-label">{item.label}</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {showProfileMenu ? (
              <div className="main-top-nav__profile" ref={profileMenuRef}>
                <button
                  type="button"
                  className={`main-top-nav__profile-trigger${isProfileMenuOpen ? ' is-open' : ''}`}
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  aria-label="Open profile menu"
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  <span className="main-top-nav__profile-avatar" aria-hidden>
                    {showProfilePhoto ? (
                      <img
                        src={profilePhotoUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() => setProfileAvatarFailed(true)}
                      />
                    ) : (
                      profileInitial
                    )}
                  </span>
                  <KeyboardArrowDownRoundedIcon className="main-top-nav__profile-caret" />
                </button>
                {isProfileMenuOpen ? (
                  <div className="main-top-nav__profile-menu" role="menu">
                    <div className="main-top-nav__profile-summary">
                      <span className="main-top-nav__profile-summary-avatar" aria-hidden>
                        {showProfilePhoto ? (
                          <img
                            src={profilePhotoUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            onError={() => setProfileAvatarFailed(true)}
                          />
                        ) : (
                          profileInitial
                        )}
                      </span>
                      <div className="main-top-nav__profile-summary-text">
                        <strong>{profileName || 'Student'}</strong>
                        <span>{profileEmail || roleLabel}</span>
                        {profileEmail ? <small>{roleLabel}</small> : null}
                      </div>
                    </div>
                    <div className="main-top-nav__profile-list">
                      {PROFILE_MENU_ITEMS.map((item) => (
                        <button
                          key={item.route}
                          type="button"
                          className="main-top-nav__profile-item"
                          onClick={() => handleProfileMenuNavigate(item.route)}
                          role="menuitem"
                        >
                          <span className="main-top-nav__profile-item-icon" aria-hidden>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="main-top-nav__profile-item main-top-nav__profile-item--danger"
                      onClick={handleProfileSignOut}
                      role="menuitem"
                    >
                      <span className="main-top-nav__profile-item-icon" aria-hidden>
                        <LogoutRoundedIcon />
                      </span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
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

export default memo(MainBottomNav);

MainBottomNav.displayName = 'MainBottomNav';
