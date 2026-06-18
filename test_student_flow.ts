

async function run() {
  console.log("1. Logging in as student ahmed.35@student.eelu.edu.eg");
  let res = await fetch("http://localhost:5000/api/auth/login/student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ahmed.35@student.eelu.edu.eg", password: "Password123" })
  });
  let data: any = await res.json();
  if (!res.ok) {
    console.error("Login failed:", data);
    return;
  }
  const token = data.token;
  console.log("Logged in! Token:", token.substring(0, 20) + "...");

  console.log("2. Generating AI Plan");
  res = await fetch("http://localhost:5000/api/study-plan/generate", {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  data = await res.json();
  if (!res.ok) {
    console.error("Generate failed:", data);
    return;
  }
  console.log("Generated plan courses:", data.data.courses.length);

  console.log("3. Fetching current plan");
  res = await fetch("http://localhost:5000/api/study-plan/me/current", {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  data = await res.json();
  console.log("Current plan courses count:", data.courses?.length);
  
  if (data.courses && data.courses.length > 0) {
    console.log("First course:", data.courses[0].name);
  }

  if (data.planStatus === "PENDING") {
      console.log("Plan is already pending, skipping submit");
  } else {
      console.log("4. Submitting plan for review. Plan ID:", data.planId);
      res = await fetch(`http://localhost:5000/api/study-plan/${data.planId}/submit`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      data = await res.json();
      console.log("Submit result:", data);
  }
}

run();
