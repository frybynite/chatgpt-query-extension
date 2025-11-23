#!/usr/bin/env node

/**
 * Test Chrome Web Store API credentials
 *
 * This script validates that your OAuth credentials in .chrome-secrets.json
 * are working correctly by:
 * 1. Reading credentials from .chrome-secrets.json
 * 2. Exchanging refresh token for an access token
 * 3. Making a test API call to get extension info
 *
 * Usage:
 *   node scripts/test-chrome-credentials.js
 */

import fs from 'fs';
import https from 'https';
import { URL } from 'url';

function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function main() {
  console.log('\n========================================');
  console.log('Chrome Web Store Credentials Test');
  console.log('========================================\n');

  // Step 1: Read credentials
  console.log('Step 1: Reading credentials from .chrome-secrets.json...');

  if (!fs.existsSync('.chrome-secrets.json')) {
    console.error('✗ Error: .chrome-secrets.json not found!');
    console.log('\nRun this first: node scripts/get-chrome-refresh-token.js\n');
    process.exit(1);
  }

  const secrets = JSON.parse(fs.readFileSync('.chrome-secrets.json', 'utf8'));

  if (!secrets.CHROME_CLIENT_ID || !secrets.CHROME_CLIENT_SECRET || !secrets.CHROME_REFRESH_TOKEN) {
    console.error('✗ Error: Missing required credentials in .chrome-secrets.json');
    process.exit(1);
  }

  console.log('✓ Credentials loaded');
  console.log(`  Client ID: ${secrets.CHROME_CLIENT_ID.substring(0, 20)}...`);
  console.log(`  Extension ID: ${secrets.CHROME_EXTENSION_ID || 'NOT SET'}\n`);

  // Step 2: Exchange refresh token for access token
  console.log('Step 2: Exchanging refresh token for access token...');

  const tokenParams = new URLSearchParams({
    client_id: secrets.CHROME_CLIENT_ID,
    client_secret: secrets.CHROME_CLIENT_SECRET,
    refresh_token: secrets.CHROME_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  try {
    const tokenResponse = await makeHttpsRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenParams.toString())
      },
      body: tokenParams.toString()
    });

    if (tokenResponse.status !== 200) {
      console.error('✗ Failed to get access token');
      console.error(`  Status: ${tokenResponse.status}`);
      console.error(`  Response:`, JSON.stringify(tokenResponse.data, null, 2));

      if (tokenResponse.data.error === 'invalid_grant') {
        console.log('\n💡 The refresh token is invalid or expired.');
        console.log('   Run: node scripts/get-chrome-refresh-token.js');
      }

      process.exit(1);
    }

    const accessToken = tokenResponse.data.access_token;
    console.log('✓ Access token obtained successfully');
    console.log(`  Token: ${accessToken.substring(0, 20)}...`);
    console.log(`  Expires in: ${tokenResponse.data.expires_in} seconds\n`);

    // Step 3: Test API call - Get extension info
    if (secrets.CHROME_EXTENSION_ID && secrets.CHROME_EXTENSION_ID !== 'YOUR_EXTENSION_ID_HERE') {
      console.log('Step 3: Testing API call - Getting extension info...');

      const apiUrl = `https://www.googleapis.com/chromewebstore/v1.1/items/${secrets.CHROME_EXTENSION_ID}?projection=DRAFT`;

      const apiResponse = await makeHttpsRequest(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-goog-api-version': '2'
        }
      });

      if (apiResponse.status === 200) {
        console.log('✓ API call successful!');
        console.log(`  Extension: ${apiResponse.data.id || 'N/A'}`);
        console.log(`  Status: ${apiResponse.data.status || 'N/A'}`);
        console.log(`  Upload State: ${apiResponse.data.uploadState || 'N/A'}\n`);
      } else if (apiResponse.status === 401) {
        console.error('✗ API call failed - Unauthorized');
        console.log('\n💡 The credentials are valid, but may not have permission to access this extension.');
        console.log('   Verify the extension ID is correct.');
        process.exit(1);
      } else if (apiResponse.status === 404) {
        console.error('✗ API call failed - Extension not found');
        console.log('\n💡 The credentials work, but the extension ID may be incorrect.');
        console.log(`   Extension ID: ${secrets.CHROME_EXTENSION_ID}`);
        process.exit(1);
      } else {
        console.error('✗ API call failed');
        console.error(`  Status: ${apiResponse.status}`);
        console.error(`  Response:`, JSON.stringify(apiResponse.data, null, 2));
        process.exit(1);
      }
    } else {
      console.log('Step 3: Skipping API test (no extension ID set)\n');
    }

    // Success!
    console.log('========================================');
    console.log('✓ All tests passed!');
    console.log('========================================\n');
    console.log('Your credentials are valid and working correctly.');
    console.log('You can safely use them in your GitHub Actions secrets.\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
