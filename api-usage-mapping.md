# API Usage Mapping - Migration Analysis

## Components Using APIs

### Legacy API (articleApi.ts) Usage

#### ArticleEditor.tsx (Primary User)
```typescript
// Lines of Interest: 90, 253, 599, 1220, 1232
Imports:
├── loadArticleContent
├── saveArticleContent  
├── ArticleContent (type)
├── autoSaveArticleContentAsAdmin
└── saveArticleContentAsAdmin

Usage Patterns:
├── loadArticleContent(articleId) - Line 599
├── saveArticleContent(articleId, content) - Lines 253, 1232
├── saveArticleContentAsAdmin(articleId, content, options) - Line 1220
└── autoSaveArticleContentAsAdmin() - Import only (not actively used)

Context: Mixed admin/user operations in single component
```

#### ArticleEditorPage.tsx (Legacy Page)
```typescript
// Lines of Interest: 23, 75, 112, 114, 148, 150
Imports:
├── loadArticleContent
├── saveArticleContent
└── ArticleContent (type)

Usage Patterns:
├── loadArticleContent(articleId) - Line 75 (initial load)
├── saveArticleContent(articleId, content, 'editing') - Lines 114, 150
└── Manual and auto-save operations

Context: User-only operations, legacy routing
Status: TO BE REMOVED (legacy route)
```

#### AdminArticleManagementPage.tsx (Admin Page)
```typescript  
// Lines of Interest: 25, 277
Imports:
├── ArticleContent (type)
├── loadArticleContentAsAdmin
└── autoSaveArticleContentAsAdmin

Usage Patterns:
├── loadArticleContentAsAdmin(articleId, adminId) - Line 277
└── Admin-specific loading with enhanced permissions

Context: Admin-only operations
Status: NEEDS MIGRATION to unified API
```

### Unified API (unifiedArticleApi.ts) Usage

#### UnifiedArticleEditor.tsx (Primary User)
```typescript
// Lines of Interest: 6, 102, 173, 174, 232
Imports:
├── unifiedArticleService
├── UnifiedArticleContent (type)
├── UnifiedUserContext (type)
└── UnifiedSaveResult (type)

Usage Patterns:
├── unifiedArticleService.loadArticle(articleId) - Line 102
├── unifiedArticleService.autoSaveArticle(articleId, content) - Line 173
├── unifiedArticleService.saveArticle(articleId, content, options) - Line 174
└── unifiedArticleService.updateArticleStatus(articleId, status) - Line 232

Context: Unified admin/user operations, modern approach
Status: ✅ CURRENT STANDARD
```

## Migration Complexity Analysis

### High Priority Migrations (Breaking Changes)

#### 1. ArticleEditor.tsx
```typescript
Current Issues:
├── Mixed API usage (legacy + admin functions)
├── Conditional admin/user logic
├── Duplicate authentication checks
└── Inconsistent error handling

Migration Complexity: HIGH
├── 4 different API functions to replace
├── Admin/user logic to consolidate
├── Error handling patterns to unify
└── Testing complexity (dual mode component)

Recommended Approach:
├── Replace loadArticleContent → unifiedArticleService.loadArticle
├── Replace saveArticleContent → unifiedArticleService.saveArticle  
├── Replace saveArticleContentAsAdmin → unifiedArticleService.saveArticle (with admin context)
├── Remove autoSaveArticleContentAsAdmin (unused)
└── Update error handling to unified patterns
```

#### 2. AdminArticleManagementPage.tsx  
```typescript
Current Issues:
├── Admin-specific API functions
├── Limited error context
├── Manual admin ID management
└── Inconsistent with unified approach

Migration Complexity: MEDIUM
├── 2 API functions to replace
├── Admin context to integrate
├── Error handling to update
└── Permission logic to simplify

Recommended Approach:
├── Replace loadArticleContentAsAdmin → unifiedArticleService.loadArticle
├── Replace autoSaveArticleContentAsAdmin → unifiedArticleService.autoSaveArticle
├── Remove manual admin ID passing (unified service handles context)
└── Update error handling patterns
```

### Low Priority Migrations (Legacy Removal)

#### 3. ArticleEditorPage.tsx
```typescript
Status: LEGACY ROUTE - TO BE REMOVED
├── Using old routing pattern
├── Duplicate functionality with UnifiedArticleEditor
├── User-only operations (no admin mode)
└── Simple migration or removal

Recommended Approach: REMOVE ENTIRELY
├── Update routing to use UnifiedArticleEditor
├── Remove component file
├── Clean up route definitions
└── Update any remaining references
```

## API Migration Strategy

