import re

with open('../api-server/src/routes/auth.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = """    try {
      const user = await userStore.find(username);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      let apiKey = user.apiKey || "";
      if (!apiKey && user.apiAccessEnabled) {
        apiKey = await userStore.ensureApiKey(user.username);
      }

      return res.json({
        success: true,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || "",
        apiAccessEnabled: user.apiAccessEnabled || false,
        uidLimit: user.uidLimit ?? -1,
        apiKey,
      });
    } catch (err) {"""

content = re.sub(
    r'    try \{\s*const user = await userStore\.find\(username\);\s*if \(\!user\) \{\s*return res\.status\(404\)\.json\(\{ success: false, error: "User not found" \}\);\s*\}\s*return res\.json\(\{\s*success: true,\s*username: user\.username,\s*displayName: user\.displayName \|\| user\.username,\s*avatar: user\.avatar \|\| "",\s*apiAccessEnabled: user\.apiAccessEnabled \|\| false,\s*uidLimit: user\.uidLimit \?\? -1,\s*\}\);\s*\} catch \(err\) \{',
    new_content,
    content
)

with open('../api-server/src/routes/auth.ts', 'w', encoding='utf-8') as f:
    f.write(content)
