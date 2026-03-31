import { useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@heroui/react';

import SearchFiltersPanel from './SearchFiltersPanel.jsx';
import {
  areSearchFiltersEqual,
  copySearchFilters,
} from './searchFiltersLogic.js';
import { countSelectedSearchFilters, createSearchFilterState } from './searchFiltersData.js';

export default function SearchFilterPopover({
  triggerClassName = '',
  placement = 'bottom-end',
  applyLabel = 'Apply filters',
  onApply,
  value,
  availability = null,
}) {
  const isControlled = value !== undefined;
  const [internalFilters, setInternalFilters] = useState(() => createSearchFilterState());
  const [isOpen, setIsOpen] = useState(false);
  const appliedFilters = useMemo(
    () => copySearchFilters(isControlled ? value : internalFilters),
    [internalFilters, isControlled, value],
  );
  const [draftFilters, setDraftFilters] = useState(() => copySearchFilters(appliedFilters));
  const selectedCount = useMemo(() => countSelectedSearchFilters(appliedFilters), [appliedFilters]);

  useEffect(() => {
    if (isOpen) {
      setDraftFilters(copySearchFilters(appliedFilters));
    }
  }, [appliedFilters, isOpen]);

  useEffect(() => {
    if (!isOpen && !areSearchFiltersEqual(draftFilters, appliedFilters)) {
      setDraftFilters(copySearchFilters(appliedFilters));
    }
  }, [appliedFilters, draftFilters, isOpen]);

  const handleApply = (nextFilters) => {
    if (!isControlled) {
      setInternalFilters(copySearchFilters(nextFilters));
    }
    onApply?.(nextFilters);
    setIsOpen(false);
  };

  return (
    <Popover
      placement={placement}
      offset={12}
      showArrow
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger className="search-filters-trigger__slot">
        <button
          type="button"
          className={`search-filters-trigger ${triggerClassName}${selectedCount ? ' has-selection' : ''}`.trim()}
          aria-label={
            selectedCount > 0
              ? `Open filters, ${selectedCount} selected`
              : 'Open filters'
          }
          aria-haspopup="dialog"
        >
          <span className="material-icons-round" aria-hidden>
            tune
          </span>
          {selectedCount > 0 ? (
            <span className="search-filters-trigger__badge">{selectedCount}</span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="search-filters-popover__content">
        <SearchFiltersPanel
          value={draftFilters}
          onChange={setDraftFilters}
          onApply={handleApply}
          applyLabel={applyLabel}
          availability={availability}
        />
      </PopoverContent>
    </Popover>
  );
}
