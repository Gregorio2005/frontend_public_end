import { useState, useRef, useEffect } from 'react';
import useRowSelection from './useRowSelection';

const SortIcon = ({ direction, isActive }) => {
  if (!isActive) return <span className="material-symbols-outlined dt-sort-icon">unfold_more</span>;
  if (direction === 'asc') return <span className="material-symbols-outlined dt-sort-icon active">arrow_upward</span>;
  return <span className="material-symbols-outlined dt-sort-icon active">arrow_downward</span>;
};

const SelectFilter = ({ columnKey, label, options, selectedValues, onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    const next = new Set(selectedValues);
    if (next.has(value)) next.delete(value); else next.add(value);
    onFilterChange(columnKey, next);
  };

  const isActive = selectedValues.size > 0;

  return (
    <div className="dt-filter-dropdown" ref={ref}>
      <button
        className={`dt-filter-trigger ${isActive ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        title={`Filtrar por ${label}`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_list</span>
        {isActive && <span className="dt-filter-badge">{selectedValues.size}</span>}
      </button>
      {isOpen && (
        <div className="dt-filter-menu" onClick={(e) => e.stopPropagation()}>
          <div className="dt-filter-actions-row">
            <button className="dt-filter-action" onClick={() => onFilterChange(columnKey, new Set(options.map(o => o.value)))}>Todo</button>
            <button className="dt-filter-action" onClick={() => onFilterChange(columnKey, new Set())}>Limpiar</button>
          </div>
          <div className="dt-filter-options">
            {options.map(opt => (
              <label key={opt.value} className="dt-filter-option">
                <input
                  type="checkbox"
                  checked={selectedValues.has(opt.value)}
                  onChange={() => toggleOption(opt.value)}
                />
                <span className="dt-filter-option-label">{opt.label}</span>
                {opt.count !== undefined && <span className="dt-filter-option-count">{opt.count}</span>}
              </label>
            ))}
            {options.length === 0 && <p className="dt-filter-empty">Sin opciones disponibles</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const DataTable = ({
  columns = [],
  data = [],
  searchPlaceholder = 'Buscar...',
  onRowClick,
  rowClassName,
  getRowId = (row) => row.id || row.user_id,
  emptyMessage = 'No hay datos disponibles.',
  selectable = true,
  enableSearch = true,
  onSortChange,
  onFilterChange,
  onSearchChange,
  sortConfig: externalSortConfig,
  globalSearch: externalGlobalSearch,
  columnFilters: externalColumnFilters
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalSort, setInternalSort] = useState(null);
  const [internalFilters, setInternalFilters] = useState({});

  const isServerSide = !!onSortChange || !!onFilterChange || !!onSearchChange;

  const globalSearch = isServerSide ? (externalGlobalSearch ?? '') : internalSearch;
  const sortConfig = isServerSide ? (externalSortConfig ?? null) : internalSort;
  const columnFilters = isServerSide ? (externalColumnFilters ?? {}) : internalFilters;

  const setGlobalSearch = (val) => {
    if (isServerSide) onSearchChange?.(val);
    else setInternalSearch(val);
  };

  const toggleSort = (colKey) => {
    if (isServerSide) {
      const next = sortConfig?.column === colKey
        ? (sortConfig.direction === 'asc' ? { column: colKey, direction: 'desc' } : null)
        : { column: colKey, direction: 'asc' };
      onSortChange?.(next);
    } else {
      setInternalSort(prev => {
        if (prev && prev.column === colKey) {
          if (prev.direction === 'asc') return { column: colKey, direction: 'desc' };
          return null;
        }
        return { column: colKey, direction: 'asc' };
      });
    }
  };

  const handleFilterChange = (colKey, newSet) => {
    if (isServerSide) {
      const next = { ...columnFilters, [colKey]: newSet };
      onFilterChange?.(next);
    } else {
      setInternalFilters(prev => ({ ...prev, [colKey]: newSet }));
    }
  };

  const getUniqueValues = (colKey, transform) => {
    const counts = {};
    data.forEach(row => {
      const raw = row[colKey];
      const val = raw !== undefined && raw !== null ? String(raw) : '';
      const label = transform ? transform(val) : val;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value || '(vacío)', count }));
  };

  const { selectedCount, handleRowSelect, clearSelection, selectAll, isSelected } = useRowSelection(data, getRowId);

  const activeFilterCount = Object.values(columnFilters).filter(s => s?.size > 0).length +
    (sortConfig ? 1 : 0);

  const handleSearchInputChange = (e) => {
    setGlobalSearch(e.target.value);
  };

  return (
    <div className="dt-container">
      {(selectable && selectedCount > 0) && (
        <div className="dt-selection-bar">
          <span className="dt-selection-count">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
            {selectedCount} fila{selectedCount !== 1 ? 's' : ''} seleccionada{selectedCount !== 1 ? 's' : ''}
          </span>
          <button className="dt-selection-clear" onClick={clearSelection}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
            Limpiar selección
          </button>
        </div>
      )}

      {enableSearch && (
        <div className="dt-search-bar">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            className="dt-search-input"
            placeholder={searchPlaceholder}
            value={globalSearch}
            onChange={handleSearchInputChange}
          />
          {globalSearch && (
            <button className="dt-search-clear" onClick={() => setGlobalSearch('')}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          )}
        </div>
      )}

      <div className="dt-scroll-wrapper">
        <table className="industrial-table">
          <thead>
            <tr>
              {selectable && (
                <th className="dt-th-checkbox">
                  <input type="checkbox" onChange={(e) => e.target.checked ? selectAll() : clearSelection()} />
                </th>
              )}
              {columns.filter(c => !c.hideOnEmpty).map(col => {
                const isSort = col.filterType === 'sort';
                const isActive = isSort && sortConfig?.column === col.key;
                return (
                  <th key={col.key}>
                    <div className="dt-th-content">
                      <span>{col.label}</span>
                      {col.filterable !== false && isSort && (
                        <button
                          className={`dt-sort-trigger ${isActive ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleSort(col.key); }}
                          title={isActive ? (sortConfig.direction === 'asc' ? 'Orden ascendente (clic para descendente)' : 'Orden descendente (clic para quitar)') : 'Clic para ordenar A→Z'}
                        >
                          <SortIcon direction={sortConfig?.direction} isActive={isActive} />
                        </button>
                      )}
                      {col.filterable !== false && col.filterType === 'select' && (
                        <SelectFilter
                          columnKey={col.key}
                          label={col.label}
                          options={col.filterOptions || getUniqueValues(col.key, col.filterTransform)}
                          selectedValues={columnFilters[col.key] || new Set()}
                          onFilterChange={handleFilterChange}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map((row) => {
              const id = getRowId(row);
              const selected = isSelected(row);
              return (
                <tr
                  key={id}
                  className={[
                    rowClassName?.(row) || '',
                    onRowClick ? 'dt-row-clickable' : '',
                    selected ? 'dt-row-selected' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={(e) => {
                    if (onRowClick) onRowClick(row);
                    if (selectable) handleRowSelect(row, e.shiftKey, e.ctrlKey || e.metaKey);
                  }}
                >
                  {selectable && (
                    <td className="dt-td-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRowSelect(row, e.shiftKey, e.ctrlKey || e.metaKey);
                        }}
                      />
                    </td>
                  )}
                  {columns.filter(c => !c.hideOnEmpty).map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={columns.filter(c => !c.hideOnEmpty).length + (selectable ? 1 : 0)} className="dt-empty">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeFilterCount > 0 && (
        <div className="dt-active-filters-bar">
          <span className="dt-active-filters-label">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>filter_alt</span>
            Filtros activos:
          </span>
          {sortConfig && (
            <span className="dt-active-filter-chip">
              {columns.find(c => c.key === sortConfig.column)?.label}: {sortConfig.direction === 'asc' ? '↑ A-Z' : '↓ Z-A'}
              <button onClick={() => toggleSort(sortConfig.column)}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            </span>
          )}
          {Object.entries(columnFilters).map(([key, set]) => {
            if (!set || set.size === 0) return null;
            const col = columns.find(c => c.key === key);
            return Array.from(set).map(val => (
              <span key={`${key}-${val}`} className="dt-active-filter-chip">
                {col?.label}: {val}
                <button onClick={() => {
                  const next = new Set(set);
                  next.delete(val);
                  handleFilterChange(key, next);
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                </button>
              </span>
            ));
          })}
          <button className="dt-clear-all-filters" onClick={() => {
            if (isServerSide) {
              onSortChange?.(null);
              onFilterChange?.({});
              onSearchChange?.('');
            } else {
              setInternalFilters({});
              setInternalSort(null);
              setInternalSearch('');
            }
          }}>
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
};

export default DataTable;
