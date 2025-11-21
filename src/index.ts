/* eslint-disable antfu/top-level-function -- bundle size hack */

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
const ALLOW_PREFIX = 'Allow-';
const VARY = 'Vary';
const ORIGIN = 'Origin';
const HEADERS = 'Headers';

const setHeader = (response: Response, name: string, value: string) => response.headers.set(name, value);

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
export const createCors = (options?: CorsOptions) => {
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
  const exposeHeaders = opts.exposeHeaders || [];

  return async (request: Request, response: Response): Promise<Response> => {
    const originHeaderValue = request.headers.get(ORIGIN) || '';
    let allowOrigin = findAllowOrigin(originHeaderValue);
    if (allowOrigin && typeof allowOrigin === 'object' && 'then' in allowOrigin) {
      allowOrigin = await allowOrigin;
    }
    if (allowOrigin) {
      setHeader(response, ACCESS_CONTROL_PREFIX + ALLOW_PREFIX + ORIGIN, allowOrigin);
    }
    // Suppose the server sends a response with an Access-Control-Allow-Origin value with an explicit origin (rather than the "*" wildcard).
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    if (shouldVaryIncludeOrigin) {
      setHeader(response, VARY, request.headers.get(VARY) /** existing Vary */ || ORIGIN);
    }
    if (opts.credentials) {
      setHeader(response, ACCESS_CONTROL_PREFIX + ALLOW_PREFIX + 'Credentials', 'true');
    }
    if (exposeHeaders.length) {
      setHeader(response, ACCESS_CONTROL_PREFIX + 'Expose-' + HEADERS, exposeHeaders.join(','));
    }

    let allowMethods = findAllowMethods(originHeaderValue);
    if ('then' in allowMethods) {
      allowMethods = await allowMethods;
    }
    if (allowMethods.length) {
      setHeader(response, ACCESS_CONTROL_PREFIX + ALLOW_PREFIX + 'Methods', allowMethods.join(','));
    }

    if (request.method === 'OPTIONS') {
      if (opts.maxAge != null) {
        setHeader(response, ACCESS_CONTROL_PREFIX + 'Max-Age', '' + opts.maxAge);
      }

      let headers = opts.allowHeaders;
      const ACCESS_CONTROL_REQUEST_HEADERS = ACCESS_CONTROL_PREFIX + 'Request-' + HEADERS;
      if (!headers?.length) {
        const requestHeaders = request.headers.get(ACCESS_CONTROL_REQUEST_HEADERS);
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        setHeader(response, ACCESS_CONTROL_PREFIX + ALLOW_PREFIX + HEADERS, headers.join(','));
        response.headers.append(VARY, ACCESS_CONTROL_REQUEST_HEADERS);
      }

      // return new Response(null, {
      //   headers: c.res.headers,
      //   status: 204,
      //   statusText: 'No Content'
      // });
    }

    return response;
  };
};
