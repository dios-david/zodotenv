import type { z } from 'zod';

export interface EnvOptions {
  secret?: boolean;
}

export type EnvWithZodType = [string, z.ZodType, EnvOptions?];

export interface ZodotenvConfig {
  [name: string]: ZodotenvConfig | EnvWithZodType;
}

// -- To make object-path-like strings work to access nested configs
export type PathSplit<S extends string> = S extends `${infer T}.${infer U}`
  ? [T, ...PathSplit<U>]
  : [S];

type Depths = [never, 0, 1, 2, 3, 4];

export type ObjectPathName<T, Prefix = '', Depth extends number = 5> = {
  [Key in keyof T]: Depth extends never
    ? never
    : T[Key] extends EnvWithZodType
      ? `${string & Prefix}${string & Key}`
      : ObjectPathName<T[Key], `${string & Prefix}${string & Key}.`, Depths[Depth]>;
}[keyof T];

export type ObjectPathType<
  T,
  PathParts extends [keyof T, ...string[]],
> = T[PathParts[0]] extends EnvWithZodType
  ? z.infer<T[PathParts[0]][1]>
  : ObjectPathType<
      T[PathParts[0]],
      PathParts extends [infer _First, ...infer Rest]
        ? Rest extends [keyof T[PathParts[0]], ...string[]]
          ? Rest
          : never
        : never
    >;
