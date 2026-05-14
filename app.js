const app = document.getElementById("app");

// ---------- Theme ----------
function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const label = btn.querySelector(".theme-label");

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function paint() {
    const theme = getTheme();
    if (label) label.textContent = theme === "dark" ? "Dark" : "Light";
    btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  }

  btn.addEventListener("click", () => {
    const next = getTheme() === "dark" ? "dark" : "light";
    const actualNext = getTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", actualNext);
    localStorage.setItem("apfrqs-theme", actualNext);
    paint();
  });

  paint();
}

setupThemeToggle();

// ---------- Favorites ----------
const FAVORITES_KEY = "apfrqs-favorite-courses";

function getFavoriteCourses() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveFavoriteCourses(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
}

// ---------- Meta ----------
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

// ---------- Robust JSON fetch ----------
async function fetchJsonFirstOk(urls) {
  let lastErr = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.json();
      lastErr = new Error(`Tried ${url} -> ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("All JSON fetch attempts failed.");
}

// ---------- Skeletons ----------
function homeSkeleton(count = 12) {
  return `
    <section class="skeleton-grid" aria-hidden="true">
      ${Array.from({ length: count })
        .map(
          () => `
            <div class="skeleton-card">
              <div class="skeleton-line"></div>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function courseSkeleton(count = 6) {
  return `
    <div aria-hidden="true">
      ${Array.from({ length: count })
        .map(
          () => `
            <div class="skeleton-card skeleton-detail">
              <div class="skeleton-line skeleton-line-wide"></div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

// ---------- Course title overrides ----------
const COURSE_TITLE_OVERRIDES = {
  "AP Physics 1 Algebra-Based": "AP Physics 1",
  "AP Physics 2 Algebra-Based": "AP Physics 2",
  "AP Physics C Electricity and Magnetism": "AP Physics C: Electricity and Magnetism",
  "AP Physics C Mechanics": "AP Physics C: Mechanics",
  "AP Comparative Government and Politics": "AP Comparative Government & Politics",
  "AP World History Modern": "AP World History",
};

// ---------- Home categories ----------
const HOME_CATEGORIES = {
  Math: [
    "ap-calculus-ab",
    "ap-calculus-bc",
    "ap-statistics",
    "ap-precalculus",
  ],
  Science: [
    "ap-biology",
    "ap-chemistry",
    "ap-physics-1",
    "ap-physics-2",
    "ap-physics-c-mechanics",
    "ap-physics-c-electricity-and-magnetism",
    "ap-environmental-science",
  ],
  History: [
    "ap-united-states-history",
    "ap-world-history-modern",
    "ap-european-history",
    "ap-african-american-studies",
  ],
  English: [
    "ap-english-language-and-composition",
    "ap-english-literature-and-composition",
  ],
  Capstone: [
    "ap-seminar",
    "ap-research",
  ],
  "Social Studies": [
    "ap-psychology",
    "ap-united-states-government-and-politics",
    "ap-comparative-government-and-politics",
    "ap-human-geography",
    "ap-macroeconomics",
    "ap-microeconomics",
  ],
  Languages: [
    "ap-spanish-language-and-culture",
    "ap-chinese-language-and-culture",
    "ap-spanish-literature-and-culture",
    "ap-japanese-language-and-culture",
    "ap-italian-language-and-culture",
    "ap-latin",
    "ap-german-language-and-culture",
  ],
  Arts: [
    "ap-2-d-art-and-design",
    "ap-3-d-art-and-design",
    "ap-drawing",
    "ap-music-theory",
    "ap-art-history",
  ],
  CS: [
    "ap-computer-science-a",
    "ap-computer-science-principles",
  ],
};

function navigateTo(path) {
  history.pushState(null, "", path);
  router();
}

function stripExtension(filename) {
  const name = String(filename || "");
  return name.replace(/\.[^/.]+$/, "");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeText(s) {
  return escapeHtml(String(s ?? ""));
}

function getCourseSlugFromTitle(courseTitle) {
  return String(courseTitle || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCourseKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function primaryUnitLabel(units) {
  if (!Array.isArray(units) || units.length === 0) return "Question";
  const u0 = String(units[0] ?? "").trim();
  if (!u0) return "Question";
  return u0.replace(/^Unit\s*\d+\s*:\s*/i, "");
}

function buildQuestionTitle(item) {
  const year = String(item?.year ?? "").trim();
  const qt = String(item?.question_type ?? "").trim();

  const unitLabel = primaryUnitLabel(item?.units);
  const base = qt ? `${year} ${qt}` : `${year} ${unitLabel}`;
  return base.trim() || "Question";
}

function getCourseCategory(slug) {
  const normalized = normalizeCourseKey(slug);
  for (const [cat, slugs] of Object.entries(HOME_CATEGORIES)) {
    if (slugs.map(normalizeCourseKey).includes(normalized)) return cat;
  }
  return "Course";
}

// ---------- Resource grouping ----------
function normalizeResourceName(file) {
  return stripExtension(file?.name || file?.url || "").toLowerCase();
}

function isFrqFile(name) {
  return (
    name.includes("free-response questions") ||
    name.includes("free response questions") ||
    name.includes("free-response question") ||
    name.includes("free response question") ||
    name.includes("all questions") ||
    name.includes("frq")
  );
}

function isScoringGuidelinesFile(name) {
  return (
    name.includes("scoring guidelines") ||
    name.includes("scoring guideline") ||
    name.includes("scoring guide") ||
    name.includes("scoring rubric")
  );
}

function isSampleResponsesFile(name) {
  return (
    name.includes("sample response") ||
    name.includes("sample responses") ||
    name.includes("student sample") ||
    name.includes("student samples") ||
    name.includes("samples and commentary") ||
    name.includes("sample") ||
    /^q\d+\b/.test(name) ||
    /\bq\d+\b/.test(name)
  );
}

function getResourceRank(file) {
  const name = normalizeResourceName(file);

  if (isFrqFile(name)) return 0;
  if (isScoringGuidelinesFile(name)) return 1;
  if (name.includes("chief reader")) return 2;
  if (name.includes("scoring statistics")) return 3;
  if (name.includes("score distribution") || name.includes("score distributions")) return 4;
  if (name.includes("scoring") || name.includes("score")) return 5;
  if (isSampleResponsesFile(name)) return 6;
  return 7;
}

function getResourceBucket(file) {
  const name = normalizeResourceName(file);

  if (isFrqFile(name) || isScoringGuidelinesFile(name)) return "primary";
  if (isSampleResponsesFile(name)) return "samples";
  return "supplemental";
}

function sortResourceFiles(files) {
  return [...files].sort((a, b) => {
    const ra = getResourceRank(a);
    const rb = getResourceRank(b);
    if (ra !== rb) return ra - rb;

    const aName = normalizeResourceName(a);
    const bName = normalizeResourceName(b);
    return aName.localeCompare(bName);
  });
}

function renderResourceLink(file) {
  const text = stripExtension(file.name);
  return `<li><a class="link" href="${file.url}" target="_blank" rel="noopener">${escapeHtml(text)}</a></li>`;
}

function renderPrimaryResources(files) {
  const filesHtml = sortResourceFiles(files).map(renderResourceLink).join("");

  return `
    <div class="primary-resources">
      <div class="primary-resources-header">
        <h3>FRQs & Scoring Guidelines</h3>
      </div>

      ${
        filesHtml
          ? `<ul class="file-list primary-resource-list">${filesHtml}</ul>`
          : `<p class="empty-resource">No FRQ or scoring guideline files found for this year.</p>`
      }
    </div>
  `;
}

function renderDropdownResources({ title, files }) {
  if (!files.length) return "";

  const filesHtml = sortResourceFiles(files).map(renderResourceLink).join("");

  return `
    <details class="resource-dropdown">
      <summary class="resource-dropdown-summary">
        <span>${escapeHtml(title)}</span>
        <span class="resource-count">${files.length}</span>
      </summary>
      <ul class="file-list dropdown-resource-list">
        ${filesHtml}
      </ul>
    </details>
  `;
}

// ---------- Pages ----------
async function renderHome() {
  setMeta({
    title: "AP FRQ Archive | Free Response Questions",
    description: "Browse AP exam free-response questions, scoring guidelines, and sample responses by course and year.",
  });

  const params = new URLSearchParams(window.location.search);
  const initialQ = params.get("q") || "";
  const initialCat = params.get("cat") || "";

  app.innerHTML = `
    <section class="hero">
      <h1 class="hero-title">AP FRQ Archive</h1>
      <p class="hero-subtitle">
        Search AP exam FRQs, scoring guidelines, and related materials by course, year, or topic.
      </p>

      <div class="home-controls">
        <label class="control-wrap search-wrap" for="home-search">
          <span class="control-label">Search courses</span>
          <input
            id="home-search"
            type="text"
            value="${safeText(initialQ)}"
          />
        </label>

        <label class="control-wrap select-wrap" for="home-category">
          <span class="control-label">Category</span>
          <select id="home-category">
            <option value="">All categories</option>
            ${Object.keys(HOME_CATEGORIES)
              .sort((a, b) => a.localeCompare(b))
              .map((cat) => `<option value="${safeText(cat)}">${safeText(cat)}</option>`)
              .join("")}
          </select>
        </label>
      </div>
    </section>

    <section class="content-section">
      <div class="section-heading-row">
        <div>
          <h2 class="section-title">Courses</h2>
          <p id="home-count" class="section-subtitle home-count-placeholder"></p>
        </div>
      </div>

      <div id="home-courses">${homeSkeleton(12)}</div>
    </section>
  `;

  const mount = document.getElementById("home-courses");
  const countEl = document.getElementById("home-count");
  const searchInp = document.getElementById("home-search");
  const catSel = document.getElementById("home-category");

  if (initialCat) catSel.value = initialCat;

  try {
    const res = await fetch(`/data/courses.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load courses list: ${res.status}`);
    const data = await res.json();

    const coursesRaw = data.courses || [];
    if (coursesRaw.length === 0) {
      mount.innerHTML = `<p class="p">No courses found. Run <code>npm run build:indexes</code>.</p>`;
      countEl.textContent = "";
      return;
    }

    const LAST_COURSES = new Set(["AP 2-D Art and Design", "AP 3-D Art and Design"]);

    const courses = [...coursesRaw].sort((a, b) => {
      const aTitle = COURSE_TITLE_OVERRIDES[a.title] ?? a.title;
      const bTitle = COURSE_TITLE_OVERRIDES[b.title] ?? b.title;

      const aLast = LAST_COURSES.has(aTitle);
      const bLast = LAST_COURSES.has(bTitle);

      if (aLast && !bLast) return 1;
      if (!aLast && bLast) return -1;

      return aTitle.localeCompare(bTitle);
    });

    const favorites = getFavoriteCourses();

    const slugToCats = new Map();
    for (const [cat, slugs] of Object.entries(HOME_CATEGORIES)) {
      for (const s of slugs) {
        const key = normalizeCourseKey(s);
        if (!key) continue;
        if (!slugToCats.has(key)) slugToCats.set(key, new Set());
        slugToCats.get(key).add(cat);
      }
    }

    function syncHomeUrl() {
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.searchParams.delete("type");
      url.searchParams.delete("unit");
      url.searchParams.delete("q");
      url.searchParams.delete("cat");

      const q = searchInp.value.trim();
      const cat = catSel.value;

      if (q) url.searchParams.set("q", q);
      if (cat) url.searchParams.set("cat", cat);

      const next = url.searchParams.toString();
      history.replaceState(null, "", url.pathname + (next ? "?" + next : ""));
    }

    function sortWithFavorites(list) {
      return [...list].sort((a, b) => {
        const aFav = favorites.has(a.slug);
        const bFav = favorites.has(b.slug);

        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;

        const aTitle = COURSE_TITLE_OVERRIDES[a.title] ?? a.title;
        const bTitle = COURSE_TITLE_OVERRIDES[b.title] ?? b.title;

        const aLast = LAST_COURSES.has(aTitle);
        const bLast = LAST_COURSES.has(bTitle);

        if (aLast && !bLast) return 1;
        if (!aLast && bLast) return -1;

        return aTitle.localeCompare(bTitle);
      });
    }

    function wireFavoriteButtons() {
      document.querySelectorAll(".favorite-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const slug = btn.dataset.slug;
          if (!slug) return;

          if (favorites.has(slug)) {
            favorites.delete(slug);
          } else {
            favorites.add(slug);
          }

          saveFavoriteCourses(favorites);
          applyHomeFilters();
        });
      });
    }

    function renderGrid(list) {
      const sortedList = sortWithFavorites(list);
      const favoriteCount = sortedList.filter((c) => favorites.has(c.slug)).length;

      countEl.textContent =
        favoriteCount > 0
          ? `Showing ${sortedList.length} of ${courses.length} courses. ${favoriteCount} favorited.`
          : `Showing ${sortedList.length} of ${courses.length} courses`;

      mount.innerHTML = `
        <section class="grid">
          ${sortedList
            .map((c) => {
              const title = COURSE_TITLE_OVERRIDES[c.title] ?? c.title;
              const category = getCourseCategory(c.slug);
              const isFavorite = favorites.has(c.slug);

              return `
                <article class="course-card ${isFavorite ? "is-favorite" : ""}">
                  <button
                    class="favorite-btn"
                    type="button"
                    data-slug="${escapeHtml(c.slug)}"
                    aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
                    title="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
                  >
                    ${isFavorite ? "★" : "☆"}
                  </button>

                  <a class="course-title-link" href="/course/${encodeURIComponent(c.slug)}" data-link>
                    <span class="course-title">${escapeHtml(title)}</span>
                    <span class="course-category">${escapeHtml(category)}</span>
                  </a>
                </article>
              `;
            })
            .join("")}
        </section>
      `;

      wireFavoriteButtons();
    }

    function applyHomeFilters() {
      const q = searchInp.value.trim().toLowerCase();
      const cat = catSel.value;

      const filtered = courses.filter((c) => {
        const title = String(COURSE_TITLE_OVERRIDES[c.title] ?? c.title ?? "");
        const slugRaw = String(c.slug || "");
        const normalizedCourseKey = normalizeCourseKey(slugRaw || title);

        if (q) {
          const hay = `${title} ${slugRaw}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }

        if (cat) {
          const cats = slugToCats.get(normalizedCourseKey);
          if (!cats || !cats.has(cat)) return false;
        }

        return true;
      });

      renderGrid(filtered);
      syncHomeUrl();
    }

    searchInp.addEventListener("input", applyHomeFilters);
    catSel.addEventListener("change", applyHomeFilters);

    applyHomeFilters();
  } catch (err) {
    mount.innerHTML = `
      <p class="p">Could not load your courses list.</p>
      <ul class="file-list">
        <li>Run <code>npm run build:indexes</code> to generate <code>/data/courses.json</code></li>
        <li>Ensure you are using a server, not opening the file directly</li>
      </ul>
      <p class="p" style="color: var(--muted);">Error: ${escapeHtml(String(err.message || err))}</p>
    `;
    countEl.textContent = "";
  }
}

