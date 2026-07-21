/**
 * Calculates Jaccard similarity score between two text strings
 */
export function calculateTextSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const normalize = (text) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const words1 = new Set(normalize(str1));
  const words2 = new Set(normalize(str2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Checks if a new report matches an existing complaint in active DB
 */
export function findDuplicateComplaint(newReport, activeComplaints, textThreshold = 0.35) {
  if (!newReport || !activeComplaints || activeComplaints.length === 0) {
    return null;
  }

  let bestMatch = null;
  let highestScore = 0;

  for (const complaint of activeComplaints) {
    // Must match department/category
    if (complaint.category !== newReport.category) {
      continue;
    }

    const similarity = calculateTextSimilarity(newReport.description, complaint.description);

    if (similarity >= textThreshold && similarity > highestScore) {
      highestScore = similarity;
      bestMatch = {
        complaint,
        similarityScore: similarity
      };
    }
  }

  return bestMatch;
}
