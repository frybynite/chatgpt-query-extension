#!/usr/bin/env node

/**
 * Helper script to obtain Chrome Web Store OAuth refresh token
 *
 * This script guides you through the OAuth flow to get the refresh token
 * needed for automated Chrome Web Store publishing.
 *
 * Prerequisites:
 * 1. Created OAuth credentials in Google Cloud Console
 * 2. Enabled Chrome Web Store API
 * 3. Added http://localhost:8080 to Authorized redirect URIs
 *
 * Usage:
 *   node scripts/get-chrome-refresh-token.js
 */

import readline from 'readline';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
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

function startLocalServer(port = 8080) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<html><body><h1>Error: ${error}</h1><p>You can close this window.</p></body></html>`);
        server.close();
        reject(new Error(error));
      } else if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><body><h1>Success!</h1><p>Authorization code received. You can close this window and return to the terminal.</p></body></html>`);
        server.close();
        resolve(code);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, () => {
      console.log(`Listening on http://localhost:${port}`);
    });

    server.on('error', reject);
  });
}

async function main() {
  console.log('\n========================================');
  console.log('Chrome Web Store Refresh Token Helper');
  console.log('========================================\n');

  console.log('This script will help you obtain the OAuth refresh token for Chrome Web Store publishing.\n');

  console.log('IMPORTANT: Before running this script, make sure you have:');
  console.log('1. Created OAuth credentials in Google Cloud Console');
  console.log('2. Enabled Chrome Web Store API');
  console.log('3. Added http://localhost:8080 to "Authorized redirect URIs"\n');

  const proceed = await question('Have you completed the above steps? (y/n): ');

  if (proceed.toLowerCase() !== 'y') {
    console.log('\nPlease complete the prerequisites first:');
    console.log('1. Go to https://console.cloud.google.com/apis/credentials');
    console.log('2. Click your OAuth Client ID');
    console.log('3. Under "Authorized redirect URIs", add: http://localhost:8080');
    console.log('4. Click Save\n');
    rl.close();
    process.exit(0);
  }

  // Step 1: Get Client ID and Secret
  console.log('\n========================================');
  console.log('Step 1: Enter your OAuth credentials');
  console.log('========================================\n');
  console.log('(From Google Cloud Console → APIs & Services → Credentials)\n');

  const clientId = await question('Enter your OAuth Client ID: ');
  const clientSecret = await question('Enter your OAuth Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('\nError: Client ID and Client Secret are required!');
    rl.close();
    process.exit(1);
  }

  // Step 2: Generate authorization URL
  console.log('\n========================================');
  console.log('Step 2: Authorize the application');
  console.log('========================================\n');

  const redirectUri = 'http://localhost:8080';
  const scope = 'https://www.googleapis.com/auth/chromewebstore';
  const authUrl = `https://accounts.google.com/o/oauth2/auth?response_type=code&scope=${encodeURIComponent(scope)}&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=offline&prompt=consent`;

  console.log('Starting local server to receive the authorization code...\n');

  const serverPromise = startLocalServer(8080);

  console.log('Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n');
  console.log('Waiting for authorization...\n');

  let authCode;
  try {
    authCode = await serverPromise;
    console.log('✓ Authorization code received!\n');
  } catch (error) {
    console.error('\nError receiving authorization:', error.message);
    rl.close();
    process.exit(1);
  }

  // Step 3: Exchange authorization code for refresh token
  console.log('========================================');
  console.log('Step 3: Exchanging code for refresh token');
  console.log('========================================\n');

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: authCode.trim(),
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });

  try {
    const response = await makeHttpsRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenParams.toString())
      },
      body: tokenParams.toString()
    });

    if (response.error) {
      console.error('\nError obtaining refresh token:');
      console.error(JSON.stringify(response, null, 2));
      rl.close();
      process.exit(1);
    }

    console.log('✓ Successfully obtained tokens!\n');

    // Display results
    console.log('========================================');
    console.log('Your GitHub Secrets');
    console.log('========================================\n');

    console.log('Add these to your GitHub repository:');
    console.log('(Settings → Secrets and variables → Actions)\n');

    console.log('CHROME_CLIENT_ID:');
    console.log(clientId);
    console.log('\nCHROME_CLIENT_SECRET:');
    console.log(clientSecret);
    console.log('\nCHROME_REFRESH_TOKEN:');
    console.log(response.refresh_token);
    console.log('\n');

    console.log('========================================');
    console.log('Next Steps');
    console.log('========================================\n');
    console.log('1. Go to your GitHub repository');
    console.log('2. Settings → Secrets and variables → Actions');
    console.log('3. Click "New repository secret"');
    console.log('4. Add each secret listed above');
    console.log('5. Also add CHROME_EXTENSION_ID (get from Chrome Web Store dashboard)');
    console.log('\n');

    // Optional: Save to a file
    const saveToFile = await question('Would you like to save these to a file? (y/n): ');

    if (saveToFile.toLowerCase() === 'y') {
      const fs = await import('fs');
      const secrets = {
        CHROME_CLIENT_ID: clientId,
        CHROME_CLIENT_SECRET: clientSecret,
        CHROME_REFRESH_TOKEN: response.refresh_token,
        CHROME_EXTENSION_ID: 'YOUR_EXTENSION_ID_HERE'
      };

      fs.writeFileSync('.chrome-secrets.json', JSON.stringify(secrets, null, 2));
      console.log('\n✓ Saved to .chrome-secrets.json');
      console.log('⚠️  WARNING: Keep this file secure and DO NOT commit it to git!\n');
    }

  } catch (error) {
    console.error('\nError:', error.message);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