async function renderCourse(slug) {
  const params = new URLSearchParams(window.location.search);
  const activeView = params.get("view") || "year";

  setMeta({
    title: `${slug} | APFRQs`,
    description: `AP materials for ${slug}.`,
  });

  app.innerHTML = `
    <div class="breadcrumbs">
      <a class="link" href="/" data-link>Home</a>
      <span> / </span>
      <span>${escapeHtml(slug)}</span>
    </div>

    <section class="card page-card">
      <div class="course-header">
        <div>
          <div class="kicker">Course archive</div>
          <h1 class="h1">${escapeHtml(slug)}</h1>
        </div>
      </div>

      <div class="tabs" role="tablist" aria-label="Course view">
        <button class="tab ${activeView === "year" ? "active" : ""}" data-view="year" type="button">By year</button>
        <button class="tab ${activeView === "topic" ? "active" : ""}" data-view="topic" type="button">By topic</button>
      </div>

      <p class="p seo-blurb">
        Archived ${escapeHtml(slug)} free-response questions, scoring guidelines, and related exam materials.
      </p>

      <div id="course-content">${courseSkeleton(6)}</div>
    </section>
  `;

  const mount = document.getElementById("course-content");

  try {
    const encodedSlug = encodeURIComponent(slug);

    const index = await fetchJsonFirstOk([
      `/data/course-${encodedSlug}.json`,
      `/data/course-${slug}.json`,
      `/data/course-${encodedSlug.replace(/%20/g, "+")}.json`,
    ]);

    const courseTitle = COURSE_TITLE_OVERRIDES[index.title] ?? index.title ?? slug;
    const h1 = app.querySelector("h1.h1");
    if (h1) h1.textContent = courseTitle;

    if (activeView === "topic") {
      setMeta({
        title: `${courseTitle} By Topic | APFRQs`,
        description: `${courseTitle} questions organized by unit, with optional question type filtering when available.`,
      });
    } else {
      setMeta({
        title: `${courseTitle} By Year | APFRQs`,
        description: `${courseTitle} free-response questions and related resources, organized by year.`,
      });
    }

    document.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.view || "year";
        const url = new URL(window.location.href);
        url.searchParams.set("view", v);

        if (v !== "topic") {
          url.searchParams.delete("type");
          url.searchParams.delete("unit");
          url.searchParams.delete("q");
        }

        navigateTo(url.pathname + "?" + url.searchParams.toString());
      });
    });

    if (activeView === "topic") {
      await renderCourseByTopic({
        mount,
        courseTitle,
        indexTitleForSlug: index.title ?? slug,
      });
      return;
    }

    renderCourseByYear({ mount, courseTitle, index });
  } catch (err) {
    mount.innerHTML = `
      <p class="p">Could not load this course index.</p>
      <ul class="file-list">
        <li>Run <code>npm run build:indexes</code> and push the updated <code>data/</code> folder</li>
      </ul>
      <p class="p" style="color: var(--muted);">Error: ${escapeHtml(String(err.message || err))}</p>
    `;
  }
}

