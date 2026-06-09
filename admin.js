const fallbackContent = {
  references: `[1] Transport for London — Travel in London reports.
[2] Office for National Statistics — Census 2021.
[3] TfL Journey Planner and Google Maps driving directions, checked 9 June 2026.
[4] Bonjour RATP — Metro Line 15.
[5] Webuild — Grand Paris Express Line 15.`,
  imageCredits: `- Route schematic: created by authors for academic assessment purposes.
- Paris Line 15 diagram: simplified diagram redrawn by authors based on Bonjour RATP and Webuild.
- Map background: © OpenStreetMap contributors.`,
  gaiStatement: "GAI statement to be finalised by the group before submission.",
  updatedAt: null,
};

const tokenKey = "outerLondon03AdminToken";

const loginPanel = document.querySelector("#login-panel");
const editorPanel = document.querySelector("#editor-panel");
const loginForm = document.querySelector("#login-form");
const contentForm = document.querySelector("#content-form");
const loginMessage = document.querySelector("#login-message");
const saveMessage = document.querySelector("#save-message");
const logoutButton = document.querySelector("#logout-button");
const lastUpdated = document.querySelector("#last-updated");

const fields = {
  references: document.querySelector("#references"),
  imageCredits: document.querySelector("#imageCredits"),
  gaiStatement: document.querySelector("#gaiStatement"),
};

const preview = {
  references: document.querySelector("#preview-references"),
  imageCredits: document.querySelector("#preview-credits"),
  gaiStatement: document.querySelector("#preview-gai"),
};

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.classList.toggle("is-success", type === "success");
  element.classList.toggle("is-error", type === "error");
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) {
    return "Last updated: not provided";
  }

  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "Last updated: not provided";
  }

  return `Last updated: ${date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

function normalizeContent(data) {
  const source = data && typeof data === "object" && data.content ? data.content : data;

  return {
    references:
      typeof source?.references === "string" && source.references.trim()
        ? source.references.trim()
        : fallbackContent.references,
    imageCredits:
      typeof source?.imageCredits === "string" && source.imageCredits.trim()
        ? source.imageCredits.trim()
        : fallbackContent.imageCredits,
    gaiStatement:
      typeof source?.gaiStatement === "string" && source.gaiStatement.trim()
        ? source.gaiStatement.trim()
        : fallbackContent.gaiStatement,
    updatedAt: typeof source?.updatedAt === "string" ? source.updatedAt : null,
  };
}

function readFormContent() {
  return {
    references: fields.references.value.trim(),
    imageCredits: fields.imageCredits.value.trim(),
    gaiStatement: fields.gaiStatement.value.trim(),
  };
}

function fillForm(content) {
  fields.references.value = content.references;
  fields.imageCredits.value = content.imageCredits;
  fields.gaiStatement.value = content.gaiStatement;
  lastUpdated.textContent = formatUpdatedAt(content.updatedAt);
  updatePreview();
}

function updatePreview() {
  const content = readFormContent();

  preview.references.textContent = content.references || fallbackContent.references;
  preview.imageCredits.textContent = content.imageCredits || fallbackContent.imageCredits;
  preview.gaiStatement.textContent = content.gaiStatement || fallbackContent.gaiStatement;
}

function showEditor() {
  loginPanel.classList.add("is-hidden");
  editorPanel.classList.remove("is-hidden");
}

function showLogin() {
  editorPanel.classList.add("is-hidden");
  loginPanel.classList.remove("is-hidden");
}

async function loadContent() {
  try {
    const response = await fetch("/api/content", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Content API unavailable");
    }

    const data = await response.json();
    fillForm(normalizeContent(data));
  } catch {
    fillForm(fallbackContent);
    setMessage(
      saveMessage,
      "Using fallback content. Deploy with Cloudflare Pages Functions and KV to load saved content.",
      "error",
    );
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(loginMessage, "Checking password...");

  try {
    const formData = new FormData(loginForm);
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: formData.get("password") }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok || !data.token) {
      throw new Error(data.error || "Invalid password");
    }

    sessionStorage.setItem(tokenKey, data.token);
    setMessage(loginMessage, "");
    showEditor();
    await loadContent();
  } catch (error) {
    setMessage(loginMessage, error.message || "Login failed.", "error");
  }
});

contentForm.addEventListener("input", updatePreview);

contentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(saveMessage, "Saving...");

  try {
    const token = sessionStorage.getItem(tokenKey);

    if (!token) {
      throw new Error("Please log in again before saving.");
    }

    const response = await fetch("/api/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(readFormContent()),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Save failed.");
    }

    fillForm(normalizeContent(data.content));
    setMessage(saveMessage, "Saved. Public page will now show the latest content.", "success");
  } catch (error) {
    setMessage(saveMessage, error.message || "Save failed.", "error");
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(tokenKey);
  setMessage(saveMessage, "");
  showLogin();
});

if (sessionStorage.getItem(tokenKey)) {
  showEditor();
  loadContent();
} else {
  fillForm(fallbackContent);
}
