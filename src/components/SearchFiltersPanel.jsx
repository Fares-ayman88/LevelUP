import { useMemo } from 'react';

import {
  SEARCH_FILTER_SECTIONS,
  clearSearchFilterState,
  countSelectedSearchFilters,
  toggleSearchFilterOption,
} from './searchFiltersData.js';
import './SearchFilterPopover.css';

export default function SearchFiltersPanel({
  value,
  onChange,
  onApply,
  applyLabel = 'Apply filters',
  className = '',
  availability = null,
}) {
  const selectedCount = useMemo(() => countSelectedSearchFilters(value), [value]);

  const handleToggle = (sectionId, option) => {
    onChange(toggleSearchFilterOption(value, sectionId, option));
  };

  const handleClear = () => {
    onChange(clearSearchFilterState());
  };

  return (
    <div className={`search-filters-panel ${className}`.trim()}>
      <div className="search-filters-panel__header">
        <div className="search-filters-panel__copy">
          <span className="search-filters-panel__eyebrow">Course filters</span>
          <h3>Refine your results</h3>
          <p>Keep the search focused without leaving the page.</p>
        </div>
        <button
          type="button"
          className="search-filters-panel__clear"
          onClick={handleClear}
          disabled={selectedCount === 0}
        >
          Clear all
        </button>
      </div>

      <div className="search-filters-panel__body">
        {SEARCH_FILTER_SECTIONS.map((section) => {
          const sectionSelections = value[section.id] || [];
          const availableOptions = availability?.[section.id] || null;
          const sectionUnavailable = Boolean(availability) && availableOptions && availableOptions.size === 0;

          return (
            <section key={section.id} className="search-filters-panel__group">
              <div className="search-filters-panel__group-head">
                <div>
                  <h4>{section.title}</h4>
                  <p>
                    {sectionUnavailable
                      ? 'This filter becomes active when matching course metadata is available.'
                      : section.description}
                  </p>
                </div>
                <span className="search-filters-panel__group-count">
                  {sectionSelections.length}
                </span>
              </div>

              <div className="search-filters-panel__chips">
                {section.options.map((option) => {
                  const isActive = sectionSelections.includes(option);
                  const isDisabled = Boolean(availableOptions) && !availableOptions.has(option) && !isActive;

                  return (
                    <button
                      key={option}
                      type="button"
                      className={`search-filter-chip${isActive ? ' is-active' : ''}`}
                      onClick={() => handleToggle(section.id, option)}
                      aria-pressed={isActive}
                      disabled={isDisabled}
                    >
                      <span className="material-icons-round search-filter-chip__icon" aria-hidden>
                        {isActive ? 'check' : 'add'}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="search-filters-panel__footer">
        <div className="search-filters-panel__summary">
          <strong>{selectedCount}</strong>
          <span>{selectedCount === 1 ? 'active filter' : 'active filters'}</span>
        </div>
        <button
          type="button"
          className="search-filters-panel__apply"
          onClick={() => onApply?.(value)}
        >
          <span>{applyLabel}</span>
          <span className="material-icons-round" aria-hidden>
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}
