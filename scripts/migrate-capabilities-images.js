/**
 * Migration script to move existing base64 capability images to media library
 * This script should be run once to migrate existing data
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nhxjashreguofalhaofj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'sbp_3d5cd8b7a046e8dfcf1706d7265af9092b0230cc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Convert base64 data URL to File object
 */
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}

/**
 * Upload base64 image to media library
 */
async function uploadImageToMediaLibrary(base64Data, companyName, userId, filename) {
  try {
    // Convert base64 to file
    const file = dataURLtoFile(base64Data, filename);
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = filename.split('.').pop() || 'jpg';
    const uniqueFilename = `capability-${timestamp}.${extension}`;
    const filePath = `${companyName}/product-capabilities/${uniqueFilename}`;
    
    // Upload to storage
    const { data, error } = await supabase.storage
      .from('media-library')
      .upload(filePath, file);
    
    if (error) throw error;
    
    // Save metadata to database
    const { data: mediaData, error: dbError } = await supabase
      .from('media_files')
      .insert({
        company_name: companyName,
        user_id: userId,
        filename: uniqueFilename,
        original_filename: filename,
        file_path: filePath,
        file_type: 'image',
        file_size: file.size,
        mime_type: file.type,
        title: `Capability Image - ${filename}`,
        caption: 'Migrated from product capabilities',
        width: null,
        height: null,
        folder_id: null,
        tags: ['product-capabilities', 'migrated']
      })
      .select()
      .single();
    
    if (dbError) throw dbError;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media-library')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload image to media library:', error);
    return null;
  }
}

/**
 * Process capabilities and migrate images
 */
async function migrateCapabilitiesImages() {
  try {
    console.log('🚀 Starting capabilities images migration...');
    
    // Get all research results with capabilities
    const { data: researchResults, error } = await supabase
      .from('research_results')
      .select(`
        id,
        user_id,
        company_name,
        product_analysis
      `)
      .not('product_analysis', 'is', null);
    
    if (error) throw error;
    
    let totalProcessed = 0;
    let totalMigrated = 0;
    
    for (const result of researchResults) {
      console.log(`Processing research result ${result.id}...`);
      
      try {
        const productAnalysis = result.product_analysis;
        let hasChanges = false;
        
        if (productAnalysis && productAnalysis.length > 0) {
          for (let i = 0; i < productAnalysis.length; i++) {
            const product = productAnalysis[i];
            
            if (product.capabilities && product.capabilities.length > 0) {
              for (let j = 0; j < product.capabilities.length; j++) {
                const capability = product.capabilities[j];
                
                if (capability.content) {
                  // Find base64 images in content
                  const base64Regex = /<img[^>]+src="data:image\/[^;]+;base64,[^"]+"/g;
                  let newContent = capability.content;
                  const matches = capability.content.match(base64Regex);
                  
                  if (matches) {
                    console.log(`Found ${matches.length} base64 images in capability "${capability.title}"`);
                    
                    for (const match of matches) {
                      const srcMatch = match.match(/src="(data:image\/[^"]+)"/);
                      if (srcMatch) {
                        const base64Data = srcMatch[1];
                        const filename = `capability-image-${Date.now()}.jpg`;
                        
                        // Upload to media library
                        const publicUrl = await uploadImageToMediaLibrary(
                          base64Data,
                          result.company_name,
                          result.user_id,
                          filename
                        );
                        
                        if (publicUrl) {
                          // Replace base64 with public URL
                          newContent = newContent.replace(base64Data, publicUrl);
                          hasChanges = true;
                          totalMigrated++;
                          console.log(`✅ Migrated image: ${filename}`);
                        }
                      }
                    }
                    
                    // Update capability content
                    productAnalysis[i].capabilities[j].content = newContent;
                  }
                }
              }
            }
          }
        }
        
        // Update research result if there were changes
        if (hasChanges) {
          const { error: updateError } = await supabase
            .from('research_results')
            .update({ product_analysis: productAnalysis })
            .eq('id', result.id);
          
          if (updateError) {
            console.error(`Failed to update research result ${result.id}:`, updateError);
          } else {
            console.log(`✅ Updated research result ${result.id}`);
          }
        }
        
        totalProcessed++;
      } catch (error) {
        console.error(`Failed to process research result ${result.id}:`, error);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Results: ${totalProcessed} research results processed, ${totalMigrated} images migrated`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateCapabilitiesImages()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCapabilitiesImages };