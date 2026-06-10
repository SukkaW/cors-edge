/* eslint-disable antfu/top-level-function -- bundle size hack */

export interface CorsOptions {
  origin?:
    | string
    | string[]
    | ((origin: string) => Promise<string | undefined | null> | string | undefined | null),
  allowMethods?: string[] | ((origin: string) => Promise<string[]> | string[]),
  allowHeaders?: string[],
  maxAge?: number,
  credentials?: boolean,
  exposeHeaders?: string[]
};

const ACCESS_CONTROL_PREFIX = 'Access-Control-';
const ALLOW_PREFIX = 'Allow-';
const VARY = 'Vary';
const ORIGIN = 'Origin';
const HEADERS = 'Headers';

const isArray = Array.isArray;

const HEADERS_ = 'headers' as const;

interface StringArrayJoinWithComma {
  (arr: string[]): string,
  (arr: undefined | null): undefined,
  (arr: string[] | undefined | null): string | undefined
}
const stringArrayJoinWithComma: StringArrayJoinWithComma = ((arr) => arr?.join(',')) as StringArrayJoinWithComma;

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
export const createCors = ({
  origin: optsOrigin = '*',
  allowMethods: optsAllowMethods = [
    // These are CORS-safelisted methods, they are always allowed, regardless of whether they are specified in this header
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Methods
    /* 'GET', 'HEAD', 'POST', */
    'PUT', 'DELETE', 'PATCH'
  ],
  allowHeaders: optsAllowHeaders,
  maxAge: optsMaxAge,
  credentials: optsCredentials = false,
  exposeHeaders: optsExposeHeaders
}: CorsOptions = {}) => {
  let findAllowOrigin: (origin: string) => Promise<string | undefined | null> | string | undefined | null;
  if (typeof optsOrigin === 'string') {
    if (optsOrigin === '*') {
      findAllowOrigin = () => optsOrigin;
    } else {
      findAllowOrigin = (origin: string) => (optsOrigin === origin ? origin : null);
    }
  } else if (isArray(optsOrigin)) {
    const allowedOrigins = new Set(optsOrigin);
    findAllowOrigin = (origin: string) => (allowedOrigins.has(origin) ? origin : null);
  } else {
    findAllowOrigin = optsOrigin;
  }

  let findAllowMethods: (origin: string) => Promise<string[]> | string[];
  if (isArray(optsAllowMethods)) {
    findAllowMethods = () => optsAllowMethods;
  } else if (typeof optsAllowMethods === 'function') {
    findAllowMethods = optsAllowMethods;
  } else {
    findAllowMethods = () => [];
  }

  const shouldVaryIncludeOrigin = optsOrigin !== '*';
  const exposeHeaders = stringArrayJoinWithComma(optsExposeHeaders);
  const joinedAllowHeaders = stringArrayJoinWithComma(optsAllowHeaders);

  return async (request: Request, response: Response): Promise<Response> => {
    const setHeader = (name: string, value: string) => response[HEADERS_].set(name, value);
    const getHeader = (name: string) => request[HEADERS_].get(name);

    const originHeaderValue = getHeader(ORIGIN) || '';
    const allowOrigin = await findAllowOrigin(originHeaderValue);
    if (allowOrigin) {
      setHeader(ACCESS_CONTROL_PREFIX + ALLOW_PREFIX + ORIGIN, allowOrigin);
    }
    // Suppose the server sends a response with an Access-Control-Allow-Origin value with an explicit origin (rather than the "*" wildcard).
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    if (shouldVaryIncludeOrigin) {
      setHeader(VARY, getHeader(VARY) /** existing Vary */ || ORIGIN);
    }
    if (optsCredentials) {
      setHeader(ACCESS_CONTROL_PREFIX + ALLOW_PREFIX + 'Credentials', '' + optsCredentials);
    }
    if (exposeHeaders) {
      setHeader(ACCESS_CONTROL_PREFIX + 'Expose-' + HEADERS, exposeHeaders);
    }

    if (request.method === 'OPTIONS') {
      if (optsMaxAge != null) {
        setHeader(ACCESS_CONTROL_PREFIX + 'Max-Age', '' + optsMaxAge);
      }

      const allowMethods = await findAllowMethods(originHeaderValue);
      if (allowMethods.length) {
        setHeader(ACCESS_CONTROL_PREFIX + ALLOW_PREFIX + 'Methods', stringArrayJoinWithComma(allowMethods));
      }

      const ACCESS_CONTROL_REQUEST_HEADERS = ACCESS_CONTROL_PREFIX + 'Request-' + HEADERS;
      const allowHeader = joinedAllowHeaders || getHeader(ACCESS_CONTROL_REQUEST_HEADERS);
      if (allowHeader) {
        setHeader(ACCESS_CONTROL_PREFIX + ALLOW_PREFIX + HEADERS, allowHeader);
        response[HEADERS_].append(VARY, ACCESS_CONTROL_REQUEST_HEADERS);
      }
    }

    return response;
  };
};
