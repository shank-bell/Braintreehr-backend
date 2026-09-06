// Single source of truth for links back to the public site.
//
// The staff login lives on the marketing site (SignIn.html), not in this
// app — so every "sign in" redirect here has to leave this origin. Uses
// NEXT_PUBLIC_ (not FRONTEND_ORIGIN) because the forgot/reset pages are
// client components and can only read NEXT_PUBLIC_ vars.
//
// NOTE: NEXT_PUBLIC_ values are baked in at BUILD time, so this must be
// set in Vercel before the build runs, not just at runtime.
const FRONTEND_ORIGIN =
  process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || "http://127.0.0.1:5500";

// Live Server serves the whole BrainTreeHR-Complete folder locally, so the
// pages sit under /frontend/ there. On Render the frontend repo IS the site
// root, so the same files are at the domain root in production.
const isLocal =
  FRONTEND_ORIGIN.includes("127.0.0.1") || FRONTEND_ORIGIN.includes("localhost");
const PREFIX = isLocal ? "/frontend" : "";

export const SIGN_IN_URL = `${FRONTEND_ORIGIN}${PREFIX}/SignIn.html`;
export const HOME_URL = `${FRONTEND_ORIGIN}${PREFIX}/Home.html`;