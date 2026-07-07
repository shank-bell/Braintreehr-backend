// Slug generation for job postings — deliberately NOT in lib/embeddings.ts.
// This is plain job-board utility code with zero chatbot dependency;
// keeping it separate means Phase 3 (admin job CRUD) never has to import
// from the RAG pipeline file, which is fully deferred to Phase 5.
// Design doc §10.1, §10.2 (pseudocode).

export function makeSlug(title: string, existingSlugs: string[]): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const existing = new Set(existingSlugs);
  if (!existing.has(base)) return base;

  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
