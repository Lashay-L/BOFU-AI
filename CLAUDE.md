whe# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Supabase Credentials Memory

**Important Credentials:**
- When using Supabase MCP, always use the following credentials:
  * Project URL: https://nhxjashreguofalhaofj.supabase.co
  * Service Key: sbp_3d5cd8b7a046e8dfcf1706d7265af9092b0230cc

**IMPORTANT MCP Server Usage:**
- ALWAYS use `supabase_bofu` MCP server for this project
- NEVER use `supabase_medimind_expert` for BOFU project operations
- Use `mcp__supabase_bofu__*` functions for all database operations

## Development Commands

**Core Development:**
```bash
npm install                    # Install dependencies
npm run dev                   # Start development server (localhost:5173)
npm run build                 # Production build
npm run lint                  # Code linting with ESLint
npm run preview               # Preview production build
npm run dev:server            # Start Express.js server with nodemon
```

**Database Setup:**
```bash
# Create first admin account (after editing admin details in script)
node scripts/create-admin.js

# Bundle Analysis (production build insights)
npm run build     # Includes rollup-plugin-visualizer for bundle analysis
```

**Required Environment Variables:**
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## MCP Server Usage Guide

This project integrates with multiple MCP (Model Context Protocol) servers for enhanced development capabilities. Here's when and how to use each:

### 🔥 **Supabase MCP** (Primary Database Operations)
**Use for ALL database-related tasks:**
- Creating, reading, updating, deleting data in PostgreSQL
- Managing user profiles, content briefs, research results
- Executing SQL queries and migrations
- Managing Edge Functions deployment
- Row Level Security (RLS) policy management
- Real-time subscription setup
- Database schema changes and optimization

**Key Operations:**
```typescript
// Use Supabase MCP for:
- User authentication and profile management
- Content brief CRUD operations  
- Article comment system management
- Version history tracking
- Admin dashboard data queries
- Product analysis data storage
```

**When NOT to use:** Never bypass Supabase MCP for direct database access in this project.

### 🌐 **Browser Tools MCP** (UI Testing & Interaction)
**⚠️ Requires explicit user confirmation and Chromium browser running**

**Use for:**
- Testing user interface functionality
- Debugging visual rendering issues
- Validating responsive design across viewports
- Testing authentication flows end-to-end
- Verifying admin vs user role access
- Performance auditing and accessibility testing
- Screenshot capture for documentation

**Setup Requirements:**
1. User must explicitly start the Browser Tools server
2. Chromium browser must be running
3. Disable Puppeteer if conflicts occur
4. Always ask user permission before browser automation

**Example Use Cases:**
- Testing rich text editor functionality
- Validating product card rendering
- Checking admin dashboard access controls
- Verifying real-time collaboration features

### 🧠 **Sequential Thinking MCP** (Complex Problem Solving)
**Use for:**
- Debugging complex authentication issues
- Architecting new feature implementations
- Troubleshooting database relationship problems
- Planning multi-step deployment strategies
- Analyzing performance bottlenecks
- Designing component integration patterns

**Avoid:** Excessive recursive calls - trigger intelligently when new progress is possible.

### 🔍 **Information Gathering MCPs** (Research & Documentation)
**Brave Search, Tavily, Context7:**
- Researching React/TypeScript best practices
- Finding Supabase documentation and examples
- Troubleshooting TipTap editor issues
- Investigating Tailwind CSS solutions
- Looking up Framer Motion animation patterns
- Searching for similar user issues and solutions

**Combine with Sequential Thinking for optimal results.**

### 📚 **Context7 MCP** (Library Documentation)
**Use for:**
- Getting up-to-date documentation for project dependencies
- Understanding React 18.3.1 features and patterns
- TipTap editor extension documentation
- Supabase client library reference
- TypeScript interface and type definitions

### 🐛 **Sentry MCP** (Error Monitoring)
**Use for:**
- Investigating production errors and issues
- Monitoring application performance metrics
- Tracking user error patterns
- Debugging authentication and database errors
- Analyzing real-time collaboration issues

### 🚀 **GitHub MCP** (Version Control)
**Use for:**
- Committing code changes after successful testing
- Creating descriptive commit messages for features
- Managing pull requests and code reviews
- Pushing deployments to production branches

**Best Practice:** Always commit after successful Supabase and Browser testing.

### 📋 **Taskmaster MCP** (Project Management)
**Use for:**
- Managing development tasks and milestones
- Breaking down complex features into subtasks
- Tracking implementation progress
- Planning feature rollouts and dependencies

### MCP Server Priority Order
1. **Supabase MCP** - Primary for all database operations
2. **Browser Tools MCP** - Essential for UI validation (with user permission)
3. **Sequential Thinking MCP** - For complex problem analysis
4. **Information Gathering MCPs** - For research and troubleshooting
5. **GitHub MCP** - For version control after testing
6. **Context7/Sentry/Taskmaster** - As needed for specific tasks

### Integration Patterns
```typescript
// Typical workflow:
1. Use Supabase MCP for database schema changes
2. Update React components for new data structures  
3. Use Browser Tools MCP to test UI functionality
4. Use GitHub MCP to commit successful changes
5. Use Sentry MCP to monitor for production issues
```

## Architecture Overview

**BOFU AI** is a React-based SaaS application for automating Bottom-of-Funnel content creation for B2B SaaS companies. The application uses AI to analyze product information and generate tailored content briefs.

