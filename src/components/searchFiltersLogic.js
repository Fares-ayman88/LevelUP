import { SEARCH_FILTER_SECTIONS, createSearchFilterState } from './searchFiltersData.js';

const FILTER_QUERY_PREFIX = 'filter_';

function normalizeLabel(value) {
  return `${value || ''}`.trim().toLowerCase();
}

function cloneFilters(filters) {
  return SEARCH_FILTER_SECTIONS.reduce((state, section) => {
    const selected = Array.isArray(filters?.[section.id]) ? filters[section.id] : [];
    state[section.id] = [...selected];
    return state;
  }, {});
}

function findSection(sectionId) {
  return SEARCH_FILTER_SECTIONS.find((section) => section.id === sectionId) || null;
}

function parseNumericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((item) => `${item || ''}`.trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function resolveCoursePriceType(course) {
  const amount = parseNumericValue(course?.price);
  if (amount === null) return null;
  return amount <= 0 ? 'free' : 'paid';
}

function resolveCourseRating(course) {
  return parseNumericValue(course?.rating);
}

function resolveCourseHours(course) {
  if (typeof course?.hours === 'number' && Number.isFinite(course.hours)) return course.hours;
  return parseNumericValue(course?.hours);
}

function resolveCourseLevel(course) {
  const level = normalizeLabel(course?.level);
  return level || null;
}

function resolveCourseFeatures(course) {
  const features = normalizeArray(course?.features).map((item) => normalizeLabel(item));
  return new Set(features);
}

function matchesSelectedCategories(course, selected) {
  if (!selected.length) return true;
  const category = normalizeLabel(course?.category);
  return selected.some((item) => normalizeLabel(item) === category);
}

function matchesSelectedPrices(course, selected) {
  if (!selected.length) return true;
  const priceType = resolveCoursePriceType(course);
  if (!priceType) return false;
  return selected.some((item) => normalizeLabel(item) === priceType);
}

function matchesSelectedRatings(course, selected) {
  if (!selected.length) return true;
  const rating = resolveCourseRating(course);
  if (rating === null) return false;
  const thresholds = selected
    .map((item) => parseNumericValue(item))
    .filter((value) => value !== null);
  if (!thresholds.length) return true;
  return rating >= Math.min(...thresholds);
}

function matchesSelectedDurations(course, selected) {
  if (!selected.length) return true;
  const hours = resolveCourseHours(course);
  if (hours === null) return false;

  return selected.some((item) => {
    const normalized = normalizeLabel(item);
    if (normalized === '0-2 hours') return hours >= 0 && hours <= 2;
    if (normalized === '3-6 hours') return hours >= 3 && hours <= 6;
    if (normalized === '7-16 hours') return hours >= 7 && hours <= 16;
    if (normalized === '17+ hours') return hours >= 17;
    return true;
  });
}

function matchesSelectedLevels(course, selected) {
  if (!selected.length) return true;
  if (selected.some((item) => normalizeLabel(item) === 'all levels')) return true;
  const level = resolveCourseLevel(course);
  if (!level) return false;
  return selected.some((item) => normalizeLabel(item) === level);
}

function matchesSelectedFeatures(course, selected) {
  if (!selected.length) return true;
  const features = resolveCourseFeatures(course);
  if (!features.size) return false;
  return selected.every((item) => features.has(normalizeLabel(item)));
}

function shouldApplySection(sectionId, filters, availability) {
  const selected = filters?.[sectionId] || [];
  if (!selected.length) return false;
  const availableOptions = availability?.[sectionId];
  if (!availableOptions) return true;
  return availableOptions.size > 0;
}

export function normalizeSearchFilters(filters) {
  const base = createSearchFilterState();
  for (const section of SEARCH_FILTER_SECTIONS) {
    const source = Array.isArray(filters?.[section.id]) ? filters[section.id] : [];
    const allowed = new Set(section.options.map((option) => normalizeLabel(option)));
    base[section.id] = source
      .map((item) => `${item || ''}`.trim())
      .filter((item) => allowed.has(normalizeLabel(item)));
  }
  return base;
}

export function filtersToSearchParams(filters, query = '') {
  const params = new URLSearchParams();
  const trimmedQuery = `${query || ''}`.trim();
  if (trimmedQuery) params.set('q', trimmedQuery);

  const normalized = normalizeSearchFilters(filters);
  for (const section of SEARCH_FILTER_SECTIONS) {
    const selected = normalized[section.id];
    if (!selected.length) continue;
    params.set(`${FILTER_QUERY_PREFIX}${section.id}`, selected.join('|'));
  }

  return params;
}

export function searchParamsToFilters(searchParams) {
  const filters = createSearchFilterState();
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams || '');

  for (const section of SEARCH_FILTER_SECTIONS) {
    const raw = params.get(`${FILTER_QUERY_PREFIX}${section.id}`) || '';
    const optionsByKey = new Map(section.options.map((option) => [normalizeLabel(option), option]));
    filters[section.id] = raw
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => optionsByKey.get(normalizeLabel(item)) || null)
      .filter(Boolean);
  }

  return filters;
}

