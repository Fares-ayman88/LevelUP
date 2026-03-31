export const SEARCH_FILTER_SECTIONS = [
  {
    id: 'subCategories',
    title: 'Subcategories',
    description: 'Focus on the topics you want to explore first.',
    options: ['3D Design', 'Web Development', '3D Animation', 'Graphic Design', 'SEO & Marketing', 'Arts & Humanities'],
    defaultSelected: [],
  },
  {
    id: 'levels',
    title: 'Levels',
    description: 'Pick the learning depth that fits your experience.',
    options: ['All Levels', 'Beginners', 'Intermediate', 'Expert'],
    defaultSelected: [],
  },
  {
    id: 'prices',
    title: 'Price',
    description: 'Switch between premium and free course picks.',
    options: ['Paid', 'Free'],
    defaultSelected: [],
  },
  {
    id: 'features',
    title: 'Features',
    description: 'Look for course extras that help you learn faster.',
    options: ['All Caption', 'Quizzes', 'Coding Exercise', 'Practice Tests'],
    defaultSelected: [],
  },
  {
    id: 'ratings',
    title: 'Rating',
    description: 'Surface the strongest student-reviewed options.',
    options: ['4.5 & Up Above', '4.0 & Up Above', '3.5 & Up Above', '3.0 & Up Above'],
    defaultSelected: [],
  },
  {
    id: 'durations',
    title: 'Video Durations',
    description: 'Choose a course length that matches your schedule.',
    options: ['0-2 Hours', '3-6 Hours', '7-16 Hours', '17+ Hours'],
    defaultSelected: [],
  },
];

export function createSearchFilterState() {
  return SEARCH_FILTER_SECTIONS.reduce((state, section) => {
    state[section.id] = [...section.defaultSelected];
    return state;
  }, {});
}

export function clearSearchFilterState() {
  return SEARCH_FILTER_SECTIONS.reduce((state, section) => {
    state[section.id] = [];
    return state;
  }, {});
}

export function toggleSearchFilterOption(filters, sectionId, option) {
  const selected = filters[sectionId] || [];
  const nextSelected = selected.includes(option)
    ? selected.filter((item) => item !== option)
    : [...selected, option];

  return {
    ...filters,
    [sectionId]: nextSelected,
  };
}

export function countSelectedSearchFilters(filters) {
  return SEARCH_FILTER_SECTIONS.reduce((total, section) => total + ((filters[section.id] || []).length), 0);
}
