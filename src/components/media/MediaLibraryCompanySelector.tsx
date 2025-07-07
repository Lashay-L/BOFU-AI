import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useUnifiedToast } from '../../hooks/useUnifiedToast';
import {
  BuildingOfficeIcon,
  ChevronRightIcon,
  PhotoIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  UsersIcon,
  FolderIcon,
  CloudIcon,
  SparklesIcon,
  EyeIcon,
  DocumentIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  CalendarDaysIcon,
  ClockIcon,
  StarIcon,
  FireIcon,
  TrendingUpIcon,
  TagIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  CommandLineIcon,
  SwatchIcon,
  PaintBrushIcon,
  BeakerIcon,
  LightBulbIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  MegaphoneIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  HeartIcon,
  HandThumbUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BoltIcon,
  SunIcon,
  MoonIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  EllipsisHorizontalIcon,
  Square3Stack3DIcon,
  ListBulletIcon,
  Squares2X2Icon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpRightIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowPathIcon,
  WifiIcon,
  SignalIcon,
  BatteryIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  CameraIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ForwardIcon,
  BackwardIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  CogIcon,
  Cog6ToothIcon,
  WrenchScrewdriverIcon,
  PencilIcon,
  TrashIcon,
  DuplicateIcon,
  ShareIcon,
  DownloadIcon,
  UploadIcon,
  LinkIcon,
  PaperClipIcon,
  BookmarkIcon,
  FlagIcon,
  HashtagIcon,
  AtSymbolIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAmericasIcon,
  HomeIcon,
  IdentificationIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeSlashIcon,
  ShieldExclamationIcon,
  ExclamationCircleIcon,
  CheckBadgeIcon,
  XCircleIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  NoSymbolIcon,
  HandRaisedIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  GiftIcon,
  TrophyIcon,
  AwardIcon,
  RibbonIcon,
  CakeIcon,
  PuzzlePieceIcon,
  CubeIcon,
  CubeTransparentIcon,
  Square2StackIcon,
  RectangleGroupIcon,
  RectangleStackIcon,
  CircleStackIcon,
  QueueListIcon,
  Bars3Icon,
  Bars4Icon,
  Bars2Icon,
  Bars3CenterLeftIcon,
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  EllipsisVerticalIcon,
  ViewColumnsIcon,
  ViewfinderCircleIcon,
  WindowIcon,
  SquaresPlusIcon,
  PresentationChartBarIcon,
  PresentationChartLineIcon,
  ChartPieIcon,
  Variable
} from '@heroicons/react/24/outline';
import {
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  PhotoIcon as PhotoIconSolid,
  StarIcon as StarIconSolid,
  HeartIcon as HeartIconSolid,
  FireIcon as FireIconSolid,
  SparklesIcon as SparklesIconSolid,
  BoltIcon as BoltIconSolid,
  TrophyIcon as TrophyIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  LockClosedIcon as LockClosedIconSolid,
  CloudIcon as CloudIconSolid,
  GlobeAltIcon as GlobeAltIconSolid,
  RocketLaunchIcon as RocketLaunchIconSolid,
  CpuChipIcon as CpuChipIconSolid,
  BeakerIcon as BeakerIconSolid,
  AcademicCapIcon as AcademicCapIconSolid,
  BriefcaseIcon as BriefcaseIconSolid,
  MegaphoneIcon as MegaphoneIconSolid,
  CurrencyDollarIcon as CurrencyDollarIconSolid,
  PaintBrushIcon as PaintBrushIconSolid,
  LightBulbIcon as LightBulbIconSolid,
  CommandLineIcon as CommandLineIconSolid,
  SwatchIcon as SwatchIconSolid
} from '@heroicons/react/24/solid';

