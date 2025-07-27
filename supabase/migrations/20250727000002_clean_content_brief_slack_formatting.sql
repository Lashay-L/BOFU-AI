-- Migration: Clean Content Brief Slack Message Formatting
-- This updates the content brief Slack notification function to match the clean article generation format

CREATE OR REPLACE FUNCTION send_slack_notification_direct(
    user_id_param UUID,
    brief_title_param TEXT,
    product_name_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_profile RECORD;
    admin_token TEXT;
    slack_payload JSONB;
    http_result BIGINT;
BEGIN
    -- Get user profile with admin-assigned Slack channel
    SELECT 
        admin_assigned_slack_channel_id,
        admin_assigned_slack_channel_name,
        company_name,
        email
    INTO user_profile
    FROM user_profiles 
    WHERE id = user_id_param;
    
    -- Check if user has admin-assigned Slack channel
    IF user_profile.admin_assigned_slack_channel_id IS NULL THEN
        RAISE NOTICE 'No admin-assigned Slack channel for user %', user_id_param;
        RETURN FALSE;
    END IF;
    
    -- Get admin Slack token
    SELECT slack_access_token INTO admin_token
    FROM admin_profiles 
    WHERE email = 'lashay@bofu.ai' 
    AND slack_access_token IS NOT NULL;
    
    IF admin_token IS NULL THEN
        RAISE NOTICE 'No admin Slack token found';
        RETURN FALSE;
    END IF;
    
    -- Build clean Slack message (matching article generation format)
    slack_payload := jsonb_build_object(
        'channel', user_profile.admin_assigned_slack_channel_id,
        'text', '📋 Content Brief Ready for Review: ' || brief_title_param,
        'blocks', jsonb_build_array(
            -- Header
            jsonb_build_object(
                'type', 'header',
                'text', jsonb_build_object(
                    'type', 'plain_text',
                    'text', '📋 Content Brief Ready for Review',
                    'emoji', true
                )
            ),
            -- Main message
            jsonb_build_object(
                'type', 'section',
                'text', jsonb_build_object(
                    'type', 'mrkdwn',
                    'text', '🎉 *Great news!* Your content brief has been successfully generated and is ready for your review and approval.'
                )
            ),
            -- Brief details (clean formatting without newlines)
            jsonb_build_object(
                'type', 'section',
                'fields', jsonb_build_array(
                    jsonb_build_object(
                        'type', 'mrkdwn',
                        'text', '*📄 Brief Title:* ' || brief_title_param
                    ),
                    jsonb_build_object(
                        'type', 'mrkdwn',
                        'text', '*🏢 Company:* ' || COALESCE(user_profile.company_name, 'N/A')
                    ),
                    CASE 
                        WHEN product_name_param IS NOT NULL AND product_name_param != user_profile.company_name THEN 
                            jsonb_build_object(
                                'type', 'mrkdwn',
                                'text', '*🎯 Product:* ' || product_name_param
                            )
                        ELSE 
                            jsonb_build_object(
                                'type', 'mrkdwn',
                                'text', '*👤 Requested by:* ' || user_profile.email
                            )
                    END,
                    jsonb_build_object(
                        'type', 'mrkdwn',
                        'text', '*👤 Requested by:* ' || user_profile.email
                    )
                )
            ),
            -- Status
            jsonb_build_object(
                'type', 'section',
                'text', jsonb_build_object(
                    'type', 'mrkdwn',
                    'text', '*📊 Status:* ✅ Generated | 🔄 Pending Approval'
                )
            )
        )
    );
    
    -- Send to Slack
    SELECT net.http_post(
        url := 'https://slack.com/api/chat.postMessage',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || admin_token
        ),
        body := slack_payload
    ) INTO http_result;
    
    RAISE NOTICE '✅ Clean content brief Slack notification sent (request_id: %)', http_result;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error sending content brief Slack notification: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_slack_notification_direct(UUID, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION send_slack_notification_direct IS 'Clean version: Sends simple, professional Slack notifications for content brief generation';