### Technology Stack
- **Frontend:** React 18.3.1 with TypeScript, Vite build tool with advanced optimization
- **Backend:** Supabase (PostgreSQL) with Edge Functions and real-time subscriptions
- **Styling:** Tailwind CSS with custom glassmorphism design system
- **Rich Text Editor:** TipTap with 20+ extensions including collaborative editing (Y.js)
- **UI Components:** Radix UI primitives with Headless UI for complex interactions
- **Animation:** Framer Motion for sophisticated UI animations
- **Routing:** React Router DOM v7.4.1 with lazy loading
- **Document Export:** Multi-format support (DOCX, PDF, HTML, Markdown)
- **Performance:** Strategic code splitting and bundle optimization

### Core Application Flow
1. **User Authentication:** Role-based access (regular users vs admin users)
2. **Research Submission:** Multi-step form for product research requests
3. **AI Processing:** Content brief generation using AI analysis
4. **Content Management:** Rich editing interface with version history
5. **Admin Oversight:** User management and system analytics

## Key Architectural Patterns

### Dual User System
The application maintains separate user types with distinct workflows:
- **Regular Users (`user_profiles`):** Content creation and management
- **Admin Users (`admin_profiles`):** User management and system oversight
- **Role-based UI:** Conditional rendering based on user permissions

### Rich Text Editing Ecosystem
- **TipTap Editor:** Primary rich text editor with extensions for collaboration
- **Version History:** Comprehensive document versioning with `version_history` table
- **Auto-save:** Debounced automatic saving with visual status indicators
- **Collaborative Features:** Real-time editing with presence indicators

### Database Architecture (Supabase)
**Core Tables:**
- `user_profiles` / `admin_profiles` - Dual user system with role separation
- `research_results` - AI-generated product analysis data
- `content_briefs` - User-created content briefs with approval workflow
- `approved_products` - User-approved product submissions
- `article_comments` - Rich commenting system with mentions and resolution
- `article_presence` - Real-time user presence tracking for collaboration
- `version_history` - Comprehensive document versioning and audit trail
- `comment_status_history` - Comment lifecycle audit trail
- `user_dashboard_embeds` - Embedded analytics dashboards

**Security:** Row Level Security (RLS) policies with multi-tenant data protection

### Component Organization
```
src/components/
├── admin/                    # Complete admin management system
│   ├── ContentBriefManagement/  # Modular admin interface with hooks
│   ├── layout/               # Admin-specific layouts
│   ├── modals/               # Admin modal components
│   └── ui/                   # Admin UI components
├── auth/                     # Authentication components
├── content-brief/            # Content brief management
├── product/                  # Product analysis components
├── profile/                  # User profile management
├── user-dashboard/           # User dashboard components
├── settings/                 # Application settings
├── chat/                     # Chat functionality
└── ui/                       # 40+ reusable UI components
    ├── collaborative editing tools (CommentingSystem, UserPresence)
    ├── rich text editor components (LinkEditor, SpecialCharacters)
    └── mobile-responsive components (MobileNavigation, MobileCommentSystem)
```

### State Management Patterns
- **React Context:** Global state management for auth and user data
- **Custom Hooks:** Reusable stateful logic (auto-save, real-time updates)
- **Supabase Real-time:** Live subscriptions for collaborative features

## Critical Implementation Details

### Parameter Handling in Content Updates
When updating content sections (like keywords), ensure proper parameter mapping:
```typescript
// Correct signature for onUpdateSection
onUpdateSection={(productIndex: number, sectionType: keyof ProductAnalysis, newValue: any) => {
  handleUpdateSection(productIndex, sectionType, newValue);
}}
```

### Data Sanitization Pattern
The application includes comprehensive data sanitization for array fields to prevent corruption:
```typescript
const arrayFields = ['keywords', 'features', 'usps', 'painPoints', 'capabilities'];
// Sanitization logic prevents object-to-array corruption
```

### Auto-save Implementation
Components use debounced auto-save with visual feedback:
```typescript
const { hasUnsavedChanges, saveStatus } = useAutoSave({
  data: editableProduct,
  onSave: handleAutoSave,
  delay: 2000
});
```

## Development Guidelines

### Code Organization
- **TypeScript:** Comprehensive type coverage with interfaces in `src/types/`
- **Component Architecture:** Modular, reusable components following established patterns
- **Performance:** Code splitting, lazy loading, and memory optimization for large documents
- **Error Handling:** Graceful degradation with user-friendly error messages

### UI/UX Patterns
- **Glassmorphism Design:** Professional dark theme with gradient backgrounds
- **Responsive Design:** Mobile-first approach with Tailwind utilities
- **Accessibility:** WCAG compliance with proper ARIA attributes
- **Visual Feedback:** Loading states, save indicators, and status badges

### Database Integration
- **Real-time Updates:** Supabase subscriptions for live collaboration
- **Optimistic Updates:** Immediate UI feedback with database sync
- **Transaction Safety:** Proper error handling with rollback capabilities
- **Query Optimization:** Indexed queries for performance

## Testing and Quality

### Development Workflow
- **ESLint Configuration:** Strict linting rules for code quality
- **TypeScript:** Zero-error compilation with full type coverage
- **Component Testing:** Test both regular and admin user workflows
- **Cross-browser Validation:** Ensure compatibility across modern browsers

### Common Issues and Solutions
- **Parameter Mismatches:** Verify function signatures match interface definitions
- **Array Corruption:** Use data sanitization utilities for complex data structures
- **Auto-save Conflicts:** Implement proper debouncing and conflict resolution
- **Real-time Sync:** Handle network issues and concurrent updates gracefully

This architecture supports enterprise-grade content creation workflows with robust collaboration features, comprehensive user management, and AI-powered content generation capabilities.
