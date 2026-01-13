/**
 * Setup Zalo Bot Webhook
 *
 * This script registers your webhook URL with Zalo Bot Platform.
 * Run this once after deploying your server.
 *
 * Usage:
 *   npx tsx scripts/setup-zalo-webhook.ts
 *
 * Environment variables required (set in .env or export):
 *   ZALO_BOT_TOKEN - Your bot token from Zalo Bot Creator
 *   ZALO_WEBHOOK_URL - Your webhook URL (https://your-domain.com/api/zalo/webhook)
 *   ZALO_WEBHOOK_SECRET - Secret token for verifying requests (min 8 chars)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple .env loader
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Only set if not already set
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file not found, that's ok
  }
}

loadEnv();

const ZALO_API_BASE = 'https://bot-api.zaloplatforms.com';

interface SetWebhookResponse {
  ok: boolean;
  result?: {
    url: string;
    updated_at: number;
  };
  error_code?: number;
  description?: string;
}

interface GetMeResponse {
  ok: boolean;
  result?: {
    id: string;
    bot_name: string;
    avatar?: string;
  };
  error_code?: number;
  description?: string;
}

async function getMe(botToken: string): Promise<GetMeResponse> {
  const url = `${ZALO_API_BASE}/bot${botToken}/getMe`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json() as Promise<GetMeResponse>;
}

async function setWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string,
): Promise<SetWebhookResponse> {
  const url = `${ZALO_API_BASE}/bot${botToken}/setWebhook`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
    }),
  });
  return response.json() as Promise<SetWebhookResponse>;
}

async function getWebhookInfo(
  botToken: string,
): Promise<{ url?: string; updated_at?: number } | null> {
  const url = `${ZALO_API_BASE}/bot${botToken}/getWebhookInfo`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = (await response.json()) as {
    ok: boolean;
    result?: { url?: string; updated_at?: number };
  };
  return json.ok ? (json.result ?? null) : null;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Zalo Bot Webhook Setup');
  console.log('='.repeat(60));

  const BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
  const WEBHOOK_URL = process.env.ZALO_WEBHOOK_URL;
  const SECRET_TOKEN = process.env.ZALO_WEBHOOK_SECRET;

  // Validate environment variables
  if (!BOT_TOKEN) {
    console.error('\nERROR: ZALO_BOT_TOKEN is not set');
    console.log('\nPlease set the environment variable or add it to .env file:');
    console.log('  ZALO_BOT_TOKEN=your-bot-token');
    process.exit(1);
  }

  if (!WEBHOOK_URL) {
    console.error('\nERROR: ZALO_WEBHOOK_URL is not set');
    console.log('\nPlease set the environment variable or add it to .env file:');
    console.log('  ZALO_WEBHOOK_URL=https://your-domain.com/api/zalo/webhook');
    process.exit(1);
  }

  if (!SECRET_TOKEN || SECRET_TOKEN.length < 8) {
    console.error('\nERROR: ZALO_WEBHOOK_SECRET is not set or too short (min 8 chars)');
    console.log('\nPlease set the environment variable or add it to .env file:');
    console.log('  ZALO_WEBHOOK_SECRET=your-secret-token-min-8-chars');
    process.exit(1);
  }

  // Step 1: Get bot info
  console.log('\n[1/3] Getting bot info...');
  try {
    const meResult = await getMe(BOT_TOKEN);
    if (meResult.ok && meResult.result) {
      console.log(`  Bot Name: ${meResult.result.bot_name}`);
      console.log(`  Bot ID: ${meResult.result.id}`);
    } else {
      console.error(`  ERROR: ${meResult.description || 'Failed to get bot info'}`);
      console.log('\n  Please check your ZALO_BOT_TOKEN');
      process.exit(1);
    }
  } catch (error) {
    console.error('  ERROR: Failed to connect to Zalo API');
    console.error(`  ${error}`);
    process.exit(1);
  }

  // Step 2: Check current webhook
  console.log('\n[2/3] Checking current webhook...');
  try {
    const currentWebhook = await getWebhookInfo(BOT_TOKEN);
    if (currentWebhook?.url) {
      console.log(`  Current URL: ${currentWebhook.url}`);
      if (currentWebhook.updated_at) {
        console.log(`  Last updated: ${new Date(currentWebhook.updated_at).toISOString()}`);
      }
    } else {
      console.log('  No webhook configured');
    }
  } catch {
    console.log('  Could not get current webhook info');
  }

  // Step 3: Set new webhook
  console.log('\n[3/3] Setting webhook...');
  console.log(`  URL: ${WEBHOOK_URL}`);
  console.log(`  Secret: ${'*'.repeat(SECRET_TOKEN.length - 4)}${SECRET_TOKEN.slice(-4)}`);

  try {
    const result = await setWebhook(BOT_TOKEN, WEBHOOK_URL, SECRET_TOKEN);

    if (result.ok) {
      console.log('\n' + '='.repeat(60));
      console.log('SUCCESS: Webhook configured successfully!');
      console.log('='.repeat(60));
      console.log(`\nWebhook URL: ${result.result?.url}`);
      console.log(`Updated at: ${new Date(result.result?.updated_at ?? Date.now()).toISOString()}`);
      console.log('\nYour Zalo Bot is now ready to receive messages.');
      console.log('\nTest by sending a message to your bot on Zalo:');
      console.log('  1. Open Zalo app');
      console.log('  2. Search for your bot name');
      console.log('  3. Send "huongdan" to see available commands');
    } else {
      console.error('\n' + '='.repeat(60));
      console.error('FAILED: Could not set webhook');
      console.error('='.repeat(60));
      console.error(`Error code: ${result.error_code}`);
      console.error(`Description: ${result.description}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\nERROR: Failed to set webhook');
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
