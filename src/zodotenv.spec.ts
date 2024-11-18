import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import z from 'zod';
import type { ZodotenvConfig } from './types';
import { zodotenv } from './zodotenv';

describe('zodotenv', () => {
  describe('Invalid configuration', () => {
    it('throws when the parameter is not an object', () => {
      assert.throws(() => zodotenv(1 as unknown as ZodotenvConfig), {
        name: 'ZodotenvError',
        message: 'The configuration must be defined as an object',
      });
    });

    it('throws when environment name is not a non-empty string', () => {
      assert.throws(
        () =>
          zodotenv({
            db: {
              host: ['', z.string()],
            },
          }),
        {
          name: 'ZodotenvError',
          message: 'Missing environment variable name for "db.host"',
        },
      );
    });

    it('throws when zod schema is not provided', () => {
      assert.throws(
        () =>
          zodotenv({
            name: ['HELLO', 123 as unknown as z.ZodType],
          }),
        {
          name: 'ZodotenvError',
          message: 'The provided schema is not a Zod type',
        },
      );
    });

    it('throws when env variables fail the validation', () => {
      assert.throws(
        () =>
          zodotenv({
            name: ['NAME', z.string()],
          }),
        {
          name: 'ZodotenvError',
          message: /^Configuration does not match the provided schema for "name"/,
        },
      );
    });
  });

  describe('Accessors', () => {
    const originalEnv = structuredClone(process.env);

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns both root and nested configs', () => {
      process.env.PORT = '3000';
      process.env.HTTP2 = 'true';
      process.env.DB_HOST = 'localhost:5432';
      process.env.DB_DRIVER = 'pgsql';
      process.env.DB_TABLES = 'users,pages';
      process.env.ADMIN_CREDENTIALS = '{"name": "admin", "password": "12345"}';

      const config = zodotenv({
        name: ['NAME', z.string().default('my-app')],
        port: ['PORT', z.coerce.number()],
        http2: ['HTTP2', z.string().transform((s) => s === 'true')],
        database: {
          host: ['DB_HOST', z.string()],
          driver: ['DB_DRIVER', z.enum(['mysql', 'pgsql', 'sqlite'])],
          tables: ['DB_TABLES', z.preprocess((s) => String(s).split(','), z.array(z.string()))],
        },
        adminCredentials: [
          'ADMIN_CREDENTIALS',
          z
            .string()
            .transform((s) => JSON.parse(s))
            .pipe(
              z.object({
                name: z.string(),
                password: z.string(),
              }),
            ),
          { secret: true },
        ],
      });

      assert.equal(config('name'), 'my-app');
      assert.equal(config('port'), 3000);
      assert.equal(config('http2'), true);
      assert.equal(config('database.host'), 'localhost:5432');
      assert.equal(config('database.driver'), 'pgsql');
      assert.deepEqual(config('database.tables'), ['users', 'pages']);
      assert.deepEqual(config('adminCredentials'), { name: 'admin', password: '12345' });
    });
  });

  describe('Serialisation', () => {
    const originalEnv = structuredClone(process.env);

    afterEach(() => {
      process.env = originalEnv;
    });

    it('serialises the entire configuration object to JSON', () => {
      process.env.PORT = '3000';
      process.env.HTTP2 = 'false';
      process.env.DB_HOST = 'localhost:5432';
      process.env.DB_DRIVER = 'mysql';
      process.env.DB_TABLES = 'users,posts';
      process.env.ADMIN_CREDENTIALS = '{"name": "admin", "password": "secret"}';

      const config = zodotenv({
        name: ['NAME', z.string().default('my-app')],
        port: ['PORT', z.coerce.number()],
        http2: ['HTTP2', z.string().transform((s) => s === 'true')],
        database: {
          host: ['DB_HOST', z.string()],
          driver: ['DB_DRIVER', z.enum(['mysql', 'pgsql', 'sqlite'])],
          tables: ['DB_TABLES', z.preprocess((s) => String(s).split(','), z.array(z.string()))],
        },
        adminCredentials: [
          'ADMIN_CREDENTIALS',
          z
            .string()
            .transform((s) => JSON.parse(s))
            .pipe(
              z.object({
                name: z.string(),
                password: z.string(),
              }),
            ),
        ],
      });

      const expectedConfig = {
        name: 'my-app',
        port: 3000,
        http2: false,
        'database.host': 'localhost:5432',
        'database.driver': 'mysql',
        'database.tables': ['users', 'posts'],
        adminCredentials: {
          name: 'admin',
          password: 'secret',
        },
      };

      assert.deepEqual(JSON.parse(JSON.stringify(config)), expectedConfig);
    });

    it('masks secret values when serialising to JSON', () => {
      process.env.PORT = '3000';
      process.env.API_KEY = 'secret-key';
      process.env.ADMIN_CREDENTIALS = '{"name": "admin", "password": "secret"}';

      const config = zodotenv({
        name: ['NAME', z.string().default('my-app')],
        port: ['PORT', z.coerce.number()],
        apiKey: ['API_KEY', z.string(), { secret: true }],
        adminCredentials: [
          'ADMIN_CREDENTIALS',
          z
            .string()
            .transform((s) => JSON.parse(s))
            .pipe(
              z.object({
                name: z.string(),
                password: z.string(),
              }),
            ),
          { secret: true },
        ],
      });

      const expectedConfig = {
        name: 'my-app',
        port: 3000,
        apiKey: '*********',
        adminCredentials: '*********',
      };

      assert.deepEqual(JSON.parse(JSON.stringify(config)), expectedConfig);
    });
  });
});
