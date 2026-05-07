/**
 * Testing utilities and helpers for unit, integration, and E2E tests
 * Usage with Jest and React Testing Library
 */

import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import { AuthProvider } from '../state/auth.jsx';

/**
 * Render component with all necessary providers
 */
export function renderWithProviders(component, options = {}) {
  return render(
    <AuthProvider>
      <HeroUIProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </HeroUIProvider>
    </AuthProvider>,
    options,
  );
}

/**
 * Mock API response
 */
export function mockAPIResponse(data, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

/**
 * Mock API error
 */
export function mockAPIError(error, delay = 0) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(error)), delay);
  });
}

/**
 * Create mock notification
 */
export function createMockNotification(overrides = {}) {
  return {
    id: `notif-${Math.random()}`,
    title: 'Test Notification',
    message: 'This is a test notification',
    isRead: false,
    icon: '/assets/notifications/Circle.svg',
    created: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock notifications array
 */
export function createMockNotifications(count = 5) {
  return Array.from({ length: count }, (_, i) => 
    createMockNotification({
      id: `notif-${i}`,
      title: `Notification ${i + 1}`,
      isRead: i % 2 === 0,
    }),
  );
}

/**
 * Wait for async operations in tests
 */
export function waitFor(callback, options = {}) {
  const { timeout = 3000, interval = 50 } = options;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      try {
        callback();
        resolve();
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error);
        } else {
          setTimeout(check, interval);
        }
      }
    };
    check();
  });
}

/**
 * Mock local storage
 */
export function mockLocalStorage() {
  const store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
}

/**
 * Performance measurement helper
 */
export class PerformanceMonitor {
  constructor() {
    this.measurements = {};
  }

  start(label) {
    this.measurements[label] = performance.now();
  }

  end(label) {
    if (!this.measurements[label]) {
      console.warn(`No start measurement for ${label}`);
      return null;
    }
    const duration = performance.now() - this.measurements[label];
    delete this.measurements[label];
    return duration;
  }

  measure(label, fn) {
    this.start(label);
    const result = fn();
    const duration = this.end(label);
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    return { result, duration };
  }
}

/**
 * Test data generators
 */
export const testDataGenerators = {
  user: () => ({
    id: `user-${Math.random()}`,
    email: `test${Math.random()}@example.com`,
    name: 'Test User',
    role: 'user',
  }),

  course: () => ({
    id: `course-${Math.random()}`,
    title: 'Test Course',
    description: 'A test course',
    instructor: 'Test Instructor',
    price: 99.99,
  }),

  notification: createMockNotification,
};

/**
 * Common test assertions
 */
export const testAssertions = {
  isValidNotification: (notif) => {
    return (
      notif.id &&
      notif.title &&
      notif.message &&
      typeof notif.isRead === 'boolean' &&
      notif.created
    );
  },

  isValidUser: (user) => {
    return (
      user.id &&
      user.email &&
      user.name &&
      user.role
    );
  },

  isValidCourse: (course) => {
    return (
      course.id &&
      course.title &&
      course.description &&
      course.instructor &&
      typeof course.price === 'number'
    );
  },
};
