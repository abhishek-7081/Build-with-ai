/**
 * NLP Processor for Delhi Civic Service Navigator
 * Extracts category, department, severity, location, title, and summary from descriptions.
 */

const CATEGORIES = [
  "Road Damage",
  "Garbage Collection",
  "Water Supply",
  "Water Leakage",
  "Sewage Problems",
  "Street Lights",
  "Electricity",
  "Public Transport",
  "Traffic Signals",
  "Illegal Parking",
  "Encroachment",
  "Air Pollution",
  "Tree Fallen",
  "Drainage",
  "Public Toilets",
  "Others"
];

// Mapping of categories to Delhi government departments
const DEPARTMENT_MAPPING = {
  "Road Damage": "PWD (Public Works Department)",
  "Garbage Collection": "MCD (Municipal Corporation of Delhi)",
  "Water Supply": "DJB (Delhi Jal Board)",
  "Water Leakage": "DJB (Delhi Jal Board)",
  "Sewage Problems": "DJB (Delhi Jal Board)",
  "Street Lights": "MCD (Municipal Corporation of Delhi)",
  "Electricity": "DTL / DISCOM (Tata Power/BSES)",
  "Public Transport": "DTC (Delhi Transport Corporation)",
  "Traffic Signals": "Delhi Traffic Police",
  "Illegal Parking": "Delhi Traffic Police / MCD",
  "Encroachment": "MCD (Municipal Corporation of Delhi)",
  "Air Pollution": "DPCC (Delhi Pollution Control Committee)",
  "Tree Fallen": "MCD (Horticulture Department)",
  "Drainage": "PWD (Public Works Department)",
  "Public Toilets": "MCD (Municipal Corporation of Delhi)",
  "Others": "Delhi Civic helpline"
};

// Keyword mapping for categories
const CATEGORY_KEYWORDS = {
  "Road Damage": ["pothole", "crater", "broken road", "damaged road", "road damage", "crack", "tar", "asphalt", "flyover crack"],
  "Garbage Collection": ["garbage", "trash", "rubbish", "dump", "waste", "litter", "dustbin", "pile of plastic", "filth", "cleanliness"],
  "Water Supply": ["no water", "low water pressure", "dirty water", "muddy water", "water supply", "drinking water", "scarcity"],
  "Water Leakage": ["leakage", "water leak", "pipe burst", "flowing water", "pipe leak", "water wasting", "broken pipe"],
  "Sewage Problems": ["sewage", "sewer", "manhole", "gutter", "drainage block", "smell", "foul water", "stink"],
  "Street Lights": ["street light", "streetlight", "dark street", "no light", "bulb broken", "lamp post", "lights not working"],
  "Electricity": ["electricity", "power cut", "voltage", "sparks", "loose wire", "transformer", "electric pole", "current", "short circuit"],
  "Public Transport": ["dtc bus", "metro delay", "metro service", "bus frequency", "metro line fault", "metro train", "transit delay", "metro coach", "bus route", "commuter bus", "metro token"],
  "Traffic Signals": ["traffic signal", "traffic light", "red light", "blinker", "zebra crossing", "signal not working", "timer broken"],
  "Illegal Parking": ["illegal parking", "parked car", "blocking road", "no parking zone", "wrong parking", "vehicle block"],
  "Encroachment": ["encroachment", "hawker", "vendors", "footpath block", "illegal shop", " कब्जा", "street vendor blocking"],
  "Air Pollution": ["pollution", "smoke", "smog", "dust", "burning waste", "toxic air", "breathing", "aqi", "bad air quality"],
  "Tree Fallen": ["tree fell", "fallen tree", "branch", "blocked by tree", "tree broken", "uprooted tree"],
  "Drainage": ["drain", "water logging", "waterlogged", "flooded road", "clogged drain", "drainage overflow"],
  "Public Toilets": ["toilet", "public toilet", "urinal", "sulabh", "washroom", "dirty toilet", "no water in toilet"],
};

// Words that indicate high severity and safety issues
const SEVERITY_KEYWORDS = {
  "Critical": ["sparks", "fire", "live wire", "electrocution", "current flowing", "short circuit", "open transformer", "cave in", "sinkhole", "toxic gas", "open manhole", "chemical leak"],
  "High": ["accident", "collision", "danger", "injured", "hazard", "blocking traffic", "jam", "huge pothole", "broken leg", "elderly fell", "slipped", "major leak", "darkness", "cannot breathe"],
  "Medium": ["overflowing", "stinking", "broken", "dirty", "smelly", "not working", "inconvenience", "pile of", "frequent"]
};

/**
 * Extract location from text using common prepositions
 */
