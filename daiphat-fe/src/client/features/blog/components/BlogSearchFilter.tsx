"use client";

import React, { useEffect, useState } from 'react';
import { SortDropdown } from './SortDropdown';

interface BlogSearchFilterProps {
  searchKeyword: string;
  sortLabel: string;
  onSearchSubmit: (keyword: string) => void;
  onSortChange: (label: string) => void;
}

export const BlogSearchFilter: React.FC<BlogSearchFilterProps> = ({
  searchKeyword,
  sortLabel,
  onSearchSubmit,
  onSortChange,
}) => {
  const [searchInput, setSearchInput] = useState(searchKeyword);

  useEffect(() => {
    setSearchInput(searchKeyword);
  }, [searchKeyword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchInput.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
    >
      <div className="relative flex-1 w-full">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm kiếm bài viết..."
          className="client-input focus:outline-none focus:ring-0"
          style={{ paddingLeft: '42px', outline: 'none' }}
        />
        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#919EAB]"></i>
      </div>
      <SortDropdown selectedLabel={sortLabel} onSelect={onSortChange} />
    </form>
  );
};
