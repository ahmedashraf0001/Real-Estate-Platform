
import {Buffer} from "node:buffer";
globalThis.Buffer = Buffer;

import {AsyncLocalStorage} from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;


const defaultDefineProperty = Object.defineProperty;
Object.defineProperty = function(o, p, a) {
  if(p=== '__import_unsupported' && Boolean(globalThis.__import_unsupported)) {
    return;
  }
  return defaultDefineProperty(o, p, a);
};

  
  
  globalThis.openNextDebug = false;globalThis.openNextVersion = "4.1.0";globalThis.nextVersion = "16.3.0";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@opennextjs/aws/dist/utils/error.js
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}
var init_error = __esm({
  "node_modules/@opennextjs/aws/dist/utils/error.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}
var DOWNPLAYED_ERROR_LOGS, isDownplayedErrorLog;
var init_logger = __esm({
  "node_modules/@opennextjs/aws/dist/adapters/logger.js"() {
    init_error();
    DOWNPLAYED_ERROR_LOGS = [
      {
        clientName: "S3Client",
        commandName: "GetObjectCommand",
        errorName: "NoSuchKey"
      }
    ];
    isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
  }
});

// node_modules/cookie/dist/index.js
var require_dist = __commonJS({
  "node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCookie = parseCookie;
    exports.parse = parseCookie;
    exports.stringifyCookie = stringifyCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    exports.parseSetCookie = parseSetCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var maxAgeRegExp = /^-?\d+$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = function() {
      };
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parseCookie(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = eqIndex(str, index, len);
        if (eqIdx === -1)
          break;
        const endIdx = endIndex(str, index, len);
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const key = valueSlice(str, index, eqIdx);
        if (obj[key] === void 0) {
          obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function stringifyCookie(cookie, options) {
      const enc = options?.encode || encodeURIComponent;
      const cookieStrings = [];
      for (const name of Object.keys(cookie)) {
        const val = cookie[name];
        if (val === void 0)
          continue;
        if (!cookieNameRegExp.test(name)) {
          throw new TypeError(`cookie name is invalid: ${name}`);
        }
        const value = enc(val);
        if (!cookieValueRegExp.test(value)) {
          throw new TypeError(`cookie val is invalid: ${val}`);
        }
        cookieStrings.push(`${name}=${value}`);
      }
      return cookieStrings.join("; ");
    }
    function stringifySetCookie(_name, _val, _opts) {
      const cookie = typeof _name === "object" ? _name : { ..._opts, name: _name, value: String(_val) };
      const options = typeof _val === "object" ? _val : _opts;
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(cookie.name)) {
        throw new TypeError(`argument name is invalid: ${cookie.name}`);
      }
      const value = cookie.value ? enc(cookie.value) : "";
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${cookie.value}`);
      }
      let str = cookie.name + "=" + value;
      if (cookie.maxAge !== void 0) {
        if (!Number.isInteger(cookie.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
        }
        str += "; Max-Age=" + cookie.maxAge;
      }
      if (cookie.domain) {
        if (!domainValueRegExp.test(cookie.domain)) {
          throw new TypeError(`option domain is invalid: ${cookie.domain}`);
        }
        str += "; Domain=" + cookie.domain;
      }
      if (cookie.path) {
        if (!pathValueRegExp.test(cookie.path)) {
          throw new TypeError(`option path is invalid: ${cookie.path}`);
        }
        str += "; Path=" + cookie.path;
      }
      if (cookie.expires) {
        if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${cookie.expires}`);
        }
        str += "; Expires=" + cookie.expires.toUTCString();
      }
      if (cookie.httpOnly) {
        str += "; HttpOnly";
      }
      if (cookie.secure) {
        str += "; Secure";
      }
      if (cookie.partitioned) {
        str += "; Partitioned";
      }
      if (cookie.priority) {
        const priority = typeof cookie.priority === "string" ? cookie.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${cookie.priority}`);
        }
      }
      if (cookie.sameSite) {
        const sameSite = typeof cookie.sameSite === "string" ? cookie.sameSite.toLowerCase() : cookie.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
        }
      }
      return str;
    }
    function parseSetCookie(str, options) {
      const dec = options?.decode || decode;
      const len = str.length;
      const endIdx = endIndex(str, 0, len);
      const eqIdx = eqIndex(str, 0, endIdx);
      const setCookie = eqIdx === -1 ? { name: "", value: dec(valueSlice(str, 0, endIdx)) } : {
        name: valueSlice(str, 0, eqIdx),
        value: dec(valueSlice(str, eqIdx + 1, endIdx))
      };
      let index = endIdx + 1;
      while (index < len) {
        const endIdx2 = endIndex(str, index, len);
        const eqIdx2 = eqIndex(str, index, endIdx2);
        const attr = eqIdx2 === -1 ? valueSlice(str, index, endIdx2) : valueSlice(str, index, eqIdx2);
        const val = eqIdx2 === -1 ? void 0 : valueSlice(str, eqIdx2 + 1, endIdx2);
        switch (attr.toLowerCase()) {
          case "httponly":
            setCookie.httpOnly = true;
            break;
          case "secure":
            setCookie.secure = true;
            break;
          case "partitioned":
            setCookie.partitioned = true;
            break;
          case "domain":
            setCookie.domain = val;
            break;
          case "path":
            setCookie.path = val;
            break;
          case "max-age":
            if (val && maxAgeRegExp.test(val))
              setCookie.maxAge = Number(val);
            break;
          case "expires":
            if (!val)
              break;
            const date = new Date(val);
            if (Number.isFinite(date.valueOf()))
              setCookie.expires = date;
            break;
          case "priority":
            if (!val)
              break;
            const priority = val.toLowerCase();
            if (priority === "low" || priority === "medium" || priority === "high") {
              setCookie.priority = priority;
            }
            break;
          case "samesite":
            if (!val)
              break;
            const sameSite = val.toLowerCase();
            if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
              setCookie.sameSite = sameSite;
            }
            break;
        }
        index = endIdx2 + 1;
      }
      return setCookie;
    }
    function endIndex(str, min, len) {
      const index = str.indexOf(";", min);
      return index === -1 ? len : index;
    }
    function eqIndex(str, min, max) {
      const index = str.indexOf("=", min);
      return index < max ? index : -1;
    }
    function valueSlice(str, min, max) {
      let start = min;
      let end = max;
      do {
        const code = str.charCodeAt(start);
        if (code !== 32 && code !== 9)
          break;
      } while (++start < end);
      while (end > start) {
        const code = str.charCodeAt(end - 1);
        if (code !== 32 && code !== 9)
          break;
        end--;
      }
      return str.slice(start, end);
    }
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
  }
});

// node_modules/@opennextjs/aws/dist/http/util.js
function parseSetCookieHeader(cookies) {
  if (!cookies) {
    return [];
  }
  if (typeof cookies === "string") {
    return cookies.split(/(?<!Expires=\w+),/i).map((c) => c.trim());
  }
  return cookies;
}
function getQueryFromIterator(it) {
  const query = {};
  for (const [key, value] of it) {
    if (key in query) {
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }
  return query;
}
var init_util = __esm({
  "node_modules/@opennextjs/aws/dist/http/util.js"() {
    init_logger();
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/utils.js
function getQueryFromSearchParams(searchParams) {
  return getQueryFromIterator(searchParams.entries());
}
var init_utils = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/utils.js"() {
    init_util();
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/edge.js
var edge_exports = {};
__export(edge_exports, {
  default: () => edge_default
});
import { Buffer as Buffer2 } from "node:buffer";
var import_cookie, NULL_BODY_STATUSES, converter, edge_default;
var init_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/edge.js"() {
    import_cookie = __toESM(require_dist(), 1);
    init_util();
    init_utils();
    NULL_BODY_STATUSES = /* @__PURE__ */ new Set([101, 103, 204, 205, 304]);
    converter = {
      convertFrom: async (event) => {
        const url = new URL(event.url);
        const searchParams = url.searchParams;
        const query = getQueryFromSearchParams(searchParams);
        const headers = {};
        event.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const rawPath = url.pathname;
        const method = event.method;
        const shouldHaveBody = method !== "GET" && method !== "HEAD";
        const body = shouldHaveBody ? Buffer2.from(await event.arrayBuffer()) : void 0;
        const cookieHeader = event.headers.get("cookie");
        const cookies = cookieHeader ? import_cookie.default.parse(cookieHeader) : {};
        return {
          type: "core",
          method,
          rawPath,
          url: event.url,
          body,
          headers,
          remoteAddress: event.headers.get("x-forwarded-for") ?? "::1",
          query,
          cookies
        };
      },
      convertTo: async (result) => {
        if ("internalEvent" in result) {
          const request = new Request(result.internalEvent.url, {
            body: result.internalEvent.body,
            method: result.internalEvent.method,
            headers: {
              ...result.internalEvent.headers,
              "x-forwarded-host": result.internalEvent.headers.host
            }
          });
          if (globalThis.__dangerous_ON_edge_converter_returns_request === true) {
            return request;
          }
          const cfCache = (result.isISR || result.internalEvent.rawPath.startsWith("/_next/image")) && process.env.DISABLE_CACHE !== "true" ? { cacheEverything: true } : {};
          return fetch(request, {
            // This is a hack to make sure that the response is cached by Cloudflare
            // See https://developers.cloudflare.com/workers/examples/cache-using-fetch/#caching-html-resources
            // @ts-expect-error - This is a Cloudflare specific option
            cf: cfCache
          });
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(result.headers)) {
          if (key === "set-cookie" && typeof value === "string") {
            const cookies = parseSetCookieHeader(value);
            for (const cookie of cookies) {
              headers.append(key, cookie);
            }
            continue;
          }
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, value);
          }
        }
        const body = NULL_BODY_STATUSES.has(result.statusCode) ? null : result.body;
        return new Response(body, {
          status: result.statusCode,
          headers
        });
      },
      name: "edge"
    };
    edge_default = converter;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js
var cloudflare_edge_exports = {};
__export(cloudflare_edge_exports, {
  default: () => cloudflare_edge_default
});
var cfPropNameMapping, handler, cloudflare_edge_default;
var init_cloudflare_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js"() {
    cfPropNameMapping = {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: [encodeURIComponent, "x-open-next-city"],
      country: "x-open-next-country",
      regionCode: "x-open-next-region",
      latitude: "x-open-next-latitude",
      longitude: "x-open-next-longitude"
    };
    handler = async (handler3, converter2) => async (request, env, ctx) => {
      globalThis.process = process;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
      const internalEvent = await converter2.convertFrom(request);
      const cfProperties = request.cf;
      for (const [propName, mapping] of Object.entries(cfPropNameMapping)) {
        const propValue = cfProperties?.[propName];
        if (propValue != null) {
          const [encode, headerName] = Array.isArray(mapping) ? mapping : [null, mapping];
          internalEvent.headers[headerName] = encode ? encode(propValue) : propValue;
        }
      }
      const response = await handler3(internalEvent, {
        waitUntil: ctx.waitUntil.bind(ctx)
      });
      const result = await converter2.convertTo(response);
      return result;
    };
    cloudflare_edge_default = {
      wrapper: handler,
      name: "cloudflare-edge",
      supportStreaming: true,
      edgeRuntime: true
    };
  }
});

// node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js
var pattern_env_exports = {};
__export(pattern_env_exports, {
  default: () => pattern_env_default
});
function initializeOnce() {
  if (initialized)
    return;
  cachedOrigins = JSON.parse(process.env.OPEN_NEXT_ORIGIN ?? "{}");
  const functions = globalThis.openNextConfig.functions ?? {};
  for (const key in functions) {
    if (key !== "default") {
      const value = functions[key];
      const regexes = [];
      for (const pattern of value.patterns) {
        const regexPattern = `/${pattern.replace(/\*\*/g, "(.*)").replace(/\*/g, "([^/]*)").replace(/\//g, "\\/").replace(/\?/g, ".")}`;
        regexes.push(new RegExp(regexPattern));
      }
      cachedPatterns.push({
        key,
        patterns: value.patterns,
        regexes
      });
    }
  }
  initialized = true;
}
var cachedOrigins, cachedPatterns, initialized, envLoader, pattern_env_default;
var init_pattern_env = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js"() {
    init_logger();
    cachedPatterns = [];
    initialized = false;
    envLoader = {
      name: "env",
      resolve: async (_path) => {
        try {
          initializeOnce();
          for (const { key, patterns, regexes } of cachedPatterns) {
            for (const regex of regexes) {
              if (regex.test(_path)) {
                debug("Using origin", key, patterns);
                return cachedOrigins[key];
              }
            }
          }
          if (_path.startsWith("/_next/image") && cachedOrigins.imageOptimizer) {
            debug("Using origin", "imageOptimizer", _path);
            return cachedOrigins.imageOptimizer;
          }
          if (cachedOrigins.default) {
            debug("Using default origin", cachedOrigins.default, _path);
            return cachedOrigins.default;
          }
          return false;
        } catch (e) {
          error("Error while resolving origin", e);
          return false;
        }
      }
    };
    pattern_env_default = envLoader;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js
var dummy_exports = {};
__export(dummy_exports, {
  default: () => dummy_default
});
var resolver, dummy_default;
var init_dummy = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js"() {
    resolver = {
      name: "dummy"
    };
    dummy_default = resolver;
  }
});

// node_modules/@opennextjs/aws/dist/utils/stream.js
import { ReadableStream as ReadableStream2 } from "node:stream/web";
function toReadableStream(value, isBase64) {
  return new ReadableStream2({
    pull(controller) {
      controller.enqueue(Buffer.from(value, isBase64 ? "base64" : "utf8"));
      controller.close();
    }
  }, { highWaterMark: 0 });
}
function emptyReadableStream() {
  if (process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
    return new ReadableStream2({
      pull(controller) {
        maybeSomethingBuffer ??= Buffer.from("SOMETHING");
        controller.enqueue(maybeSomethingBuffer);
        controller.close();
      }
    }, { highWaterMark: 0 });
  }
  return new ReadableStream2({
    start(controller) {
      controller.close();
    }
  });
}
var maybeSomethingBuffer;
var init_stream = __esm({
  "node_modules/@opennextjs/aws/dist/utils/stream.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js
var fetch_exports = {};
__export(fetch_exports, {
  default: () => fetch_default
});
var fetchProxy, fetch_default;
var init_fetch = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js"() {
    init_stream();
    fetchProxy = {
      name: "fetch-proxy",
      // @ts-ignore
      proxy: async (internalEvent) => {
        const { url, headers: eventHeaders, method, body } = internalEvent;
        const headers = Object.fromEntries(Object.entries(eventHeaders).filter(([key]) => key.toLowerCase() !== "cf-connecting-ip"));
        const response = await fetch(url, {
          method,
          headers,
          body
        });
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          const cur = responseHeaders[key];
          if (cur === void 0) {
            responseHeaders[key] = value;
          } else if (Array.isArray(cur)) {
            cur.push(value);
          } else {
            responseHeaders[key] = [cur, value];
          }
        });
        return {
          type: "core",
          headers: responseHeaders,
          statusCode: response.status,
          isBase64Encoded: true,
          body: response.body ?? emptyReadableStream()
        };
      }
    };
    fetch_default = fetchProxy;
  }
});

// .next/server/edge/chunks/node_modules_next_dist_esm_build_templates_edge-wrapper_0_kjzx3.js
var require_node_modules_next_dist_esm_build_templates_edge_wrapper_0_kjzx3 = __commonJS({
  ".next/server/edge/chunks/node_modules_next_dist_esm_build_templates_edge-wrapper_0_kjzx3.js"() {
    "use strict";
    (globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/node_modules_next_dist_esm_build_templates_edge-wrapper_0_kjzx3.js", 35825, (e, t, l) => {
      self._ENTRIES ||= {};
      let n = Promise.resolve().then(() => e.i(58217));
      n.catch(() => {
      }), self._ENTRIES.middleware_middleware = new Proxy(n, { get(e2, t2) {
        if ("then" === t2) return (t3, l3) => e2.then(t3, l3);
        let l2 = (...l3) => e2.then((e3) => (0, e3[t2])(...l3));
        return l2.then = (l3, n2) => e2.then((e3) => e3[t2]).then(l3, n2), l2;
      } });
    }]);
  }
});

// node-built-in-modules:node:buffer
var node_buffer_exports = {};
import * as node_buffer_star from "node:buffer";
var init_node_buffer = __esm({
  "node-built-in-modules:node:buffer"() {
    __reExport(node_buffer_exports, node_buffer_star);
  }
});

// node-built-in-modules:node:async_hooks
var node_async_hooks_exports = {};
import * as node_async_hooks_star from "node:async_hooks";
var init_node_async_hooks = __esm({
  "node-built-in-modules:node:async_hooks"() {
    __reExport(node_async_hooks_exports, node_async_hooks_star);
  }
});

// .next/server/edge/chunks/[root-of-the-server]__0z5ie0n._.js
var require_root_of_the_server_0z5ie0n = __commonJS({
  ".next/server/edge/chunks/[root-of-the-server]__0z5ie0n._.js"() {
    "use strict";
    (globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__0z5ie0n._.js", 74398, (e, t, r) => {
    }, 28042, (e, t, r) => {
      "use strict";
      var n = Object.defineProperty, a = Object.getOwnPropertyDescriptor, i = Object.getOwnPropertyNames, o = Object.prototype.hasOwnProperty, s = {}, l = { RequestCookies: () => _, ResponseCookies: () => g, parseCookie: () => c, parseSetCookie: () => p, stringifyCookie: () => u };
      for (var d in l) n(s, d, { get: l[d], enumerable: true });
      function u(e2) {
        var t2;
        let r2 = ["path" in e2 && e2.path && `Path=${e2.path}`, "expires" in e2 && (e2.expires || 0 === e2.expires) && `Expires=${("number" == typeof e2.expires ? new Date(e2.expires) : e2.expires).toUTCString()}`, "maxAge" in e2 && "number" == typeof e2.maxAge && `Max-Age=${e2.maxAge}`, "domain" in e2 && e2.domain && `Domain=${e2.domain}`, "secure" in e2 && e2.secure && "Secure", "httpOnly" in e2 && e2.httpOnly && "HttpOnly", "sameSite" in e2 && e2.sameSite && `SameSite=${e2.sameSite}`, "partitioned" in e2 && e2.partitioned && "Partitioned", "priority" in e2 && e2.priority && `Priority=${e2.priority}`].filter(Boolean), n2 = `${e2.name}=${encodeURIComponent(null != (t2 = e2.value) ? t2 : "")}`;
        return 0 === r2.length ? n2 : `${n2}; ${r2.join("; ")}`;
      }
      function c(e2) {
        let t2 = /* @__PURE__ */ new Map();
        for (let r2 of e2.split(/; */)) {
          if (!r2) continue;
          let e3 = r2.indexOf("=");
          if (-1 === e3) {
            t2.set(r2, "true");
            continue;
          }
          let [n2, a2] = [r2.slice(0, e3), r2.slice(e3 + 1)];
          try {
            t2.set(n2, decodeURIComponent(null != a2 ? a2 : "true"));
          } catch {
          }
        }
        return t2;
      }
      function p(e2) {
        if (!e2) return;
        let [[t2, r2], ...n2] = c(e2), { domain: a2, expires: i2, httponly: o2, maxage: s2, path: l2, samesite: d2, secure: u2, partitioned: p2, priority: _2 } = Object.fromEntries(n2.map(([e3, t3]) => [e3.toLowerCase().replace(/-/g, ""), t3]));
        {
          var g2, m, v = { name: t2, value: decodeURIComponent(r2), domain: a2, ...i2 && { expires: new Date(i2) }, ...o2 && { httpOnly: true }, ..."string" == typeof s2 && { maxAge: Number(s2) }, path: l2, ...d2 && { sameSite: h.includes(g2 = (g2 = d2).toLowerCase()) ? g2 : void 0 }, ...u2 && { secure: true }, ..._2 && { priority: f.includes(m = (m = _2).toLowerCase()) ? m : void 0 }, ...p2 && { partitioned: true } };
          let e3 = {};
          for (let t3 in v) v[t3] && (e3[t3] = v[t3]);
          return e3;
        }
      }
      t.exports = ((e2, t2, r2) => {
        if (t2 && "object" == typeof t2 || "function" == typeof t2) for (let s2 of i(t2)) o.call(e2, s2) || void 0 === s2 || n(e2, s2, { get: () => t2[s2], enumerable: !(r2 = a(t2, s2)) || r2.enumerable });
        return e2;
      })(n({}, "__esModule", { value: true }), s);
      var h = ["strict", "lax", "none"], f = ["low", "medium", "high"], _ = class {
        constructor(e2) {
          this._parsed = /* @__PURE__ */ new Map(), this._headers = e2;
          const t2 = e2.get("cookie");
          if (t2) for (const [e3, r2] of c(t2)) this._parsed.set(e3, { name: e3, value: r2 });
        }
        [Symbol.iterator]() {
          return this._parsed[Symbol.iterator]();
        }
        get size() {
          return this._parsed.size;
        }
        get(...e2) {
          let t2 = "string" == typeof e2[0] ? e2[0] : e2[0].name;
          return this._parsed.get(t2);
        }
        getAll(...e2) {
          var t2;
          let r2 = Array.from(this._parsed);
          if (!e2.length) return r2.map(([e3, t3]) => t3);
          let n2 = "string" == typeof e2[0] ? e2[0] : null == (t2 = e2[0]) ? void 0 : t2.name;
          return r2.filter(([e3]) => e3 === n2).map(([e3, t3]) => t3);
        }
        has(e2) {
          return this._parsed.has(e2);
        }
        set(...e2) {
          let [t2, r2] = 1 === e2.length ? [e2[0].name, e2[0].value] : e2, n2 = this._parsed;
          return n2.set(t2, { name: t2, value: r2 }), this._headers.set("cookie", Array.from(n2).map(([e3, t3]) => u(t3)).join("; ")), this;
        }
        delete(e2) {
          let t2 = this._parsed, r2 = Array.isArray(e2) ? e2.map((e3) => t2.delete(e3)) : t2.delete(e2);
          return this._headers.set("cookie", Array.from(t2).map(([e3, t3]) => u(t3)).join("; ")), r2;
        }
        clear() {
          return this.delete(Array.from(this._parsed.keys())), this;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map((e2) => `${e2.name}=${encodeURIComponent(e2.value)}`).join("; ");
        }
      }, g = class {
        constructor(e2) {
          var t2, r2, n2;
          this._parsed = /* @__PURE__ */ new Map(), this._headers = e2;
          const a2 = null != (n2 = null != (r2 = null == (t2 = e2.getSetCookie) ? void 0 : t2.call(e2)) ? r2 : e2.get("set-cookie")) ? n2 : [];
          for (const e3 of Array.isArray(a2) ? a2 : function(e4) {
            if (!e4) return [];
            var t3, r3, n3, a3, i2, o2 = [], s2 = 0;
            function l2() {
              for (; s2 < e4.length && /\s/.test(e4.charAt(s2)); ) s2 += 1;
              return s2 < e4.length;
            }
            for (; s2 < e4.length; ) {
              for (t3 = s2, i2 = false; l2(); ) if ("," === (r3 = e4.charAt(s2))) {
                for (n3 = s2, s2 += 1, l2(), a3 = s2; s2 < e4.length && "=" !== (r3 = e4.charAt(s2)) && ";" !== r3 && "," !== r3; ) s2 += 1;
                s2 < e4.length && "=" === e4.charAt(s2) ? (i2 = true, s2 = a3, o2.push(e4.substring(t3, n3)), t3 = s2) : s2 = n3 + 1;
              } else s2 += 1;
              (!i2 || s2 >= e4.length) && o2.push(e4.substring(t3, e4.length));
            }
            return o2;
          }(a2)) {
            const t3 = p(e3);
            t3 && this._parsed.set(t3.name, t3);
          }
        }
        get(...e2) {
          let t2 = "string" == typeof e2[0] ? e2[0] : e2[0].name;
          return this._parsed.get(t2);
        }
        getAll(...e2) {
          var t2;
          let r2 = Array.from(this._parsed.values());
          if (!e2.length) return r2;
          let n2 = "string" == typeof e2[0] ? e2[0] : null == (t2 = e2[0]) ? void 0 : t2.name;
          return r2.filter((e3) => e3.name === n2);
        }
        has(e2) {
          return this._parsed.has(e2);
        }
        set(...e2) {
          let [t2, r2, n2] = 1 === e2.length ? [e2[0].name, e2[0].value, e2[0]] : e2, a2 = this._parsed;
          return a2.set(t2, function(e3 = { name: "", value: "" }) {
            return "number" == typeof e3.expires && (e3.expires = new Date(e3.expires)), e3.maxAge && (e3.expires = new Date(Date.now() + 1e3 * e3.maxAge)), (null === e3.path || void 0 === e3.path) && (e3.path = "/"), e3;
          }({ name: t2, value: r2, ...n2 })), function(e3, t3) {
            for (let [, r3] of (t3.delete("set-cookie"), e3)) {
              let e4 = u(r3);
              t3.append("set-cookie", e4);
            }
          }(a2, this._headers), this;
        }
        delete(...e2) {
          let [t2, r2] = "string" == typeof e2[0] ? [e2[0]] : [e2[0].name, e2[0]];
          return this.set({ ...r2, name: t2, value: "", expires: /* @__PURE__ */ new Date(0) });
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map(u).join("; ");
        }
      };
    }, 59110, (e, t, r) => {
      (() => {
        "use strict";
        let r2, n, a, i, o;
        var s, l, d, u, c, p, h, f, _, g, m, v, y, b, w, E, x = { 912: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.ContextAPI = void 0;
          let n2 = r3(108), a2 = r3(221), i2 = r3(44), o2 = "context", s2 = new n2.NoopContextManager();
          t2.ContextAPI = class e3 {
            static getInstance() {
              return this._instance || (this._instance = new e3()), this._instance;
            }
            setGlobalContextManager(e4) {
              return (0, a2.registerGlobal)(o2, e4, i2.DiagAPI.instance());
            }
            active() {
              return this._getContextManager().active();
            }
            with(e4, t3, r4, ...n3) {
              return this._getContextManager().with(e4, t3, r4, ...n3);
            }
            bind(e4, t3) {
              return this._getContextManager().bind(e4, t3);
            }
            _getContextManager() {
              return (0, a2.getGlobal)(o2) || s2;
            }
            disable() {
              this._getContextManager().disable(), (0, a2.unregisterGlobal)(o2, i2.DiagAPI.instance());
            }
          };
        }, 44: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.DiagAPI = void 0;
          let n2 = r3(757), a2 = r3(412), i2 = r3(711), o2 = r3(221);
          t2.DiagAPI = class e3 {
            constructor() {
              function e4(e5) {
                return function(...t4) {
                  let r4 = (0, o2.getGlobal)("diag");
                  if (r4) return r4[e5](...t4);
                };
              }
              const t3 = this;
              t3.setLogger = (e5, r4 = { logLevel: i2.DiagLogLevel.INFO }) => {
                var n3, s2, l2;
                if (e5 === t3) {
                  let e6 = Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
                  return t3.error(null != (n3 = e6.stack) ? n3 : e6.message), false;
                }
                "number" == typeof r4 && (r4 = { logLevel: r4 });
                let d2 = (0, o2.getGlobal)("diag"), u2 = (0, a2.createLogLevelDiagLogger)(null != (s2 = r4.logLevel) ? s2 : i2.DiagLogLevel.INFO, e5);
                if (d2 && !r4.suppressOverrideMessage) {
                  let e6 = null != (l2 = Error().stack) ? l2 : "<failed to generate stacktrace>";
                  d2.warn(`Current logger will be overwritten from ${e6}`), u2.warn(`Current logger will overwrite one already registered from ${e6}`);
                }
                return (0, o2.registerGlobal)("diag", u2, t3, true);
              }, t3.disable = () => {
                (0, o2.unregisterGlobal)("diag", t3);
              }, t3.createComponentLogger = (e5) => new n2.DiagComponentLogger(e5), t3.verbose = e4("verbose"), t3.debug = e4("debug"), t3.info = e4("info"), t3.warn = e4("warn"), t3.error = e4("error");
            }
            static instance() {
              return this._instance || (this._instance = new e3()), this._instance;
            }
          };
        }, 262: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.MetricsAPI = void 0;
          let n2 = r3(586), a2 = r3(221), i2 = r3(44), o2 = "metrics";
          t2.MetricsAPI = class e3 {
            static getInstance() {
              return this._instance || (this._instance = new e3()), this._instance;
            }
            setGlobalMeterProvider(e4) {
              return (0, a2.registerGlobal)(o2, e4, i2.DiagAPI.instance());
            }
            getMeterProvider() {
              return (0, a2.getGlobal)(o2) || n2.NOOP_METER_PROVIDER;
            }
            getMeter(e4, t3, r4) {
              return this.getMeterProvider().getMeter(e4, t3, r4);
            }
            disable() {
              (0, a2.unregisterGlobal)(o2, i2.DiagAPI.instance());
            }
          };
        }, 25: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.PropagationAPI = void 0;
          let n2 = r3(221), a2 = r3(19), i2 = r3(92), o2 = r3(398), s2 = r3(504), l2 = r3(44), d2 = "propagation", u2 = new a2.NoopTextMapPropagator();
          t2.PropagationAPI = class e3 {
            constructor() {
              this.createBaggage = s2.createBaggage, this.getBaggage = o2.getBaggage, this.getActiveBaggage = o2.getActiveBaggage, this.setBaggage = o2.setBaggage, this.deleteBaggage = o2.deleteBaggage;
            }
            static getInstance() {
              return this._instance || (this._instance = new e3()), this._instance;
            }
            setGlobalPropagator(e4) {
              return (0, n2.registerGlobal)(d2, e4, l2.DiagAPI.instance());
            }
            inject(e4, t3, r4 = i2.defaultTextMapSetter) {
              return this._getGlobalPropagator().inject(e4, t3, r4);
            }
            extract(e4, t3, r4 = i2.defaultTextMapGetter) {
              return this._getGlobalPropagator().extract(e4, t3, r4);
            }
            fields() {
              return this._getGlobalPropagator().fields();
            }
            disable() {
              (0, n2.unregisterGlobal)(d2, l2.DiagAPI.instance());
            }
            _getGlobalPropagator() {
              return (0, n2.getGlobal)(d2) || u2;
            }
          };
        }, 397: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.TraceAPI = void 0;
          let n2 = r3(221), a2 = r3(498), i2 = r3(477), o2 = r3(793), s2 = r3(44), l2 = "trace";
          t2.TraceAPI = class e3 {
            constructor() {
              this._proxyTracerProvider = new a2.ProxyTracerProvider(), this.wrapSpanContext = i2.wrapSpanContext, this.isSpanContextValid = i2.isSpanContextValid, this.deleteSpan = o2.deleteSpan, this.getSpan = o2.getSpan, this.getActiveSpan = o2.getActiveSpan, this.getSpanContext = o2.getSpanContext, this.setSpan = o2.setSpan, this.setSpanContext = o2.setSpanContext;
            }
            static getInstance() {
              return this._instance || (this._instance = new e3()), this._instance;
            }
            setGlobalTracerProvider(e4) {
              let t3 = (0, n2.registerGlobal)(l2, this._proxyTracerProvider, s2.DiagAPI.instance());
              return t3 && this._proxyTracerProvider.setDelegate(e4), t3;
            }
            getTracerProvider() {
              return (0, n2.getGlobal)(l2) || this._proxyTracerProvider;
            }
            getTracer(e4, t3) {
              return this.getTracerProvider().getTracer(e4, t3);
            }
            disable() {
              (0, n2.unregisterGlobal)(l2, s2.DiagAPI.instance()), this._proxyTracerProvider = new a2.ProxyTracerProvider();
            }
          };
        }, 398: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.deleteBaggage = t2.setBaggage = t2.getActiveBaggage = t2.getBaggage = void 0;
          let n2 = r3(912), a2 = (0, r3(23).createContextKey)("OpenTelemetry Baggage Key");
          function i2(e3) {
            return e3.getValue(a2) || void 0;
          }
          t2.getBaggage = i2, t2.getActiveBaggage = function() {
            return i2(n2.ContextAPI.getInstance().active());
          }, t2.setBaggage = function(e3, t3) {
            return e3.setValue(a2, t3);
          }, t2.deleteBaggage = function(e3) {
            return e3.deleteValue(a2);
          };
        }, 152: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.BaggageImpl = void 0, t2.BaggageImpl = class e3 {
            constructor(e4) {
              this._entries = e4 ? new Map(e4) : /* @__PURE__ */ new Map();
            }
            getEntry(e4) {
              let t3 = this._entries.get(e4);
              if (t3) return Object.assign({}, t3);
            }
            getAllEntries() {
              return Array.from(this._entries.entries()).map(([e4, t3]) => [e4, t3]);
            }
            setEntry(t3, r3) {
              let n2 = new e3(this._entries);
              return n2._entries.set(t3, r3), n2;
            }
            removeEntry(t3) {
              let r3 = new e3(this._entries);
              return r3._entries.delete(t3), r3;
            }
            removeEntries(...t3) {
              let r3 = new e3(this._entries);
              for (let e4 of t3) r3._entries.delete(e4);
              return r3;
            }
            clear() {
              return new e3();
            }
          };
        }, 647: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.baggageEntryMetadataSymbol = void 0, t2.baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");
        }, 504: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.baggageEntryMetadataFromString = t2.createBaggage = void 0;
          let n2 = r3(44), a2 = r3(152), i2 = r3(647), o2 = n2.DiagAPI.instance();
          t2.createBaggage = function(e3 = {}) {
            return new a2.BaggageImpl(new Map(Object.entries(e3)));
          }, t2.baggageEntryMetadataFromString = function(e3) {
            return "string" != typeof e3 && (o2.error(`Cannot create baggage metadata from unknown type: ${typeof e3}`), e3 = ""), { __TYPE__: i2.baggageEntryMetadataSymbol, toString: () => e3 };
          };
        }, 778: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.context = void 0, t2.context = r3(912).ContextAPI.getInstance();
        }, 108: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.NoopContextManager = void 0;
          let n2 = r3(23);
          t2.NoopContextManager = class {
            active() {
              return n2.ROOT_CONTEXT;
            }
            with(e3, t3, r4, ...n3) {
              return t3.call(r4, ...n3);
            }
            bind(e3, t3) {
              return t3;
            }
            enable() {
              return this;
            }
            disable() {
              return this;
            }
          };
        }, 23: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.ROOT_CONTEXT = t2.createContextKey = void 0, t2.createContextKey = function(e3) {
            return Symbol.for(e3);
          }, t2.ROOT_CONTEXT = new class e3 {
            constructor(t3) {
              const r3 = this;
              r3._currentContext = t3 ? new Map(t3) : /* @__PURE__ */ new Map(), r3.getValue = (e4) => r3._currentContext.get(e4), r3.setValue = (t4, n2) => {
                let a2 = new e3(r3._currentContext);
                return a2._currentContext.set(t4, n2), a2;
              }, r3.deleteValue = (t4) => {
                let n2 = new e3(r3._currentContext);
                return n2._currentContext.delete(t4), n2;
              };
            }
          }();
        }, 304: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.diag = void 0, t2.diag = r3(44).DiagAPI.instance();
        }, 757: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.DiagComponentLogger = void 0;
          let n2 = r3(221);
          function a2(e3, t3, r4) {
            let a3 = (0, n2.getGlobal)("diag");
            if (a3) return r4.unshift(t3), a3[e3](...r4);
          }
          t2.DiagComponentLogger = class {
            constructor(e3) {
              this._namespace = e3.namespace || "DiagComponentLogger";
            }
            debug(...e3) {
              return a2("debug", this._namespace, e3);
            }
            error(...e3) {
              return a2("error", this._namespace, e3);
            }
            info(...e3) {
              return a2("info", this._namespace, e3);
            }
            warn(...e3) {
              return a2("warn", this._namespace, e3);
            }
            verbose(...e3) {
              return a2("verbose", this._namespace, e3);
            }
          };
        }, 83: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.DiagConsoleLogger = void 0;
          let r3 = [{ n: "error", c: "error" }, { n: "warn", c: "warn" }, { n: "info", c: "info" }, { n: "debug", c: "debug" }, { n: "verbose", c: "trace" }];
          t2.DiagConsoleLogger = class {
            constructor() {
              for (let e3 = 0; e3 < r3.length; e3++) this[r3[e3].n] = /* @__PURE__ */ function(e4) {
                return function(...t3) {
                  if (console) {
                    let r4 = console[e4];
                    if ("function" != typeof r4 && (r4 = console.log), "function" == typeof r4) return r4.apply(console, t3);
                  }
                };
              }(r3[e3].c);
            }
          };
        }, 412: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.createLogLevelDiagLogger = void 0;
          let n2 = r3(711);
          t2.createLogLevelDiagLogger = function(e3, t3) {
            function r4(r5, n3) {
              let a2 = t3[r5];
              return "function" == typeof a2 && e3 >= n3 ? a2.bind(t3) : function() {
              };
            }
            return e3 < n2.DiagLogLevel.NONE ? e3 = n2.DiagLogLevel.NONE : e3 > n2.DiagLogLevel.ALL && (e3 = n2.DiagLogLevel.ALL), t3 = t3 || {}, { error: r4("error", n2.DiagLogLevel.ERROR), warn: r4("warn", n2.DiagLogLevel.WARN), info: r4("info", n2.DiagLogLevel.INFO), debug: r4("debug", n2.DiagLogLevel.DEBUG), verbose: r4("verbose", n2.DiagLogLevel.VERBOSE) };
          };
        }, 711: (e2, t2) => {
          var r3;
          Object.defineProperty(t2, "__esModule", { value: true }), t2.DiagLogLevel = void 0, (r3 = t2.DiagLogLevel || (t2.DiagLogLevel = {}))[r3.NONE = 0] = "NONE", r3[r3.ERROR = 30] = "ERROR", r3[r3.WARN = 50] = "WARN", r3[r3.INFO = 60] = "INFO", r3[r3.DEBUG = 70] = "DEBUG", r3[r3.VERBOSE = 80] = "VERBOSE", r3[r3.ALL = 9999] = "ALL";
        }, 221: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.unregisterGlobal = t2.getGlobal = t2.registerGlobal = void 0;
          let n2 = r3(678), a2 = r3(652), i2 = r3(662), o2 = a2.VERSION.split(".")[0], s2 = Symbol.for(`opentelemetry.js.api.${o2}`), l2 = n2._globalThis;
          t2.registerGlobal = function(e3, t3, r4, n3 = false) {
            var i3;
            let o3 = l2[s2] = null != (i3 = l2[s2]) ? i3 : { version: a2.VERSION };
            if (!n3 && o3[e3]) {
              let t4 = Error(`@opentelemetry/api: Attempted duplicate registration of API: ${e3}`);
              return r4.error(t4.stack || t4.message), false;
            }
            if (o3.version !== a2.VERSION) {
              let t4 = Error(`@opentelemetry/api: Registration of version v${o3.version} for ${e3} does not match previously registered API v${a2.VERSION}`);
              return r4.error(t4.stack || t4.message), false;
            }
            return o3[e3] = t3, r4.debug(`@opentelemetry/api: Registered a global for ${e3} v${a2.VERSION}.`), true;
          }, t2.getGlobal = function(e3) {
            var t3, r4;
            let n3 = null == (t3 = l2[s2]) ? void 0 : t3.version;
            if (n3 && (0, i2.isCompatible)(n3)) return null == (r4 = l2[s2]) ? void 0 : r4[e3];
          }, t2.unregisterGlobal = function(e3, t3) {
            t3.debug(`@opentelemetry/api: Unregistering a global for ${e3} v${a2.VERSION}.`);
            let r4 = l2[s2];
            r4 && delete r4[e3];
          };
        }, 662: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.isCompatible = t2._makeCompatibilityCheck = void 0;
          let n2 = r3(652), a2 = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
          function i2(e3) {
            let t3 = /* @__PURE__ */ new Set([e3]), r4 = /* @__PURE__ */ new Set(), n3 = e3.match(a2);
            if (!n3) return () => false;
            let i3 = { major: +n3[1], minor: +n3[2], patch: +n3[3], prerelease: n3[4] };
            if (null != i3.prerelease) return function(t4) {
              return t4 === e3;
            };
            function o2(e4) {
              return r4.add(e4), false;
            }
            return function(e4) {
              if (t3.has(e4)) return true;
              if (r4.has(e4)) return false;
              let n4 = e4.match(a2);
              if (!n4) return o2(e4);
              let s2 = { major: +n4[1], minor: +n4[2], patch: +n4[3], prerelease: n4[4] };
              if (null != s2.prerelease || i3.major !== s2.major) return o2(e4);
              if (0 === i3.major) return i3.minor === s2.minor && i3.patch <= s2.patch ? (t3.add(e4), true) : o2(e4);
              return i3.minor <= s2.minor ? (t3.add(e4), true) : o2(e4);
            };
          }
          t2._makeCompatibilityCheck = i2, t2.isCompatible = i2(n2.VERSION);
        }, 120: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.metrics = void 0, t2.metrics = r3(262).MetricsAPI.getInstance();
        }, 532: (e2, t2) => {
          var r3;
          Object.defineProperty(t2, "__esModule", { value: true }), t2.ValueType = void 0, (r3 = t2.ValueType || (t2.ValueType = {}))[r3.INT = 0] = "INT", r3[r3.DOUBLE = 1] = "DOUBLE";
        }, 440: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.createNoopMeter = t2.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = t2.NOOP_OBSERVABLE_GAUGE_METRIC = t2.NOOP_OBSERVABLE_COUNTER_METRIC = t2.NOOP_UP_DOWN_COUNTER_METRIC = t2.NOOP_HISTOGRAM_METRIC = t2.NOOP_COUNTER_METRIC = t2.NOOP_METER = t2.NoopObservableUpDownCounterMetric = t2.NoopObservableGaugeMetric = t2.NoopObservableCounterMetric = t2.NoopObservableMetric = t2.NoopHistogramMetric = t2.NoopUpDownCounterMetric = t2.NoopCounterMetric = t2.NoopMetric = t2.NoopMeter = void 0;
          class r3 {
            createHistogram(e3, r4) {
              return t2.NOOP_HISTOGRAM_METRIC;
            }
            createCounter(e3, r4) {
              return t2.NOOP_COUNTER_METRIC;
            }
            createUpDownCounter(e3, r4) {
              return t2.NOOP_UP_DOWN_COUNTER_METRIC;
            }
            createObservableGauge(e3, r4) {
              return t2.NOOP_OBSERVABLE_GAUGE_METRIC;
            }
            createObservableCounter(e3, r4) {
              return t2.NOOP_OBSERVABLE_COUNTER_METRIC;
            }
            createObservableUpDownCounter(e3, r4) {
              return t2.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
            }
            addBatchObservableCallback(e3, t3) {
            }
            removeBatchObservableCallback(e3) {
            }
          }
          t2.NoopMeter = r3;
          class n2 {
          }
          t2.NoopMetric = n2;
          class a2 extends n2 {
            add(e3, t3) {
            }
          }
          t2.NoopCounterMetric = a2;
          class i2 extends n2 {
            add(e3, t3) {
            }
          }
          t2.NoopUpDownCounterMetric = i2;
          class o2 extends n2 {
            record(e3, t3) {
            }
          }
          t2.NoopHistogramMetric = o2;
          class s2 {
            addCallback(e3) {
            }
            removeCallback(e3) {
            }
          }
          t2.NoopObservableMetric = s2;
          class l2 extends s2 {
          }
          t2.NoopObservableCounterMetric = l2;
          class d2 extends s2 {
          }
          t2.NoopObservableGaugeMetric = d2;
          class u2 extends s2 {
          }
          t2.NoopObservableUpDownCounterMetric = u2, t2.NOOP_METER = new r3(), t2.NOOP_COUNTER_METRIC = new a2(), t2.NOOP_HISTOGRAM_METRIC = new o2(), t2.NOOP_UP_DOWN_COUNTER_METRIC = new i2(), t2.NOOP_OBSERVABLE_COUNTER_METRIC = new l2(), t2.NOOP_OBSERVABLE_GAUGE_METRIC = new d2(), t2.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new u2(), t2.createNoopMeter = function() {
            return t2.NOOP_METER;
          };
        }, 586: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.NOOP_METER_PROVIDER = t2.NoopMeterProvider = void 0;
          let n2 = r3(440);
          class a2 {
            getMeter(e3, t3, r4) {
              return n2.NOOP_METER;
            }
          }
          t2.NoopMeterProvider = a2, t2.NOOP_METER_PROVIDER = new a2();
        }, 678: function(e2, t2, r3) {
          var n2 = this && this.__createBinding || (Object.create ? function(e3, t3, r4, n3) {
            void 0 === n3 && (n3 = r4), Object.defineProperty(e3, n3, { enumerable: true, get: function() {
              return t3[r4];
            } });
          } : function(e3, t3, r4, n3) {
            void 0 === n3 && (n3 = r4), e3[n3] = t3[r4];
          }), a2 = this && this.__exportStar || function(e3, t3) {
            for (var r4 in e3) "default" === r4 || Object.prototype.hasOwnProperty.call(t3, r4) || n2(t3, e3, r4);
          };
          Object.defineProperty(t2, "__esModule", { value: true }), a2(r3(59), t2);
        }, 460: (t2, r3) => {
          Object.defineProperty(r3, "__esModule", { value: true }), r3._globalThis = void 0, r3._globalThis = "object" == typeof globalThis ? globalThis : e.g;
        }, 59: function(e2, t2, r3) {
          var n2 = this && this.__createBinding || (Object.create ? function(e3, t3, r4, n3) {
            void 0 === n3 && (n3 = r4), Object.defineProperty(e3, n3, { enumerable: true, get: function() {
              return t3[r4];
            } });
          } : function(e3, t3, r4, n3) {
            void 0 === n3 && (n3 = r4), e3[n3] = t3[r4];
          }), a2 = this && this.__exportStar || function(e3, t3) {
            for (var r4 in e3) "default" === r4 || Object.prototype.hasOwnProperty.call(t3, r4) || n2(t3, e3, r4);
          };
          Object.defineProperty(t2, "__esModule", { value: true }), a2(r3(460), t2);
        }, 27: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.propagation = void 0, t2.propagation = r3(25).PropagationAPI.getInstance();
        }, 19: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.NoopTextMapPropagator = void 0, t2.NoopTextMapPropagator = class {
            inject(e3, t3) {
            }
            extract(e3, t3) {
              return e3;
            }
            fields() {
              return [];
            }
          };
        }, 92: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.defaultTextMapSetter = t2.defaultTextMapGetter = void 0, t2.defaultTextMapGetter = { get(e3, t3) {
            if (null != e3) return e3[t3];
          }, keys: (e3) => null == e3 ? [] : Object.keys(e3) }, t2.defaultTextMapSetter = { set(e3, t3, r3) {
            null != e3 && (e3[t3] = r3);
          } };
        }, 816: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.trace = void 0, t2.trace = r3(397).TraceAPI.getInstance();
        }, 374: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.NonRecordingSpan = void 0;
          let n2 = r3(546);
          t2.NonRecordingSpan = class {
            constructor(e3 = n2.INVALID_SPAN_CONTEXT) {
              this._spanContext = e3;
            }
            spanContext() {
              return this._spanContext;
            }
            setAttribute(e3, t3) {
              return this;
            }
            setAttributes(e3) {
              return this;
            }
            addEvent(e3, t3) {
              return this;
            }
            setStatus(e3) {
              return this;
            }
            updateName(e3) {
              return this;
            }
            end(e3) {
            }
            isRecording() {
              return false;
            }
            recordException(e3, t3) {
            }
          };
        }, 637: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.NoopTracer = void 0;
          let n2 = r3(912), a2 = r3(793), i2 = r3(374), o2 = r3(477), s2 = n2.ContextAPI.getInstance();
          t2.NoopTracer = class {
            startSpan(e3, t3, r4 = s2.active()) {
              var n3;
              if (null == t3 ? void 0 : t3.root) return new i2.NonRecordingSpan();
              let l2 = r4 && (0, a2.getSpanContext)(r4);
              return "object" == typeof (n3 = l2) && "string" == typeof n3.spanId && "string" == typeof n3.traceId && "number" == typeof n3.traceFlags && (0, o2.isSpanContextValid)(l2) ? new i2.NonRecordingSpan(l2) : new i2.NonRecordingSpan();
            }
            startActiveSpan(e3, t3, r4, n3) {
              let i3, o3, l2;
              if (arguments.length < 2) return;
              2 == arguments.length ? l2 = t3 : 3 == arguments.length ? (i3 = t3, l2 = r4) : (i3 = t3, o3 = r4, l2 = n3);
              let d2 = null != o3 ? o3 : s2.active(), u2 = this.startSpan(e3, i3, d2), c2 = (0, a2.setSpan)(d2, u2);
              return s2.with(c2, l2, void 0, u2);
            }
          };
        }, 76: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.NoopTracerProvider = void 0;
          let n2 = r3(637);
          t2.NoopTracerProvider = class {
            getTracer(e3, t3, r4) {
              return new n2.NoopTracer();
            }
          };
        }, 779: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.ProxyTracer = void 0;
          let n2 = new (r3(637)).NoopTracer();
          t2.ProxyTracer = class {
            constructor(e3, t3, r4, n3) {
              this._provider = e3, this.name = t3, this.version = r4, this.options = n3;
            }
            startSpan(e3, t3, r4) {
              return this._getTracer().startSpan(e3, t3, r4);
            }
            startActiveSpan(e3, t3, r4, n3) {
              let a2 = this._getTracer();
              return Reflect.apply(a2.startActiveSpan, a2, arguments);
            }
            _getTracer() {
              if (this._delegate) return this._delegate;
              let e3 = this._provider.getDelegateTracer(this.name, this.version, this.options);
              return e3 ? (this._delegate = e3, this._delegate) : n2;
            }
          };
        }, 498: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.ProxyTracerProvider = void 0;
          let n2 = r3(779), a2 = new (r3(76)).NoopTracerProvider();
          t2.ProxyTracerProvider = class {
            getTracer(e3, t3, r4) {
              var a3;
              return null != (a3 = this.getDelegateTracer(e3, t3, r4)) ? a3 : new n2.ProxyTracer(this, e3, t3, r4);
            }
            getDelegate() {
              var e3;
              return null != (e3 = this._delegate) ? e3 : a2;
            }
            setDelegate(e3) {
              this._delegate = e3;
            }
            getDelegateTracer(e3, t3, r4) {
              var n3;
              return null == (n3 = this._delegate) ? void 0 : n3.getTracer(e3, t3, r4);
            }
          };
        }, 312: (e2, t2) => {
          var r3;
          Object.defineProperty(t2, "__esModule", { value: true }), t2.SamplingDecision = void 0, (r3 = t2.SamplingDecision || (t2.SamplingDecision = {}))[r3.NOT_RECORD = 0] = "NOT_RECORD", r3[r3.RECORD = 1] = "RECORD", r3[r3.RECORD_AND_SAMPLED = 2] = "RECORD_AND_SAMPLED";
        }, 793: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.getSpanContext = t2.setSpanContext = t2.deleteSpan = t2.setSpan = t2.getActiveSpan = t2.getSpan = void 0;
          let n2 = r3(23), a2 = r3(374), i2 = r3(912), o2 = (0, n2.createContextKey)("OpenTelemetry Context Key SPAN");
          function s2(e3) {
            return e3.getValue(o2) || void 0;
          }
          function l2(e3, t3) {
            return e3.setValue(o2, t3);
          }
          t2.getSpan = s2, t2.getActiveSpan = function() {
            return s2(i2.ContextAPI.getInstance().active());
          }, t2.setSpan = l2, t2.deleteSpan = function(e3) {
            return e3.deleteValue(o2);
          }, t2.setSpanContext = function(e3, t3) {
            return l2(e3, new a2.NonRecordingSpan(t3));
          }, t2.getSpanContext = function(e3) {
            var t3;
            return null == (t3 = s2(e3)) ? void 0 : t3.spanContext();
          };
        }, 285: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.TraceStateImpl = void 0;
          let n2 = r3(240);
          t2.TraceStateImpl = class e3 {
            constructor(e4) {
              this._internalState = /* @__PURE__ */ new Map(), e4 && this._parse(e4);
            }
            set(e4, t3) {
              let r4 = this._clone();
              return r4._internalState.has(e4) && r4._internalState.delete(e4), r4._internalState.set(e4, t3), r4;
            }
            unset(e4) {
              let t3 = this._clone();
              return t3._internalState.delete(e4), t3;
            }
            get(e4) {
              return this._internalState.get(e4);
            }
            serialize() {
              return this._keys().reduce((e4, t3) => (e4.push(t3 + "=" + this.get(t3)), e4), []).join(",");
            }
            _parse(e4) {
              !(e4.length > 512) && (this._internalState = e4.split(",").reverse().reduce((e5, t3) => {
                let r4 = t3.trim(), a2 = r4.indexOf("=");
                if (-1 !== a2) {
                  let i2 = r4.slice(0, a2), o2 = r4.slice(a2 + 1, t3.length);
                  (0, n2.validateKey)(i2) && (0, n2.validateValue)(o2) && e5.set(i2, o2);
                }
                return e5;
              }, /* @__PURE__ */ new Map()), this._internalState.size > 32 && (this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, 32))));
            }
            _keys() {
              return Array.from(this._internalState.keys()).reverse();
            }
            _clone() {
              let t3 = new e3();
              return t3._internalState = new Map(this._internalState), t3;
            }
          };
        }, 240: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.validateValue = t2.validateKey = void 0;
          let r3 = "[_0-9a-z-*/]", n2 = `[a-z]${r3}{0,255}`, a2 = `[a-z0-9]${r3}{0,240}@[a-z]${r3}{0,13}`, i2 = RegExp(`^(?:${n2}|${a2})$`), o2 = /^[ -~]{0,255}[!-~]$/, s2 = /,|=/;
          t2.validateKey = function(e3) {
            return i2.test(e3);
          }, t2.validateValue = function(e3) {
            return o2.test(e3) && !s2.test(e3);
          };
        }, 87: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.createTraceState = void 0;
          let n2 = r3(285);
          t2.createTraceState = function(e3) {
            return new n2.TraceStateImpl(e3);
          };
        }, 546: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.INVALID_SPAN_CONTEXT = t2.INVALID_TRACEID = t2.INVALID_SPANID = void 0;
          let n2 = r3(731);
          t2.INVALID_SPANID = "0000000000000000", t2.INVALID_TRACEID = "00000000000000000000000000000000", t2.INVALID_SPAN_CONTEXT = { traceId: t2.INVALID_TRACEID, spanId: t2.INVALID_SPANID, traceFlags: n2.TraceFlags.NONE };
        }, 613: (e2, t2) => {
          var r3;
          Object.defineProperty(t2, "__esModule", { value: true }), t2.SpanKind = void 0, (r3 = t2.SpanKind || (t2.SpanKind = {}))[r3.INTERNAL = 0] = "INTERNAL", r3[r3.SERVER = 1] = "SERVER", r3[r3.CLIENT = 2] = "CLIENT", r3[r3.PRODUCER = 3] = "PRODUCER", r3[r3.CONSUMER = 4] = "CONSUMER";
        }, 477: (e2, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.wrapSpanContext = t2.isSpanContextValid = t2.isValidSpanId = t2.isValidTraceId = void 0;
          let n2 = r3(546), a2 = r3(374), i2 = /^([0-9a-f]{32})$/i, o2 = /^[0-9a-f]{16}$/i;
          function s2(e3) {
            return i2.test(e3) && e3 !== n2.INVALID_TRACEID;
          }
          function l2(e3) {
            return o2.test(e3) && e3 !== n2.INVALID_SPANID;
          }
          t2.isValidTraceId = s2, t2.isValidSpanId = l2, t2.isSpanContextValid = function(e3) {
            return s2(e3.traceId) && l2(e3.spanId);
          }, t2.wrapSpanContext = function(e3) {
            return new a2.NonRecordingSpan(e3);
          };
        }, 854: (e2, t2) => {
          var r3;
          Object.defineProperty(t2, "__esModule", { value: true }), t2.SpanStatusCode = void 0, (r3 = t2.SpanStatusCode || (t2.SpanStatusCode = {}))[r3.UNSET = 0] = "UNSET", r3[r3.OK = 1] = "OK", r3[r3.ERROR = 2] = "ERROR";
        }, 731: (e2, t2) => {
          var r3;
          Object.defineProperty(t2, "__esModule", { value: true }), t2.TraceFlags = void 0, (r3 = t2.TraceFlags || (t2.TraceFlags = {}))[r3.NONE = 0] = "NONE", r3[r3.SAMPLED = 1] = "SAMPLED";
        }, 652: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.VERSION = void 0, t2.VERSION = "1.6.0";
        } }, C = {};
        function S(e2) {
          var t2 = C[e2];
          if (void 0 !== t2) return t2.exports;
          var r3 = C[e2] = { exports: {} }, n2 = true;
          try {
            x[e2].call(r3.exports, r3, r3.exports, S), n2 = false;
          } finally {
            n2 && delete C[e2];
          }
          return r3.exports;
        }
        S.ab = "/ROOT/node_modules/next/dist/compiled/@opentelemetry/api/";
        var T = {};
        Object.defineProperty(T, "__esModule", { value: true }), T.trace = T.propagation = T.metrics = T.diag = T.context = T.INVALID_SPAN_CONTEXT = T.INVALID_TRACEID = T.INVALID_SPANID = T.isValidSpanId = T.isValidTraceId = T.isSpanContextValid = T.createTraceState = T.TraceFlags = T.SpanStatusCode = T.SpanKind = T.SamplingDecision = T.ProxyTracerProvider = T.ProxyTracer = T.defaultTextMapSetter = T.defaultTextMapGetter = T.ValueType = T.createNoopMeter = T.DiagLogLevel = T.DiagConsoleLogger = T.ROOT_CONTEXT = T.createContextKey = T.baggageEntryMetadataFromString = void 0, s = S(504), Object.defineProperty(T, "baggageEntryMetadataFromString", { enumerable: true, get: function() {
          return s.baggageEntryMetadataFromString;
        } }), l = S(23), Object.defineProperty(T, "createContextKey", { enumerable: true, get: function() {
          return l.createContextKey;
        } }), Object.defineProperty(T, "ROOT_CONTEXT", { enumerable: true, get: function() {
          return l.ROOT_CONTEXT;
        } }), d = S(83), Object.defineProperty(T, "DiagConsoleLogger", { enumerable: true, get: function() {
          return d.DiagConsoleLogger;
        } }), u = S(711), Object.defineProperty(T, "DiagLogLevel", { enumerable: true, get: function() {
          return u.DiagLogLevel;
        } }), c = S(440), Object.defineProperty(T, "createNoopMeter", { enumerable: true, get: function() {
          return c.createNoopMeter;
        } }), p = S(532), Object.defineProperty(T, "ValueType", { enumerable: true, get: function() {
          return p.ValueType;
        } }), h = S(92), Object.defineProperty(T, "defaultTextMapGetter", { enumerable: true, get: function() {
          return h.defaultTextMapGetter;
        } }), Object.defineProperty(T, "defaultTextMapSetter", { enumerable: true, get: function() {
          return h.defaultTextMapSetter;
        } }), f = S(779), Object.defineProperty(T, "ProxyTracer", { enumerable: true, get: function() {
          return f.ProxyTracer;
        } }), _ = S(498), Object.defineProperty(T, "ProxyTracerProvider", { enumerable: true, get: function() {
          return _.ProxyTracerProvider;
        } }), g = S(312), Object.defineProperty(T, "SamplingDecision", { enumerable: true, get: function() {
          return g.SamplingDecision;
        } }), m = S(613), Object.defineProperty(T, "SpanKind", { enumerable: true, get: function() {
          return m.SpanKind;
        } }), v = S(854), Object.defineProperty(T, "SpanStatusCode", { enumerable: true, get: function() {
          return v.SpanStatusCode;
        } }), y = S(731), Object.defineProperty(T, "TraceFlags", { enumerable: true, get: function() {
          return y.TraceFlags;
        } }), b = S(87), Object.defineProperty(T, "createTraceState", { enumerable: true, get: function() {
          return b.createTraceState;
        } }), w = S(477), Object.defineProperty(T, "isSpanContextValid", { enumerable: true, get: function() {
          return w.isSpanContextValid;
        } }), Object.defineProperty(T, "isValidTraceId", { enumerable: true, get: function() {
          return w.isValidTraceId;
        } }), Object.defineProperty(T, "isValidSpanId", { enumerable: true, get: function() {
          return w.isValidSpanId;
        } }), E = S(546), Object.defineProperty(T, "INVALID_SPANID", { enumerable: true, get: function() {
          return E.INVALID_SPANID;
        } }), Object.defineProperty(T, "INVALID_TRACEID", { enumerable: true, get: function() {
          return E.INVALID_TRACEID;
        } }), Object.defineProperty(T, "INVALID_SPAN_CONTEXT", { enumerable: true, get: function() {
          return E.INVALID_SPAN_CONTEXT;
        } }), r2 = S(778), Object.defineProperty(T, "context", { enumerable: true, get: function() {
          return r2.context;
        } }), n = S(304), Object.defineProperty(T, "diag", { enumerable: true, get: function() {
          return n.diag;
        } }), a = S(120), Object.defineProperty(T, "metrics", { enumerable: true, get: function() {
          return a.metrics;
        } }), i = S(27), Object.defineProperty(T, "propagation", { enumerable: true, get: function() {
          return i.propagation;
        } }), o = S(816), Object.defineProperty(T, "trace", { enumerable: true, get: function() {
          return o.trace;
        } }), T.default = { context: r2.context, diag: n.diag, metrics: a.metrics, propagation: i.propagation, trace: o.trace }, t.exports = T;
      })();
    }, 71498, (e, t, r) => {
      (() => {
        "use strict";
        "u" > typeof __nccwpck_require__ && (__nccwpck_require__.ab = "/ROOT/node_modules/next/dist/compiled/cookie/");
        var e2, r2, n, a, i = {};
        i.parse = function(t2, r3) {
          if ("string" != typeof t2) throw TypeError("argument str must be a string");
          for (var a2 = {}, i2 = t2.split(n), o = (r3 || {}).decode || e2, s = 0; s < i2.length; s++) {
            var l = i2[s], d = l.indexOf("=");
            if (!(d < 0)) {
              var u = l.substr(0, d).trim(), c = l.substr(++d, l.length).trim();
              '"' == c[0] && (c = c.slice(1, -1)), void 0 == a2[u] && (a2[u] = function(e3, t3) {
                try {
                  return t3(e3);
                } catch (t4) {
                  return e3;
                }
              }(c, o));
            }
          }
          return a2;
        }, i.serialize = function(e3, t2, n2) {
          var i2 = n2 || {}, o = i2.encode || r2;
          if ("function" != typeof o) throw TypeError("option encode is invalid");
          if (!a.test(e3)) throw TypeError("argument name is invalid");
          var s = o(t2);
          if (s && !a.test(s)) throw TypeError("argument val is invalid");
          var l = e3 + "=" + s;
          if (null != i2.maxAge) {
            var d = i2.maxAge - 0;
            if (isNaN(d) || !isFinite(d)) throw TypeError("option maxAge is invalid");
            l += "; Max-Age=" + Math.floor(d);
          }
          if (i2.domain) {
            if (!a.test(i2.domain)) throw TypeError("option domain is invalid");
            l += "; Domain=" + i2.domain;
          }
          if (i2.path) {
            if (!a.test(i2.path)) throw TypeError("option path is invalid");
            l += "; Path=" + i2.path;
          }
          if (i2.expires) {
            if ("function" != typeof i2.expires.toUTCString) throw TypeError("option expires is invalid");
            l += "; Expires=" + i2.expires.toUTCString();
          }
          if (i2.httpOnly && (l += "; HttpOnly"), i2.secure && (l += "; Secure"), i2.sameSite) switch ("string" == typeof i2.sameSite ? i2.sameSite.toLowerCase() : i2.sameSite) {
            case true:
            case "strict":
              l += "; SameSite=Strict";
              break;
            case "lax":
              l += "; SameSite=Lax";
              break;
            case "none":
              l += "; SameSite=None";
              break;
            default:
              throw TypeError("option sameSite is invalid");
          }
          return l;
        }, e2 = decodeURIComponent, r2 = encodeURIComponent, n = /; */, a = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/, t.exports = i;
      })();
    }, 99734, (e, t, r) => {
      (() => {
        "use strict";
        let e2, r2, n, a, i;
        var o = { 234: (e3) => {
          var t2 = Object.prototype.hasOwnProperty, r3 = "~";
          function n2() {
          }
          function a2(e4, t3, r4) {
            this.fn = e4, this.context = t3, this.once = r4 || false;
          }
          function i2(e4, t3, n3, i3, o3) {
            if ("function" != typeof n3) throw TypeError("The listener must be a function");
            var s3 = new a2(n3, i3 || e4, o3), l2 = r3 ? r3 + t3 : t3;
            return e4._events[l2] ? e4._events[l2].fn ? e4._events[l2] = [e4._events[l2], s3] : e4._events[l2].push(s3) : (e4._events[l2] = s3, e4._eventsCount++), e4;
          }
          function o2(e4, t3) {
            0 == --e4._eventsCount ? e4._events = new n2() : delete e4._events[t3];
          }
          function s2() {
            this._events = new n2(), this._eventsCount = 0;
          }
          Object.create && (n2.prototype = /* @__PURE__ */ Object.create(null), new n2().__proto__ || (r3 = false)), s2.prototype.eventNames = function() {
            var e4, n3, a3 = [];
            if (0 === this._eventsCount) return a3;
            for (n3 in e4 = this._events) t2.call(e4, n3) && a3.push(r3 ? n3.slice(1) : n3);
            return Object.getOwnPropertySymbols ? a3.concat(Object.getOwnPropertySymbols(e4)) : a3;
          }, s2.prototype.listeners = function(e4) {
            var t3 = r3 ? r3 + e4 : e4, n3 = this._events[t3];
            if (!n3) return [];
            if (n3.fn) return [n3.fn];
            for (var a3 = 0, i3 = n3.length, o3 = Array(i3); a3 < i3; a3++) o3[a3] = n3[a3].fn;
            return o3;
          }, s2.prototype.listenerCount = function(e4) {
            var t3 = r3 ? r3 + e4 : e4, n3 = this._events[t3];
            return n3 ? n3.fn ? 1 : n3.length : 0;
          }, s2.prototype.emit = function(e4, t3, n3, a3, i3, o3) {
            var s3 = r3 ? r3 + e4 : e4;
            if (!this._events[s3]) return false;
            var l2, d2, u = this._events[s3], c = arguments.length;
            if (u.fn) {
              switch (u.once && this.removeListener(e4, u.fn, void 0, true), c) {
                case 1:
                  return u.fn.call(u.context), true;
                case 2:
                  return u.fn.call(u.context, t3), true;
                case 3:
                  return u.fn.call(u.context, t3, n3), true;
                case 4:
                  return u.fn.call(u.context, t3, n3, a3), true;
                case 5:
                  return u.fn.call(u.context, t3, n3, a3, i3), true;
                case 6:
                  return u.fn.call(u.context, t3, n3, a3, i3, o3), true;
              }
              for (d2 = 1, l2 = Array(c - 1); d2 < c; d2++) l2[d2 - 1] = arguments[d2];
              u.fn.apply(u.context, l2);
            } else {
              var p, h = u.length;
              for (d2 = 0; d2 < h; d2++) switch (u[d2].once && this.removeListener(e4, u[d2].fn, void 0, true), c) {
                case 1:
                  u[d2].fn.call(u[d2].context);
                  break;
                case 2:
                  u[d2].fn.call(u[d2].context, t3);
                  break;
                case 3:
                  u[d2].fn.call(u[d2].context, t3, n3);
                  break;
                case 4:
                  u[d2].fn.call(u[d2].context, t3, n3, a3);
                  break;
                default:
                  if (!l2) for (p = 1, l2 = Array(c - 1); p < c; p++) l2[p - 1] = arguments[p];
                  u[d2].fn.apply(u[d2].context, l2);
              }
            }
            return true;
          }, s2.prototype.on = function(e4, t3, r4) {
            return i2(this, e4, t3, r4, false);
          }, s2.prototype.once = function(e4, t3, r4) {
            return i2(this, e4, t3, r4, true);
          }, s2.prototype.removeListener = function(e4, t3, n3, a3) {
            var i3 = r3 ? r3 + e4 : e4;
            if (!this._events[i3]) return this;
            if (!t3) return o2(this, i3), this;
            var s3 = this._events[i3];
            if (s3.fn) s3.fn !== t3 || a3 && !s3.once || n3 && s3.context !== n3 || o2(this, i3);
            else {
              for (var l2 = 0, d2 = [], u = s3.length; l2 < u; l2++) (s3[l2].fn !== t3 || a3 && !s3[l2].once || n3 && s3[l2].context !== n3) && d2.push(s3[l2]);
              d2.length ? this._events[i3] = 1 === d2.length ? d2[0] : d2 : o2(this, i3);
            }
            return this;
          }, s2.prototype.removeAllListeners = function(e4) {
            var t3;
            return e4 ? (t3 = r3 ? r3 + e4 : e4, this._events[t3] && o2(this, t3)) : (this._events = new n2(), this._eventsCount = 0), this;
          }, s2.prototype.off = s2.prototype.removeListener, s2.prototype.addListener = s2.prototype.on, s2.prefixed = r3, s2.EventEmitter = s2, e3.exports = s2;
        }, 274: (e3) => {
          e3.exports = (e4, t2) => (t2 = t2 || (() => {
          }), e4.then((e5) => new Promise((e6) => {
            e6(t2());
          }).then(() => e5), (e5) => new Promise((e6) => {
            e6(t2());
          }).then(() => {
            throw e5;
          })));
        }, 294: (e3, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.default = function(e4, t3, r3) {
            let n2 = 0, a2 = e4.length;
            for (; a2 > 0; ) {
              let i2 = a2 / 2 | 0, o2 = n2 + i2;
              0 >= r3(e4[o2], t3) ? (n2 = ++o2, a2 -= i2 + 1) : a2 = i2;
            }
            return n2;
          };
        }, 838: (e3, t2, r3) => {
          Object.defineProperty(t2, "__esModule", { value: true });
          let n2 = r3(294);
          t2.default = class {
            constructor() {
              this._queue = [];
            }
            enqueue(e4, t3) {
              let r4 = { priority: (t3 = Object.assign({ priority: 0 }, t3)).priority, run: e4 };
              if (this.size && this._queue[this.size - 1].priority >= t3.priority) return void this._queue.push(r4);
              let a2 = n2.default(this._queue, r4, (e5, t4) => t4.priority - e5.priority);
              this._queue.splice(a2, 0, r4);
            }
            dequeue() {
              let e4 = this._queue.shift();
              return null == e4 ? void 0 : e4.run;
            }
            filter(e4) {
              return this._queue.filter((t3) => t3.priority === e4.priority).map((e5) => e5.run);
            }
            get size() {
              return this._queue.length;
            }
          };
        }, 138: (e3, t2, r3) => {
          let n2 = r3(274);
          class a2 extends Error {
            constructor(e4) {
              super(e4), this.name = "TimeoutError";
            }
          }
          let i2 = (e4, t3, r4) => new Promise((i3, o2) => {
            if ("number" != typeof t3 || t3 < 0) throw TypeError("Expected `milliseconds` to be a positive number");
            if (t3 === 1 / 0) return void i3(e4);
            let s2 = setTimeout(() => {
              if ("function" == typeof r4) {
                try {
                  i3(r4());
                } catch (e5) {
                  o2(e5);
                }
                return;
              }
              let n3 = "string" == typeof r4 ? r4 : `Promise timed out after ${t3} milliseconds`, s3 = r4 instanceof Error ? r4 : new a2(n3);
              "function" == typeof e4.cancel && e4.cancel(), o2(s3);
            }, t3);
            n2(e4.then(i3, o2), () => {
              clearTimeout(s2);
            });
          });
          e3.exports = i2, e3.exports.default = i2, e3.exports.TimeoutError = a2;
        } }, s = {};
        function l(e3) {
          var t2 = s[e3];
          if (void 0 !== t2) return t2.exports;
          var r3 = s[e3] = { exports: {} }, n2 = true;
          try {
            o[e3](r3, r3.exports, l), n2 = false;
          } finally {
            n2 && delete s[e3];
          }
          return r3.exports;
        }
        l.ab = "/ROOT/node_modules/next/dist/compiled/p-queue/";
        var d = {};
        Object.defineProperty(d, "__esModule", { value: true }), e2 = l(234), r2 = l(138), n = l(838), a = () => {
        }, i = new r2.TimeoutError(), d.default = class extends e2 {
          constructor(e3) {
            var t2, r3, i2, o2;
            if (super(), this._intervalCount = 0, this._intervalEnd = 0, this._pendingCount = 0, this._resolveEmpty = a, this._resolveIdle = a, !("number" == typeof (e3 = Object.assign({ carryoverConcurrencyCount: false, intervalCap: 1 / 0, interval: 0, concurrency: 1 / 0, autoStart: true, queueClass: n.default }, e3)).intervalCap && e3.intervalCap >= 1)) throw TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${null != (r3 = null == (t2 = e3.intervalCap) ? void 0 : t2.toString()) ? r3 : ""}\` (${typeof e3.intervalCap})`);
            if (void 0 === e3.interval || !(Number.isFinite(e3.interval) && e3.interval >= 0)) throw TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${null != (o2 = null == (i2 = e3.interval) ? void 0 : i2.toString()) ? o2 : ""}\` (${typeof e3.interval})`);
            this._carryoverConcurrencyCount = e3.carryoverConcurrencyCount, this._isIntervalIgnored = e3.intervalCap === 1 / 0 || 0 === e3.interval, this._intervalCap = e3.intervalCap, this._interval = e3.interval, this._queue = new e3.queueClass(), this._queueClass = e3.queueClass, this.concurrency = e3.concurrency, this._timeout = e3.timeout, this._throwOnTimeout = true === e3.throwOnTimeout, this._isPaused = false === e3.autoStart;
          }
          get _doesIntervalAllowAnother() {
            return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
          }
          get _doesConcurrentAllowAnother() {
            return this._pendingCount < this._concurrency;
          }
          _next() {
            this._pendingCount--, this._tryToStartAnother(), this.emit("next");
          }
          _resolvePromises() {
            this._resolveEmpty(), this._resolveEmpty = a, 0 === this._pendingCount && (this._resolveIdle(), this._resolveIdle = a, this.emit("idle"));
          }
          _onResumeInterval() {
            this._onInterval(), this._initializeIntervalIfNeeded(), this._timeoutId = void 0;
          }
          _isIntervalPaused() {
            let e3 = Date.now();
            if (void 0 === this._intervalId) {
              let t2 = this._intervalEnd - e3;
              if (!(t2 < 0)) return void 0 === this._timeoutId && (this._timeoutId = setTimeout(() => {
                this._onResumeInterval();
              }, t2)), true;
              this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
            }
            return false;
          }
          _tryToStartAnother() {
            if (0 === this._queue.size) return this._intervalId && clearInterval(this._intervalId), this._intervalId = void 0, this._resolvePromises(), false;
            if (!this._isPaused) {
              let e3 = !this._isIntervalPaused();
              if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
                let t2 = this._queue.dequeue();
                return !!t2 && (this.emit("active"), t2(), e3 && this._initializeIntervalIfNeeded(), true);
              }
            }
            return false;
          }
          _initializeIntervalIfNeeded() {
            this._isIntervalIgnored || void 0 !== this._intervalId || (this._intervalId = setInterval(() => {
              this._onInterval();
            }, this._interval), this._intervalEnd = Date.now() + this._interval);
          }
          _onInterval() {
            0 === this._intervalCount && 0 === this._pendingCount && this._intervalId && (clearInterval(this._intervalId), this._intervalId = void 0), this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0, this._processQueue();
          }
          _processQueue() {
            for (; this._tryToStartAnother(); ) ;
          }
          get concurrency() {
            return this._concurrency;
          }
          set concurrency(e3) {
            if (!("number" == typeof e3 && e3 >= 1)) throw TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${e3}\` (${typeof e3})`);
            this._concurrency = e3, this._processQueue();
          }
          async add(e3, t2 = {}) {
            return new Promise((n2, a2) => {
              let o2 = async () => {
                this._pendingCount++, this._intervalCount++;
                try {
                  let o3 = void 0 === this._timeout && void 0 === t2.timeout ? e3() : r2.default(Promise.resolve(e3()), void 0 === t2.timeout ? this._timeout : t2.timeout, () => {
                    (void 0 === t2.throwOnTimeout ? this._throwOnTimeout : t2.throwOnTimeout) && a2(i);
                  });
                  n2(await o3);
                } catch (e4) {
                  a2(e4);
                }
                this._next();
              };
              this._queue.enqueue(o2, t2), this._tryToStartAnother(), this.emit("add");
            });
          }
          async addAll(e3, t2) {
            return Promise.all(e3.map(async (e4) => this.add(e4, t2)));
          }
          start() {
            return this._isPaused && (this._isPaused = false, this._processQueue()), this;
          }
          pause() {
            this._isPaused = true;
          }
          clear() {
            this._queue = new this._queueClass();
          }
          async onEmpty() {
            if (0 !== this._queue.size) return new Promise((e3) => {
              let t2 = this._resolveEmpty;
              this._resolveEmpty = () => {
                t2(), e3();
              };
            });
          }
          async onIdle() {
            if (0 !== this._pendingCount || 0 !== this._queue.size) return new Promise((e3) => {
              let t2 = this._resolveIdle;
              this._resolveIdle = () => {
                t2(), e3();
              };
            });
          }
          get size() {
            return this._queue.size;
          }
          sizeBy(e3) {
            return this._queue.filter(e3).length;
          }
          get pending() {
            return this._pendingCount;
          }
          get isPaused() {
            return this._isPaused;
          }
          get timeout() {
            return this._timeout;
          }
          set timeout(e3) {
            this._timeout = e3;
          }
        }, t.exports = d;
      })();
    }, 51615, (e, t, r) => {
      t.exports = e.x("node:buffer", () => (init_node_buffer(), __toCommonJS(node_buffer_exports)));
    }, 78500, (e, t, r) => {
      t.exports = e.x("node:async_hooks", () => (init_node_async_hooks(), __toCommonJS(node_async_hooks_exports)));
    }, 25085, (e, t, r) => {
      "use strict";
      Object.defineProperty(r, "__esModule", { value: true });
      var n = { getTestReqInfo: function() {
        return l;
      }, withRequest: function() {
        return s;
      } };
      for (var a in n) Object.defineProperty(r, a, { enumerable: true, get: n[a] });
      let i = new (e.r(78500)).AsyncLocalStorage();
      function o(e2, t2) {
        let r2 = t2.header(e2, "next-test-proxy-port");
        if (!r2) return;
        let n2 = t2.url(e2);
        return { url: n2, proxyPort: Number(r2), testData: t2.header(e2, "next-test-data") || "" };
      }
      function s(e2, t2, r2) {
        let n2 = o(e2, t2);
        return n2 ? i.run(n2, r2) : r2();
      }
      function l(e2, t2) {
        let r2 = i.getStore();
        return r2 || (e2 && t2 ? o(e2, t2) : void 0);
      }
    }, 28325, (e, t, r) => {
      "use strict";
      var n = e.i(51615);
      Object.defineProperty(r, "__esModule", { value: true });
      var a = { handleFetch: function() {
        return d;
      }, interceptFetch: function() {
        return u;
      }, reader: function() {
        return s;
      } };
      for (var i in a) Object.defineProperty(r, i, { enumerable: true, get: a[i] });
      let o = e.r(25085), s = { url: (e2) => e2.url, header: (e2, t2) => e2.headers.get(t2) };
      async function l(e2, t2) {
        let { url: r2, method: a2, headers: i2, body: o2, cache: s2, credentials: l2, integrity: d2, mode: u2, redirect: c, referrer: p, referrerPolicy: h } = t2;
        return { testData: e2, api: "fetch", request: { url: r2, method: a2, headers: [...Array.from(i2), ["next-test-stack", function() {
          let e3 = (Error().stack ?? "").split("\n");
          for (let t3 = 1; t3 < e3.length; t3++) if (e3[t3].length > 0) {
            e3 = e3.slice(t3);
            break;
          }
          return (e3 = (e3 = (e3 = e3.filter((e4) => !e4.includes("/next/dist/"))).slice(0, 5)).map((e4) => e4.replace("webpack-internal:///(rsc)/", "").trim())).join("    ");
        }()]], body: o2 ? n.Buffer.from(await t2.arrayBuffer()).toString("base64") : null, cache: s2, credentials: l2, integrity: d2, mode: u2, redirect: c, referrer: p, referrerPolicy: h } };
      }
      async function d(e2, t2) {
        let r2 = (0, o.getTestReqInfo)(t2, s);
        if (!r2) return e2(t2);
        let { testData: a2, proxyPort: i2 } = r2, d2 = await l(a2, t2), u2 = await e2(`http://localhost:${i2}`, { method: "POST", body: JSON.stringify(d2), headers: { "next-test-internal": "1" }, next: { internal: true } });
        if (!u2.ok) throw Object.defineProperty(Error(`Proxy request failed: ${u2.status}`), "__NEXT_ERROR_CODE", { value: "E146", enumerable: false, configurable: true });
        let c = await u2.json(), { api: p } = c;
        switch (p) {
          case "continue":
            return e2(t2);
          case "abort":
          case "unhandled":
            throw Object.defineProperty(Error(`Proxy request aborted [${t2.method} ${t2.url}]`), "__NEXT_ERROR_CODE", { value: "E145", enumerable: false, configurable: true });
          case "fetch":
            return function(e3) {
              let { status: t3, headers: r3, body: a3 } = e3.response;
              return new Response(a3 ? n.Buffer.from(a3, "base64") : null, { status: t3, headers: new Headers(r3) });
            }(c);
          default:
            return p;
        }
      }
      function u(t2) {
        return e.g.fetch = function(e2, r2) {
          var n2;
          return (null == r2 || null == (n2 = r2.next) ? void 0 : n2.internal) ? t2(e2, r2) : d(t2, new Request(e2, r2));
        }, () => {
          e.g.fetch = t2;
        };
      }
    }, 94165, (e, t, r) => {
      "use strict";
      Object.defineProperty(r, "__esModule", { value: true });
      var n = { interceptTestApis: function() {
        return s;
      }, wrapRequestHandler: function() {
        return l;
      } };
      for (var a in n) Object.defineProperty(r, a, { enumerable: true, get: n[a] });
      let i = e.r(25085), o = e.r(28325);
      function s() {
        return (0, o.interceptFetch)(e.g.fetch);
      }
      function l(e2) {
        return (t2, r2) => (0, i.withRequest)(t2, o.reader, () => e2(t2, r2));
      }
    }, 54846, (e, t, r) => {
      !function() {
        "use strict";
        var e2 = { 431: function(e3) {
          function t2(e4) {
            if ("string" != typeof e4) throw TypeError("Path must be a string. Received " + JSON.stringify(e4));
          }
          function r3(e4, t3) {
            for (var r4, n3 = "", a = 0, i = -1, o = 0, s = 0; s <= e4.length; ++s) {
              if (s < e4.length) r4 = e4.charCodeAt(s);
              else if (47 === r4) break;
              else r4 = 47;
              if (47 === r4) {
                if (i === s - 1 || 1 === o) ;
                else if (i !== s - 1 && 2 === o) {
                  if (n3.length < 2 || 2 !== a || 46 !== n3.charCodeAt(n3.length - 1) || 46 !== n3.charCodeAt(n3.length - 2)) {
                    if (n3.length > 2) {
                      var l = n3.lastIndexOf("/");
                      if (l !== n3.length - 1) {
                        -1 === l ? (n3 = "", a = 0) : a = (n3 = n3.slice(0, l)).length - 1 - n3.lastIndexOf("/"), i = s, o = 0;
                        continue;
                      }
                    } else if (2 === n3.length || 1 === n3.length) {
                      n3 = "", a = 0, i = s, o = 0;
                      continue;
                    }
                  }
                  t3 && (n3.length > 0 ? n3 += "/.." : n3 = "..", a = 2);
                } else n3.length > 0 ? n3 += "/" + e4.slice(i + 1, s) : n3 = e4.slice(i + 1, s), a = s - i - 1;
                i = s, o = 0;
              } else 46 === r4 && -1 !== o ? ++o : o = -1;
            }
            return n3;
          }
          var n2 = { resolve: function() {
            for (var e4, n3, a = "", i = false, o = arguments.length - 1; o >= -1 && !i; o--) o >= 0 ? n3 = arguments[o] : (void 0 === e4 && (e4 = ""), n3 = e4), t2(n3), 0 !== n3.length && (a = n3 + "/" + a, i = 47 === n3.charCodeAt(0));
            if (a = r3(a, !i), i) if (a.length > 0) return "/" + a;
            else return "/";
            return a.length > 0 ? a : ".";
          }, normalize: function(e4) {
            if (t2(e4), 0 === e4.length) return ".";
            var n3 = 47 === e4.charCodeAt(0), a = 47 === e4.charCodeAt(e4.length - 1);
            return (0 !== (e4 = r3(e4, !n3)).length || n3 || (e4 = "."), e4.length > 0 && a && (e4 += "/"), n3) ? "/" + e4 : e4;
          }, isAbsolute: function(e4) {
            return t2(e4), e4.length > 0 && 47 === e4.charCodeAt(0);
          }, join: function() {
            if (0 == arguments.length) return ".";
            for (var e4, r4 = 0; r4 < arguments.length; ++r4) {
              var a = arguments[r4];
              t2(a), a.length > 0 && (void 0 === e4 ? e4 = a : e4 += "/" + a);
            }
            return void 0 === e4 ? "." : n2.normalize(e4);
          }, relative: function(e4, r4) {
            if (t2(e4), t2(r4), e4 === r4 || (e4 = n2.resolve(e4)) === (r4 = n2.resolve(r4))) return "";
            for (var a = 1; a < e4.length && 47 === e4.charCodeAt(a); ++a) ;
            for (var i = e4.length, o = i - a, s = 1; s < r4.length && 47 === r4.charCodeAt(s); ++s) ;
            for (var l = r4.length - s, d = o < l ? o : l, u = -1, c = 0; c <= d; ++c) {
              if (c === d) {
                if (l > d) {
                  if (47 === r4.charCodeAt(s + c)) return r4.slice(s + c + 1);
                  else if (0 === c) return r4.slice(s + c);
                } else o > d && (47 === e4.charCodeAt(a + c) ? u = c : 0 === c && (u = 0));
                break;
              }
              var p = e4.charCodeAt(a + c);
              if (p !== r4.charCodeAt(s + c)) break;
              47 === p && (u = c);
            }
            var h = "";
            for (c = a + u + 1; c <= i; ++c) (c === i || 47 === e4.charCodeAt(c)) && (0 === h.length ? h += ".." : h += "/..");
            return h.length > 0 ? h + r4.slice(s + u) : (s += u, 47 === r4.charCodeAt(s) && ++s, r4.slice(s));
          }, _makeLong: function(e4) {
            return e4;
          }, dirname: function(e4) {
            if (t2(e4), 0 === e4.length) return ".";
            for (var r4 = e4.charCodeAt(0), n3 = 47 === r4, a = -1, i = true, o = e4.length - 1; o >= 1; --o) if (47 === (r4 = e4.charCodeAt(o))) {
              if (!i) {
                a = o;
                break;
              }
            } else i = false;
            return -1 === a ? n3 ? "/" : "." : n3 && 1 === a ? "//" : e4.slice(0, a);
          }, basename: function(e4, r4) {
            if (void 0 !== r4 && "string" != typeof r4) throw TypeError('"ext" argument must be a string');
            t2(e4);
            var n3, a = 0, i = -1, o = true;
            if (void 0 !== r4 && r4.length > 0 && r4.length <= e4.length) {
              if (r4.length === e4.length && r4 === e4) return "";
              var s = r4.length - 1, l = -1;
              for (n3 = e4.length - 1; n3 >= 0; --n3) {
                var d = e4.charCodeAt(n3);
                if (47 === d) {
                  if (!o) {
                    a = n3 + 1;
                    break;
                  }
                } else -1 === l && (o = false, l = n3 + 1), s >= 0 && (d === r4.charCodeAt(s) ? -1 == --s && (i = n3) : (s = -1, i = l));
              }
              return a === i ? i = l : -1 === i && (i = e4.length), e4.slice(a, i);
            }
            for (n3 = e4.length - 1; n3 >= 0; --n3) if (47 === e4.charCodeAt(n3)) {
              if (!o) {
                a = n3 + 1;
                break;
              }
            } else -1 === i && (o = false, i = n3 + 1);
            return -1 === i ? "" : e4.slice(a, i);
          }, extname: function(e4) {
            t2(e4);
            for (var r4 = -1, n3 = 0, a = -1, i = true, o = 0, s = e4.length - 1; s >= 0; --s) {
              var l = e4.charCodeAt(s);
              if (47 === l) {
                if (!i) {
                  n3 = s + 1;
                  break;
                }
                continue;
              }
              -1 === a && (i = false, a = s + 1), 46 === l ? -1 === r4 ? r4 = s : 1 !== o && (o = 1) : -1 !== r4 && (o = -1);
            }
            return -1 === r4 || -1 === a || 0 === o || 1 === o && r4 === a - 1 && r4 === n3 + 1 ? "" : e4.slice(r4, a);
          }, format: function(e4) {
            var t3, r4;
            if (null === e4 || "object" != typeof e4) throw TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof e4);
            return t3 = e4.dir || e4.root, r4 = e4.base || (e4.name || "") + (e4.ext || ""), t3 ? t3 === e4.root ? t3 + r4 : t3 + "/" + r4 : r4;
          }, parse: function(e4) {
            t2(e4);
            var r4, n3 = { root: "", dir: "", base: "", ext: "", name: "" };
            if (0 === e4.length) return n3;
            var a = e4.charCodeAt(0), i = 47 === a;
            i ? (n3.root = "/", r4 = 1) : r4 = 0;
            for (var o = -1, s = 0, l = -1, d = true, u = e4.length - 1, c = 0; u >= r4; --u) {
              if (47 === (a = e4.charCodeAt(u))) {
                if (!d) {
                  s = u + 1;
                  break;
                }
                continue;
              }
              -1 === l && (d = false, l = u + 1), 46 === a ? -1 === o ? o = u : 1 !== c && (c = 1) : -1 !== o && (c = -1);
            }
            return -1 === o || -1 === l || 0 === c || 1 === c && o === l - 1 && o === s + 1 ? -1 !== l && (0 === s && i ? n3.base = n3.name = e4.slice(1, l) : n3.base = n3.name = e4.slice(s, l)) : (0 === s && i ? (n3.name = e4.slice(1, o), n3.base = e4.slice(1, l)) : (n3.name = e4.slice(s, o), n3.base = e4.slice(s, l)), n3.ext = e4.slice(o, l)), s > 0 ? n3.dir = e4.slice(0, s - 1) : i && (n3.dir = "/"), n3;
          }, sep: "/", delimiter: ":", win32: null, posix: null };
          n2.posix = n2, e3.exports = n2;
        } }, r2 = {};
        function n(t2) {
          var a = r2[t2];
          if (void 0 !== a) return a.exports;
          var i = r2[t2] = { exports: {} }, o = true;
          try {
            e2[t2](i, i.exports, n), o = false;
          } finally {
            o && delete r2[t2];
          }
          return i.exports;
        }
        n.ab = "/ROOT/node_modules/next/dist/compiled/path-browserify/", t.exports = n(431);
      }();
    }, 68886, (e, t, r) => {
      t.exports = e.r(54846);
    }, 67914, (e, t, r) => {
      (() => {
        "use strict";
        "u" > typeof __nccwpck_require__ && (__nccwpck_require__.ab = "/ROOT/node_modules/next/dist/compiled/path-to-regexp/");
        var e2 = {};
        (() => {
          function t2(e3, t3) {
            void 0 === t3 && (t3 = {});
            for (var r3 = function(e4) {
              for (var t4 = [], r4 = 0; r4 < e4.length; ) {
                var n3 = e4[r4];
                if ("*" === n3 || "+" === n3 || "?" === n3) {
                  t4.push({ type: "MODIFIER", index: r4, value: e4[r4++] });
                  continue;
                }
                if ("\\" === n3) {
                  t4.push({ type: "ESCAPED_CHAR", index: r4++, value: e4[r4++] });
                  continue;
                }
                if ("{" === n3) {
                  t4.push({ type: "OPEN", index: r4, value: e4[r4++] });
                  continue;
                }
                if ("}" === n3) {
                  t4.push({ type: "CLOSE", index: r4, value: e4[r4++] });
                  continue;
                }
                if (":" === n3) {
                  for (var a2 = "", i3 = r4 + 1; i3 < e4.length; ) {
                    var o3 = e4.charCodeAt(i3);
                    if (o3 >= 48 && o3 <= 57 || o3 >= 65 && o3 <= 90 || o3 >= 97 && o3 <= 122 || 95 === o3) {
                      a2 += e4[i3++];
                      continue;
                    }
                    break;
                  }
                  if (!a2) throw TypeError("Missing parameter name at ".concat(r4));
                  t4.push({ type: "NAME", index: r4, value: a2 }), r4 = i3;
                  continue;
                }
                if ("(" === n3) {
                  var s3 = 1, l2 = "", i3 = r4 + 1;
                  if ("?" === e4[i3]) throw TypeError('Pattern cannot start with "?" at '.concat(i3));
                  for (; i3 < e4.length; ) {
                    if ("\\" === e4[i3]) {
                      l2 += e4[i3++] + e4[i3++];
                      continue;
                    }
                    if (")" === e4[i3]) {
                      if (0 == --s3) {
                        i3++;
                        break;
                      }
                    } else if ("(" === e4[i3] && (s3++, "?" !== e4[i3 + 1])) throw TypeError("Capturing groups are not allowed at ".concat(i3));
                    l2 += e4[i3++];
                  }
                  if (s3) throw TypeError("Unbalanced pattern at ".concat(r4));
                  if (!l2) throw TypeError("Missing pattern at ".concat(r4));
                  t4.push({ type: "PATTERN", index: r4, value: l2 }), r4 = i3;
                  continue;
                }
                t4.push({ type: "CHAR", index: r4, value: e4[r4++] });
              }
              return t4.push({ type: "END", index: r4, value: "" }), t4;
            }(e3), n2 = t3.prefixes, i2 = void 0 === n2 ? "./" : n2, o2 = t3.delimiter, s2 = void 0 === o2 ? "/#?" : o2, l = [], d = 0, u = 0, c = "", p = function(e4) {
              if (u < r3.length && r3[u].type === e4) return r3[u++].value;
            }, h = function(e4) {
              var t4 = p(e4);
              if (void 0 !== t4) return t4;
              var n3 = r3[u], a2 = n3.type, i3 = n3.index;
              throw TypeError("Unexpected ".concat(a2, " at ").concat(i3, ", expected ").concat(e4));
            }, f = function() {
              for (var e4, t4 = ""; e4 = p("CHAR") || p("ESCAPED_CHAR"); ) t4 += e4;
              return t4;
            }, _ = function(e4) {
              for (var t4 = 0; t4 < s2.length; t4++) {
                var r4 = s2[t4];
                if (e4.indexOf(r4) > -1) return true;
              }
              return false;
            }, g = function(e4) {
              var t4 = l[l.length - 1], r4 = e4 || (t4 && "string" == typeof t4 ? t4 : "");
              if (t4 && !r4) throw TypeError('Must have text between two parameters, missing text after "'.concat(t4.name, '"'));
              return !r4 || _(r4) ? "[^".concat(a(s2), "]+?") : "(?:(?!".concat(a(r4), ")[^").concat(a(s2), "])+?");
            }; u < r3.length; ) {
              var m = p("CHAR"), v = p("NAME"), y = p("PATTERN");
              if (v || y) {
                var b = m || "";
                -1 === i2.indexOf(b) && (c += b, b = ""), c && (l.push(c), c = ""), l.push({ name: v || d++, prefix: b, suffix: "", pattern: y || g(b), modifier: p("MODIFIER") || "" });
                continue;
              }
              var w = m || p("ESCAPED_CHAR");
              if (w) {
                c += w;
                continue;
              }
              if (c && (l.push(c), c = ""), p("OPEN")) {
                var b = f(), E = p("NAME") || "", x = p("PATTERN") || "", C = f();
                h("CLOSE"), l.push({ name: E || (x ? d++ : ""), pattern: E && !x ? g(b) : x, prefix: b, suffix: C, modifier: p("MODIFIER") || "" });
                continue;
              }
              h("END");
            }
            return l;
          }
          function r2(e3, t3) {
            void 0 === t3 && (t3 = {});
            var r3 = i(t3), n2 = t3.encode, a2 = void 0 === n2 ? function(e4) {
              return e4;
            } : n2, o2 = t3.validate, s2 = void 0 === o2 || o2, l = e3.map(function(e4) {
              if ("object" == typeof e4) return new RegExp("^(?:".concat(e4.pattern, ")$"), r3);
            });
            return function(t4) {
              for (var r4 = "", n3 = 0; n3 < e3.length; n3++) {
                var i2 = e3[n3];
                if ("string" == typeof i2) {
                  r4 += i2;
                  continue;
                }
                var o3 = t4 ? t4[i2.name] : void 0, d = "?" === i2.modifier || "*" === i2.modifier, u = "*" === i2.modifier || "+" === i2.modifier;
                if (Array.isArray(o3)) {
                  if (!u) throw TypeError('Expected "'.concat(i2.name, '" to not repeat, but got an array'));
                  if (0 === o3.length) {
                    if (d) continue;
                    throw TypeError('Expected "'.concat(i2.name, '" to not be empty'));
                  }
                  for (var c = 0; c < o3.length; c++) {
                    var p = a2(o3[c], i2);
                    if (s2 && !l[n3].test(p)) throw TypeError('Expected all "'.concat(i2.name, '" to match "').concat(i2.pattern, '", but got "').concat(p, '"'));
                    r4 += i2.prefix + p + i2.suffix;
                  }
                  continue;
                }
                if ("string" == typeof o3 || "number" == typeof o3) {
                  var p = a2(String(o3), i2);
                  if (s2 && !l[n3].test(p)) throw TypeError('Expected "'.concat(i2.name, '" to match "').concat(i2.pattern, '", but got "').concat(p, '"'));
                  r4 += i2.prefix + p + i2.suffix;
                  continue;
                }
                if (!d) {
                  var h = u ? "an array" : "a string";
                  throw TypeError('Expected "'.concat(i2.name, '" to be ').concat(h));
                }
              }
              return r4;
            };
          }
          function n(e3, t3, r3) {
            void 0 === r3 && (r3 = {});
            var n2 = r3.decode, a2 = void 0 === n2 ? function(e4) {
              return e4;
            } : n2;
            return function(r4) {
              var n3 = e3.exec(r4);
              if (!n3) return false;
              for (var i2 = n3[0], o2 = n3.index, s2 = /* @__PURE__ */ Object.create(null), l = 1; l < n3.length; l++) !function(e4) {
                if (void 0 !== n3[e4]) {
                  var r5 = t3[e4 - 1];
                  "*" === r5.modifier || "+" === r5.modifier ? s2[r5.name] = n3[e4].split(r5.prefix + r5.suffix).map(function(e5) {
                    return a2(e5, r5);
                  }) : s2[r5.name] = a2(n3[e4], r5);
                }
              }(l);
              return { path: i2, index: o2, params: s2 };
            };
          }
          function a(e3) {
            return e3.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
          }
          function i(e3) {
            return e3 && e3.sensitive ? "" : "i";
          }
          function o(e3, t3, r3) {
            void 0 === r3 && (r3 = {});
            for (var n2 = r3.strict, o2 = void 0 !== n2 && n2, s2 = r3.start, l = r3.end, d = r3.encode, u = void 0 === d ? function(e4) {
              return e4;
            } : d, c = r3.delimiter, p = r3.endsWith, h = "[".concat(a(void 0 === p ? "" : p), "]|$"), f = "[".concat(a(void 0 === c ? "/#?" : c), "]"), _ = void 0 === s2 || s2 ? "^" : "", g = 0; g < e3.length; g++) {
              var m = e3[g];
              if ("string" == typeof m) _ += a(u(m));
              else {
                var v = a(u(m.prefix)), y = a(u(m.suffix));
                if (m.pattern) if (t3 && t3.push(m), v || y) if ("+" === m.modifier || "*" === m.modifier) {
                  var b = "*" === m.modifier ? "?" : "";
                  _ += "(?:".concat(v, "((?:").concat(m.pattern, ")(?:").concat(y).concat(v, "(?:").concat(m.pattern, "))*)").concat(y, ")").concat(b);
                } else _ += "(?:".concat(v, "(").concat(m.pattern, ")").concat(y, ")").concat(m.modifier);
                else {
                  if ("+" === m.modifier || "*" === m.modifier) throw TypeError('Can not repeat "'.concat(m.name, '" without a prefix and suffix'));
                  _ += "(".concat(m.pattern, ")").concat(m.modifier);
                }
                else _ += "(?:".concat(v).concat(y, ")").concat(m.modifier);
              }
            }
            if (void 0 === l || l) o2 || (_ += "".concat(f, "?")), _ += r3.endsWith ? "(?=".concat(h, ")") : "$";
            else {
              var w = e3[e3.length - 1], E = "string" == typeof w ? f.indexOf(w[w.length - 1]) > -1 : void 0 === w;
              o2 || (_ += "(?:".concat(f, "(?=").concat(h, "))?")), E || (_ += "(?=".concat(f, "|").concat(h, ")"));
            }
            return new RegExp(_, i(r3));
          }
          function s(e3, r3, n2) {
            if (e3 instanceof RegExp) {
              var a2;
              if (!r3) return e3;
              for (var l = /\((?:\?<(.*?)>)?(?!\?)/g, d = 0, u = l.exec(e3.source); u; ) r3.push({ name: u[1] || d++, prefix: "", suffix: "", modifier: "", pattern: "" }), u = l.exec(e3.source);
              return e3;
            }
            return Array.isArray(e3) ? (a2 = e3.map(function(e4) {
              return s(e4, r3, n2).source;
            }), new RegExp("(?:".concat(a2.join("|"), ")"), i(n2))) : o(t2(e3, n2), r3, n2);
          }
          Object.defineProperty(e2, "__esModule", { value: true }), e2.pathToRegexp = e2.tokensToRegexp = e2.regexpToFunction = e2.match = e2.tokensToFunction = e2.compile = e2.parse = void 0, e2.parse = t2, e2.compile = function(e3, n2) {
            return r2(t2(e3, n2), n2);
          }, e2.tokensToFunction = r2, e2.match = function(e3, t3) {
            var r3 = [];
            return n(s(e3, r3, t3), r3, t3);
          }, e2.regexpToFunction = n, e2.tokensToRegexp = o, e2.pathToRegexp = s;
        })(), t.exports = e2;
      })();
    }, 64445, (e, t, r) => {
      var n = { 943: function(t2, r2) {
        !function(n2) {
          "use strict";
          var a2 = "function", i2 = "undefined", o = "object", s = "string", l = "major", d = "model", u = "name", c = "type", p = "vendor", h = "version", f = "architecture", _ = "console", g = "mobile", m = "tablet", v = "smarttv", y = "wearable", b = "embedded", w = "Amazon", E = "Apple", x = "ASUS", C = "BlackBerry", S = "Browser", T = "Chrome", R = "Firefox", O = "Google", P = "Huawei", N = "Microsoft", A = "Motorola", M = "Opera", L = "Samsung", I = "Sharp", k = "Sony", D = "Xiaomi", j = "Zebra", q = "Facebook", U = "Chromium OS", B = "Mac OS", G = function(e2, t3) {
            var r3 = {};
            for (var n3 in e2) t3[n3] && t3[n3].length % 2 == 0 ? r3[n3] = t3[n3].concat(e2[n3]) : r3[n3] = e2[n3];
            return r3;
          }, H = function(e2) {
            for (var t3 = {}, r3 = 0; r3 < e2.length; r3++) t3[e2[r3].toUpperCase()] = e2[r3];
            return t3;
          }, $ = function(e2, t3) {
            return typeof e2 === s && -1 !== V(t3).indexOf(V(e2));
          }, V = function(e2) {
            return e2.toLowerCase();
          }, F = function(e2, t3) {
            if (typeof e2 === s) return e2 = e2.replace(/^\s\s*/, ""), typeof t3 === i2 ? e2 : e2.substring(0, 350);
          }, z = function(e2, t3) {
            for (var r3, n3, i3, s2, l2, d2, u2 = 0; u2 < t3.length && !l2; ) {
              var c2 = t3[u2], p2 = t3[u2 + 1];
              for (r3 = n3 = 0; r3 < c2.length && !l2 && c2[r3]; ) if (l2 = c2[r3++].exec(e2)) for (i3 = 0; i3 < p2.length; i3++) d2 = l2[++n3], typeof (s2 = p2[i3]) === o && s2.length > 0 ? 2 === s2.length ? typeof s2[1] == a2 ? this[s2[0]] = s2[1].call(this, d2) : this[s2[0]] = s2[1] : 3 === s2.length ? typeof s2[1] !== a2 || s2[1].exec && s2[1].test ? this[s2[0]] = d2 ? d2.replace(s2[1], s2[2]) : void 0 : this[s2[0]] = d2 ? s2[1].call(this, d2, s2[2]) : void 0 : 4 === s2.length && (this[s2[0]] = d2 ? s2[3].call(this, d2.replace(s2[1], s2[2])) : void 0) : this[s2] = d2 || void 0;
              u2 += 2;
            }
          }, K = function(e2, t3) {
            for (var r3 in t3) if (typeof t3[r3] === o && t3[r3].length > 0) {
              for (var n3 = 0; n3 < t3[r3].length; n3++) if ($(t3[r3][n3], e2)) return "?" === r3 ? void 0 : r3;
            } else if ($(t3[r3], e2)) return "?" === r3 ? void 0 : r3;
            return e2;
          }, W = { ME: "4.90", "NT 3.11": "NT3.51", "NT 4.0": "NT4.0", 2e3: "NT 5.0", XP: ["NT 5.1", "NT 5.2"], Vista: "NT 6.0", 7: "NT 6.1", 8: "NT 6.2", 8.1: "NT 6.3", 10: ["NT 6.4", "NT 10.0"], RT: "ARM" }, X = { browser: [[/\b(?:crmo|crios)\/([\w\.]+)/i], [h, [u, "Chrome"]], [/edg(?:e|ios|a)?\/([\w\.]+)/i], [h, [u, "Edge"]], [/(opera mini)\/([-\w\.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i], [u, h], [/opios[\/ ]+([\w\.]+)/i], [h, [u, M + " Mini"]], [/\bopr\/([\w\.]+)/i], [h, [u, M]], [/(kindle)\/([\w\.]+)/i, /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i, /(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i, /(ba?idubrowser)[\/ ]?([\w\.]+)/i, /(?:ms|\()(ie) ([\w\.]+)/i, /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i, /(heytap|ovi)browser\/([\d\.]+)/i, /(weibo)__([\d\.]+)/i], [u, h], [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i], [h, [u, "UC" + S]], [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i], [h, [u, "WeChat(Win) Desktop"]], [/micromessenger\/([\w\.]+)/i], [h, [u, "WeChat"]], [/konqueror\/([\w\.]+)/i], [h, [u, "Konqueror"]], [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i], [h, [u, "IE"]], [/ya(?:search)?browser\/([\w\.]+)/i], [h, [u, "Yandex"]], [/(avast|avg)\/([\w\.]+)/i], [[u, /(.+)/, "$1 Secure " + S], h], [/\bfocus\/([\w\.]+)/i], [h, [u, R + " Focus"]], [/\bopt\/([\w\.]+)/i], [h, [u, M + " Touch"]], [/coc_coc\w+\/([\w\.]+)/i], [h, [u, "Coc Coc"]], [/dolfin\/([\w\.]+)/i], [h, [u, "Dolphin"]], [/coast\/([\w\.]+)/i], [h, [u, M + " Coast"]], [/miuibrowser\/([\w\.]+)/i], [h, [u, "MIUI " + S]], [/fxios\/([-\w\.]+)/i], [h, [u, R]], [/\bqihu|(qi?ho?o?|360)browser/i], [[u, "360 " + S]], [/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i], [[u, /(.+)/, "$1 " + S], h], [/(comodo_dragon)\/([\w\.]+)/i], [[u, /_/g, " "], h], [/(electron)\/([\w\.]+) safari/i, /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, /m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i], [u, h], [/(metasr)[\/ ]?([\w\.]+)/i, /(lbbrowser)/i, /\[(linkedin)app\]/i], [u], [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i], [[u, q], h], [/(kakao(?:talk|story))[\/ ]([\w\.]+)/i, /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, /safari (line)\/([\w\.]+)/i, /\b(line)\/([\w\.]+)\/iab/i, /(chromium|instagram)[\/ ]([-\w\.]+)/i], [u, h], [/\bgsa\/([\w\.]+) .*safari\//i], [h, [u, "GSA"]], [/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i], [h, [u, "TikTok"]], [/headlesschrome(?:\/([\w\.]+)| )/i], [h, [u, T + " Headless"]], [/ wv\).+(chrome)\/([\w\.]+)/i], [[u, T + " WebView"], h], [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i], [h, [u, "Android " + S]], [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i], [u, h], [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i], [h, [u, "Mobile Safari"]], [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i], [h, u], [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i], [u, [h, K, { "1.0": "/8", 1.2: "/1", 1.3: "/3", "2.0": "/412", "2.0.2": "/416", "2.0.3": "/417", "2.0.4": "/419", "?": "/" }]], [/(webkit|khtml)\/([\w\.]+)/i], [u, h], [/(navigator|netscape\d?)\/([-\w\.]+)/i], [[u, "Netscape"], h], [/mobile vr; rv:([\w\.]+)\).+firefox/i], [h, [u, R + " Reality"]], [/ekiohf.+(flow)\/([\w\.]+)/i, /(swiftfox)/i, /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i, /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i, /(firefox)\/([\w\.]+)/i, /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i, /(links) \(([\w\.]+)/i, /panasonic;(viera)/i], [u, h], [/(cobalt)\/([\w\.]+)/i], [u, [h, /master.|lts./, ""]]], cpu: [[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i], [[f, "amd64"]], [/(ia32(?=;))/i], [[f, V]], [/((?:i[346]|x)86)[;\)]/i], [[f, "ia32"]], [/\b(aarch64|arm(v?8e?l?|_?64))\b/i], [[f, "arm64"]], [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i], [[f, "armhf"]], [/windows (ce|mobile); ppc;/i], [[f, "arm"]], [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i], [[f, /ower/, "", V]], [/(sun4\w)[;\)]/i], [[f, "sparc"]], [/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i], [[f, V]]], device: [[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i], [d, [p, L], [c, m]], [/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i, /samsung[- ]([-\w]+)/i, /sec-(sgh\w+)/i], [d, [p, L], [c, g]], [/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i], [d, [p, E], [c, g]], [/\((ipad);[-\w\),; ]+apple/i, /applecoremedia\/[\w\.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i], [d, [p, E], [c, m]], [/(macintosh);/i], [d, [p, E]], [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i], [d, [p, I], [c, g]], [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i], [d, [p, P], [c, m]], [/(?:huawei|honor)([-\w ]+)[;\)]/i, /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i], [d, [p, P], [c, g]], [/\b(poco[\w ]+)(?: bui|\))/i, /\b; (\w+) build\/hm\1/i, /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i], [[d, /_/g, " "], [p, D], [c, g]], [/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i], [[d, /_/g, " "], [p, D], [c, m]], [/; (\w+) bui.+ oppo/i, /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i], [d, [p, "OPPO"], [c, g]], [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i], [d, [p, "Vivo"], [c, g]], [/\b(rmx[12]\d{3})(?: bui|;|\))/i], [d, [p, "Realme"], [c, g]], [/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i, /\bmot(?:orola)?[- ](\w*)/i, /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i], [d, [p, A], [c, g]], [/\b(mz60\d|xoom[2 ]{0,2}) build\//i], [d, [p, A], [c, m]], [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i], [d, [p, "LG"], [c, m]], [/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i, /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i, /\blg-?([\d\w]+) bui/i], [d, [p, "LG"], [c, g]], [/(ideatab[-\w ]+)/i, /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i], [d, [p, "Lenovo"], [c, m]], [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i], [[d, /_/g, " "], [p, "Nokia"], [c, g]], [/(pixel c)\b/i], [d, [p, O], [c, m]], [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i], [d, [p, O], [c, g]], [/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i], [d, [p, k], [c, g]], [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i], [[d, "Xperia Tablet"], [p, k], [c, m]], [/ (kb2005|in20[12]5|be20[12][59])\b/i, /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i], [d, [p, "OnePlus"], [c, g]], [/(alexa)webm/i, /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i, /(kf[a-z]+)( bui|\)).+silk\//i], [d, [p, w], [c, m]], [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i], [[d, /(.+)/g, "Fire Phone $1"], [p, w], [c, g]], [/(playbook);[-\w\),; ]+(rim)/i], [d, p, [c, m]], [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i], [d, [p, C], [c, g]], [/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i], [d, [p, x], [c, m]], [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i], [d, [p, x], [c, g]], [/(nexus 9)/i], [d, [p, "HTC"], [c, m]], [/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i, /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i], [p, [d, /_/g, " "], [c, g]], [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i], [d, [p, "Acer"], [c, m]], [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i], [d, [p, "Meizu"], [c, g]], [/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i, /(hp) ([\w ]+\w)/i, /(asus)-?(\w+)/i, /(microsoft); (lumia[\w ]+)/i, /(lenovo)[-_ ]?([-\w]+)/i, /(jolla)/i, /(oppo) ?([\w ]+) bui/i], [p, d, [c, g]], [/(kobo)\s(ereader|touch)/i, /(archos) (gamepad2?)/i, /(hp).+(touchpad(?!.+tablet)|tablet)/i, /(kindle)\/([\w\.]+)/i, /(nook)[\w ]+build\/(\w+)/i, /(dell) (strea[kpr\d ]*[\dko])/i, /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, /(trinity)[- ]*(t\d{3}) bui/i, /(gigaset)[- ]+(q\w{1,9}) bui/i, /(vodafone) ([\w ]+)(?:\)| bui)/i], [p, d, [c, m]], [/(surface duo)/i], [d, [p, N], [c, m]], [/droid [\d\.]+; (fp\du?)(?: b|\))/i], [d, [p, "Fairphone"], [c, g]], [/(u304aa)/i], [d, [p, "AT&T"], [c, g]], [/\bsie-(\w*)/i], [d, [p, "Siemens"], [c, g]], [/\b(rct\w+) b/i], [d, [p, "RCA"], [c, m]], [/\b(venue[\d ]{2,7}) b/i], [d, [p, "Dell"], [c, m]], [/\b(q(?:mv|ta)\w+) b/i], [d, [p, "Verizon"], [c, m]], [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i], [d, [p, "Barnes & Noble"], [c, m]], [/\b(tm\d{3}\w+) b/i], [d, [p, "NuVision"], [c, m]], [/\b(k88) b/i], [d, [p, "ZTE"], [c, m]], [/\b(nx\d{3}j) b/i], [d, [p, "ZTE"], [c, g]], [/\b(gen\d{3}) b.+49h/i], [d, [p, "Swiss"], [c, g]], [/\b(zur\d{3}) b/i], [d, [p, "Swiss"], [c, m]], [/\b((zeki)?tb.*\b) b/i], [d, [p, "Zeki"], [c, m]], [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i], [[p, "Dragon Touch"], d, [c, m]], [/\b(ns-?\w{0,9}) b/i], [d, [p, "Insignia"], [c, m]], [/\b((nxa|next)-?\w{0,9}) b/i], [d, [p, "NextBook"], [c, m]], [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i], [[p, "Voice"], d, [c, g]], [/\b(lvtel\-)?(v1[12]) b/i], [[p, "LvTel"], d, [c, g]], [/\b(ph-1) /i], [d, [p, "Essential"], [c, g]], [/\b(v(100md|700na|7011|917g).*\b) b/i], [d, [p, "Envizen"], [c, m]], [/\b(trio[-\w\. ]+) b/i], [d, [p, "MachSpeed"], [c, m]], [/\btu_(1491) b/i], [d, [p, "Rotor"], [c, m]], [/(shield[\w ]+) b/i], [d, [p, "Nvidia"], [c, m]], [/(sprint) (\w+)/i], [p, d, [c, g]], [/(kin\.[onetw]{3})/i], [[d, /\./g, " "], [p, N], [c, g]], [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i], [d, [p, j], [c, m]], [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i], [d, [p, j], [c, g]], [/smart-tv.+(samsung)/i], [p, [c, v]], [/hbbtv.+maple;(\d+)/i], [[d, /^/, "SmartTV"], [p, L], [c, v]], [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i], [[p, "LG"], [c, v]], [/(apple) ?tv/i], [p, [d, E + " TV"], [c, v]], [/crkey/i], [[d, T + "cast"], [p, O], [c, v]], [/droid.+aft(\w)( bui|\))/i], [d, [p, w], [c, v]], [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i], [d, [p, I], [c, v]], [/(bravia[\w ]+)( bui|\))/i], [d, [p, k], [c, v]], [/(mitv-\w{5}) bui/i], [d, [p, D], [c, v]], [/Hbbtv.*(technisat) (.*);/i], [p, d, [c, v]], [/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i], [[p, F], [d, F], [c, v]], [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i], [[c, v]], [/(ouya)/i, /(nintendo) ([wids3utch]+)/i], [p, d, [c, _]], [/droid.+; (shield) bui/i], [d, [p, "Nvidia"], [c, _]], [/(playstation [345portablevi]+)/i], [d, [p, k], [c, _]], [/\b(xbox(?: one)?(?!; xbox))[\); ]/i], [d, [p, N], [c, _]], [/((pebble))app/i], [p, d, [c, y]], [/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i], [d, [p, E], [c, y]], [/droid.+; (glass) \d/i], [d, [p, O], [c, y]], [/droid.+; (wt63?0{2,3})\)/i], [d, [p, j], [c, y]], [/(quest( 2| pro)?)/i], [d, [p, q], [c, y]], [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i], [p, [c, b]], [/(aeobc)\b/i], [d, [p, w], [c, b]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i], [d, [c, g]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i], [d, [c, m]], [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i], [[c, m]], [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i], [[c, g]], [/(android[-\w\. ]{0,9});.+buil/i], [d, [p, "Generic"]]], engine: [[/windows.+ edge\/([\w\.]+)/i], [h, [u, "EdgeHTML"]], [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i], [h, [u, "Blink"]], [/(presto)\/([\w\.]+)/i, /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, /ekioh(flow)\/([\w\.]+)/i, /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, /(icab)[\/ ]([23]\.[\d\.]+)/i, /\b(libweb)/i], [u, h], [/rv\:([\w\.]{1,9})\b.+(gecko)/i], [h, u]], os: [[/microsoft (windows) (vista|xp)/i], [u, h], [/(windows) nt 6\.2; (arm)/i, /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i, /(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i], [u, [h, K, W]], [/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i], [[u, "Windows"], [h, K, W]], [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /ios;fbsv\/([\d\.]+)/i, /cfnetwork\/.+darwin/i], [[h, /_/g, "."], [u, "iOS"]], [/(mac os x) ?([\w\. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i], [[u, B], [h, /_/g, "."]], [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i], [h, u], [/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i, /(blackberry)\w*\/([\w\.]*)/i, /(tizen|kaios)[\/ ]([\w\.]+)/i, /\((series40);/i], [u, h], [/\(bb(10);/i], [h, [u, C]], [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i], [h, [u, "Symbian"]], [/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i], [h, [u, R + " OS"]], [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i], [h, [u, "webOS"]], [/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i], [h, [u, "watchOS"]], [/crkey\/([\d\.]+)/i], [h, [u, T + "cast"]], [/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i], [[u, U], h], [/panasonic;(viera)/i, /(netrange)mmh/i, /(nettv)\/(\d+\.[\w\.]+)/i, /(nintendo|playstation) ([wids345portablevuch]+)/i, /(xbox); +xbox ([^\);]+)/i, /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, /(mint)[\/\(\) ]?(\w*)/i, /(mageia|vectorlinux)[; ]/i, /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i, /(hurd|linux) ?([\w\.]*)/i, /(gnu) ?([\w\.]*)/i, /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, /(haiku) (\w+)/i], [u, h], [/(sunos) ?([\w\.\d]*)/i], [[u, "Solaris"], h], [/((?:open)?solaris)[-\/ ]?([\w\.]*)/i, /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, /(unix) ?([\w\.]*)/i], [u, h]] }, Z = function(e2, t3) {
            if (typeof e2 === o && (t3 = e2, e2 = void 0), !(this instanceof Z)) return new Z(e2, t3).getResult();
            var r3 = typeof n2 !== i2 && n2.navigator ? n2.navigator : void 0, _2 = e2 || (r3 && r3.userAgent ? r3.userAgent : ""), v2 = r3 && r3.userAgentData ? r3.userAgentData : void 0, y2 = t3 ? G(X, t3) : X, b2 = r3 && r3.userAgent == _2;
            return this.getBrowser = function() {
              var e3, t4 = {};
              return t4[u] = void 0, t4[h] = void 0, z.call(t4, _2, y2.browser), t4[l] = typeof (e3 = t4[h]) === s ? e3.replace(/[^\d\.]/g, "").split(".")[0] : void 0, b2 && r3 && r3.brave && typeof r3.brave.isBrave == a2 && (t4[u] = "Brave"), t4;
            }, this.getCPU = function() {
              var e3 = {};
              return e3[f] = void 0, z.call(e3, _2, y2.cpu), e3;
            }, this.getDevice = function() {
              var e3 = {};
              return e3[p] = void 0, e3[d] = void 0, e3[c] = void 0, z.call(e3, _2, y2.device), b2 && !e3[c] && v2 && v2.mobile && (e3[c] = g), b2 && "Macintosh" == e3[d] && r3 && typeof r3.standalone !== i2 && r3.maxTouchPoints && r3.maxTouchPoints > 2 && (e3[d] = "iPad", e3[c] = m), e3;
            }, this.getEngine = function() {
              var e3 = {};
              return e3[u] = void 0, e3[h] = void 0, z.call(e3, _2, y2.engine), e3;
            }, this.getOS = function() {
              var e3 = {};
              return e3[u] = void 0, e3[h] = void 0, z.call(e3, _2, y2.os), b2 && !e3[u] && v2 && "Unknown" != v2.platform && (e3[u] = v2.platform.replace(/chrome os/i, U).replace(/macos/i, B)), e3;
            }, this.getResult = function() {
              return { ua: this.getUA(), browser: this.getBrowser(), engine: this.getEngine(), os: this.getOS(), device: this.getDevice(), cpu: this.getCPU() };
            }, this.getUA = function() {
              return _2;
            }, this.setUA = function(e3) {
              return _2 = typeof e3 === s && e3.length > 350 ? F(e3, 350) : e3, this;
            }, this.setUA(_2), this;
          };
          if (Z.VERSION = "1.0.35", Z.BROWSER = H([u, h, l]), Z.CPU = H([f]), Z.DEVICE = H([d, p, c, _, g, v, m, y, b]), Z.ENGINE = Z.OS = H([u, h]), typeof r2 !== i2) t2.exports && (r2 = t2.exports = Z), r2.UAParser = Z;
          else if (typeof define === a2 && define.amd) e.r, void 0 !== Z && e.v(Z);
          else typeof n2 !== i2 && (n2.UAParser = Z);
          var J = typeof n2 !== i2 && (n2.jQuery || n2.Zepto);
          if (J && !J.ua) {
            var Y = new Z();
            J.ua = Y.getResult(), J.ua.get = function() {
              return Y.getUA();
            }, J.ua.set = function(e2) {
              Y.setUA(e2);
              var t3 = Y.getResult();
              for (var r3 in t3) J.ua[r3] = t3[r3];
            };
          }
        }(this);
      } }, a = {};
      function i(e2) {
        var t2 = a[e2];
        if (void 0 !== t2) return t2.exports;
        var r2 = a[e2] = { exports: {} }, o = true;
        try {
          n[e2].call(r2.exports, r2, r2.exports, i), o = false;
        } finally {
          o && delete a[e2];
        }
        return r2.exports;
      }
      i.ab = "/ROOT/node_modules/next/dist/compiled/ua-parser-js/", t.exports = i(943);
    }, 8946, (e, t, r) => {
      "use strict";
      var n = { H: null, A: null };
      function a(e2) {
        var t2 = "https://react.dev/errors/" + e2;
        if (1 < arguments.length) {
          t2 += "?args[]=" + encodeURIComponent(arguments[1]);
          for (var r2 = 2; r2 < arguments.length; r2++) t2 += "&args[]=" + encodeURIComponent(arguments[r2]);
        }
        return "Minified React error #" + e2 + "; visit " + t2 + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
      }
      var i = Array.isArray;
      function o() {
      }
      var s = Symbol.for("react.transitional.element"), l = Symbol.for("react.portal"), d = Symbol.for("react.fragment"), u = Symbol.for("react.strict_mode"), c = Symbol.for("react.profiler"), p = Symbol.for("react.forward_ref"), h = Symbol.for("react.suspense"), f = Symbol.for("react.memo"), _ = Symbol.for("react.lazy"), g = Symbol.for("react.activity"), m = Symbol.for("react.view_transition"), v = Symbol.iterator, y = Object.prototype.hasOwnProperty, b = Object.assign;
      function w(e2, t2, r2) {
        var n2 = r2.ref;
        return { $$typeof: s, type: e2, key: t2, ref: void 0 !== n2 ? n2 : null, props: r2 };
      }
      function E(e2) {
        return "object" == typeof e2 && null !== e2 && e2.$$typeof === s;
      }
      var x = /\/+/g;
      function C(e2, t2) {
        var r2, n2;
        return "object" == typeof e2 && null !== e2 && null != e2.key ? (r2 = "" + e2.key, n2 = { "=": "=0", ":": "=2" }, "$" + r2.replace(/[=:]/g, function(e3) {
          return n2[e3];
        })) : t2.toString(36);
      }
      function S(e2, t2, r2) {
        if (null == e2) return e2;
        var n2 = [], d2 = 0;
        return !function e3(t3, r3, n3, d3, u2) {
          var c2, p2, h2, f2 = typeof t3;
          ("undefined" === f2 || "boolean" === f2) && (t3 = null);
          var g2 = false;
          if (null === t3) g2 = true;
          else switch (f2) {
            case "bigint":
            case "string":
            case "number":
              g2 = true;
              break;
            case "object":
              switch (t3.$$typeof) {
                case s:
                case l:
                  g2 = true;
                  break;
                case _:
                  return e3((g2 = t3._init)(t3._payload), r3, n3, d3, u2);
              }
          }
          if (g2) return u2 = u2(t3), g2 = "" === d3 ? "." + C(t3, 0) : d3, i(u2) ? (n3 = "", null != g2 && (n3 = g2.replace(x, "$&/") + "/"), e3(u2, r3, n3, "", function(e4) {
            return e4;
          })) : null != u2 && (E(u2) && (c2 = u2, p2 = n3 + (null == u2.key || t3 && t3.key === u2.key ? "" : ("" + u2.key).replace(x, "$&/") + "/") + g2, u2 = w(c2.type, p2, c2.props)), r3.push(u2)), 1;
          g2 = 0;
          var m2 = "" === d3 ? "." : d3 + ":";
          if (i(t3)) for (var y2 = 0; y2 < t3.length; y2++) f2 = m2 + C(d3 = t3[y2], y2), g2 += e3(d3, r3, n3, f2, u2);
          else if ("function" == typeof (y2 = null === (h2 = t3) || "object" != typeof h2 ? null : "function" == typeof (h2 = v && h2[v] || h2["@@iterator"]) ? h2 : null)) for (t3 = y2.call(t3), y2 = 0; !(d3 = t3.next()).done; ) f2 = m2 + C(d3 = d3.value, y2++), g2 += e3(d3, r3, n3, f2, u2);
          else if ("object" === f2) {
            if ("function" == typeof t3.then) return e3(function(e4) {
              switch (e4.status) {
                case "fulfilled":
                  return e4.value;
                case "rejected":
                  throw e4.reason;
                default:
                  switch ("string" == typeof e4.status ? e4.then(o, o) : (e4.status = "pending", e4.then(function(t4) {
                    "pending" === e4.status && (e4.status = "fulfilled", e4.value = t4);
                  }, function(t4) {
                    "pending" === e4.status && (e4.status = "rejected", e4.reason = t4);
                  })), e4.status) {
                    case "fulfilled":
                      return e4.value;
                    case "rejected":
                      throw e4.reason;
                  }
              }
              throw e4;
            }(t3), r3, n3, d3, u2);
            throw Error(a(31, "[object Object]" === (r3 = String(t3)) ? "object with keys {" + Object.keys(t3).join(", ") + "}" : r3));
          }
          return g2;
        }(e2, n2, "", "", function(e3) {
          return t2.call(r2, e3, d2++);
        }), n2;
      }
      function T(e2) {
        if (-1 === e2._status) {
          var t2 = (0, e2._result)();
          t2.then(function(r2) {
            (0 === e2._status || -1 === e2._status) && (e2._status = 1, e2._result = r2, void 0 === t2.status && (t2.status = "fulfilled", t2.value = r2));
          }, function(r2) {
            (0 === e2._status || -1 === e2._status) && (e2._status = 2, e2._result = r2, void 0 === t2.status && (t2.status = "rejected", t2.reason = r2));
          }), -1 === e2._status && (e2._status = 0, e2._result = t2);
        }
        if (1 === e2._status) return e2._result.default;
        throw e2._result;
      }
      function R() {
        return /* @__PURE__ */ new WeakMap();
      }
      function O() {
        return { s: 0, v: void 0, o: null, p: null };
      }
      r.Activity = g, r.Children = { map: S, forEach: function(e2, t2, r2) {
        S(e2, function() {
          t2.apply(this, arguments);
        }, r2);
      }, count: function(e2) {
        var t2 = 0;
        return S(e2, function() {
          t2++;
        }), t2;
      }, toArray: function(e2) {
        return S(e2, function(e3) {
          return e3;
        }) || [];
      }, only: function(e2) {
        if (!E(e2)) throw Error(a(143));
        return e2;
      } }, r.Fragment = d, r.Profiler = c, r.StrictMode = u, r.Suspense = h, r.ViewTransition = m, r.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = n, r.cache = function(e2) {
        return function() {
          var t2 = n.A;
          if (!t2) return e2.apply(null, arguments);
          var r2 = t2.getCacheForType(R);
          void 0 === (t2 = r2.get(e2)) && (t2 = O(), r2.set(e2, t2)), r2 = 0;
          for (var a2 = arguments.length; r2 < a2; r2++) {
            var i2 = arguments[r2];
            if ("function" == typeof i2 || "object" == typeof i2 && null !== i2) {
              var o2 = t2.o;
              null === o2 && (t2.o = o2 = /* @__PURE__ */ new WeakMap()), void 0 === (t2 = o2.get(i2)) && (t2 = O(), o2.set(i2, t2));
            } else null === (o2 = t2.p) && (t2.p = o2 = /* @__PURE__ */ new Map()), void 0 === (t2 = o2.get(i2)) && (t2 = O(), o2.set(i2, t2));
          }
          if (1 === t2.s) return t2.v;
          if (2 === t2.s) throw t2.v;
          try {
            var s2 = e2.apply(null, arguments);
            return (r2 = t2).s = 1, r2.v = s2;
          } catch (e3) {
            throw (s2 = t2).s = 2, s2.v = e3, e3;
          }
        };
      }, r.cacheSignal = function() {
        var e2 = n.A;
        return e2 ? e2.cacheSignal() : null;
      }, r.captureOwnerStack = function() {
        return null;
      }, r.cloneElement = function(e2, t2, r2) {
        if (null == e2) throw Error(a(267, e2));
        var n2 = b({}, e2.props), i2 = e2.key;
        if (null != t2) for (o2 in void 0 !== t2.key && (i2 = "" + t2.key), t2) y.call(t2, o2) && "key" !== o2 && "__self" !== o2 && "__source" !== o2 && ("ref" !== o2 || void 0 !== t2.ref) && (n2[o2] = t2[o2]);
        var o2 = arguments.length - 2;
        if (1 === o2) n2.children = r2;
        else if (1 < o2) {
          for (var s2 = Array(o2), l2 = 0; l2 < o2; l2++) s2[l2] = arguments[l2 + 2];
          n2.children = s2;
        }
        return w(e2.type, i2, n2);
      }, r.createElement = function(e2, t2, r2) {
        var n2, a2 = {}, i2 = null;
        if (null != t2) for (n2 in void 0 !== t2.key && (i2 = "" + t2.key), t2) y.call(t2, n2) && "key" !== n2 && "__self" !== n2 && "__source" !== n2 && (a2[n2] = t2[n2]);
        var o2 = arguments.length - 2;
        if (1 === o2) a2.children = r2;
        else if (1 < o2) {
          for (var s2 = Array(o2), l2 = 0; l2 < o2; l2++) s2[l2] = arguments[l2 + 2];
          a2.children = s2;
        }
        if (e2 && e2.defaultProps) for (n2 in o2 = e2.defaultProps) void 0 === a2[n2] && (a2[n2] = o2[n2]);
        return w(e2, i2, a2);
      }, r.createRef = function() {
        return { current: null };
      }, r.forwardRef = function(e2) {
        return { $$typeof: p, render: e2 };
      }, r.isValidElement = E, r.lazy = function(e2) {
        return { $$typeof: _, _payload: { _status: -1, _result: e2 }, _init: T };
      }, r.memo = function(e2, t2) {
        return { $$typeof: f, type: e2, compare: void 0 === t2 ? null : t2 };
      }, r.use = function(e2) {
        return n.H.use(e2);
      }, r.useCallback = function(e2, t2) {
        return n.H.useCallback(e2, t2);
      }, r.useDebugValue = function() {
      }, r.useId = function() {
        return n.H.useId();
      }, r.useMemo = function(e2, t2) {
        return n.H.useMemo(e2, t2);
      }, r.version = "19.3.0-canary-cbb046ab-20260731";
    }, 40049, (e, t, r) => {
      "use strict";
      t.exports = e.r(8946);
    }, 15737, (e, t, r) => {
      "use strict";
      t.exports = a, t.exports.preferredCharsets = a;
      var n = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
      function a(e2, t2) {
        var r2 = function(e3) {
          for (var t3 = e3.split(","), r3 = 0, a3 = 0; r3 < t3.length; r3++) {
            var i2 = function(e4, t4) {
              var r4 = n.exec(e4);
              if (!r4) return null;
              var a4 = r4[1], i3 = 1;
              if (r4[2]) for (var o2 = r4[2].split(";"), s2 = 0; s2 < o2.length; s2++) {
                var l = o2[s2].trim().split("=");
                if ("q" === l[0]) {
                  i3 = parseFloat(l[1]);
                  break;
                }
              }
              return { charset: a4, q: i3, i: t4 };
            }(t3[r3].trim(), r3);
            i2 && (t3[a3++] = i2);
          }
          return t3.length = a3, t3;
        }(void 0 === e2 ? "*" : e2 || "");
        if (!t2) return r2.filter(s).sort(i).map(o);
        var a2 = t2.map(function(e3, t3) {
          for (var n2 = { o: -1, q: 0, s: 0 }, a3 = 0; a3 < r2.length; a3++) {
            var i2 = function(e4, t4, r3) {
              var n3 = 0;
              if (t4.charset.toLowerCase() === e4.toLowerCase()) n3 |= 1;
              else if ("*" !== t4.charset) return null;
              return { i: r3, o: t4.i, q: t4.q, s: n3 };
            }(e3, r2[a3], t3);
            i2 && 0 > (n2.s - i2.s || n2.q - i2.q || n2.o - i2.o) && (n2 = i2);
          }
          return n2;
        });
        return a2.filter(s).sort(i).map(function(e3) {
          return t2[a2.indexOf(e3)];
        });
      }
      function i(e2, t2) {
        return t2.q - e2.q || t2.s - e2.s || e2.o - t2.o || e2.i - t2.i || 0;
      }
      function o(e2) {
        return e2.charset;
      }
      function s(e2) {
        return e2.q > 0;
      }
    }, 27819, (e, t, r) => {
      "use strict";
      t.exports = i, t.exports.preferredEncodings = i;
      var n = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
      function a(e2, t2, r2) {
        var n2 = 0;
        if (t2.encoding.toLowerCase() === e2.toLowerCase()) n2 |= 1;
        else if ("*" !== t2.encoding) return null;
        return { encoding: e2, i: r2, o: t2.i, q: t2.q, s: n2 };
      }
      function i(e2, t2, r2) {
        var i2 = function(e3) {
          for (var t3 = e3.split(","), r3 = false, i3 = 1, o2 = 0, s2 = 0; o2 < t3.length; o2++) {
            var l2 = function(e4, t4) {
              var r4 = n.exec(e4);
              if (!r4) return null;
              var a2 = r4[1], i4 = 1;
              if (r4[2]) for (var o3 = r4[2].split(";"), s3 = 0; s3 < o3.length; s3++) {
                var l3 = o3[s3].trim().split("=");
                if ("q" === l3[0]) {
                  i4 = parseFloat(l3[1]);
                  break;
                }
              }
              return { encoding: a2, q: i4, i: t4 };
            }(t3[o2].trim(), o2);
            l2 && (t3[s2++] = l2, r3 = r3 || a("identity", l2), i3 = Math.min(i3, l2.q || 1));
          }
          return r3 || (t3[s2++] = { encoding: "identity", q: i3, i: o2 }), t3.length = s2, t3;
        }(e2 || ""), d = r2 ? function(e3, t3) {
          if (e3.q !== t3.q) return t3.q - e3.q;
          var n2 = r2.indexOf(e3.encoding), a2 = r2.indexOf(t3.encoding);
          return -1 === n2 && -1 === a2 ? t3.s - e3.s || e3.o - t3.o || e3.i - t3.i : -1 !== n2 && -1 !== a2 ? n2 - a2 : -1 === n2 ? 1 : -1;
        } : o;
        if (!t2) return i2.filter(l).sort(d).map(s);
        var u = t2.map(function(e3, t3) {
          for (var r3 = { encoding: e3, o: -1, q: 0, s: 0 }, n2 = 0; n2 < i2.length; n2++) {
            var o2 = a(e3, i2[n2], t3);
            o2 && 0 > (r3.s - o2.s || r3.q - o2.q || r3.o - o2.o) && (r3 = o2);
          }
          return r3;
        });
        return u.filter(l).sort(d).map(function(e3) {
          return t2[u.indexOf(e3)];
        });
      }
      function o(e2, t2) {
        return t2.q - e2.q || t2.s - e2.s || e2.o - t2.o || e2.i - t2.i;
      }
      function s(e2) {
        return e2.encoding;
      }
      function l(e2) {
        return e2.q > 0;
      }
    }, 1980, (e, t, r) => {
      "use strict";
      t.exports = i, t.exports.preferredLanguages = i;
      var n = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;
      function a(e2, t2) {
        var r2 = n.exec(e2);
        if (!r2) return null;
        var a2 = r2[1], i2 = r2[2], o2 = a2;
        i2 && (o2 += "-" + i2);
        var s2 = 1;
        if (r2[3]) for (var l2 = r2[3].split(";"), d = 0; d < l2.length; d++) {
          var u = l2[d].split("=");
          "q" === u[0] && (s2 = parseFloat(u[1]));
        }
        return { prefix: a2, suffix: i2, q: s2, i: t2, full: o2 };
      }
      function i(e2, t2) {
        var r2 = function(e3) {
          for (var t3 = e3.split(","), r3 = 0, n3 = 0; r3 < t3.length; r3++) {
            var i2 = a(t3[r3].trim(), r3);
            i2 && (t3[n3++] = i2);
          }
          return t3.length = n3, t3;
        }(void 0 === e2 ? "*" : e2 || "");
        if (!t2) return r2.filter(l).sort(o).map(s);
        var n2 = t2.map(function(e3, t3) {
          for (var n3 = { o: -1, q: 0, s: 0 }, i2 = 0; i2 < r2.length; i2++) {
            var o2 = function(e4, t4, r3) {
              var n4 = a(e4);
              if (!n4) return null;
              var i3 = 0;
              if (t4.full.toLowerCase() === n4.full.toLowerCase()) i3 |= 4;
              else if (t4.prefix.toLowerCase() === n4.full.toLowerCase()) i3 |= 2;
              else if (t4.full.toLowerCase() === n4.prefix.toLowerCase()) i3 |= 1;
              else if ("*" !== t4.full) return null;
              return { i: r3, o: t4.i, q: t4.q, s: i3 };
            }(e3, r2[i2], t3);
            o2 && 0 > (n3.s - o2.s || n3.q - o2.q || n3.o - o2.o) && (n3 = o2);
          }
          return n3;
        });
        return n2.filter(l).sort(o).map(function(e3) {
          return t2[n2.indexOf(e3)];
        });
      }
      function o(e2, t2) {
        return t2.q - e2.q || t2.s - e2.s || e2.o - t2.o || e2.i - t2.i || 0;
      }
      function s(e2) {
        return e2.full;
      }
      function l(e2) {
        return e2.q > 0;
      }
    }, 84974, (e, t, r) => {
      "use strict";
      t.exports = i, t.exports.preferredMediaTypes = i;
      var n = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;
      function a(e2, t2) {
        var r2 = n.exec(e2);
        if (!r2) return null;
        var a2 = /* @__PURE__ */ Object.create(null), i2 = 1, o2 = r2[2], s2 = r2[1];
        if (r2[3]) for (var l2 = function(e3) {
          for (var t3 = e3.split(";"), r3 = 1, n2 = 0; r3 < t3.length; r3++) d(t3[n2]) % 2 == 0 ? t3[++n2] = t3[r3] : t3[n2] += ";" + t3[r3];
          t3.length = n2 + 1;
          for (var r3 = 0; r3 < t3.length; r3++) t3[r3] = t3[r3].trim();
          return t3;
        }(r2[3]).map(u), c = 0; c < l2.length; c++) {
          var p = l2[c], h = p[0].toLowerCase(), f = p[1], _ = f && '"' === f[0] && '"' === f[f.length - 1] ? f.slice(1, -1) : f;
          if ("q" === h) {
            i2 = parseFloat(_);
            break;
          }
          a2[h] = _;
        }
        return { type: s2, subtype: o2, params: a2, q: i2, i: t2 };
      }
      function i(e2, t2) {
        var r2 = function(e3) {
          for (var t3 = function(e4) {
            for (var t4 = e4.split(","), r4 = 1, n4 = 0; r4 < t4.length; r4++) d(t4[n4]) % 2 == 0 ? t4[++n4] = t4[r4] : t4[n4] += "," + t4[r4];
            return t4.length = n4 + 1, t4;
          }(e3), r3 = 0, n3 = 0; r3 < t3.length; r3++) {
            var i2 = a(t3[r3].trim(), r3);
            i2 && (t3[n3++] = i2);
          }
          return t3.length = n3, t3;
        }(void 0 === e2 ? "*/*" : e2 || "");
        if (!t2) return r2.filter(l).sort(o).map(s);
        var n2 = t2.map(function(e3, t3) {
          for (var n3 = { o: -1, q: 0, s: 0 }, i2 = 0; i2 < r2.length; i2++) {
            var o2 = function(e4, t4, r3) {
              var n4 = a(e4), i3 = 0;
              if (!n4) return null;
              if (t4.type.toLowerCase() == n4.type.toLowerCase()) i3 |= 4;
              else if ("*" != t4.type) return null;
              if (t4.subtype.toLowerCase() == n4.subtype.toLowerCase()) i3 |= 2;
              else if ("*" != t4.subtype) return null;
              var o3 = Object.keys(t4.params);
              if (o3.length > 0) if (!o3.every(function(e5) {
                return "*" == t4.params[e5] || (t4.params[e5] || "").toLowerCase() == (n4.params[e5] || "").toLowerCase();
              })) return null;
              else i3 |= 1;
              return { i: r3, o: t4.i, q: t4.q, s: i3 };
            }(e3, r2[i2], t3);
            o2 && 0 > (n3.s - o2.s || n3.q - o2.q || n3.o - o2.o) && (n3 = o2);
          }
          return n3;
        });
        return n2.filter(l).sort(o).map(function(e3) {
          return t2[n2.indexOf(e3)];
        });
      }
      function o(e2, t2) {
        return t2.q - e2.q || t2.s - e2.s || e2.o - t2.o || e2.i - t2.i || 0;
      }
      function s(e2) {
        return e2.type + "/" + e2.subtype;
      }
      function l(e2) {
        return e2.q > 0;
      }
      function d(e2) {
        for (var t2 = 0, r2 = 0; -1 !== (r2 = e2.indexOf('"', r2)); ) t2++, r2++;
        return t2;
      }
      function u(e2) {
        var t2, r2, n2 = e2.indexOf("=");
        return -1 === n2 ? t2 = e2 : (t2 = e2.slice(0, n2), r2 = e2.slice(n2 + 1)), [t2, r2];
      }
    }, 29300, (e, t, r) => {
      "use strict";
      var n = e.r(15737), a = e.r(27819), i = e.r(1980), o = e.r(84974);
      function s(e2) {
        if (!(this instanceof s)) return new s(e2);
        this.request = e2;
      }
      t.exports = s, t.exports.Negotiator = s, s.prototype.charset = function(e2) {
        var t2 = this.charsets(e2);
        return t2 && t2[0];
      }, s.prototype.charsets = function(e2) {
        return n(this.request.headers["accept-charset"], e2);
      }, s.prototype.encoding = function(e2, t2) {
        var r2 = this.encodings(e2, t2);
        return r2 && r2[0];
      }, s.prototype.encodings = function(e2, t2) {
        return a(this.request.headers["accept-encoding"], e2, (t2 || {}).preferred);
      }, s.prototype.language = function(e2) {
        var t2 = this.languages(e2);
        return t2 && t2[0];
      }, s.prototype.languages = function(e2) {
        return i(this.request.headers["accept-language"], e2);
      }, s.prototype.mediaType = function(e2) {
        var t2 = this.mediaTypes(e2);
        return t2 && t2[0];
      }, s.prototype.mediaTypes = function(e2) {
        return o(this.request.headers.accept, e2);
      }, s.prototype.preferredCharset = s.prototype.charset, s.prototype.preferredCharsets = s.prototype.charsets, s.prototype.preferredEncoding = s.prototype.encoding, s.prototype.preferredEncodings = s.prototype.encodings, s.prototype.preferredLanguage = s.prototype.language, s.prototype.preferredLanguages = s.prototype.languages, s.prototype.preferredMediaType = s.prototype.mediaType, s.prototype.preferredMediaTypes = s.prototype.mediaTypes;
    }, 58217, (e) => {
      "use strict";
      let t, r, n, a, i, o, s;
      async function l() {
        return "_ENTRIES" in globalThis && _ENTRIES.middleware_instrumentation && await _ENTRIES.middleware_instrumentation;
      }
      e.i(74398);
      let d = null;
      async function u() {
        if ("phase-production-build" === process.env.NEXT_PHASE) return;
        d || (d = l());
        let e10 = await d;
        if (null == e10 ? void 0 : e10.register) try {
          await e10.register();
        } catch (e11) {
          throw e11.message = `An error occurred while loading instrumentation hook: ${e11.message}`, e11;
        }
      }
      async function c(...e10) {
        let t10 = await l();
        try {
          var r10;
          await (null == t10 || null == (r10 = t10.onRequestError) ? void 0 : r10.call(t10, ...e10));
        } catch (e11) {
          console.error("Error in instrumentation.onRequestError:", e11);
        }
      }
      let p = null;
      function h() {
        return p || (p = u()), p;
      }
      function f(e10) {
        return `The edge runtime does not support Node.js '${e10}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`;
      }
      process !== e.g.process && (process.env = e.g.process.env, e.g.process = process);
      try {
        Object.defineProperty(globalThis, "__import_unsupported", { value: function(e10) {
          let t10 = new Proxy(function() {
          }, { get(t11, r10) {
            if ("then" === r10) return {};
            throw Object.defineProperty(Error(f(e10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, construct() {
            throw Object.defineProperty(Error(f(e10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, apply(r10, n2, a2) {
            if ("function" == typeof a2[0]) return a2[0](t10);
            throw Object.defineProperty(Error(f(e10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          } });
          return new Proxy({}, { get: () => t10 });
        }, enumerable: false, configurable: false });
      } catch {
      }
      h();
      class _ extends Error {
        constructor({ page: e10 }) {
          super(`The middleware "${e10}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `), Object.defineProperty(this, "__NEXT_ERROR_CODE", { value: "E1177", enumerable: false, configurable: true });
        }
      }
      class g extends Error {
        constructor() {
          super("The request.page has been deprecated in favour of `URLPattern`.\n  Read more: https://nextjs.org/docs/messages/middleware-request-page\n  "), Object.defineProperty(this, "__NEXT_ERROR_CODE", { value: "E1178", enumerable: false, configurable: true });
        }
      }
      class m extends Error {
        constructor() {
          super("The request.ua has been removed in favour of `userAgent` function.\n  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent\n  "), Object.defineProperty(this, "__NEXT_ERROR_CODE", { value: "E1172", enumerable: false, configurable: true });
        }
      }
      let v = "x-prerender-revalidate", y = "x-prerender-revalidate-if-generated", b = ".meta", w = "x-next-cache-tags", E = "x-next-revalidated-tags", x = "_N_T_", C = { shared: "shared", reactServerComponents: "rsc", serverSideRendering: "ssr", actionBrowser: "action-browser", apiNode: "api-node", apiEdge: "api-edge", middleware: "middleware", instrument: "instrument", edgeAsset: "edge-asset", appPagesBrowser: "app-pages-browser", pagesDirBrowser: "pages-dir-browser", pagesDirEdge: "pages-dir-edge", pagesDirNode: "pages-dir-node" };
      function S(e10) {
        var t10, r10, n2, a2, i2, o2 = [], s2 = 0;
        function l2() {
          for (; s2 < e10.length && /\s/.test(e10.charAt(s2)); ) s2 += 1;
          return s2 < e10.length;
        }
        for (; s2 < e10.length; ) {
          for (t10 = s2, i2 = false; l2(); ) if ("," === (r10 = e10.charAt(s2))) {
            for (n2 = s2, s2 += 1, l2(), a2 = s2; s2 < e10.length && "=" !== (r10 = e10.charAt(s2)) && ";" !== r10 && "," !== r10; ) s2 += 1;
            s2 < e10.length && "=" === e10.charAt(s2) ? (i2 = true, s2 = a2, o2.push(e10.substring(t10, n2)), t10 = s2) : s2 = n2 + 1;
          } else s2 += 1;
          (!i2 || s2 >= e10.length) && o2.push(e10.substring(t10, e10.length));
        }
        return o2;
      }
      function T(e10) {
        let t10 = {}, r10 = [];
        if (e10) for (let [n2, a2] of e10.entries()) "set-cookie" === n2.toLowerCase() ? (r10.push(...S(a2)), t10[n2] = 1 === r10.length ? r10[0] : r10) : t10[n2] = a2;
        return t10;
      }
      function R(e10) {
        try {
          return String(new URL(String(e10)));
        } catch (t10) {
          throw Object.defineProperty(Error(`URL is malformed "${String(e10)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, { cause: t10 }), "__NEXT_ERROR_CODE", { value: "E61", enumerable: false, configurable: true });
        }
      }
      ({ ...C, GROUP: { builtinReact: [C.reactServerComponents, C.actionBrowser], serverOnly: [C.reactServerComponents, C.actionBrowser, C.instrument, C.middleware], neutralTarget: [C.apiNode, C.apiEdge], clientOnly: [C.serverSideRendering, C.appPagesBrowser], bundled: [C.reactServerComponents, C.actionBrowser, C.serverSideRendering, C.appPagesBrowser, C.shared, C.instrument, C.middleware], appPages: [C.reactServerComponents, C.serverSideRendering, C.appPagesBrowser, C.actionBrowser] } });
      let O = Symbol("response"), P = Symbol("passThrough"), N = Symbol("waitUntil");
      class A {
        constructor(e10, t10) {
          this[P] = false, this[N] = t10 ? { kind: "external", function: t10 } : { kind: "internal", promises: [] };
        }
        respondWith(e10) {
          this[O] || (this[O] = Promise.resolve(e10));
        }
        passThroughOnException() {
          this[P] = true;
        }
        waitUntil(e10) {
          if ("external" === this[N].kind) return (0, this[N].function)(e10);
          this[N].promises.push(e10);
        }
      }
      class M extends A {
        constructor(e10) {
          var t10;
          super(e10.request, null == (t10 = e10.context) ? void 0 : t10.waitUntil), this.sourcePage = e10.page;
        }
        get request() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      function L(e10) {
        return 47 === e10.charCodeAt(e10.length - 1) && e10.length > 1 ? e10.slice(0, -1) : e10;
      }
      function I(e10) {
        let t10 = e10.indexOf("#"), r10 = e10.indexOf("?"), n2 = r10 > -1 && (t10 < 0 || r10 < t10);
        return n2 || t10 > -1 ? { pathname: e10.substring(0, n2 ? r10 : t10), query: n2 ? e10.substring(r10, t10 > -1 ? t10 : void 0) : "", hash: t10 > -1 ? e10.slice(t10) : "" } : { pathname: e10, query: "", hash: "" };
      }
      function k(e10, t10) {
        if (!e10.startsWith("/") || !t10) return e10;
        let { pathname: r10, query: n2, hash: a2 } = I(e10);
        return `${t10}${r10}${n2}${a2}`;
      }
      function D(e10, t10) {
        if (!e10.startsWith("/") || !t10) return e10;
        let { pathname: r10, query: n2, hash: a2 } = I(e10);
        return `${r10}${t10}${n2}${a2}`;
      }
      function j(e10, t10) {
        if ("string" != typeof e10) return false;
        let { pathname: r10 } = I(e10);
        return r10 === t10 || r10.startsWith(t10 + "/");
      }
      let q = /* @__PURE__ */ new WeakMap();
      function U(e10, t10) {
        let r10;
        if (!t10) return { pathname: e10 };
        let n2 = q.get(t10);
        n2 || (n2 = t10.map((e11) => e11.toLowerCase()), q.set(t10, n2));
        let a2 = e10.split("/", 2);
        if (!a2[1]) return { pathname: e10 };
        let i2 = a2[1].toLowerCase(), o2 = n2.indexOf(i2);
        return o2 < 0 ? { pathname: e10 } : (r10 = t10[o2], { pathname: e10 = e10.slice(r10.length + 1) || "/", detectedLocale: r10 });
      }
      let B = /^(?:127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)$/;
      function G(e10, t10) {
        let r10 = new URL(String(e10), t10 && String(t10));
        return B.test(r10.hostname) && (r10.hostname = "localhost"), r10;
      }
      let H = Symbol("NextURLInternal");
      class $ {
        constructor(e10, t10, r10) {
          let n2, a2;
          "object" == typeof t10 && "pathname" in t10 || "string" == typeof t10 ? (n2 = t10, a2 = r10 || {}) : a2 = r10 || t10 || {}, this[H] = { url: G(e10, n2 ?? a2.base), options: a2, basePath: "" }, this.analyze();
        }
        analyze() {
          var e10, t10, r10, n2, a2;
          let i2 = function(e11, t11) {
            let { basePath: r11, i18n: n3, trailingSlash: a3 } = t11.nextConfig ?? {}, i3 = { pathname: e11, trailingSlash: "/" !== e11 ? e11.endsWith("/") : a3 };
            r11 && j(i3.pathname, r11) && (i3.pathname = function(e12, t12) {
              if (!j(e12, t12)) return e12;
              let r12 = e12.slice(t12.length);
              return r12.startsWith("/") ? r12 : `/${r12}`;
            }(i3.pathname, r11), i3.basePath = r11);
            let o3 = i3.pathname;
            if (i3.pathname.startsWith("/_next/data/") && i3.pathname.endsWith(".json")) {
              let e12 = i3.pathname.replace(/^\/_next\/data\//, "").replace(/\.json$/, "").split("/");
              i3.buildId = e12[0], o3 = "index" !== e12[1] ? `/${e12.slice(1).join("/")}` : "/", true === t11.parseData && (i3.pathname = o3);
            }
            if (n3) {
              let e12 = t11.i18nProvider ? t11.i18nProvider.analyze(i3.pathname) : U(i3.pathname, n3.locales);
              i3.locale = e12.detectedLocale, i3.pathname = e12.pathname ?? i3.pathname, !e12.detectedLocale && i3.buildId && (e12 = t11.i18nProvider ? t11.i18nProvider.analyze(o3) : U(o3, n3.locales)).detectedLocale && (i3.locale = e12.detectedLocale);
            }
            return i3;
          }(this[H].url.pathname, { nextConfig: this[H].options.nextConfig, parseData: true, i18nProvider: this[H].options.i18nProvider }), o2 = function(e11, t11) {
            let r11;
            if (t11?.host && !Array.isArray(t11.host)) r11 = t11.host.toString().split(":", 1)[0];
            else {
              if (!e11.hostname) return;
              r11 = e11.hostname;
            }
            return r11.toLowerCase();
          }(this[H].url, this[H].options.headers);
          this[H].domainLocale = this[H].options.i18nProvider ? this[H].options.i18nProvider.detectDomainLocale(o2) : function(e11, t11, r11) {
            if (e11) {
              for (let n3 of (r11 && (r11 = r11.toLowerCase()), e11)) if (t11 === n3.domain?.split(":", 1)[0].toLowerCase() || r11 === n3.defaultLocale.toLowerCase() || n3.locales?.some((e12) => e12.toLowerCase() === r11)) return n3;
            }
          }(null == (t10 = this[H].options.nextConfig) || null == (e10 = t10.i18n) ? void 0 : e10.domains, o2);
          let s2 = (null == (r10 = this[H].domainLocale) ? void 0 : r10.defaultLocale) || (null == (a2 = this[H].options.nextConfig) || null == (n2 = a2.i18n) ? void 0 : n2.defaultLocale);
          this[H].url.pathname = i2.pathname, this[H].defaultLocale = s2, this[H].basePath = i2.basePath ?? "", this[H].buildId = i2.buildId, this[H].locale = i2.locale ?? s2, this[H].trailingSlash = i2.trailingSlash;
        }
        formatPathname() {
          var e10;
          let t10;
          return t10 = function(e11, t11, r10, n2) {
            if (!t11 || t11 === r10) return e11;
            let a2 = e11.toLowerCase();
            return !n2 && (j(a2, "/api") || j(a2, `/${t11.toLowerCase()}`)) ? e11 : k(e11, `/${t11}`);
          }((e10 = { basePath: this[H].basePath, buildId: this[H].buildId, defaultLocale: this[H].options.forceLocale ? void 0 : this[H].defaultLocale, locale: this[H].locale, pathname: this[H].url.pathname, trailingSlash: this[H].trailingSlash }).pathname, e10.locale, e10.buildId ? void 0 : e10.defaultLocale, e10.ignorePrefix), (e10.buildId || !e10.trailingSlash) && (t10 = L(t10)), e10.buildId && (t10 = D(k(t10, `/_next/data/${e10.buildId}`), "/" === e10.pathname ? "index.json" : ".json")), t10 = k(t10, e10.basePath), !e10.buildId && e10.trailingSlash ? t10.endsWith("/") ? t10 : D(t10, "/") : L(t10);
        }
        formatSearch() {
          return this[H].url.search;
        }
        get buildId() {
          return this[H].buildId;
        }
        set buildId(e10) {
          this[H].buildId = e10;
        }
        get locale() {
          return this[H].locale ?? "";
        }
        set locale(e10) {
          var t10, r10;
          if (!this[H].locale || !(null == (r10 = this[H].options.nextConfig) || null == (t10 = r10.i18n) ? void 0 : t10.locales.includes(e10))) throw Object.defineProperty(TypeError(`The NextURL configuration includes no locale "${e10}"`), "__NEXT_ERROR_CODE", { value: "E597", enumerable: false, configurable: true });
          this[H].locale = e10;
        }
        get defaultLocale() {
          return this[H].defaultLocale;
        }
        get domainLocale() {
          return this[H].domainLocale;
        }
        get searchParams() {
          return this[H].url.searchParams;
        }
        get host() {
          return this[H].url.host;
        }
        set host(e10) {
          this[H].url.host = e10;
        }
        get hostname() {
          return this[H].url.hostname;
        }
        set hostname(e10) {
          this[H].url.hostname = e10;
        }
        get port() {
          return this[H].url.port;
        }
        set port(e10) {
          this[H].url.port = e10;
        }
        get protocol() {
          return this[H].url.protocol;
        }
        set protocol(e10) {
          this[H].url.protocol = e10;
        }
        get href() {
          let e10 = this.formatPathname(), t10 = this.formatSearch();
          return `${this.protocol}//${this.host}${e10}${t10}${this.hash}`;
        }
        set href(e10) {
          this[H].url = G(e10), this.analyze();
        }
        get origin() {
          return this[H].url.origin;
        }
        get pathname() {
          return this[H].url.pathname;
        }
        set pathname(e10) {
          this[H].url.pathname = e10;
        }
        get hash() {
          return this[H].url.hash;
        }
        set hash(e10) {
          this[H].url.hash = e10;
        }
        get search() {
          return this[H].url.search;
        }
        set search(e10) {
          this[H].url.search = e10;
        }
        get password() {
          return this[H].url.password;
        }
        set password(e10) {
          this[H].url.password = e10;
        }
        get username() {
          return this[H].url.username;
        }
        set username(e10) {
          this[H].url.username = e10;
        }
        get basePath() {
          return this[H].basePath;
        }
        set basePath(e10) {
          this[H].basePath = e10.startsWith("/") ? e10 : `/${e10}`;
        }
        toString() {
          return this.href;
        }
        toJSON() {
          return this.href;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { href: this.href, origin: this.origin, protocol: this.protocol, username: this.username, password: this.password, host: this.host, hostname: this.hostname, port: this.port, pathname: this.pathname, search: this.search, searchParams: this.searchParams, hash: this.hash };
        }
        clone() {
          return new $(String(this), this[H].options);
        }
      }
      var V, F, z, K, W, X, Z, J, Y, Q, ee, et, er, en, ea, ei, eo, es, el, ed, eu, ec = e.i(28042);
      let ep = Symbol("internal request");
      class eh extends Request {
        constructor(e10, t10 = {}) {
          const r10 = "string" != typeof e10 && "url" in e10 ? e10.url : String(e10);
          R(r10), e10 instanceof Request ? super(e10, t10) : super(r10, t10);
          const n2 = new $(r10, { headers: T(this.headers), nextConfig: t10.nextConfig });
          this[ep] = { cookies: new ec.RequestCookies(this.headers), nextUrl: n2, url: n2.toString() };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, nextUrl: this.nextUrl, url: this.url, bodyUsed: this.bodyUsed, cache: this.cache, credentials: this.credentials, destination: this.destination, headers: Object.fromEntries(this.headers), integrity: this.integrity, keepalive: this.keepalive, method: this.method, mode: this.mode, redirect: this.redirect, referrer: this.referrer, referrerPolicy: this.referrerPolicy, signal: this.signal };
        }
        get cookies() {
          return this[ep].cookies;
        }
        get nextUrl() {
          return this[ep].nextUrl;
        }
        get page() {
          throw new g();
        }
        get ua() {
          throw new m();
        }
        get url() {
          return this[ep].url;
        }
      }
      class ef {
        static get(e10, t10, r10) {
          let n2 = Reflect.get(e10, t10, r10);
          return "function" == typeof n2 ? n2.bind(e10) : n2;
        }
        static set(e10, t10, r10, n2) {
          return Reflect.set(e10, t10, r10, n2);
        }
        static has(e10, t10) {
          return Reflect.has(e10, t10);
        }
        static deleteProperty(e10, t10) {
          return Reflect.deleteProperty(e10, t10);
        }
      }
      let e_ = Symbol("internal response"), eg = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
      function em(e10, t10) {
        var r10;
        if (null == e10 || null == (r10 = e10.request) ? void 0 : r10.headers) {
          if (!(e10.request.headers instanceof Headers)) throw Object.defineProperty(Error("request.headers must be an instance of Headers"), "__NEXT_ERROR_CODE", { value: "E119", enumerable: false, configurable: true });
          let r11 = [];
          for (let [n2, a2] of e10.request.headers) t10.set("x-middleware-request-" + n2, a2), r11.push(n2);
          t10.set("x-middleware-override-headers", r11.join(","));
        }
      }
      class ev extends Response {
        constructor(e10, t10 = {}) {
          super(e10, t10);
          const r10 = this.headers, n2 = new Proxy(new ec.ResponseCookies(r10), { get(e11, n3, a2) {
            switch (n3) {
              case "delete":
              case "set":
                return (...a3) => {
                  let i2 = Reflect.apply(e11[n3], e11, a3), o2 = new Headers(r10);
                  return i2 instanceof ec.ResponseCookies && r10.set("x-middleware-set-cookie", i2.getAll().map((e12) => (0, ec.stringifyCookie)(e12)).join(",")), em(t10, o2), i2;
                };
              default:
                return ef.get(e11, n3, a2);
            }
          } });
          this[e_] = { cookies: n2, url: t10.url ? new $(t10.url, { headers: T(r10), nextConfig: t10.nextConfig }) : void 0 };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, url: this.url, body: this.body, bodyUsed: this.bodyUsed, headers: Object.fromEntries(this.headers), ok: this.ok, redirected: this.redirected, status: this.status, statusText: this.statusText, type: this.type };
        }
        get cookies() {
          return this[e_].cookies;
        }
        static json(e10, t10) {
          let r10 = Response.json(e10, t10);
          return new ev(r10.body, r10);
        }
        static redirect(e10, t10) {
          let r10 = "number" == typeof t10 ? t10 : (null == t10 ? void 0 : t10.status) ?? 307;
          if (!eg.has(r10)) throw Object.defineProperty(RangeError('Failed to execute "redirect" on "response": Invalid status code'), "__NEXT_ERROR_CODE", { value: "E529", enumerable: false, configurable: true });
          let n2 = "object" == typeof t10 ? t10 : {}, a2 = new Headers(null == n2 ? void 0 : n2.headers);
          return a2.set("Location", R(e10)), new ev(null, { ...n2, headers: a2, status: r10 });
        }
        static rewrite(e10, t10) {
          let r10 = new Headers(null == t10 ? void 0 : t10.headers);
          return r10.set("x-middleware-rewrite", R(e10)), em(t10, r10), new ev(null, { ...t10, headers: r10 });
        }
        static next(e10) {
          let t10 = new Headers(null == e10 ? void 0 : e10.headers);
          return t10.set("x-middleware-next", "1"), em(e10, t10), new ev(null, { ...e10, headers: t10 });
        }
      }
      function ey(e10, t10) {
        let r10 = "string" == typeof t10 ? new URL(t10) : t10, n2 = new URL(e10, t10), a2 = n2.origin === r10.origin;
        return { url: a2 ? n2.toString().slice(r10.origin.length) : n2.toString(), isRelative: a2 };
      }
      let eb = "next-router-prefetch", ew = ["rsc", "next-router-state-tree", eb, "next-hmr-refresh", "next-router-segment-prefetch"], eE = "_rsc";
      function ex(e10) {
        return e10.startsWith("/") ? e10 : `/${e10}`;
      }
      function eC(e10) {
        return ex(e10.split("/").reduce((e11, t10, r10, n2) => t10 ? "(" === t10[0] && t10.endsWith(")") || "@" === t10[0] || ("page" === t10 || "route" === t10) && r10 === n2.length - 1 ? e11 : `${e11}/${t10}` : e11, ""));
      }
      class eS extends Error {
        constructor() {
          super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers"), Object.defineProperty(this, "__NEXT_ERROR_CODE", { value: "E1176", enumerable: false, configurable: true });
        }
        static callable() {
          throw new eS();
        }
      }
      class eT extends Headers {
        constructor(e10) {
          super(), this.headers = new Proxy(e10, { get(t10, r10, n2) {
            if ("symbol" == typeof r10) return ef.get(t10, r10, n2);
            let a2 = r10.toLowerCase(), i2 = Object.keys(e10).find((e11) => e11.toLowerCase() === a2);
            if (void 0 !== i2) return ef.get(t10, i2, n2);
          }, set(t10, r10, n2, a2) {
            if ("symbol" == typeof r10) return ef.set(t10, r10, n2, a2);
            let i2 = r10.toLowerCase(), o2 = Object.keys(e10).find((e11) => e11.toLowerCase() === i2);
            return ef.set(t10, o2 ?? r10, n2, a2);
          }, has(t10, r10) {
            if ("symbol" == typeof r10) return ef.has(t10, r10);
            let n2 = r10.toLowerCase(), a2 = Object.keys(e10).find((e11) => e11.toLowerCase() === n2);
            return void 0 !== a2 && ef.has(t10, a2);
          }, deleteProperty(t10, r10) {
            if ("symbol" == typeof r10) return ef.deleteProperty(t10, r10);
            let n2 = r10.toLowerCase(), a2 = Object.keys(e10).find((e11) => e11.toLowerCase() === n2);
            return void 0 === a2 || ef.deleteProperty(t10, a2);
          } });
        }
        static seal(e10) {
          return new Proxy(e10, { get(e11, t10, r10) {
            switch (t10) {
              case "append":
              case "delete":
              case "set":
                return eS.callable;
              default:
                return ef.get(e11, t10, r10);
            }
          } });
        }
        static fresh(e10) {
          return new Proxy(e10, { get: (e11, t10, r10) => ef.get(e11, t10, r10) });
        }
        merge(e10) {
          return Array.isArray(e10) ? e10.join(", ") : e10;
        }
        static from(e10) {
          return e10 instanceof Headers ? e10 : new eT(e10);
        }
        append(e10, t10) {
          let r10 = this.headers[e10];
          "string" == typeof r10 ? this.headers[e10] = [r10, t10] : Array.isArray(r10) ? r10.push(t10) : this.headers[e10] = t10;
        }
        delete(e10) {
          delete this.headers[e10];
        }
        get(e10) {
          let t10 = this.headers[e10];
          return void 0 !== t10 ? this.merge(t10) : null;
        }
        has(e10) {
          return void 0 !== this.headers[e10];
        }
        set(e10, t10) {
          this.headers[e10] = t10;
        }
        forEach(e10, t10) {
          for (let [r10, n2] of this.entries()) e10.call(t10, n2, r10, this);
        }
        *entries() {
          for (let e10 of Object.keys(this.headers)) {
            let t10 = e10.toLowerCase(), r10 = this.get(t10);
            yield [t10, r10];
          }
        }
        *keys() {
          for (let e10 of Object.keys(this.headers)) {
            let t10 = e10.toLowerCase();
            yield t10;
          }
        }
        *values() {
          for (let e10 of Object.keys(this.headers)) {
            let t10 = this.get(e10);
            yield t10;
          }
        }
        [Symbol.iterator]() {
          return this.entries();
        }
      }
      let eR = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class eO {
        disable() {
          throw eR;
        }
        getStore() {
        }
        run() {
          throw eR;
        }
        exit() {
          throw eR;
        }
        enterWith() {
          throw eR;
        }
        static bind(e10) {
          return e10;
        }
      }
      let eP = "u" > typeof globalThis && globalThis.AsyncLocalStorage;
      function eN() {
        return eP ? new eP() : new eO();
      }
      let eA = eN();
      class eM extends Error {
        constructor() {
          super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options"), Object.defineProperty(this, "__NEXT_ERROR_CODE", { value: "E1180", enumerable: false, configurable: true });
        }
        static callable() {
          throw new eM();
        }
      }
      class eL {
        static seal(e10) {
          return new Proxy(e10, { get(e11, t10, r10) {
            switch (t10) {
              case "clear":
              case "delete":
              case "set":
                return eM.callable;
              default:
                return ef.get(e11, t10, r10);
            }
          } });
        }
        static fresh(e10) {
          return new Proxy(e10, { get: (e11, t10, r10) => ef.get(e11, t10, r10) });
        }
      }
      let eI = Symbol.for("next.mutated.cookies");
      class ek {
        static wrap(e10, t10) {
          let r10 = new ec.ResponseCookies(new Headers());
          for (let t11 of e10.getAll()) r10.set(t11);
          let n2 = [], a2 = /* @__PURE__ */ new Set(), i2 = () => {
            let e11 = eA.getStore();
            if (e11 && (e11.pathWasRevalidated = 1), n2 = r10.getAll().filter((e12) => a2.has(e12.name)), t10) {
              let e12 = [];
              for (let t11 of n2) {
                let r11 = new ec.ResponseCookies(new Headers());
                r11.set(t11), e12.push(r11.toString());
              }
              t10(e12);
            }
          }, o2 = new Proxy(r10, { get(e11, t11, r11) {
            switch (t11) {
              case eI:
                return n2;
              case "delete":
                return function(...t12) {
                  a2.add("string" == typeof t12[0] ? t12[0] : t12[0].name);
                  try {
                    return e11.delete(...t12), o2;
                  } finally {
                    i2();
                  }
                };
              case "set":
                return function(...t12) {
                  a2.add("string" == typeof t12[0] ? t12[0] : t12[0].name);
                  try {
                    return e11.set(...t12), o2;
                  } finally {
                    i2();
                  }
                };
              default:
                return ef.get(e11, t11, r11);
            }
          } });
          return o2;
        }
      }
      function eD(e10, t10) {
        if ("action" !== e10.phase) throw new eM();
      }
      var ej = ((V = ej || {}).handleRequest = "BaseServer.handleRequest", V.run = "BaseServer.run", V.pipe = "BaseServer.pipe", V.getStaticHTML = "BaseServer.getStaticHTML", V.render = "BaseServer.render", V.renderToResponseWithComponents = "BaseServer.renderToResponseWithComponents", V.renderToResponse = "BaseServer.renderToResponse", V.renderToHTML = "BaseServer.renderToHTML", V.renderError = "BaseServer.renderError", V.renderErrorToResponse = "BaseServer.renderErrorToResponse", V.renderErrorToHTML = "BaseServer.renderErrorToHTML", V.render404 = "BaseServer.render404", V), eq = ((F = eq || {}).loadDefaultErrorComponents = "LoadComponents.loadDefaultErrorComponents", F.loadComponents = "LoadComponents.loadComponents", F), eU = ((z = eU || {}).getRequestHandler = "NextServer.getRequestHandler", z.getRequestHandlerWithMetadata = "NextServer.getRequestHandlerWithMetadata", z.getServer = "NextServer.getServer", z.getServerRequestHandler = "NextServer.getServerRequestHandler", z.createServer = "createServer.createServer", z), eB = ((K = eB || {}).compression = "NextNodeServer.compression", K.getBuildId = "NextNodeServer.getBuildId", K.createComponentTree = "NextNodeServer.createComponentTree", K.clientComponentLoading = "NextNodeServer.clientComponentLoading", K.getLayoutOrPageModule = "NextNodeServer.getLayoutOrPageModule", K.generateStaticRoutes = "NextNodeServer.generateStaticRoutes", K.generateFsStaticRoutes = "NextNodeServer.generateFsStaticRoutes", K.generatePublicRoutes = "NextNodeServer.generatePublicRoutes", K.generateImageRoutes = "NextNodeServer.generateImageRoutes.route", K.sendRenderResult = "NextNodeServer.sendRenderResult", K.proxyRequest = "NextNodeServer.proxyRequest", K.runApi = "NextNodeServer.runApi", K.render = "NextNodeServer.render", K.renderHTML = "NextNodeServer.renderHTML", K.imageOptimizer = "NextNodeServer.imageOptimizer", K.getPagePath = "NextNodeServer.getPagePath", K.getRoutesManifest = "NextNodeServer.getRoutesManifest", K.findPageComponents = "NextNodeServer.findPageComponents", K.getFontManifest = "NextNodeServer.getFontManifest", K.getServerComponentManifest = "NextNodeServer.getServerComponentManifest", K.getRequestHandler = "NextNodeServer.getRequestHandler", K.renderToHTML = "NextNodeServer.renderToHTML", K.renderError = "NextNodeServer.renderError", K.renderErrorToHTML = "NextNodeServer.renderErrorToHTML", K.render404 = "NextNodeServer.render404", K.startResponse = "NextNodeServer.startResponse", K.route = "route", K.onProxyReq = "onProxyReq", K.apiResolver = "apiResolver", K.internalFetch = "internalFetch", K), eG = ((W = eG || {}).startServer = "startServer.startServer", W), eH = ((X = eH || {}).getServerSideProps = "Render.getServerSideProps", X.getStaticProps = "Render.getStaticProps", X.renderToString = "Render.renderToString", X.renderDocument = "Render.renderDocument", X.createBodyResult = "Render.createBodyResult", X), e$ = ((Z = e$ || {}).renderToString = "AppRender.renderToString", Z.renderToReadableStream = "AppRender.renderToReadableStream", Z.getBodyResult = "AppRender.getBodyResult", Z.fetch = "AppRender.fetch", Z.waitShellReady = "AppRender.waitShellReady", Z.renderToNodeFizzStream = "AppRender.renderToNodeFizzStream", Z.instantInsights = "AppRender.instantInsights", Z.instantInsightsPrepareValidation = "AppRender.instantInsights.prepareValidation", Z.instantInsightsRunValidation = "AppRender.instantInsights.runValidation", Z), eV = ((J = eV || {}).executeRoute = "Router.executeRoute", J), eF = ((Y = eF || {}).runHandler = "Node.runHandler", Y), ez = ((Q = ez || {}).runHandler = "AppRouteRouteHandlers.runHandler", Q), eK = ((ee = eK || {}).generateMetadata = "ResolveMetadata.generateMetadata", ee.generateViewport = "ResolveMetadata.generateViewport", ee), eW = ((et = eW || {}).execute = "Middleware.execute", et);
      let eX = /* @__PURE__ */ new Set(["Middleware.execute", "BaseServer.handleRequest", "Render.getServerSideProps", "Render.getStaticProps", "AppRender.fetch", "AppRender.getBodyResult", "Render.renderDocument", "Node.runHandler", "AppRouteRouteHandlers.runHandler", "ResolveMetadata.generateMetadata", "ResolveMetadata.generateViewport", "NextNodeServer.createComponentTree", "NextNodeServer.findPageComponents", "NextNodeServer.getLayoutOrPageModule", "NextNodeServer.startResponse", "NextNodeServer.clientComponentLoading"]), eZ = /* @__PURE__ */ new Set(["NextNodeServer.findPageComponents", "NextNodeServer.createComponentTree", "NextNodeServer.clientComponentLoading"]);
      function eJ(e10) {
        return null !== e10 && "object" == typeof e10 && "then" in e10 && "function" == typeof e10.then;
      }
      let eY = process.env.NEXT_OTEL_PERFORMANCE_PREFIX;
      function eQ() {
      }
      Symbol.for("@next/local-span-recorder");
      let { context: e0, propagation: e1, trace: e2, SpanStatusCode: e3, SpanKind: e4, ROOT_CONTEXT: e5 } = t = e.r(59110);
      class e9 extends Error {
        constructor(e10, t10) {
          super(), this.bubble = e10, this.result = t10;
        }
      }
      let e7 = (e10, t10) => {
        "object" == typeof t10 && null !== t10 && t10 instanceof e9 && t10.bubble ? e10.setAttribute("next.bubble", true) : (t10 && (e10.recordException(t10), e10.setAttribute("error.type", t10.name)), e10.setStatus({ code: e3.ERROR, message: null == t10 ? void 0 : t10.message })), e10.end();
      }, e6 = /* @__PURE__ */ new Map(), e8 = t.createContextKey("next.rootSpanId"), te = 0, tt = { set(e10, t10, r10) {
        e10.push({ key: t10, value: r10 });
      } }, tr = (a = new class e {
        getTracerInstance() {
          return e2.getTracer("next.js", "0.0.1");
        }
        isOpenTelemetryEnabled() {
          var e10, t10;
          let r10 = e2.getSpan(e0.active());
          if (null == r10 ? void 0 : r10.isRecording()) return true;
          let n2 = e2.getTracerProvider();
          return !("getDelegate" in n2) || (null == n2.getDelegate || null == (t10 = n2.getDelegate.call(n2)) || null == (e10 = t10.constructor) ? void 0 : e10.name) !== "NoopTracerProvider";
        }
        getContext() {
          return e0;
        }
        getTracePropagationData() {
          let e10 = e0.active(), t10 = [];
          return e1.inject(e10, t10, tt), t10;
        }
        getActiveScopeSpan() {
          let e10 = eQ(), t10 = null == e10 ? void 0 : e10.getActiveLocalSpan();
          return t10 && (null == e10 ? void 0 : e10.isOpenTelemetryIsolatedSpan(t10)) ? t10 : e2.getSpan(e0.active());
        }
        runWithDetachedContext(e10) {
          return eY || this.isOpenTelemetryEnabled() ? e0.with(e5, e10) : e10();
        }
        withPropagatedContext(e10, t10, r10, n2 = false) {
          let a2 = e0.active();
          if (!eY && !this.isOpenTelemetryEnabled() && !e2.getSpanContext(a2)) return t10();
          if (n2) {
            let n3 = e1.extract(e5, e10, r10);
            if (e2.getSpanContext(n3)) return e0.with(n3, t10);
            let i3 = e1.extract(a2, e10, r10);
            return e0.with(i3, t10);
          }
          if (e2.getSpanContext(a2)) return t10();
          let i2 = e1.extract(a2, e10, r10);
          return e0.with(i2, t10);
        }
        trace(...e10) {
          let [t10, r10, n2] = e10, a2 = !!eY || this.isOpenTelemetryEnabled(), i2 = eQ(), o2 = (null == i2 ? void 0 : i2.isLocalSpanRecordingEnabled()) ?? false;
          if (!a2 && !o2) return "function" == typeof r10 ? r10() : n2();
          let { fn: s2, options: l2 } = "function" == typeof r10 ? { fn: r10, options: {} } : { fn: n2, options: { ...r10 } }, d2 = l2.spanName ?? t10, u2 = l2.parentSpan ?? this.getActiveScopeSpan(), c2 = u2 && (null == i2 ? void 0 : i2.isOpenTelemetryIsolatedSpan(u2)) ? u2 : void 0, p2 = !c2 && (eX.has(t10) || "1" === process.env.NEXT_OTEL_VERBOSE);
          if (!(p2 || (null == i2 ? void 0 : i2.isRequestInsightsEnabled())) || l2.hideSpan) return s2();
          let h2 = c2 ? e0.active() : this.getSpanContext(u2);
          h2 || (h2 = (null == e0 ? void 0 : e0.active()) ?? e5);
          let f2 = h2.getValue(e8), _2 = "number" != typeof f2 || !e6.has(f2), g2 = te++;
          return l2.attributes = { "next.span_category": "nextjs", "next.span_name": d2, "next.span_type": t10, ...l2.attributes }, e0.with(h2.setValue(e8, g2), () => this.runWithActiveSpan(d2, l2, h2, a2 && p2, o2, c2, (e11) => {
            let r11;
            eY && t10 && eZ.has(t10) && (r11 = "performance" in globalThis && "measure" in performance ? globalThis.performance.now() : void 0);
            let n3 = false, a3 = () => {
              !n3 && (n3 = true, e6.delete(g2), r11 && performance.measure(`${eY}:next-${(t10.split(".").pop() || "").replace(/[A-Z]/g, (e12) => "-" + e12.toLowerCase())}`, { start: r11, end: performance.now() }));
            };
            if (_2 && e6.set(g2, new Map(Object.entries(l2.attributes ?? {}))), s2.length > 1) try {
              return s2(e11, (t11) => {
                t11 ? e7(e11, t11) : e11.end();
              });
            } catch (t11) {
              throw e7(e11, t11), t11;
            } finally {
              a3();
            }
            try {
              let t11 = s2(e11);
              if (eJ(t11)) return t11.then((t12) => (e11.end(), t12)).catch((t12) => {
                throw e7(e11, t12), t12;
              }).finally(a3);
              return e11.end(), a3(), t11;
            } catch (t11) {
              throw e7(e11, t11), a3(), t11;
            }
          }));
        }
        runWithActiveSpan(e10, t10, r10, n2, a2, i2, o2) {
          if (n2) return this.getTracerInstance().startActiveSpan(e10, t10, (n3) => o2(a2 ? this.createLocalRecordingSpan(e10, t10, r10, n3, i2) : n3));
          let s2 = this.createLocalRecordingSpan(e10, t10, r10, void 0, i2), l2 = eQ();
          return l2.withLocalSpan(s2, () => l2.isOpenTelemetryIsolatedSpan(s2) ? o2(s2) : e0.with(e2.setSpan(e0.active(), s2), o2, void 0, s2));
        }
        createLocalRecordingSpan(e10, t10, r10, n2, a2) {
          let i2 = (null == a2 ? void 0 : a2.spanContext()) ?? e2.getSpanContext(r10), o2 = null == n2 ? void 0 : n2.spanContext();
          return eQ().createLocalSpan({ name: e10, attributes: t10.attributes, links: t10.links, startTime: t10.startTime, delegateSpan: n2, traceId: (null == o2 ? void 0 : o2.traceId) ?? (null == i2 ? void 0 : i2.traceId), spanId: null == o2 ? void 0 : o2.spanId, parentSpanId: null == i2 ? void 0 : i2.spanId, isolateOpenTelemetry: void 0 !== a2 });
        }
        wrap(...e10) {
          let t10 = this, [r10, n2, a2] = 3 === e10.length ? e10 : [e10[0], {}, e10[1]];
          return eX.has(r10) || "1" === process.env.NEXT_OTEL_VERBOSE ? function() {
            let e11 = n2;
            "function" == typeof e11 && "function" == typeof a2 && (e11 = e11.apply(this, arguments));
            let i2 = arguments.length - 1, o2 = arguments[i2];
            if ("function" != typeof o2) return t10.trace(r10, e11, () => a2.apply(this, arguments));
            {
              let n3 = t10.getContext().bind(e0.active(), o2);
              return t10.trace(r10, e11, (e12, t11) => (arguments[i2] = function(e13) {
                return null == t11 || t11(e13), n3.apply(this, arguments);
              }, a2.apply(this, arguments)));
            }
          } : a2;
        }
        startSpan(...e10) {
          let [t10, r10] = e10, n2 = r10 ? { ...r10, attributes: { "next.span_category": "nextjs", ...r10.attributes } } : { attributes: { "next.span_category": "nextjs" } }, a2 = eQ(), i2 = n2.parentSpan ?? this.getActiveScopeSpan(), o2 = i2 && (null == a2 ? void 0 : a2.isOpenTelemetryIsolatedSpan(i2)) ? i2 : void 0, s2 = (o2 ? void 0 : this.getSpanContext(i2)) ?? e0.active();
          if (!(null == a2 ? void 0 : a2.isLocalSpanRecordingEnabled())) return this.getTracerInstance().startSpan(t10, n2, s2);
          let l2 = !o2 && this.isOpenTelemetryEnabled() ? this.getTracerInstance().startSpan(t10, n2, s2) : void 0;
          return this.createLocalRecordingSpan(t10, n2, s2, l2, o2);
        }
        getSpanContext(e10) {
          return e10 ? e2.setSpan(e0.active(), e10) : void 0;
        }
        getRootSpanAttributes() {
          let e10 = e0.active().getValue(e8);
          return e6.get(e10);
        }
        setRootSpanAttribute(e10, t10) {
          let r10 = e0.active().getValue(e8), n2 = e6.get(r10);
          n2 && !n2.has(e10) && n2.set(e10, t10);
        }
        withSpan(e10, t10) {
          let r10 = eQ();
          return (null == r10 ? void 0 : r10.isLocalRecordingSpan(e10)) ? r10.withLocalSpan(e10, () => r10.isOpenTelemetryIsolatedSpan(e10) ? t10() : e0.with(e2.setSpan(e0.active(), e10), t10)) : e0.with(e2.setSpan(e0.active(), e10), t10);
        }
      }(), () => a), tn = "__prerender_bypass";
      Symbol("__next_preview_data"), Symbol(tn);
      class ta {
        constructor(e10, t10, r10, n2) {
          var a2;
          const i2 = e10 && function(e11, t11) {
            if ("function" == typeof e11.get) {
              let r11 = eT.from(e11);
              return { isOnDemandRevalidate: r11.get(v) === t11.previewModeId, revalidateOnlyGenerated: r11.has(y) };
            }
            return { isOnDemandRevalidate: e11[v] === t11.previewModeId, revalidateOnlyGenerated: e11.hasOwnProperty(y) };
          }(t10, e10).isOnDemandRevalidate, o2 = null == (a2 = r10.get(tn)) ? void 0 : a2.value;
          this._isEnabled = !!(!i2 && o2 && e10 && o2 === e10.previewModeId), this._previewModeId = null == e10 ? void 0 : e10.previewModeId, this._mutableCookies = n2;
        }
        get isEnabled() {
          return this._isEnabled;
        }
        enable() {
          if (!this._previewModeId) throw Object.defineProperty(Error("Invariant: previewProps missing previewModeId this should never happen"), "__NEXT_ERROR_CODE", { value: "E93", enumerable: false, configurable: true });
          this._mutableCookies.set({ name: tn, value: this._previewModeId, httpOnly: true, sameSite: "none", secure: true, path: "/" }), this._isEnabled = true;
        }
        disable() {
          this._mutableCookies.set({ name: tn, value: "", httpOnly: true, sameSite: "none", secure: true, path: "/", expires: /* @__PURE__ */ new Date(0) }), this._isEnabled = false;
        }
      }
      function ti(e10, t10) {
        if ("x-middleware-set-cookie" in e10 && "string" == typeof e10["x-middleware-set-cookie"]) {
          let r10 = e10["x-middleware-set-cookie"], n2 = new Headers();
          for (let e11 of S(r10)) n2.append("set-cookie", e11);
          for (let e11 of new ec.ResponseCookies(n2).getAll()) t10.set(e11);
        }
      }
      let to = eN();
      function ts(e10) {
        switch (e10.type) {
          case "request":
          case "prerender":
          case "prerender-runtime":
          case "prerender-client":
          case "validation-client":
          case "prerender-ppr":
            return e10.resumeDataCache;
          case "cache":
          case "private-cache":
          case "unstable-cache":
          case "prerender-legacy":
          case "generate-static-params":
            return null;
          default:
            return e10;
        }
      }
      var tl = e.i(99734);
      class td extends Error {
        constructor(e10, t10) {
          super(`Invariant: ${e10.endsWith(".") ? e10 : e10 + "."} This is a bug in Next.js.`, t10), Object.defineProperty(this, "__NEXT_ERROR_CODE", { value: "E1179", enumerable: false, configurable: true }), this.name = "InvariantError";
        }
      }
      var tu = e.i(51615);
      process.env.NEXT_PRIVATE_DEBUG_CACHE, Symbol.for("@next/cache-handlers");
      let tc = Symbol.for("@next/cache-handlers-map"), tp = Symbol.for("@next/cache-handlers-set");
      Symbol.for("@next/cache-handlers-private"), Symbol.for("@next/cache-handlers-dev-fronts"), Symbol.for("@next/cache-handlers-dev-tiered"), Symbol.for("@next/cache-handlers-memory-disabled");
      let th = globalThis;
      function tf() {
        let e10 = th[tc];
        if (e10) return e10.entries();
      }
      async function t_(e10, t10) {
        if (!e10) return t10();
        let r10 = tg(e10);
        try {
          return await t10();
        } finally {
          var n2, a2, i2, o2;
          let t11, s2, l2, d2, u2 = (n2 = r10, a2 = tg(e10), t11 = new Set(n2.pendingRevalidatedTags.map((e11) => {
            let t12 = "object" == typeof e11.profile ? JSON.stringify(e11.profile) : e11.profile || "";
            return `${e11.tag}:${t12}`;
          })), s2 = new Set(n2.pendingRevalidateWrites), { pendingRevalidatedTags: a2.pendingRevalidatedTags.filter((e11) => {
            let r11 = "object" == typeof e11.profile ? JSON.stringify(e11.profile) : e11.profile || "";
            return !t11.has(`${e11.tag}:${r11}`);
          }), pendingRevalidates: Object.fromEntries(Object.entries(a2.pendingRevalidates).filter(([e11]) => !(e11 in n2.pendingRevalidates))), pendingRevalidateWrites: a2.pendingRevalidateWrites.filter((e11) => !s2.has(e11)) });
          await (i2 = e10, l2 = [], (d2 = (null == (o2 = u2) ? void 0 : o2.pendingRevalidatedTags) ?? i2.pendingRevalidatedTags ?? []).length > 0 && l2.push(tm(d2, i2.incrementalCache, i2)), l2.push(...Object.values((null == o2 ? void 0 : o2.pendingRevalidates) ?? i2.pendingRevalidates ?? {})), l2.push(...(null == o2 ? void 0 : o2.pendingRevalidateWrites) ?? i2.pendingRevalidateWrites ?? []), 0 !== l2.length && Promise.all(l2).then(() => void 0));
        }
      }
      function tg(e10) {
        return { pendingRevalidatedTags: e10.pendingRevalidatedTags ? [...e10.pendingRevalidatedTags] : [], pendingRevalidates: { ...e10.pendingRevalidates }, pendingRevalidateWrites: e10.pendingRevalidateWrites ? [...e10.pendingRevalidateWrites] : [] };
      }
      async function tm(e10, t10, r10) {
        if (0 === e10.length) return;
        let n2 = function() {
          let e11 = th[tp];
          if (e11) return e11.values();
        }(), a2 = [], i2 = /* @__PURE__ */ new Map();
        for (let t11 of e10) {
          let e11, r11 = t11.profile;
          for (let [t12] of i2) if ("string" == typeof t12 && "string" == typeof r11 && t12 === r11 || "object" == typeof t12 && "object" == typeof r11 && JSON.stringify(t12) === JSON.stringify(r11) || t12 === r11) {
            e11 = t12;
            break;
          }
          let n3 = e11 || r11;
          i2.has(n3) || i2.set(n3, []), i2.get(n3).push(t11.tag);
        }
        for (let [e11, o2] of i2) {
          let i3;
          if (e11) {
            let t11;
            if ("object" == typeof e11) t11 = e11;
            else if ("string" == typeof e11 && !(t11 = null == r10 ? void 0 : r10.cacheLifeProfiles[e11])) throw Object.defineProperty(Error(`Invalid profile provided "${e11}" must be configured under cacheLife in next.config or be "max"`), "__NEXT_ERROR_CODE", { value: "E873", enumerable: false, configurable: true });
            t11 && (i3 = { expire: t11.expire });
          }
          for (let t11 of n2 || []) e11 ? a2.push(null == t11.updateTags ? void 0 : t11.updateTags.call(t11, o2, i3)) : a2.push(null == t11.updateTags ? void 0 : t11.updateTags.call(t11, o2));
          t10 && a2.push(t10.revalidateTag(o2, i3));
        }
        await Promise.all(a2);
      }
      let tv = eN();
      class ty {
        constructor({ waitUntil: e10, onClose: t10, onTaskError: r10 }) {
          this.isRequestClosed = false, this.initialOnCloseError = null, this.workUnitStores = /* @__PURE__ */ new Set(), this.waitUntil = e10, this.onClose = t10, this.onTaskError = r10, this.callbackQueue = new tl.default(), this.callbackQueue.pause();
          try {
            t10(() => {
              for (let e11 of (this.isRequestClosed = true, this.workUnitStores)) e11.phase = "after";
            });
          } catch (e11) {
            this.initialOnCloseError = { error: e11 };
          }
        }
        after(e10, t10) {
          if (this.initialOnCloseError) throw Object.defineProperty(new td("An onClose call failed, which means after() can't work correctly.", { cause: this.initialOnCloseError.error }), "__NEXT_ERROR_CODE", { value: "E1376", enumerable: false, configurable: true });
          if (this.workUnitStores.add(t10), eJ(e10)) this.addThenable(e10);
          else if ("function" == typeof e10) this.addCallback(e10, t10);
          else throw Object.defineProperty(Error("`after()`: Argument must be a promise or a function"), "__NEXT_ERROR_CODE", { value: "E50", enumerable: false, configurable: true });
        }
        addThenable(e10) {
          this.waitUntil || tb(), this.waitUntil(new Promise((t10) => {
            e10.then(() => {
              t10();
            }, (e11) => {
              t10(), this.reportTaskError("promise", e11);
            });
          }));
        }
        addCallback(e10, t10) {
          var r10;
          this.waitUntil || tb();
          let n2 = tv.getStore(), a2 = n2 ? n2.rootTaskSpawnPhase : t10.phase;
          this.runCallbacksOnClosePromise || (this.runCallbacksOnClosePromise = this.runCallbacksOnClose(), this.waitUntil(this.runCallbacksOnClosePromise));
          let i2 = (r10 = async () => {
            try {
              await tv.run({ rootTaskSpawnPhase: a2 }, () => e10());
            } catch (e11) {
              this.reportTaskError("function", e11);
            }
          }, eP ? eP.bind(r10) : eO.bind(r10));
          this.callbackQueue.add(i2);
        }
        async runCallbacksOnClose() {
          return this.isRequestClosed ? await new Promise((e10) => {
            setTimeout(e10, 0);
          }) : await new Promise((e10) => this.onClose(e10)), this.runCallbacks();
        }
        async runCallbacks() {
          if (0 === this.callbackQueue.size) return;
          let e10 = eA.getStore();
          if (!e10) throw Object.defineProperty(new td("Missing workStore in AfterContext.runCallbacks"), "__NEXT_ERROR_CODE", { value: "E547", enumerable: false, configurable: true });
          return t_(e10, () => (this.callbackQueue.start(), this.callbackQueue.onIdle()));
        }
        reportTaskError(e10, t10) {
          if (console.error("promise" === e10 ? "A promise passed to `after()` rejected:" : "An error occurred in a function passed to `after()`:", t10), this.onTaskError) try {
            null == this.onTaskError || this.onTaskError.call(this, t10);
          } catch (e11) {
            console.error(Object.defineProperty(new td("`onTaskError` threw while handling an error thrown from an `after` task", { cause: e11 }), "__NEXT_ERROR_CODE", { value: "E569", enumerable: false, configurable: true }));
          }
        }
      }
      function tb() {
        throw Object.defineProperty(Error("`after()` will not work correctly, because `waitUntil` is not available in the current environment."), "__NEXT_ERROR_CODE", { value: "E91", enumerable: false, configurable: true });
      }
      function tw(e10) {
        let t10, r10 = { then: (n2, a2) => (t10 || (t10 = Promise.resolve(e10())), t10.then((e11) => {
          r10.value = e11;
        }).catch(() => {
        }), t10.then(n2, a2)) };
        return r10;
      }
      class tE {
        onClose(e10) {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot subscribe to a closed CloseController"), "__NEXT_ERROR_CODE", { value: "E365", enumerable: false, configurable: true });
          this.target.addEventListener("close", e10), this.listeners++;
        }
        dispatchClose() {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot close a CloseController multiple times"), "__NEXT_ERROR_CODE", { value: "E229", enumerable: false, configurable: true });
          this.listeners > 0 && this.target.dispatchEvent(new Event("close")), this.isClosed = true;
        }
        constructor() {
          this.target = new EventTarget(), this.listeners = 0, this.isClosed = false;
        }
      }
      function tx() {
        return { previewModeId: process.env.__NEXT_PREVIEW_MODE_ID || "", previewModeSigningKey: process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY || "", previewModeEncryptionKey: process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY || "" };
      }
      let tC = Symbol.for("@next/request-context"), tS = /[^\t\x20-\x7e]/, tT = /[^\t\x20-\x7e]+/g;
      function tR(e10) {
        return tS.test(e10) ? e10.replace(tT, (e11) => encodeURIComponent(e11)) : e10;
      }
      async function tO(e10, t10, r10) {
        let n2 = /* @__PURE__ */ new Set();
        for (let t11 of ((e11) => {
          let t12 = ["/layout"];
          if (e11.startsWith("/")) {
            let r11 = e11.indexOf("/", 1);
            for (; ; ) {
              -1 === r11 && (r11 = e11.length);
              let n3 = e11.slice(0, r11);
              if (n3 && (n3.endsWith("/page") || n3.endsWith("/route") || (n3 = `${n3}${!n3.endsWith("/") ? "/" : ""}layout`), t12.push(n3)), r11 === e11.length) break;
              r11 = e11.indexOf("/", r11 + 1);
            }
          }
          return t12;
        })(e10)) t11 = tR(`${x}${t11}`), n2.add(t11);
        if (t10 && (!r10 || 0 === r10.size)) {
          let e11 = tR(`${x}${t10}`);
          n2.add(e11);
        }
        n2.has(`${x}/`) && n2.add(`${x}/index`), n2.has(`${x}/index`) && n2.add(`${x}/`);
        let a2 = Array.from(n2);
        return { tags: a2, expirationsByCacheKind: function(e11) {
          let t11 = /* @__PURE__ */ new Map(), r11 = tf();
          if (r11) for (let [n3, a3] of r11) "getExpiration" in a3 && t11.set(n3, tw(async () => a3.getExpiration(e11)));
          return t11;
        }(a2) };
      }
      let tP = Symbol.for("NextInternalRequestMeta"), tN = { get default() {
        throw Object.defineProperty(new td("Proxy does not support `use cache`, so reading its `default` cacheLife profile is unexpected."), "__NEXT_ERROR_CODE", { value: "E1406", enumerable: false, configurable: true });
      } };
      class tA extends eh {
        constructor(e10) {
          super(e10.input, e10.init), this.sourcePage = e10.page;
        }
        get request() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        waitUntil() {
          throw Object.defineProperty(new _({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      let tM = { keys: (e10) => Array.from(e10.keys()), get: (e10, t10) => e10.get(t10) ?? void 0 }, tL = (e10, t10) => tr().withPropagatedContext(e10.headers, t10, tM), tI = false;
      async function tk(t10) {
        var r10, n2, a2, i2, o2;
        let s2, l2, d2, u2, c2;
        !function() {
          if (!tI && (tI = true, "true" === process.env.NEXT_PRIVATE_TEST_PROXY)) {
            let { interceptTestApis: t11, wrapRequestHandler: r11 } = e.r(94165);
            t11(), tL = r11(tL);
          }
        }(), await h();
        let p2 = void 0 !== globalThis.__BUILD_MANIFEST;
        t10.request.url = t10.request.url.replace(/\.rsc($|\?)/, "$1");
        let f2 = t10.bypassNextUrl ? new URL(t10.request.url) : new $(t10.request.url, { headers: t10.request.headers, nextConfig: t10.request.nextConfig });
        for (let e10 of [...f2.searchParams.keys()]) {
          let t11 = f2.searchParams.getAll(e10), r11 = function(e11) {
            for (let t12 of ["nxtP", "nxtI"]) if (e11 !== t12 && e11.startsWith(t12)) return e11.substring(t12.length);
            return null;
          }(e10);
          if (r11) {
            for (let e11 of (f2.searchParams.delete(r11), t11)) f2.searchParams.append(r11, e11);
            f2.searchParams.delete(e10);
          }
        }
        let _2 = process.env.__NEXT_BUILD_ID || "";
        "buildId" in f2 && (_2 = f2.buildId || "", f2.buildId = "");
        let g2 = function(e10) {
          let t11 = new Headers();
          for (let [r11, n3] of Object.entries(e10)) for (let e11 of Array.isArray(n3) ? n3 : [n3]) void 0 !== e11 && ("number" == typeof e11 && (e11 = e11.toString()), t11.append(r11, e11));
          return t11;
        }(t10.request.headers), m2 = g2.has("x-nextjs-data"), v2 = "1" === g2.get("rsc");
        m2 && "/index" === f2.pathname && (f2.pathname = "/");
        let y2 = /* @__PURE__ */ new Map();
        if (!p2) for (let e10 of ew) {
          let t11 = g2.get(e10);
          null !== t11 && (y2.set(e10, t11), g2.delete(e10));
        }
        let b2 = f2.searchParams.get(eE), w2 = new tA({ page: t10.page, input: ((u2 = (d2 = "string" == typeof f2) ? new URL(f2) : f2).searchParams.delete(eE), d2 ? u2.toString() : u2).toString(), init: { body: t10.request.body, headers: g2, method: t10.request.method, nextConfig: t10.request.nextConfig, signal: t10.request.signal } });
        t10.request.requestMeta && (o2 = t10.request.requestMeta, w2[tP] = o2), m2 && Object.defineProperty(w2, "__isData", { enumerable: false, value: true }), !globalThis.__incrementalCacheShared && t10.IncrementalCache && (globalThis.__incrementalCache = new t10.IncrementalCache({ CurCacheHandler: t10.incrementalCacheHandler, minimalMode: true, fetchCacheKeyPrefix: "", dev: false, requestHeaders: t10.request.headers, getPrerenderManifest: () => ({ version: -1, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: tx() }) }));
        let E2 = t10.request.waitUntil ?? (null == (r10 = null == (c2 = globalThis[tC]) ? void 0 : c2.get()) ? void 0 : r10.waitUntil), x2 = new M({ request: w2, page: t10.page, context: E2 ? { waitUntil: E2 } : void 0 });
        if ((s2 = await tL(w2, () => {
          if ("/middleware" === t10.page || "/src/middleware" === t10.page || "/proxy" === t10.page || "/src/proxy" === t10.page) {
            let e10 = x2.waitUntil.bind(x2), r11 = new tE();
            return tr().trace(eW.execute, { spanName: `middleware ${w2.method}`, attributes: { "http.target": w2.nextUrl.pathname, "http.method": w2.method } }, async () => {
              try {
                var n3, a3, i3, o3, s3;
                let d3 = tx(), u3 = await tO("/", w2.nextUrl.pathname, null), c3 = (i3 = w2.nextUrl, o3 = (e11) => {
                  l2 = e11;
                }, s3 = void 0, function(e11) {
                  let { phase: t11, headers: r12, onUpdateCookies: n4, url: a4, rootParams: i4, implicitTags: o4, resumeDataCache: s4, previewProps: l3, isHmrRefresh: d4, serverComponentsHmrCache: u4, hmrRefreshHash: c4, fallbackParams: p4 } = e11, h2 = {};
                  return { type: "request", phase: t11, implicitTags: o4, url: { pathname: a4.pathname, search: a4.search ?? "" }, rootParams: i4, get headers() {
                    return h2.headers || (h2.headers = function(e12) {
                      let t12 = eT.from(e12 instanceof Headers ? new Headers(e12) : { ...e12 });
                      for (let e13 of ew) t12.delete(e13);
                      return t12.delete("x-nextjs-request-id"), t12.delete("x-nextjs-html-request-id"), eT.seal(t12);
                    }(r12)), h2.headers;
                  }, get cookies() {
                    if (!h2.cookies) {
                      let e12 = new ec.RequestCookies(eT.from(r12));
                      ti(r12, e12), h2.cookies = eL.seal(e12);
                    }
                    return h2.cookies;
                  }, set cookies(value) {
                    h2.cookies = value;
                  }, get mutableCookies() {
                    if (!h2.mutableCookies) {
                      let e12, t12 = (e12 = new ec.RequestCookies(eT.from(r12)), ek.wrap(e12, n4));
                      ti(r12, t12), h2.mutableCookies = t12;
                    }
                    return h2.mutableCookies;
                  }, get userspaceMutableCookies() {
                    if (!h2.userspaceMutableCookies) {
                      var f3;
                      let e12;
                      f3 = this, h2.userspaceMutableCookies = e12 = new Proxy(f3.mutableCookies, { get(t12, r13, n5) {
                        switch (r13) {
                          case "delete":
                            return function(...r14) {
                              return eD(f3, "cookies().delete"), t12.delete(...r14), e12;
                            };
                          case "set":
                            return function(...r14) {
                              return eD(f3, "cookies().set"), t12.set(...r14), e12;
                            };
                          default:
                            return ef.get(t12, r13, n5);
                        }
                      } });
                    }
                    return h2.userspaceMutableCookies;
                  }, get draftMode() {
                    return h2.draftMode || (h2.draftMode = new ta(l3, r12, this.cookies, this.mutableCookies)), h2.draftMode;
                  }, resumeDataCache: s4 ?? null, isHmrRefresh: d4, serverComponentsHmrCache: u4 || globalThis.__serverComponentsHmrCache, hmrRefreshHash: c4, fallbackParams: p4 };
                }({ phase: "action", headers: w2.headers, onUpdateCookies: o3, url: i3, rootParams: {}, implicitTags: u3, resumeDataCache: null, previewProps: d3, isHmrRefresh: false, serverComponentsHmrCache: void 0, hmrRefreshHash: s3, fallbackParams: null })), p3 = function({ page: e11, renderOpts: t11, isPrefetchRequest: r12, buildId: n4, deploymentId: a4, previouslyRevalidatedTags: i4, nonce: o4 }) {
                  let s4 = !t11.supportsDynamicResponse && !t11.isDraftMode && !t11.isPossibleServerAction, l3 = s4 && (!!process.env.NEXT_DEBUG_BUILD || "1" === process.env.NEXT_SSG_FETCH_METRICS), d4 = { isStaticGeneration: s4, page: e11, route: eC(e11), incrementalCache: t11.incrementalCache || globalThis.__incrementalCache, cacheLifeProfiles: t11.cacheLifeProfiles, useCacheTimeout: t11.experimental.useCacheTimeout, staticPageGenerationTimeout: t11.staticPageGenerationTimeout, isBuildTimePrerendering: t11.isBuildTimePrerendering, fetchCache: t11.fetchCache, isOnDemandRevalidate: t11.isOnDemandRevalidate, requestId: void 0, htmlRequestId: void 0, isDraftMode: t11.isDraftMode, isPrefetchRequest: r12, buildId: n4, deploymentId: a4, reactLoadableManifest: (null == t11 ? void 0 : t11.reactLoadableManifest) || {}, assetPrefix: (null == t11 ? void 0 : t11.assetPrefix) || "", nonce: o4, afterContext: function(e12) {
                    let { waitUntil: t12, onClose: r13, onAfterTaskError: n5 } = e12;
                    return new ty({ waitUntil: t12, onClose: r13, onTaskError: n5 });
                  }(t11), cacheComponentsEnabled: t11.cacheComponents, validationLevel: t11.validationLevel, previouslyRevalidatedTags: i4, refreshTagsByCacheKind: function() {
                    let e12 = /* @__PURE__ */ new Map(), t12 = tf();
                    if (t12) for (let [r13, n5] of t12) "refreshTags" in n5 && e12.set(r13, tw(async () => n5.refreshTags()));
                    return e12;
                  }(), runInCleanSnapshot: eP ? eP.snapshot() : function(e12, ...t12) {
                    return e12(...t12);
                  }, shouldTrackFetchMetrics: l3, reactServerErrorsByDigest: /* @__PURE__ */ new Map() };
                  return t11.store = d4, d4;
                }({ page: "/", renderOpts: { cacheLifeProfiles: tN, staticPageGenerationTimeout: 0, cacheComponents: false, validationLevel: "warning", experimental: { isRoutePPREnabled: false, authInterrupts: !!(null == (a3 = t10.request.nextConfig) || null == (n3 = a3.experimental) ? void 0 : n3.authInterrupts), useCacheTimeout: 0 }, supportsDynamicResponse: true, waitUntil: e10, onClose: r11.onClose.bind(r11), onAfterTaskError: void 0 }, isPrefetchRequest: "1" === w2.headers.get(eb), buildId: _2 ?? "", deploymentId: false, previouslyRevalidatedTags: [] });
                return await eA.run(p3, () => to.run(c3, t10.handler, w2, x2));
              } finally {
                setTimeout(() => {
                  r11.dispatchClose();
                }, 0);
              }
            });
          }
          return t10.handler(w2, x2);
        })) && !(s2 instanceof Response)) throw Object.defineProperty(TypeError("Expected an instance of Response to be returned"), "__NEXT_ERROR_CODE", { value: "E567", enumerable: false, configurable: true });
        s2 && l2 && s2.headers.set("set-cookie", l2);
        let C2 = null == s2 ? void 0 : s2.headers.get("x-middleware-rewrite");
        if (s2 && C2 && (v2 || !p2)) {
          let e10 = new $(C2, { forceLocale: true, headers: t10.request.headers, nextConfig: t10.request.nextConfig });
          p2 || e10.host !== w2.nextUrl.host || (e10.buildId = _2 || e10.buildId, s2.headers.set("x-middleware-rewrite", String(e10)));
          let { url: r11, isRelative: o3 } = ey(e10.toString(), f2.toString());
          !p2 && m2 && s2.headers.set("x-nextjs-rewrite", r11);
          let l3 = !o3 && (null == (i2 = t10.request.nextConfig) || null == (a2 = i2.experimental) || null == (n2 = a2.clientParamParsingOrigins) ? void 0 : n2.some((t11) => new RegExp(t11).test(e10.origin)));
          v2 && (o3 || l3) && (f2.pathname !== e10.pathname && s2.headers.set("x-nextjs-rewritten-path", e10.pathname), f2.search !== e10.search && s2.headers.set("x-nextjs-rewritten-query", e10.search.slice(1)));
        }
        if (s2 && C2 && v2 && b2) {
          let e10 = new URL(C2);
          e10.searchParams.has(eE) || (e10.searchParams.set(eE, b2), s2.headers.set("x-middleware-rewrite", e10.toString()));
        }
        let S2 = null == s2 ? void 0 : s2.headers.get("Location");
        if (s2 && S2 && !p2) {
          let e10 = new $(S2, { forceLocale: false, headers: t10.request.headers, nextConfig: t10.request.nextConfig });
          s2 = new Response(s2.body, s2), e10.host === f2.host && (e10.buildId = _2 || e10.buildId, s2.headers.set("Location", ey(e10, f2).url)), m2 && (s2.headers.delete("Location"), s2.headers.set("x-nextjs-redirect", ey(e10.toString(), f2.toString()).url));
        }
        let T2 = s2 || ev.next(), R2 = T2.headers.get("x-middleware-override-headers"), O2 = [];
        if (R2) {
          for (let [e10, t11] of y2) T2.headers.set(`x-middleware-request-${e10}`, t11), O2.push(e10);
          O2.length > 0 && T2.headers.set("x-middleware-override-headers", R2 + "," + O2.join(","));
        }
        return { response: T2, waitUntil: ("internal" === x2[N].kind ? Promise.all(x2[N].promises).then(() => {
        }) : void 0) ?? Promise.resolve(), fetchMetrics: w2.fetchMetrics };
      }
      class tD {
        constructor() {
          let e10, t10;
          this.promise = new Promise((r10, n2) => {
            e10 = r10, t10 = n2;
          }), this.resolve = e10, this.reject = t10;
        }
      }
      class tj {
        constructor(e10, t10, r10) {
          this.prev = null, this.next = null, this.key = e10, this.data = t10, this.size = r10;
        }
      }
      class tq {
        constructor() {
          this.prev = null, this.next = null;
        }
      }
      class tU {
        constructor(e10, t10, r10) {
          this.cache = /* @__PURE__ */ new Map(), this.totalSize = 0, this.maxSize = e10, this.calculateSize = t10, this.onEvict = r10, this.head = new tq(), this.tail = new tq(), this.head.next = this.tail, this.tail.prev = this.head;
        }
        addToHead(e10) {
          e10.prev = this.head, e10.next = this.head.next, this.head.next.prev = e10, this.head.next = e10;
        }
        removeNode(e10) {
          e10.prev.next = e10.next, e10.next.prev = e10.prev;
        }
        moveToHead(e10) {
          this.removeNode(e10), this.addToHead(e10);
        }
        removeTail() {
          let e10 = this.tail.prev;
          return this.removeNode(e10), e10;
        }
        set(e10, t10) {
          let r10 = (null == this.calculateSize ? void 0 : this.calculateSize.call(this, t10, e10)) ?? 1;
          if (r10 <= 0) throw Object.defineProperty(Error(`LRUCache: calculateSize returned ${r10}, but size must be > 0. Items with size 0 would never be evicted, causing unbounded cache growth.`), "__NEXT_ERROR_CODE", { value: "E1045", enumerable: false, configurable: true });
          if (r10 > this.maxSize) return console.warn("Single item size exceeds maxSize"), false;
          let n2 = this.cache.get(e10);
          if (n2) n2.data = t10, this.totalSize = this.totalSize - n2.size + r10, n2.size = r10, this.moveToHead(n2);
          else {
            let n3 = new tj(e10, t10, r10);
            this.cache.set(e10, n3), this.addToHead(n3), this.totalSize += r10;
          }
          for (; this.totalSize > this.maxSize && this.cache.size > 0; ) {
            let e11 = this.removeTail();
            this.cache.delete(e11.key), this.totalSize -= e11.size, null == this.onEvict || this.onEvict.call(this, e11.key, e11.data);
          }
          return true;
        }
        has(e10) {
          return this.cache.has(e10);
        }
        get(e10) {
          let t10 = this.cache.get(e10);
          if (t10) return this.moveToHead(t10), t10.data;
        }
        *[Symbol.iterator]() {
          let e10 = this.head.next;
          for (; e10 && e10 !== this.tail; ) {
            let t10 = e10;
            yield [t10.key, t10.data], e10 = e10.next;
          }
        }
        remove(e10) {
          let t10 = this.cache.get(e10);
          t10 && (this.removeNode(t10), this.cache.delete(e10), this.totalSize -= t10.size);
        }
        get size() {
          return this.cache.size;
        }
        get currentSize() {
          return this.totalSize;
        }
      }
      let { env: tB, stdout: tG } = (null == (eu = globalThis) ? void 0 : eu.process) ?? {}, tH = tB && !tB.NO_COLOR && (tB.FORCE_COLOR || (null == tG ? void 0 : tG.isTTY) && !tB.CI && "dumb" !== tB.TERM), t$ = (e10, t10, r10, n2) => {
        let a2 = e10.substring(0, n2) + r10, i2 = e10.substring(n2 + t10.length), o2 = i2.indexOf(t10);
        return ~o2 ? a2 + t$(i2, t10, r10, o2) : a2 + i2;
      }, tV = (e10, t10, r10 = e10) => tH ? (n2) => {
        let a2 = "" + n2, i2 = a2.indexOf(t10, e10.length);
        return ~i2 ? e10 + t$(a2, t10, r10, i2) + t10 : e10 + a2 + t10;
      } : String, tF = tV("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m");
      tV("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"), tV("\x1B[3m", "\x1B[23m"), tV("\x1B[4m", "\x1B[24m"), tV("\x1B[7m", "\x1B[27m"), tV("\x1B[8m", "\x1B[28m"), tV("\x1B[9m", "\x1B[29m"), tV("\x1B[30m", "\x1B[39m");
      let tz = tV("\x1B[31m", "\x1B[39m"), tK = tV("\x1B[32m", "\x1B[39m"), tW = tV("\x1B[33m", "\x1B[39m");
      tV("\x1B[34m", "\x1B[39m");
      let tX = tV("\x1B[35m", "\x1B[39m");
      tV("\x1B[38;2;173;127;168m", "\x1B[39m"), tV("\x1B[36m", "\x1B[39m");
      let tZ = tV("\x1B[37m", "\x1B[39m");
      tV("\x1B[90m", "\x1B[39m"), tV("\x1B[40m", "\x1B[49m"), tV("\x1B[41m", "\x1B[49m"), tV("\x1B[42m", "\x1B[49m"), tV("\x1B[43m", "\x1B[49m"), tV("\x1B[44m", "\x1B[49m"), tV("\x1B[45m", "\x1B[49m"), tV("\x1B[46m", "\x1B[49m"), tV("\x1B[47m", "\x1B[49m"), tZ(tF("\u25CB")), tz(tF("\u2A2F")), tW(tF("\u26A0")), tZ(tF(" ")), tK(tF("\u2713")), tX(tF("\xBB")), new tU(1e4, (e10) => e10.length), new tU(1e4, (e10) => e10.length);
      var tJ = ((er = {}).APP_PAGE = "APP_PAGE", er.APP_ROUTE = "APP_ROUTE", er.PAGES = "PAGES", er.FETCH = "FETCH", er.REDIRECT = "REDIRECT", er.IMAGE = "IMAGE", er), tY = ((en = {}).APP_PAGE = "APP_PAGE", en.APP_ROUTE = "APP_ROUTE", en.PAGES = "PAGES", en.FETCH = "FETCH", en.IMAGE = "IMAGE", en);
      function tQ() {
      }
      new TextEncoder();
      let t0 = new TextEncoder();
      function t1(e10) {
        return new ReadableStream({ start(t10) {
          t10.enqueue(t0.encode(e10)), t10.close();
        } });
      }
      function t2(e10) {
        return new ReadableStream({ start(t10) {
          t10.enqueue(e10), t10.close();
        } });
      }
      async function t3(e10, t10) {
        let r10 = new TextDecoder("utf-8", { fatal: true }), n2 = "";
        for await (let a2 of e10) {
          if (null == t10 ? void 0 : t10.aborted) return n2;
          n2 += r10.decode(a2, { stream: true });
        }
        return n2 + r10.decode();
      }
      let t4 = "ResponseAborted";
      class t5 extends Error {
        constructor(...e10) {
          super(...e10), this.name = t4;
        }
      }
      let t9 = 0, t7 = 0, t6 = 0;
      function t8(e10 = {}) {
        let t10 = 0 === t9 ? void 0 : { clientComponentLoadStart: t9, clientComponentLoadTimes: t7, clientComponentLoadCount: t6 };
        return e10.reset && (t9 = 0, t7 = 0, t6 = 0), t10;
      }
      function re(e10) {
        return (null == e10 ? void 0 : e10.name) === "AbortError" || (null == e10 ? void 0 : e10.name) === t4;
      }
      let rt = "performance" in globalThis && process.env.NEXT_OTEL_PERFORMANCE_PREFIX;
      async function rr(e10, t10, r10) {
        try {
          let n2, { errored: a2, destroyed: i2 } = t10;
          if (a2 || i2) return;
          let o2 = (n2 = new AbortController(), t10.once("close", () => {
            t10.writableFinished || n2.abort(new t5());
          }), n2), s2 = function(e11, t11) {
            let r11 = false, n3 = new tD();
            function a3() {
              n3.resolve();
            }
            e11.on("drain", a3), e11.once("close", () => {
              e11.off("drain", a3), n3.resolve();
            });
            let i3 = new tD();
            return e11.once("finish", () => {
              i3.resolve();
            }), new WritableStream({ write: async (t12) => {
              if (!r11) {
                if (r11 = true, rt) {
                  let e12 = t8();
                  e12 && performance.measure(`${process.env.NEXT_OTEL_PERFORMANCE_PREFIX}:next-client-component-loading`, { start: e12.clientComponentLoadStart, end: e12.clientComponentLoadStart + e12.clientComponentLoadTimes });
                }
                e11.flushHeaders(), tr().trace(eB.startResponse, { spanName: "start response" }, () => void 0);
              }
              try {
                let r12 = e11.write(t12);
                "flush" in e11 && "function" == typeof e11.flush && e11.flush(), r12 || (await n3.promise, n3 = new tD());
              } catch (t13) {
                throw e11.end(), Object.defineProperty(Error("failed to write chunk to response", { cause: t13 }), "__NEXT_ERROR_CODE", { value: "E321", enumerable: false, configurable: true });
              }
            }, abort: (t12) => {
              e11.writableFinished || e11.destroy(t12);
            }, close: async () => {
              if (t11 && await t11, !e11.writableFinished) return e11.end(), i3.promise;
            } });
          }(t10, r10);
          await e10.pipeTo(s2, { signal: o2.signal });
        } catch (e11) {
          if (re(e11)) return;
          throw Object.defineProperty(Error("failed to pipe response", { cause: e11 }), "__NEXT_ERROR_CODE", { value: "E180", enumerable: false, configurable: true });
        }
      }
      async function rn(e10, t10, r10) {
        try {
          let { errored: n2, destroyed: a2 } = t10;
          if (n2 || a2) return;
          let i2 = false, o2 = new tD();
          t10.once("close", () => {
            e10.destroy(), o2.resolve();
          }), e10.on("data", (r11) => {
            if (!i2) {
              if (i2 = true, "performance" in globalThis && process.env.NEXT_OTEL_PERFORMANCE_PREFIX) {
                let e11 = t8();
                e11 && performance.measure(`${process.env.NEXT_OTEL_PERFORMANCE_PREFIX}:next-client-component-loading`, { start: e11.clientComponentLoadStart, end: e11.clientComponentLoadStart + e11.clientComponentLoadTimes });
              }
              t10.flushHeaders(), tr().trace(eB.startResponse, { spanName: "start response" }, () => void 0);
            }
            let n3 = t10.write(r11);
            "flush" in t10 && "function" == typeof t10.flush && t10.flush(), n3 || (e10.pause(), t10.once("drain", () => {
              e10.resume();
            }));
          }), e10.on("end", async () => {
            r10 && await r10, t10.writableFinished || t10.end(), o2.resolve();
          }), e10.on("error", (e11) => {
            re(e11) || t10.destroy(e11), o2.resolve();
          }), await o2.promise;
        } catch (e11) {
          if (re(e11)) return;
          throw Object.defineProperty(Error("failed to pipe response", { cause: e11 }), "__NEXT_ERROR_CODE", { value: "E180", enumerable: false, configurable: true });
        }
      }
      function ra(e10) {
        return null !== e10 && "object" == typeof e10 && "function" == typeof e10.pipe && "function" == typeof e10.on && !(e10 instanceof ReadableStream);
      }
      class ri {
        static #e = this.EMPTY = new ri(null, { metadata: {}, contentType: null });
        static fromStatic(e10, t10) {
          return new ri(e10, { metadata: {}, contentType: t10 });
        }
        constructor(e10, { contentType: t10, waitUntil: r10, metadata: n2 }) {
          this.response = e10, this.contentType = t10, this.metadata = n2, this.waitUntil = r10;
        }
        assignMetadata(e10) {
          Object.assign(this.metadata, e10);
        }
        get isNull() {
          return null === this.response;
        }
        get isDynamic() {
          return "string" != typeof this.response;
        }
        toUnchunkedString(e10 = false) {
          if (null === this.response) return "";
          if ("string" != typeof this.response) {
            if (!e10) throw Object.defineProperty(new td("dynamic responses cannot be unchunked. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E732", enumerable: false, configurable: true });
            return t3(this.readable);
          }
          return this.response;
        }
        get readable() {
          if (null === this.response) return new ReadableStream({ start(e10) {
            e10.close();
          } });
          if ("string" == typeof this.response) return t1(this.response);
          if (tu.Buffer.isBuffer(this.response)) return t2(this.response);
          if (Array.isArray(this.response)) return function(...e10) {
            if (0 === e10.length) return new ReadableStream({ start(e11) {
              e11.close();
            } });
            if (1 === e10.length) return e10[0];
            let { readable: t10, writable: r10 } = new TransformStream(), n2 = e10[0].pipeTo(r10, { preventClose: true }), a2 = 1;
            for (; a2 < e10.length - 1; a2++) {
              let t11 = e10[a2];
              n2 = n2.then(() => t11.pipeTo(r10, { preventClose: true }));
            }
            let i2 = e10[a2];
            return (n2 = n2.then(() => i2.pipeTo(r10))).catch(tQ), t10;
          }(...this.response);
          if (ra(this.response)) throw Object.defineProperty(new td("Node.js Readable cannot be converted to a web stream in the edge runtime"), "__NEXT_ERROR_CODE", { value: "E1150", enumerable: false, configurable: true });
          return this.response;
        }
        coerce() {
          if (null === this.response) return [];
          if ("string" == typeof this.response) return [t1(this.response)];
          if (Array.isArray(this.response)) return this.response;
          if (tu.Buffer.isBuffer(this.response)) return [t2(this.response)];
          if (!ra(this.response)) return [this.response];
          throw Object.defineProperty(new td("Node.js Readable cannot be converted to a web stream in the edge runtime"), "__NEXT_ERROR_CODE", { value: "E1150", enumerable: false, configurable: true });
        }
        pipeThrough(e10) {
          this.response = this.readable.pipeThrough(e10);
        }
        unshift(e10) {
          this.response = this.coerce(), this.response.unshift(e10);
        }
        push(e10) {
          this.response = this.coerce(), this.response.push(e10);
        }
        async pipeTo(e10) {
          try {
            await this.readable.pipeTo(e10, { preventClose: true }), this.waitUntil && await this.waitUntil, await e10.close();
          } catch (t10) {
            if (re(t10)) return void await e10.abort(t10);
            throw t10;
          }
        }
        async pipeToNodeResponse(e10) {
          null !== this.response && "string" != typeof this.response && !tu.Buffer.isBuffer(this.response) && !Array.isArray(this.response) && ra(this.response) ? await rn(this.response, e10, this.waitUntil) : await rr(this.readable, e10, this.waitUntil);
        }
      }
      function ro(e10, t10) {
        if (!e10) return t10;
        let r10 = parseInt(e10, 10);
        return Number.isFinite(r10) && r10 > 0 ? r10 : t10;
      }
      ro(process.env.NEXT_PRIVATE_RESPONSE_CACHE_TTL, 1e4), ro(process.env.NEXT_PRIVATE_RESPONSE_CACHE_MAX_SIZE, 150);
      var rs = e.i(68886);
      let rl = /* @__PURE__ */ new Map(), rd = (e10, t10) => {
        for (let r10 of e10) {
          let e11 = rl.get(r10), n2 = null == e11 ? void 0 : e11.expired;
          if ("number" == typeof n2 && n2 <= performance.timeOrigin + performance.now() && n2 > t10) return true;
        }
        return false;
      }, ru = (e10, t10) => {
        for (let r10 of e10) {
          let e11 = rl.get(r10), n2 = (null == e11 ? void 0 : e11.stale) ?? 0;
          if ("number" == typeof n2 && n2 > t10) return true;
        }
        return false;
      };
      class rc {
        constructor(e10) {
          this.fs = e10, this.tasks = [];
        }
        findOrCreateTask(e10) {
          for (let t11 of this.tasks) if (t11[0] === e10) return t11;
          let t10 = this.fs.mkdir(e10);
          t10.catch(() => {
          });
          let r10 = [e10, t10, []];
          return this.tasks.push(r10), r10;
        }
        append(e10, t10) {
          let r10 = this.findOrCreateTask(rs.default.dirname(e10)), n2 = r10[1].then(() => this.fs.writeFile(e10, t10));
          n2.catch(() => {
          }), r10[2].push(n2);
        }
        wait() {
          return Promise.all(this.tasks.flatMap((e10) => e10[2]));
        }
      }
      function rp(e10) {
        return (null == e10 ? void 0 : e10.length) || 0;
      }
      class rh {
        static #e = this.debug = !!process.env.NEXT_PRIVATE_DEBUG_CACHE;
        constructor(e10) {
          this.fs = e10.fs, this.flushToDisk = e10.flushToDisk, this.serverDistDir = e10.serverDistDir, this.revalidatedTags = e10.revalidatedTags, e10.maxMemoryCacheSize ? rh.memoryCache ? rh.debug && console.log("FileSystemCache: memory store already initialized") : (rh.debug && console.log("FileSystemCache: using memory store for fetch cache"), rh.memoryCache = function(e11) {
            return r || (r = new tU(e11, function({ value: e12 }, t10) {
              var r10, n2;
              let a2;
              if (e12) if (e12.kind === tJ.REDIRECT) a2 = JSON.stringify(e12.props).length;
              else if (e12.kind === tJ.IMAGE) throw Object.defineProperty(Error("invariant image should not be incremental-cache"), "__NEXT_ERROR_CODE", { value: "E501", enumerable: false, configurable: true });
              else a2 = e12.kind === tJ.FETCH ? JSON.stringify(e12.data || "").length : e12.kind === tJ.APP_ROUTE ? e12.body.length : e12.kind === tJ.APP_PAGE ? Math.max(1, e12.html.length + rp(e12.rscData) + ((null == (r10 = e12.postponed) ? void 0 : r10.length) || 0) + function(e13) {
                if (!e13) return 0;
                let t11 = 0;
                for (let [r11, n3] of e13) t11 += r11.length + rp(n3);
                return t11;
              }(e12.segmentData)) : e12.html.length + ((null == (n2 = JSON.stringify(e12.pageData)) ? void 0 : n2.length) || 0);
              else a2 = 25;
              return t10.length + a2;
            })), r;
          }(e10.maxMemoryCacheSize)) : rh.debug && console.log("FileSystemCache: not using memory store for fetch cache");
        }
        resetRequestCache() {
        }
        async revalidateTag(e10, t10) {
          if (e10 = "string" == typeof e10 ? [e10] : e10, rh.debug && console.log("FileSystemCache: revalidateTag", e10, t10), 0 === e10.length) return;
          let r10 = Date.now();
          for (let n2 of e10) {
            let e11 = rl.get(n2) || {};
            if (t10) {
              let a2 = { ...e11 };
              a2.stale = r10, void 0 !== t10.expire && (a2.expired = r10 + 1e3 * t10.expire), rl.set(n2, a2);
            } else rl.set(n2, { ...e11, expired: r10 });
          }
        }
        async get(...e10) {
          var t10, r10, n2, a2, i2, o2;
          let [s2, l2] = e10, { kind: d2 } = l2, u2 = null == (t10 = rh.memoryCache) ? void 0 : t10.get(s2);
          if (rh.debug && (d2 === tY.FETCH ? console.log("FileSystemCache: get", s2, l2.tags, d2, !!u2) : console.log("FileSystemCache: get", s2, d2, !!u2)), (null == u2 || null == (r10 = u2.value) ? void 0 : r10.kind) === tJ.APP_PAGE || (null == u2 || null == (n2 = u2.value) ? void 0 : n2.kind) === tJ.APP_ROUTE || (null == u2 || null == (a2 = u2.value) ? void 0 : a2.kind) === tJ.PAGES) {
            let e11 = null == (o2 = u2.value.headers) ? void 0 : o2[w];
            if ("string" == typeof e11) {
              let t11 = e11.split(",");
              if (t11.length > 0 && rd(t11, u2.lastModified)) return rh.debug && console.log("FileSystemCache: expired tags", t11), null;
            }
          } else if ((null == u2 || null == (i2 = u2.value) ? void 0 : i2.kind) === tJ.FETCH) {
            let e11 = l2.kind === tY.FETCH ? [...l2.tags || [], ...l2.softTags || []] : [];
            if (e11.some((e12) => this.revalidatedTags.includes(e12))) return rh.debug && console.log("FileSystemCache: was revalidated", e11), null;
            if (rd(e11, u2.lastModified)) return rh.debug && console.log("FileSystemCache: expired tags", e11), null;
          }
          return u2 ?? null;
        }
        async set(e10, t10, r10) {
          var n2;
          if (null == (n2 = rh.memoryCache) || n2.set(e10, { value: t10, lastModified: Date.now() }), rh.debug && console.log("FileSystemCache: set", e10), !this.flushToDisk || !t10) return;
          let a2 = new rc(this.fs);
          if (t10.kind === tJ.APP_ROUTE) {
            let r11 = this.getFilePath(`${e10}.body`, tY.APP_ROUTE);
            a2.append(r11, t10.body);
            let n3 = { headers: t10.headers, status: t10.status, postponed: void 0, segmentPaths: void 0, prefetchHints: void 0 };
            a2.append(r11.replace(/\.body$/, b), JSON.stringify(n3, null, 2));
          } else if (t10.kind === tJ.PAGES || t10.kind === tJ.APP_PAGE) {
            let n3 = t10.kind === tJ.APP_PAGE, i2 = this.getFilePath(`${e10}.html`, n3 ? tY.APP_PAGE : tY.PAGES);
            if (a2.append(i2, t10.html), r10.fetchCache || r10.isFallback || r10.isRoutePPREnabled || a2.append(this.getFilePath(`${e10}${n3 ? ".rsc" : ".json"}`, n3 ? tY.APP_PAGE : tY.PAGES), n3 ? t10.rscData : JSON.stringify(t10.pageData)), (null == t10 ? void 0 : t10.kind) === tJ.APP_PAGE) {
              let e11;
              if (t10.segmentData) {
                e11 = [];
                let r12 = i2.replace(/\.html$/, ".segments");
                for (let [n4, i3] of t10.segmentData) {
                  e11.push(n4);
                  let t11 = r12 + n4 + ".segment.rsc";
                  a2.append(t11, i3);
                }
              }
              let r11 = { headers: t10.headers, status: t10.status, postponed: t10.postponed, segmentPaths: e11, prefetchHints: void 0 };
              a2.append(i2.replace(/\.html$/, b), JSON.stringify(r11));
            }
          } else if (t10.kind === tJ.FETCH) {
            let n3 = this.getFilePath(e10, tY.FETCH);
            a2.append(n3, JSON.stringify({ ...t10, tags: r10.fetchCache ? r10.tags : [] }));
          }
          await a2.wait();
        }
        getFilePath(e10, t10) {
          switch (t10) {
            case tY.FETCH:
              return rs.default.join(this.serverDistDir, "..", "cache", "fetch-cache", e10);
            case tY.PAGES:
              return rs.default.join(this.serverDistDir, "pages", e10);
            case tY.IMAGE:
            case tY.APP_PAGE:
            case tY.APP_ROUTE:
              return rs.default.join(this.serverDistDir, "app", e10);
            default:
              throw Object.defineProperty(Error(`Unexpected file path kind: ${t10}`), "__NEXT_ERROR_CODE", { value: "E479", enumerable: false, configurable: true });
          }
        }
      }
      let rf = ["(..)(..)", "(.)", "(..)", "(...)"], r_ = /\/[^/]*\[[^/]+\][^/]*(?=\/|$)/, rg = /\/\[[^/]+\](?=\/|$)/;
      function rm(e10) {
        return e10.replace(/(?:\/index)?\/?$/, "") || "/";
      }
      class rv {
        static #e = this.cacheControls = /* @__PURE__ */ new Map();
        constructor(e10) {
          this.prerenderManifest = e10;
        }
        get(e10) {
          let t10 = rv.cacheControls.get(e10);
          if (t10) return t10;
          let r10 = this.prerenderManifest.routes[e10];
          if (r10) {
            let { initialRevalidateSeconds: e11, initialExpireSeconds: t11 } = r10;
            if (void 0 !== e11) return { revalidate: e11, expire: t11 };
          }
          let n2 = this.prerenderManifest.dynamicRoutes[e10];
          if (n2) {
            let { fallbackRevalidate: e11, fallbackExpire: t11 } = n2;
            if (void 0 !== e11) return { revalidate: e11, expire: t11 };
          }
        }
        set(e10, t10) {
          rv.cacheControls.set(e10, t10);
        }
        clear() {
          rv.cacheControls.clear();
        }
      }
      function ry(e10) {
        let t10 = "buffer" in e10 ? new Uint8Array(e10.buffer, e10.byteOffset, e10.byteLength) : new Uint8Array(e10), r10 = "";
        for (let e11 of t10) r10 += e11.toString(16).padStart(2, "0");
        return r10;
      }
      async function rb(e10) {
        {
          let t10 = new TextEncoder().encode(e10);
          return ry(await crypto.subtle.digest("SHA-256", t10));
        }
      }
      e.i(67914);
      class rw {
        static #e = this.debug = !!process.env.NEXT_PRIVATE_DEBUG_CACHE;
        constructor({ fs: e10, dev: t10, flushToDisk: r10, minimalMode: n2, serverDistDir: a2, requestHeaders: i2, maxMemoryCacheSize: o2, getPrerenderManifest: s2, fetchCacheKeyPrefix: l2, CurCacheHandler: d2, allowedRevalidateHeaderKeys: u2 }) {
          var c2, p2, h2, f2;
          this.locks = /* @__PURE__ */ new Map(), this.hasCustomCacheHandler = !!d2;
          const _2 = Symbol.for("@next/cache-handlers"), g2 = globalThis;
          if (d2) rw.debug && console.log("IncrementalCache: using custom cache handler", d2.name);
          else {
            const t11 = g2[_2];
            (null == t11 ? void 0 : t11.FetchCache) ? (d2 = t11.FetchCache, rw.debug && console.log("IncrementalCache: using global FetchCache cache handler")) : e10 && a2 && (rw.debug && console.log("IncrementalCache: using filesystem cache handler"), d2 = rh);
          }
          process.env.__NEXT_TEST_MAX_ISR_CACHE && (o2 = parseInt(process.env.__NEXT_TEST_MAX_ISR_CACHE, 10)), this.dev = t10, this.disableForTestmode = "true" === process.env.NEXT_PRIVATE_TEST_PROXY, this.minimalMode = n2, this.requestHeaders = i2, this.allowedRevalidateHeaderKeys = u2, this.prerenderManifest = s2(), this.cacheControls = new rv(this.prerenderManifest), this.fetchCacheKeyPrefix = l2;
          let m2 = [];
          i2[v] === (null == (p2 = this.prerenderManifest) || null == (c2 = p2.preview) ? void 0 : c2.previewModeId) && (this.isOnDemandRevalidate = true), n2 && (m2 = this.revalidatedTags = function(e11, t11) {
            return "string" == typeof e11[E] && e11["x-next-revalidate-tag-token"] === t11 ? e11[E].split(",") : [];
          }(i2, null == (f2 = this.prerenderManifest) || null == (h2 = f2.preview) ? void 0 : h2.previewModeId)), d2 && (this.cacheHandler = new d2({ dev: t10, fs: e10, flushToDisk: r10, serverDistDir: a2, revalidatedTags: m2, maxMemoryCacheSize: o2, _requestHeaders: i2, fetchCacheKeyPrefix: l2 }));
        }
        calculateRevalidate(e10, t10, r10, n2) {
          if (r10) return Math.floor(performance.timeOrigin + performance.now() - 1e3);
          let a2 = this.cacheControls.get(rm(e10)), i2 = a2 ? a2.revalidate : !n2 && 1;
          return "number" == typeof i2 ? 1e3 * i2 + t10 : i2;
        }
        _getPathname(e10, t10) {
          return t10 ? e10 : /^\/index(\/|$)/.test(e10) && !function(e11, t11 = true) {
            return (void 0 !== e11.split("/").find((e12) => rf.find((t12) => e12.startsWith(t12))) && (e11 = function(e12) {
              let t12, r10, n2;
              for (let a2 of e12.split("/")) if (r10 = rf.find((e13) => a2.startsWith(e13))) {
                [t12, n2] = e12.split(r10, 2);
                break;
              }
              if (!t12 || !r10 || !n2) throw Object.defineProperty(Error(`Invalid interception route: ${e12}. Must be in the format /<intercepting route>/(..|...|..)(..)/<intercepted route>`), "__NEXT_ERROR_CODE", { value: "E269", enumerable: false, configurable: true });
              switch (t12 = eC(t12), r10) {
                case "(.)":
                  n2 = "/" === t12 ? `/${n2}` : t12 + "/" + n2;
                  break;
                case "(..)":
                  if ("/" === t12) throw Object.defineProperty(Error(`Invalid interception route: ${e12}. Cannot use (..) marker at the root level, use (.) instead.`), "__NEXT_ERROR_CODE", { value: "E207", enumerable: false, configurable: true });
                  n2 = t12.split("/").slice(0, -1).concat(n2).join("/");
                  break;
                case "(...)":
                  n2 = "/" + n2;
                  break;
                case "(..)(..)":
                  let a2 = t12.split("/");
                  if (a2.length <= 2) throw Object.defineProperty(Error(`Invalid interception route: ${e12}. Cannot use (..)(..) marker at the root level or one level up.`), "__NEXT_ERROR_CODE", { value: "E486", enumerable: false, configurable: true });
                  n2 = a2.slice(0, -2).concat(n2).join("/");
                  break;
                default:
                  throw Object.defineProperty(Error("Invariant: unexpected marker"), "__NEXT_ERROR_CODE", { value: "E112", enumerable: false, configurable: true });
              }
              return { interceptingRoute: t12, interceptedRoute: n2 };
            }(e11).interceptedRoute), t11) ? rg.test(e11) : r_.test(e11);
          }(e10) ? `/index${e10}` : "/" === e10 ? "/index" : ex(e10);
        }
        resetRequestCache() {
          var e10, t10;
          null == (t10 = this.cacheHandler) || null == (e10 = t10.resetRequestCache) || e10.call(t10);
        }
        async lock(e10) {
          for (; ; ) {
            let t11 = this.locks.get(e10);
            if (rw.debug && console.log("IncrementalCache: lock get", e10, !!t11), !t11) break;
            await t11;
          }
          let { resolve: t10, promise: r10 } = new tD();
          return rw.debug && console.log("IncrementalCache: successfully locked", e10), this.locks.set(e10, r10), () => {
            t10(), this.locks.delete(e10);
          };
        }
        async revalidateTag(e10, t10) {
          var r10;
          return null == (r10 = this.cacheHandler) ? void 0 : r10.revalidateTag(e10, t10);
        }
        async generateSimpleCacheKey(e10) {
          return rb(JSON.stringify(["v4", this.fetchCacheKeyPrefix || "", e10]));
        }
        async generateCacheKey(e10, t10 = {}) {
          let r10 = [], n2 = new TextEncoder(), a2 = null, i2 = t10.body;
          if (i2) if ("object" == typeof i2 && "byteLength" in i2) r10.push(`bytes:${ry(i2)}`), t10._ogBody = i2;
          else if ("function" == typeof i2.getReader) {
            let e11 = [];
            try {
              await i2.pipeTo(new WritableStream({ write(t11) {
                e11.push("string" == typeof t11 ? n2.encode(t11) : t11);
              } }));
              let a3 = e11.reduce((e12, t11) => e12 + t11.length, 0), o3 = new Uint8Array(a3), s2 = 0;
              for (let t11 of e11) o3.set(t11, s2), s2 += t11.length;
              r10.push(`bytes:${ry(o3)}`), t10._ogBody = o3;
            } catch (e12) {
              console.error("Problem reading body", e12);
            }
          } else if ("function" == typeof i2.keys) for (let [e11, n3] of (a2 = "[object FormData]" === String(i2) ? "multipart/form-data; boundary=" : "application/x-www-form-urlencoded;charset=UTF-8", t10._ogBody = i2, i2.entries())) r10.push(`key:${e11}`), "string" == typeof n3 ? r10.push(`str:${n3}`) : r10.push("file", n3.name, n3.type, `bytes:${ry(await n3.arrayBuffer())}`);
          else if ("function" == typeof i2.arrayBuffer) {
            let e11 = await i2.arrayBuffer();
            r10.push("blob", i2.type, `bytes:${ry(e11)}`), t10._ogBody = new Blob([e11], { type: i2.type }), a2 = i2.type;
          } else if ("string" == typeof i2) r10.push(`str:${i2}`), t10._ogBody = i2, a2 = "text/plain;charset=UTF-8";
          else throw Object.defineProperty(Error(`Unsupported body type: ${typeof i2}`), "__NEXT_ERROR_CODE", { value: "E1443", enumerable: false, configurable: true });
          let o2 = "function" == typeof (t10.headers || {}).keys ? Object.fromEntries(t10.headers) : Object.assign({}, t10.headers);
          return "traceparent" in o2 && delete o2.traceparent, "tracestate" in o2 && delete o2.tracestate, rb(JSON.stringify(["v4", this.fetchCacheKeyPrefix || "", e10, t10.method, a2, o2, t10.mode, t10.redirect, t10.credentials, t10.referrer, t10.referrerPolicy, t10.integrity, t10.cache, r10]));
        }
        async get(e10, t10) {
          var r10, n2, a2, i2, o2, s2, l2;
          let d2, u2;
          if (t10.kind === tY.FETCH) {
            let r11 = to.getStore(), n3 = r11 ? ts(r11) : null;
            if (n3) {
              let r12 = n3.fetch.get(e10);
              if ((null == r12 ? void 0 : r12.kind) === tJ.FETCH) {
                let n4 = eA.getStore();
                if (![...t10.tags || [], ...t10.softTags || []].some((e11) => {
                  var t11, r13;
                  return (null == (t11 = this.revalidatedTags) ? void 0 : t11.includes(e11)) || (null == n4 || null == (r13 = n4.pendingRevalidatedTags) ? void 0 : r13.some((t12) => t12.tag === e11));
                })) return rw.debug && console.log("IncrementalCache: rdc:hit", e10), { isStale: false, value: r12 };
                rw.debug && console.log("IncrementalCache: rdc:revalidated-tag", e10);
              } else rw.debug && console.log("IncrementalCache: rdc:miss", e10);
            } else rw.debug && console.log("IncrementalCache: rdc:no-resume-data");
          }
          if (this.disableForTestmode || this.dev && (t10.kind !== tY.FETCH || "no-cache" === this.requestHeaders["cache-control"])) return null;
          e10 = this._getPathname(e10, t10.kind === tY.FETCH);
          let c2 = await (null == (r10 = this.cacheHandler) ? void 0 : r10.get(e10, t10));
          if (t10.kind === tY.FETCH) {
            if (!c2) return null;
            if ((null == (a2 = c2.value) ? void 0 : a2.kind) !== tJ.FETCH) throw Object.defineProperty(new td(`Expected cached value for cache key ${JSON.stringify(e10)} to be a "FETCH" kind, got ${JSON.stringify(null == (i2 = c2.value) ? void 0 : i2.kind)} instead.`), "__NEXT_ERROR_CODE", { value: "E653", enumerable: false, configurable: true });
            let r11 = eA.getStore(), n3 = [...t10.tags || [], ...t10.softTags || []];
            if (n3.some((e11) => {
              var t11, n4;
              return (null == (t11 = this.revalidatedTags) ? void 0 : t11.includes(e11)) || (null == r11 || null == (n4 = r11.pendingRevalidatedTags) ? void 0 : n4.some((t12) => t12.tag === e11));
            })) return rw.debug && console.log("IncrementalCache: expired tag", e10), null;
            let o3 = to.getStore();
            if (o3) {
              let t11 = ts(o3);
              (null == t11 ? void 0 : t11.mutable) && (rw.debug && console.log("IncrementalCache: rdc:set", e10), t11.fetch.set(e10, c2.value));
            }
            let s3 = t10.revalidate || c2.value.revalidate, l3 = (performance.timeOrigin + performance.now() - (c2.lastModified || 0)) / 1e3 > s3, d3 = c2.value.data;
            return rd(n3, c2.lastModified) ? null : (ru(n3, c2.lastModified) && (l3 = true), { isStale: l3, value: { kind: tJ.FETCH, data: d3, revalidate: s3 } });
          }
          if ((null == c2 || null == (n2 = c2.value) ? void 0 : n2.kind) === tJ.FETCH) throw Object.defineProperty(new td(`Expected cached value for cache key ${JSON.stringify(e10)} not to be a ${JSON.stringify(t10.kind)} kind, got "FETCH" instead.`), "__NEXT_ERROR_CODE", { value: "E652", enumerable: false, configurable: true });
          let p2 = null, { isFallback: h2 } = t10, f2 = this.cacheControls.get(rm(e10));
          if ((null == c2 ? void 0 : c2.lastModified) === -1) d2 = -1, u2 = -31536e6;
          else {
            let r11 = performance.timeOrigin + performance.now(), n3 = (null == c2 ? void 0 : c2.lastModified) || r11;
            u2 = this.calculateRevalidate(e10, n3, this.dev ?? false, t10.isFallback);
            let a3 = "number" == typeof (null == f2 ? void 0 : f2.expire) ? 1e3 * f2.expire + n3 : void 0;
            if (void 0 !== a3 && a3 < r11) d2 = -1;
            else if (void 0 === (d2 = false !== u2 && u2 < r11 || void 0) && ((null == c2 || null == (o2 = c2.value) ? void 0 : o2.kind) === tJ.APP_PAGE || (null == c2 || null == (s2 = c2.value) ? void 0 : s2.kind) === tJ.APP_ROUTE)) {
              let e11 = null == (l2 = c2.value.headers) ? void 0 : l2[w];
              if ("string" == typeof e11) {
                let t11 = e11.split(",");
                t11.length > 0 && (rd(t11, n3) ? d2 = -1 : ru(t11, n3) && (d2 = true));
              }
            }
          }
          return c2 && (p2 = { isStale: d2, cacheControl: f2, revalidateAfter: u2, value: c2.value, isFallback: h2 }), !c2 && this.prerenderManifest.notFoundRoutes.includes(e10) && (p2 = { isStale: d2, value: null, cacheControl: f2, revalidateAfter: u2, isFallback: h2 }, this.set(e10, p2.value, { ...t10, cacheControl: f2 })), p2;
        }
        async set(e10, t10, r10) {
          if ((null == t10 ? void 0 : t10.kind) === tJ.FETCH) {
            let r11 = to.getStore(), n3 = r11 ? ts(r11) : null;
            (null == n3 ? void 0 : n3.mutable) && (rw.debug && console.log("IncrementalCache: rdc:set", e10), n3.fetch.set(e10, t10));
          }
          if (this.disableForTestmode || this.dev && !r10.fetchCache) return;
          e10 = this._getPathname(e10, r10.fetchCache);
          let n2 = JSON.stringify(t10).length;
          if (r10.fetchCache && n2 > 2097152 && !this.hasCustomCacheHandler && !r10.isImplicitBuildTimeCache) {
            let t11 = `Failed to set Next.js data cache for ${r10.fetchUrl || e10}, items over 2MB can not be cached (${n2} bytes)`;
            if (this.dev) throw Object.defineProperty(Error(t11), "__NEXT_ERROR_CODE", { value: "E1003", enumerable: false, configurable: true });
            console.warn(t11);
            return;
          }
          try {
            var a2;
            !r10.fetchCache && r10.cacheControl && this.cacheControls.set(rm(e10), r10.cacheControl), await (null == (a2 = this.cacheHandler) ? void 0 : a2.set(e10, t10, r10));
          } catch (t11) {
            console.warn("Failed to update prerender cache for", e10, t11);
          }
        }
      }
      e.i(64445);
      var rE = e.i(40049), rx = ((ea = {})[ea.Before = 1] = "Before", ea[ea.ShellStatic = 11] = "ShellStatic", ea[ea.Static = 13] = "Static", ea[ea.ShellRuntime = 21] = "ShellRuntime", ea[ea.Runtime = 23] = "Runtime", ea[ea.Dynamic = 30] = "Dynamic", ea[ea.Abandoned = 40] = "Abandoned", ea);
      if (/* @__PURE__ */ new WeakMap(), rx.ShellRuntime, rx.Static, rx.Runtime, rE.default.unstable_postpone, false === ("Route %%% needs to bail out of prerendering at this point because it used ^^^. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error".includes("needs to bail out of prerendering at this point because it used") && "Route %%% needs to bail out of prerendering at this point because it used ^^^. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error".includes("Learn more: https://nextjs.org/docs/messages/ppr-caught-error"))) throw Object.defineProperty(Error("Invariant: isDynamicPostpone misidentified a postpone reason. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E296", enumerable: false, configurable: true });
      function rC(e10, t10, r10) {
        return "string" == typeof e10 ? e10 : e10[t10] || r10;
      }
      function rS(e10) {
        let t10 = function() {
          try {
            return "true" === process.env._next_intl_trailing_slash;
          } catch {
            return false;
          }
        }(), [r10, ...n2] = e10.split("#"), a2 = n2.join("#"), i2 = r10;
        if ("/" !== i2) {
          let e11 = i2.endsWith("/");
          t10 && !e11 ? i2 += "/" : !t10 && e11 && (i2 = i2.slice(0, -1));
        }
        return a2 && (i2 += "#" + a2), i2;
      }
      function rT(e10, t10) {
        let r10 = rS(e10), n2 = rS(t10);
        return rO(r10).test(n2);
      }
      function rR(e10, t10) {
        return "never" !== t10.mode && t10.prefixes?.[e10] || "/" + e10;
      }
      function rO(e10) {
        let t10 = e10.replace(/\/\[\[(\.\.\.[^\]]+)\]\]/g, "(?:/(.*))?").replace(/\[\[(\.\.\.[^\]]+)\]\]/g, "(?:/(.*))?").replace(/\[(\.\.\.[^\]]+)\]/g, "(.+)").replace(/\[([^\]]+)\]/g, "([^/]+)");
        return RegExp(`^${t10}$`);
      }
      function rP(e10) {
        return e10.includes("[[...");
      }
      function rN(e10) {
        return e10.includes("[...");
      }
      function rA(e10) {
        return e10.includes("[");
      }
      function rM(e10, t10) {
        let r10 = e10.split("/"), n2 = t10.split("/"), a2 = Math.max(r10.length, n2.length);
        for (let e11 = 0; e11 < a2; e11++) {
          let t11 = r10[e11], a3 = n2[e11];
          if (!t11 && a3) return -1;
          if (t11 && !a3) return 1;
          if (t11 || a3) {
            if (!rA(t11) && rA(a3)) return -1;
            if (rA(t11) && !rA(a3)) return 1;
            if (!rN(t11) && rN(a3)) return -1;
            if (rN(t11) && !rN(a3)) return 1;
            if (!rP(t11) && rP(a3)) return -1;
            if (rP(t11) && !rP(a3)) return 1;
          }
        }
        return 0;
      }
      function rL(e10, t10, r10, n2) {
        let a2 = "";
        return a2 += function(e11, t11) {
          if (!t11) return e11;
          let r11 = e11 = e11.replace(/\[\[/g, "[").replace(/\]\]/g, "]");
          return Object.entries(t11).forEach(([e12, t12]) => {
            r11 = r11.replace(`[${e12}]`, t12);
          }), r11;
        }(r10, function(e11, t11) {
          let r11 = rS(t11), n3 = rS(e11), a3 = rO(n3).exec(r11);
          if (!a3) return;
          let i2 = {}, o2 = n3.match(/\[([^\]]+)\]/g) ?? [];
          for (let e12 = 1; e12 < a3.length; e12++) {
            let t12 = o2[e12 - 1];
            if (!t12) continue;
            let r12 = t12.replace(/[[\]]/g, ""), n4 = a3[e12] ?? "";
            i2[r12] = n4;
          }
          return i2;
        }(t10, e10)), a2 = rS(a2);
      }
      function rI(e10, t10, r10) {
        e10.endsWith("/") || (e10 += "/");
        let n2 = rk(t10, r10), a2 = RegExp(`^(${n2.map(([, e11]) => e11.replaceAll("/", "\\/")).join("|")})/(.*)`, "i"), i2 = e10.match(a2), o2 = i2 ? "/" + i2[2] : e10;
        return "/" !== o2 && (o2 = rS(o2)), o2;
      }
      function rk(e10, t10, r10 = true) {
        let n2 = e10.map((e11) => [e11, rR(e11, t10)]);
        return r10 && n2.sort((e11, t11) => t11[1].length - e11[1].length), n2;
      }
      function rD(e10, t10, r10, n2) {
        let a2 = rk(t10, r10);
        for (let [t11, r11] of (n2 && a2.sort(([e11], [t12]) => {
          if (e11 === n2.defaultLocale) return -1;
          if (t12 === n2.defaultLocale) return 1;
          let r12 = n2.locales.includes(e11), a3 = n2.locales.includes(t12);
          return r12 && !a3 ? -1 : !r12 && a3 ? 1 : 0;
        }), a2)) {
          let n3, a3;
          if (e10 === r11 || e10.startsWith(r11 + "/")) n3 = a3 = true;
          else {
            let t12 = e10.toLowerCase(), i2 = r11.toLowerCase();
            (t12 === i2 || t12.startsWith(i2 + "/")) && (n3 = false, a3 = true);
          }
          if (a3) return { locale: t11, prefix: r11, matchedPrefix: e10.slice(0, r11.length), exact: n3 };
        }
      }
      function rj(e10, t10, r10) {
        var n2;
        let a2, i2 = e10;
        return t10 && (n2 = i2, a2 = t10, /^\/(\?.*)?$/.test(n2) && (n2 = n2.slice(1)), i2 = a2 += n2), r10 && (i2 += r10), i2;
      }
      function rq(e10) {
        return e10.get("x-forwarded-host") ?? e10.get("host") ?? void 0;
      }
      function rU(e10, t10) {
        return t10.defaultLocale === e10 || t10.locales.includes(e10);
      }
      function rB(e10, t10, r10) {
        let n2;
        return e10 && rU(t10, e10) && (n2 = e10), n2 || (n2 = r10.find((e11) => e11.defaultLocale === t10)), n2 || (n2 = r10.find((e11) => e11.locales.includes(t10))), n2;
      }
      RegExp("\\n\\s+at Suspense \\(<anonymous>\\)(?:(?!\\n\\s+at (?:body|div|main|section|article|aside|header|footer|nav|form|p|span|h1|h2|h3|h4|h5|h6) \\(<anonymous>\\))[\\s\\S])*?\\n\\s+at __next_root_layout_boundary__ \\([^\\n]*\\)"), RegExp("\\n\\s+at __next_metadata_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_viewport_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_outlet_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_instant_validation_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_instant_slot_(\\d+)__[\\n\\s]"), eN();
      function rG(e10, t10, r10, n2) {
        let a2 = null == n2 || "number" == typeof n2 || "boolean" == typeof n2 ? n2 : r10(n2), i2 = t10.get(a2);
        return void 0 === i2 && (i2 = e10.call(this, n2), t10.set(a2, i2)), i2;
      }
      function rH(e10, t10, r10) {
        let n2 = Array.prototype.slice.call(arguments, 3), a2 = r10(n2), i2 = t10.get(a2);
        return void 0 === i2 && (i2 = e10.apply(this, n2), t10.set(a2, i2)), i2;
      }
      var r$ = class {
        constructor() {
          this.cache = /* @__PURE__ */ Object.create(null);
        }
        get(e10) {
          return this.cache[e10];
        }
        set(e10, t10) {
          this.cache[e10] = t10;
        }
      };
      let rV = { "written-new": [{ paradigmLocales: { _locales: "en en_GB es es_419 pt_BR pt_PT" } }, { $enUS: { _value: "AS+CA+GU+MH+MP+PH+PR+UM+US+VI" } }, { $cnsar: { _value: "HK+MO" } }, { $americas: { _value: "019" } }, { $maghreb: { _value: "MA+DZ+TN+LY+MR+EH" } }, { no: { _desired: "nb", _distance: "1" } }, { bs: { _desired: "hr", _distance: "4" } }, { bs: { _desired: "sh", _distance: "4" } }, { hr: { _desired: "sh", _distance: "4" } }, { sr: { _desired: "sh", _distance: "4" } }, { aa: { _desired: "ssy", _distance: "4" } }, { de: { _desired: "gsw", _distance: "4", _oneway: "true" } }, { de: { _desired: "lb", _distance: "4", _oneway: "true" } }, { no: { _desired: "da", _distance: "8" } }, { nb: { _desired: "da", _distance: "8" } }, { ru: { _desired: "ab", _distance: "30", _oneway: "true" } }, { en: { _desired: "ach", _distance: "30", _oneway: "true" } }, { nl: { _desired: "af", _distance: "20", _oneway: "true" } }, { en: { _desired: "ak", _distance: "30", _oneway: "true" } }, { en: { _desired: "am", _distance: "30", _oneway: "true" } }, { es: { _desired: "ay", _distance: "20", _oneway: "true" } }, { ru: { _desired: "az", _distance: "30", _oneway: "true" } }, { ur: { _desired: "bal", _distance: "20", _oneway: "true" } }, { ru: { _desired: "be", _distance: "20", _oneway: "true" } }, { en: { _desired: "bem", _distance: "30", _oneway: "true" } }, { hi: { _desired: "bh", _distance: "30", _oneway: "true" } }, { en: { _desired: "bn", _distance: "30", _oneway: "true" } }, { zh: { _desired: "bo", _distance: "20", _oneway: "true" } }, { fr: { _desired: "br", _distance: "20", _oneway: "true" } }, { es: { _desired: "ca", _distance: "20", _oneway: "true" } }, { fil: { _desired: "ceb", _distance: "30", _oneway: "true" } }, { en: { _desired: "chr", _distance: "20", _oneway: "true" } }, { ar: { _desired: "ckb", _distance: "30", _oneway: "true" } }, { fr: { _desired: "co", _distance: "20", _oneway: "true" } }, { fr: { _desired: "crs", _distance: "20", _oneway: "true" } }, { sk: { _desired: "cs", _distance: "20" } }, { en: { _desired: "cy", _distance: "20", _oneway: "true" } }, { en: { _desired: "ee", _distance: "30", _oneway: "true" } }, { en: { _desired: "eo", _distance: "30", _oneway: "true" } }, { es: { _desired: "eu", _distance: "20", _oneway: "true" } }, { da: { _desired: "fo", _distance: "20", _oneway: "true" } }, { nl: { _desired: "fy", _distance: "20", _oneway: "true" } }, { en: { _desired: "ga", _distance: "20", _oneway: "true" } }, { en: { _desired: "gaa", _distance: "30", _oneway: "true" } }, { en: { _desired: "gd", _distance: "20", _oneway: "true" } }, { es: { _desired: "gl", _distance: "20", _oneway: "true" } }, { es: { _desired: "gn", _distance: "20", _oneway: "true" } }, { hi: { _desired: "gu", _distance: "30", _oneway: "true" } }, { en: { _desired: "ha", _distance: "30", _oneway: "true" } }, { en: { _desired: "haw", _distance: "20", _oneway: "true" } }, { fr: { _desired: "ht", _distance: "20", _oneway: "true" } }, { ru: { _desired: "hy", _distance: "30", _oneway: "true" } }, { en: { _desired: "ia", _distance: "30", _oneway: "true" } }, { en: { _desired: "ig", _distance: "30", _oneway: "true" } }, { en: { _desired: "is", _distance: "20", _oneway: "true" } }, { id: { _desired: "jv", _distance: "20", _oneway: "true" } }, { en: { _desired: "ka", _distance: "30", _oneway: "true" } }, { fr: { _desired: "kg", _distance: "30", _oneway: "true" } }, { ru: { _desired: "kk", _distance: "30", _oneway: "true" } }, { en: { _desired: "km", _distance: "30", _oneway: "true" } }, { en: { _desired: "kn", _distance: "30", _oneway: "true" } }, { en: { _desired: "kri", _distance: "30", _oneway: "true" } }, { tr: { _desired: "ku", _distance: "30", _oneway: "true" } }, { ru: { _desired: "ky", _distance: "30", _oneway: "true" } }, { it: { _desired: "la", _distance: "20", _oneway: "true" } }, { en: { _desired: "lg", _distance: "30", _oneway: "true" } }, { fr: { _desired: "ln", _distance: "30", _oneway: "true" } }, { en: { _desired: "lo", _distance: "30", _oneway: "true" } }, { en: { _desired: "loz", _distance: "30", _oneway: "true" } }, { fr: { _desired: "lua", _distance: "30", _oneway: "true" } }, { hi: { _desired: "mai", _distance: "20", _oneway: "true" } }, { en: { _desired: "mfe", _distance: "30", _oneway: "true" } }, { fr: { _desired: "mg", _distance: "30", _oneway: "true" } }, { en: { _desired: "mi", _distance: "20", _oneway: "true" } }, { en: { _desired: "ml", _distance: "30", _oneway: "true" } }, { ru: { _desired: "mn", _distance: "30", _oneway: "true" } }, { hi: { _desired: "mr", _distance: "30", _oneway: "true" } }, { id: { _desired: "ms", _distance: "30", _oneway: "true" } }, { en: { _desired: "mt", _distance: "30", _oneway: "true" } }, { en: { _desired: "my", _distance: "30", _oneway: "true" } }, { en: { _desired: "ne", _distance: "30", _oneway: "true" } }, { nb: { _desired: "nn", _distance: "20" } }, { no: { _desired: "nn", _distance: "20" } }, { en: { _desired: "nso", _distance: "30", _oneway: "true" } }, { en: { _desired: "ny", _distance: "30", _oneway: "true" } }, { en: { _desired: "nyn", _distance: "30", _oneway: "true" } }, { fr: { _desired: "oc", _distance: "20", _oneway: "true" } }, { en: { _desired: "om", _distance: "30", _oneway: "true" } }, { en: { _desired: "or", _distance: "30", _oneway: "true" } }, { en: { _desired: "pa", _distance: "30", _oneway: "true" } }, { en: { _desired: "pcm", _distance: "20", _oneway: "true" } }, { en: { _desired: "ps", _distance: "30", _oneway: "true" } }, { es: { _desired: "qu", _distance: "30", _oneway: "true" } }, { de: { _desired: "rm", _distance: "20", _oneway: "true" } }, { en: { _desired: "rn", _distance: "30", _oneway: "true" } }, { fr: { _desired: "rw", _distance: "30", _oneway: "true" } }, { hi: { _desired: "sa", _distance: "30", _oneway: "true" } }, { en: { _desired: "sd", _distance: "30", _oneway: "true" } }, { en: { _desired: "si", _distance: "30", _oneway: "true" } }, { en: { _desired: "sn", _distance: "30", _oneway: "true" } }, { en: { _desired: "so", _distance: "30", _oneway: "true" } }, { en: { _desired: "sq", _distance: "30", _oneway: "true" } }, { en: { _desired: "st", _distance: "30", _oneway: "true" } }, { id: { _desired: "su", _distance: "20", _oneway: "true" } }, { en: { _desired: "sw", _distance: "30", _oneway: "true" } }, { en: { _desired: "ta", _distance: "30", _oneway: "true" } }, { en: { _desired: "te", _distance: "30", _oneway: "true" } }, { ru: { _desired: "tg", _distance: "30", _oneway: "true" } }, { en: { _desired: "ti", _distance: "30", _oneway: "true" } }, { ru: { _desired: "tk", _distance: "30", _oneway: "true" } }, { en: { _desired: "tlh", _distance: "30", _oneway: "true" } }, { en: { _desired: "tn", _distance: "30", _oneway: "true" } }, { en: { _desired: "to", _distance: "30", _oneway: "true" } }, { ru: { _desired: "tt", _distance: "30", _oneway: "true" } }, { en: { _desired: "tum", _distance: "30", _oneway: "true" } }, { zh: { _desired: "ug", _distance: "20", _oneway: "true" } }, { ru: { _desired: "uk", _distance: "20", _oneway: "true" } }, { en: { _desired: "ur", _distance: "30", _oneway: "true" } }, { ru: { _desired: "uz", _distance: "30", _oneway: "true" } }, { fr: { _desired: "wo", _distance: "30", _oneway: "true" } }, { en: { _desired: "xh", _distance: "30", _oneway: "true" } }, { en: { _desired: "yi", _distance: "30", _oneway: "true" } }, { en: { _desired: "yo", _distance: "30", _oneway: "true" } }, { zh: { _desired: "za", _distance: "20", _oneway: "true" } }, { en: { _desired: "zu", _distance: "30", _oneway: "true" } }, { ar: { _desired: "aao", _distance: "10", _oneway: "true" } }, { ar: { _desired: "abh", _distance: "10", _oneway: "true" } }, { ar: { _desired: "abv", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acm", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acq", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acw", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acx", _distance: "10", _oneway: "true" } }, { ar: { _desired: "acy", _distance: "10", _oneway: "true" } }, { ar: { _desired: "adf", _distance: "10", _oneway: "true" } }, { ar: { _desired: "aeb", _distance: "10", _oneway: "true" } }, { ar: { _desired: "aec", _distance: "10", _oneway: "true" } }, { ar: { _desired: "afb", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ajp", _distance: "10", _oneway: "true" } }, { ar: { _desired: "apc", _distance: "10", _oneway: "true" } }, { ar: { _desired: "apd", _distance: "10", _oneway: "true" } }, { ar: { _desired: "arq", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ars", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ary", _distance: "10", _oneway: "true" } }, { ar: { _desired: "arz", _distance: "10", _oneway: "true" } }, { ar: { _desired: "auz", _distance: "10", _oneway: "true" } }, { ar: { _desired: "avl", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ayh", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ayl", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ayn", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ayp", _distance: "10", _oneway: "true" } }, { ar: { _desired: "bbz", _distance: "10", _oneway: "true" } }, { ar: { _desired: "pga", _distance: "10", _oneway: "true" } }, { ar: { _desired: "shu", _distance: "10", _oneway: "true" } }, { ar: { _desired: "ssh", _distance: "10", _oneway: "true" } }, { az: { _desired: "azb", _distance: "10", _oneway: "true" } }, { et: { _desired: "vro", _distance: "10", _oneway: "true" } }, { ff: { _desired: "ffm", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fub", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fue", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fuf", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fuh", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fui", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fuq", _distance: "10", _oneway: "true" } }, { ff: { _desired: "fuv", _distance: "10", _oneway: "true" } }, { gn: { _desired: "gnw", _distance: "10", _oneway: "true" } }, { gn: { _desired: "gui", _distance: "10", _oneway: "true" } }, { gn: { _desired: "gun", _distance: "10", _oneway: "true" } }, { gn: { _desired: "nhd", _distance: "10", _oneway: "true" } }, { iu: { _desired: "ikt", _distance: "10", _oneway: "true" } }, { kln: { _desired: "enb", _distance: "10", _oneway: "true" } }, { kln: { _desired: "eyo", _distance: "10", _oneway: "true" } }, { kln: { _desired: "niq", _distance: "10", _oneway: "true" } }, { kln: { _desired: "oki", _distance: "10", _oneway: "true" } }, { kln: { _desired: "pko", _distance: "10", _oneway: "true" } }, { kln: { _desired: "sgc", _distance: "10", _oneway: "true" } }, { kln: { _desired: "tec", _distance: "10", _oneway: "true" } }, { kln: { _desired: "tuy", _distance: "10", _oneway: "true" } }, { kok: { _desired: "gom", _distance: "10", _oneway: "true" } }, { kpe: { _desired: "gkp", _distance: "10", _oneway: "true" } }, { luy: { _desired: "ida", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lkb", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lko", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lks", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lri", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lrm", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lsm", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lto", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lts", _distance: "10", _oneway: "true" } }, { luy: { _desired: "lwg", _distance: "10", _oneway: "true" } }, { luy: { _desired: "nle", _distance: "10", _oneway: "true" } }, { luy: { _desired: "nyd", _distance: "10", _oneway: "true" } }, { luy: { _desired: "rag", _distance: "10", _oneway: "true" } }, { lv: { _desired: "ltg", _distance: "10", _oneway: "true" } }, { mg: { _desired: "bhr", _distance: "10", _oneway: "true" } }, { mg: { _desired: "bjq", _distance: "10", _oneway: "true" } }, { mg: { _desired: "bmm", _distance: "10", _oneway: "true" } }, { mg: { _desired: "bzc", _distance: "10", _oneway: "true" } }, { mg: { _desired: "msh", _distance: "10", _oneway: "true" } }, { mg: { _desired: "skg", _distance: "10", _oneway: "true" } }, { mg: { _desired: "tdx", _distance: "10", _oneway: "true" } }, { mg: { _desired: "tkg", _distance: "10", _oneway: "true" } }, { mg: { _desired: "txy", _distance: "10", _oneway: "true" } }, { mg: { _desired: "xmv", _distance: "10", _oneway: "true" } }, { mg: { _desired: "xmw", _distance: "10", _oneway: "true" } }, { mn: { _desired: "mvf", _distance: "10", _oneway: "true" } }, { ms: { _desired: "bjn", _distance: "10", _oneway: "true" } }, { ms: { _desired: "btj", _distance: "10", _oneway: "true" } }, { ms: { _desired: "bve", _distance: "10", _oneway: "true" } }, { ms: { _desired: "bvu", _distance: "10", _oneway: "true" } }, { ms: { _desired: "coa", _distance: "10", _oneway: "true" } }, { ms: { _desired: "dup", _distance: "10", _oneway: "true" } }, { ms: { _desired: "hji", _distance: "10", _oneway: "true" } }, { ms: { _desired: "id", _distance: "10", _oneway: "true" } }, { ms: { _desired: "jak", _distance: "10", _oneway: "true" } }, { ms: { _desired: "jax", _distance: "10", _oneway: "true" } }, { ms: { _desired: "kvb", _distance: "10", _oneway: "true" } }, { ms: { _desired: "kvr", _distance: "10", _oneway: "true" } }, { ms: { _desired: "kxd", _distance: "10", _oneway: "true" } }, { ms: { _desired: "lce", _distance: "10", _oneway: "true" } }, { ms: { _desired: "lcf", _distance: "10", _oneway: "true" } }, { ms: { _desired: "liw", _distance: "10", _oneway: "true" } }, { ms: { _desired: "max", _distance: "10", _oneway: "true" } }, { ms: { _desired: "meo", _distance: "10", _oneway: "true" } }, { ms: { _desired: "mfa", _distance: "10", _oneway: "true" } }, { ms: { _desired: "mfb", _distance: "10", _oneway: "true" } }, { ms: { _desired: "min", _distance: "10", _oneway: "true" } }, { ms: { _desired: "mqg", _distance: "10", _oneway: "true" } }, { ms: { _desired: "msi", _distance: "10", _oneway: "true" } }, { ms: { _desired: "mui", _distance: "10", _oneway: "true" } }, { ms: { _desired: "orn", _distance: "10", _oneway: "true" } }, { ms: { _desired: "ors", _distance: "10", _oneway: "true" } }, { ms: { _desired: "pel", _distance: "10", _oneway: "true" } }, { ms: { _desired: "pse", _distance: "10", _oneway: "true" } }, { ms: { _desired: "tmw", _distance: "10", _oneway: "true" } }, { ms: { _desired: "urk", _distance: "10", _oneway: "true" } }, { ms: { _desired: "vkk", _distance: "10", _oneway: "true" } }, { ms: { _desired: "vkt", _distance: "10", _oneway: "true" } }, { ms: { _desired: "xmm", _distance: "10", _oneway: "true" } }, { ms: { _desired: "zlm", _distance: "10", _oneway: "true" } }, { ms: { _desired: "zmi", _distance: "10", _oneway: "true" } }, { ne: { _desired: "dty", _distance: "10", _oneway: "true" } }, { om: { _desired: "gax", _distance: "10", _oneway: "true" } }, { om: { _desired: "hae", _distance: "10", _oneway: "true" } }, { om: { _desired: "orc", _distance: "10", _oneway: "true" } }, { or: { _desired: "spv", _distance: "10", _oneway: "true" } }, { ps: { _desired: "pbt", _distance: "10", _oneway: "true" } }, { ps: { _desired: "pst", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qub", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qud", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quf", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qug", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quh", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quk", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qul", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qup", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qur", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qus", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quw", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qux", _distance: "10", _oneway: "true" } }, { qu: { _desired: "quy", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qva", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvc", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qve", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvh", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvi", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvj", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvl", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvm", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvn", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvo", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvp", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvs", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvw", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qvz", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qwa", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qwc", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qwh", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qws", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxa", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxc", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxh", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxl", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxn", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxo", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxp", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxr", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxt", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxu", _distance: "10", _oneway: "true" } }, { qu: { _desired: "qxw", _distance: "10", _oneway: "true" } }, { sc: { _desired: "sdc", _distance: "10", _oneway: "true" } }, { sc: { _desired: "sdn", _distance: "10", _oneway: "true" } }, { sc: { _desired: "sro", _distance: "10", _oneway: "true" } }, { sq: { _desired: "aae", _distance: "10", _oneway: "true" } }, { sq: { _desired: "aat", _distance: "10", _oneway: "true" } }, { sq: { _desired: "aln", _distance: "10", _oneway: "true" } }, { syr: { _desired: "aii", _distance: "10", _oneway: "true" } }, { uz: { _desired: "uzs", _distance: "10", _oneway: "true" } }, { yi: { _desired: "yih", _distance: "10", _oneway: "true" } }, { zh: { _desired: "cdo", _distance: "10", _oneway: "true" } }, { zh: { _desired: "cjy", _distance: "10", _oneway: "true" } }, { zh: { _desired: "cpx", _distance: "10", _oneway: "true" } }, { zh: { _desired: "czh", _distance: "10", _oneway: "true" } }, { zh: { _desired: "czo", _distance: "10", _oneway: "true" } }, { zh: { _desired: "gan", _distance: "10", _oneway: "true" } }, { zh: { _desired: "hak", _distance: "10", _oneway: "true" } }, { zh: { _desired: "hsn", _distance: "10", _oneway: "true" } }, { zh: { _desired: "lzh", _distance: "10", _oneway: "true" } }, { zh: { _desired: "mnp", _distance: "10", _oneway: "true" } }, { zh: { _desired: "nan", _distance: "10", _oneway: "true" } }, { zh: { _desired: "wuu", _distance: "10", _oneway: "true" } }, { zh: { _desired: "yue", _distance: "10", _oneway: "true" } }, { "*": { _desired: "*", _distance: "80" } }, { "en-Latn": { _desired: "am-Ethi", _distance: "10", _oneway: "true" } }, { "ru-Cyrl": { _desired: "az-Latn", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "bn-Beng", _distance: "10", _oneway: "true" } }, { "zh-Hans": { _desired: "bo-Tibt", _distance: "10", _oneway: "true" } }, { "ru-Cyrl": { _desired: "hy-Armn", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ka-Geor", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "km-Khmr", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "kn-Knda", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "lo-Laoo", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ml-Mlym", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "my-Mymr", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ne-Deva", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "or-Orya", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "pa-Guru", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ps-Arab", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "sd-Arab", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "si-Sinh", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ta-Taml", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "te-Telu", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ti-Ethi", _distance: "10", _oneway: "true" } }, { "ru-Cyrl": { _desired: "tk-Latn", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "ur-Arab", _distance: "10", _oneway: "true" } }, { "ru-Cyrl": { _desired: "uz-Latn", _distance: "10", _oneway: "true" } }, { "en-Latn": { _desired: "yi-Hebr", _distance: "10", _oneway: "true" } }, { "sr-Cyrl": { _desired: "sr-Latn", _distance: "5" } }, { "zh-Hans": { _desired: "za-Latn", _distance: "10", _oneway: "true" } }, { "zh-Hans": { _desired: "zh-Hani", _distance: "20", _oneway: "true" } }, { "zh-Hant": { _desired: "zh-Hani", _distance: "20", _oneway: "true" } }, { "ar-Arab": { _desired: "ar-Latn", _distance: "20", _oneway: "true" } }, { "bn-Beng": { _desired: "bn-Latn", _distance: "20", _oneway: "true" } }, { "gu-Gujr": { _desired: "gu-Latn", _distance: "20", _oneway: "true" } }, { "hi-Deva": { _desired: "hi-Latn", _distance: "20", _oneway: "true" } }, { "kn-Knda": { _desired: "kn-Latn", _distance: "20", _oneway: "true" } }, { "ml-Mlym": { _desired: "ml-Latn", _distance: "20", _oneway: "true" } }, { "mr-Deva": { _desired: "mr-Latn", _distance: "20", _oneway: "true" } }, { "ta-Taml": { _desired: "ta-Latn", _distance: "20", _oneway: "true" } }, { "te-Telu": { _desired: "te-Latn", _distance: "20", _oneway: "true" } }, { "zh-Hans": { _desired: "zh-Latn", _distance: "20", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Latn", _distance: "5", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Hani", _distance: "5", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Hira", _distance: "5", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Kana", _distance: "5", _oneway: "true" } }, { "ja-Jpan": { _desired: "ja-Hrkt", _distance: "5", _oneway: "true" } }, { "ja-Hrkt": { _desired: "ja-Hira", _distance: "5", _oneway: "true" } }, { "ja-Hrkt": { _desired: "ja-Kana", _distance: "5", _oneway: "true" } }, { "ko-Kore": { _desired: "ko-Hani", _distance: "5", _oneway: "true" } }, { "ko-Kore": { _desired: "ko-Hang", _distance: "5", _oneway: "true" } }, { "ko-Kore": { _desired: "ko-Jamo", _distance: "5", _oneway: "true" } }, { "ko-Hang": { _desired: "ko-Jamo", _distance: "5", _oneway: "true" } }, { "*-*": { _desired: "*-*", _distance: "50" } }, { "ar-*-$maghreb": { _desired: "ar-*-$maghreb", _distance: "4" } }, { "ar-*-$!maghreb": { _desired: "ar-*-$!maghreb", _distance: "4" } }, { "ar-*-*": { _desired: "ar-*-*", _distance: "5" } }, { "en-*-$enUS": { _desired: "en-*-$enUS", _distance: "4" } }, { "en-*-GB": { _desired: "en-*-$!enUS", _distance: "3" } }, { "en-*-$!enUS": { _desired: "en-*-$!enUS", _distance: "4" } }, { "en-*-*": { _desired: "en-*-*", _distance: "5" } }, { "es-*-$americas": { _desired: "es-*-$americas", _distance: "4" } }, { "es-*-$!americas": { _desired: "es-*-$!americas", _distance: "4" } }, { "es-*-*": { _desired: "es-*-*", _distance: "5" } }, { "pt-*-$americas": { _desired: "pt-*-$americas", _distance: "4" } }, { "pt-*-$!americas": { _desired: "pt-*-$!americas", _distance: "4" } }, { "pt-*-*": { _desired: "pt-*-*", _distance: "5" } }, { "zh-Hant-$cnsar": { _desired: "zh-Hant-$cnsar", _distance: "4" } }, { "zh-Hant-$!cnsar": { _desired: "zh-Hant-$!cnsar", _distance: "4" } }, { "zh-Hant-*": { _desired: "zh-Hant-*", _distance: "5" } }, { "*-*-*": { _desired: "*-*-*", _distance: "4" } }] }, rF = { "001": ["001", "001-status-grouping", "002", "005", "009", "011", "013", "014", "015", "017", "018", "019", "021", "029", "030", "034", "035", "039", "053", "054", "057", "061", "142", "143", "145", "150", "151", "154", "155", "AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CP", "CQ", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DG", "DJ", "DK", "DM", "DO", "DZ", "EA", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "EU", "EZ", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "IC", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "QO", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TA", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "UN", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW"], "002": ["002", "002-status-grouping", "011", "014", "015", "017", "018", "202", "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "CV", "DJ", "DZ", "EA", "EG", "EH", "ER", "ET", "GA", "GH", "GM", "GN", "GQ", "GW", "IC", "IO", "KE", "KM", "LR", "LS", "LY", "MA", "MG", "ML", "MR", "MU", "MW", "MZ", "NA", "NE", "NG", "RE", "RW", "SC", "SD", "SH", "SL", "SN", "SO", "SS", "ST", "SZ", "TD", "TF", "TG", "TN", "TZ", "UG", "YT", "ZA", "ZM", "ZW"], "003": ["003", "013", "021", "029", "AG", "AI", "AW", "BB", "BL", "BM", "BQ", "BS", "BZ", "CA", "CR", "CU", "CW", "DM", "DO", "GD", "GL", "GP", "GT", "HN", "HT", "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "MX", "NI", "PA", "PM", "PR", "SV", "SX", "TC", "TT", "US", "VC", "VG", "VI"], "005": ["005", "AR", "BO", "BR", "BV", "CL", "CO", "EC", "FK", "GF", "GS", "GY", "PE", "PY", "SR", "UY", "VE"], "009": ["009", "053", "054", "057", "061", "AC", "AQ", "AS", "AU", "CC", "CK", "CP", "CX", "DG", "FJ", "FM", "GU", "HM", "KI", "MH", "MP", "NC", "NF", "NR", "NU", "NZ", "PF", "PG", "PN", "PW", "QO", "SB", "TA", "TK", "TO", "TV", "UM", "VU", "WF", "WS"], "011": ["011", "BF", "BJ", "CI", "CV", "GH", "GM", "GN", "GW", "LR", "ML", "MR", "NE", "NG", "SH", "SL", "SN", "TG"], "013": ["013", "BZ", "CR", "GT", "HN", "MX", "NI", "PA", "SV"], "014": ["014", "BI", "DJ", "ER", "ET", "IO", "KE", "KM", "MG", "MU", "MW", "MZ", "RE", "RW", "SC", "SO", "SS", "TF", "TZ", "UG", "YT", "ZM", "ZW"], "015": ["015", "DZ", "EA", "EG", "EH", "IC", "LY", "MA", "SD", "TN"], "017": ["017", "AO", "CD", "CF", "CG", "CM", "GA", "GQ", "ST", "TD"], "018": ["018", "BW", "LS", "NA", "SZ", "ZA"], "019": ["003", "005", "013", "019", "019-status-grouping", "021", "029", "419", "AG", "AI", "AR", "AW", "BB", "BL", "BM", "BO", "BQ", "BR", "BS", "BV", "BZ", "CA", "CL", "CO", "CR", "CU", "CW", "DM", "DO", "EC", "FK", "GD", "GF", "GL", "GP", "GS", "GT", "GY", "HN", "HT", "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "MX", "NI", "PA", "PE", "PM", "PR", "PY", "SR", "SV", "SX", "TC", "TT", "US", "UY", "VC", "VE", "VG", "VI"], "021": ["021", "BM", "CA", "GL", "PM", "US"], "029": ["029", "AG", "AI", "AW", "BB", "BL", "BQ", "BS", "CU", "CW", "DM", "DO", "GD", "GP", "HT", "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "PR", "SX", "TC", "TT", "VC", "VG", "VI"], "030": ["030", "CN", "HK", "JP", "KP", "KR", "MN", "MO", "TW"], "034": ["034", "AF", "BD", "BT", "IN", "IR", "LK", "MV", "NP", "PK"], "035": ["035", "BN", "ID", "KH", "LA", "MM", "MY", "PH", "SG", "TH", "TL", "VN"], "039": ["039", "AD", "AL", "BA", "ES", "GI", "GR", "HR", "IT", "ME", "MK", "MT", "PT", "RS", "SI", "SM", "VA", "XK"], "053": ["053", "AU", "CC", "CX", "HM", "NF", "NZ"], "054": ["054", "FJ", "NC", "PG", "SB", "VU"], "057": ["057", "FM", "GU", "KI", "MH", "MP", "NR", "PW", "UM"], "061": ["061", "AS", "CK", "NU", "PF", "PN", "TK", "TO", "TV", "WF", "WS"], 142: ["030", "034", "035", "142", "143", "145", "AE", "AF", "AM", "AZ", "BD", "BH", "BN", "BT", "CN", "CY", "GE", "HK", "ID", "IL", "IN", "IQ", "IR", "JO", "JP", "KG", "KH", "KP", "KR", "KW", "KZ", "LA", "LB", "LK", "MM", "MN", "MO", "MV", "MY", "NP", "OM", "PH", "PK", "PS", "QA", "SA", "SG", "SY", "TH", "TJ", "TL", "TM", "TR", "TW", "UZ", "VN", "YE"], 143: ["143", "KG", "KZ", "TJ", "TM", "UZ"], 145: ["145", "AE", "AM", "AZ", "BH", "CY", "GE", "IL", "IQ", "JO", "KW", "LB", "OM", "PS", "QA", "SA", "SY", "TR", "YE"], 150: ["039", "150", "151", "154", "155", "AD", "AL", "AT", "AX", "BA", "BE", "BG", "BY", "CH", "CQ", "CZ", "DE", "DK", "EE", "ES", "FI", "FO", "FR", "GB", "GG", "GI", "GR", "HR", "HU", "IE", "IM", "IS", "IT", "JE", "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI", "SJ", "SK", "SM", "UA", "VA", "XK"], 151: ["151", "BG", "BY", "CZ", "HU", "MD", "PL", "RO", "RU", "SK", "UA"], 154: ["154", "AX", "CQ", "DK", "EE", "FI", "FO", "GB", "GG", "IE", "IM", "IS", "JE", "LT", "LV", "NO", "SE", "SJ"], 155: ["155", "AT", "BE", "CH", "DE", "FR", "LI", "LU", "MC", "NL"], 202: ["011", "014", "017", "018", "202", "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "CV", "DJ", "ER", "ET", "GA", "GH", "GM", "GN", "GQ", "GW", "IO", "KE", "KM", "LR", "LS", "MG", "ML", "MR", "MU", "MW", "MZ", "NA", "NE", "NG", "RE", "RW", "SC", "SH", "SL", "SN", "SO", "SS", "ST", "SZ", "TD", "TF", "TG", "TZ", "UG", "YT", "ZA", "ZM", "ZW"], 419: ["005", "013", "029", "419", "AG", "AI", "AR", "AW", "BB", "BL", "BO", "BQ", "BR", "BS", "BV", "BZ", "CL", "CO", "CR", "CU", "CW", "DM", "DO", "EC", "FK", "GD", "GF", "GP", "GS", "GT", "GY", "HN", "HT", "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "MX", "NI", "PA", "PE", "PR", "PY", "SR", "SV", "SX", "TC", "TT", "UY", "VC", "VE", "VG", "VI"], EU: ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "EU", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"], EZ: ["AT", "BE", "CY", "DE", "EE", "ES", "EZ", "FI", "FR", "GR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"], QO: ["AC", "AQ", "CP", "DG", "QO", "TA"], UN: ["AD", "AE", "AF", "AG", "AL", "AM", "AO", "AR", "AT", "AU", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BN", "BO", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CD", "CF", "CG", "CH", "CI", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET", "FI", "FJ", "FM", "FR", "GA", "GB", "GD", "GE", "GH", "GM", "GN", "GQ", "GR", "GT", "GW", "GY", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IN", "IQ", "IR", "IS", "IT", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MR", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NE", "NG", "NI", "NL", "NO", "NP", "NR", "NZ", "OM", "PA", "PE", "PG", "PH", "PK", "PL", "PT", "PW", "PY", "QA", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SI", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SY", "SZ", "TD", "TG", "TH", "TJ", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TZ", "UA", "UG", "UN", "US", "UY", "UZ", "VC", "VE", "VN", "VU", "WS", "YE", "ZA", "ZM", "ZW"] }, rz = /-u(?:-[0-9a-z]{2,8})+/gi;
      function rK(e10, t10, r10 = Error) {
        if (!e10) throw new r10(t10);
      }
      function rW(e10, t10, r10) {
        let [n2, a2, i2] = t10.split("-"), o2 = true;
        if (i2 && "$" === i2[0]) {
          let t11 = "!" !== i2[1], n3 = (t11 ? r10[i2.slice(1)] : r10[i2.slice(2)]).map((e11) => rF[e11] || [e11]).reduce((e11, t12) => [...e11, ...t12], []);
          o2 &&= n3.indexOf(e10.region || "") > -1 == t11;
        } else o2 &&= !e10.region || "*" === i2 || i2 === e10.region;
        return o2 &&= !e10.script || "*" === a2 || a2 === e10.script, o2 &&= !e10.language || "*" === n2 || n2 === e10.language;
      }
      function rX(e10) {
        return [e10.language, e10.script, e10.region].filter(Boolean).join("-");
      }
      function rZ(e10, t10, r10) {
        for (let n2 of r10.matches) {
          let a2 = rW(e10, n2.desired, r10.matchVariables) && rW(t10, n2.supported, r10.matchVariables);
          if (n2.oneway || a2 || (a2 = rW(e10, n2.supported, r10.matchVariables) && rW(t10, n2.desired, r10.matchVariables)), a2) {
            let a3 = 10 * n2.distance;
            if (r10.paradigmLocales.indexOf(rX(e10)) > -1 != r10.paradigmLocales.indexOf(rX(t10)) > -1) return a3 - 1;
            return a3;
          }
        }
        throw Error("No matching distance found");
      }
      let rJ = (ei = function(e10, t10) {
        let r10 = new Intl.Locale(e10).maximize(), a2 = new Intl.Locale(t10).maximize(), i2 = { language: r10.language, script: r10.script || "", region: r10.region || "" }, o2 = { language: a2.language, script: a2.script || "", region: a2.region || "" }, s2 = 0, l2 = function() {
          if (!n) {
            let e11 = rV["written-new"][0]?.paradigmLocales?._locales.split(" "), t11 = rV["written-new"].slice(1, 5);
            n = { matches: rV["written-new"].slice(5).map((e12) => {
              let t12 = Object.keys(e12)[0], r11 = e12[t12];
              return { supported: t12, desired: r11._desired, distance: +r11._distance, oneway: "true" === r11.oneway };
            }, {}), matchVariables: t11.reduce((e12, t12) => {
              let r11 = Object.keys(t12)[0], n2 = t12[r11];
              return e12[r11.slice(1)] = n2._value.split("+"), e12;
            }, {}), paradigmLocales: [...e11, ...e11.map((e12) => new Intl.Locale(e12.replace(/_/g, "-")).maximize().toString())] };
          }
          return n;
        }();
        return i2.language !== o2.language && (s2 += rZ({ language: r10.language, script: "", region: "" }, { language: a2.language, script: "", region: "" }, l2)), i2.script !== o2.script && (s2 += rZ({ language: r10.language, script: i2.script, region: "" }, { language: a2.language, script: o2.script, region: "" }, l2)), i2.region !== o2.region && (s2 += rZ(i2, o2, l2)), s2;
      }, i = (eo = { serializer: (e10) => `${e10[0]}|${e10[1]}` }).cache ? eo.cache : { create: function() {
        return new r$();
      } }, o = eo && eo.serializer ? eo.serializer : function() {
        return JSON.stringify(arguments);
      }, (eo && eo.strategy ? eo.strategy : function(e10, t10) {
        var r10, n2;
        let a2 = 1 === e10.length ? rG : rH;
        return r10 = t10.cache.create(), n2 = t10.serializer, a2.bind(this, e10, r10, n2);
      })(ei, { cache: i, serializer: o })), rY = /* @__PURE__ */ new WeakMap();
      function rQ(e10) {
        return Intl.getCanonicalLocales(e10)[0];
      }
      let r0 = /* @__PURE__ */ new WeakMap();
      var r1 = e.i(29300);
      function r2(e10, t10, r10) {
        let n2, a2 = new r1.default({ headers: { "accept-language": e10.get("accept-language") || void 0 } }).languages();
        try {
          var i2;
          let e11 = t10.slice().sort((e12, t11) => t11.length - e12.length);
          i2 = function(e12, t11, r11, n3, a3, i3) {
            let o2, s2;
            if ("lookup" === r11.localeMatcher) o2 = function(e13, t12, r12) {
              let n4 = { locale: "" };
              for (let r13 of t12) {
                let t13 = r13.replace(rz, ""), a4 = function(e14, t14) {
                  let r14 = r0.get(e14);
                  r14 || (r14 = new Set(e14), r0.set(e14, r14));
                  let n5 = t14;
                  for (; ; ) {
                    if (r14.has(n5)) return n5;
                    let e15 = n5.lastIndexOf("-");
                    if (!~e15) return;
                    e15 >= 2 && "-" === n5[e15 - 2] && (e15 -= 2), n5 = n5.slice(0, e15);
                  }
                }(e13, t13);
                if (a4) return n4.locale = a4, r13 !== t13 && (n4.extension = r13.slice(t13.length, r13.length)), n4;
              }
              return n4.locale = r12(), n4;
            }(Array.from(e12), t11, i3);
            else {
              var l2;
              let r12, n4, a4, s3, d3;
              l2 = Array.from(e12), a4 = [], s3 = t11.reduce((e13, t12) => {
                let r13 = t12.replace(rz, "");
                return a4.push(r13), e13[r13] = t12, e13;
              }, {}), (d3 = function(e13, t12, r13 = 838) {
                let n5 = 1 / 0, a5 = { matchedDesiredLocale: "", distances: {} }, i4 = rY.get(t12);
                i4 || (i4 = t12.map((e14) => {
                  try {
                    return Intl.getCanonicalLocales([e14])[0] || e14;
                  } catch {
                    return e14;
                  }
                }), rY.set(t12, i4));
                let o3 = new Set(i4);
                for (let t13 = 0; t13 < e13.length; t13++) {
                  let r14 = e13[t13];
                  if (o3.has(r14)) {
                    let e14 = 0 + 40 * t13;
                    if (a5.distances[r14] = { [r14]: e14 }, e14 < n5 && (n5 = e14, a5.matchedDesiredLocale = r14, a5.matchedSupportedLocale = r14), 0 === t13) return a5;
                  }
                }
                for (let t13 = 0; t13 < e13.length; t13++) {
                  let r14 = e13[t13];
                  try {
                    let e14 = new Intl.Locale(r14).maximize().toString();
                    if (e14 !== r14) {
                      let i5 = function(e15) {
                        let t14 = [], r15 = e15;
                        for (; r15; ) {
                          t14.push(r15);
                          let e16 = r15.lastIndexOf("-");
                          if (-1 === e16) break;
                          r15 = r15.substring(0, e16);
                        }
                        return t14;
                      }(e14);
                      for (let s4 = 0; s4 < i5.length; s4++) {
                        let l3 = i5[s4];
                        if (l3 !== r14 && o3.has(l3)) {
                          let i6;
                          try {
                            i6 = new Intl.Locale(l3).maximize().toString() === e14 ? 0 + 40 * t13 : 10 * s4 + 40 * t13;
                          } catch {
                            i6 = 10 * s4 + 40 * t13;
                          }
                          a5.distances[r14] || (a5.distances[r14] = {}), a5.distances[r14][l3] = i6, i6 < n5 && (n5 = i6, a5.matchedDesiredLocale = r14, a5.matchedSupportedLocale = l3);
                          break;
                        }
                      }
                    }
                  } catch {
                  }
                }
                return a5.matchedSupportedLocale && 0 === n5 || (n5 = 1 / 0, e13.forEach((e14, r14) => {
                  a5.distances[e14] || (a5.distances[e14] = {}), i4.forEach((i5, o4) => {
                    let s4 = t12[o4], l3 = rJ(e14, i5) + 0 + 40 * r14;
                    a5.distances[e14][s4] = l3, l3 < n5 && (n5 = l3, a5.matchedDesiredLocale = e14, a5.matchedSupportedLocale = s4);
                  });
                }), n5 >= r13 && (a5.matchedDesiredLocale = void 0, a5.matchedSupportedLocale = void 0)), a5;
              }(a4, l2)).matchedSupportedLocale && d3.matchedDesiredLocale && (r12 = d3.matchedSupportedLocale, n4 = s3[d3.matchedDesiredLocale].slice(d3.matchedDesiredLocale.length) || void 0), o2 = r12 ? { locale: r12, extension: n4 } : { locale: i3() };
            }
            null == o2 && (o2 = { locale: i3(), extension: "" });
            let d2 = o2.locale, u2 = a3[d2], c2 = { locale: "en", dataLocale: d2 };
            s2 = o2.extension ? function(e13) {
              let t12;
              rK(e13 === e13.toLowerCase(), "Expected extension to be lowercase"), rK("-u-" === e13.slice(0, 3), "Expected extension to be a Unicode locale extension");
              let r12 = [], n4 = [], a4 = e13.length, i4 = 3;
              for (; i4 < a4; ) {
                let o3, s3 = e13.indexOf("-", i4);
                o3 = -1 === s3 ? a4 - i4 : s3 - i4;
                let l3 = e13.slice(i4, i4 + o3);
                rK(o3 >= 2, "Expected a subtag to have at least 2 characters"), void 0 === t12 && 2 != o3 ? -1 === r12.indexOf(l3) && r12.push(l3) : 2 === o3 ? (t12 = { key: l3, value: "" }, void 0 === n4.find((e14) => e14.key === t12?.key) && n4.push(t12)) : t12?.value === "" ? t12.value = l3 : (rK(void 0 !== t12, "Expected keyword to be defined"), t12.value += "-" + l3), i4 += o3 + 1;
              }
              return { attributes: r12, keywords: n4 };
            }(o2.extension).keywords : [];
            let p2 = [];
            for (let e13 of n3) {
              let t12, n4 = u2?.[e13] ?? [];
              rK(Array.isArray(n4), `keyLocaleData for ${e13} must be an array`);
              let a4 = n4[0];
              rK(void 0 === a4 || "string" == typeof a4, "value must be a string or undefined");
              let i4 = s2.find((t13) => t13.key === e13);
              if (i4) {
                let r12 = i4.value;
                "" !== r12 ? n4.indexOf(r12) > -1 && (t12 = { key: e13, value: a4 = r12 }) : n4.indexOf("true") > -1 && (t12 = { key: e13, value: a4 = "true" });
              }
              let o3 = r11[e13];
              rK(null == o3 || "string" == typeof o3, "optionsValue must be a string or undefined"), "string" == typeof o3 && "" === (o3 = function(e14, t13) {
                let r12 = t13.toLowerCase();
                return rK(void 0 !== e14, "ukey must be defined"), r12;
              }(e13.toLowerCase(), o3)) && (o3 = "true"), o3 !== a4 && n4.indexOf(o3) > -1 && (a4 = o3, t12 = void 0), t12 && p2.push(t12), c2[e13] = a4;
            }
            return p2.length > 0 && (d2 = function(e13, t12, r12) {
              rK(-1 === e13.indexOf("-u-"), "Expected locale to not have a Unicode locale extension");
              let n4 = "-u";
              for (let e14 of t12) n4 += `-${e14}`;
              for (let e14 of r12) {
                let { key: t13, value: r13 } = e14;
                n4 += `-${t13}`, "" !== r13 && (n4 += `-${r13}`);
              }
              if ("-u" === n4) return rQ(e13);
              let a4 = e13.indexOf("-x-");
              return rQ(-1 === a4 ? e13 + n4 : e13.slice(0, a4) + n4 + e13.slice(a4));
            }(d2, [], p2)), c2.locale = d2, c2;
          }(e11, Intl.getCanonicalLocales(a2), { localeMatcher: "best fit" }, [], {}, () => r10).locale, n2 = t10.find((e12) => e12.toLowerCase() === i2.toLowerCase());
        } catch {
        }
        return n2;
      }
      function r3(e10, t10) {
        if (e10.localeCookie && t10.has(e10.localeCookie.name)) {
          let r10 = t10.get(e10.localeCookie.name)?.value;
          if (r10 && e10.locales.includes(r10)) return r10;
        }
      }
      function r4(e10, t10, r10, n2) {
        let a2;
        return n2 && (a2 = rD(n2, e10.locales, e10.localePrefix)?.locale), !a2 && e10.localeDetection && (a2 = r3(e10, r10)), !a2 && e10.localeDetection && (a2 = r2(t10, e10.locales, e10.defaultLocale)), a2 || (a2 = e10.defaultLocale), a2;
      }
      let r5 = (s = { ...es = { locales: ["en", "ar"], defaultLocale: "en", localePrefix: "always" }, localePrefix: "object" == typeof (ed = es.localePrefix) ? ed : { mode: ed || "always" }, localeCookie: !!((el = es.localeCookie) ?? 1) && { name: "NEXT_LOCALE", sameSite: "lax", ..."object" == typeof el && el }, localeDetection: es.localeDetection ?? true, alternateLinks: es.alternateLinks ?? true }, function(e10) {
        var t10, r10;
        let n2;
        try {
          n2 = decodeURI(e10.nextUrl.pathname);
        } catch {
          return ev.next();
        }
        let a2 = n2.replace(/\\/g, "%5C").replace(/[\t\n\r]/g, "").replace(/\/+/g, "/"), { domain: i2, locale: o2 } = (t10 = e10.headers, r10 = e10.cookies, s.domains ? function(e11, t11, r11, n3) {
          let a3, i3 = function(e12, t12) {
            let r12 = rq(e12);
            if (r12) return t12.find((e13) => e13.domain === r12);
          }(t11, e11.domains);
          if (!i3) return { locale: r4(e11, t11, r11, n3) };
          if (n3) {
            let t12 = rD(n3, e11.locales, e11.localePrefix, i3)?.locale;
            if (t12) {
              if (!rU(t12, i3)) return { locale: t12, domain: i3 };
              a3 = t12;
            }
          }
          if (!a3 && e11.localeDetection) {
            let t12 = r3(e11, r11);
            t12 && rU(t12, i3) && (a3 = t12);
          }
          if (!a3 && e11.localeDetection) {
            let e12 = r2(t11, i3.locales, i3.defaultLocale);
            e12 && (a3 = e12);
          }
          return a3 || (a3 = i3.defaultLocale), { locale: a3, domain: i3 };
        }(s, t10, r10, a2) : { locale: r4(s, t10, r10, a2) }), l2 = i2 ? i2.defaultLocale === o2 : o2 === s.defaultLocale, d2 = s.domains?.filter((e11) => rU(o2, e11)) || [], u2 = null != s.domains && !i2;
        function c2(t11) {
          var r11;
          let n3 = new URL(t11, e10.url);
          e10.nextUrl.basePath && (r11 = n3.pathname, n3.pathname = rS(e10.nextUrl.basePath + r11));
          let a3 = new Headers(e10.headers);
          return a3.set("X-NEXT-INTL-LOCALE", o2), rS(e10.nextUrl.pathname) !== rS(n3.pathname) ? ev.rewrite(n3, { request: { headers: a3 } }) : ev.next({ request: { headers: a3 } });
        }
        function p2(t11, r11) {
          var n3;
          let a3 = new URL(t11, e10.url);
          if (a3.pathname = rS(a3.pathname), d2.length > 0 && !r11 && i2) {
            let e11 = rB(i2, o2, d2);
            if (e11) {
              r11 = e11.domain;
              let t12 = e11.localePrefix || s.localePrefix.mode;
              e11.defaultLocale === o2 && "as-needed" === t12 && (a3.pathname = rI(a3.pathname, s.locales, s.localePrefix));
            }
          }
          return r11 && (a3.host = r11, e10.headers.get("x-forwarded-host")) && (a3.protocol = e10.headers.get("x-forwarded-proto") ?? e10.nextUrl.protocol, a3.port = r11.split(":")[1] ?? e10.headers.get("x-forwarded-port") ?? ""), e10.nextUrl.basePath && (n3 = a3.pathname, a3.pathname = rS(e10.nextUrl.basePath + n3)), b2 = true, ev.redirect(a3.toString());
        }
        let h2 = rI(a2, s.locales, s.localePrefix), f2 = rD(a2, s.locales, s.localePrefix, i2), _2 = null != f2, g2 = i2?.localePrefix || s.localePrefix.mode, m2 = "never" === g2 || l2 && "as-needed" === g2, v2, y2, b2, w2 = h2, E2 = s.pathnames;
        if (E2) {
          let t11;
          if ([t11, y2] = function(e11, t12, r11) {
            for (let n3 of Object.keys(e11).sort(rM)) {
              let a3 = e11[n3];
              if ("string" == typeof a3) {
                if (rT(a3, t12)) return [void 0, n3];
              } else {
                let i3 = Object.entries(a3), o3 = i3.findIndex(([e12]) => e12 === r11);
                for (let [r12] of (o3 > 0 && i3.unshift(i3.splice(o3, 1)[0]), i3)) if (rT(rC(e11[n3], r12, n3), t12)) return [r12, n3];
              }
            }
            for (let r12 of Object.keys(e11)) if (rT(r12, t12)) return [void 0, r12];
            return [void 0, void 0];
          }(E2, h2, o2), y2) {
            let r11 = E2[y2], n3 = rC(r11, o2, y2);
            if (rT(n3, h2)) w2 = rL(h2, n3, y2);
            else {
              let a3;
              a3 = t11 ? rC(r11, t11, y2) : y2;
              let i3 = m2 ? void 0 : rR(o2, s.localePrefix);
              v2 = p2(rj(rL(h2, a3, n3), i3, e10.nextUrl.search));
            }
          }
        }
        if (!v2) if ("/" !== w2 || _2) {
          let t11 = rj(w2, `/${o2}`, e10.nextUrl.search);
          if (_2) {
            let r11 = rj(h2, f2.prefix, e10.nextUrl.search);
            if ("never" === g2) v2 = p2(rj(h2, void 0, e10.nextUrl.search));
            else if (f2.exact) if (l2 && m2) v2 = p2(rj(h2, void 0, e10.nextUrl.search));
            else if (s.domains) {
              let e11 = rB(i2, f2.locale, d2);
              v2 = i2?.domain === e11?.domain || u2 ? c2(t11) : p2(r11, e11?.domain);
            } else v2 = c2(t11);
            else v2 = p2(r11);
          } else v2 = m2 ? c2(t11) : p2(rj(h2, rR(o2, s.localePrefix), e10.nextUrl.search));
        } else v2 = m2 ? c2(rj(w2, `/${o2}`, e10.nextUrl.search)) : p2(rj(h2, rR(o2, s.localePrefix), e10.nextUrl.search));
        return function(e11, t11, r11, n3, a3) {
          if (!n3.localeCookie) return;
          let i3 = e11.headers.get("sec-fetch-dest");
          if (null != i3 && "document" !== i3) return;
          let { name: o3, ...s2 } = n3.localeCookie, l3 = e11.cookies.has(o3);
          l3 && e11.cookies.get(o3)?.value !== r11 ? t11.cookies.set(o3, r11, { path: e11.nextUrl.basePath || void 0, ...s2 }) : l3 || r2(e11.headers, a3?.locales || n3.locales, n3.defaultLocale) === r11 || t11.cookies.set(o3, r11, { path: e11.nextUrl.basePath || void 0, ...s2 });
        }(e10, v2, o2, s, i2), !b2 && "never" !== g2 && s.alternateLinks && s.locales.length > 1 && v2.headers.set("Link", function({ internalTemplateName: e11, localizedPathnames: t11, request: r11, resolvedLocale: n3, routing: a3 }) {
          let i3 = r11.nextUrl.clone(), o3 = rq(r11.headers);
          function s2(e12, t12) {
            var n4;
            return e12.pathname = rS(e12.pathname), r11.nextUrl.basePath && ((e12 = new URL(e12)).pathname = (n4 = e12.pathname, rS(r11.nextUrl.basePath + n4))), `<${e12.toString()}>; rel="alternate"; hreflang="${t12}"`;
          }
          function l3(r12, a4) {
            return t11 && "object" == typeof t11 ? rL(r12, t11[n3] ?? e11, t11[a4] ?? e11) : r12;
          }
          o3 && (i3.port = "", i3.host = o3), i3.protocol = r11.headers.get("x-forwarded-proto") ?? i3.protocol, i3.pathname = rI(i3.pathname, a3.locales, a3.localePrefix);
          let d3 = rk(a3.locales, a3.localePrefix, false).flatMap(([e12, r12]) => {
            let n4;
            function o4(e13) {
              return "/" === e13 ? r12 : r12 + e13;
            }
            if (a3.domains) return a3.domains.filter((t12) => rU(e12, t12)).map((t12) => {
              (n4 = new URL(i3)).port = "", n4.host = t12.domain, n4.pathname = l3(i3.pathname, e12);
              let r13 = t12.localePrefix || a3.localePrefix.mode;
              return e12 === t12.defaultLocale && "always" !== r13 || (n4.pathname = o4(n4.pathname)), s2(n4, e12);
            });
            {
              let r13;
              r13 = t11 && "object" == typeof t11 ? l3(i3.pathname, e12) : i3.pathname, e12 === a3.defaultLocale && "always" !== a3.localePrefix.mode || (r13 = o4(r13)), n4 = new URL(r13, i3);
            }
            return s2(n4, e12);
          });
          if (!a3.domains || 0 === a3.domains.length) {
            let e12 = l3(i3.pathname, a3.defaultLocale);
            if (e12) {
              let t12 = new URL(e12, i3);
              d3.push(s2(t12, "x-default"));
            }
          }
          return d3.join(", ");
        }({ routing: s, internalTemplateName: y2, localizedPathnames: null != y2 && E2 ? E2[y2] : void 0, request: e10, resolvedLocale: o2 })), v2;
      });
      async function r9(e10) {
        let { pathname: t10 } = e10.nextUrl;
        if (t10.startsWith("/admin") || t10.startsWith("/maintenance")) return ev.next();
        if ("true" === process.env.MAINTENANCE_MODE) {
          let r10 = t10.split("/")[1], n2 = e10.headers.get("accept-language") || "", a2 = "ar" === r10 || (!r10 || "en" === r10) && n2.toLowerCase().includes("ar"), i2 = e10.nextUrl.clone();
          i2.pathname = "/maintenance", i2.searchParams.set("lang", a2 ? "ar" : "en");
          let o2 = ev.rewrite(i2, { status: 503 });
          return o2.headers.set("Retry-After", "3600"), o2.headers.set("X-Robots-Tag", "noindex"), o2;
        }
        return r5(e10);
      }
      e.s(["config", 0, { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] }, "default", 0, r9], 96592);
      let r7 = { ...e.i(96592) }, r6 = "/middleware", r8 = r7.middleware || r7.default;
      if ("function" != typeof r8) throw new class extends Error {
        constructor(e10) {
          super(e10), Object.defineProperty(this, "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true }), this.stack = "";
        }
      }(`The Middleware file "${r6}" must export a function named \`middleware\` or a default function.`);
      let ne = async (e10) => tk({ ...e10, IncrementalCache: rw, incrementalCacheHandler: null, page: r6, handler: async (...e11) => {
        try {
          return await r8(...e11);
        } catch (a2) {
          let t10 = e11[0], r10 = new URL(t10.url), n2 = r10.pathname + r10.search;
          throw await c(a2, { path: n2, method: t10.method, headers: Object.fromEntries(t10.headers.entries()) }, { routerKind: "Pages Router", routePath: "/proxy", routeType: "proxy", revalidateReason: void 0 }), a2;
        }
      } });
      async function nt(e10, t10) {
        let r10 = await ne({ request: { url: e10.url, method: e10.method, headers: T(e10.headers), nextConfig: { basePath: "", i18n: "", trailingSlash: false, experimental: { cacheLife: { default: { stale: 300, revalidate: 900, expire: 4294967294 }, seconds: { stale: 30, revalidate: 1, expire: 60 }, minutes: { stale: 300, revalidate: 60, expire: 3600 }, hours: { stale: 300, revalidate: 3600, expire: 86400 }, days: { stale: 300, revalidate: 86400, expire: 604800 }, weeks: { stale: 300, revalidate: 604800, expire: 2592e3 }, max: { stale: 300, revalidate: 2592e3, expire: 31536e3 } }, authInterrupts: false, clientParamParsingOrigins: [] } }, page: { name: r6 }, body: "GET" !== e10.method && "HEAD" !== e10.method ? e10.body ?? void 0 : void 0, waitUntil: t10.waitUntil, requestMeta: t10.requestMeta, signal: t10.signal || new AbortController().signal } });
        return null == t10.waitUntil || t10.waitUntil.call(t10, r10.waitUntil), r10.response;
      }
      e.s(["default", 0, ne, "handler", 0, nt], 58217);
    }]);
  }
});

// .next/server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_1hoef-8.js
var require_turbopack_node_modules_next_dist_esm_build_templates_edge_wrapper_1hoef_8 = __commonJS({
  ".next/server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_1hoef-8.js"() {
    "use strict";
    (globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_1hoef-8.js", { otherChunks: ["chunks/node_modules_next_dist_esm_build_templates_edge-wrapper_0_kjzx3.js", "chunks/[root-of-the-server]__0z5ie0n._.js"], runtimeModuleIds: [35825] }]), (() => {
      let e;
      if (!Array.isArray(globalThis.TURBOPACK)) return;
      var t, r = ((t = r || {})[t.Runtime = 0] = "Runtime", t[t.Parent = 1] = "Parent", t[t.Update = 2] = "Update", t);
      let n = /* @__PURE__ */ new WeakMap();
      function o(e2, t2) {
        this.m = e2, this.e = t2;
      }
      let u = o.prototype, l = Object.prototype.hasOwnProperty, i = "u" > typeof Symbol && Symbol.toStringTag;
      function a(e2, t2, r2) {
        l.call(e2, t2) || Object.defineProperty(e2, t2, r2);
      }
      function s(e2, t2) {
        let r2 = e2[t2];
        return r2 || (r2 = f(t2), e2[t2] = r2), r2;
      }
      function f(e2) {
        return { exports: {}, error: void 0, id: e2, namespaceObject: void 0 };
      }
      function c(e2, t2, r2) {
        a(e2, "__esModule", { value: true }), i && a(e2, i, { value: "Module" });
        let n2 = 0;
        for (; n2 < t2.length; ) {
          let r3 = t2[n2++], o2 = t2[n2++];
          if ("number" == typeof o2) if (0 === o2) a(e2, r3, { value: t2[n2++], enumerable: true, writable: false });
          else throw Error(`unexpected tag: ${o2}`);
          else "function" == typeof t2[n2] ? a(e2, r3, { get: o2, set: t2[n2++], enumerable: true }) : a(e2, r3, { get: o2, enumerable: true });
        }
        r2 || Object.seal(e2);
      }
      function d(e2, t2) {
        (null != t2 ? s(this.c, t2) : this.m).exports = e2;
      }
      u.s = function(e2, t2, r2) {
        let n2, o2;
        null != t2 ? o2 = (n2 = s(this.c, t2)).exports : (n2 = this.m, o2 = this.e), n2.namespaceObject = o2, c(o2, e2, r2);
      }, u.j = function(e2, t2) {
        let r2, o2;
        null != t2 ? o2 = (r2 = s(this.c, t2)).exports : (r2 = this.m, o2 = this.e);
        let u2 = function(e3, t3) {
          let r3 = n.get(e3);
          if (!r3) {
            n.set(e3, r3 = []);
            let o3 = (e4) => {
              if ("default" !== e4) {
                for (let t4 of r3) if (l.call(t4, e4)) return t4;
              }
            };
            e3.exports = e3.namespaceObject = new Proxy(t3, { get(e4, t4) {
              if (l.call(e4, t4) || "default" === t4 || "__esModule" === t4) return Reflect.get(e4, t4);
              let r4 = o3(t4);
              return r4 && Reflect.get(r4, t4);
            }, set: () => false, defineProperty: () => false, deleteProperty: () => false, has: (e4, t4) => !!Reflect.has(e4, t4) || "default" !== t4 && "__esModule" !== t4 && void 0 !== o3(t4), ownKeys(e4) {
              let t4 = Reflect.ownKeys(e4);
              for (let e5 of r3) for (let r4 of Reflect.ownKeys(e5)) "default" === r4 || t4.includes(r4) || t4.push(r4);
              return t4;
            }, getOwnPropertyDescriptor(e4, t4) {
              let r4 = Reflect.getOwnPropertyDescriptor(e4, t4);
              if (r4 || "default" === t4 || "__esModule" === t4) return r4;
              let n2 = o3(t4);
              if (n2) return { enumerable: true, configurable: true, get: () => Reflect.get(n2, t4) };
            } });
          }
          return r3;
        }(r2, o2);
        "object" == typeof e2 && null !== e2 && u2.push(e2);
      }, u.v = d, u.n = function(e2, t2) {
        let r2;
        (r2 = null != t2 ? s(this.c, t2) : this.m).exports = r2.namespaceObject = e2;
      };
      let p = Object.getPrototypeOf ? (e2) => Object.getPrototypeOf(e2) : (e2) => e2.__proto__, h = [null, p({}), p([]), p(p)];
      function m(e2, t2, r2) {
        let n2 = [], o2 = -1;
        for (let t3 = e2; ("object" == typeof t3 || "function" == typeof t3) && !h.includes(t3); t3 = p(t3)) for (let r3 of Object.getOwnPropertyNames(t3)) n2.push(r3, /* @__PURE__ */ function(e3, t4) {
          return () => e3[t4];
        }(e2, r3)), -1 === o2 && "default" === r3 && (o2 = n2.length - 1);
        return r2 && o2 >= 0 || (o2 >= 0 ? n2.splice(o2, 1, 0, e2) : n2.push("default", 0, e2)), c(t2, n2), t2;
      }
      function y(e2) {
        return "function" == typeof e2 ? function(...t2) {
          return e2.apply(this, t2);
        } : /* @__PURE__ */ Object.create(null);
      }
      function b(e2) {
        let t2 = A(e2, this.m);
        if (t2.namespaceObject) return t2.namespaceObject;
        let r2 = t2.exports;
        return t2.namespaceObject = m(r2, y(r2), r2 && r2.__esModule);
      }
      function g(e2) {
        let t2 = e2.indexOf("#");
        -1 !== t2 && (e2 = e2.substring(0, t2));
        let r2 = e2.indexOf("?");
        return -1 !== r2 && (e2 = e2.substring(0, r2)), e2;
      }
      function w(e2) {
        return "string" == typeof e2 ? e2 : e2.path;
      }
      u.i = b, u.A = function(e2) {
        return this.r(e2)(b.bind(this));
      }, u.t = "function" == typeof __require ? __require : function() {
        throw Error("Unexpected use of runtime require");
      }, u.r = function(e2) {
        return A(e2, this.m).exports;
      }, u.f = function(e2) {
        function t2(t3) {
          if (t3 = g(t3), l.call(e2, t3)) return e2[t3].module();
          let r2 = Error(`Cannot find module '${t3}'`);
          throw r2.code = "MODULE_NOT_FOUND", r2;
        }
        return t2.keys = () => Object.keys(e2), t2.resolve = (t3) => {
          if (t3 = g(t3), l.call(e2, t3)) return e2[t3].id();
          let r2 = Error(`Cannot find module '${t3}'`);
          throw r2.code = "MODULE_NOT_FOUND", r2;
        }, t2.import = async (e3) => await t2(e3), t2;
      };
      let O = function(e2) {
        let t2 = new URL(e2, "x:/"), r2 = {};
        for (let e3 in t2) r2[e3] = t2[e3];
        for (let t3 in r2.href = e2, r2.pathname = e2.replace(/[?#].*/, ""), r2.origin = r2.protocol = "", r2.toString = r2.toJSON = (...t4) => e2, r2) Object.defineProperty(this, t3, { enumerable: true, configurable: true, value: r2[t3] });
      };
      function _(e2, t2) {
        throw Error(`Invariant: ${t2(e2)}`);
      }
      O.prototype = URL.prototype, u.U = O, u.z = function(e2) {
        throw Error("dynamic usage of require is not supported");
      }, u.g = globalThis;
      let k = o.prototype, R = /* @__PURE__ */ new Map();
      u.M = R;
      let j = /* @__PURE__ */ new Map(), P = /* @__PURE__ */ new Map(), C = /* @__PURE__ */ new Map();
      async function v(e2, t2, r2) {
        let n2;
        if ("string" == typeof r2) return function(e3, t3, r3) {
          return M(e3, t3, r3);
        }(e2, t2, T(r2));
        let o2 = r2.included || [], u2 = o2.map((e3) => !!R.has(e3) || j.get(e3));
        if (u2.length > 0 && u2.every((e3) => e3)) return void await Promise.all(u2);
        for (let u3 of (n2 = M(e2, t2, T(r2.path)), o2)) j.has(u3) || j.set(u3, n2);
        await n2;
      }
      k.l = function(e2) {
        return v(r.Parent, this.m.id, e2);
      };
      let U = Promise.resolve(void 0), x = /* @__PURE__ */ new WeakMap();
      function M(t2, n2, o2) {
        let u2 = e.loadChunkCached(t2, o2), l2 = x.get(u2);
        if (void 0 === l2) {
          let e2 = x.set.bind(x, u2, U);
          l2 = u2.then(e2).catch((e3) => {
            let u3;
            switch (t2) {
              case r.Runtime:
                u3 = `as a runtime dependency of chunk ${n2}`;
                break;
              case r.Parent:
                u3 = `from module ${n2}`;
                break;
              case r.Update:
                u3 = "from an HMR update";
                break;
              default:
                _(t2, (e4) => `Unknown source type: ${e4}`);
            }
            let l3 = Error(`Failed to load chunk ${o2} ${u3}${e3 ? `: ${e3}` : ""}`, e3 ? { cause: e3 } : void 0);
            throw l3.name = "ChunkLoadError", l3;
          }), x.set(u2, l2);
        }
        return l2;
      }
      k.L = function(e2) {
        var t2, n2;
        return t2 = r.Parent, n2 = this.m.id, M(t2, n2, e2);
      };
      k.R = function(e2) {
        let t2 = this.r(e2);
        return t2?.default ?? t2;
      }, k.P = function(e2) {
        return `/ROOT/${e2 ?? ""}`;
      }, k.F = function(e2) {
        return e2 ? `file:///ROOT/${e2.split("/").map(encodeURIComponent).join("/")}` : "file:///ROOT/";
      }, k.q = function(e2, t2) {
        d.call(this, `${e2}`, t2);
      };
      let $ = /[^A-Za-z0-9\-_.!~*'()/]/;
      function T(e2, t2 = "") {
        let r2 = $.test(e2) ? e2.split("/").map(encodeURIComponent).join("/") : e2;
        return `${t2}${r2}`;
      }
      k.b = "", k.X = "", k.h = T;
      let E = {};
      u.c = E;
      let A = (e2, t2) => {
        let n2 = E[e2];
        if (n2) {
          if (n2.error) throw n2.error;
          return n2;
        }
        return K(e2, r.Parent, t2.id);
      };
      function K(e2, t2, r2) {
        let n2 = R.get(e2);
        if ("function" != typeof n2) throw Error(function(e3, t3, r3) {
          let n3;
          switch (t3) {
            case 0:
              n3 = `as a runtime entry of chunk ${r3}`;
              break;
            case 1:
              n3 = `because it was required from module ${r3}`;
              break;
            case 2:
              n3 = "because of an HMR update";
              break;
            default:
              _(t3, (e4) => `Unknown source type: ${e4}`);
          }
          return `Module ${e3} was instantiated ${n3}, but the module factory is not available.`;
        }(e2, t2, r2));
        let u2 = f(e2), l2 = u2.exports;
        E[e2] = u2;
        let i2 = new o(u2, l2);
        try {
          n2(i2, u2, l2);
        } catch (e3) {
          throw u2.error = e3, e3;
        }
        return u2.namespaceObject && u2.exports !== u2.namespaceObject && m(u2.exports, u2.namespaceObject), u2;
      }
      function q(t2) {
        let r2;
        if (!Array.isArray(t2)) return e.registerChunk(void 0, t2);
        let n2 = function(e2) {
          if ("string" == typeof e2) return e2;
          if (e2) return { src: e2.getAttribute("src") };
          if ("u" > typeof TURBOPACK_NEXT_CHUNK_URLS) return { src: TURBOPACK_NEXT_CHUNK_URLS.pop() };
          throw Error("chunk path empty but not in a worker");
        }(t2[0]);
        return 2 === t2.length ? r2 = t2[1] : (r2 = void 0, !function(e2, t3) {
          let r3 = 1;
          for (; r3 < e2.length; ) {
            let n3, o2 = r3 + 1;
            for (; o2 < e2.length && "function" != typeof e2[o2]; ) o2++;
            if (o2 === e2.length) throw Error("malformed chunk format, expected a factory function");
            let u2 = e2[o2];
            for (let u3 = r3; u3 < o2; u3++) {
              let r4 = e2[u3], o3 = t3.get(r4);
              if (o3) {
                n3 = o3;
                break;
              }
            }
            let l2 = n3 ?? u2, i2 = false;
            for (let n4 = r3; n4 < o2; n4++) {
              let r4 = e2[n4];
              t3.has(r4) || (i2 || (l2 === u2 && Object.defineProperty(u2, "name", { value: "module evaluation" }), i2 = true), t3.set(r4, l2));
            }
            r3 = o2 + 1;
          }
        }(t2, R)), e.registerChunk(n2, r2);
      }
      function N(e2, t2, r2 = false) {
        let n2;
        try {
          n2 = t2();
        } catch (t3) {
          throw Error(`Failed to load external module ${e2}: ${t3}`);
        }
        return !r2 || n2.__esModule ? n2 : m(n2, y(n2), true);
      }
      u.y = async function(e2) {
        let t2;
        try {
          t2 = await import(e2);
        } catch (t3) {
          throw Error(`Failed to load external module ${e2}: ${t3}`);
        }
        return t2 && t2.__esModule && t2.default && "default" in t2.default ? m(t2.default, y(t2), true) : t2;
      }, N.resolve = (e2, t2) => __require.resolve(e2, t2), u.x = N, e = { registerChunk(e2, t2) {
        if (null == e2) throw Error("inline entry registration is not supported");
        let r2 = function(e3) {
          if ("string" == typeof e3) return e3;
          let t3 = decodeURIComponent(e3.src.replace(/[?#].*$/, ""));
          return t3.startsWith("") ? t3.slice(0) : t3;
        }(e2);
        S.add(r2), function(e3) {
          let t3 = I.get(e3);
          if (null != t3) {
            for (let r3 of t3) r3.requiredChunks.delete(e3), 0 === r3.requiredChunks.size && L(r3.runtimeModuleIds, r3.chunkPath);
            I.delete(e3);
          }
        }(r2), null != t2 && (0 === t2.otherChunks.length ? L(t2.runtimeModuleIds, r2) : function(e3, t3, r3) {
          let n2 = /* @__PURE__ */ new Set(), o2 = { runtimeModuleIds: r3, chunkPath: e3, requiredChunks: n2 };
          for (let e4 of t3) {
            let t4 = w(e4);
            if (S.has(t4)) continue;
            n2.add(t4);
            let r4 = I.get(t4);
            null == r4 && (r4 = /* @__PURE__ */ new Set(), I.set(t4, r4)), r4.add(o2);
          }
          0 === o2.requiredChunks.size && L(o2.runtimeModuleIds, o2.chunkPath);
        }(r2, t2.otherChunks.filter((e3) => function(e4) {
          let t3, r3 = e4.indexOf("?");
          if (-1 !== r3) t3 = r3;
          else {
            let r4 = e4.indexOf("#");
            t3 = -1 !== r4 ? r4 : e4.length;
          }
          return t3 >= 3 && e4.startsWith(".js", t3 - 3);
        }(w(e3))), t2.runtimeModuleIds));
      }, loadChunkCached(e2, t2) {
        throw Error("chunk loading is not supported");
      } };
      let S = /* @__PURE__ */ new Set(), I = /* @__PURE__ */ new Map();
      function L(e2, t2) {
        for (let n2 of e2) !function(e3, t3) {
          let n3 = E[t3];
          if (n3) {
            if (n3.error) throw n3.error;
            return;
          }
          K(t3, r.Runtime, e3);
        }(t2, n2);
      }
      var B = globalThis.TURBOPACK;
      globalThis.TURBOPACK = { push: q }, B.forEach(q);
    })();
  }
});

// node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js
var edgeFunctionHandler_exports = {};
__export(edgeFunctionHandler_exports, {
  default: () => edgeFunctionHandler
});
async function edgeFunctionHandler(request) {
  const path3 = new URL(request.url).pathname;
  const routes = globalThis._ROUTES;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(path3);
  } catch {
  }
  const correspondingRoute = routes.find((route) => route.regex.some((r) => {
    const regex = new RegExp(r);
    return regex.test(path3) || decodedPath !== void 0 && regex.test(decodedPath);
  }));
  if (!correspondingRoute) {
    throw new Error(`No route found for ${request.url}`);
  }
  const entry = await self._ENTRIES[`middleware_${correspondingRoute.name}`];
  const result = await entry.default({
    page: correspondingRoute.page,
    request: {
      ...request,
      page: {
        name: correspondingRoute.name
      }
    }
  });
  globalThis.__openNextAls.getStore()?.pendingPromiseRunner.add(result.waitUntil);
  const response = result.response;
  return response;
}
var init_edgeFunctionHandler = __esm({
  "node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js"() {
    globalThis._ENTRIES = {};
    globalThis.self = globalThis;
    globalThis._ROUTES = [{ "name": "middleware", "page": "/", "regex": ["^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!api|_next|_vercel|.*\\..*).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$"] }];
    require_node_modules_next_dist_esm_build_templates_edge_wrapper_0_kjzx3();
    require_root_of_the_server_0z5ie0n();
    require_turbopack_node_modules_next_dist_esm_build_templates_edge_wrapper_1hoef_8();
  }
});

// node_modules/@opennextjs/aws/dist/utils/promise.js
init_logger();

// node_modules/@opennextjs/aws/dist/utils/requestCache.js
var RequestCache = class {
  _caches = /* @__PURE__ */ new Map();
  /**
   * Returns the Map registered under `key`.
   * If no Map exists yet for that key, a new empty Map is created, stored, and returned.
   * Repeated calls with the same key always return the **same** Map instance.
   */
  getOrCreate(key) {
    let cache = this._caches.get(key);
    if (!cache) {
      cache = /* @__PURE__ */ new Map();
      this._caches.set(key, cache);
    }
    return cache;
  }
};

// node_modules/@opennextjs/aws/dist/utils/promise.js
var DetachedPromise = class {
  resolve;
  reject;
  promise;
  constructor() {
    let resolve;
    let reject;
    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.resolve = resolve;
    this.reject = reject;
  }
};
var DetachedPromiseRunner = class {
  promises = [];
  withResolvers() {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    return detachedPromise;
  }
  add(promise) {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    promise.then(detachedPromise.resolve, detachedPromise.reject);
  }
  async await() {
    debug(`Awaiting ${this.promises.length} detached promises`);
    const results = await Promise.allSettled(this.promises.map((p) => p.promise));
    const rejectedPromises = results.filter((r) => r.status === "rejected");
    rejectedPromises.forEach((r) => {
      error(r.reason);
    });
  }
};
async function awaitAllDetachedPromise() {
  const store = globalThis.__openNextAls.getStore();
  const promisesToAwait = store?.pendingPromiseRunner.await() ?? Promise.resolve();
  if (store?.waitUntil) {
    store.waitUntil(promisesToAwait);
    return;
  }
  await promisesToAwait;
}
function provideNextAfterProvider() {
  const NEXT_REQUEST_CONTEXT_SYMBOL = Symbol.for("@next/request-context");
  const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
  const store = globalThis.__openNextAls.getStore();
  const waitUntil = store?.waitUntil ?? ((promise) => store?.pendingPromiseRunner.add(promise));
  const nextAfterContext = {
    get: () => ({
      waitUntil
    })
  };
  globalThis[NEXT_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  if (process.env.EMULATE_VERCEL_REQUEST_CONTEXT) {
    globalThis[VERCEL_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  }
}
function runWithOpenNextRequestContext({ isISRRevalidation, waitUntil, requestId = Math.random().toString(36) }, fn) {
  return globalThis.__openNextAls.run({
    requestId,
    pendingPromiseRunner: new DetachedPromiseRunner(),
    isISRRevalidation,
    waitUntil,
    writtenTags: /* @__PURE__ */ new Set(),
    requestCache: new RequestCache()
  }, async () => {
    provideNextAfterProvider();
    let result;
    try {
      result = await fn();
    } finally {
      await awaitAllDetachedPromise();
    }
    return result;
  });
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/resolve.js
async function resolveConverter(converter2) {
  if (typeof converter2 === "function") {
    return converter2();
  }
  const m_1 = await Promise.resolve().then(() => (init_edge(), edge_exports));
  return m_1.default;
}
async function resolveWrapper(wrapper) {
  if (typeof wrapper === "function") {
    return wrapper();
  }
  const m_1 = await Promise.resolve().then(() => (init_cloudflare_edge(), cloudflare_edge_exports));
  return m_1.default;
}
async function resolveOriginResolver(originResolver) {
  if (typeof originResolver === "function") {
    return originResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_pattern_env(), pattern_env_exports));
  return m_1.default;
}
async function resolveAssetResolver(assetResolver) {
  if (typeof assetResolver === "function") {
    return assetResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy(), dummy_exports));
  return m_1.default;
}
async function resolveProxyRequest(proxyRequest) {
  if (typeof proxyRequest === "function") {
    return proxyRequest();
  }
  const m_1 = await Promise.resolve().then(() => (init_fetch(), fetch_exports));
  return m_1.default;
}

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
async function createGenericHandler(handler3) {
  const config = await import("./open-next.config.mjs").then((m) => m.default);
  globalThis.openNextConfig = config;
  const handlerConfig = config[handler3.type];
  const override = handlerConfig && "override" in handlerConfig ? handlerConfig.override : void 0;
  const converter2 = await resolveConverter(override?.converter);
  const { name, wrapper } = await resolveWrapper(override?.wrapper);
  debug("Using wrapper", name);
  return wrapper(handler3.handler, converter2);
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
import crypto2 from "node:crypto";
import { parse as parseQs, stringify as stringifyQs } from "node:querystring";

// node_modules/@opennextjs/aws/dist/adapters/config/index.js
init_logger();
import path from "node:path";
globalThis.__dirname ??= "";
var NEXT_DIR = path.join(__dirname, ".next");
var OPEN_NEXT_DIR = path.join(__dirname, ".open-next");
debug({ NEXT_DIR, OPEN_NEXT_DIR });
var NextConfig = { "env": {}, "webpack": null, "typescript": { "ignoreBuildErrors": false }, "typedRoutes": false, "distDir": ".next", "cleanDistDir": true, "assetPrefix": "", "cacheMaxMemorySize": 52428800, "configOrigin": "next.config.ts", "useFileSystemPublicRoutes": true, "generateEtags": true, "pageExtensions": ["tsx", "ts", "jsx", "js"], "instrumentationClientInject": [], "poweredByHeader": true, "compress": true, "images": { "deviceSizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840], "imageSizes": [32, 48, 64, 96, 128, 256, 384], "path": "/_next/image", "loader": "default", "loaderFile": "", "domains": [], "disableStaticImages": false, "minimumCacheTTL": 14400, "formats": ["image/webp"], "maximumRedirects": 3, "maximumResponseBody": 5e7, "dangerouslyAllowLocalIP": false, "dangerouslyAllowSVG": false, "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;", "contentDispositionType": "attachment", "localPatterns": [{ "pathname": "**", "search": "" }], "remotePatterns": [{ "protocol": "https", "hostname": "images.unsplash.com" }, { "protocol": "https", "hostname": "plus.unsplash.com" }, { "protocol": "https", "hostname": "*.supabase.co" }], "qualities": [75], "unoptimized": true, "customCacheHandler": false }, "devIndicators": { "position": "bottom-left" }, "onDemandEntries": { "maxInactiveAge": 6e4, "pagesBufferLength": 5 }, "basePath": "", "sassOptions": {}, "trailingSlash": false, "i18n": null, "productionBrowserSourceMaps": false, "excludeDefaultMomentLocales": true, "reactProductionProfiling": false, "reactStrictMode": null, "reactMaxHeadersLength": 6e3, "httpAgentOptions": { "keepAlive": true }, "logging": { "serverFunctions": true, "browserToTerminal": "warn" }, "compiler": {}, "expireTime": 31536e3, "staticPageGenerationTimeout": 60, "output": "standalone", "modularizeImports": { "@mui/icons-material": { "transform": "@mui/icons-material/{{member}}" }, "lodash": { "transform": "lodash/{{member}}" } }, "outputFileTracingRoot": "C:\\Users\\lyr1csan\\Documents\\Real Estate\\zakaria-farid", "enablePrerenderSourceMaps": true, "cacheComponents": false, "cacheLife": { "default": { "stale": 300, "revalidate": 900, "expire": 4294967294 }, "seconds": { "stale": 30, "revalidate": 1, "expire": 60 }, "minutes": { "stale": 300, "revalidate": 60, "expire": 3600 }, "hours": { "stale": 300, "revalidate": 3600, "expire": 86400 }, "days": { "stale": 300, "revalidate": 86400, "expire": 604800 }, "weeks": { "stale": 300, "revalidate": 604800, "expire": 2592e3 }, "max": { "stale": 300, "revalidate": 2592e3, "expire": 31536e3 } }, "cacheHandlers": {}, "experimental": { "appNewScrollHandler": true, "coldCacheBadge": false, "devValidationWorker": true, "useSkewCookie": false, "cssChunking": true, "multiZoneDraftMode": false, "appNavFailHandling": false, "prerenderEarlyExit": true, "serverMinification": true, "linkNoTouchStart": false, "caseSensitiveRoutes": false, "cachedNavigations": false, "dynamicOnHover": false, "useOffline": false, "varyParams": true, "optimisticRouting": true, "instrumentationClientRouterTransitionEvents": false, "prefetchInlining": { "maxSize": 2048, "maxBundleSize": 10240 }, "preloadEntriesOnStart": true, "clientRouterFilter": true, "clientRouterFilterRedirects": false, "fetchCacheKeyPrefix": "", "proxyPrefetch": "flexible", "optimisticClientCache": true, "manualClientBasePath": false, "cpus": 11, "memoryBasedWorkersCount": false, "imgOptConcurrency": null, "imgOptOperationCache": null, "imgOptTimeoutInSeconds": 7, "imgOptMaxInputPixels": 268402689, "imgOptSequentialRead": null, "isrFlushToDisk": true, "workerThreads": false, "optimizeCss": false, "nextScriptWorkers": false, "scrollRestoration": false, "externalDir": false, "devMemoryThresholdRestart": true, "disableOptimizedLoading": false, "gzipSize": true, "craCompat": false, "esmExternals": true, "fullySpecified": false, "swcTraceProfiling": false, "forceSwcTransforms": false, "requestInsights": false, "largePageDataBytes": 128e3, "typedEnv": false, "parallelServerCompiles": false, "parallelServerBuildTraces": false, "ppr": false, "authInterrupts": false, "webpackMemoryOptimizations": false, "optimizeServerReact": true, "strictRouteTypes": false, "useTypeScriptCli": true, "removeUncaughtErrorAndRejectionListeners": false, "validateRSCRequestHeaders": true, "staleTimes": { "dynamic": 0, "static": 300 }, "reactDebugChannel": true, "serverComponentsHmrCache": true, "serverComponentsHmrCancellation": false, "staticGenerationMaxConcurrency": 8, "staticGenerationMinPagesPerWorker": 25, "transitionIndicator": false, "gestureTransition": false, "inlineCss": false, "useCache": false, "globalNotFound": false, "browserDebugInfoInTerminal": "warn", "lockDistDir": true, "proxyClientMaxBodySize": 10485760, "hideLogsAfterAbort": false, "mcpServer": true, "turbopackFileSystemCacheForDev": true, "turbopackFileSystemCacheForBuild": true, "turbopackInferModuleSideEffects": true, "turbopackPluginRuntimeStrategy": "childProcesses", "turbopackMemoryEvictionMode": "auto", "optimizePackageImports": ["lucide-react", "date-fns", "lodash-es", "ramda", "antd", "react-bootstrap", "ahooks", "@ant-design/icons", "@headlessui/react", "@headlessui-float/react", "@heroicons/react/20/solid", "@heroicons/react/24/solid", "@heroicons/react/24/outline", "@visx/visx", "@tremor/react", "rxjs", "@mui/material", "@mui/icons-material", "recharts", "react-use", "effect", "@effect/schema", "@effect/platform", "@effect/platform-node", "@effect/platform-browser", "@effect/platform-bun", "@effect/sql", "@effect/sql-mssql", "@effect/sql-mysql2", "@effect/sql-pg", "@effect/sql-sqlite-node", "@effect/sql-sqlite-bun", "@effect/sql-sqlite-wasm", "@effect/sql-sqlite-react-native", "@effect/rpc", "@effect/rpc-http", "@effect/typeclass", "@effect/experimental", "@effect/opentelemetry", "@material-ui/core", "@material-ui/icons", "@tabler/icons-react", "mui-core", "react-icons/ai", "react-icons/bi", "react-icons/bs", "react-icons/cg", "react-icons/ci", "react-icons/di", "react-icons/fa", "react-icons/fa6", "react-icons/fc", "react-icons/fi", "react-icons/gi", "react-icons/go", "react-icons/gr", "react-icons/hi", "react-icons/hi2", "react-icons/im", "react-icons/io", "react-icons/io5", "react-icons/lia", "react-icons/lib", "react-icons/lu", "react-icons/md", "react-icons/pi", "react-icons/ri", "react-icons/rx", "react-icons/si", "react-icons/sl", "react-icons/tb", "react-icons/tfi", "react-icons/ti", "react-icons/vsc", "react-icons/wi"], "useCacheTimeout": 54, "instantInsights": { "validationLevel": "warning" }, "trustHostHeader": false, "isExperimentalCompile": false }, "htmlLimitedBots": "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight", "bundlePagesRouterDependencies": false, "configFileName": "next.config.ts", "turbopack": { "root": "C:\\Users\\lyr1csan\\Documents\\Real Estate\\zakaria-farid", "resolveAlias": { "next-intl/config": "./src/i18n/request.ts" } }, "repoRoot": "C:\\Users\\lyr1csan\\Documents\\Real Estate\\zakaria-farid", "distDirRoot": ".next" };
var BuildId = "w8OHXbMOxEIkONBFHmvrX";
var RoutesManifest = { "basePath": "", "rewrites": { "beforeFiles": [], "afterFiles": [], "fallback": [] }, "redirects": [{ "source": "/:path+/", "destination": "/:path+", "internal": true, "priority": true, "statusCode": 308, "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$" }], "routes": { "static": [{ "page": "/_global-error", "regex": "^/_global\\-error(?:/)?$", "routeKeys": {}, "namedRegex": "^/_global\\-error(?:/)?$" }, { "page": "/_not-found", "regex": "^/_not\\-found(?:/)?$", "routeKeys": {}, "namedRegex": "^/_not\\-found(?:/)?$" }, { "page": "/admin", "regex": "^/admin(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin(?:/)?$" }, { "page": "/admin/login", "regex": "^/admin/login(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/login(?:/)?$" }, { "page": "/api/leads", "regex": "^/api/leads(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/leads(?:/)?$" }, { "page": "/api/search", "regex": "^/api/search(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/search(?:/)?$" }, { "page": "/favicon.ico", "regex": "^/favicon\\.ico(?:/)?$", "routeKeys": {}, "namedRegex": "^/favicon\\.ico(?:/)?$" }, { "page": "/maintenance", "regex": "^/maintenance(?:/)?$", "routeKeys": {}, "namedRegex": "^/maintenance(?:/)?$" }, { "page": "/robots.txt", "regex": "^/robots\\.txt(?:/)?$", "routeKeys": {}, "namedRegex": "^/robots\\.txt(?:/)?$" }, { "page": "/sitemap.xml", "regex": "^/sitemap\\.xml(?:/)?$", "routeKeys": {}, "namedRegex": "^/sitemap\\.xml(?:/)?$" }], "dynamic": [{ "page": "/admin/[adminLocale]", "regex": "^/admin/([^/]+?)(?:/)?$", "routeKeys": { "nxtPadminLocale": "nxtPadminLocale" }, "namedRegex": "^/admin/(?<nxtPadminLocale>[^/]+?)(?:/)?$" }, { "page": "/admin/[adminLocale]/leads", "regex": "^/admin/([^/]+?)/leads(?:/)?$", "routeKeys": { "nxtPadminLocale": "nxtPadminLocale" }, "namedRegex": "^/admin/(?<nxtPadminLocale>[^/]+?)/leads(?:/)?$" }, { "page": "/admin/[adminLocale]/properties", "regex": "^/admin/([^/]+?)/properties(?:/)?$", "routeKeys": { "nxtPadminLocale": "nxtPadminLocale" }, "namedRegex": "^/admin/(?<nxtPadminLocale>[^/]+?)/properties(?:/)?$" }, { "page": "/admin/[adminLocale]/properties/new", "regex": "^/admin/([^/]+?)/properties/new(?:/)?$", "routeKeys": { "nxtPadminLocale": "nxtPadminLocale" }, "namedRegex": "^/admin/(?<nxtPadminLocale>[^/]+?)/properties/new(?:/)?$" }, { "page": "/admin/[adminLocale]/properties/[id]/edit", "regex": "^/admin/([^/]+?)/properties/([^/]+?)/edit(?:/)?$", "routeKeys": { "nxtPadminLocale": "nxtPadminLocale", "nxtPid": "nxtPid" }, "namedRegex": "^/admin/(?<nxtPadminLocale>[^/]+?)/properties/(?<nxtPid>[^/]+?)/edit(?:/)?$" }, { "page": "/[locale]", "regex": "^/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)(?:/)?$" }, { "page": "/[locale]/about", "regex": "^/([^/]+?)/about(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/about(?:/)?$" }, { "page": "/[locale]/contact", "regex": "^/([^/]+?)/contact(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/contact(?:/)?$" }, { "page": "/[locale]/map", "regex": "^/([^/]+?)/map(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/map(?:/)?$" }, { "page": "/[locale]/properties", "regex": "^/([^/]+?)/properties(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/properties(?:/)?$" }, { "page": "/[locale]/properties/compare", "regex": "^/([^/]+?)/properties/compare(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/properties/compare(?:/)?$" }, { "page": "/[locale]/properties/[slug]", "regex": "^/([^/]+?)/properties/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPslug": "nxtPslug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/properties/(?<nxtPslug>[^/]+?)(?:/)?$" }], "data": { "static": [], "dynamic": [] } }, "locales": [] };
var ConfigHeaders = [];
var PrerenderManifest = { "version": 4, "routes": { "/_global-error": { "routeType": "page", "response": "complete", "compute": "static", "htmlSize": 9294, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_global-error", "dataRoute": "/_global-error.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/_not-found": { "initialStatus": 404, "routeType": "page", "response": "complete", "compute": "static", "htmlSize": 8210, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_not-found", "dataRoute": "/_not-found.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/admin": { "routeType": "page", "response": "complete", "compute": "static", "htmlSize": 6292, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/admin", "dataRoute": "/admin.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/admin/login": { "routeType": "page", "response": "complete", "compute": "static", "htmlSize": 12632, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/admin/login", "dataRoute": "/admin/login.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/favicon.ico": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/x-icon", "x-next-cache-tags": "_N_T_/layout,_N_T_/favicon.ico/layout,_N_T_/favicon.ico/route,_N_T_/favicon.ico" }, "routeType": "route", "response": "complete", "compute": "static", "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/favicon.ico", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/robots.txt": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "text/plain", "x-next-cache-tags": "_N_T_/layout,_N_T_/robots.txt/layout,_N_T_/robots.txt/route,_N_T_/robots.txt" }, "routeType": "route", "response": "complete", "compute": "static", "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/robots.txt", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sitemap.xml": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "application/xml", "x-next-cache-tags": "_N_T_/layout,_N_T_/sitemap.xml/layout,_N_T_/sitemap.xml/route,_N_T_/sitemap.xml" }, "routeType": "route", "response": "complete", "compute": "static", "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/sitemap.xml", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "dynamicRoutes": {}, "notFoundRoutes": [], "preview": { "previewModeId": "a75951c0661eebb3667cac746699f9a1", "previewModeSigningKey": "90e3de8a0a864a093602a7a65f0e3b49a29bb6f32b7d23daaaaec03053522ba1", "previewModeEncryptionKey": "bb65adb7466a4d7aa70d0048a5c8fb0e9ca5151c5a226a82540dce562071733a" } };
var MiddlewareManifest = { "version": 3, "middleware": { "/": { "files": ["server/edge/chunks/node_modules_next_dist_esm_build_templates_edge-wrapper_0_kjzx3.js", "server/edge/chunks/[root-of-the-server]__0z5ie0n._.js", "server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_1hoef-8.js"], "name": "middleware", "page": "/", "entrypoint": "server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_1hoef-8.js", "matchers": [{ "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!api|_next|_vercel|.*\\..*).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$", "originalSource": "/((?!api|_next|_vercel|.*\\..*).*)" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "w8OHXbMOxEIkONBFHmvrX", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "tfpMURYqL7Sk30/0At8V67j6xLYXgdv6s7XIJJskDNc=", "__NEXT_PREVIEW_MODE_ID": "a75951c0661eebb3667cac746699f9a1", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "bb65adb7466a4d7aa70d0048a5c8fb0e9ca5151c5a226a82540dce562071733a", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "90e3de8a0a864a093602a7a65f0e3b49a29bb6f32b7d23daaaaec03053522ba1" } } }, "sortedMiddleware": ["/"], "functions": {} };
var AppPathRoutesManifest = { "/[locale]/about/page": "/[locale]/about", "/[locale]/contact/page": "/[locale]/contact", "/[locale]/map/page": "/[locale]/map", "/[locale]/page": "/[locale]", "/[locale]/properties/[slug]/page": "/[locale]/properties/[slug]", "/[locale]/properties/compare/page": "/[locale]/properties/compare", "/[locale]/properties/page": "/[locale]/properties", "/_global-error/page": "/_global-error", "/_not-found/page": "/_not-found", "/admin/(dashboard)/[adminLocale]/(dashboard-pages)/leads/page": "/admin/[adminLocale]/leads", "/admin/(dashboard)/[adminLocale]/(dashboard-pages)/page": "/admin/[adminLocale]", "/admin/(dashboard)/[adminLocale]/(dashboard-pages)/properties/[id]/edit/page": "/admin/[adminLocale]/properties/[id]/edit", "/admin/(dashboard)/[adminLocale]/(dashboard-pages)/properties/new/page": "/admin/[adminLocale]/properties/new", "/admin/(dashboard)/[adminLocale]/(dashboard-pages)/properties/page": "/admin/[adminLocale]/properties", "/admin/login/page": "/admin/login", "/admin/page": "/admin", "/api/leads/route": "/api/leads", "/api/search/route": "/api/search", "/favicon.ico/route": "/favicon.ico", "/maintenance/page": "/maintenance", "/robots.txt/route": "/robots.txt", "/sitemap.xml/route": "/sitemap.xml" };
var FunctionsConfigManifest = { "version": 1, "functions": {} };
var PagesManifest = { "/404": "pages/404.html", "/500": "pages/500.html" };
process.env.NEXT_BUILD_ID = BuildId;
process.env.OPEN_NEXT_BUILD_ID = NextConfig.deploymentId ?? BuildId;
process.env.NEXT_PREVIEW_MODE_ID = PrerenderManifest?.preview?.previewModeId;

// node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_logger();
init_util();
import { Transform } from "node:stream";

// node_modules/@opennextjs/aws/dist/core/routing/util.js
init_util();
init_logger();
import { ReadableStream as ReadableStream3 } from "node:stream/web";

// node_modules/@opennextjs/aws/dist/utils/binary.js
var commonBinaryMimeTypes = /* @__PURE__ */ new Set([
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/wavaudio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
  // Serialized data
  "application/x-protobuf"
]);
function isBinaryContentType(contentType) {
  if (!contentType)
    return false;
  const value = contentType.split(";")[0];
  return commonBinaryMimeTypes.has(value);
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/i18n/accept-header.js
function parse(raw, preferences, options) {
  const lowers = /* @__PURE__ */ new Map();
  const header = raw.replace(/[ \t]/g, "");
  if (preferences) {
    let pos = 0;
    for (const preference of preferences) {
      const lower = preference.toLowerCase();
      lowers.set(lower, { orig: preference, pos: pos++ });
      if (options.prefixMatch) {
        const parts2 = lower.split("-");
        while (parts2.pop(), parts2.length > 0) {
          const joined = parts2.join("-");
          if (!lowers.has(joined)) {
            lowers.set(joined, { orig: preference, pos: pos++ });
          }
        }
      }
    }
  }
  const parts = header.split(",");
  const selections = [];
  const map = /* @__PURE__ */ new Set();
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const params = part.split(";");
    if (params.length > 2) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const token = params[0].toLowerCase();
    if (!token) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const selection = { token, pos: i, q: 1 };
    if (preferences && lowers.has(token)) {
      selection.pref = lowers.get(token).pos;
    }
    map.add(selection.token);
    if (params.length === 2) {
      const q = params[1];
      const [key, value] = q.split("=");
      if (!value || key !== "q" && key !== "Q") {
        throw new Error(`Invalid ${options.type} header`);
      }
      const score = Number.parseFloat(value);
      if (score === 0) {
        continue;
      }
      if (Number.isFinite(score) && score <= 1 && score >= 1e-3) {
        selection.q = score;
      }
    }
    selections.push(selection);
  }
  selections.sort((a, b) => {
    if (b.q !== a.q) {
      return b.q - a.q;
    }
    if (b.pref !== a.pref) {
      if (a.pref === void 0) {
        return 1;
      }
      if (b.pref === void 0) {
        return -1;
      }
      return a.pref - b.pref;
    }
    return a.pos - b.pos;
  });
  const values = selections.map((selection) => selection.token);
  if (!preferences || !preferences.length) {
    return values;
  }
  const preferred = [];
  for (const selection of values) {
    if (selection === "*") {
      for (const [preference, value] of lowers) {
        if (!map.has(preference)) {
          preferred.push(value.orig);
        }
      }
    } else {
      const lower = selection.toLowerCase();
      if (lowers.has(lower)) {
        preferred.push(lowers.get(lower).orig);
      }
    }
  }
  return preferred;
}
function acceptLanguage(header = "", preferences) {
  return parse(header, preferences, {
    type: "accept-language",
    prefixMatch: true
  })[0] || void 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
function isLocalizedPath(path3) {
  return NextConfig.i18n?.locales.includes(path3.split("/")[1].toLowerCase()) ?? false;
}
function getLocaleFromCookie(cookies) {
  const i18n = NextConfig.i18n;
  const nextLocale = cookies.NEXT_LOCALE?.toLowerCase();
  return nextLocale ? i18n?.locales.find((locale) => nextLocale === locale.toLowerCase()) : void 0;
}
function detectDomainLocale({ hostname, detectedLocale }) {
  const i18n = NextConfig.i18n;
  const domains = i18n?.domains;
  if (!domains) {
    return;
  }
  const lowercasedLocale = detectedLocale?.toLowerCase();
  for (const domain of domains) {
    const domainHostname = domain.domain.split(":", 1)[0].toLowerCase();
    if (hostname === domainHostname || lowercasedLocale === domain.defaultLocale.toLowerCase() || domain.locales?.some((locale) => lowercasedLocale === locale.toLowerCase())) {
      return domain;
    }
  }
}
function detectLocale(internalEvent, i18n) {
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  if (i18n.localeDetection === false) {
    return domainLocale?.defaultLocale ?? i18n.defaultLocale;
  }
  const cookiesLocale = getLocaleFromCookie(internalEvent.cookies);
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  debug({
    cookiesLocale,
    preferredLocale,
    defaultLocale: i18n.defaultLocale,
    domainLocale
  });
  return domainLocale?.defaultLocale ?? cookiesLocale ?? preferredLocale ?? i18n.defaultLocale;
}
function localizePath(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n) {
    return internalEvent.rawPath;
  }
  if (isLocalizedPath(internalEvent.rawPath)) {
    return internalEvent.rawPath;
  }
  const detectedLocale = detectLocale(internalEvent, i18n);
  return `/${detectedLocale}${internalEvent.rawPath}`;
}
function handleLocaleRedirect(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n || i18n.localeDetection === false || internalEvent.rawPath !== "/") {
    return false;
  }
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  const detectedLocale = detectLocale(internalEvent, i18n);
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  const preferredDomain = detectDomainLocale({
    detectedLocale: preferredLocale
  });
  if (domainLocale && preferredDomain) {
    const isPDomain = preferredDomain.domain === domainLocale.domain;
    const isPLocale = preferredDomain.defaultLocale === preferredLocale;
    if (!isPDomain || !isPLocale) {
      const scheme = `http${preferredDomain.http ? "" : "s"}`;
      const rlocale = isPLocale ? "" : preferredLocale;
      return {
        type: "core",
        statusCode: 307,
        headers: {
          Location: `${scheme}://${preferredDomain.domain}/${rlocale}`
        },
        body: emptyReadableStream(),
        isBase64Encoded: false
      };
    }
  }
  const defaultLocale = domainLocale?.defaultLocale ?? i18n.defaultLocale;
  if (detectedLocale.toLowerCase() !== defaultLocale.toLowerCase()) {
    const nextUrl = constructNextUrl(internalEvent.url, `/${detectedLocale}${NextConfig.trailingSlash ? "/" : ""}`);
    const queryString = convertToQueryString(internalEvent.query);
    return {
      type: "core",
      statusCode: 307,
      headers: {
        Location: `${nextUrl}${queryString}`
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}

// node_modules/@opennextjs/aws/dist/core/routing/queue.js
function generateShardId(rawPath, maxConcurrency, prefix) {
  let a = cyrb128(rawPath);
  let t = a += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const randomFloat = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const randomInt = Math.floor(randomFloat * maxConcurrency);
  return `${prefix}-${randomInt}`;
}
function generateMessageGroupId(rawPath) {
  const maxConcurrency = Number.parseInt(process.env.MAX_REVALIDATE_CONCURRENCY ?? "10");
  return generateShardId(rawPath, maxConcurrency, "revalidate");
}
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
  h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
  h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
  h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
  h1 ^= h2 ^ h3 ^ h4, h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return h1 >>> 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
function isExternal(url, host) {
  if (!url)
    return false;
  const pattern = /^https?:\/\//;
  if (!pattern.test(url))
    return false;
  if (host) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.host !== host;
    } catch {
      return !url.includes(host);
    }
  }
  return true;
}
function convertFromQueryString(query) {
  if (query === "")
    return {};
  const queryParts = query.split("&");
  return getQueryFromIterator(queryParts.map((p) => {
    const [key, value] = p.split("=");
    return [key, value];
  }));
}
function getUrlParts(url, isExternal2) {
  if (!isExternal2) {
    const regex2 = /\/([^?]*)\??(.*)/;
    const match3 = url.match(regex2);
    return {
      hostname: "",
      pathname: match3?.[1] ? `/${match3[1]}` : url,
      protocol: "",
      queryString: match3?.[2] ?? ""
    };
  }
  const regex = /^(https?:)\/\/?([^\/\s]+)(\/[^?]*)?(\?.*)?/;
  const match2 = url.match(regex);
  if (!match2) {
    throw new Error(`Invalid external URL: ${url}`);
  }
  return {
    protocol: match2[1] ?? "https:",
    hostname: match2[2],
    pathname: match2[3] ?? "",
    queryString: match2[4]?.slice(1) ?? ""
  };
}
function constructNextUrl(baseUrl, path3) {
  const nextBasePath = NextConfig.basePath ?? "";
  const url = new URL(`${nextBasePath}${path3}`, baseUrl);
  return url.href;
}
function convertToQueryString(query) {
  const queryStrings = [];
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => queryStrings.push(`${key}=${entry}`));
    } else {
      queryStrings.push(`${key}=${value}`);
    }
  });
  return queryStrings.length > 0 ? `?${queryStrings.join("&")}` : "";
}
function getMiddlewareMatch(middlewareManifest2, functionsManifest) {
  if (functionsManifest?.functions?.["/_middleware"]) {
    return functionsManifest.functions["/_middleware"].matchers?.map(({ regexp }) => new RegExp(regexp)) ?? [/.*/];
  }
  const rootMiddleware = middlewareManifest2.middleware["/"];
  if (!rootMiddleware?.matchers)
    return [];
  return rootMiddleware.matchers.map(({ regexp }) => new RegExp(regexp));
}
function escapeRegex(str, { isPath } = {}) {
  const result = str.replaceAll("(.)", "_\xB51_").replaceAll("(..)", "_\xB52_").replaceAll("(...)", "_\xB53_");
  return isPath ? result : result.replaceAll("+", "_\xB54_");
}
function unescapeRegex(str) {
  return str.replaceAll("_\xB51_", "(.)").replaceAll("_\xB52_", "(..)").replaceAll("_\xB53_", "(...)").replaceAll("_\xB54_", "+");
}
function convertBodyToReadableStream(method, body) {
  if (method === "GET" || method === "HEAD")
    return void 0;
  if (!body)
    return void 0;
  return new ReadableStream3({
    start(controller) {
      controller.enqueue(body);
      controller.close();
    }
  });
}
var CommonHeaders;
(function(CommonHeaders2) {
  CommonHeaders2["CACHE_CONTROL"] = "cache-control";
  CommonHeaders2["NEXT_CACHE"] = "x-nextjs-cache";
})(CommonHeaders || (CommonHeaders = {}));
function normalizeLocationHeader(location, baseUrl, encodeQuery = false) {
  if (!URL.canParse(location)) {
    return location;
  }
  const locationURL = new URL(location);
  const origin = new URL(baseUrl).origin;
  let search = locationURL.search;
  if (encodeQuery && search) {
    search = `?${stringifyQs(parseQs(search.slice(1)))}`;
  }
  const href = `${locationURL.origin}${locationURL.pathname}${search}${locationURL.hash}`;
  if (locationURL.origin === origin) {
    return href.slice(origin.length);
  }
  return href;
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
import { createHash } from "node:crypto";
init_stream();

// node_modules/@opennextjs/aws/dist/utils/cache.js
init_logger();

// node_modules/@opennextjs/aws/dist/utils/semver.js
function compareSemver(v1, operator, v2) {
  let versionDiff = 0;
  if (v1 === "latest") {
    versionDiff = 1;
  } else {
    if (/^[^\d]/.test(v1)) {
      v1 = v1.substring(1);
    }
    if (/^[^\d]/.test(v2)) {
      v2 = v2.substring(1);
    }
    const [major1, minor1 = 0, patch1 = 0] = v1.split(".").map(Number);
    const [major2, minor2 = 0, patch2 = 0] = v2.split(".").map(Number);
    if (Number.isNaN(major1) || Number.isNaN(major2)) {
      throw new Error("The major version is required.");
    }
    if (major1 !== major2) {
      versionDiff = major1 - major2;
    } else if (minor1 !== minor2) {
      versionDiff = minor1 - minor2;
    } else if (patch1 !== patch2) {
      versionDiff = patch1 - patch2;
    }
  }
  switch (operator) {
    case "=":
      return versionDiff === 0;
    case ">=":
      return versionDiff >= 0;
    case "<=":
      return versionDiff <= 0;
    case ">":
      return versionDiff > 0;
    case "<":
      return versionDiff < 0;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

// node_modules/@opennextjs/aws/dist/utils/cache.js
async function isStale(key, tags, lastModified) {
  if (!compareSemver(globalThis.nextVersion, ">=", "16.0.0")) {
    return false;
  }
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  if (globalThis.tagCache.mode === "nextMode") {
    return tags.length === 0 ? false : await globalThis.tagCache.isStale?.(tags, lastModified) ?? false;
  }
  return await globalThis.tagCache.isStale?.(key, lastModified) ?? false;
}
async function hasBeenRevalidated(key, tags, cacheEntry) {
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  const value = cacheEntry.value;
  if (!value) {
    return true;
  }
  if ("type" in cacheEntry && cacheEntry.type === "page") {
    return false;
  }
  const lastModified = cacheEntry.lastModified ?? Date.now();
  if (globalThis.tagCache.mode === "nextMode") {
    return tags.length === 0 ? false : await globalThis.tagCache.hasBeenRevalidated(tags, lastModified);
  }
  const _lastModified = await globalThis.tagCache.getLastModified(key, lastModified);
  return _lastModified === -1;
}
function getTagsFromValue(value) {
  if (!value) {
    return [];
  }
  try {
    const cacheTags = value.meta?.headers?.["x-next-cache-tags"]?.split(",") ?? [];
    delete value.meta?.headers?.["x-next-cache-tags"];
    return cacheTags;
  } catch (e) {
    return [];
  }
}

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_logger();
var CACHE_ONE_YEAR = 60 * 60 * 24 * 365;
var CACHE_ONE_MONTH = 60 * 60 * 24 * 30;
var VARY_HEADER = "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url";
var NEXT_SEGMENT_PREFETCH_HEADER = "next-router-segment-prefetch";
var NEXT_PRERENDER_HEADER = "x-nextjs-prerender";
var NEXT_POSTPONED_HEADER = "x-nextjs-postponed";
async function computeCacheControl(path3, body, host, revalidate, lastModified, isStaleFromTagCache = false) {
  let finalRevalidate = CACHE_ONE_YEAR;
  const existingRoute = Object.entries(PrerenderManifest?.routes ?? {}).find((p) => p[0] === path3)?.[1];
  if (revalidate === void 0 && existingRoute) {
    finalRevalidate = existingRoute.initialRevalidateSeconds === false ? CACHE_ONE_YEAR : existingRoute.initialRevalidateSeconds;
  } else if (revalidate !== void 0) {
    finalRevalidate = revalidate === false ? CACHE_ONE_YEAR : revalidate;
  }
  const age = Math.round((Date.now() - (lastModified ?? 0)) / 1e3);
  const hash = (str) => createHash("md5").update(str).digest("hex");
  const etag = hash(body);
  if (revalidate === 0) {
    return {
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "x-opennext-cache": "ERROR",
      etag
    };
  }
  const isSSG = finalRevalidate === CACHE_ONE_YEAR;
  const remainingTtl = Math.max(finalRevalidate - age, 1);
  const isStaleFromTime = !isSSG && remainingTtl === 1;
  const isStale2 = isStaleFromTime || isStaleFromTagCache;
  if (!isSSG || isStaleFromTagCache) {
    const sMaxAge = isStaleFromTagCache ? 1 : remainingTtl;
    debug("sMaxAge", {
      finalRevalidate,
      age,
      lastModified,
      revalidate,
      isStaleFromTagCache
    });
    if (isStale2) {
      let url = NextConfig.trailingSlash ? `${path3}/` : path3;
      if (NextConfig.basePath) {
        url = `${NextConfig.basePath}${url}`;
      }
      await globalThis.queue.send({
        MessageBody: {
          host,
          url,
          eTag: etag,
          lastModified: lastModified ?? Date.now()
        },
        MessageDeduplicationId: hash(`${path3}-${lastModified}-${etag}`),
        MessageGroupId: generateMessageGroupId(path3)
      });
    }
    return {
      "cache-control": `s-maxage=${sMaxAge}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
      "x-opennext-cache": isStale2 ? "STALE" : "HIT",
      etag
    };
  }
  return {
    "cache-control": `s-maxage=${CACHE_ONE_YEAR}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
    "x-opennext-cache": "HIT",
    etag
  };
}
function getBodyForAppRouter(event, cachedValue) {
  if (cachedValue.type !== "app") {
    throw new Error("getBodyForAppRouter called with non-app cache value");
  }
  try {
    const segmentHeader = `${event.headers[NEXT_SEGMENT_PREFETCH_HEADER]}`;
    const isSegmentResponse = Boolean(segmentHeader) && segmentHeader in (cachedValue.segmentData || {}) && !NextConfig.experimental?.prefetchInlining;
    const body = isSegmentResponse ? cachedValue.segmentData[segmentHeader] : cachedValue.rsc;
    return {
      body,
      additionalHeaders: isSegmentResponse ? { [NEXT_PRERENDER_HEADER]: "1", [NEXT_POSTPONED_HEADER]: "2" } : {}
    };
  } catch (e) {
    error("Error while getting body for app router from cache:", e);
    return { body: cachedValue.rsc, additionalHeaders: {} };
  }
}
async function generateResult(event, localizedPath, cachedValue, lastModified, isStaleFromTagCache = false) {
  debug("Returning result from experimental cache");
  let body = "";
  let type = "application/octet-stream";
  let isDataRequest = false;
  let additionalHeaders = {};
  if (cachedValue.type === "app") {
    isDataRequest = event.headers.rsc === "1";
    if (isDataRequest) {
      const { body: appRouterBody, additionalHeaders: appHeaders } = getBodyForAppRouter(event, cachedValue);
      body = appRouterBody;
      additionalHeaders = appHeaders;
    } else {
      body = cachedValue.html;
    }
    type = isDataRequest ? "text/x-component" : "text/html; charset=utf-8";
  } else if (cachedValue.type === "page") {
    isDataRequest = Boolean(event.query.__nextDataReq);
    body = isDataRequest ? JSON.stringify(cachedValue.json) : cachedValue.html;
    type = isDataRequest ? "application/json" : "text/html; charset=utf-8";
  } else {
    throw new Error("generateResult called with unsupported cache value type, only 'app' and 'page' are supported");
  }
  const cacheControl = await computeCacheControl(localizedPath, body, event.headers.host, cachedValue.revalidate, lastModified, isStaleFromTagCache);
  return {
    type: "core",
    // Sometimes other status codes can be cached, like 404. For these cases, we should return the correct status code
    // Also set the status code to the rewriteStatusCode if defined
    // This can happen in handleMiddleware in routingHandler.
    // `NextResponse.rewrite(url, { status: xxx})
    // The rewrite status code should take precedence over the cached one
    statusCode: event.rewriteStatusCode ?? cachedValue.meta?.status ?? 200,
    body: toReadableStream(body, false),
    isBase64Encoded: false,
    headers: {
      ...cacheControl,
      "content-type": type,
      ...cachedValue.meta?.headers,
      vary: VARY_HEADER,
      ...additionalHeaders
    }
  };
}
function escapePathDelimiters(segment, escapeEncoded) {
  return segment.replace(new RegExp(`([/#?]${escapeEncoded ? "|%(2f|23|3f|5c)" : ""})`, "gi"), (char) => encodeURIComponent(char));
}
function decodePathParams(pathname) {
  return pathname.split("/").map((segment) => escapePathDelimiters(decodeURIComponent(segment), true)).join("/");
}
async function cacheInterceptor(event) {
  if (Boolean(event.headers["next-action"]) || Boolean(event.headers["x-prerender-revalidate"]))
    return event;
  const cookies = event.headers.cookie || "";
  const hasPreviewData = cookies.includes("__prerender_bypass") || cookies.includes("__next_preview_data");
  if (hasPreviewData) {
    debug("Preview mode detected, passing through to handler");
    return event;
  }
  let localizedPath = localizePath(event);
  if (NextConfig.basePath) {
    localizedPath = localizedPath.replace(NextConfig.basePath, "");
  }
  localizedPath = localizedPath.replace(/\/$/, "");
  try {
    localizedPath = decodePathParams(localizedPath) || "/";
  } catch {
    return event;
  }
  const cacheKey = localizedPath === "/" ? "/index" : localizedPath;
  debug("Checking cache for", localizedPath, PrerenderManifest);
  const isISR = Object.keys(PrerenderManifest?.routes ?? {}).includes(localizedPath) || Object.values(PrerenderManifest?.dynamicRoutes ?? {}).some((dr) => new RegExp(dr.routeRegex).test(localizedPath));
  debug("isISR", isISR);
  if (isISR) {
    try {
      const cachedData = await globalThis.incrementalCache.get(cacheKey);
      debug("cached data in interceptor", cachedData);
      if (!cachedData?.value) {
        return event;
      }
      const tags = getTagsFromValue(cachedData.value);
      if (cachedData.value?.type === "app" || cachedData.value?.type === "route") {
        const _hasBeenRevalidated = cachedData.shouldBypassTagCache ? false : await hasBeenRevalidated(cacheKey, tags, cachedData);
        if (_hasBeenRevalidated) {
          return event;
        }
      }
      const _isStale = cachedData.shouldBypassTagCache ? false : await isStale(cacheKey, tags, cachedData.lastModified ?? Date.now());
      const host = event.headers.host;
      switch (cachedData?.value?.type) {
        case "app":
        case "page":
          return generateResult(event, localizedPath, cachedData.value, cachedData.lastModified, _isStale);
        case "redirect": {
          const cacheControl = await computeCacheControl(localizedPath, "", host, cachedData.value.revalidate, cachedData.lastModified, _isStale);
          return {
            type: "core",
            statusCode: cachedData.value.meta?.status ?? 307,
            body: emptyReadableStream(),
            headers: {
              ...cachedData.value.meta?.headers ?? {},
              ...cacheControl
            },
            isBase64Encoded: false
          };
        }
        case "route": {
          const cacheControl = await computeCacheControl(localizedPath, cachedData.value.body, host, cachedData.value.revalidate, cachedData.lastModified, _isStale);
          const isBinary = isBinaryContentType(String(cachedData.value.meta?.headers?.["content-type"]));
          return {
            type: "core",
            statusCode: event.rewriteStatusCode ?? cachedData.value.meta?.status ?? 200,
            body: toReadableStream(cachedData.value.body, isBinary),
            headers: {
              ...cacheControl,
              ...cachedData.value.meta?.headers,
              vary: VARY_HEADER
            },
            isBase64Encoded: isBinary
          };
        }
        default:
          return event;
      }
    } catch (e) {
      debug("Error while fetching cache", e);
      return event;
    }
  }
  return event;
}

// node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path3 = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  var isSafe = function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  };
  var safePattern = function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path3 += prefix;
        prefix = "";
      }
      if (path3) {
        result.push(path3);
        path3 = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path3 += value;
      continue;
    }
    if (path3) {
      result.push(path3);
      path3 = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function compile(str, options) {
  return tokensToFunction(parse2(str, options), options);
}
function tokensToFunction(tokens, options) {
  if (options === void 0) {
    options = {};
  }
  var reFlags = flags(options);
  var _a = options.encode, encode = _a === void 0 ? function(x) {
    return x;
  } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
  var matches = tokens.map(function(token) {
    if (typeof token === "object") {
      return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
    }
  });
  return function(data) {
    var path3 = "";
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (typeof token === "string") {
        path3 += token;
        continue;
      }
      var value = data ? data[token.name] : void 0;
      var optional = token.modifier === "?" || token.modifier === "*";
      var repeat = token.modifier === "*" || token.modifier === "+";
      if (Array.isArray(value)) {
        if (!repeat) {
          throw new TypeError('Expected "'.concat(token.name, '" to not repeat, but got an array'));
        }
        if (value.length === 0) {
          if (optional)
            continue;
          throw new TypeError('Expected "'.concat(token.name, '" to not be empty'));
        }
        for (var j = 0; j < value.length; j++) {
          var segment = encode(value[j], token);
          if (validate && !matches[i].test(segment)) {
            throw new TypeError('Expected all "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
          }
          path3 += token.prefix + segment + token.suffix;
        }
        continue;
      }
      if (typeof value === "string" || typeof value === "number") {
        var segment = encode(String(value), token);
        if (validate && !matches[i].test(segment)) {
          throw new TypeError('Expected "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
        }
        path3 += token.prefix + segment + token.suffix;
        continue;
      }
      if (optional)
        continue;
      var typeOfMessage = repeat ? "an array" : "a string";
      throw new TypeError('Expected "'.concat(token.name, '" to be ').concat(typeOfMessage));
    }
    return path3;
  };
}
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path3 = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path: path3, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path3, keys) {
  if (!keys)
    return path3;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path3.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path3.source);
  }
  return path3;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path3) {
    return pathToRegexp(path3, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path3, keys, options) {
  return tokensToRegexp(parse2(path3, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path3, keys, options) {
  if (path3 instanceof RegExp)
    return regexpToRegexp(path3, keys);
  if (Array.isArray(path3))
    return arrayToRegexp(path3, keys, options);
  return stringToRegexp(path3, keys, options);
}

// node_modules/@opennextjs/aws/dist/utils/normalize-path.js
import path2 from "node:path";
function normalizeRepeatedSlashes(url) {
  const urlNoQuery = url.host + url.pathname;
  return `${url.protocol}//${urlNoQuery.replace(/\\/g, "/").replace(/\/\/+/g, "/")}${url.search}`;
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/routeMatcher.js
var optionalLocalePrefixRegex = `^/(?:${RoutesManifest.locales.map((locale) => `${locale}/?`).join("|")})?`;
var optionalBasepathPrefixRegex = RoutesManifest.basePath ? `^${RoutesManifest.basePath}/?` : "^/";
var optionalPrefix = optionalLocalePrefixRegex.replace("^/", optionalBasepathPrefixRegex);
function routeMatcher(routeDefinitions) {
  const regexp = routeDefinitions.map((route) => ({
    page: route.page,
    regexp: new RegExp(route.regex.replace("^/", optionalPrefix))
  }));
  const appPathsSet = /* @__PURE__ */ new Set();
  const routePathsSet = /* @__PURE__ */ new Set();
  for (const [k, v] of Object.entries(AppPathRoutesManifest)) {
    if (k.endsWith("page")) {
      appPathsSet.add(v);
    } else if (k.endsWith("route")) {
      routePathsSet.add(v);
    }
  }
  return function matchRoute(path3) {
    const foundRoutes = regexp.filter((route) => route.regexp.test(path3));
    return foundRoutes.map((foundRoute) => {
      let routeType = "page";
      if (appPathsSet.has(foundRoute.page)) {
        routeType = "app";
      } else if (routePathsSet.has(foundRoute.page)) {
        routeType = "route";
      }
      return {
        route: foundRoute.page,
        type: routeType
      };
    });
  };
}
var staticRouteMatcher = routeMatcher([
  ...RoutesManifest.routes.static,
  ...getStaticAPIRoutes()
]);
var dynamicRouteMatcher = routeMatcher(RoutesManifest.routes.dynamic);
function getStaticAPIRoutes() {
  const createRouteDefinition = (route) => ({
    page: route,
    regex: `^${route}(?:/)?$`
  });
  const dynamicRoutePages = new Set(RoutesManifest.routes.dynamic.map(({ page }) => page));
  const pagesStaticAPIRoutes = Object.keys(PagesManifest).filter((route) => route.startsWith("/api/") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  const appPathsStaticAPIRoutes = Object.values(AppPathRoutesManifest).filter((route) => (route.startsWith("/api/") || route === "/api") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  return [...pagesStaticAPIRoutes, ...appPathsStaticAPIRoutes];
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
var routeHasMatcher = (headers, cookies, query) => (redirect) => {
  switch (redirect.type) {
    case "header":
      return !!headers?.[redirect.key.toLowerCase()] && new RegExp(redirect.value ?? "").test(headers[redirect.key.toLowerCase()] ?? "");
    case "cookie":
      return !!cookies?.[redirect.key] && new RegExp(redirect.value ?? "").test(cookies[redirect.key] ?? "");
    case "query":
      return query[redirect.key] && Array.isArray(redirect.value) ? redirect.value.reduce((prev, current) => prev || new RegExp(current).test(query[redirect.key]), false) : new RegExp(redirect.value ?? "").test(query[redirect.key] ?? "");
    case "host":
      return headers?.host !== "" && new RegExp(redirect.value ?? "").test(headers.host);
    default:
      return false;
  }
};
function checkHas(matcher, has, inverted = false) {
  return has ? has.reduce((acc, cur) => {
    if (acc === false)
      return false;
    return inverted ? !matcher(cur) : matcher(cur);
  }, true) : true;
}
var getParamsFromSource = (source) => (value) => {
  debug("value", value);
  const _match = source(value);
  return _match ? _match.params : {};
};
var computeParamHas = (headers, cookies, query) => (has) => {
  if (!has.value)
    return {};
  const matcher = new RegExp(`^${has.value}$`);
  const fromSource = (value) => {
    const matches = value.match(matcher);
    return matches?.groups ?? {};
  };
  switch (has.type) {
    case "header":
      return fromSource(headers[has.key.toLowerCase()] ?? "");
    case "cookie":
      return fromSource(cookies[has.key] ?? "");
    case "query":
      return Array.isArray(query[has.key]) ? fromSource(query[has.key].join(",")) : fromSource(query[has.key] ?? "");
    case "host":
      return fromSource(headers.host ?? "");
  }
};
function convertMatch(match2, toDestination, destination) {
  if (!match2) {
    return destination;
  }
  const { params } = match2;
  const isUsingParams = Object.keys(params).length > 0;
  return isUsingParams ? toDestination(params) : destination;
}
function getNextConfigHeaders(event, configHeaders) {
  if (!configHeaders) {
    return {};
  }
  const matcher = routeHasMatcher(event.headers, event.cookies, event.query);
  const requestHeaders = {};
  const localizedRawPath = localizePath(event);
  for (const { headers, has, missing, regex, source, locale } of configHeaders) {
    const path3 = locale === false ? event.rawPath : localizedRawPath;
    if (new RegExp(regex).test(path3) && checkHas(matcher, has) && checkHas(matcher, missing, true)) {
      const fromSource = match(source);
      const _match = fromSource(path3);
      headers.forEach((h) => {
        try {
          const key = convertMatch(_match, compile(h.key), h.key);
          const value = convertMatch(_match, compile(h.value), h.value);
          requestHeaders[key] = value;
        } catch {
          debug(`Error matching header ${h.key} with value ${h.value}`);
          requestHeaders[h.key] = h.value;
        }
      });
    }
  }
  return requestHeaders;
}
function handleRewrites(event, rewrites) {
  const { rawPath, headers, query, cookies, url } = event;
  const localizedRawPath = localizePath(event);
  const matcher = routeHasMatcher(headers, cookies, query);
  const computeHas = computeParamHas(headers, cookies, query);
  const rewrite = rewrites.find((route) => {
    const path3 = route.locale === false ? rawPath : localizedRawPath;
    return new RegExp(route.regex).test(path3) && checkHas(matcher, route.has) && checkHas(matcher, route.missing, true);
  });
  let finalQuery = query;
  let rewrittenUrl = url;
  const isExternalRewrite = isExternal(rewrite?.destination);
  debug("isExternalRewrite", isExternalRewrite);
  if (rewrite) {
    const { pathname, protocol, hostname, queryString } = getUrlParts(rewrite.destination, isExternalRewrite);
    const pathToUse = rewrite.locale === false ? rawPath : localizedRawPath;
    debug("urlParts", { pathname, protocol, hostname, queryString });
    const toDestinationPath = compile(escapeRegex(pathname, { isPath: true }));
    const toDestinationHost = compile(escapeRegex(hostname));
    const toDestinationQuery = compile(escapeRegex(queryString));
    const params = {
      // params for the source
      ...getParamsFromSource(match(escapeRegex(rewrite.source, { isPath: true })))(pathToUse),
      // params for the has
      ...rewrite.has?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {}),
      // params for the missing
      ...rewrite.missing?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {})
    };
    const isUsingParams = Object.keys(params).length > 0;
    let rewrittenQuery = queryString;
    let rewrittenHost = hostname;
    let rewrittenPath = pathname;
    if (isUsingParams) {
      rewrittenPath = unescapeRegex(toDestinationPath(params));
      rewrittenHost = unescapeRegex(toDestinationHost(params));
      rewrittenQuery = unescapeRegex(toDestinationQuery(params));
    }
    if (NextConfig.i18n && !isExternalRewrite) {
      const strippedPathLocale = rewrittenPath.replace(new RegExp(`^/(${NextConfig.i18n.locales.join("|")})`), "");
      if (strippedPathLocale.startsWith("/api/")) {
        rewrittenPath = strippedPathLocale;
      }
    }
    rewrittenUrl = isExternalRewrite ? `${protocol}//${rewrittenHost}${rewrittenPath}` : new URL(rewrittenPath, event.url).href;
    finalQuery = {
      ...query,
      ...convertFromQueryString(rewrittenQuery)
    };
    rewrittenUrl += convertToQueryString(finalQuery);
    debug("rewrittenUrl", { rewrittenUrl, finalQuery, isUsingParams });
  }
  return {
    internalEvent: {
      ...event,
      query: finalQuery,
      rawPath: new URL(rewrittenUrl).pathname,
      url: rewrittenUrl
    },
    __rewrite: rewrite,
    isExternalRewrite
  };
}
function handleRepeatedSlashRedirect(event) {
  if (event.rawPath.match(/(\\|\/\/)/)) {
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: normalizeRepeatedSlashes(new URL(event.url))
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}
function handleTrailingSlashRedirect(event) {
  const url = new URL(event.rawPath, "http://localhost");
  if (
    // Someone is trying to redirect to a different origin, let's not do that
    url.host !== "localhost" || NextConfig.skipTrailingSlashRedirect || // We should not apply trailing slash redirect to API routes
    event.rawPath.startsWith("/api/")
  ) {
    return false;
  }
  const emptyBody = emptyReadableStream();
  if (NextConfig.trailingSlash && !(event.query.__nextDataReq === "1") && !event.rawPath.endsWith("/") && !event.rawPath.match(/[\w-]+\.[\w]+$/g)) {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0]}/${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  if (!NextConfig.trailingSlash && event.rawPath.endsWith("/") && event.rawPath !== "/") {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0].replace(/\/$/, "")}${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  return false;
}
function handleRedirects(event, redirects) {
  const repeatedSlashRedirect = handleRepeatedSlashRedirect(event);
  if (repeatedSlashRedirect)
    return repeatedSlashRedirect;
  const trailingSlashRedirect = handleTrailingSlashRedirect(event);
  if (trailingSlashRedirect)
    return trailingSlashRedirect;
  const localeRedirect = handleLocaleRedirect(event);
  if (localeRedirect)
    return localeRedirect;
  const { internalEvent, __rewrite } = handleRewrites(event, redirects.filter((r) => !r.internal));
  if (__rewrite && !__rewrite.internal) {
    return {
      type: event.type,
      statusCode: __rewrite.statusCode ?? 308,
      headers: {
        Location: internalEvent.url
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
}
function fixDataPage(internalEvent, buildId) {
  const { rawPath, query } = internalEvent;
  const basePath = NextConfig.basePath ?? "";
  const dataPattern = `${basePath}/_next/data/${buildId}`;
  if (rawPath.startsWith("/_next/data") && !rawPath.startsWith(dataPattern)) {
    return {
      type: internalEvent.type,
      statusCode: 404,
      body: toReadableStream("{}"),
      headers: {
        "Content-Type": "application/json"
      },
      isBase64Encoded: false
    };
  }
  if (rawPath.startsWith(dataPattern) && rawPath.endsWith(".json")) {
    const newPath = `${basePath}${rawPath.slice(dataPattern.length, -".json".length).replace(/^\/index$/, "/")}`;
    query.__nextDataReq = "1";
    return {
      ...internalEvent,
      rawPath: newPath,
      query,
      headers: {
        ...internalEvent.headers,
        "x-nextjs-data": "1"
      },
      url: new URL(`${newPath}${convertToQueryString(query)}`, internalEvent.url).href
    };
  }
  return internalEvent;
}
function handleFallbackFalse(internalEvent, prerenderManifest) {
  const { rawPath } = internalEvent;
  const { dynamicRoutes = {}, routes = {} } = prerenderManifest ?? {};
  const prerenderedFallbackRoutes = Object.entries(dynamicRoutes).filter(([, { fallback }]) => fallback === false);
  const routeFallback = prerenderedFallbackRoutes.some(([, { routeRegex }]) => {
    const routeRegexExp = new RegExp(routeRegex);
    return routeRegexExp.test(rawPath);
  });
  const locales = NextConfig.i18n?.locales;
  const routesAlreadyHaveLocale = locales?.includes(rawPath.split("/")[1]) || // If we don't use locales, we don't need to add the default locale
  locales === void 0;
  let localizedPath = routesAlreadyHaveLocale ? rawPath : `/${NextConfig.i18n?.defaultLocale}${rawPath}`;
  if (
    // Not if localizedPath is "/" tho, because that would not make it find `isPregenerated` below since it would be try to match an empty string.
    localizedPath !== "/" && NextConfig.trailingSlash && localizedPath.endsWith("/")
  ) {
    localizedPath = localizedPath.slice(0, -1);
  }
  const matchedStaticRoute = staticRouteMatcher(localizedPath);
  const prerenderedFallbackRoutesName = prerenderedFallbackRoutes.map(([name]) => name);
  const matchedDynamicRoute = dynamicRouteMatcher(localizedPath).filter(({ route }) => !prerenderedFallbackRoutesName.includes(route));
  const isPregenerated = Object.keys(routes).includes(localizedPath);
  if (routeFallback && !isPregenerated && matchedStaticRoute.length === 0 && matchedDynamicRoute.length === 0) {
    return {
      event: {
        ...internalEvent,
        rawPath: "/404",
        url: constructNextUrl(internalEvent.url, "/404"),
        headers: {
          ...internalEvent.headers,
          "x-invoke-status": "404"
        }
      },
      isISR: false
    };
  }
  return {
    event: internalEvent,
    isISR: routeFallback || isPregenerated
  };
}

// node_modules/@opennextjs/aws/dist/core/routing/middleware.js
init_stream();
init_utils();
var middlewareManifest = MiddlewareManifest;
var functionsConfigManifest = FunctionsConfigManifest;
var middleMatch = getMiddlewareMatch(middlewareManifest, functionsConfigManifest);
var REDIRECTS = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function defaultMiddlewareLoader() {
  return Promise.resolve().then(() => (init_edgeFunctionHandler(), edgeFunctionHandler_exports));
}
async function handleMiddleware(internalEvent, initialSearch, middlewareLoader = defaultMiddlewareLoader) {
  const headers = internalEvent.headers;
  if (headers["x-isr"] && headers["x-prerender-revalidate"] === PrerenderManifest?.preview?.previewModeId)
    return internalEvent;
  const normalizedPath = localizePath(internalEvent);
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(normalizedPath);
  } catch {
  }
  const hasMatch = middleMatch.some((r) => r.test(normalizedPath) || decodedPath !== void 0 && r.test(decodedPath));
  if (!hasMatch)
    return internalEvent;
  const initialUrl = new URL(normalizedPath, internalEvent.url);
  initialUrl.search = initialSearch;
  const url = initialUrl.href;
  const middleware = await middlewareLoader();
  const result = await middleware.default({
    // `geo` is pre Next 15.
    geo: {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: decodeURIComponent(headers["x-open-next-city"]),
      country: headers["x-open-next-country"],
      region: headers["x-open-next-region"],
      latitude: headers["x-open-next-latitude"],
      longitude: headers["x-open-next-longitude"]
    },
    headers,
    method: internalEvent.method || "GET",
    nextConfig: {
      basePath: NextConfig.basePath,
      i18n: NextConfig.i18n,
      trailingSlash: NextConfig.trailingSlash
    },
    url,
    body: convertBodyToReadableStream(internalEvent.method, internalEvent.body)
  });
  const statusCode = result.status;
  const responseHeaders = result.headers;
  const reqHeaders = {};
  const resHeaders = {};
  const filteredHeaders = [
    "x-middleware-override-headers",
    "x-middleware-next",
    "x-middleware-rewrite",
    // We need to drop `content-encoding` because it will be decoded
    "content-encoding"
  ];
  const xMiddlewareKey = "x-middleware-request-";
  responseHeaders.forEach((value, key) => {
    if (key.startsWith(xMiddlewareKey)) {
      const k = key.substring(xMiddlewareKey.length);
      reqHeaders[k] = value;
    } else {
      if (filteredHeaders.includes(key.toLowerCase()))
        return;
      if (key.toLowerCase() === "set-cookie") {
        resHeaders[key] = resHeaders[key] ? [...resHeaders[key], value] : [value];
      } else if (REDIRECTS.has(statusCode) && key.toLowerCase() === "location") {
        resHeaders[key] = normalizeLocationHeader(value, internalEvent.url);
      } else {
        resHeaders[key] = value;
      }
    }
  });
  const rewriteUrl = responseHeaders.get("x-middleware-rewrite");
  let isExternalRewrite = false;
  let middlewareQuery = internalEvent.query;
  let newUrl = internalEvent.url;
  if (rewriteUrl) {
    newUrl = rewriteUrl;
    if (isExternal(newUrl, internalEvent.headers.host)) {
      isExternalRewrite = true;
    } else {
      const rewriteUrlObject = new URL(rewriteUrl);
      middlewareQuery = getQueryFromSearchParams(rewriteUrlObject.searchParams);
      if ("__nextDataReq" in internalEvent.query) {
        middlewareQuery.__nextDataReq = internalEvent.query.__nextDataReq;
      }
    }
  }
  if (!rewriteUrl && !responseHeaders.get("x-middleware-next")) {
    const body = result.body ?? emptyReadableStream();
    return {
      type: internalEvent.type,
      statusCode,
      headers: resHeaders,
      body,
      isBase64Encoded: false
    };
  }
  return {
    responseHeaders: resHeaders,
    url: newUrl,
    rawPath: new URL(newUrl).pathname,
    type: internalEvent.type,
    headers: { ...internalEvent.headers, ...reqHeaders },
    body: internalEvent.body,
    method: internalEvent.method,
    query: middlewareQuery,
    cookies: internalEvent.cookies,
    remoteAddress: internalEvent.remoteAddress,
    isExternalRewrite,
    rewriteStatusCode: rewriteUrl && !isExternalRewrite ? statusCode : void 0
  };
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
var MIDDLEWARE_HEADER_PREFIX_LEN = MIDDLEWARE_HEADER_PREFIX.length;
var INTERNAL_HEADER_PREFIX = "x-opennext-";
var INTERNAL_HEADER_INITIAL_URL = `${INTERNAL_HEADER_PREFIX}initial-url`;
var INTERNAL_HEADER_LOCALE = `${INTERNAL_HEADER_PREFIX}locale`;
var INTERNAL_HEADER_RESOLVED_ROUTES = `${INTERNAL_HEADER_PREFIX}resolved-routes`;
var INTERNAL_HEADER_REWRITE_STATUS_CODE = `${INTERNAL_HEADER_PREFIX}rewrite-status-code`;
var INTERNAL_EVENT_REQUEST_ID = `${INTERNAL_HEADER_PREFIX}request-id`;
var geoHeaderToNextHeader = {
  "x-open-next-city": "x-vercel-ip-city",
  "x-open-next-country": "x-vercel-ip-country",
  "x-open-next-region": "x-vercel-ip-country-region",
  "x-open-next-latitude": "x-vercel-ip-latitude",
  "x-open-next-longitude": "x-vercel-ip-longitude"
};
var NEXT_INTERNAL_HEADERS = [
  "x-middleware-rewrite",
  "x-middleware-redirect",
  "x-middleware-set-cookie",
  "x-middleware-skip",
  "x-middleware-override-headers",
  "x-middleware-next",
  "x-now-route-matches",
  "x-matched-path",
  "x-nextjs-data",
  "x-next-resume-state-length"
];
function applyMiddlewareHeaders(eventOrResult, middlewareHeaders) {
  const isResult = isInternalResult(eventOrResult);
  const headers = eventOrResult.headers;
  const keyPrefix = isResult ? "" : MIDDLEWARE_HEADER_PREFIX;
  Object.entries(middlewareHeaders).forEach(([key, value]) => {
    if (value) {
      headers[keyPrefix + key] = Array.isArray(value) ? value.join(",") : value;
    }
  });
}
async function routingHandler(event, { assetResolver }) {
  try {
    for (const [openNextGeoName, nextGeoName] of Object.entries(geoHeaderToNextHeader)) {
      const value = event.headers[openNextGeoName];
      if (value) {
        event.headers[nextGeoName] = value;
      }
    }
    for (const key of Object.keys(event.headers)) {
      const lowerCaseKey = key.toLowerCase();
      if (lowerCaseKey.startsWith(INTERNAL_HEADER_PREFIX) || lowerCaseKey.startsWith(MIDDLEWARE_HEADER_PREFIX) || NEXT_INTERNAL_HEADERS.includes(lowerCaseKey)) {
        delete event.headers[key];
      }
    }
    let headers = getNextConfigHeaders(event, ConfigHeaders);
    let eventOrResult = fixDataPage(event, BuildId);
    if (isInternalResult(eventOrResult)) {
      return eventOrResult;
    }
    const redirect = handleRedirects(eventOrResult, RoutesManifest.redirects);
    if (redirect) {
      redirect.headers.Location = normalizeLocationHeader(redirect.headers.Location, event.url, true);
      debug("redirect", redirect);
      return redirect;
    }
    const middlewareEventOrResult = await handleMiddleware(
      eventOrResult,
      // We need to pass the initial search without any decoding
      // TODO: we'd need to refactor InternalEvent to include the initial querystring directly
      // Should be done in another PR because it is a breaking change
      new URL(event.url).search
    );
    if (isInternalResult(middlewareEventOrResult)) {
      return middlewareEventOrResult;
    }
    const middlewareHeadersPrioritized = globalThis.openNextConfig.dangerous?.middlewareHeadersOverrideNextConfigHeaders ?? false;
    if (middlewareHeadersPrioritized) {
      headers = {
        ...headers,
        ...middlewareEventOrResult.responseHeaders
      };
    } else {
      headers = {
        ...middlewareEventOrResult.responseHeaders,
        ...headers
      };
    }
    let isExternalRewrite = middlewareEventOrResult.isExternalRewrite ?? false;
    eventOrResult = middlewareEventOrResult;
    if (!isExternalRewrite) {
      const beforeRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.beforeFiles);
      eventOrResult = beforeRewrite.internalEvent;
      isExternalRewrite = beforeRewrite.isExternalRewrite;
      if (!isExternalRewrite) {
        const assetResult = await assetResolver?.maybeGetAssetResult?.(eventOrResult);
        if (assetResult) {
          applyMiddlewareHeaders(assetResult, headers);
          return assetResult;
        }
      }
    }
    const foundStaticRoute = staticRouteMatcher(eventOrResult.rawPath);
    const isStaticRoute = !isExternalRewrite && foundStaticRoute.length > 0;
    if (!(isStaticRoute || isExternalRewrite)) {
      const afterRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.afterFiles);
      eventOrResult = afterRewrite.internalEvent;
      isExternalRewrite = afterRewrite.isExternalRewrite;
    }
    let isISR = false;
    if (!isExternalRewrite) {
      const fallbackResult = handleFallbackFalse(eventOrResult, PrerenderManifest);
      eventOrResult = fallbackResult.event;
      isISR = fallbackResult.isISR;
    }
    const foundDynamicRoute = dynamicRouteMatcher(eventOrResult.rawPath);
    const isDynamicRoute = !isExternalRewrite && foundDynamicRoute.length > 0;
    if (!(isDynamicRoute || isStaticRoute || isExternalRewrite)) {
      const fallbackRewrites = handleRewrites(eventOrResult, RoutesManifest.rewrites.fallback);
      eventOrResult = fallbackRewrites.internalEvent;
      isExternalRewrite = fallbackRewrites.isExternalRewrite;
    }
    const isNextImageRoute = eventOrResult.rawPath.startsWith("/_next/image");
    const isRouteFoundBeforeAllRewrites = isStaticRoute || isDynamicRoute || isExternalRewrite;
    if (!(isRouteFoundBeforeAllRewrites || isNextImageRoute || // We need to check again once all rewrites have been applied
    staticRouteMatcher(eventOrResult.rawPath).length > 0 || dynamicRouteMatcher(eventOrResult.rawPath).length > 0)) {
      eventOrResult = {
        ...eventOrResult,
        rawPath: "/404",
        url: constructNextUrl(eventOrResult.url, "/404"),
        headers: {
          ...eventOrResult.headers,
          "x-middleware-response-cache-control": "private, no-cache, no-store, max-age=0, must-revalidate"
        }
      };
    }
    if (globalThis.openNextConfig.dangerous?.enableCacheInterception && !isInternalResult(eventOrResult)) {
      debug("Cache interception enabled");
      eventOrResult = await cacheInterceptor(eventOrResult);
      if (isInternalResult(eventOrResult)) {
        applyMiddlewareHeaders(eventOrResult, headers);
        return eventOrResult;
      }
    }
    applyMiddlewareHeaders(eventOrResult, headers);
    const resolvedRoutes = [
      ...foundStaticRoute,
      ...foundDynamicRoute
    ];
    debug("resolvedRoutes", resolvedRoutes);
    return {
      internalEvent: eventOrResult,
      isExternalRewrite,
      origin: false,
      isISR,
      resolvedRoutes,
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(eventOrResult, NextConfig.i18n) : void 0,
      rewriteStatusCode: middlewareEventOrResult.rewriteStatusCode
    };
  } catch (e) {
    error("Error in routingHandler", e);
    return {
      internalEvent: {
        type: "core",
        method: "GET",
        rawPath: "/500",
        url: constructNextUrl(event.url, "/500"),
        headers: {
          ...event.headers
        },
        query: event.query,
        cookies: event.cookies,
        remoteAddress: event.remoteAddress
      },
      isExternalRewrite: false,
      origin: false,
      isISR: false,
      resolvedRoutes: [],
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(event, NextConfig.i18n) : void 0
    };
  }
}
function isInternalResult(eventOrResult) {
  return eventOrResult != null && "statusCode" in eventOrResult;
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
globalThis.internalFetch = fetch;
globalThis.__openNextAls = new AsyncLocalStorage();
var defaultHandler = async (internalEvent, options) => {
  const middlewareConfig = globalThis.openNextConfig.middleware;
  const originResolver = await resolveOriginResolver(middlewareConfig?.originResolver);
  const externalRequestProxy = await resolveProxyRequest(middlewareConfig?.override?.proxyExternalRequest);
  const assetResolver = await resolveAssetResolver(middlewareConfig?.assetResolver);
  const requestId = Math.random().toString(36);
  return runWithOpenNextRequestContext({
    isISRRevalidation: internalEvent.headers["x-isr"] === "1",
    waitUntil: options?.waitUntil,
    requestId
  }, async () => {
    const result = await routingHandler(internalEvent, { assetResolver });
    if ("internalEvent" in result) {
      debug("Middleware intercepted event", internalEvent);
      if (!result.isExternalRewrite) {
        const origin = await originResolver.resolve(result.internalEvent.rawPath);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_HEADER_INITIAL_URL]: internalEvent.url,
              [INTERNAL_HEADER_RESOLVED_ROUTES]: JSON.stringify(result.resolvedRoutes),
              [INTERNAL_EVENT_REQUEST_ID]: requestId,
              [INTERNAL_HEADER_REWRITE_STATUS_CODE]: String(result.rewriteStatusCode)
            }
          },
          isExternalRewrite: result.isExternalRewrite,
          origin,
          isISR: result.isISR,
          initialURL: result.initialURL,
          resolvedRoutes: result.resolvedRoutes
        };
      }
      try {
        return externalRequestProxy.proxy(result.internalEvent);
      } catch (e) {
        error("External request failed.", e);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_EVENT_REQUEST_ID]: requestId
            },
            rawPath: "/500",
            url: constructNextUrl(result.internalEvent.url, "/500"),
            method: "GET"
          },
          // On error we need to rewrite to the 500 page which is an internal rewrite
          isExternalRewrite: false,
          origin: false,
          isISR: result.isISR,
          initialURL: result.internalEvent.url,
          resolvedRoutes: [{ route: "/500", type: "page" }]
        };
      }
    }
    if (process.env.OPEN_NEXT_REQUEST_ID_HEADER || globalThis.openNextDebug) {
      result.headers[INTERNAL_EVENT_REQUEST_ID] = requestId;
    }
    debug("Middleware response", result);
    return result;
  });
};
var handler2 = await createGenericHandler({
  handler: defaultHandler,
  type: "middleware"
});
var middleware_default = {
  fetch: handler2
};
export {
  middleware_default as default,
  handler2 as handler
};
