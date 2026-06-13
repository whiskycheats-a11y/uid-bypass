import re

with open('../api-server/src/routes/auth.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_endpoint = '''router.post("/reset-api-key", async (req, res) => {
  const sessionToken = req.cookies?.auth_token;
  if (!sessionToken) {
    return res.status(401).json({ success: false, error: "Session token required." });
  }

  const session = sessionStore.get(sessionToken);
  if (!session) {
    return res.status(401).json({ success: false, error: "Invalid session." });
  }

  try {
    const user = await userStore.find(session.username);
    if (!user || !user.apiAccessEnabled) {
      return res.status(403).json({ success: false, error: "API access not enabled." });
    }

    const newKey = await userStore.resetApiKey(session.username);
    return res.json({ success: true, apiKey: newKey });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to reset API key" });
  }
});

router.post("/profile", async (req, res) => {'''

content = content.replace('router.post("/profile", async (req, res) => {', new_endpoint)

with open('../api-server/src/routes/auth.ts', 'w', encoding='utf-8') as f:
    f.write(content)
