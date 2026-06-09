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

async function createAdminToken(secret) {
  const date = new Date().toISOString().slice(0, 10);
  return sha256Hex(`${secret}:outer-london-03:${date}`);
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "ADMIN_PASSWORD secret is not configured." }, 500);
  }

  const body = await readJson(request);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password || password !== env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "Invalid password." }, 401);
  }

  return json({
    ok: true,
    token: await createAdminToken(env.ADMIN_PASSWORD),
  });
}
