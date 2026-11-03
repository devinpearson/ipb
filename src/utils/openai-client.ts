import OpenAI from 'openai';
import { Agent, fetch as undiciFetch } from 'undici';
import { credentials } from '../runtime-credentials.js';

const SANDBOX_PROXY_URL = 'https://ipb.sandboxpay.co.za/proxy/v1';

/**
 * OpenAI client for the ai and bank commands: the user's OpenAI key, or the sandbox proxy when
 * there isn't one. REJECT_UNAUTHORIZED=false turns off TLS certificate checks for the proxy.
 */
export function createOpenAIClient(): OpenAI {
  if (credentials.openaiKey) {
    return new OpenAI({ apiKey: credentials.openaiKey });
  }
  const sandbox = { apiKey: credentials.sandboxKey, baseURL: SANDBOX_PROXY_URL };
  if (process.env.REJECT_UNAUTHORIZED !== 'false') {
    return new OpenAI(sandbox);
  }
  // openai uses the built-in fetch, which takes an undici dispatcher rather than an https.Agent.
  return new OpenAI({
    ...sandbox,
    fetch: undiciFetch,
    fetchOptions: { dispatcher: new Agent({ connect: { rejectUnauthorized: false } }) },
  });
}
