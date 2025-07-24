import { supabase } from '../lib/supabase';

/**
 * Test function to create a sample article generation notification
 * This simulates what happens when Moonlit generates an article
 */
export async function createTestArticleNotification() {
  try {
    console.log('🧪 Creating test article generation notification...');
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user found');
      return { success: false, error: 'No authenticated user' };
    }
    
    console.log('🧪 Creating notification for user:', user.id);
    
    // Create a test notification directly in the database (without brief_id since it's optional)
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: user.id,
        brief_id: null, // Set to null instead of invalid UUID
        notification_type: 'article_generated',
        title: 'TEST: Article Generated Successfully',
        message: 'Your test article has been generated and is ready for review. This is a test notification.',
        is_read: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating test notification:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Test notification created:', data);
    return { success: true, notification: data };
    
  } catch (error) {
    console.error('❌ Error in createTestArticleNotification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test function to simulate the article generation trigger
 * This updates a content brief to trigger the notification system
 */
export async function triggerArticleGenerationTest() {
  try {
    console.log('🧪 Triggering article generation test...');
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user found');
      return { success: false, error: 'No authenticated user' };
    }
    
    // Find any content brief that doesn't have article content (admin can test with any user's brief)
    const { data: briefsData, error: briefError } = await supabase
      .from('content_briefs')
      .select('id, title, product_name, article_content, user_id')
      .limit(10);
    
    if (briefError) {
      console.error('❌ Error fetching content briefs:', briefError);
      return { success: false, error: briefError.message };
    }
    
    let briefs = briefsData;
    
    if (!briefs || briefs.length === 0) {
      console.log('🧪 No content briefs found, creating a test brief...');
      
      // Create a test content brief to trigger with
      const { data: newBrief, error: createError } = await supabase
        .from('content_briefs')
        .insert({
          user_id: user.id,
          title: 'Test Notification Article',
          product_name: 'Test Product',
          status: 'approved',
          article_content: null
        })
        .select('id, title, product_name, article_content, user_id')
        .single();
      
      if (createError) {
        console.error('❌ Error creating test brief:', createError);
        return { success: false, error: createError.message };
      }
      
      console.log('✅ Created test brief:', newBrief.id);
      briefs = [newBrief];
    }
    
    // Find a brief without article content or use the first one
    let targetBrief = briefs.find(b => !b.article_content || b.article_content.trim() === '');
    if (!targetBrief) {
      targetBrief = briefs[0];
      // Clear the article content first to simulate the trigger condition
      await supabase
        .from('content_briefs')
        .update({ article_content: null })
        .eq('id', targetBrief.id);
    }
    
    console.log('🧪 Using content brief:', targetBrief.id, targetBrief.title);
    
    // Simulate Moonlit generating article content
    const testArticleContent = `TEST ARTICLE: ${targetBrief.title}

This is a test article generated to test the notification system. 

## Introduction
This article was automatically generated to verify that notifications are working correctly when Moonlit completes article generation.

## Key Points
- The notification trigger should fire when this content is added
- Users should see notifications in their dashboard
- The notification count should update in real-time

## Conclusion  
If you're seeing this notification, the system is working correctly!

Generated at: ${new Date().toISOString()}`;

    // Update the content brief with article content to trigger the notification
    const { error: updateError } = await supabase
      .from('content_briefs')
      .update({ 
        article_content: testArticleContent,
        last_edited_at: new Date().toISOString()
      })
      .eq('id', targetBrief.id);
    
    if (updateError) {
      console.error('❌ Error updating content brief:', updateError);
      return { success: false, error: updateError.message };
    }
    
    console.log('✅ Article content updated, trigger should have fired');
    return { 
      success: true, 
      briefId: targetBrief.id, 
      briefTitle: targetBrief.title 
    };
    
  } catch (error) {
    console.error('❌ Error in triggerArticleGenerationTest:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Simple admin test that creates a notification for any user
 */
export async function createAdminTestNotification() {
  try {
    console.log('🧪 Creating admin test notification...');
    
    // Get any user to create a notification for
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .limit(1)
      .single();
    
    if (userError || !users) {
      console.error('❌ No users found:', userError);
      return { success: false, error: 'No users found to test with' };
    }
    
    console.log('🧪 Creating notification for user:', users.email);
    
    // Create a test notification for this user
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: users.id,
        brief_id: null,
        notification_type: 'article_generated',
        title: 'ADMIN TEST: Article Generated',
        message: `Admin test notification created for ${users.email}. This tests the notification system.`,
        is_read: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating admin test notification:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Admin test notification created:', data);
    return { success: true, notification: data, userEmail: users.email };
    
  } catch (error) {
    console.error('❌ Error in createAdminTestNotification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Expose functions globally for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).createTestArticleNotification = createTestArticleNotification;
  (window as any).triggerArticleGenerationTest = triggerArticleGenerationTest;
  (window as any).createAdminTestNotification = createAdminTestNotification;
}