interface Company {
  name: string;
  userCount: number;
  hasMedia: boolean;
  mediaCount?: number;
  storageUsed?: number;
  lastActivity?: Date;
  companyType?: 'startup' | 'enterprise' | 'agency' | 'freelancer' | 'nonprofit' | 'education' | 'government' | 'healthcare' | 'finance' | 'tech' | 'creative' | 'retail' | 'manufacturing' | 'consulting' | 'media' | 'gaming' | 'travel' | 'fitness' | 'food' | 'other';
  growth?: number;
  engagement?: number;
  tier?: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
  features?: string[];
  tags?: string[];
  description?: string;
  logo?: string;
  website?: string;
  location?: string;
  industry?: string;
  founded?: number;
  employees?: number;
  revenue?: string;
  funding?: string;
  status?: 'active' | 'inactive' | 'trial' | 'suspended' | 'archived';
  subscription?: {
    plan: string;
    startDate: Date;
    endDate: Date;
    autoRenew: boolean;
    usage: number;
    limit: number;
  };
  analytics?: {
    totalViews: number;
    totalDownloads: number;
    totalUploads: number;
    avgSessionTime: number;
    bounceRate: number;
    conversionRate: number;
  };
}

interface MediaStats {
  totalFiles: number;
  totalSize: number;
  fileTypes: { [key: string]: number };
  uploadTrend: number;
  popularFiles: Array<{
    id: string;
    name: string;
    views: number;
    downloads: number;
    thumbnail?: string;
  }>;
  recentActivity: Array<{
    type: 'upload' | 'download' | 'view' | 'share' | 'delete';
    timestamp: Date;
    user: string;
    file: string;
  }>;
}

type SortBy = 'name' | 'users' | 'media' | 'activity' | 'growth' | 'engagement' | 'tier';
type FilterBy = 'all' | 'active' | 'inactive' | 'trial' | 'enterprise' | 'hasMedia' | 'noMedia';
type ViewMode = 'grid' | 'list' | 'table' | 'analytics';
type CompanyCategory = 'all' | 'startup' | 'enterprise' | 'agency' | 'freelancer' | 'nonprofit' | 'education' | 'government' | 'healthcare' | 'finance' | 'tech' | 'creative' | 'retail' | 'manufacturing' | 'consulting' | 'media' | 'gaming' | 'travel' | 'fitness' | 'food' | 'other';

interface MediaLibraryCompanySelectorProps {
  adminRole: 'super_admin' | 'admin';
  adminId: string;
}

