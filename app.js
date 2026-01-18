const app = document.getElementById("app");

function setMeta({ title, description }) {
  document.title = title;

  let desc = document.querySelector('meta[name="description"]');
  if (!desc) {
    desc = document.createElement("meta");
    desc.name = "description";
    document.head.appendChild(desc);
  }
  desc.content = description;
}

// Works on GitHub Pages + custom domain + local dev
// If you ever move to a subpath, this still resolves correctly.
const BASE_URL = "/";

// COURSE title overrides (not file overrides).
const COURSE_TITLE_OVERRIDES = {
  "AP Physics 1 Algebra-Based": "AP Physics 1",
  "AP Physics 2 Algebra-Based": "AP Physics 2",
  "AP Physics C Electricity and Magnetism": "AP Physics C: Electricity and Magnetism",
  "AP Physics C Mechanics": "AP Physics C: Mechanics",
  "AP Comparative Government and Politics": "AP Comparative Government & Politics",
  "AP World History Modern": "AP World History",
};

function navigateTo(path) {
  history.pushState(null, "", path);
  router();
}

// ---------- SEO helpers ----------
function setCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}
function prettyTypeLabel(type) {
  const map = {
    "frq": "Free-Response Questions (FRQs)",
    "scoring-guidelines": "Scoring Guidelines",
    "chief-reader-report": "Chief Reader Report",
    "scoring-statistics": "Scoring Statistics",
    "scoring-distribution": "Scoring Distribution",
    "sample-responses": "Sample Responses",
    "other": "Resources",
  };
  return map[type] || "Resources";
}

function fileTypeFromName(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("free-response questions") || n.includes("free response questions")) return "frq";
  if (n.includes("scoring guidelines")) return "scoring-guidelines";
  if (n.includes("chief reader report") || n.includes("chief-reader report")) return "chief-reader-report";
  if (n.includes("scoring statistics")) return "scoring-statistics";
  if (n.includes("scoring distribution") || n.includes("score distributions") || n.includes("scoring distributions")) return "scoring-distribution";
  if (n.includes("sample")) return "sample-responses";
  return "other";
}

// ---------- Pages ----------

