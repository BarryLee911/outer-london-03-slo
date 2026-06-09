const CONTENT_KEY = "references_gai";

const fallbackContent = {
  references: `[1] Transport for London — Travel in London reports.
[2] Office for National Statistics — Census 2021.
[3] TfL Journey Planner.
[4] Bonjour RATP — Metro Line 15.
[5] Webuild — Grand Paris Express Line 15.`,
  imageCredits: `- Route schematic: created by authors for academic assessment purposes.
- Paris Line 15 diagram: simplified diagram redrawn by authors based on Bonjour RATP and Webuild.
- Map background: © OpenStreetMap contributors.`,
  gaiStatement: "GAI statement to be finalised by the group before submission.",
  updatedAt: null,
  updatedBy: null,
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizeContent(value) {
  return {
    references:
      typeof value?.references === "string" && value.references.trim()
        ? value.references.trim()
        : fallbackContent.references,
    imageCredits:
      typeof value?.imageCredits === "string" && value.imageCredits.trim()
        ? value.imageCredits.trim()
        : fallbackContent.imageCredits,
    gaiStatement:
      typeof value?.gaiStatement === "string" && value.gaiStatement.trim()
        ? value.gaiStatement.trim()
        : fallbackContent.gaiStatement,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
    updatedBy: typeof value?.updatedBy === "string" ? value.updatedBy : null,
  };
}

export async function onRequestGet({ env }) {
  try {
    if (!env.SITE_CONTENT || typeof env.SITE_CONTENT.get !== "function") {
      return json({
        ok: true,
        fallback: true,
        reason: "SITE_CONTENT KV binding is not configured.",
        content: fallbackContent,
      });
    }

    const stored = await env.SITE_CONTENT.get(CONTENT_KEY);

    if (!stored) {
      return json({
        ok: true,
        fallback: true,
        reason: "No saved references content found.",
        content: fallbackContent,
      });
    }

    return json({
      ok: true,
      fallback: false,
      content: normalizeContent(JSON.parse(stored)),
    });
  } catch (error) {
    return json({
      ok: true,
      fallback: true,
      reason: "Unable to load saved content.",
      content: fallbackContent,
    });
  }
}
