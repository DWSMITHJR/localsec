// src/components/common/DataTable.jsx
import React, { useState, useMemo } from 'react';

export const DataTable = ({ data, columns, searchable = false, sortable = false, className = '' }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className={`data-table ${className}`}>
      {searchable && (
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search table..."
        />
      )}
      <table className="table">
        <thead>
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
                className={sortable && column.sortable !== false ? 'sortable' : ''}
              >
                {column.label}
                {sortConfig.key === column.key && (
                  <span className={`sort-indicator ${sortConfig.direction}`} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr key={index}>
              {columns.map(column => (
                <td key={column.key}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sortedData.length === 0 && (
        <div className="table-empty">No data available</div>
      )}
    </div>
  );
};

export const Pagination = ({ currentPage, totalPages, onPageChange, className = '' }) => (
  <div className={`pagination ${className}`}>
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className="pagination-btn"
    >
      Previous
    </button>
    <span className="pagination-info">
      Page {currentPage} of {totalPages}
    </span>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      className="pagination-btn"
    >
      Next
    </button>
  </div>
);

export const FilterPanel = ({ filters, onFilterChange, className = '' }) => (
  <div className={`filter-panel ${className}`}>
    {filters.map(filter => (
      <div key={filter.key} className="filter-item">
        <label>{filter.label}</label>
        {filter.type === 'select' ? (
          <Select
            value={filter.value}
            onChange={(e) => onFilterChange(filter.key, e.target.value)}
            options={filter.options}
          />
        ) : (
          <input
            type={filter.type || 'text'}
            value={filter.value}
            onChange={(e) => onFilterChange(filter.key, e.target.value)}
          />
        )}
      </div>
    ))}
  </div>
);
