import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const { pathname } = context.url;

  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("cross-origin-opener-policy", "same-origin");

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    response.headers.set("cache-control", "no-store");
  }

  return response;
});