export function getSearchFilterAvailability(courses = []) {
  const categories = new Set();
  const prices = new Set();
  let hasRatings = false;
  let hasDurations = false;
  const levels = new Set();
  const features = new Set();

  for (const course of courses) {
    const category = `${course?.category || ''}`.trim();
    if (category) categories.add(category);

    const priceType = resolveCoursePriceType(course);
    if (priceType === 'free') prices.add('Free');
    if (priceType === 'paid') prices.add('Paid');

    if (resolveCourseRating(course) !== null) hasRatings = true;
    if (resolveCourseHours(course) !== null) hasDurations = true;

    const level = `${course?.level || ''}`.trim();
    if (level) levels.add(level);

    for (const feature of normalizeArray(course?.features)) {
      features.add(feature);
    }
  }

  return {
    subCategories: new Set(SEARCH_FILTER_SECTIONS.find((section) => section.id === 'subCategories')?.options.filter((option) => categories.has(option)) || []),
    prices,
    ratings: hasRatings
      ? new Set(SEARCH_FILTER_SECTIONS.find((section) => section.id === 'ratings')?.options || [])
      : new Set(),
    durations: hasDurations
      ? new Set(SEARCH_FILTER_SECTIONS.find((section) => section.id === 'durations')?.options || [])
      : new Set(),
    levels: new Set(SEARCH_FILTER_SECTIONS.find((section) => section.id === 'levels')?.options.filter((option) => levels.has(option)) || []),
    features: new Set(SEARCH_FILTER_SECTIONS.find((section) => section.id === 'features')?.options.filter((option) => features.has(option)) || []),
  };
}

export function applyCourseFilters(courses = [], filters, availability = null) {
  const normalizedFilters = normalizeSearchFilters(filters);

  return courses.filter((course) => {
    if (
      shouldApplySection('subCategories', normalizedFilters, availability) &&
      !matchesSelectedCategories(course, normalizedFilters.subCategories)
    ) {
      return false;
    }

    if (
      shouldApplySection('prices', normalizedFilters, availability) &&
      !matchesSelectedPrices(course, normalizedFilters.prices)
    ) {
      return false;
    }

    if (
      shouldApplySection('ratings', normalizedFilters, availability) &&
      !matchesSelectedRatings(course, normalizedFilters.ratings)
    ) {
      return false;
    }

    if (
      shouldApplySection('durations', normalizedFilters, availability) &&
      !matchesSelectedDurations(course, normalizedFilters.durations)
    ) {
      return false;
    }

    if (
      shouldApplySection('levels', normalizedFilters, availability) &&
      !matchesSelectedLevels(course, normalizedFilters.levels)
    ) {
      return false;
    }

    if (
      shouldApplySection('features', normalizedFilters, availability) &&
      !matchesSelectedFeatures(course, normalizedFilters.features)
    ) {
      return false;
    }

    return true;
  });
}

export function areSearchFiltersEqual(left, right) {
  const a = normalizeSearchFilters(left);
  const b = normalizeSearchFilters(right);

  return SEARCH_FILTER_SECTIONS.every((section) => {
    const leftValues = a[section.id];
    const rightValues = b[section.id];
    if (leftValues.length !== rightValues.length) return false;
    return leftValues.every((value, index) => value === rightValues[index]);
  });
}

export function getSearchFilterSectionAvailability(availability, sectionId) {
  return availability?.[sectionId] || null;
}

export function getSearchFilterSection(sectionId) {
  return findSection(sectionId);
}

export function copySearchFilters(filters) {
  return cloneFilters(normalizeSearchFilters(filters));
}