function renderCourseByYear({ mount, courseTitle, index }) {
  const yearsAll = index.years || [];
  if (yearsAll.length === 0) {
    mount.innerHTML = `<p class="p">No years found for this course.</p>`;
    return;
  }

  const html = yearsAll
    .map((y) => {
      const files = [...(y.files || [])];

      const grouped = {
        primary: [],
        supplemental: [],
        samples: [],
      };

      for (const file of files) {
        grouped[getResourceBucket(file)].push(file);
      }

      const totalFiles = files.length;

      return `
        <details class="details">
          <summary class="summary">${escapeHtml(y.year)}</summary>
          <div class="seo-link">
            ${escapeHtml(courseTitle)} ${escapeHtml(y.year)} resources
            ${totalFiles ? ` · ${totalFiles} file${totalFiles === 1 ? "" : "s"}` : ""}
          </div>

          ${
            totalFiles
              ? `<div class="year-resources">
                  ${renderPrimaryResources(grouped.primary)}

                  <div class="secondary-resource-dropdowns">
                    ${renderDropdownResources({
                      title: "Sample Responses",
                      files: grouped.samples,
                    })}

                    ${renderDropdownResources({
                      title: "Reports, Statistics & Other Files",
                      files: grouped.supplemental,
                    })}
                  </div>
                </div>`
              : `<p class="p" style="color: var(--muted); margin-top: 14px;">No files found in this year.</p>`
          }
        </details>
      `;
    })
    .join("");

  mount.innerHTML = html;
}

