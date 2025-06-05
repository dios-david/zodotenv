import type * as z3 from 'zod/v3';
import type * as z4 from 'zod/v4/core';

type Zod3Type = z3.ZodTypeAny;
type Zod4Type = z4.$ZodType;

export type ZodType = Zod3Type | Zod4Type;

export interface EnvOptions {
  secret?: boolean;
}

export type EnvWithZodType = [string, ZodType, EnvOptions?];

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

type zInfer<T> = T extends Zod3Type ? z3.infer<T> : z4.infer<T>;

export type ObjectPathType<
  T,
  PathParts extends [keyof T, ...string[]],
> = T[PathParts[0]] extends EnvWithZodType
  ? zInfer<T[PathParts[0]][1]>
  : ObjectPathType<
      T[PathParts[0]],
      PathParts extends [infer _First, ...infer Rest]
        ? Rest extends [keyof T[PathParts[0]], ...string[]]
          ? Rest
          : never
        : never
    >;
