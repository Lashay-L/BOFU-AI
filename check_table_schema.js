import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableSchema() {
  console.log('🔍 Checking actual table schemas...\n');

  // Check admin_profiles table structure
  console.log('1. Admin profiles table - showing all columns:');
  try {
    const { data: adminData, error: adminError } = await supabase
      .from('admin_profiles')
      .select('*')
      .limit(1);
    
    if (adminError) {
      console.error('❌ Admin profiles error:', adminError);
    } else {
      if (adminData && adminData.length > 0) {
        console.log('✅ Admin profiles columns:', Object.keys(adminData[0]));
        console.log('Sample data:', adminData[0]);
      } else {
        console.log('⚠️ No data in admin_profiles table');
      }
    }
  } catch (err) {
    console.error('❌ Cannot access admin_profiles:', err.message);
  }

  // Check user_profiles table structure  
  console.log('\n2. User profiles table - showing all columns:');
  try {
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (userError) {
      console.error('❌ User profiles error:', userError);
    } else {
      if (userData && userData.length > 0) {
        console.log('✅ User profiles columns:', Object.keys(userData[0]));
        console.log('Sample data:', userData[0]);
      } else {
        console.log('⚠️ No data in user_profiles table');
      }
    }
  } catch (err) {
    console.error('❌ Cannot access user_profiles:', err.message);
  }

  // Check for specific user by email in both tables
  console.log('\n3. Looking for lashay@bofu.ai in admin_profiles:');
  try {
    const { data: adminUser, error: adminUserError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('email', 'lashay@bofu.ai');
    
    if (adminUserError) {
      console.error('❌ Admin user search error:', adminUserError);
    } else {
      console.log('✅ Admin user found:', adminUser);
    }
  } catch (err) {
    console.error('❌ Cannot search admin_profiles:', err.message);
  }

  console.log('\n4. Looking for lashay@bofu.ai in user_profiles:');
  try {
    const { data: regularUser, error: regularUserError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'lashay@bofu.ai');
    
    if (regularUserError) {
      console.error('❌ User search error:', regularUserError);
    } else {
      console.log('✅ Regular user found:', regularUser);
    }
  } catch (err) {
    console.error('❌ Cannot search user_profiles:', err.message);
  }
}

checkTableSchema(); 