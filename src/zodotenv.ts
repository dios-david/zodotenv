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
    const [envName, schema] = entry;

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

    map.set(prefix, data);
  } else {
    for (const [name, value] of Object.entries(entry)) {
      const newPrefix = prefix ? `${prefix}.${name}` : name;
      walk(map, value, newPrefix);
    }
  }
};

export const zodotenv = <T extends ZodotenvConfig>(config: T) => {
  assert(
    typeof config === 'object',
    new ZodotenvError('The configuration must be defined as an object'),
  );

  const map = new Map<string, unknown>();

  walk(map, config);

  return <U extends ObjectPathName<T>>(key: U) => map.get(key) as ObjectPathType<T, PathSplit<U>>;
};
