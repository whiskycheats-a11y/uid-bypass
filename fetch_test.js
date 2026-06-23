fetch("https://uid-bypass-beryl.vercel.app/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identifier: "zytronefreefire@gmail.com", password: "password123" })
})
.then(async r => {
  console.log("Status:", r.status);
  console.log("Headers:", r.headers);
  const text = await r.text();
  console.log("Body:", text.substring(0, 500));
})
.catch(e => console.error("Error:", e));