async function renderCourseByTopic({ mount, courseTitle, indexTitleForSlug }) {
  const courseSlug = getCourseSlugFromTitle(indexTitleForSlug);

  let qIndex = null;
  try {
    qIndex = await fetchJsonFirstOk([`/data/questions-${courseSlug}.json`]);
  } catch (e) {
    mount.innerHTML = `
      <p class="p"><strong>By topic is not available for this course yet.</strong></p>
      <ul class="file-list">
        <li>Missing <code>/data/questions-${escapeHtml(courseSlug)}.json</code></li>
        <li>If you want it enabled, add question JSONs under <code>/questions/${escapeHtml(courseTitle)}/</code> and rerun <code>npm run build:indexes</code></li>
      </ul>
    `;
    return;
  }

  const allQuestionsRaw = Array.isArray(qIndex?.questions) ? qIndex.questions : [];
  const allUnits = Array.isArray(qIndex?.units) ? qIndex.units : [];

  if (allQuestionsRaw.length === 0) {
    mount.innerHTML = `
      <p class="p"><strong>By topic is not available for this course yet.</strong></p>
      <p class="p" style="color: var(--muted);">No questions were found in the generated questions index.</p>
    `;
    return;
  }

  const normalizedTypes = allQuestionsRaw
    .map((q) => String(q?.question_type ?? "").trim())
    .filter((t) => t.length > 0);

  const hasTypeFilter = normalizedTypes.length > 0;
  const uniqueTypes = Array.from(new Set(normalizedTypes)).sort();

  const params = new URLSearchParams(window.location.search);
  const initialType = hasTypeFilter ? params.get("type") || "" : "";
  const initialUnit = params.get("unit") || "";
  const initialQ = params.get("q") || "";

  mount.innerHTML = `
    <div class="filters">
      ${
        hasTypeFilter
          ? `<label class="mini-control">
              <span class="control-label">Type</span>
              <select id="filter-type">
                <option value="">All question types</option>
                ${uniqueTypes.map((t) => `<option value="${safeText(t)}">${safeText(t)}</option>`).join("")}
              </select>
            </label>`
          : `<div class="p" style="margin:0; color: var(--muted);">Question types not available for this course</div>`
      }

      <label class="mini-control">
        <span class="control-label">Unit</span>
        <select id="filter-unit">
          <option value="">All units</option>
          ${allUnits.map((u) => `<option value="${safeText(u)}">${safeText(u)}</option>`).join("")}
        </select>
      </label>

      <label class="mini-control search-mini">
        <span class="control-label">Search</span>
        <input id="filter-search" type="text" placeholder="Search year or unit" />
      </label>

      <button id="filter-reset" class="tab" type="button">Reset</button>
    </div>

    <div class="p" id="topic-count"></div>
    <div id="topic-results" class="topic-results-reserved">${courseSkeleton(4)}</div>
  `;

  const typeSel = hasTypeFilter ? document.getElementById("filter-type") : null;
  const unitSel = document.getElementById("filter-unit");
  const searchInp = document.getElementById("filter-search");
  const resetBtn = document.getElementById("filter-reset");
  const countEl = document.getElementById("topic-count");
  const results = document.getElementById("topic-results");

  if (typeSel && initialType) typeSel.value = initialType;
  if (initialUnit) unitSel.value = initialUnit;
  if (initialQ) searchInp.value = initialQ;

  function writeUrlFromState({ includeSearch }) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "topic");

    if (typeSel) {
      if (typeSel.value) url.searchParams.set("type", typeSel.value);
      else url.searchParams.delete("type");
    } else {
      url.searchParams.delete("type");
    }

    if (unitSel.value) url.searchParams.set("unit", unitSel.value);
    else url.searchParams.delete("unit");

    if (includeSearch) {
      const q = searchInp.value.trim();
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
    }

    history.replaceState(null, "", url.pathname + "?" + url.searchParams.toString());
  }

  function renderList(items) {
    countEl.textContent = `Showing ${items.length} of ${allQuestionsRaw.length}`;

    const titleCounts = new Map();

    const listHtml = items
      .map((item) => {
        const questionUrl = safeText(item.question_pdf);

        const baseTitle = buildQuestionTitle(item);
        const seen = (titleCounts.get(baseTitle) || 0) + 1;
        titleCounts.set(baseTitle, seen);

        const displayTitle = seen === 1 ? baseTitle : `${baseTitle} - ${seen}`;
        const units = Array.isArray(item.units) ? item.units : [];
        const unitBadges = units.slice(0, 6).map((u) => `<span class="badge">${safeText(u)}</span>`).join("");

        return `
          <li>
            <a class="link" href="${questionUrl}" target="_blank" rel="noopener" style="font-weight: 800;">
              ${safeText(displayTitle)}
            </a>
            ${units.length ? `<div class="badges">${unitBadges}</div>` : ""}
          </li>
        `;
      })
      .join("");

    results.innerHTML = `
      <ul class="file-list resource-list">
        ${listHtml || `<li class="p" style="color: var(--muted);">No matching questions.</li>`}
      </ul>
    `;
  }

  function applyFilters() {
    const t = typeSel ? typeSel.value : "";
    const u = unitSel.value;
    const qText = (searchInp.value || "").trim().toLowerCase();

    const filtered = allQuestionsRaw
      .filter((item) => {
        const itemType = String(item?.question_type ?? "").trim();

        if (t && itemType !== t) return false;

        if (u) {
          const units = Array.isArray(item.units) ? item.units : [];
          if (!units.includes(u)) return false;
        }

        if (qText) {
          const hay = [
            String(item.year ?? ""),
            itemType,
            ...(Array.isArray(item.units) ? item.units : []),
            String(item.file_base ?? ""),
          ]
            .join(" ")
            .toLowerCase();

          if (!hay.includes(qText)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const ya = Number(a.year) || 0;
        const yb = Number(b.year) || 0;
        if (ya !== yb) return yb - ya;

        const ta = String(a?.question_type ?? "").trim();
        const tb = String(b?.question_type ?? "").trim();
        if (ta !== tb) return ta.localeCompare(tb);

        const ua = primaryUnitLabel(a?.units);
        const ub = primaryUnitLabel(b?.units);
        if (ua !== ub) return ua.localeCompare(ub);

        return String(a.file_base || "").localeCompare(String(b.file_base || ""));
      });

    renderList(filtered);
  }

  function runFiltersAndSyncUrl() {
    writeUrlFromState({ includeSearch: false });
    applyFilters();
  }

  if (typeSel) typeSel.addEventListener("change", runFiltersAndSyncUrl);
  unitSel.addEventListener("change", runFiltersAndSyncUrl);

  searchInp.addEventListener("input", () => {
    writeUrlFromState({ includeSearch: true });
    applyFilters();
  });

  resetBtn.addEventListener("click", () => {
    if (typeSel) typeSel.value = "";
    unitSel.value = "";
    searchInp.value = "";

    const url = new URL(window.location.href);
    url.searchParams.set("view", "topic");
    url.searchParams.delete("type");
    url.searchParams.delete("unit");
    url.searchParams.delete("q");
    history.replaceState(null, "", url.pathname + "?" + url.searchParams.toString());

    applyFilters();
  });

  applyFilters();
}

// ---------- Router ----------
const routes = [{ path: "/", render: renderHome }];

function matchRoute(pathname) {
  for (const r of routes) {
    if (r.path === pathname) return { route: r, params: {} };
  }

  const m = pathname.match(/^\/course\/([^/]+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    return { route: { render: () => renderCourse(slug) }, params: { slug } };
  }

  return null;
}

function router() {
  const pathname = window.location.pathname;
  const matched = matchRoute(pathname);

  if (!matched) {
    setMeta({ title: "404 | APFRQs", description: "Page not found." });
    app.innerHTML = `
      <section class="card page-card">
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

document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-link]");
  if (!link) return;

  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return;

  e.preventDefault();
  navigateTo(url.pathname + url.search);
});

window.addEventListener("popstate", router);

router();