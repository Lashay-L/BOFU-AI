import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminDataRequest {
  action: 'fetch_users' | 'fetch_content_briefs' | 'fetch_research_results' | 'fetch_approved_products' | 'delete_approved_product' | 'fetch_article_counts' | 'fetch_user_articles' | 'delete_user' | 'get_deletion_summary' | 'update_user_status';
  userId?: string;
  userIds?: string[];
  productId?: string;
  data?: any;
}

serve(async (req) => {
  console.log('[AdminDataAccess] Request received - Method:', req.method, 'URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[AdminDataAccess] Missing environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Verify authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.error('[AdminDataAccess] Missing authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Verify the user is authenticated and is an admin
    const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !currentUser) {
      console.error('[AdminDataAccess] Authentication failed:', userError)
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin permissions
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('id, role')
      .eq('id', currentUser.id)
      .single()

    if (adminError || !adminProfile) {
      console.error('[AdminDataAccess] Admin verification failed:', adminError)
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[AdminDataAccess] Admin verified:', currentUser.email, 'Role:', adminProfile.role)

    // Parse request body
    let requestBody: AdminDataRequest
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('[AdminDataAccess] Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[AdminDataAccess] Processing action:', requestBody.action)

    let result: any = null

    switch (requestBody.action) {
      case 'fetch_users':
        console.log('👥 [FETCH_USERS] Starting user profiles fetch')
        
        // Check if current user is super admin or sub admin
        const { data: currentUserAdminProfile, error: currentUserAdminError } = await supabaseAdmin
          .from('admin_profiles')
          .select('admin_role')
          .eq('id', currentUser.id)
          .single()

        if (currentUserAdminError || !currentUserAdminProfile) {
          throw new Error('Admin profile not found or unauthorized')
        }

        let mainUsersQuery = supabaseAdmin
          .from('user_profiles')
          .select('*')
          .not('company_name', 'is', null)
          .neq('company_name', '')

        let companyProfilesQuery = supabaseAdmin
          .from('company_profiles')
          .select(`
            id,
            user_id,
            profile_name,
            profile_role,
            profile_avatar_url,
            created_at,
            updated_at,
            user_profiles!inner(
              id,
              email,
              company_name,
              avatar_url,
              created_at,
              updated_at
            )
          `)

        // If sub-admin, filter by assigned clients
        if (currentUserAdminProfile.admin_role === 'sub_admin') {
          console.log('🔒 [FETCH_USERS] Sub-admin detected, applying client filters')
          
          // Get assigned client user IDs
          const { data: clientAssignments, error: assignmentsError } = await supabaseAdmin
            .from('admin_client_assignments')
            .select('client_user_id')
            .eq('admin_id', currentUser.id)
            .eq('is_active', true)

          if (assignmentsError) {
            throw assignmentsError
          }

          if (!clientAssignments || clientAssignments.length === 0) {
            console.log('📭 [FETCH_USERS] Sub-admin has no client assignments')
            result = {
              mainUsers: [],
              companyProfiles: []
            }
            break
          }

          const assignedClientIds = clientAssignments.map(assignment => assignment.client_user_id)
          console.log('👥 [FETCH_USERS] Filtering by assigned client IDs:', assignedClientIds)

          // Filter main users to only assigned clients
          mainUsersQuery = mainUsersQuery.in('id', assignedClientIds)
          
          // Filter company profiles to only assigned clients
          companyProfilesQuery = companyProfilesQuery.in('user_id', assignedClientIds)
        }

        // Execute the queries
        const { data: mainUsers, error: mainUsersError } = await mainUsersQuery
        if (mainUsersError) {
          throw mainUsersError
        }

        const { data: companyProfiles, error: companyError } = await companyProfilesQuery
        if (companyError) {
          console.error('Error fetching company profiles:', companyError)
        }

        console.log(`✅ [FETCH_USERS] Successfully fetched ${mainUsers?.length || 0} main users and ${companyProfiles?.length || 0} company profiles`)
        result = {
          mainUsers,
          companyProfiles: companyProfiles || []
        }
        break

      case 'fetch_content_briefs':
        console.log('📋 [FETCH_CONTENT_BRIEFS] Starting content briefs fetch')
        
        // Check if current user is super admin or sub admin
        const { data: briefsAdminProfile, error: briefsAdminError } = await supabaseAdmin
          .from('admin_profiles')
          .select('admin_role')
          .eq('id', currentUser.id)
          .single()

        if (briefsAdminError || !briefsAdminProfile) {
          throw new Error('Admin profile not found or unauthorized')
        }

        let contentBriefsQuery = supabaseAdmin
          .from('content_briefs')
          .select(`
            id,
            title,
            user_id,
            created_at,
            updated_at,
            status,
            user_profiles!left(
              email,
              company_name
            )
          `)
          .order('created_at', { ascending: false })

        // If sub-admin, filter by assigned clients
        if (briefsAdminProfile.admin_role === 'sub_admin') {
          console.log('🔒 [FETCH_CONTENT_BRIEFS] Sub-admin detected, applying client filters')
          
          // Get assigned client user IDs
          const { data: briefsClientAssignments, error: briefsAssignmentsError } = await supabaseAdmin
            .from('admin_client_assignments')
            .select('client_user_id')
            .eq('admin_id', currentUser.id)
            .eq('is_active', true)

          if (briefsAssignmentsError) {
            throw briefsAssignmentsError
          }

          if (!briefsClientAssignments || briefsClientAssignments.length === 0) {
            console.log('📭 [FETCH_CONTENT_BRIEFS] Sub-admin has no client assignments')
            result = []
            break
          }

          const briefsAssignedClientIds = briefsClientAssignments.map(assignment => assignment.client_user_id)
          console.log('📋 [FETCH_CONTENT_BRIEFS] Filtering by assigned client IDs:', briefsAssignedClientIds)

          // Filter content briefs to only assigned clients
          contentBriefsQuery = contentBriefsQuery.in('user_id', briefsAssignedClientIds)
        }

        const { data: contentBriefs, error: briefsError } = await contentBriefsQuery

        if (briefsError) {
          console.error('❌ [FETCH_CONTENT_BRIEFS] Database error:', briefsError)
          throw briefsError
        }

        console.log(`✅ [FETCH_CONTENT_BRIEFS] Successfully fetched ${contentBriefs?.length || 0} content briefs`)
        result = contentBriefs
        break

      case 'fetch_research_results':
        console.log('🔬 [FETCH_RESEARCH_RESULTS] Starting research results fetch')
        
        // Check if current user is super admin or sub admin
        const { data: researchAdminProfile, error: researchAdminError } = await supabaseAdmin
          .from('admin_profiles')
          .select('admin_role')
          .eq('id', currentUser.id)
          .single()

        if (researchAdminError || !researchAdminProfile) {
          throw new Error('Admin profile not found or unauthorized')
        }

        let researchResultsQuery = supabaseAdmin
          .from('research_results')
          .select(`
            id,
            user_id,
            created_at,
            product_analysis,
            user_profiles!left(
              email,
              company_name
            )
          `)
          .order('created_at', { ascending: false })

        // If sub-admin, filter by assigned clients
        if (researchAdminProfile.admin_role === 'sub_admin') {
          console.log('🔒 [FETCH_RESEARCH_RESULTS] Sub-admin detected, applying client filters')
          
          // Get assigned client user IDs
          const { data: researchClientAssignments, error: researchAssignmentsError } = await supabaseAdmin
            .from('admin_client_assignments')
            .select('client_user_id')
            .eq('admin_id', currentUser.id)
            .eq('is_active', true)

          if (researchAssignmentsError) {
            throw researchAssignmentsError
          }

          if (!researchClientAssignments || researchClientAssignments.length === 0) {
            console.log('📭 [FETCH_RESEARCH_RESULTS] Sub-admin has no client assignments')
            result = []
            break
          }

          const researchAssignedClientIds = researchClientAssignments.map(assignment => assignment.client_user_id)
          console.log('🔬 [FETCH_RESEARCH_RESULTS] Filtering by assigned client IDs:', researchAssignedClientIds)

          // Filter research results to only assigned clients
          researchResultsQuery = researchResultsQuery.in('user_id', researchAssignedClientIds)
        }

        const { data: researchResults, error: researchError } = await researchResultsQuery

        if (researchError) {
          console.error('❌ [FETCH_RESEARCH_RESULTS] Database error:', researchError)
          throw researchError
        }

        console.log(`✅ [FETCH_RESEARCH_RESULTS] Successfully fetched ${researchResults?.length || 0} research results`)
        result = researchResults
        break

      case 'fetch_approved_products':
        console.log('📦 [FETCH_APPROVED_PRODUCTS] Starting approved products fetch')
        
        // Check if current user is super admin or sub admin
        const { data: currentAdminProfile, error: adminProfileError } = await supabaseAdmin
          .from('admin_profiles')
          .select('admin_role')
          .eq('id', currentUser.id)
          .single()

        if (adminProfileError || !currentAdminProfile) {
          throw new Error('Admin profile not found or unauthorized')
        }

        let approvedProductsQuery = supabaseAdmin
          .from('approved_products')
          .select('*')
          .order('created_at', { ascending: false })

        // If sub-admin, filter by assigned companies
        if (currentAdminProfile.admin_role === 'sub_admin') {
          console.log('🔒 [FETCH_APPROVED_PRODUCTS] Sub-admin detected, applying company filters')
          
          // Get assigned client companies
          const { data: assignments, error: assignmentError } = await supabaseAdmin
            .from('admin_client_assignments')
            .select(`
              client_user_id,
              user_profiles!inner(company_name, id),
              company_profiles!inner(company_id)
            `)
            .eq('admin_id', currentUser.id)
            .eq('is_active', true)

          if (assignmentError) {
            throw assignmentError
          }

          // Extract company names from assignments
          const assignedCompanies = new Set()
          assignments?.forEach(assignment => {
            if (assignment.user_profiles?.company_name) {
              assignedCompanies.add(assignment.user_profiles.company_name)
            }
            if (assignment.company_profiles?.company_id) {
              assignedCompanies.add(assignment.company_profiles.company_id)
            }
          })

          if (assignedCompanies.size === 0) {
            console.log('📭 [FETCH_APPROVED_PRODUCTS] Sub-admin has no company assignments')
            result = []
            break
          }

          console.log('🏢 [FETCH_APPROVED_PRODUCTS] Filtering by companies:', Array.from(assignedCompanies))
          approvedProductsQuery = approvedProductsQuery.in('company_name', Array.from(assignedCompanies))
        }

        const { data: approvedProducts, error: approvedError } = await approvedProductsQuery

        if (approvedError) {
          throw approvedError
        }

        console.log(`✅ [FETCH_APPROVED_PRODUCTS] Successfully fetched ${approvedProducts?.length || 0} approved products`)
        result = approvedProducts
        break

      case 'fetch_article_counts':
        if (!requestBody.userIds || !Array.isArray(requestBody.userIds)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing or invalid userIds array' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('[AdminDataAccess] Fetching article counts for', requestBody.userIds.length, 'users')
        
        // Query for user-specific articles
        const { data: userArticles, error: userArticlesError } = await supabaseAdmin
          .from('content_briefs')
          .select('user_id')
          .in('user_id', requestBody.userIds)
          .not('article_content', 'is', null)
          .neq('article_content', '')
          .neq('article_content', 'null')

        if (userArticlesError) {
          throw userArticlesError
        }

        // Query for system-generated articles (user_id IS NULL)
        const { data: systemArticles, error: systemArticlesError } = await supabaseAdmin
          .from('content_briefs')
          .select('user_id')
          .is('user_id', null)
          .not('article_content', 'is', null)
          .neq('article_content', '')
          .neq('article_content', 'null')

        if (systemArticlesError) {
          throw systemArticlesError
        }

        // Count articles per user
        const countMap = new Map()
        userArticles?.forEach((article: { user_id: string }) => {
          const userId = article.user_id
          countMap.set(userId, (countMap.get(userId) || 0) + 1)
        })

        // Add system articles count to 'system' key for display
        const systemCount = systemArticles?.length || 0
        if (systemCount > 0) {
          countMap.set('system', systemCount)
        }

        result = Object.fromEntries(countMap)
        console.log('[AdminDataAccess] Article counts fetched successfully:', Object.keys(result).length, 'users with articles, including', systemCount, 'system articles')
        break

      case 'fetch_user_articles':
        if (!requestBody.userIds || !Array.isArray(requestBody.userIds)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing or invalid userIds array' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('[AdminDataAccess] Fetching user articles for', requestBody.userIds.length, 'users')
        
        // Query content_briefs table for articles with content
        const { data: userArticleData, error: userArticleError } = await supabaseAdmin
          .from('content_briefs')
          .select(`
            id,
            user_id,
            research_result_id,
            product_name,
            title,
            possible_article_titles,
            brief_content,
            article_content,
            link,
            created_at,
            updated_at,
            editing_status,
            last_edited_by
          `)
          .in('user_id', requestBody.userIds)
          .not('article_content', 'is', null)
          .neq('article_content', '')
          .neq('article_content', 'null')
          .order('updated_at', { ascending: false })

        if (userArticleError) {
          console.error('[AdminDataAccess] Error fetching user articles:', userArticleError)
          throw userArticleError
        }

        console.log(`✅ [FETCH_USER_ARTICLES] Successfully fetched ${userArticleData?.length || 0} articles`)
        result = userArticleData || []
        break

      case 'get_deletion_summary':
        if (!requestBody.userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing userId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Query all related tables to get counts for deletion summary
        const [
          contentBriefsResult,
          researchResultsResult,
          approvedProductsResult,
          articleCommentsResult,
          articlePresenceResult,
          versionHistoryResult,
          commentStatusHistoryResult,
          userDashboardEmbedsResult,
          companyProfilesResult
        ] = await Promise.all([
          supabaseAdmin.from('content_briefs').select('id', { count: 'exact' }).eq('user_id', requestBody.userId),
          supabaseAdmin.from('research_results').select('id', { count: 'exact' }).eq('user_id', requestBody.userId),
          supabaseAdmin.from('approved_products').select('id', { count: 'exact' }).eq('approved_by', requestBody.userId),
          supabaseAdmin.from('article_comments').select('id', { count: 'exact' }).eq('user_id', requestBody.userId),
          supabaseAdmin.from('article_presence').select('id', { count: 'exact' }).eq('user_id', requestBody.userId),
          supabaseAdmin.from('version_history').select('id', { count: 'exact' }).eq('created_by', requestBody.userId),
          supabaseAdmin.from('comment_status_history').select('id', { count: 'exact' }).eq('changed_by', requestBody.userId),
          supabaseAdmin.from('user_dashboard_embeds').select('id', { count: 'exact' }).eq('user_id', requestBody.userId),
          supabaseAdmin.from('company_profiles').select('id', { count: 'exact' }).eq('user_id', requestBody.userId)
        ])

        result = {
          contentBriefs: contentBriefsResult.count || 0,
          researchResults: researchResultsResult.count || 0,
          approvedProducts: approvedProductsResult.count || 0,
          articleComments: articleCommentsResult.count || 0,
          articlePresence: articlePresenceResult.count || 0,
          versionHistory: versionHistoryResult.count || 0,
          commentStatusHistory: commentStatusHistoryResult.count || 0,
          userDashboardEmbeds: userDashboardEmbedsResult.count || 0,
          companyProfiles: companyProfilesResult.count || 0
        }
        break

      case 'delete_user':
        if (!requestBody.userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing userId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`🗑️ Starting deletion process for user: ${requestBody.userId}`)

        // Step 1: Delete user dashboard embeds
        const { error: dashboardEmbedsError } = await supabaseAdmin
          .from('user_dashboard_embeds')
          .delete()
          .eq('user_id', requestBody.userId)

        if (dashboardEmbedsError) {
          throw new Error(`Failed to delete user dashboard embeds: ${dashboardEmbedsError.message}`)
        }

        // Step 2: Delete comment status history records where user made changes
        const { error: commentStatusError } = await supabaseAdmin
          .from('comment_status_history')
          .delete()
          .eq('changed_by', requestBody.userId)

        if (commentStatusError) {
          throw new Error(`Failed to delete comment status history: ${commentStatusError.message}`)
        }

        // Step 3: Delete version history records created by user
        const { error: versionHistoryError } = await supabaseAdmin
          .from('version_history')
          .delete()
          .eq('created_by', requestBody.userId)

        if (versionHistoryError) {
          throw new Error(`Failed to delete version history: ${versionHistoryError.message}`)
        }

        // Step 4: Delete article presence records
        const { error: presenceError } = await supabaseAdmin
          .from('article_presence')
          .delete()
          .eq('user_id', requestBody.userId)

        if (presenceError) {
          throw new Error(`Failed to delete article presence: ${presenceError.message}`)
        }

        // Step 5: Delete article comments
        const { error: commentsError } = await supabaseAdmin
          .from('article_comments')
          .delete()
          .eq('user_id', requestBody.userId)

        if (commentsError) {
          throw new Error(`Failed to delete article comments: ${commentsError.message}`)
        }

        // Step 6: Delete approved products (where user was the approver)
        const { error: approvedProductsError } = await supabaseAdmin
          .from('approved_products')
          .delete()
          .eq('approved_by', requestBody.userId)

        if (approvedProductsError) {
          throw new Error(`Failed to delete approved products: ${approvedProductsError.message}`)
        }

        // Step 7: Clear content briefs content but preserve the briefs themselves
        const { error: contentBriefsError } = await supabaseAdmin
          .from('content_briefs')
          .update({
            user_id: null,
            article_content: null,
            link: null,
            editing_status: null,
            last_edited_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', requestBody.userId)

        if (contentBriefsError) {
          throw new Error(`Failed to update content briefs: ${contentBriefsError.message}`)
        }

        // Step 8: Delete research results
        const { error: researchResultsError } = await supabaseAdmin
          .from('research_results')
          .delete()
          .eq('user_id', requestBody.userId)

        if (researchResultsError) {
          throw new Error(`Failed to delete research results: ${researchResultsError.message}`)
        }

        // Step 9: Delete company profiles
        const { error: companyProfilesError } = await supabaseAdmin
          .from('company_profiles')
          .delete()
          .eq('user_id', requestBody.userId)

        if (companyProfilesError) {
          throw new Error(`Failed to delete company profiles: ${companyProfilesError.message}`)
        }

        // Step 10: Delete user profile
        const { error: userProfileError } = await supabaseAdmin
          .from('user_profiles')
          .delete()
          .eq('id', requestBody.userId)

        if (userProfileError) {
          throw new Error(`Failed to delete user profile: ${userProfileError.message}`)
        }

        // Step 11: Delete the user account from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(requestBody.userId)

        if (authError) {
          throw new Error(`Failed to delete user auth account: ${authError.message}`)
        }

        console.log(`✅ Successfully deleted user account: ${requestBody.userId}`)
        result = { success: true, message: 'User account has been completely deleted' }
        break

      case 'delete_approved_product':
        console.log('🎯 [DELETE_APPROVED_PRODUCT] Started processing delete request')
        console.log('🎯 [DELETE_APPROVED_PRODUCT] Request body:', JSON.stringify(requestBody))
        
        if (!requestBody.productId) {
          console.error('❌ [DELETE_APPROVED_PRODUCT] Missing productId in request')
          return new Response(
            JSON.stringify({ success: false, error: 'Missing productId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`🗑️ [DELETE_APPROVED_PRODUCT] Deleting approved product: ${requestBody.productId}`)

        // First, check if the product exists
        const { data: existingProduct, error: findError } = await supabaseAdmin
          .from('approved_products')
          .select('id, product_name')
          .eq('id', requestBody.productId)
          .single()

        if (findError) {
          console.error(`❌ [DELETE_APPROVED_PRODUCT] Error finding product: ${findError.message}`)
          throw new Error(`Failed to find approved product: ${findError.message}`)
        }

        if (!existingProduct) {
          console.error(`❌ [DELETE_APPROVED_PRODUCT] Product not found: ${requestBody.productId}`)
          throw new Error(`Approved product not found: ${requestBody.productId}`)
        }

        console.log(`🔍 [DELETE_APPROVED_PRODUCT] Found product to delete: ${existingProduct.product_name}`)

        const { error: deleteApprovedProductError } = await supabaseAdmin
          .from('approved_products')
          .delete()
          .eq('id', requestBody.productId)

        if (deleteApprovedProductError) {
          console.error(`❌ [DELETE_APPROVED_PRODUCT] Delete error: ${deleteApprovedProductError.message}`)
          throw new Error(`Failed to delete approved product: ${deleteApprovedProductError.message}`)
        }

        console.log(`✅ [DELETE_APPROVED_PRODUCT] Successfully deleted approved product: ${requestBody.productId}`)
        result = { success: true, message: 'Approved product deleted successfully' }
        break

      case 'update_user_status':
        if (!requestBody.userId || !requestBody.data) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing userId or data' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          requestBody.userId, 
          requestBody.data
        )

        if (updateError) {
          throw updateError
        }

        result = { success: true, message: 'User status updated successfully' }
        break

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[AdminDataAccess] CRITICAL ERROR Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      details: error.details || 'No additional details',
      hint: error.hint || 'No hint provided'
    })
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        details: error.details || null,
        hint: error.hint || null
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})