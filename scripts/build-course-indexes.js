// AP/scripts/build-course-indexes.js
// Scans AP/courses/<courseSlug>/<YEAR>/files and generates:
// 1) AP/data/courses.json (list of all courses)
// 2) AP/data/course-<courseSlug>.json (index per course)

import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();
const COURSES_DIR = path.join(PROJECT_ROOT, "courses");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "data");

const ALLOWED_EXT = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
  ".html"
]);

function safeStat(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function isYearFolder(name) {
  return /^\d{4}$/.test(name);
}

// Display text rules (same as you requested)


// Optional: define nicer titles for slugs.
// Add your 30+ classes here over time.
function titleFromSlug(slug) {
  return slug;
}

function buildCourseIndex(courseSlug) {
  const courseDir = path.join(COURSES_DIR, courseSlug);
  const years = fs.readdirSync(courseDir)
    .filter((name) => {
      const full = path.join(courseDir, name);
      const st = safeStat(full);
      return st && st.isDirectory() && isYearFolder(name);
    })
    .sort((a, b) => Number(b) - Number(a));

  const basePath = `/courses/${encodeURIComponent(courseSlug)}`;

  const index = {
    slug: courseSlug,
    title: titleFromSlug(courseSlug),
    basePath,
    generatedAt: new Date().toISOString(),
    years: years.map((year) => {
      const yearDir = path.join(courseDir, year);
      const files = fs.readdirSync(yearDir)
        .filter((fname) => {
          const full = path.join(yearDir, fname);
          const st = safeStat(full);
          if (!st || !st.isFile()) return false;
          const ext = path.extname(fname).toLowerCase();
          return ALLOWED_EXT.has(ext);
        })
        .sort((a, b) => a.localeCompare(b));

      return {
        year,
        files: files.map((fname) => ({
          name: fname,
          url: `${basePath}/${encodeURIComponent(year)}/${encodeURIComponent(fname)}`
        }))
      };
    })
  };

  return index;
}

function main() {
  const coursesStat = safeStat(COURSES_DIR);
  if (!coursesStat || !coursesStat.isDirectory()) {
    console.error(`ERROR: Missing folder: ${COURSES_DIR}`);
    console.error(`Create AP/courses/<courseSlug>/<YEAR>/... first.`);
    process.exit(1);
  }

  const courseSlugs = fs.readdirSync(COURSES_DIR)
    .filter((name) => {
      const full = path.join(COURSES_DIR, name);
      const st = safeStat(full);
      return st && st.isDirectory();
    })
    .sort((a, b) => a.localeCompare(b));

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Build per-course indexes
  const coursesList = [];
  for (const slug of courseSlugs) {
    const idx = buildCourseIndex(slug);
    const outFile = path.join(OUTPUT_DIR, `course-${slug}.json`);
    fs.writeFileSync(outFile, JSON.stringify(idx, null, 2), "utf8");

    coursesList.push({ slug: idx.slug, title: idx.title });
    console.log(`Wrote: ${outFile}`);
  }

  // Build master list
  const master = {
    generatedAt: new Date().toISOString(),
    courses: coursesList
  };
  const masterFile = path.join(OUTPUT_DIR, "courses.json");
  fs.writeFileSync(masterFile, JSON.stringify(master, null, 2), "utf8");
  console.log(`Wrote: ${masterFile}`);
  console.log(`Courses indexed: ${coursesList.length}`);
}

main();