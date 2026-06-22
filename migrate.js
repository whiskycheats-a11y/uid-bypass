const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Typescript interface changes
            content = content.replace(/id:\s*number;/g, 'id: string;');
            content = content.replace(/userId:\s*number;/g, 'userId: string;');
            content = content.replace(/createdBy:\s*number;/g, 'createdBy: string;');
            content = content.replace(/targetId:\s*number\b/g, 'targetId: string');
            content = content.replace(/portalId:\s*number\b/g, 'portalId: string');
            content = content.replace(/currentUserId:\s*number\b/g, 'currentUserId: string');
            content = content.replace(/id\s*:\s*number\s*\}/g, 'id: string }');
            content = content.replace(/handleDelete\s*\(\s*id:\s*number/g, 'handleDelete(id: string');
            content = content.replace(/handleRemove\s*\(\s*id:\s*number/g, 'handleRemove(id: string');

            // session.user.id parsing
            content = content.replace(/parseInt\(session\.user\.id\)/g, 'session.user.id');
            content = content.replace(/parseInt\(session\.user\.id,\s*10\)/g, 'session.user.id');

            // URL param parsing
            content = content.replace(/parseInt\(\s*url\.searchParams\.get\("id"\)\s*\|\|\s*"0"\s*\)/g, '(url.searchParams.get("id") || "")');
            content = content.replace(/parseInt\(\s*id\s*,\s*10\s*\)/g, 'id');
            content = content.replace(/parseInt\(\s*id\s*\)/g, 'id');
            
            // Action parsing
            content = content.replace(/targetId:\s*parseInt\(formData\.get\("targetId"\)\s*as\s*string\)/g, 'targetId: formData.get("targetId") as string');
            content = content.replace(/id:\s*parseInt\(formData\.get\("id"\)\s*as\s*string\)/g, 'id: formData.get("id") as string');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
console.log('Migration script complete.');
