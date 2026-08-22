import os
import re

path = "src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to wrap each element={...} with <PageTransition>...</PageTransition>
# e.g., element={<HomePage />} -> element={<PageTransition><HomePage /></PageTransition>}

# Wait, if it has <GuestRoute><LoginPage /></GuestRoute>, it should become
# element={<PageTransition><GuestRoute><LoginPage /></GuestRoute></PageTransition>}

def replacer(match):
    inner = match.group(1)
    if "PageTransition" in inner:
        return match.group(0)
    return f"element={{<PageTransition>{inner}</PageTransition>}}"

content = re.sub(r'element=\{([^}]+)\}', replacer, content)

if "import { PageTransition }" not in content:
    content = content.replace("import { AnimatedLayout } from './components/ui/AnimatedLayout';", 
                              "import { PageTransition } from './components/ui/PageTransition';")
    # If AnimatedLayout wasn't imported (because the previous script failed or whatever)
    if "import { PageTransition }" not in content:
        content = content.replace("import Loading from './components/Loading';", 
                                  "import Loading from './components/Loading';\nimport { PageTransition } from './components/ui/PageTransition';")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
