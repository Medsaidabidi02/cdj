import os
import re

path = "src/pages/AdminDashboard.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix tabItems correctly
content = re.sub(r"icon:\s*'([^']+)'", r"icon: \1", content)
content = re.sub(r'icon:\s*"([^"]+)"', r"icon: \1", content)

# It seems VidAcos wasn't completely replaced, probably due to encoding issue when reading.
content = content.replace("VidAcos", "Vidéos")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
