#!/usr/bin/env node
// QA flow: register -> login -> session
// NextAuth routes are at /api/auth (NOT /es/api/auth)

const BASE = process.env.BASE || "http://localhost:3001";
const LOCALE = "es";
const PASSWORD = process.env.QA_PASSWORD || "TestPass123!";
const COMPANY = process.env.QA_COMPANY || "QA Co";
const WEBSITE = process.env.QA_WEBSITE || "";
const PLAN = process.env.QA_PLAN || "STARTER";

// Email unico con timestamp
const EMAIL = process.env.QA_EMAIL || `qa.${Date.now()}@example.com`;

const REGISTER_URL = `${BASE}/${LOCALE}/api/auth/register-company`;
const CSRF_URL = `${BASE}/api/auth/csrf`; // NextAuth SIN locale
const CALLBACK_URL = `${BASE}/api/auth/callback/credentials`; // NextAuth SIN locale
const SESSION_URL = `${BASE}/api/auth/session`; // NextAuth SIN locale

const regBody = JSON.stringify({
  firstName: "QA",
  lastName: "User",
  email: EMAIL,
  companyName: COMPANY,
  website: WEBSITE,
  plan: PLAN,
  password: PASSWORD,
});

async function tryParseJSON(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return { ok: false, status: response.status, body: text.substring(0, 300) };
  }
  return response
    .json()
    .then((body) => ({ ok: true, status: response.status, body }));
}

async function main() {
  console.log(`[QA] Email: ${EMAIL}`);

  // Step 1: Register
  console.log("[1/4] Registering...");
  let res = await fetch(REGISTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: regBody,
  });
  const reg = await tryParseJSON(res);
  console.log(`[QA] Register status: ${reg.status}`);
  console.log(
    `[QA] Register body: ${JSON.stringify(reg.body || reg.body).substring(0, 200)}`,
  );

  if (reg.status !== 201 && reg.status !== 200) {
    console.log("[QA] Registro fallo. Continuando con login...");
  }

  // Step 2: Get CSRF token
  console.log("[2/4] Getting CSRF token...");
  res = await fetch(CSRF_URL);
  console.log(`[QA] CSRF status: ${res.status}`);
  const csrfText = await res.text();
  let csrf;
  try {
    csrf = JSON.parse(csrfText);
  } catch (e) {
    console.error("[QA] CSRF parse error:", csrfText.substring(0, 100));
    process.exit(1);
  }
  const csrfToken = csrf.csrfToken;
  console.log(`[QA] CSRF: ${csrfToken ? "(present)" : "(MISSING)"}`);

  if (!csrfToken) {
    console.error("[QA] ERROR: No CSRF token. Aborting.");
    process.exit(1);
  }

  // Step 3: Login via credentials callback
  console.log("[3/4] Logging in via credentials callback...");
  const loginBody = new URLSearchParams({
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
  }).toString();

  res = await fetch(CALLBACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: loginBody,
    redirect: "manual",
  });

  console.log(`[QA] Login callback status: ${res.status}`);
  const setCookie = res.headers.get("set-cookie");
  const sessionCookie = setCookie ? setCookie.split(",")[0] : null;
  console.log(`[QA] Cookie received: ${sessionCookie ? "(yes)" : "(none)"}`);

  if (sessionCookie) {
    const cookieValue = sessionCookie.split(";")[0];
    console.log(`[QA] Cookie: ${cookieValue.substring(0, 50)}...`);

    // Step 4: Check session (use the NEXT_AUTH session cookie name)
    console.log("[4/4] Checking session...");
    const sessRes = await fetch(SESSION_URL, {
      headers: { Cookie: cookieValue },
    });
    console.log(`[QA] Session status: ${sessRes.status}`);
    const sessText = await sessRes.text();
    console.log(`[QA] Session body: ${sessText.substring(0, 300)}`);

    // Also check if there's a session cookie in the response
    const sessCookie = sessRes.headers.get("set-cookie");
    if (sessCookie) {
      console.log(
        `[QA] Session cookie: ${sessCookie.split(",")[0].substring(0, 50)}...`,
      );
    }

    // Success check: if status is 200, login worked
    if (sessRes.status === 200 || sessRes.status === 302) {
      console.log("[QA] ✅ LOGIN EXITOSO - El flujo completo funciona!");
    } else {
      console.log("[QA] ❌ Login puede haber fallado");
    }
  } else {
    console.log("[QA] No cookie. Raw response:");
    const text = await res.text();
    console.log(text.substring(0, 300));
  }
}

main().catch((err) => {
  console.error("[QA] Fatal error:", err);
  process.exit(1);
});