async function renderHome() {
  setMeta({
    title: "AP FRQ Archive | Free Response Questions",
    description: "Browse AP exam free-response questions, scoring guidelines, and sample responses by course and year.",
  });

  app.innerHTML = `
    <section class="card">
      <h1 class="h1">AP Exam FRQ Archive</h1>
      <div id="home-courses" style="margin-top: 14px;"></div>
    </section>
  `;

  const mount = document.getElementById("home-courses");

  try {
    const res = await fetch(`/data/courses.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load courses list: ${res.status}`);
    const data = await res.json();

    const courses = data.courses || [];
    // Put AP 2-D and 3-D Art and Design last (they sort first because of "2" and "3")
const LAST_COURSES = new Set([
  "AP 2-D Art and Design",
  "AP 3-D Art and Design"
]);

courses.sort((a, b) => {
  const aTitle = COURSE_TITLE_OVERRIDES[a.title] ?? a.title;
  const bTitle = COURSE_TITLE_OVERRIDES[b.title] ?? b.title;

  const aLast = LAST_COURSES.has(aTitle);
  const bLast = LAST_COURSES.has(bTitle);

  if (aLast && !bLast) return 1;
  if (!aLast && bLast) return -1;

  // Otherwise keep normal alphabetical order
  return aTitle.localeCompare(bTitle);
});
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
                <a class="course-title-link" href="/course/${encodeURIComponent(c.slug)}" data-link>
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
 * Course page for:
 * - /course/<slug>
 * - /course/<slug>/<year>
 * - /course/<slug>/<year>/<type>
 */
async function renderCourse(slug, yearFilter = null, typeFilter = null) {
  // Temporary meta until we load real course title
  setMeta({
    title: `${slug} FRQs | APFRQs`,
    description: `Free-response questions and scoring guidelines for ${slug}, organized by year.`,
  });

  const typeLabel = typeFilter ? prettyTypeLabel(typeFilter) : null;

  app.innerHTML = `
  <div class="breadcrumbs">
    <a class="link" href="/" data-link>Home</a>
    <span> / </span>
    <span>${escapeHtml(slug)}</span>
  </div>

  <section class="card">
    <h1 class="h1">${escapeHtml(slug)}</h1>

    <p class="p seo-blurb">
      This page contains archived AP ${escapeHtml(slug)} free-response questions,
      scoring guidelines, and related exam materials from past years, including
      resources that are no longer prominently linked on the College Board website.
    </p>

    <div id="course-content" style="margin-top: 14px;"></div>
  </section>
`;

  const mount = document.getElementById("course-content");

  try {
    const res = await fetch(`/data/course-${encodeURIComponent(slug)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load course index: ${res.status}`);
    const index = await res.json();

    const h1 = app.querySelector("h1.h1");
    const courseTitle = COURSE_TITLE_OVERRIDES[index.title] ?? index.title ?? slug;
    if (h1) h1.textContent = courseTitle;

    // SEO meta, now that we know the real title
    const titleParts = [
      courseTitle,
      yearFilter ? String(yearFilter) : null,
      typeFilter ? prettyTypeLabel(typeFilter) : "FRQs & Scoring Materials",
    ].filter(Boolean);

    setMeta({
      title: `${titleParts.join(" ")} | APFRQs`,
      description: `${courseTitle}${yearFilter ? ` ${yearFilter}` : ""} ${typeFilter ? prettyTypeLabel(typeFilter) : "free-response questions, scoring guidelines, and related resources"}, organized by year.`,
    });

    const yearsAll = index.years || [];
    if (yearsAll.length === 0) {
      mount.innerHTML = `<p class="p">No years found for this course.</p>`;
      return;
    }

    const years = yearsAll.filter((y) => !yearFilter || String(y.year) === String(yearFilter));
    if (years.length === 0) {
      mount.innerHTML = `<p class="p">No matching year found.</p>`;
      return;
    }

    const html = years
      .map((y) => {
        // Start with all files, optionally filter by type route
        let files = [...(y.files || [])];
        if (typeFilter) files = files.filter((f) => fileTypeFromName(f.name) === typeFilter);

        // Order files: FRQ first, then Scoring Guidelines, then other predictable ordering.
        const orderedFiles = files.sort((a, b) => {
          const aName = (a.name || "").toLowerCase();
          const bName = (b.name || "").toLowerCase();

          const rank = (name) => {
            if (name.includes("free-response questions") || name.includes("free response questions")) return 0;
            if (name.includes("scoring guidelines")) return 1;
            if (name.includes("scoring")) return 2;
            if (name.includes("score")) return 3;
            if (name.includes("sample")) return 5;
            return 4;
          };

          const ra = rank(aName);
          const rb = rank(bName);
          if (ra !== rb) return ra - rb;
          return aName.localeCompare(bName);
        });

        const filesHtml = orderedFiles
          .map((f) => {
            const text = stripExtension(f.name);
            return `<li><a class="link" href="${f.url}" target="_blank" rel="noopener">${escapeHtml(text)}</a></li>`;
          })
          .join("");

        // If a type filter is active, we probably don't want nested details for one year
        if (yearFilter && typeFilter) {
          return `
            <ul class="file-list">
              ${filesHtml || `<li class="p" style="color: var(--muted);">No matching files found.</li>`}
            </ul>
          `;
        }

        return `
  <details class="details">
    <summary class="summary">${escapeHtml(y.year)}</summary>

    <!-- SEO internal link for this year -->
    <a
      href="/course/${encodeURIComponent(slug)}/${encodeURIComponent(y.year)}"
      data-link
      class="seo-link"
    >
      ${escapeHtml(courseTitle)} ${escapeHtml(y.year)} FRQs
    </a>

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
        <li>Confirm the course exists at <code>/data/course-${escapeHtml(slug)}.json</code></li>
        <li>Run <code>npm run build:indexes</code> to regenerate indexes</li>
      </ul>
      <p class="p" style="color: var(--muted);">Error: ${escapeHtml(String(err.message || err))}</p>
    `;
  }
}

// Remove the final file extension from a filename (e.g., ".pdf")
function stripExtension(filename) {
  const name = String(filename || "");
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

// ---------- Router ----------

const routes = [{ path: "/", render: renderHome }];

function matchRoute(pathname) {
  // Static routes
  for (const r of routes) {
    if (r.path === pathname) return { route: r, params: {} };
  }

  // Dynamic: /course/<slug>[/<year>[/<type>]]
  const m = pathname.match(/^\/course\/([^/]+)(?:\/(\d{4})(?:\/([^/]+))?)?$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const year = m[2] ? decodeURIComponent(m[2]) : null;
    const type = m[3] ? decodeURIComponent(m[3]) : null;
    return { route: { render: () => renderCourse(slug, year, type) }, params: { slug, year, type } };
  }

  return null;
}

function router() {
  const pathname = window.location.pathname;
  const matched = matchRoute(pathname);

  if (!matched) {
    setMeta({
      title: "404 | APFRQs",
      description: "Page not found.",
    });

    app.innerHTML = `
      <section class="card">
        <h1 class="h1">404</h1>
        <p class="p">Page not found.</p>
        <a class="link" href="/" data-link>Go Home</a>
      </section>
    `;
    return;
  }
  setCanonical(window.location.origin + window.location.pathname);
  matched.route.render();
}

// Intercept clicks on links with data-link for SPA navigation
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-link]");
  if (!link) return;

  // Only handle left-click with no modifier keys
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return;

  e.preventDefault();
  navigateTo(url.pathname);
});

// Handle back/forward navigation
window.addEventListener("popstate", router);

// Initial render
router();
