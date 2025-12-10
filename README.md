# cors-edge

You are writing a very simple functions that runs on edge (either on Cloudflare Workers, Fastly Edge Compute, Vercel Edge Functions, etc.) consisting of less than 100 lines of code. You want to enable CORS (Cross-Origin Resource Sharing) for your endpoint but you do not want to pull in a heavy framework with middlewares just for that. This platform-agnostic package provides a simple way to add CORS support with minimal footprint (with only `924 bytes` added to your bundle).

## Installation

```bash
npm install cors-edge
yarn add cors-edge
pnpm add cors-edge
```

## Usage

```ts
import { createCors } from 'cors-edge';

// Pre-define the "cors" function with your options.
const cors = createCors();

export function fetch(req: Request) {
  // "cors-edge" is platform agnostic, it doesn't assume where you are deploying.
  //
  // instead of wrapping your request handler and response CORS preflight for you,
  // you will need to call "cors" yourself.
  if (req.method === 'OPTIONS') {
    return cors(req, new Response(null, { status: 204 }));
  }

  // Your logic goes here
  const resp = Response.json({ message: 'Hello, world!' });

  // Use "cors" to attach CORS headers before returning the response.
  return cors(req, resp);
}
```

## Options

All options are optional.

**origin**: `string | string[] | ((origin: string) => Promise<string | undefined | null> | string | undefined | null)`

The value of `Access-Control-Allow-Origin` header. You can also pass the callback function like `origin: (origin) => (origin.endsWith('.example.com') ? origin : 'http://example.com')` to dynamically determine allowed methods based on the origin. The default is `*`.

**allowMethods**: `string[] | (origin: string) => Promise<string[]> | string[]`

The value of `Access-Control-Allow-Methods` header. You can also pass a callback function to dynamically determine allowed methods based on the origin. The default is `['GET', 'HEAD', 'POST', 'OPTIONS']`.

**allowHeaders**: `string[]`

The value of `Access-Control-Allow-Headers` header. The default is `[]`.

**maxAge**: `number`

The value of `Access-Control-Max-Age` header in seconds.

**credentials**: `boolean`

Whether to set `Access-Control-Allow-Credentials: true`. The default is `false`.

**exposeHeaders**: `string[]`

The value of `Access-Control-Expose-Headers` header. The default is `[]`.

## License

[MIT](./LICENSE)

----

**cors-edge** © [Sukka](https://github.com/SukkaW), Released under the [MIT](./LICENSE) License.
Authored and maintained by Sukka with help from contributors ([list](https://github.com/SukkaW/cors-edge/graphs/contributors)).

> [Personal Website](https://skk.moe) · [Blog](https://blog.skk.moe) · GitHub [@SukkaW](https://github.com/SukkaW) · Telegram Channel [@SukkaChannel](https://t.me/SukkaChannel) · Mastodon [@sukka@acg.mn](https://acg.mn/@sukka) · Twitter [@isukkaw](https://twitter.com/isukkaw) · Keybase [@sukka](https://keybase.io/sukka)

<p align="center">
  <a href="https://github.com/sponsors/SukkaW/">
    <img src="https://sponsor.cdn.skk.moe/sponsors.svg"/>
  </a>
</p>

