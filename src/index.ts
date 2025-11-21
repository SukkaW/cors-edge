import { fastStringArrayJoin } from 'foxts/fast-string-array-join';

export interface CorsOptions {
  origin:
    | string
    | string[]
    | ((origin: string) => Promise<string | undefined | null> | string | undefined | null),
  allowMethods?: string[] | ((origin: string) => Promise<string[]> | string[]),
  allowHeaders?: string[],
  maxAge?: number,
  credentials?: boolean,
  exposeHeaders?: string[]
};

const defaults: CorsOptions = {
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
  allowHeaders: [],
  exposeHeaders: []
};

const ACCESS_CONTROL_PREFIX = 'Access-Control-';
const VARY = 'Vary';

/**
 * A very simple CORS implementation for using in simple serverless workers
 *
 * Example usage:
 *
 * ```ts
 * const cors = createCors();
 *
 * export function fetch(req: Request) {
 *   if (req.method === 'OPTIONS') {
 *     return cors(req, new Response(null, { status: 204 });
 *   }
 *   const resp = Response.json({ message: 'Hello, world!' });
 *   return cors(req, resp);
 * }
 * ```
 */
export function createCors(options?: CorsOptions) {
  const opts = {
    ...defaults,
    ...options
  };

  let findAllowOrigin: (origin: string) => Promise<string | undefined | null> | string | undefined | null;
  const optsOrigin = opts.origin;
  if (typeof optsOrigin === 'string') {
    if (optsOrigin === '*') {
      findAllowOrigin = () => '*';
    } else {
      findAllowOrigin = (origin: string) => (optsOrigin === origin ? origin : null);
    }
  } else if (typeof optsOrigin === 'function') {
    findAllowOrigin = optsOrigin;
  } else {
    const allowedOrigins = new Set(optsOrigin);
    findAllowOrigin = (origin: string) => (allowedOrigins.has(origin) ? origin : null);
  }

  let findAllowMethods: (origin: string) => Promise<string[]> | string[];
  const optsAllowMethods = opts.allowMethods;
  if (typeof optsAllowMethods === 'function') {
    findAllowMethods = optsAllowMethods;
  } else if (Array.isArray(optsAllowMethods)) {
    findAllowMethods = () => optsAllowMethods;
  } else {
    findAllowMethods = () => [];
  }

  const shouldVaryIncludeOrigin = optsOrigin !== '*';

  return async function simpleCors(request: Request, response: Response): Promise<Response> {
    const originHeaderValue = request.headers.get('Origin') || '';
    let allowOrigin = findAllowOrigin(originHeaderValue);
    if (allowOrigin && typeof allowOrigin === 'object' && 'then' in allowOrigin) {
      allowOrigin = await allowOrigin;
    }
    if (allowOrigin) {
      response.headers.set(ACCESS_CONTROL_PREFIX + 'Allow-Origin', allowOrigin);
    }
    // Suppose the server sends a response with an Access-Control-Allow-Origin value with an explicit origin (rather than the "*" wildcard).
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    if (shouldVaryIncludeOrigin) {
      const existingVary = request.headers.get(VARY);

      if (existingVary) {
        response.headers.set(VARY, existingVary);
      } else {
        response.headers.set(VARY, 'Origin');
      }
    }
    if (opts.credentials) {
      response.headers.set(ACCESS_CONTROL_PREFIX + 'Allow-Credentials', 'true');
    }
    if (opts.exposeHeaders?.length) {
      response.headers.set(ACCESS_CONTROL_PREFIX + 'Expose-Headers', fastStringArrayJoin(opts.exposeHeaders, ','));
    }

    let allowMethods = findAllowMethods(originHeaderValue);
    if ('then' in allowMethods) {
      allowMethods = await allowMethods;
    }
    if (allowMethods.length) {
      response.headers.set(ACCESS_CONTROL_PREFIX + 'Allow-Methods', fastStringArrayJoin(allowMethods, ','));
    }

    if (request.method === 'OPTIONS') {
      if (opts.maxAge != null) {
        response.headers.set(ACCESS_CONTROL_PREFIX + 'Max-Age', opts.maxAge.toString());
      }

      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = request.headers.get(ACCESS_CONTROL_PREFIX + 'Request-Headers');
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        response.headers.set(ACCESS_CONTROL_PREFIX + 'Allow-Headers', fastStringArrayJoin(headers, ','));
        response.headers.append(VARY, ACCESS_CONTROL_PREFIX + 'Request-Headers');
      }

      // return new Response(null, {
      //   headers: c.res.headers,
      //   status: 204,
      //   statusText: 'No Content'
      // });
    }

    return response;
  };
}
