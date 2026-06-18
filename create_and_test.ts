

async function run() {
  console.log("1. Logging in as admin");
  let res = await fetch("http://localhost:5000/api/auth/login/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@admin.eelu.edu.eg", password: "Password123" }) // Wait, user said admin password is Password123 or Admin@12345
  });
  let data: any = await res.json();
  if (!res.ok) {
     res = await fetch("http://localhost:5000/api/auth/login/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@admin.eelu.edu.eg", password: "Admin@12345" }) 
      });
      data = await res.json();
      if (!res.ok) {
        console.error("Admin login failed:", data);
        return;
      }
  }
  const adminToken = data.token;
  console.log("Admin logged in!");

  const national_id = "2000" + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  
  console.log("2. Creating new student");
  res = await fetch("http://localhost:5000/api/users/students", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({
          first_name: "Youssef",
          last_name: "Testing",
          national_id,
          password: "Password123",
          gender: "male"
      })
  });
  data = await res.json();
  if(!res.ok) {
      console.error("Failed to create student", data);
      return;
  }
  
  const studentEmail = data.personal_email;
  const studentId = data.user_id;
  console.log(`Student created! Email: ${studentEmail}, ID: ${studentId}`);

  console.log("3. Logging in as new student");
  res = await fetch("http://localhost:5000/api/auth/login/student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: studentEmail, password: "Password123" })
  });
  data = await res.json();
  const token = data.token;
  
  console.log("4. Generating AI Plan");
  res = await fetch("http://localhost:5000/api/study-plan/generate", {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  data = await res.json();
  console.log("Generated courses count:", data.data?.courses?.length);
  
  console.log("5. Submitting Plan");
  res = await fetch(`http://localhost:5000/api/study-plan/${data.data.planId}/submit`, {
     method: "PATCH",
     headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Submit result:", await res.json());
}
run();
