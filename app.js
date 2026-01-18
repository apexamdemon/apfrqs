const app = document.getElementById("app");

// These are COURSE title overrides (not file overrides).
// Key must match the course title as it appears in data/courses.json.
const COURSE_TITLE_OVERRIDES = {
  "AP Physics 1 Algebra-Based": "AP Physics 1",
  "AP Physics 2 Algebra-Based": "AP Physics 2",
  "AP Physics C Electricity and Magnetism": "AP Physics C: Electricity and Magnetism",
  "AP Physics C Mechanics": "AP Physics C: Mechanics",
  "AP Comparative Government and Politics": "AP Comparative Government & Politics",
  "AP World History Modern": "AP World History"
};

function navigateTo(path) {
  // Hash routing: never hits GitHub Pages server for routes
  window.location.hash = path;
}

/**
 * HOME: loads the course list from /data/courses.json
 * and links to /course/<slug> for every class.
 */
async function renderHome() {
  app.innerHTML = `
    <section class="card">
      <h1 class="h1">AP FRQ Archive</h1>
      <div id="home-courses" style="margin-top: 14px;"></div>
    </section>
  `;

  const mount = document.getElementById("home-courses");

  try {
    const res = await fetch("data/courses.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load courses list: ${res.status}`);
    const data = await res.json();

    const courses = data.courses || [];
    if (courses.length === 0) {
      mount.innerHTML = `<p class="p">No courses found. Add folders under /courses and run <code>npm run build:indexes</code>.</p>`;
      return;
    }

    mount.innerHTML = `
      <section class="grid">
        ${courses
          .map((c) => {
            const title = COURSE_TITLE_OVERRIDES[c.title] ?? c.title;
            return `
              <div class="card course-card">
                <a class="course-title-link" href="#/course/${encodeURIComponent(c.slug)}" data-link>
                  ${escapeHtml(title)}
                </a>
              </div>
            `;
          })
          .join("")}
      </section>
    `;
  } catch (err) {
    mount.innerHTML = `
      <p class="p">Could not load your courses list.</p>
      <ul class="file-list">
        <li>Run <code>npm run build:indexes</code> to generate <code>/data/courses.json</code></li>
        <li>Ensure you are using a local server (Live Server) and not opening index.html as a file</li>
        <li>Ensure <code>data/courses.json</code> exists in your project root</li>
      </ul>
      <p class="p" style="color: var(--muted);">Error: ${escapeHtml(String(err.message || err))}</p>
    `;
  }
}

/**
 * ONE course page for ALL classes.
 * Loads /data/course-<slug>.json and shows year dropdowns + files.
 */
async function renderCourse(slug) {
  app.innerHTML = `
    <div class="breadcrumbs">
      <a class="link" href="#/" data-link>Home</a> / ${escapeHtml(slug)}
    </div>

    <section class="card">
      <h1 class="h1">${escapeHtml(slug)}</h1>
      <div id="course-content" style="margin-top: 14px;"></div>
    </section>
  `;
  const mount = document.getElementById("course-content");

  try {
    const res = await fetch(`data/course-${encodeURIComponent(slug)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load course index: ${res.status}`);
    const index = await res.json();

    // Use overridden course title (if needed)
    const h1 = app.querySelector("h1.h1");
    if (h1 && index.title) {
      h1.textContent = COURSE_TITLE_OVERRIDES[index.title] ?? index.title;
    }

    if (!index.years || index.years.length === 0) {
      mount.innerHTML = `<p class="p">No years found. Confirm your folder is <code>/courses/${escapeHtml(slug)}/YYYY/...</code></p>`;
      return;
    }

    const html = index.years
      .map((y) => {
        // Order files: Free-Response Questions first, then Scoring Guidelines, then everything else.
        const orderedFiles = [...(y.files || [])].sort((a, b) => {
          const aName = (a.name || "").toLowerCase();
          const bName = (b.name || "").toLowerCase();

          const rank = (name) => {
            if (name.includes("free-response questions") || name.includes("free response questions")) return 0;
            if (name.includes("scoring guidelines")) return 1;
            if (name.includes("scoring")) return 2;
            if (name.includes("sample")) return 4;
            return 3;
          };

          const ra = rank(aName);
          const rb = rank(bName);
          if (ra !== rb) return ra - rb;

          // Tie-breaker: alphabetical so order is stable/predictable
          return aName.localeCompare(bName);
        });

        const filesHtml = orderedFiles
          .map((f) => {
            const text = stripExtension(f.name); // show the filename exactly as you named it
            return `<li><a class="link" href="${f.url}" target="_blank" rel="noopener">${escapeHtml(
              text
            )}</a></li>`;
          })
          .join("");

        return `
          <details class="details">
            <summary class="summary">${escapeHtml(y.year)}</summary>
            <ul class="file-list">
              ${
                filesHtml ||
                `<li class="p" style="color: var(--muted);">No allowed files found in this year folder.</li>`
              }
            </ul>
          </details>
        `;
      })
      .join("");

    mount.innerHTML = html;
  } catch (err) {
    mount.innerHTML = `
      <p class="p">Could not load this course index.</p>
      <ul class="file-list">
        <li>Confirm the course folder exists at <code>/courses/${escapeHtml(slug)}/YYYY/...</code></li>
        <li>Run <code>npm run build:indexes</code> to generate <code>/data/course-${escapeHtml(slug)}.json</code></li>
        <li>Ensure you are using a local server (Live Server) and not opening index.html as a file</li>
      </ul>
      <p class="p" style="color: var(--muted);">Error: ${escapeHtml(String(err.message || err))}</p>
    `;
  }
}
// Remove the final file extension from a filename (e.g., ".pdf")
function stripExtension(filename) {
  const name = String(filename || "");
  // removes the last ".something" at the end (pdf, docx, etc.)
  return name.replace(/\.[^/.]+$/, "");
}
// Simple HTML escaping for file names
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * ROUTES:
 * - only "/" is static now
 * - "/course/<slug>" is dynamic (for ALL classes)
 */
const routes = [{ path: "/", render: renderHome }];

function matchRoute(pathname) {
  // Static routes
  for (const r of routes) {
    if (r.path === pathname) return { route: r, params: {} };
  }

  // Dynamic: /course/<slug>
  const m = pathname.match(/^\/course\/([^/]+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    return { route: { render: () => renderCourse(slug) }, params: { slug } };
  }

  return null;
}

function router() {
  const pathname = window.location.hash.startsWith("#")
  ? (window.location.hash.slice(1) || "/")
  : "/";
  const matched = matchRoute(pathname);

  if (!matched) {
    app.innerHTML = `
      <section class="card">
        <h1 class="h1">404</h1>
        <p class="p">Page not found.</p>
        <a class="link" href="#/" data-link>Go Home</a>
      </section>
    `;
    return;
  }

  matched.route.render();
}

// Intercept clicks on links with data-link for SPA navigation
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-link]");
  if (!link) return;

  // Only handle left-click with no modifier keys
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  // If it's an in-page hash route like "#/course/...", let the browser set hash
  const href = link.getAttribute("href") || "";
  if (href.startsWith("#")) {
    e.preventDefault();
    // Set the hash route (without the leading "#")
    navigateTo(href.slice(1) || "/");
    return;
  }

  // Otherwise fall back to same-origin pathname handling
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return;

  e.preventDefault();
  navigateTo(url.pathname);
});
// Handle back/forward navigation
window.addEventListener("hashchange", router);

// Initial render
app.innerHTML = `
  <section class="card">
    <h1 class="h1">Loading…</h1>
    <p class="p" style="color: var(--muted);">Initializing application.</p>
  </section>
`;

try {
  router();
} catch (e) {
  app.innerHTML = `
    <section class="card">
      <h1 class="h1">App crashed</h1>
      <p class="p">There is a JavaScript error preventing the site from loading.</p>
      <pre style="white-space: pre-wrap; color: var(--muted);">${escapeHtml(String(e && e.stack ? e.stack : e))}</pre>
    </section>
  `;
}