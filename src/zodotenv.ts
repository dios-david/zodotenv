import assert from 'node:assert';
import { ZodType } from 'zod';
import type {
  EnvWithZodType,
  ObjectPathName,
  ObjectPathType,
  PathSplit,
  ZodotenvConfig,
} from './types';

export class ZodotenvError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ZodotenvError';
    this.cause = cause;
  }
}

const walk = (map: Map<string, unknown>, entry: ZodotenvConfig | EnvWithZodType, prefix = '') => {
  if (Array.isArray(entry)) {
    const [envName, schema, options] = entry;

    assert(
      typeof envName === 'string' && envName.length > 0,
      new ZodotenvError(`Missing environment variable name for "${prefix}"`),
    );
    assert(schema instanceof ZodType, new ZodotenvError('The provided schema is not a Zod type'));

    const { data, error } = schema.safeParse(process.env[envName]);

    if (error) {
      throw new ZodotenvError(
        `Configuration does not match the provided schema for "${prefix}": ${error.message}`,
        error,
      );
    }

    map.set(prefix, { value: data, secret: options?.secret });
  } else {
    for (const [name, value] of Object.entries(entry)) {
      const newPrefix = prefix ? `${prefix}.${name}` : name;
      walk(map, value, newPrefix);
    }
  }
};

const maskSecretValue = (value: unknown, secret?: boolean) => {
  if (!secret) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return '*********';
  }

  if (typeof value === 'object' && value !== null) {
    const maskedObj = Array.isArray(value) ? [] : {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        maskedObj[key] = maskSecretValue(value[key], true);
      }
    }
    return maskedObj;
  }

  return value;
};

export const zodotenv = <T extends ZodotenvConfig>(config: T) => {
  assert(
    typeof config === 'object',
    new ZodotenvError('The configuration must be defined as an object'),
  );

  const map = new Map<string, { value: unknown; secret?: boolean }>();

  walk(map, config);

  const getConfig = <U extends ObjectPathName<T>>(key: U) =>
    map.get(key)?.value as ObjectPathType<T, PathSplit<U>>;

  getConfig.toJSON = () => {
    const result = {};

    for (const [key, { value, secret }] of map.entries()) {
      const keys = key.split('.');
      let current = result;

      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (i === keys.length - 1) {
          current[k] = maskSecretValue(value, secret);
        } else {
          if (!(k in current)) {
            current[k] = {};
          }
          current = current[k];
        }
      }
    }

    return result;
  };

  return getConfig;
};
