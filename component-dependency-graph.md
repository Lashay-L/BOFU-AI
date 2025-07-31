# Article Editor Component Dependency Graph

## High-Level Architecture

```
Application Layer
├── App.tsx
├── ArticleEditorPage.tsx (legacy)
└── AdminArticleManagementPage.tsx

Coordinator Layer
├── UnifiedArticleEditor.tsx
└── Admin Components
    ├── AdminDashboard.tsx
    └── ArticleEditorAdminTest.tsx

Presentation Layer
└── ArticleEditor.tsx
    ├── UI Components (12 components)
    ├── API Layer (5 APIs)
    ├── Extensions (2 extensions)
    └── Utilities (3 utility modules)
```

## Detailed Dependency Analysis

### UnifiedArticleEditor.tsx Dependencies
```
UnifiedArticleEditor
├── React Router (useParams, useNavigate)
├── ArticleEditor (main component)
├── unifiedArticleApi (primary API)
├── realtimeCollaboration
├── ArticleAICoPilot (admin feature)
├── LayoutContext
└── toast notifications
```

### ArticleEditor.tsx Dependencies

#### UI Components (From ./ui/)
```
ArticleEditor
├── ExportButton
├── MediaLibrarySelector  
├── LinkTooltip
├── CommentingSystem + ArticleComment
├── ImageResizer
├── InlineCommentingExtension
├── ToolbarButton
├── ArticleColorPicker
├── StatusIndicator
├── ToolbarSeparator
├── LinkEditor
└── UserPresence
```

#### API Layer Dependencies
```
ArticleEditor
├── ../lib/articleApi (legacy)
│   ├── loadArticleContent()
│   ├── saveArticleContent()
│   ├── autoSaveArticleContentAsAdmin()
│   └── saveArticleContentAsAdmin()
├── ../lib/adminApi
│   └── adminArticlesApi
├── ../lib/commentApi
│   ├── getArticleComments()
│   └── subscribeToComments()
├── ../lib/supabase (direct database access)
└── ../lib/realtimeCollaboration
```

#### Extensions & Utilities
```
ArticleEditor
├── ../extensions/ImageExtension
├── ../extensions/CommentHighlightExtension
├── ../lib/textUtils
│   ├── getTextNodeAtOffset()
│   ├── getTextOffset()
│   └── htmlToMarkdown()
├── ../hooks/useTheme
├── ../contexts/LayoutContext
└── ../contexts/ProfileContext
```

#### External Libraries
```
ArticleEditor
├── @tiptap/* (15+ extensions)
├── framer-motion (animations)
├── lucide-react (20+ icons)
├── lodash (debounce utility)
├── prosemirror-* (low-level editor)
└── react-dom (createPortal - unused)
```

## Component Usage Analysis

### Components That Use ArticleEditor
1. **UnifiedArticleEditor.tsx** (Primary usage)
2. **ArticleEditorPage.tsx** (Legacy - to be removed)
3. **AdminDashboard.tsx** (Admin interface)
4. **AdminArticleManagementPage.tsx** (Admin management)
5. **ArticleEditorAdminTest.tsx** (Testing)
6. **MobileResponsiveModal.tsx** (Modal wrapper)

### API Usage Patterns

#### Current API Duplication
```
articleApi.ts (legacy)          unifiedArticleApi.ts (current)
├── loadArticleContent()    →   ├── unifiedArticleService.loadArticle()
├── saveArticleContent()    →   ├── unifiedArticleService.saveArticle()
├── autoSaveAdmin()         →   ├── unifiedArticleService.autoSave()
└── saveAdmin()             →   └── unifiedArticleService.saveArticle()
```

#### Components Using Each API
**articleApi.ts (Legacy)**:
- ArticleEditor.tsx (direct imports)
- Legacy components

**unifiedArticleApi.ts (Current)**:
- UnifiedArticleEditor.tsx (primary)
- Admin components

## Circular Dependencies Analysis

### Potential Issues
1. **ArticleEditor → CommentingSystem → ArticleEditor**: Comment system needs editor ref
2. **ArticleEditor → UI Components → ArticleEditor**: Some UI components callback to editor
3. **API Layer Confusion**: Components using both old and new APIs

### Resolution Strategy
1. **Props Interface Cleanup**: Remove circular callback dependencies
2. **Event System**: Use event emitters instead of direct callbacks  
3. **API Consolidation**: Single API interface for all components

## Extraction Opportunities

### High Priority Extractions
```
EditorToolbar Component
├── Save/Export buttons
├── Formatting controls  
├── View toggles
├── Admin controls
└── Status indicators

EditorStatusBar Component  
├── Save status
├── Word count
├── Reading time
├── Auto-save indicators
└── Error states

ImageHandler Component
├── Image selection
├── Resizing controls
├── Caption editing
├── Position controls
└── Delete functionality
```

### Medium Priority Extractions
```
FocusModeControls
├── Zen mode toggle
├── Focus mode options
├── Distraction-free UI
└── Keyboard shortcuts

CommentIntegration  
├── Comment system wrapper
├── Highlight management
├── Comment positioning
└── Real-time updates
```

## Data Flow Analysis

### Current Data Flow
```
UnifiedArticleEditor (State Management)
    ↓ Props & Callbacks
ArticleEditor (Presentation + Logic)
    ↓ Direct API Calls
Multiple API Services
    ↓ Database Operations  
Supabase
```

### Proposed Data Flow
```
UnifiedArticleEditor (State Management + API Integration)
    ↓ Clean Props Interface
ArticleEditor (Presentation Only)
    ↓ Extracted Components
EditorToolbar + EditorStatusBar + ImageHandler
    ↓ Event Callbacks
UnifiedArticleEditor (Event Handling)
```

## Refactoring Sequence

### Phase 1: Component Extraction
1. Extract EditorToolbar (lowest risk)
2. Extract EditorStatusBar (independent)
3. Extract ImageHandler (self-contained)
4. Extract AdminControls (isolated)

### Phase 2: API Consolidation  
1. Map all API usage patterns
2. Create unified API interface
3. Migrate components one by one
4. Remove legacy API

### Phase 3: State Management
1. Move all state to UnifiedArticleEditor
2. Clean up ArticleEditor props interface
3. Implement event-based communication
4. Remove direct API calls from presentation

### Phase 4: Performance Optimization
1. Implement proper memoization
2. Optimize re-render patterns
3. Code splitting for large components
4. Bundle size optimization

## Risk Assessment

### Low Risk Extractions
- ✅ EditorToolbar (UI only)
- ✅ EditorStatusBar (display only)  
- ✅ ImageHandler (self-contained)
- ✅ Unused import removal

### Medium Risk Changes
- ⚠️ State management refactoring
- ⚠️ API consolidation
- ⚠️ Props interface changes
- ⚠️ Event system implementation

### High Risk Changes  
- 🚨 Core editor logic modification
- 🚨 Real-time collaboration changes
- 🚨 Authentication integration changes
- 🚨 Database schema dependencies

## Success Metrics

### Code Reduction Targets
- ArticleEditor.tsx: 2,212 → ~800 lines (64% reduction)
- Total system: 4,482 → ~2,700 lines (40% reduction)
- API consolidation: 1,607 → ~800 lines (50% reduction)

### Performance Targets
- Bundle size: 15-20% reduction expected
- Initial load time: 10-15% improvement
- Memory usage: 20-30% reduction
- Development productivity: 2x improvement for new features

---

**Dependency Analysis Complete**: Clear extraction sequence identified with minimal risk approach.