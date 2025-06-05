<div align="center">
<h1>🔮 zodotenv</h1>

Validate and parse your environment variables like a responsible adult
</div>

## Installation

Use your favourite package manager to install zodotenv:

```bash
npm i zodotenv

pnpm add zodotenv

bun add zodotenv

deno add npm:zodotenv
```

## Usage

### Define your configuration
```ts
// Zod 3, Zod 4 and Zod 4 Mini schemas are all supported
import { z } from 'zod';
import { zodotenv } from 'zodotenv';

const config = zodotenv({
  name: ['NAME', z.string().default('my-app')],
  port: ['PORT', z.coerce.number().default(3000)],
  http2: ['HTTP2', z.string().transform((s) => s === 'true')],
  database: {
    host: ['DB_HOST', z.string()],
    driver: ['DB_DRIVER', z.enum(['mysql', 'pgsql', 'sqlite'])],
    tables: ['DB_TABLES', z.preprocess((s) => s.split(','), z.array(z.string()))],
  },
  credentials: {
    username: ['USERNAME', z.string()],
    password: ['PASSWORD', z.string(), { secret: true }],
  },
});
```

⚠️ _If the environment variable doesn’t match the Zod schema, zodotenv will throw an error. Simple as that._


### Grab your values with `config(...)`

It returns the parsed and validated values including the inferred TypeScript types.

You can even dive into nested values using an object-path-style string, with autocompletion and TypeScript validation to help you out.

```ts
config('port'); // number
config('database.driver'); // 'mysql' | 'pgsql' | 'sqlite'
config('database.tables'); // string[]

config('something.which.does.not.exist');
// ^^^ TypeScript will call you out on this one
```

### Serialise your configuration
You can serialise your entire configuration object to JSON. This is useful for
logging or debugging purposes.

```ts
console.log(JSON.stringify(config, null, 2));

// or

console.log(config.toJSON());
```

> [!TIP]
> Any configuration entries marked with `{ secret: true }` will have their values
> masked when serialising to JSON, ensuring that sensitive information is not exposed.

#### Example
```ts
const config = zodotenv({
  port: ['PORT', z.coerce.number().default(3000)],
  database: {
    host: ['DB_HOST', z.string()],
    password: ['DB_PASSWORD', z.string(), { secret: true }],
  },
});

console.log(JSON.stringify(config, null, 2));
// Output:
//  {
//    "port": 3000,
//    "database.host": "localhost:5432",
//    "database.password": "*********"
//  }
```

## Tips

Check out [Zod schemas](https://zod.dev/) if you haven't already!

Since all environment variables are strings, you might need to use `.coerce` / `.transform()` / `.preprocess()` / `.stringbool()` to convert them to the type you need:

```ts
// Boolean, e.g. `HTTP2=true`
z.string().transform((s) => s === 'true')

// Boolean from a "boolish" string when using Zod v4, e.g. `HTTP2=enabled`
z.stringbool();

// Number, e.g. `PORT=3000`
z.coerce.number()

// Comma-separated list to string array, e.g. `DB_TABLES=users,posts` -> ["users", "posts"]
z.preprocess((v) => String(v).split(','), z.array(z.string()))

// JSON string to object, e.g. `CONFIG={"key":"value"}` -> {key: "value"}
z.string().transform((s) => JSON.parse(s)).pipe(
  z.object({ key: z.string() })
)
```
