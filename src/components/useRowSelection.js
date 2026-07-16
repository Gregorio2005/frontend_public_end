import { useState, useCallback, useRef } from 'react';

const useRowSelection = (data = [], getRowId = (row) => row.id || row.user_id) => {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const lastClickedIndex = useRef(null);

  const getRowIndex = useCallback((id) => {
    return data.findIndex(row => String(getRowId(row)) === String(id));
  }, [data, getRowId]);

  const handleRowSelect = useCallback((row, shiftKey, ctrlKey) => {
    const id = String(getRowId(row));
    const index = getRowIndex(id);

    setSelectedRows(prev => {
      const next = new Set(prev);

      if (shiftKey && lastClickedIndex.current !== null) {
        const start = Math.min(lastClickedIndex.current, index);
        const end = Math.max(lastClickedIndex.current, index);
        for (let i = start; i <= end; i++) {
          next.add(String(getRowId(data[i])));
        }
      } else if (ctrlKey) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      } else {
        if (next.has(id) && next.size === 1) {
          next.clear();
        } else {
          next.clear();
          next.add(id);
        }
      }

      return next;
    });

    if (!shiftKey) {
      lastClickedIndex.current = index;
    }
  }, [data, getRowId, getRowIndex]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
    lastClickedIndex.current = null;
  }, []);

  const selectAll = useCallback(() => {
    setSelectedRows(new Set(data.map(row => String(getRowId(row)))));
  }, [data, getRowId]);

  const isSelected = useCallback((row) => {
    return selectedRows.has(String(getRowId(row)));
  }, [selectedRows, getRowId]);

  return {
    selectedRows,
    selectedCount: selectedRows.size,
    handleRowSelect,
    clearSelection,
    selectAll,
    isSelected,
    setSelectedRows
  };
};

export default useRowSelection;
