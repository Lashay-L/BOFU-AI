import React, { useState, useEffect } from 'react';
import { MediaFilters } from '../../lib/storage';
import { 
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CalendarIcon,
  TagIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

interface MediaFiltersBarProps {
  filters: MediaFilters;
  onFiltersChange: (filters: MediaFilters) => void;
  onClose: () => void;
}

export default function MediaFiltersBar({
  filters,
  onFiltersChange,
  onClose
}: MediaFiltersBarProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedFileType, setSelectedFileType] = useState(filters.fileType || 'all');
  const [selectedDateRange, setSelectedDateRange] = useState(filters.dateRange || 'all');
  const [tagFilter, setTagFilter] = useState(filters.tags?.join(', ') || '');
  const [sortBy, setSortBy] = useState(filters.sortBy || 'upload_date');
  const [sortOrder, setSortOrder] = useState(filters.sortOrder || 'desc');

  // Apply filters with debounce for search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newFilters: MediaFilters = {
        search: searchTerm || undefined,
        fileType: selectedFileType === 'all' ? undefined : selectedFileType as any,
        dateRange: selectedDateRange === 'all' ? undefined : selectedDateRange as any,
        tags: tagFilter.trim() ? tagFilter.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      };

      // Remove undefined values
      Object.keys(newFilters).forEach(key => {
        if ((newFilters as any)[key] === undefined) {
          delete (newFilters as any)[key];
        }
      });

      onFiltersChange(newFilters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedFileType, selectedDateRange, tagFilter, sortBy, sortOrder, onFiltersChange]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedFileType('all');
    setSelectedDateRange('all');
    setTagFilter('');
    setSortBy('upload_date');
    setSortOrder('desc');
    onFiltersChange({});
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || 
    selectedFileType !== 'all' || 
    selectedDateRange !== 'all' || 
    tagFilter || 
    sortBy !== 'upload_date' || 
    sortOrder !== 'desc';

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-white">Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
              Active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by filename, title, or description..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                         text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 
                         focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* File Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            File Type
          </label>
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                       text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                       transition-colors"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="gif">GIFs</option>
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload Date
          </label>
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                       text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                       transition-colors"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tags
          </label>
          <div className="relative">
            <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                         text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 
                         focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                       text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                       transition-colors"
          >
            <option value="upload_date">Upload Date</option>
            <option value="original_filename">Filename</option>
            <option value="title">Title</option>
            <option value="file_size">File Size</option>
            <option value="file_type">File Type</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Order
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                       text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                       transition-colors"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
        <span className="text-sm text-gray-400 self-center">Quick filters:</span>
        
        <button
          onClick={() => {
            setSelectedFileType('image');
            setSelectedDateRange('all');
          }}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs transition-colors ${
            selectedFileType === 'image' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <PhotoIcon className="h-3 w-3" />
          <span>Images</span>
        </button>

        <button
          onClick={() => {
            setSelectedFileType('video');
            setSelectedDateRange('all');
          }}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs transition-colors ${
            selectedFileType === 'video' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <VideoCameraIcon className="h-3 w-3" />
          <span>Videos</span>
        </button>

        <button
          onClick={() => {
            setSelectedFileType('all');
            setSelectedDateRange('week');
          }}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs transition-colors ${
            selectedDateRange === 'week' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <CalendarIcon className="h-3 w-3" />
          <span>This Week</span>
        </button>

        <button
          onClick={() => {
            setSelectedFileType('all');
            setSelectedDateRange('month');
          }}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs transition-colors ${
            selectedDateRange === 'month' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <CalendarIcon className="h-3 w-3" />
          <span>This Month</span>
        </button>

        <button
          onClick={() => {
            setSortBy('file_size');
            setSortOrder('desc');
          }}
          className={`px-3 py-1 rounded-full text-xs transition-colors ${
            sortBy === 'file_size' && sortOrder === 'desc'
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Largest First
        </button>

        <button
          onClick={() => {
            setSortBy('original_filename');
            setSortOrder('asc');
          }}
          className={`px-3 py-1 rounded-full text-xs transition-colors ${
            sortBy === 'original_filename' && sortOrder === 'asc'
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          A-Z
        </button>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-400">Active filters:</span>
            
            {searchTerm && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedFileType !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                Type: {selectedFileType}
                <button
                  onClick={() => setSelectedFileType('all')}
                  className="ml-1 hover:bg-green-700 rounded-full p-0.5"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedDateRange !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                Date: {selectedDateRange}
                <button
                  onClick={() => setSelectedDateRange('all')}
                  className="ml-1 hover:bg-purple-700 rounded-full p-0.5"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {tagFilter && (
              <span className="inline-flex items-center px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                Tags: {tagFilter}
                <button
                  onClick={() => setTagFilter('')}
                  className="ml-1 hover:bg-yellow-700 rounded-full p-0.5"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 