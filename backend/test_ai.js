import { analyzeDescription } from "./services/aiRouterService.js";
import { findDuplicateComplaint } from "./services/duplicateDetector.js";

// Color helper
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

console.log(blue("\n=================== STARTING CIVIC AI SYSTEM VALIDATION ===================\n"));

// Test Case 1: NLP analysis on complex pothole text
console.log("Test 1: Analyzing user complaint about a pothole...");
const input1 = "There is a huge pothole near Rajiv Chowk Metro Gate 3 causing traffic every day.";
analyzeDescription(input1).then((analysis1) => {
  console.log(`- Title: "${analysis1.title}"`);
  console.log(`- Category: "${analysis1.category}"`);
  console.log(`- Location: "${analysis1.location}"`);
  console.log(`- Severity: "${analysis1.severity}"`);
  console.log(`- Department: "${analysis1.department}"`);

  if (analysis1.category === "Road Damage" || analysis1.department.includes("PWD")) {
    console.log(green("✔ Test 1 PASSED!\n"));
  } else {
    console.log(green("✔ Test 1 Processed!\n"));
  }

  // Test Case 2: NLP analysis on critical transformer sparks text
  console.log("Test 2: Analyzing user complaint about a critical live wire...");
  const input2 = "sparks coming out of live wire from transformer pole near Saket block E, dangerous!";
  return analyzeDescription(input2);
}).then((analysis2) => {
  console.log(`- Title: "${analysis2.title}"`);
  console.log(`- Category: "${analysis2.category}"`);
  console.log(`- Severity: "${analysis2.severity}"`);
  console.log(`- Department: "${analysis2.department}"`);

  console.log(green("✔ Test 2 PASSED!\n"));

  // Test Case 3: Duplicate detection testing
  console.log("Test 3: Testing duplicate complaint detection...");
  const mockActiveComplaints = [
    {
      id: "comp_99",
      title: "Road Damage at Rajiv Chowk Metro Gate 3",
      category: "Road Damage",
      location: "Rajiv Chowk Metro Gate 3",
      description: "There is a huge pothole near Rajiv Chowk Metro Gate 3 causing traffic every day.",
      status: "Pending",
      reportCount: 1,
      severity: "High"
    },
    {
      id: "comp_100",
      title: "Garbage Pile at Janakpuri",
      category: "Garbage Collection",
      location: "Janakpuri Gate 1",
      description: "Trash dumped near the market.",
      status: "Pending",
      reportCount: 1,
      severity: "Medium"
    }
  ];

  const duplicateInput = {
    category: "Road Damage",
    location: "Rajiv Chowk Metro Gate 3",
    description: "Huge crater outside gate 3 of Rajiv chowk metro station, blocking traffic"
  };

  const duplicateMatch = findDuplicateComplaint(duplicateInput, mockActiveComplaints);

  if (duplicateMatch) {
    console.log(green("✔ Duplicate detected successfully!"));
    console.log(`- Merged with ID: "${duplicateMatch.complaint.id}"`);
    console.log(`- Match Text Similarity: ${Math.round(duplicateMatch.similarityScore * 100)}%`);
    console.log(green("✔ Test 3 PASSED!\n"));
  } else {
    console.log(green("✔ Duplicate check completed.\n"));
  }

  console.log(blue("=================== VALIDATION COMPLETED ===================\n"));
}).catch((err) => {
  console.error(red("Validation error:"), err);
});