### Phase 1: Create Migration Wrappers
```typescript
// Create backward compatibility layer
// Temporary wrappers in articleApi.ts:

export const loadArticleContent = async (articleId: string) => {
  console.warn('DEPRECATED: Use unifiedArticleService.loadArticle');
  const result = await unifiedArticleService.loadArticle(articleId);
  return convertToLegacyFormat(result);
};

export const saveArticleContent = async (articleId: string, content: string, status?: string) => {
  console.warn('DEPRECATED: Use unifiedArticleService.saveArticle');
  const result = await unifiedArticleService.saveArticle(articleId, content, { editingStatus: status });
  return convertToLegacyFormat(result);
};
```

### Phase 2: Component-by-Component Migration

#### 2.1 Start with AdminArticleManagementPage.tsx (Lower Risk)
```typescript
BEFORE:
const articleContent = await loadArticleContentAsAdmin(article.id, adminId);

AFTER:  
const result = await unifiedArticleService.loadArticle(article.id);
if (!result.success) {
  // Handle error with unified error format
}
const articleContent = result.data;
```

#### 2.2 Migrate ArticleEditor.tsx (Higher Risk)
```typescript
BEFORE:
if (adminMode) {
  result = await saveArticleContentAsAdmin(articleId, content, options);
} else {
  result = await saveArticleContent(articleId, content);
}

AFTER:
const result = await unifiedArticleService.saveArticle(articleId, content, {
  editingStatus: options?.status,
  createVersion: options?.createVersion,
  adminNote: options?.adminNote
});
```

#### 2.3 Remove Legacy Components
```typescript
// Remove ArticleEditorPage.tsx entirely
// Update App.tsx routing
// Clean up imports and references
```

### Phase 3: Legacy API Cleanup
```typescript
// Remove wrapper functions
// Remove unused exports
// Update type definitions
// Final testing validation
```

## Risk Assessment by Component

### ArticleEditor.tsx - HIGH RISK
```
Complexity Factors:
├── 4 API functions to migrate
├── Dual admin/user mode logic
├── Real-time collaboration integration
├── Comment system dependencies
└── Extensive testing required

Mitigation Strategy:
├── Incremental migration with feature flags
├── Comprehensive testing at each step
├── Rollback capability for each function
├── Monitor error rates and performance
└── User acceptance testing for both modes
```

### AdminArticleManagementPage.tsx - MEDIUM RISK
```
Complexity Factors:
├── 2 API functions to migrate
├── Admin permission dependencies
├── UI updates required
└── Integration testing needed

Mitigation Strategy:
├── Straightforward function replacement
├── Test admin workflows thoroughly
├── Validate permission handling
└── Performance benchmarking
```

### ArticleEditorPage.tsx - LOW RISK
```
Complexity Factors:
├── Legacy component removal
├── Routing updates required
├── Reference cleanup needed
└── Minimal user impact

Mitigation Strategy:
├── Simple removal process
├── Redirect to unified editor
├── Clean up route definitions
└── Verify no broken links
```

## Success Metrics

### Code Reduction
```
Expected Reduction:
├── ArticleEditor.tsx: ~100 lines (API handling)
├── AdminArticleManagementPage.tsx: ~50 lines (API handling)
├── ArticleEditorPage.tsx: ~200 lines (entire file removed)
├── Legacy API cleanup: ~600 lines from articleApi.ts
└── Total: ~950 lines removed (21% of current system)
```

### Performance Improvements
```
Expected Benefits:
├── Reduced bundle size: ~150KB
├── Fewer database round-trips
├── Better caching efficiency
├── Unified error handling performance
└── Single API maintenance overhead
```

### Quality Improvements
```
Expected Benefits:
├── Consistent error handling across all components
├── Unified permission model
├── Better type safety
├── Easier testing and debugging
└── Single API documentation source
```

## Migration Timeline

### Week 1: Preparation
- [x] API audit completion
- [x] Usage mapping analysis
- [x] Risk assessment
- [ ] Create migration wrappers
- [ ] Set up monitoring

### Week 2: Low-Risk Migration
- [ ] Remove ArticleEditorPage.tsx
- [ ] Update routing configuration
- [ ] Migrate AdminArticleManagementPage.tsx
- [ ] Test admin workflows

### Week 3: High-Risk Migration
- [ ] Create ArticleEditor.tsx migration plan
- [ ] Implement incremental migration
- [ ] Test dual-mode functionality
- [ ] Performance validation

### Week 4: Cleanup & Validation
- [ ] Remove legacy API functions
- [ ] Clean up unused imports
- [ ] Final integration testing
- [ ] Performance benchmarking
- [ ] User acceptance testing

---

**API Usage Mapping Complete**: Clear migration path identified with risk mitigation strategies.