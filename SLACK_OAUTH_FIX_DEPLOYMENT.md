# Slack OAuth Fix - Deployment Instructions

## Problem Fixed
The Slack OAuth callback was redirecting to the wrong URL (production instead of local development), causing the connection modal to not reopen and show the connected state.

## Changes Made

### 1. Frontend Changes (✅ Already Applied)
- **adminSlackService.ts**: Modified to auto-detect current environment (localhost vs production)
- **AdminDashboard.tsx**: Enhanced OAuth callback handling to auto-reopen modal with correct context
- **AdminSlackManagement.tsx**: Pass company context through OAuth flow
- **.env**: Added `FRONTEND_URL=http://localhost:5173` for local development

### 2. Edge Function Changes (🚨 NEEDS DEPLOYMENT)
**File**: `supabase/functions/admin-slack-oauth-callback/index.ts`

**Key Changes**:
- Now uses full URL from OAuth state instead of constructing from environment variables
- Properly handles both local (`http://localhost:5173`) and production (`https://bofu.netlify.app`) URLs
- Preserves company context in redirects

## Deployment Steps

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/nhxjashreguofalhaofj/functions
2. Find the `admin-slack-oauth-callback` function
3. Click "Deploy new version"
4. Copy and paste the entire content of `supabase/functions/admin-slack-oauth-callback/index.ts`
5. Deploy

### Option 2: Via CLI (if Docker is available)
```bash
npx supabase functions deploy admin-slack-oauth-callback
```

## Testing After Deployment

### Local Development Test:
1. Start local dev server: `npm run dev`
2. Go to `http://localhost:5173/admin`
3. Click Slack button for any company
4. Complete OAuth flow
5. Verify redirect returns to `http://localhost:5173/admin` (not netlify)
6. Verify modal reopens showing connected state

### Production Test:
1. Go to `https://bofu.netlify.app/admin`
2. Click Slack button for any company  
3. Complete OAuth flow
4. Verify redirect returns to `https://bofu.netlify.app/admin`
5. Verify modal reopens showing connected state

## Expected Behavior After Fix
1. **Local**: OAuth flow stays within localhost environment
2. **Production**: OAuth flow stays within production environment  
3. **Modal**: Automatically reopens after OAuth with correct connection status
4. **Context**: Company context preserved through OAuth flow
5. **Toast**: Success/error notifications shown appropriately

## Rollback Plan
If issues occur, revert the Edge Function to use the old hardcoded approach:
```typescript
const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/admin`
```