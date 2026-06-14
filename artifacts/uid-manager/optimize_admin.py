import os
import re

target_file = r"c:\Users\HP\Music\uid-bypass\artifacts\uid-manager\src\pages\admin.tsx"

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Reduce heavy blurs
content = content.replace("backdrop-blur-3xl", "backdrop-blur-md")
content = content.replace("backdrop-blur-2xl", "backdrop-blur-md")
content = content.replace("backdrop-blur-xl", "backdrop-blur-md")

# 2. Optimize Framer Motion exits
content = content.replace('exit={{ opacity: 0, y: -10 }}', 'exit={{ opacity: 0 }} transition={{ duration: 0.15 }}')
content = content.replace('exit={{ opacity: 0, y: -20 }}', 'exit={{ opacity: 0 }} transition={{ duration: 0.15 }}')
content = content.replace('exit={{ opacity: 0, y: 10 }}', 'exit={{ opacity: 0 }} transition={{ duration: 0.15 }}')

# 3. Remove mode="wait" from AnimatePresence to allow immediate mounting of the next tab
content = content.replace('<AnimatePresence mode="wait">', '<AnimatePresence>')

# 4. Remove heavy box shadows that overlap and cause overdraw
content = content.replace('shadow-[0_20px_40px_rgba(0,0,0,0.6)]', 'shadow-xl')
content = content.replace('shadow-[10px_0_40px_rgba(0,0,0,0.6)]', 'shadow-xl')
content = content.replace('shadow-[0_10px_40px_rgba(0,0,0,0.5)]', 'shadow-lg')

# Write back
with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Optimized admin.tsx successfully.")
