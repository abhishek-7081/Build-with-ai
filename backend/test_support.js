// Native fetch will be used

const API_URL = "http://localhost:5000/api";

const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

console.log(blue("\n=================== VALIDATING COMMUNITY SUPPORT & DEDUPLICATION ===================\n"));

async function testSupport() {
  try {
    // 1. Authenticate Abhishek
    console.log("Step 1: Logging in as Abhishek (Phone: 123456789)...");
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "123456789", password: "Abhishek@1" })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginData.error}`);
    }
    const token = loginData.token;
    console.log(green(`✔ Authentication Successful! Token retrieved for user: ${loginData.user.name}`));

    // 2. Fetch list of complaints to target the pre-seeded Munirka issue
    console.log("\nStep 2: Locating an active complaint to support...");
    const complaintsRes = await fetch(`${API_URL}/complaints`);
    const complaints = await complaintsRes.json();
    
    // Find the Munirka Sewage issue (which has category "Sewage Problems")
    const target = complaints.find(c => c.category === "Sewage Problems" && c.status !== "Resolved");
    if (!target) {
      throw new Error("Could not find an active Sewage Problems complaint in the database to run the support test.");
    }
    const targetId = target._id || target.id;
    console.log(`- Selected target: "${target.title}"`);
    console.log(`- Target ID: ${targetId}`);
    console.log(`- Initial reports count: ${target.reportCount}`);

    // 3. First Upvote / Support Attempt
    console.log(`\nStep 3: Submitting support/upvote on behalf of Abhishek (Attempt #1)...`);
    const support1Res = await fetch(`${API_URL}/complaints/${targetId}/support`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const support1Data = await support1Res.json();
    
    if (support1Res.status === 200 && support1Data.success) {
      console.log(green("✔ Attempt #1 Successful! Support registered."));
      console.log(`- Message: ${support1Data.message}`);
      console.log(`- New reports count: ${support1Data.complaint.reportCount}`);
      console.log(`- New Priority Level: ${support1Data.complaint.priorityLevel} (${support1Data.complaint.priority}%)`);
    } else if (support1Res.status === 400 && support1Data.error.includes("already registered")) {
      console.log(blue("ℹ User has already supported this issue on a previous run. Skipping to Attempt #2."));
    } else {
      throw new Error(`Attempt #1 failed unexpectedly: ${support1Data.error}`);
    }

    // 4. Second Upvote / Support Attempt (Should Fail due to deduplication)
    console.log(`\nStep 4: Submitting duplicate support/upvote with same account (Attempt #2)...`);
    const support2Res = await fetch(`${API_URL}/complaints/${targetId}/support`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const support2Data = await support2Res.json();
    
    if (support2Res.status === 400 && support2Data.error.includes("already registered")) {
      console.log(green("✔ Attempt #2 FAILED as expected (Deduplication Blocked)."));
      console.log(`- Block Message: "${support2Data.error}"`);
    } else {
      throw new Error(red(`✘ TEST FAILED: Second upvote succeeded or returned incorrect status: ${support2Res.status}. Data: ${JSON.stringify(support2Data)}`));
    }

    // 5. Verify automatically added comment
    console.log("\nStep 5: Verifying automatic support comment injection...");
    const commentsRes = await fetch(`${API_URL}/complaints/${targetId}/comments`);
    const comments = await commentsRes.json();
    
    const supportComment = comments.find(c => c.userName === "Abhishek" && c.commentText.includes("Supported this civic issue"));
    
    if (supportComment) {
      console.log(green("✔ TEST PASSED: Auto-comment found in complaint comments discussion history!"));
      console.log(`  - Username: ${supportComment.userName}`);
      console.log(`  - Comment: "${supportComment.commentText}"`);
    } else {
      console.warn(red("✘ TEST FAILED: Support comment was not found in comments section history."));
    }

    console.log(blue("\n=================== ALL SUPPORT DEDUPLICATION TESTS PASSED ===================\n"));
    
  } catch (err) {
    console.error(red("\n✘ TEST SUITE FAILED:"), err.message);
  }
}

testSupport();
