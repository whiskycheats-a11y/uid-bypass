const fs = require('fs');
const path = require('path');

const files = ['src/pages/admin.tsx', 'src/pages/dashboard.tsx', 'src/pages/login.tsx', 'src/pages/FreePortal.tsx'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Upgrade Solid Primary Buttons (Red/Blue/Gradients -> Vercel Style White)
    content = content.replace(/bg-red-\d+\s+hover:bg-red-\d+\s+text-white/g, 'bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]');
    content = content.replace(/bg-blue-\d+\s+hover:bg-blue-\d+\s+text-white/g, 'bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]');
    content = content.replace(/bg-violet-\d+\s+hover:bg-violet-\d+\s+text-white/g, 'bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]');
    content = content.replace(/bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white/g, 'bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]');
    content = content.replace(/bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white/g, 'bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]');

    // Ensure text inside white buttons is black (some icons/spans might be hardcoded text-white)
    // Actually we'll just fix the wrapper, tailwind usually cascades.
    
    // Switch (Toggles) that are red
    content = content.replace(/data-\[state=checked\]:bg-red-\d+/g, 'data-[state=checked]:bg-white data-[state=checked]:shadow-[0_0_15px_rgba(255,255,255,0.4)]');
    
    // Sidebar Active Items (make them look like Vercel sidebar: subtle white background)
    content = content.replace(/bg-red-500\/10 border-red-500\/20 text-red-400/g, 'bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]');
    content = content.replace(/bg-blue-500\/10 border-blue-500\/20 text-blue-400/g, 'bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]');
    
    // Inputs Focus
    content = content.replace(/focus:ring-red-\d+\/\d+/g, 'focus:ring-white/30');
    content = content.replace(/focus:border-red-\d+\/\d+/g, 'focus:border-white/50');
    content = content.replace(/focus:ring-blue-\d+\/\d+/g, 'focus:ring-white/30');
    
    // Icons that were red in sidebar 
    content = content.replace(/text-red-400 drop-shadow-\[0_8px_30px_rgba\(0,0,0,0.4\)\]/g, 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]');
    
    // Card Glows
    content = content.replace(/shadow-\[0_8px_30px_rgba\(0,0,0,0\.4\)\]/g, 'shadow-[0_10px_40px_rgba(0,0,0,0.5)]'); // Deepen shadow for more floating 3D glass effect

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Applied Premium Theme to ${file}`);
  }
});
