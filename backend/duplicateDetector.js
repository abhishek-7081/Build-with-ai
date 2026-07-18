/**
 * Duplicate Complaint Detector
 * Computes text and location similarity between incoming and existing reports.
 */

// Common English stopwords to ignore during text tokenization
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "cant", "cannot", "could", "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadnt", "has", "hasnt", "have", "havent",
  "having", "he", "hed", "hell", "hes", "her", "here", "heres", "hers", "herself", "him", "himself",
  "his", "how", "hows", "i", "id", "ill", "im", "ive", "if", "in", "into", "is", "isnt", "it", "its",
  "itself", "lets", "me", "more", "most", "mustnt", "my", "myself", "no", "nor", "not", "of", "off",
  "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
  "same", "shant", "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such", "than",
  "that", "thats", "the", "their", "theirs", "them", "themselves", "then", "there", "theres", "these",
  "they", "theyd", "theyll", "theyre", "theyve", "this", "those", "through", "to", "too", "under",
  "until", "up", "very", "was", "wasnt", "we", "wed", "well", "were", "weve", "werent", "what", "whats",
  "when", "whens", "where", "wheres", "which", "while", "who", "whos", "whom", "why", "whys", "with",
  "wont", "would", "wouldnt", "you", "youd", "youll", "youre", "youve", "your", "yours", "yourself",
  "yourselves", "there", "is", "are", "causes", "causing", "please", "issue", "problem", "delhi", "metro", "station"
]);

/**
 * Tokenize a string, clean it, and filter out stopwords
 * @param {string} text 
 * @returns {Set<string>} Set of unique word tokens
 */
function tokenize(text) {
  if (!text) return new Set();
  const cleaned = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ");
  
  const tokens = cleaned.split(" ").filter(word => {
    return word.length > 2 && !STOPWORDS.has(word);
  });
  
  return new Set(tokens);
}

/**
 * Calculate Jaccard Similarity between two sets
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
function calculateJaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }
  
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Check if two location strings are highly likely to be the same place
 */
function checkLocationOverlap(locA, locB) {
  if (!locA || !locB) return false;
  
  const a = locA.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
  const b = locB.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
  
  if (a === b) return true;
  if (a.includes(b) && b.length > 4) return true;
  if (b.includes(a) && a.length > 4) return true;
  
  // Calculate keyword matches for location
  const tokensA = new Set(a.split(" ").filter(w => w.length > 2 && w !== "near" && w !== "gate" && w !== "metro"));
  const tokensB = new Set(b.split(" ").filter(w => w.length > 2 && w !== "near" && w !== "gate" && w !== "metro"));
  
  if (tokensA.size === 0 || tokensB.size === 0) return false;
  
  let matchCount = 0;
  for (const item of tokensA) {
    if (tokensB.has(item)) {
      matchCount++;
    }
  }
  
  // If they share at least 2 core location words (e.g. "rajiv", "chowk"), classify as overlap
  return matchCount >= 2 || (matchCount >= 1 && tokensA.size === 1 && tokensB.size === 1);
}

/**
 * Scan existing active complaints and find if the incoming description is a duplicate
 * @param {object} incomingReport { description, category, location }
 * @param {Array<object>} activeComplaints List of active complaints of the SAME category
 * @returns {object|null} The matching complaint, or null if no duplicate
 */
export function findDuplicateComplaint(incomingReport, activeComplaints) {
  const incomingTokens = tokenize(incomingReport.description);
  const incomingLoc = incomingReport.location;
  
  let bestMatch = null;
  let maxSimilarity = 0;
  
  // Only look at active complaints (Pending or In Progress) of the SAME category
  const candidateComplaints = activeComplaints.filter(c => 
    c.category === incomingReport.category && 
    c.status !== "Resolved"
  );
  
  for (const complaint of candidateComplaints) {
    // 1. Text Similarity
    const existingTokens = tokenize(complaint.description);
    const textSimilarity = calculateJaccardSimilarity(incomingTokens, existingTokens);
    
    // 2. Location Match
    const locationOverlap = checkLocationOverlap(incomingLoc, complaint.location);
    
    // Criteria for duplication:
    // Case A: High text similarity (>= 0.4) and at least some location overlap/same area
    // Case B: Moderate text similarity (>= 0.3) and strong location overlap
    // Case C: Explicit landmark match + moderate similarity
    if (locationOverlap && textSimilarity >= 0.28) {
      if (textSimilarity > maxSimilarity) {
        maxSimilarity = textSimilarity;
        bestMatch = complaint;
      }
    } else if (textSimilarity >= 0.45) {
      // Very high text similarity (sometimes users describe the exact same thing but don't specify location)
      if (textSimilarity > maxSimilarity) {
        maxSimilarity = textSimilarity;
        bestMatch = complaint;
      }
    }
  }
  
  if (bestMatch) {
    return {
      complaint: bestMatch,
      similarity: parseFloat(maxSimilarity.toFixed(2))
    };
  }
  
  return null;
}
