/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs';
import path from 'path';

import { isRegExp } from 'playwright-core/lib/utils';

import { requireOrImport, setSingleTSConfig, setTransformConfig } from '../transform/transform';
import { errorWithFile, fileIsModule } from '../util';
import { FullConfigInternal } from './config';
import { configureESMLoader, configureESMLoaderTransformConfig, registerESMLoader } from './esmLoaderHost';
import { addToCompilationCache } from '../transform/compilationCache';
import { testConfigSchema } from './schemas/config';
import { testOptionsSchema } from './schemas/testOptions';
import type { ZodError } from 'zod';

import type { ConfigLocation } from './config';
import type { ConfigCLIOverrides, SerializedConfig } from './ipc';
import type { Config, Project } from '../../types/test';

const kDefineConfigWasUsed = Symbol('defineConfigWasUsed');
export const defineConfig = (...configs: any[]) => {
  let result = configs[0];
  for (let i = 1; i < configs.length; ++i) {
    const config = configs[i];
    const prevProjects = result.projects;
    result = {
      ...result,
      ...config,
      expect: {
        ...result.expect,
        ...config.expect,
      },
      use: {
        ...result.use,
        ...config.use,
      },
      build: {
        ...result.build,
        ...config.build,
      },
      webServer: [
        ...(Array.isArray(result.webServer) ? result.webServer : (result.webServer ? [result.webServer] : [])),
        ...(Array.isArray(config.webServer) ? config.webServer : (config.webServer ? [config.webServer] : [])),
      ]
    };

    if (!result.projects && !config.projects)
      continue;

    const projectOverrides = new Map<string, any>();
    for (const project of config.projects || [])
      projectOverrides.set(project.name, project);

    const projects = [];
    for (const project of prevProjects || []) {
      const projectOverride = projectOverrides.get(project.name);
      if (projectOverride) {
        projects.push({
          ...project,
          ...projectOverride,
          use: {
            ...project.use,
            ...projectOverride.use,
          }
        });
        projectOverrides.delete(project.name);
      } else {
        projects.push(project);
      }
    }
    projects.push(...projectOverrides.values());
    result.projects = projects;
  }
  result[kDefineConfigWasUsed] = true;
  return result;
};

export async function deserializeConfig(data: SerializedConfig): Promise<FullConfigInternal> {
  if (data.compilationCache)
    addToCompilationCache(data.compilationCache);
  return await loadConfig(data.location, data.configCLIOverrides, undefined, data.metadata ? JSON.parse(data.metadata) : undefined);
}

async function loadUserConfig(location: ConfigLocation): Promise<Config> {
  let object = location.resolvedConfigFile ? await requireOrImport(location.resolvedConfigFile) : {};
  if (object && typeof object === 'object' && ('default' in object))
    object = object['default'];
  return object as Config;
}

export async function loadConfig(location: ConfigLocation, overrides?: ConfigCLIOverrides, ignoreProjectDependencies = false, metadata?: Config['metadata']): Promise<FullConfigInternal> {
  // 0. Setup ESM loader if needed.
  if (!registerESMLoader()) {
    // In Node.js < 18, complain if the config file is ESM. Historically, we would restart
    // the process with --loader, but now we require newer Node.js.
    if (location.resolvedConfigFile && fileIsModule(location.resolvedConfigFile))
      throw errorWithFile(location.resolvedConfigFile, `Playwright requires Node.js 18.19 or higher to load esm modules. Please update your version of Node.js.`);
  }

  // 1. Setup tsconfig; configure ESM loader with tsconfig and compilation cache.
  setSingleTSConfig(overrides?.tsconfig);
  await configureESMLoader();

  // 2. Load and validate playwright config.
  const userConfig = await loadUserConfig(location);
  validateConfig(location.resolvedConfigFile || '<default config>', userConfig);
  const fullConfig = new FullConfigInternal(location, userConfig, overrides || {}, metadata);
  fullConfig.defineConfigWasUsed = !!(userConfig as any)[kDefineConfigWasUsed];
  if (ignoreProjectDependencies) {
    for (const project of fullConfig.projects) {
      project.deps = [];
      project.teardown = undefined;
    }
  }

  // 3. Load transform options from the playwright config.
  const babelPlugins = (userConfig as any)['@playwright/test']?.babelPlugins || [];
  const external = userConfig.build?.external || [];
  setTransformConfig({ babelPlugins, external });
  if (!overrides?.tsconfig)
    setSingleTSConfig(fullConfig?.singleTSConfigPath);

  // 4. Send transform options to ESM loader.
  await configureESMLoaderTransformConfig();

  return fullConfig;
}