export default function MediaLibraryCompanySelector({ 
  adminRole, 
  adminId 
}: MediaLibraryCompanySelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [categoryFilter, setCategoryFilter] = useState<CompanyCategory>('all');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { showToast } = useUnifiedToast();
  const navigate = useNavigate();

  // Helper function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Helper function to get company icon
  const getCompanyIcon = (companyType?: Company['companyType']) => {
    switch (companyType) {
      case 'startup': return RocketLaunchIconSolid;
      case 'enterprise': return BuildingOfficeIconSolid;
      case 'agency': return MegaphoneIconSolid;
      case 'freelancer': return BriefcaseIconSolid;
      case 'nonprofit': return HeartIconSolid;
      case 'education': return AcademicCapIconSolid;
      case 'government': return ShieldCheckIconSolid;
      case 'healthcare': return HeartIconSolid;
      case 'finance': return CurrencyDollarIconSolid;
      case 'tech': return CpuChipIconSolid;
      case 'creative': return PaintBrushIconSolid;
      case 'gaming': return BeakerIconSolid;
      default: return BuildingOfficeIconSolid;
    }
  };

  // Helper function to get tier color
  const getTierColor = (tier?: Company['tier']) => {
    switch (tier) {
      case 'free': return 'bg-gray-600/50 text-gray-300';
      case 'starter': return 'bg-blue-600/50 text-blue-300';
      case 'professional': return 'bg-purple-600/50 text-purple-300';
      case 'enterprise': return 'bg-gold-600/50 text-gold-300';
      case 'custom': return 'bg-cyan-600/50 text-cyan-300';
      default: return 'bg-gray-600/50 text-gray-300';
    }
  };

  // Helper function to get status color
  const getStatusColor = (status?: Company['status']) => {
    switch (status) {
      case 'active': return 'bg-green-600/50 text-green-300';
      case 'trial': return 'bg-yellow-600/50 text-yellow-300';
      case 'inactive': return 'bg-red-600/50 text-red-300';
      case 'suspended': return 'bg-red-800/50 text-red-400';
      case 'archived': return 'bg-gray-800/50 text-gray-400';
      default: return 'bg-gray-600/50 text-gray-300';
    }
  };

  // Generate realistic enhanced data for existing companies
  const generateEnhancedCompanyData = (baseCompanies: Company[]): Company[] => {
    return baseCompanies.map((company, index) => {
      // Base media count on user count (more users = more media files typically)
      const baseMediaCount = company.userCount * (5 + Math.floor(Math.random() * 10)); // 5-15 files per user
      const mediaCount = company.hasMedia ? Math.max(baseMediaCount, 10) : 0;
      
      // Storage scales with media count and file types
      const avgFileSize = 2 + Math.random() * 3; // 2-5 MB average
      const storageUsed = Math.floor(mediaCount * avgFileSize);
      
      return {
        ...company,
        mediaCount,
        storageUsed,
        lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random within last 30 days
        companyType: (['startup', 'enterprise', 'agency', 'freelancer', 'tech', 'creative'] as const)[index % 6],
        growth: Math.floor((Math.random() - 0.2) * 60), // -20% to +40% (more realistic)
        engagement: Math.floor(Math.random() * 50) + 30, // 30-80% (reasonable range)
        tier: (['free', 'starter', 'professional', 'enterprise'] as const)[index % 4],
        status: (['active', 'trial', 'inactive'] as const)[Math.floor(Math.random() * 3)],
        description: `${company.name} - Professional media management`,
        tags: ['verified', 'active'].slice(0, Math.floor(Math.random() * 2) + 1),
        website: `https://${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
        location: ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Remote'][index % 4],
        industry: ['Technology', 'Marketing', 'Design', 'Consulting'][index % 4],
        founded: 2015 + (index % 8),
        employees: [10, 50, 100, 500][index % 4],
        analytics: {
          totalViews: mediaCount * (10 + Math.floor(Math.random() * 20)), // 10-30 views per file
          totalDownloads: Math.floor(mediaCount * (2 + Math.random() * 5)), // 2-7 downloads per file
          totalUploads: mediaCount,
          avgSessionTime: Math.floor(Math.random() * 180) + 120, // 2-5 minutes
          bounceRate: Math.floor(Math.random() * 30) + 20, // 20-50%
          conversionRate: Math.floor(Math.random() * 15) + 5 // 5-20%
        }
      };
    });
  };

  // Enhanced companies with filtering and sorting
  const filteredAndSortedCompanies = useMemo(() => {
    const enhancedCompanies = generateEnhancedCompanyData(companies);
    
    let filtered = enhancedCompanies.filter(company => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = categoryFilter === 'all' || company.companyType === categoryFilter;

      // Status filter
      let matchesFilter = true;
      switch (filterBy) {
        case 'active':
          matchesFilter = company.status === 'active';
          break;
        case 'inactive':
          matchesFilter = company.status === 'inactive';
          break;
        case 'trial':
          matchesFilter = company.status === 'trial';
          break;
        case 'enterprise':
          matchesFilter = company.tier === 'enterprise';
          break;
        case 'hasMedia':
          matchesFilter = company.hasMedia;
          break;
        case 'noMedia':
          matchesFilter = !company.hasMedia;
          break;
        default:
          matchesFilter = true;
      }

      return matchesSearch && matchesCategory && matchesFilter;
    });

    // Sort companies
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'users':
          return b.userCount - a.userCount;
        case 'media':
          return (b.mediaCount || 0) - (a.mediaCount || 0);
        case 'activity':
          return (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0);
        case 'growth':
          return (b.growth || 0) - (a.growth || 0);
        case 'engagement':
          return (b.engagement || 0) - (a.engagement || 0);
        case 'tier': {
          const tierOrder = { 'free': 0, 'starter': 1, 'professional': 2, 'enterprise': 3, 'custom': 4 };
          return (tierOrder[b.tier || 'free']) - (tierOrder[a.tier || 'free']);
        }
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [companies, searchQuery, sortBy, filterBy, categoryFilter]);


  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCompanies(true);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadCompanies();
  }, [adminRole, adminId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        loadCompanies(true); // Silent refresh
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadCompanies = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsRefreshing(true);
    }

    try {
      let companiesQuery;

      if (adminRole === 'super_admin') {
        // Super admin can see all companies
        companiesQuery = supabase
          .from('user_profiles')
          .select('company_name')
          .not('company_name', 'is', null)
          .neq('company_name', '');
      } else {
        // Regular admin can only see assigned companies
        // For now, let's assume they can see all - but this could be restricted
        // based on an admin_company_assignments table in the future
        companiesQuery = supabase
          .from('user_profiles')
          .select('company_name')
          .not('company_name', 'is', null)
          .neq('company_name', '');
      }

      const { data: companyData, error: companyError } = await companiesQuery;

      if (companyError) {
        setError('Failed to load companies');
        console.error('Error loading companies:', companyError);
        return;
      }

      // Process companies and get counts
      const companyMap = new Map<string, { userCount: number }>();
      
      companyData?.forEach(profile => {
        if (profile.company_name) {
          const existing = companyMap.get(profile.company_name);
          companyMap.set(profile.company_name, {
            userCount: (existing?.userCount || 0) + 1
          });
        }
      });

      // Check which companies have media files
      const companyNames = Array.from(companyMap.keys());
      const mediaChecks = await Promise.all(
        companyNames.map(async (companyName) => {
          const { data: mediaData, error: mediaError } = await supabase
            .from('media_files')
            .select('id')
            .eq('company_name', companyName)
            .limit(1);
          
          return {
            name: companyName,
            hasMedia: !mediaError && (mediaData?.length || 0) > 0
          };
        })
      );

      // Combine data
      const companiesList: Company[] = companyNames.map(name => {
        const mediaCheck = mediaChecks.find(m => m.name === name);
        const companyInfo = companyMap.get(name)!;
        
        return {
          name,
          userCount: companyInfo.userCount,
          hasMedia: mediaCheck?.hasMedia || false
        };
      });

      // Sort companies by name
      companiesList.sort((a, b) => a.name.localeCompare(b.name));
      
      setCompanies(companiesList);

    } catch (error) {
      console.error('Error in loadCompanies:', error);
      setError('Failed to load companies');
      showToast('error', 'Failed to load companies');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCompanyClick = (companyName: string) => {
    // Navigate to media library with company context
    navigate(`/admin/media-library?company=${encodeURIComponent(companyName)}`);
  };

  const handleBackClick = () => {
    navigate('/admin');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 mt-8">
        <p>{error}</p>
        <button
          onClick={loadCompanies}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackClick}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            
            <h1 className="text-2xl font-bold text-white">Media Library Access</h1>
            
            <div className="text-sm text-gray-400">
              {adminRole === 'super_admin' 
                ? 'Manage media libraries across all companies'
                : 'Access your assigned company media libraries'
              }
            </div>
          </div>

          {/* Storage Status */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                filteredAndSortedCompanies.some(c => c.hasMedia) ? 'bg-green-400' : 'bg-gray-500'
              }`} />
              <span className="text-sm text-gray-400">
                {filteredAndSortedCompanies.some(c => c.hasMedia) ? 'Storage Active' : 'No Media Files'}
              </span>
            </div>
            
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isRefreshing}
            >
              <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="users">Sort by Users</option>
              <option value="media">Sort by Media</option>
              <option value="activity">Sort by Activity</option>
            </select>

            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterBy)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Companies</option>
              <option value="active">Active Only</option>
              <option value="hasMedia">With Media</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAndSortedCompanies.length === 0 ? (
          <div className="text-center py-20">
            <BuildingOfficeIcon className="h-20 w-20 mx-auto mb-6 text-gray-500" />
            <h3 className="text-xl font-semibold text-white mb-2">No Companies Found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery ? 'Try adjusting your search terms or filters.' : 'There are no companies matching your current filters.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedCompanies.map((company) => (
              <div
                key={company.name}
                onClick={() => handleCompanyClick(company.name)}
                className="group bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-xl p-6 cursor-pointer transition-all duration-200"
              >
                {/* Company Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {company.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                          {company.userCount} users
                        </span>
                        {company.hasMedia && (
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                            Has Media
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                </div>

                {/* Company Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold text-white">{company.userCount}</div>
                    <div className="text-xs text-gray-400">Users</div>
                  </div>
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold text-blue-400">{company.mediaCount || 0}</div>
                    <div className="text-xs text-gray-400">Files</div>
                  </div>
                </div>

                {/* Media Status */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PhotoIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      {company.hasMedia ? 'Media Available' : 'No Media'}
                    </span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    company.status === 'active' ? 'bg-green-400' : 
                    company.status === 'trial' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}