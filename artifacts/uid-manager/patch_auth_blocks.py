import re

with open('../api-server/src/routes/auth.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Disable checkVpn entirely
content = re.sub(
    r'async function checkVpn\(ip: string\): Promise<boolean> \{[\s\S]*?\}',
    'async function checkVpn(ip: string): Promise<boolean> {\n  return false; // Disabled by admin request\n}',
    content
)

# 2. Disable checkLoginRate
content = re.sub(
    r'function checkLoginRate\(ip: string\): boolean \{[\s\S]*?\}',
    'function checkLoginRate(ip: string): boolean {\n  return true; // Disabled by admin request\n}',
    content
)

# 3. Disable early brute force blocks in /login
content = re.sub(
    r'const ipBlock = loginGuard\.isBlocked\(ipKey\);\s*if \(ipBlock\.blocked\) \{[\s\S]*?blockedFor: mins\s*\}\);\s*\}\s*const userBlock = loginGuard\.isBlocked\(userKey\);\s*const isAdmin = config\.ADMIN_USERNAME && username === config\.ADMIN_USERNAME\.toLowerCase\(\);\s*// Do not block the admin account globally by username \(prevents DoS on the admin account\)\s*if \(userBlock\.blocked && !isAdmin\) \{[\s\S]*?blockedFor: mins\s*\}\);\s*\}',
    'const isAdmin = config.ADMIN_USERNAME && username === config.ADMIN_USERNAME.toLowerCase();\n  // Brute force early blocking removed by admin request to allow correct logins',
    content
)

# 4. Remove the block lock for 30 mins upon incorrect password, just return invalid credentials
content = re.sub(
    r'if \(ipResult\.blocked \|\| userResult\.blocked\) \{[\s\S]*?blockedFor: 30\s*\}\);\s*\}',
    '',
    content
)

with open('../api-server/src/routes/auth.ts', 'w', encoding='utf-8') as f:
    f.write(content)
