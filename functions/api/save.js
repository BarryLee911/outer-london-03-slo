const CONTENT_KEY = "references_gai";
const MAX_LENGTHS = {
  references: 30000,
  imageCredits: 10000,
  gaiStatement: 10000,
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createAdminToken(secret, date = new Date()) {
  const dateKey = date.toISOString().slice(0, 10);
  return sha256Hex(`${secret}:outer-london-03:${dateKey}`);
}

async function isValidToken(token, secret) {
  if (!token || !secret) {
    return false;
  }

  const today = await createAdminToken(secret);
  const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterday = await createAdminToken(secret, yesterdayDate);

  return token === today || token === yesterday;
}

function getBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function validateContent(body) {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be JSON." };
  }

  const content = {};

  for (const field of Object.keys(MAX_LENGTHS)) {
    if (typeof body[field] !== "string") {
      return { error: `${field} must be a string.` };
    }

    const value = body[field].trim();

    if (!value) {
      return { error: `${field} cannot be empty.` };
    }

    if (value.length > MAX_LENGTHS[field]) {
      return { error: `${field} exceeds ${MAX_LENGTHS[field]} characters.` };
    }

    content[field] = value;
  }

  return { content };
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "ADMIN_PASSWORD secret is not configured." }, 500);
  }

  const token = getBearerToken(request);

  if (!(await isValidToken(token, env.ADMIN_PASSWORD))) {
    return json({ ok: false, error: "Missing or invalid admin token." }, 401);
  }

  if (!env.SITE_CONTENT || typeof env.SITE_CONTENT.put !== "function") {
    return json({ ok: false, error: "SITE_CONTENT KV binding is not configured." }, 500);
  }

  const validation = validateContent(await readJson(request));

  if (validation.error) {
    return json({ ok: false, error: validation.error }, 400);
  }

  const content = {
    ...validation.content,
    updatedAt: new Date().toISOString(),
    updatedBy: "Outer London 03 group",
  };

  await env.SITE_CONTENT.put(CONTENT_KEY, JSON.stringify(content));

  return json({
    ok: true,
    content,
  });
}
