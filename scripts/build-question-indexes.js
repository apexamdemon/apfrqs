import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();
const QUESTIONS_DIR = path.join(PROJECT_ROOT, "questions");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "data");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      acc.push(full);
    }
  }
  return acc;
}

// If questions folder doesn't exist, fail loudly
if (!fs.existsSync(QUESTIONS_DIR)) {
  console.error(`Missing questions directory: ${QUESTIONS_DIR}`);
  process.exit(1);
}

for (const courseDir of fs.readdirSync(QUESTIONS_DIR)) {
  const coursePath = path.join(QUESTIONS_DIR, courseDir);
  if (!fs.statSync(coursePath).isDirectory()) continue;

  const slug = slugify(courseDir);

  const questions = [];
  const unitSet = new Set();
  const typeSet = new Set();

  const jsonFiles = walk(coursePath);

  for (const jsonPath of jsonFiles) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch (e) {
      console.warn(`Skipping invalid JSON: ${jsonPath}`);
      continue;
    }

    // Compute these first, before using them
    const base = path.basename(jsonPath, ".json");
    const relDir = path.relative(PROJECT_ROOT, path.dirname(jsonPath)).replaceAll("\\", "/");

    // Minimum required fields
    if (!raw.year || !Array.isArray(raw.units)) continue;

    // question_type optional and may be null
    const qt =
      raw.question_type === null || raw.question_type === undefined
        ? null
        : String(raw.question_type).trim() || null;

    // Aggregate units and types
    for (const u of raw.units) unitSet.add(u);
    if (qt) typeSet.add(qt);

    // Store question record
    questions.push({
      year: Number(raw.year),
      question_type: qt, // may be null
      units: raw.units,
      file_base: base,
      question_pdf: `/${relDir}/${base}.pdf`,
    });
  }

  const output = {
    course: courseDir,
    question_types: Array.from(typeSet).sort(),
    units: Array.from(unitSet).sort(),
    questions: questions.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0)),
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, `questions-${slug}.json`), JSON.stringify(output, null, 2));
  console.log(`Built questions-${slug}.json (${output.questions.length} questions)`);
}
