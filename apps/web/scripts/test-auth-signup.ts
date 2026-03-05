// Test script to simulate signup
async function testSignup() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  const testName = "Test User";

  console.log("\n=== Testing Email/Password Signup ===");
  console.log(`Email: ${testEmail}`);
  console.log(`Password: ${testPassword}`);
  console.log(`Name: ${testName}`);

  try {
    // Test the actual signup endpoint
    const response = await fetch("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: testName,
      }),
    });

    console.log("\n=== Response Status ===");
    console.log(`Status: ${response.status} ${response.statusText}`);

    console.log("\n=== Response Headers ===");
    response.headers.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });

    const responseText = await response.text();
    console.log("\n=== Response Body ===");
    console.log(responseText);

    if (response.ok) {
      console.log("\n✓ Signup successful!");
      try {
        const data = JSON.parse(responseText);
        console.log("User data:", data);
      } catch (e) {
        // Response might not be JSON
      }
    } else {
      console.log("\n✗ Signup failed!");
      try {
        const error = JSON.parse(responseText);
        console.log("Error details:", error);
      } catch (e) {
        console.log("Could not parse error response as JSON");
      }
    }
  } catch (error) {
    console.error("\n=== Error ===");
    console.error(error);
  }
}

testSignup();
