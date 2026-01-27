/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z as zod } from 'playwright-core/lib/mcpBundle';

/**
 * Schema for Test options
 */

const viewportSchema = zod.object({
  width: zod.number().int().positive(),
  height: zod.number().int().positive(),
});

const geolocationSchema = zod.object({
  longitude: zod.number().min(-180).max(180),
  latitude: zod.number().min(-90).max(90),
  accuracy: zod.number().nonnegative().optional(),
});

const proxySchema = zod.object({
  server: zod.string(),
  bypass: zod.string().optional(),
  username: zod.string().optional(),
  password: zod.string().optional(),
});

const storageStateSchema = zod.union([
  zod.string(), // path to storage state file
  zod.object({
    cookies: zod.array(zod.object({
      name: zod.string(),
      value: zod.string(),
      domain: zod.string(),
      path: zod.string(),
      expires: zod.number().optional(),
      httpOnly: zod.boolean().optional(),
      secure: zod.boolean().optional(),
      sameSite: zod.enum(['Strict', 'Lax', 'None']).optional(),
    })).optional(),
    origins: zod.array(zod.object({
      origin: zod.string(),
      localStorage: zod.array(zod.object({
        name: zod.string(),
        value: zod.string(),
      })).optional(),
    })).optional(),
  }),
]);

const httpCredentialsSchema = zod.object({
  username: zod.string(),
  password: zod.string(),
  origin: zod.string().optional(),
  send: zod.enum(['always', 'unauthorized']).optional(),
});

const clientCertificateSchema = zod.object({
  origin: zod.string(),
  certPath: zod.string().optional(),
  keyPath: zod.string().optional(),
  pfxPath: zod.string().optional(),
  cert: zod.string().optional(),
  key: zod.string().optional(),
  pfx: zod.instanceof(Buffer).optional(),
  passphrase: zod.string().optional(),
});

const screenshotOptionsSchema = zod.object({
  mode: zod.enum(['on', 'off', 'only-on-failure']),
  fullPage: zod.boolean().optional(),
  omitBackground: zod.boolean().optional(),
});

const traceOptionsSchema = zod.object({
  mode: zod.enum(['on', 'off', 'retain-on-failure', 'on-first-retry']),
  snapshots: zod.boolean().optional(),
  screenshots: zod.boolean().optional(),
  sources: zod.boolean().optional(),
  attachments: zod.boolean().optional(),
});

const videoOptionsSchema = zod.object({
  mode: zod.enum(['on', 'off', 'retain-on-failure', 'on-first-retry']),
  size: zod.object({
    width: zod.number().int().positive(),
    height: zod.number().int().positive(),
  }).optional(),
});

const launchOptionsSchema = zod.object({
  channel: zod.string().optional(),
  chromiumSandbox: zod.boolean().optional(),
  downloadsPath: zod.string().optional(),
  executablePath: zod.string().optional(),
  args: zod.array(zod.string()).optional(),
  ignoreDefaultArgs: zod.union([zod.boolean(), zod.array(zod.string())]).optional(),
  headless: zod.union([zod.boolean(), zod.literal('new')]).optional(),
  proxy: proxySchema.optional(),
  timeout: zod.number().positive().optional(),
  slowMo: zod.number().nonnegative().optional(),
  devtools: zod.boolean().optional(),
  env: zod.record(zod.string(), zod.string()).optional(),
  handleSIGINT: zod.boolean().optional(),
  handleSIGTERM: zod.boolean().optional(),
  handleSIGHUP: zod.boolean().optional(),
});

const browserNameSchema = zod.enum(['chromium', 'firefox', 'webkit']);

/**
 * Main test options schema.
 *
 */
export const testOptionsSchema = zod.object({
  // Agent options (new AI feature)
  agentOptions: zod.object({
    model: zod.string(),
    apiKey: zod.string(),
    api: zod.enum(['openai', 'openai-compatible', 'anthropic', 'google']).optional(),
  }).optional(),

  // Browser options
  browserName: browserNameSchema.optional(),
  defaultBrowserType: browserNameSchema.optional(),
  channel: zod.string().optional(),
  headless: zod.boolean().optional(),
  launchOptions: launchOptionsSchema.optional(),
  connectOptions: zod.object({
    wsEndpoint: zod.string(),
    headers: zod.record(zod.string(), zod.string()).optional(),
    timeout: zod.number().positive().optional(),
    _exposeNetwork: zod.string().optional(),
  }).optional(),

  // Viewport and device emulation
  viewport: zod.union([viewportSchema, zod.null()]).optional(),
  deviceScaleFactor: zod.number().positive().optional(),
  hasTouch: zod.boolean().optional(),
  isMobile: zod.boolean().optional(),
  userAgent: zod.string().optional(),

  // Navigation and location
  baseURL: zod.string().optional(),
  geolocation: zod.union([geolocationSchema, zod.null()]).optional(),
  locale: zod.string().optional(),
  timezoneId: zod.string().optional(),
  offline: zod.boolean().optional(),

  // Network
  acceptDownloads: zod.boolean().optional(),
  bypassCSP: zod.boolean().optional(),
  extraHTTPHeaders: zod.record(zod.string(), zod.string()).optional(),
  ignoreHTTPSErrors: zod.boolean().optional(),
  proxy: zod.union([proxySchema, zod.null()]).optional(),
  clientCertificates: zod.array(clientCertificateSchema).optional(),

  // Colors and media
  colorScheme: zod.enum(['light', 'dark', 'no-preference', 'null']).optional(),
  forcedColors: zod.enum(['active', 'none', 'null']).optional(),
  reducedMotion: zod.enum(['no-preference', 'reduce', 'null']).optional(),


  httpCredentials: zod.union([httpCredentialsSchema, zod.null()]).optional(),

  storageState: zod.union([storageStateSchema, zod.null()]).optional(),

  javaScriptEnabled: zod.boolean().optional(),

  permissions: zod.array(zod.string()).optional(),

  serviceWorkers: zod.enum(['allow', 'block']).optional(),

  screenshot: zod.union([
    zod.enum(['on', 'off', 'only-on-failure']),
    screenshotOptionsSchema,
  ]).optional(),

  trace: zod.union([
    zod.enum(['on', 'off', 'retain-on-failure', 'on-first-retry', 'retry-with-trace']),
    traceOptionsSchema,
  ]).optional(),

  video: zod.union([
    zod.enum(['on', 'off', 'retain-on-failure', 'on-first-retry', 'retry-with-video']),
    videoOptionsSchema,
  ]).optional(),

  actionTimeout: zod.number().nonnegative().optional(),
  navigationTimeout: zod.number().nonnegative().optional(),

  testIdAttribute: zod.string().optional(),

  ignoreSnapshots: zod.boolean().optional(),

  contextOptions: zod.record(zod.string(), zod.any()).optional(),
}).loose();