function extractLocation(text) {
  // Pattern to look for prepositions followed by a few words (landmarks, street names, etc.)
  // Handles English patterns
  const match = text.match(/(?:near|at|on|opposite|outside|in front of|beside|behind|in)\s+([A-Za-z0-9\s,\-]+(?:\b(?:Metro|Gate|Chowk|Market|Road|Street|Block|Phase|Extension|Sector|Vihar|Nagar|Enclave|Flyover|Park|Red Light|School|Hospital|Mandir|Gurudwara|Masjid|Church)\b)?[A-Za-z0-9\s,\-]*?)(?=\s+(?:is|causes|blocking|causing|due|and|with|there|\.|\,|$))/i);
  
  if (match && match[1]) {
    let loc = match[1].trim();
    // Clean up trailing prepositions or verbs
    loc = loc.replace(/\s+(is|was|causing|causes|blocking|has|and)\b.*$/i, "");
    if (loc.length > 5 && loc.length < 100) {
      return loc;
    }
  }
  
  // Fallback: look for common Delhi places in text
  const commonDelhiPlaces = [
    "Rajiv Chowk", "Connaught Place", "CP", "Dwarka", "Saket", "Noida", "Gurugram", 
    "Rohini", "Janakpuri", "Karol Bagh", "Lajpat Nagar", "Chandni Chowk", "Okhla", 
    "Vasant Kunj", "Munirka", "Hauz Khas", "Nehru Place", "Mayur Vihar", "Shahdara", 
    "Uttam Nagar", "Preet Vihar", "Paschim Vihar", "Pari Chowk", "Kashmere Gate"
  ];
  
  for (const place of commonDelhiPlaces) {
    if (new RegExp("\\b" + place + "\\b", "i").test(text)) {
      return place;
    }
  }
  
  return null;
}

/**
 * Main process function
 * @param {string} description 
 * @returns {object} Structured AI analysis
 */
export function analyzeDescription(description) {
  if (!description || typeof description !== "string") {
    return {
      category: "Others",
      department: "Delhi Civic helpline",
      severity: "Low",
      title: "New Complaint",
      summary: "No description provided.",
      location: null,
      confidence: 0.5
    };
  }

  const text = description.toLowerCase();

  // 1. Categorization
  let categoryScores = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    categoryScores[cat] = 0;
    for (const keyword of keywords) {
      const regex = new RegExp("\\b" + keyword.replace(" ", "\\s+") + "\\b", "gi");
      const matches = text.match(regex);
      if (matches) {
        categoryScores[cat] += matches.length * 2; // Match counts
      }
    }
  }

  // Find max category score
  let detectedCategory = "Others";
  let maxScore = 0;
  for (const [cat, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = cat;
    }
  }

  // If no keywords matched, default to Others or do a simple substring fallback
  if (maxScore === 0) {
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          detectedCategory = cat;
          maxScore = 1;
          break;
        }
      }
      if (maxScore > 0) break;
    }
  }

  // 2. Department Mapping
  const department = DEPARTMENT_MAPPING[detectedCategory] || "Delhi Civic helpline";

  // 3. Severity Analysis
  let severity = "Low";
  let severityScore = 0;

  for (const keyword of SEVERITY_KEYWORDS.Critical) {
    if (text.includes(keyword)) {
      severity = "Critical";
      severityScore = 3;
      break;
    }
  }

  if (severityScore < 3) {
    for (const keyword of SEVERITY_KEYWORDS.High) {
      if (text.includes(keyword)) {
        severity = "High";
        severityScore = 2;
        break;
      }
    }
  }

  if (severityScore < 2) {
    for (const keyword of SEVERITY_KEYWORDS.Medium) {
      if (text.includes(keyword)) {
        severity = "Medium";
        severityScore = 1;
        break;
      }
    }
  }

  // 4. Location Extraction
  const location = extractLocation(description);

  // 5. Title Generation
  let title = "";
  const cleanedDesc = description.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
  const words = cleanedDesc.split(/\s+/);
  
  if (location) {
    title = `${detectedCategory} at ${location}`;
  } else if (words.length > 5) {
    title = words.slice(0, 5).join(" ") + "...";
    // Capitalize first letter of each word
    title = title.replace(/\b\w/g, c => c.toUpperCase());
  } else {
    title = `${detectedCategory} Issue`;
  }

  // 6. Summary Generation
  let summary = "";
  if (words.length <= 10) {
    summary = description;
  } else {
    // Generate clean description-based summary
    let firstSentence = description.split(/[.!?]/)[0].trim();
    if (firstSentence.length < 20) {
      firstSentence = words.slice(0, 12).join(" ") + "...";
    }
    
    // Enrich based on severity & category
    const severityActionText = 
      severity === "Critical" ? "requires immediate emergency response" :
      severity === "High" ? "requires urgent inspection" :
      severity === "Medium" ? "needs prompt attention" : "needs routine maintenance";

    summary = `${firstSentence}. This is classified as a ${detectedCategory} issue under ${department} and ${severityActionText}.`;
  }

  // Calculate confidence score
  const confidence = maxScore > 0 ? Math.min(0.7 + (maxScore * 0.05), 0.98) : 0.65;

  return {
    category: detectedCategory,
    department: department,
    severity: severity,
    title: title,
    summary: summary,
    location: location || "Delhi (General Location)",
    confidence: parseFloat(confidence.toFixed(2))
  };
}
