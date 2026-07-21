import dotenv from 'dotenv';
dotenv.config();

export const DEPARTMENTS = [
  "PWD", "MCD", "DJB", "DTL / DISCOM", "Edistrict Delhi",
  "DTC", "Delhi Police", "Delhi Traffic Police", "DPCC", "Delhi Civic helpline",
];

export const SEVERITY_LEVELS = ["High", "Medium", "Low"];

export const DELHI_PLACES = [
  "Anand Vihar", "Ashok Vihar", "Babarpur", "Badarpur", "Bawana", "Bhajanpura",
  "Bijwasan", "Chanakyapuri", "Chandni Chowk", "Chhatarpur", "Civil Lines",
  "Connaught Place", "Daryaganj", "Defense Colony", "Delhi Cantonment",
  "Dilshad Garden", "Dwarka", "Geeta Colony", "Gokulpuri", "Gole Market",
  "Govindpuri", "Greater Kailash", "Green Park", "GTB Nagar", "Hari Nagar",
  "Hauz Khas", "ITO", "Jamia Nagar", "Janakpuri", "Jor Bagh", "Kalkaji",
  "Kamla Nagar", "Kapashera", "Karol Bagh", "Kashmere Gate", "Kirti Nagar",
  "Kotwali", "Lajpat Nagar", "Laxmi Nagar", "Lodhi Colony", "Mahipalpur",
  "Malviya Nagar", "Mangolpuri", "Mayur Vihar", "Mehrauli", "Model Town",
  "Moti Nagar", "Mukherjee Nagar", "Munirka", "Najafgarh", "Nand Nagri",
  "Narela", "Nehru Place", "New Friends Colony", "Nizamuddin", "Okhla",
  "Paharganj", "Palam", "Pandav Nagar", "Paschim Vihar", "Patel Nagar",
  "Patparganj", "Pitampura", "Pragati Maidan", "Preet Vihar", "Punjabi Bagh",
  "R.K. Puram", "Rajendra Nagar", "Rajouri Garden", "Rohini", "Sadar Bazaar",
  "Safdarjung Enclave", "Saket", "Saraswati Vihar", "Sarita Vihar", "Seelampur",
  "Seemapuri", "Shahdara", "Shalimar Bagh", "Shastri Park", "South Extension",
  "Sultanpuri", "Tilak Nagar", "Timarpur", "Uttam Nagar", "Vasant Kunj",
  "Vasant Vihar", "Vasundhara Enclave", "Vikaspuri", "Vivek Vihar", "Yamuna Vihar"
];

/**
 * Analyzes description text using OpenRouter AI or fallback heuristic
 * @param {string} description 
 * @returns {Promise<object>} Structured AI analysis
 */
export async function analyzeDescription(description) {
  if (!description || typeof description !== "string" || description.trim() === "") {
    return fallbackCategorize(description || "");
  }

  const system_prompt = `
    You are an intelligent civic issue router for Delhi. Analyze the input.
    
    1. CATEGORY: Map the issue to EXACTLY ONE department: ${JSON.stringify(DEPARTMENTS)}
    2. SEVERITY: Assign severity based on safety risks: ${JSON.stringify(SEVERITY_LEVELS)}
    3. LOCATION: Extract the location mentioned in the input and match it to one of these places: ${JSON.stringify(DELHI_PLACES)}. 
       IMPORTANT: If the location does not exactly match the list, extract the specific street, road, landmark, or local area mentioned in the text (e.g., "Outer Ring Road"). 
       If absolutely no location or landmark is mentioned, use null.
    4. DESCRIPTION: Create a concise, 1-sentence summary of the problem.

    Output ONLY a valid JSON object with these exact keys, no markdown, no extra text:
    {
        "Description": "Concise summary",
        "Severity": "High/Medium/Low",
        "Department": "Matched Department",
        "Location": "Matched Location, Extracted Landmark, or null"
    }
  `;

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("Missing OPENROUTER_API_KEY in environment. Using fallback categorizer.");
      return fallbackCategorize(description);
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: description }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error status: ${response.statusText}`);
    }

    const data = await response.json();
    let resultText = data.choices[0].message.content.trim();

    if (resultText.startsWith("```json")) {
      resultText = resultText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (resultText.startsWith("```")) {
      resultText = resultText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(resultText);
    const desc = parsed.Description || "Unknown civic issue";
    const loc = parsed.Location && parsed.Location !== "null" ? parsed.Location : null;

    const words = desc.split(/\s+/);
    let title = words.slice(0, 5).join(" ");
    if (words.length > 5) title += "...";

    return {
      category: parsed.Department || "Others",
      department: parsed.Department || "Delhi Civic helpline",
      severity: parsed.Severity || "Low",
      title: title,
      summary: desc,
      location: loc,
      confidence: 0.95
    };
  } catch (error) {
    console.error("Failed to analyze description via AI service:", error.message);
    return fallbackCategorize(description);
  }
}

/**
 * Endpoint processor contract for /api/submit-problem matching original functiondisc payload
 */
export async function processProblemSubmission({ problem_description, location }) {
  if (!problem_description) {
    throw new Error("Missing problem_description parameter");
  }

  const aiResult = await analyzeDescription(problem_description);

  return {
    id: null,
    status: "Pending",
    received_at: new Date().toISOString(),
    description: aiResult.summary || problem_description,
    severity: aiResult.severity || "Low",
    department: aiResult.department || "Delhi Civic helpline",
    location: aiResult.location || location || null,
    resolved_date: null
  };
}

function fallbackCategorize(description) {
  const text = (description || "").toLowerCase();
  let dept = "Delhi Civic helpline";
  let cat = "Others";
  let sev = "Medium";

  if (text.includes("road") || text.includes("pothole") || text.includes("drain")) {
    dept = "PWD";
    cat = "Road Damage";
    sev = "High";
  } else if (text.includes("water") || text.includes("leak") || text.includes("sewage")) {
    dept = "DJB";
    cat = "Water Leakage";
    sev = "High";
  } else if (text.includes("light") || text.includes("garbage") || text.includes("encroach")) {
    dept = "MCD";
    cat = text.includes("garbage") ? "Garbage Collection" : "Street Lights";
    sev = "Medium";
  } else if (text.includes("traffic") || text.includes("parking") || text.includes("signal")) {
    dept = "Delhi Traffic Police";
    cat = "Traffic Signals";
    sev = "Medium";
  } else if (text.includes("electric") || text.includes("power") || text.includes("spark")) {
    dept = "DTL / DISCOM";
    cat = "Electricity";
    sev = "High";
  }

  const words = (description || "New Complaint").split(/\s+/);
  let title = words.slice(0, 5).join(" ");
  if (words.length > 5) title += "...";

  return {
    category: cat,
    department: dept,
    severity: sev,
    title: title || "Grievance Report",
    summary: description ? description.substring(0, 60) + "..." : "No detailed description provided.",
    location: null,
    confidence: 0.6
  };
}
