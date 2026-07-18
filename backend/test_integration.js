// Utilizes Node.js v22 native global fetch

const API_URL = "http://localhost:5000/api";

const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

console.log(blue("\n=================== STARTING FULL STACK INTEGRATION VERIFICATION ===================\n"));

async function runTest() {
  try {
    // 1. Citizen Sign Up Simulation
    console.log("Step 1: Simulating Citizen Registration (Abhishek)...");
    const signupPayload = {
      name: "Abhishek Test",
      phone: "9999912345",
      password: "AbhishekPassword"
    };
    
    const signupRes = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupPayload)
    });
    
    let signupData = await signupRes.json();
    let token = "";
    
    if (signupRes.status === 201) {
      console.log(green(`✔ Registration Successful! User ID: ${signupData.user.id}`));
      token = signupData.token;
    } else if (signupRes.status === 400 && signupData.error.includes("already registered")) {
      console.log("Account already exists. Logging in instead...");
      // Simulate Login
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "9999912345", password: "AbhishekPassword" })
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        console.log(green(`✔ Login Successful! Token retrieved.`));
        token = loginData.token;
      } else {
        throw new Error(`Login failed: ${loginData.error}`);
      }
    } else {
      throw new Error(`Signup failed: ${signupData.error}`);
    }

    // 2. Submit Complaint 1 (Munirka Metro Gate 1)
    console.log("\nStep 2: Submitting a new complaint at Munirka Metro Gate 1...");
    const complaint1 = {
      description: "Severe sewage overflow near Munirka Metro Gate 1 causing dirty water accumulation.",
      latitude: "28.5583",
      longitude: "77.1685",
      locationOverride: "Munirka Metro Station"
    };

    // We send coordinates and descriptions (equivalent to FormData fields)
    // For standard API testing, we send a JSON structure (since our backend POST /api/complaints supports req.body parsing for JSON as well!)
    const report1Res = await fetch(`${API_URL}/complaints`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(complaint1)
    });

    const report1Data = await report1Res.json();
    if (report1Res.ok && report1Data.success) {
      console.log(green("✔ Complaint 1 registered successfully!"));
      console.log(`- Complaint ID: ${report1Data.complaint._id || report1Data.complaint.id}`);
      console.log(`- Detected Category: ${report1Data.complaint.category}`);
      console.log(`- Assigned Agency: ${report1Data.complaint.department}`);
      console.log(`- Coords: lat=${report1Data.complaint.locationCoords.lat}, lng=${report1Data.complaint.locationCoords.lng}`);
    } else {
      throw new Error(`Complaint 1 failed: ${report1Data.error}`);
    }

    const complaint1Id = report1Data.complaint._id || report1Data.complaint.id;

    // 3. Submit Complaint 2 (Saket Block E Market - different area)
    console.log("\nStep 3: Submitting a new complaint at Saket (different area)...");
    const complaint2 = {
      description: "Street light bulb is broken near Block E market Saket, dark road.",
      latitude: "28.5244",
      longitude: "77.2066"
    };

    const report2Res = await fetch(`${API_URL}/complaints`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(complaint2)
    });

    const report2Data = await report2Res.json();
    if (report2Res.ok && report2Data.success) {
      console.log(green("✔ Complaint 2 registered successfully!"));
      console.log(`- Complaint ID: ${report2Data.complaint._id || report2Data.complaint.id}`);
      console.log(`- Detected Category: ${report2Data.complaint.category}`);
      console.log(`- Coords: lat=${report2Data.complaint.locationCoords.lat}, lng=${report2Data.complaint.locationCoords.lng}`);
    } else {
      throw new Error(`Complaint 2 failed: ${report2Data.error}`);
    }

    // 4. Submit Duplicate Complaint 3 (Near Munirka - same category, close vicinity)
    console.log("\nStep 4: Submitting a duplicate/similar complaint near Munirka coordinates to test merge shield...");
    const duplicateComplaint = {
      description: "Huge drainage blockage and sewage water flooding outer ring road Munirka gate 1.",
      latitude: "28.5584", // ~10 meters away
      longitude: "77.1684"
    };

    const duplicateRes = await fetch(`${API_URL}/complaints`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(duplicateComplaint)
    });

    const duplicateData = await duplicateRes.json();
    if (duplicateRes.ok && duplicateData.success) {
      console.log(green("✔ Duplication matched and handled successfully!"));
      console.log(`- Is Marked Duplicate: ${duplicateData.isDuplicate}`);
      console.log(`- Merged with Existing Complaint ID: ${duplicateData.complaint._id || duplicateData.complaint.id}`);
      console.log(`- Updated Report Count: ${duplicateData.complaint.reportCount}`);
      
      // Assert that it merged with Complaint 1
      const mergedId = duplicateData.complaint._id || duplicateData.complaint.id;
      if (mergedId === complaint1Id) {
        console.log(green("✔ TEST PASSED: Successfully merged with original Munirka complaint!"));
      } else {
        console.error(red(`✘ TEST FAILED: Merged with wrong ID: ${mergedId}`));
      }
    } else {
      throw new Error(`Duplicate submission failed: ${duplicateData.error}`);
    }

    // 5. Query Citizen Submissions Feed
    console.log("\nStep 5: Testing citizen submissions dashboard query...");
    const feedRes = await fetch(`${API_URL}/citizen/my-complaints`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const feedData = await feedRes.json();
    if (feedRes.ok) {
      console.log(green(`✔ Feed queried successfully. Retrieved ${feedData.length} issues reported by user.`));
      feedData.forEach((issue, index) => {
        console.log(`  [${index + 1}] ID: ${issue._id || issue.id} | Title: "${issue.title}" | Status: ${issue.status} | Priority: ${issue.priority}%`);
      });
    } else {
      throw new Error(`Feed query failed: ${feedData.error}`);
    }

    console.log(blue("\n=================== INTEGRATION TEST COMPLETED SUCCESSFULLY ===================\n"));

  } catch (err) {
    console.error(red("\n✘ INTEGRATION TEST FAILED WITH ERROR:"), err.message);
  }
}

runTest();
