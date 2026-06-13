import re

with open('../api-server/src/routes/uid.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# For /add
add_auth_regex = r'(\s*const sessionToken = req\.cookies\?\.auth_token;\s*let isAuthorized = false;\s*let isAdmin = false;\s*let authUser: string \| undefined;\s*if \(sessionToken\) \{\s*const session = sessionStore\.get\(sessionToken\);\s*if \(session\) \{\s*authUser = session\.username;\s*if \(session\.role === "admin"\) \{\s*isAuthorized = true;\s*isAdmin = true;\s*\} else if \(session\.username === username\) \{\s*isAuthorized = true;\s*\}\s*\}\s*\})'

add_auth_new = r'''\1

    const apiKeyHeader = req.headers["x-api-key"] || req.headers["authorization"]?.toString().replace("Bearer ", "");
    if (!isAuthorized && apiKeyHeader) {
      const apiUser = await userStore.findByApiKey(apiKeyHeader as string);
      if (apiUser && apiUser.apiAccessEnabled) {
        authUser = apiUser.username;
        if (apiUser.role === "admin") {
          isAuthorized = true;
          isAdmin = true;
        } else if (!username || apiUser.username === username) {
          isAuthorized = true;
        }
      }
    }'''

content = re.sub(add_auth_regex, add_auth_new, content)


# For /remove
rem_auth_regex = r'(\s*const sessionToken = req\.cookies\?\.auth_token;\s*let isAuthorized = false;\s*if \(sessionToken\) \{\s*const session = sessionStore\.get\(sessionToken\);\s*if \(session\) \{\s*if \(session\.role === "admin"\) \{\s*isAuthorized = true;\s*\} else \{\s*const existingUid = await uidStore\.get\(uid\);\s*if \(existingUid && existingUid\.addedBy === session\.username\) \{\s*isAuthorized = true;\s*\}\s*\}\s*\}\s*\})'

rem_auth_new = r'''\1

      const apiKeyHeader = req.headers["x-api-key"] || req.headers["authorization"]?.toString().replace("Bearer ", "");
      if (!isAuthorized && apiKeyHeader) {
        const apiUser = await userStore.findByApiKey(apiKeyHeader as string);
        if (apiUser && apiUser.apiAccessEnabled) {
          if (apiUser.role === "admin") {
            isAuthorized = true;
          } else {
            const existingUid = await uidStore.get(uid);
            if (existingUid && existingUid.addedBy === apiUser.username) {
              isAuthorized = true;
            }
          }
        }
      }'''

content = re.sub(rem_auth_regex, rem_auth_new, content)

with open('../api-server/src/routes/uid.ts', 'w', encoding='utf-8') as f:
    f.write(content)