function validateConfig(file: string, config: Config) {
  if (typeof config !== 'object' || !config)
    throw errorWithFile(file, `Configuration file must export a single object`);

  try {
    testConfigSchema.parse(config);
  } catch (error) {
    const zodError = error as ZodError;
    if (zodError.issues.length > 0) {
      const issue = zodError.issues[0];
      const path = issue.path.join('.');

      if (issue.code === 'invalid_type') {
        let receivedValue: any = undefined;
        if (issue.path.length > 0) {
          let current: any = config;
          for (const key of issue.path)
            current = current[key];

          receivedValue = current;
        }
        const message = issue.message.replace('Invalid input: ', '');
        throw errorWithFile(file,
            `Configuration option "${path}" ${message}\n` +
          `Received: ${JSON.stringify(receivedValue)}`
        );
      }

      if (issue.code === 'invalid_value') {
        const receivedValue = issue.path.length > 0 ? config[path as keyof Config] : undefined;
        throw errorWithFile(file,
            `Configuration option "${path}" ${issue.message}\n` +
          `Received: ${JSON.stringify(receivedValue)}`
        );
      }

      if (issue.code === 'too_small' || issue.code === 'too_big') {
        const receivedValue = issue.path.length > 0 ? config[path as keyof Config] : undefined;
        throw errorWithFile(file,
            `Configuration option "${path}" ${issue.message}\n` +
          `Received: ${JSON.stringify(receivedValue)}`
        );
      }

      const propertyName = path || 'configuration';
      throw errorWithFile(file,
          `Configuration option "${propertyName}" ${issue.message}`
      );
    }
    throw error;
  }

  validateProject(file, config, 'config');

  // Validate config-level use options
  if (config.use !== undefined)
    validateTestOptions(file, config.use, 'config.use');

  // Validate projects recursively
  if (config.projects) {
    config.projects.forEach((project, index) => {
      validateProject(file, project, `config.projects[${index}]`);
    });
  }

  // tsconfig file existence check (type validation is in schema)
  if (config.tsconfig && typeof config.tsconfig === 'string') {
    if (!fs.existsSync(path.resolve(file, '..', config.tsconfig)))
      throw errorWithFile(file, `config.tsconfig does not exist`);
  }
}

function validateProject(file: string, project: Project, title: string) {
  if (typeof project !== 'object' || !project)
    throw errorWithFile(file, `${title} must be an object`);

  // testIgnore/testMatch validation (complex string|RegExp|array type)
  for (const prop of ['testIgnore', 'testMatch'] as const) {
    if (prop in project && project[prop] !== undefined) {
      const value = project[prop];
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item !== 'string' && !isRegExp(item))
            throw errorWithFile(file, `${title}.${prop}[${index}] must be a string or a RegExp`);
        });
      } else if (typeof value !== 'string' && !isRegExp(value)) {
        throw errorWithFile(file, `${title}.${prop} must be a string or a RegExp`);
      }
    }
  }

  // Validate test options in project.use
  if ('use' in project && project.use !== undefined) {
    if (!project.use || typeof project.use !== 'object')
      throw errorWithFile(file, `${title}.use must be an object`);
    validateTestOptions(file, project.use, `${title}.use`);
  }
}

function validateTestOptions(file: string, use: Record<string, any>, title: string) {
  try {
    testOptionsSchema.parse(use);
  } catch (error) {
    const zodError = error as ZodError;
    if (zodError.issues.length > 0) {
      const issue = zodError.issues[0];
      const path = issue.path.join('.');
      const fullPath = path ? `${title}.${path}` : title;

      if (issue.code === 'invalid_type') {
        let receivedValue: any = undefined;
        if (issue.path.length > 0) {
          let current: any = use;
          for (const key of issue.path)
            current = current[key];

          receivedValue = current;
        }
        const message = issue.message.replace('Invalid input: ', '');
        throw errorWithFile(file,
            `Configuration option "${fullPath}" ${message}\n` +
          `Received: ${JSON.stringify(receivedValue)}`
        );
      }

      if (issue.code === 'invalid_value') {
        const receivedValue = issue.path.length > 0 ? use[path] : undefined;
        throw errorWithFile(file,
            `Configuration option "${fullPath}" ${issue.message}\n` +
          `Received: ${JSON.stringify(receivedValue)}`
        );
      }

      if (issue.code === 'too_small' || issue.code === 'too_big') {
        const receivedValue = issue.path.length > 0 ? use[path] : undefined;
        throw errorWithFile(file,
            `Configuration option "${fullPath}" ${issue.message}\n` +
          `Received: ${JSON.stringify(receivedValue)}`
        );
      }

      throw errorWithFile(file,
          `Configuration option "${fullPath}" ${issue.message}`
      );
    }
    throw error;
  }
}

export function resolveConfigLocation(configFile: string | undefined): ConfigLocation {
  const configFileOrDirectory = configFile ? path.resolve(process.cwd(), configFile) : process.cwd();
  const resolvedConfigFile = resolveConfigFile(configFileOrDirectory);
  return {
    resolvedConfigFile,
    configDir: resolvedConfigFile ? path.dirname(resolvedConfigFile) : configFileOrDirectory,
  };
}

function resolveConfigFile(configFileOrDirectory: string): string | undefined {
  const resolveConfig = (configFile: string) => {
    if (fs.existsSync(configFile))
      return configFile;
  };

  const resolveConfigFileFromDirectory = (directory: string) => {
    for (const ext of ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs']) {
      const configFile = resolveConfig(path.resolve(directory, 'playwright.config' + ext));
      if (configFile)
        return configFile;
    }
  };

  if (!fs.existsSync(configFileOrDirectory))
    throw new Error(`${configFileOrDirectory} does not exist`);
  if (fs.statSync(configFileOrDirectory).isDirectory()) {
    // When passed a directory, look for a config file inside.
    const configFile = resolveConfigFileFromDirectory(configFileOrDirectory);
    if (configFile)
      return configFile;
    // If there is no config, assume this as a root testing directory.
    return undefined;
  }
  // When passed a file, it must be a config file.
  return configFileOrDirectory!;
}

export async function loadConfigFromFile(configFile: string | undefined, overrides?: ConfigCLIOverrides, ignoreDeps?: boolean): Promise<FullConfigInternal> {
  return await loadConfig(resolveConfigLocation(configFile), overrides, ignoreDeps);
}

export async function loadEmptyConfigForMergeReports() {
  // Merge reports is "different" for no good reason. It should not pick up local config from the cwd.
  return await loadConfig({ configDir: process.cwd() });
}
