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

> [!CAUTION]
> If the environment variable doesn’t match the Zod schema, zodotenv will throw an error. Simple as that.


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

### Serialize your configuration
You can serialize your entire configuration object to JSON. This is useful for
logging or debugging purposes.

```ts
console.log(JSON.stringify(config, null, 2));
```

> [!TIP]
> Any configuration entries marked with `{ secret: true }` will have their values
> masked when serializing to JSON, ensuring that sensitive information is not exposed.

#### Example output
```json
{
  "name": "my-app",
  "port": 3000,
  "http2": true,
  "database.host": "localhost",
  "database.driver": "mysql",
  "database.tables": ["users", "posts"],
  "credentials.username": "admin",
  "credentials.password": "*********"
}
```

## Tips

Check out [Zod schemas](https://zod.dev/) if you haven't already!

Since all environment variables are strings, you can use Zod's `.coerce()` or `.transform()` methods to convert them to the type you need:

```ts
// Boolean, e.g. `HTTP2=true`
z.string().transform((s) => s === 'true')

// Number, e.g. `PORT=3000`
z.coerce.number()

// Comma-separated list to string array, e.g. `DB_TABLES=users,posts` -> ["users", "posts"]
z.preprocess((v) => String(v).split(','), z.array(z.string()))

// JSON string to object, e.g. `CONFIG={"key":"value"}` -> {key: "value"}
z.string().transform((s) => JSON.parse(s)).pipe(
  z.object({ key: z.string() })
)
```
