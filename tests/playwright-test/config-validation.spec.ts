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

import { test, expect } from './playwright-test-fixtures';

test.describe('config validation - fullyParallel', () => {
  test('should accept valid boolean true', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          fullyParallel: true,
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should accept valid boolean false', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          fullyParallel: false,
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should reject invalid string value', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          fullyParallel: 'yes',
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('fullyParallel');
    expect(result.output).toContain('expected boolean');
  });

  test('should reject invalid number value', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          fullyParallel: 1,
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('fullyParallel');
  });
});

test.describe('config validation - failOnFlakyTests', () => {
  test('should accept valid boolean', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          failOnFlakyTests: true,
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should reject invalid value', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          failOnFlakyTests: 'true',
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('failOnFlakyTests');
  });
});

test.describe('config validation - preserveOutput', () => {
  test('should accept valid enum values', async ({ runInlineTest }) => {
    for (const value of ['always', 'never', 'failures-only']) {
      const result = await runInlineTest({
        'playwright.config.ts': `
          export default {
            preserveOutput: '${value}',
          };
        `,
        'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
      });
      expect(result.exitCode).toBe(0);
    }
  });

  test('should reject invalid enum value', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          preserveOutput: 'sometimes',
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('preserveOutput');
    expect(result.output).toContain('always');
    expect(result.output).toContain('never');
    expect(result.output).toContain('failures-only');
  });
});

test.describe('config validation - updateSnapshots', () => {
  test('should accept valid enum values', async ({ runInlineTest }) => {
    for (const value of ['all', 'changed', 'missing', 'none']) {
      const result = await runInlineTest({
        'playwright.config.ts': `
          export default {
            updateSnapshots: '${value}',
          };
        `,
        'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
      });
      expect(result.exitCode).toBe(0);
    }
  });

  test('should reject invalid enum value', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          updateSnapshots: 'new',
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('updateSnapshots');
  });
});

test.describe('config validation - globalTimeout', () => {
  test('should accept valid non-negative number', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          globalTimeout: 60000,
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should accept zero', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          globalTimeout: 0,
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should reject negative number', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          globalTimeout: -1000,
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('globalTimeout');
    expect(result.output).toContain('positive');
  });
});

test.describe('config validation - globalSetup', () => {
  test('should accept string path', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          globalSetup: './setup.ts',
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    // Zod validation accepts string, file resolution happens later
    expect(result.output).not.toContain('expected string');
  });

  test('should accept array of string paths', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          globalSetup: ['./setup1.ts', './setup2.ts'],
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.output).not.toContain('expected array');
  });

  test('should reject non-string values', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          globalSetup: 123,
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('globalSetup');
  });
});

test.describe('config validation - captureGitInfo', () => {
  test('should accept valid object', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          captureGitInfo: {
            commit: true,
            diff: true,
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should accept partial object', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          captureGitInfo: {
            commit: true,
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });
});

test.describe('config validation - expect configuration', () => {
  test('should accept valid expect config', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          expect: {
            timeout: 5000,
            toHaveScreenshot: {
              threshold: 0.2,
              maxDiffPixels: 10,
            },
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should reject invalid timeout', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          expect: {
            timeout: -1000,
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('timeout');
    expect(result.output).toContain('expect');
  });

  test('should reject invalid threshold', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          expect: {
            toHaveScreenshot: {
              threshold: 2,  // Must be 0-1
            },
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('threshold');
  });
});

test.describe('config validation - backward compatibility', () => {
  test('should allow unknown properties for backward compatibility', async ({ runInlineTest }) => {
    // allows custom/ props in config for extensibility
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          customProperty: 'value',
          myCustomSetting: 123,
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should allow all known properties', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          fullyParallel: true,
          failOnFlakyTests: false,
          globalTimeout: 60000,
          preserveOutput: 'failures-only',
          updateSnapshots: 'missing',
          captureGitInfo: { commit: true },
          metadata: { key: 'value' },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });
});

test.describe('config validation - backward compatibility', () => {
  test('should accept minimal config', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {};
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should accept config with existing validated properties', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          forbidOnly: true,
          reporter: 'list',
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });
});

test.describe('config validation - error messages', () => {
  test('should provide clear error message with file location', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          fullyParallel: 'yes',
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toMatch(/playwright\.config\.ts/);
    expect(result.output).toContain('Configuration option');
    expect(result.output).toContain('fullyParallel');
  });

  test('should show received value in error', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          runAgents: 'invalid',
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Received');
    expect(result.output).toContain('invalid');
  });
});

test.describe('test options validation - viewport', () => {
  test('should accept valid viewport', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          use: {
            viewport: { width: 1280, height: 720 },
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should reject invalid viewport width', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          use: {
            viewport: { width: -100, height: 720 },
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('viewport');
    expect(result.output).toContain('width');
  });

  test('should accept null viewport', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          use: {
            viewport: null,
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });
});

test.describe('test options validation - browser options', () => {
  test('should accept valid browserName', async ({ runInlineTest }) => {
    for (const browser of ['chromium', 'firefox', 'webkit']) {
      const result = await runInlineTest({
        'playwright.config.ts': `
          export default {
            use: {
              browserName: '${browser}',
            },
          };
        `,
        'test.spec.ts': `
          import { test, expect } from '@playwright/test';
          test('example', () => {})
        `,
      });
      expect(result.exitCode).toBe(0);
    }
  });

  test('should reject invalid browserName', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          use: {
            browserName: 'chrome',
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('browserName');
  });

  test('should accept headless boolean', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          use: {
            headless: true,
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });
});

test.describe('test options validation - screenshot', () => {
  test('should accept valid screenshot mode', async ({ runInlineTest }) => {
    for (const mode of ['on', 'off', 'only-on-failure']) {
      const result = await runInlineTest({
        'playwright.config.ts': `
          export default {
            use: {
              screenshot: '${mode}',
            },
          };
        `,
        'test.spec.ts': `
          import { test, expect } from '@playwright/test';
          test('example', () => {})
        `,
      });
      expect(result.exitCode).toBe(0);
    }
  });

  test('should reject invalid screenshot mode', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          use: {
            screenshot: 'always',
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('screenshot');
  });
});

test.describe('test options validation - custom fixtures allowed', () => {
  test('should allow custom fixture options', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          use: {
            myCustomFixture: 'value',
            anotherFixture: 123,
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(0);
  });

  test('should validate known options even with custom fixtures', async ({ runInlineTest }) => {
    const result = await runInlineTest({
      'playwright.config.ts': `
        export default {
          use: {
            myCustomFixture: 'value',
            headless: 'yes',  // Invalid - should be boolean
          },
        };
      `,
      'test.spec.ts': `
        import { test, expect } from '@playwright/test';
        test('example', () => {})
      `,
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('headless');
  });
});
