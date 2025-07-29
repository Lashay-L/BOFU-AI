#!/usr/bin/env node

import fs from 'fs';
import https from 'https';

// Read the Edge Function code
const functionCode = fs.readFileSync('./supabase/functions/admin-slack-oauth-callback/index.ts', 'utf8');

// Supabase Management API endpoint for Edge Function deployment
const options = {
  hostname: 'nhxjashreguofalhaofj.supabase.co',
  port: 443,
  path: '/rest/v1/functions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sbp_3d5cd8b7a046e8dfcf1706d7265af9092b0230cc',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MDg4NDQsImV4cCI6MjA1OTA4NDg0NH0.yECqdVt448XiKOZZovyFHfYLsIcwDRhPyPUIUpvy_to'
  }
};

const postData = JSON.stringify({
  name: 'admin-slack-oauth-callback',
  body: functionCode
});

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();