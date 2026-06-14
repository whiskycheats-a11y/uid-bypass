const fs = require('fs');
const files = ['src/pages/admin.tsx', 'src/pages/dashboard.tsx', 'src/pages/FreePortal.tsx', 'src/pages/login.tsx'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Smooth out neon red shadows and harsh backgrounds
    content = content.replace(/bg-red-\d+\/10/g, 'bg-rose-500/10');
    content = content.replace(/border-red-\d+\/30/g, 'border-rose-500/20');
    content = content.replace(/text-red-\d+/g, 'text-rose-400');
    content = content.replace(/shadow-\[0_10px_30px_rgba\(239,68,68,0\.5\)\]/g, 'shadow-[0_0_15px_rgba(244,63,94,0.3)]');
    content = content.replace(/shadow-\[0_10px_30px_rgba\(0,0,0,0\.5\)\]/g, 'shadow-[0_8px_30px_rgba(0,0,0,0.4)]'); // More subtle black shadow
    
    // Emerald -> Teal/Cyan vibe (more modern)
    content = content.replace(/bg-emerald-500\/10/g, 'bg-teal-500/10');
    content = content.replace(/border-emerald-500\/(\d+)/g, 'border-teal-500/20');
    content = content.replace(/text-emerald-400/g, 'text-teal-400');
    
    // Primary Buttons and accents (Violet -> Indigo/Purple gradients)
    // Replace solid violet backgrounds with sleek gradients
    content = content.replace(/bg-violet-500 hover:bg-violet-600/g, 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500');
    content = content.replace(/bg-blue-500 hover:bg-blue-400/g, 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400');
    
    // Fix annoying pinging dots that look cheap
    content = content.replace(/<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[a-z]+-\d+ opacity-75"><\/span>/g, '');
    
    // Premium Glass Cards
    // Replace solid white borders with very faint white borders and inner shadows
    content = content.replace(/border border-white\/10 shadow-2xl/g, 'border border-white/5 shadow-2xl shadow-black/50 inset-0 ring-1 ring-white/5 rounded-[2rem]');
    content = content.replace(/bg-\[\#0a0a0c\]\/80 backdrop-blur-2xl/g, 'bg-[#030305]/60 backdrop-blur-3xl');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Upgraded Figma colors in ${file}`);
  }
});
