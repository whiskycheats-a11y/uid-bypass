const fs = require('fs');
const files = ['src/pages/admin.tsx', 'src/pages/dashboard.tsx'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace neon colors with subtle glassmorphic equivalents
    content = content.replace(/bg-red-500\/[0-9]+/g, 'bg-white/5');
    content = content.replace(/text-red-500/g, 'text-white/90');
    content = content.replace(/text-red-400/g, 'text-white/70');
    content = content.replace(/border-red-500\/[0-9]+/g, 'border-white/10');
    
    // Violet/Cyan neon replacements
    content = content.replace(/bg-violet-[0-9]+\/[0-9]+/g, 'bg-white/5');
    content = content.replace(/bg-cyan-[0-9]+\/[0-9]+/g, 'bg-white/5');
    content = content.replace(/text-violet-[0-9]+/g, 'text-white/90');
    content = content.replace(/text-cyan-[0-9]+/g, 'text-white/90');
    content = content.replace(/border-violet-[0-9]+\/[0-9]+/g, 'border-white/10');
    content = content.replace(/border-cyan-[0-9]+\/[0-9]+/g, 'border-white/10');
    
    // Shadow replacements
    content = content.replace(/shadow-\[0_0_[0-9]+px_rgba\([^)]+\)\]/g, 'shadow-[0_10px_30px_rgba(0,0,0,0.5)]');
    
    // Gradient replacements
    content = content.replace(/from-red-[0-9]+ to-red-[0-9]+/g, 'from-white/20 to-white/5');
    content = content.replace(/from-violet-[0-9]+ to-[a-z]+-[0-9]+/g, 'from-white/20 to-white/5');
    
    // Inline style overrides
    content = content.replace(/rgba\(239,68,68,[0-9.]+\)/g, 'rgba(255,255,255,0.1)');
    content = content.replace(/rgba\(139,92,246,[0-9.]+\)/g, 'rgba(255,255,255,0.1)');
    
    // Class names logic
    content = content.replace(/neo-glass/g, 'bg-[#0a0a0c]/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)]');
    
    // Background replacements (dark glass)
    content = content.replace(/bg-black\/[0-9]+/g, 'bg-white/[0.02]');
    content = content.replace(/bg-slate-900/g, 'bg-white/[0.02]');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
