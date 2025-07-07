import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Building2, BookOpen, CheckCircle } from 'lucide-react';
import { CompanyGroupsListProps } from './types';

export function CompanyGroupsList({
  companyGroups,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  onCompanySelect,
  approvedProducts
}: CompanyGroupsListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Search and Filter Controls */}
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company name, email, or profile name..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'company' | 'email' | 'date')}
              className="px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            >
              <option value="company">Sort by Company</option>
              <option value="email">Sort by Email</option>
              <option value="date">Sort by Join Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Company Groups Display */}
      <div className="space-y-6">
        {companyGroups.map((company) => {
          const totalCompanyBriefs = company.main_account.briefCount || 0;
          const companyApprovedProducts = approvedProducts.filter(p => p.company_name === company.company_name);
          const hasAnyContent = totalCompanyBriefs > 0 || companyApprovedProducts.length > 0;
          
          return (
            <motion.div
              key={company.company_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onCompanySelect(company.main_account)}
              className={`bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden cursor-pointer hover:bg-gray-800/50 transition-colors duration-200 ${
                !hasAnyContent ? 'opacity-75' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Building2 className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{company.company_name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-400">
                          {company.total_users} user{company.total_users !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-green-300 font-medium">
                            {totalCompanyBriefs} Content Brief{totalCompanyBriefs !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-green-300 font-medium">
                            {companyApprovedProducts.length} Approved Product{companyApprovedProducts.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasAnyContent ? (
                      <div className="flex items-center space-x-2 text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-sm font-medium">Has Content</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-gray-500">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span className="text-sm font-medium">No Content</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {companyGroups.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">
            {searchTerm ? 'No companies found matching your search' : 'No registered companies found'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            All registered companies will appear here regardless of content
          </p>
        </div>
      )}
    </motion.div>
  );
}