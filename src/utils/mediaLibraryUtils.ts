import { supabase } from '../lib/supabase';
import { uploadMediaFile } from '../lib/storage';

/**
 * Uploads an image to the media library and returns the public URL
 * @param file - The image file to upload
 * @param companyName - The company name for organization
 * @param folderPath - Optional folder path within media library
 * @returns Promise with the public URL of the uploaded image
 */
export async function uploadImageToMediaLibrary(
  file: File,
  companyName: string,
  folderPath: string = 'product-capabilities'
): Promise<string> {
  try {
    console.log('🔄 Starting media library upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      companyName,
      folderPath
    });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('👤 User authenticated:', user.id);

    // Generate title and metadata
    const title = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const caption = `Uploaded from product capabilities - ${new Date().toLocaleDateString()}`;
    
    console.log('📝 Upload metadata:', { title, caption });
    
    // Upload to media library with correct signature
    const result = await uploadMediaFile(
      file,
      companyName,
      user.id,
      undefined, // folderId - we'll use null for root folder for now
      {
        tags: ['product-capabilities', 'auto-uploaded']
      }
    );

    console.log('📤 Upload result:', result);

    if (result.error) {
      throw new Error(result.error);
    }

    console.log('✅ Upload successful, URL:', result.url);
    // Return the URL directly from the result
    return result.url;
  } catch (error) {
    console.error('❌ Failed to upload image to media library:', error);
    console.log('🔄 Falling back to base64...');
    // Fallback to base64 if media library upload fails
    return convertFileToBase64(file);
  }
}

/**
 * Fallback function to convert file to base64 data URL
 * @param file - The file to convert
 * @returns Promise with base64 data URL
 */
function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Gets the user's company name for media library uploads
 * @returns Promise with company name or null
 */
export async function getUserCompanyName(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    console.log('🔍 getUserCompanyName: Checking for user:', user.id);

    // First try to get company from company_profiles (this is the main company system)
    const { data: companyProfile } = await supabase
      .from('company_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (companyProfile?.company_id) {
      console.log('✅ getUserCompanyName: Found company from company_profiles:', companyProfile.company_id);
      return companyProfile.company_id;
    }

    // Fallback to user_profiles.company_name (for regular users)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_name')
      .eq('id', user.id)
      .single();

    if (userProfile?.company_name) {
      console.log('✅ getUserCompanyName: Found company from user_profiles:', userProfile.company_name);
      return userProfile.company_name;
    }

    console.warn('⚠️ getUserCompanyName: No company found for user');
    return null;
  } catch (error) {
    console.error('❌ getUserCompanyName: Failed to get user company name:', error);
    return null;
  }
}