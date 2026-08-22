import os

path = "src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add useLocation import if not there
if "useLocation" not in content:
    content = content.replace("import { Routes, Route, Navigate } from 'react-router-dom';", 
                              "import { Routes, Route, Navigate, useLocation } from 'react-router-dom';")

# Add AnimatePresence import
if "AnimatePresence" not in content:
    content = content.replace("import { Toaster } from 'react-hot-toast';", 
                              "import { Toaster } from 'react-hot-toast';\nimport { AnimatePresence } from 'framer-motion';")

# Replace <AnimatedLayout><Routes> ... </Routes></AnimatedLayout>
# First remove AnimatedLayout if I added it
content = content.replace("<AnimatedLayout><Routes>", "<Routes>")
content = content.replace("</Routes></AnimatedLayout>", "</Routes>")

# We need to wrap Routes in AnimatePresence and add location
content = content.replace("function App() {", "function App() {\n  const location = useLocation();")
content = content.replace("<Routes>", "<AnimatePresence mode=\"wait\">\n        <Routes location={location} key={location.pathname}>")
content = content.replace("</Routes>", "</Routes>\n        </AnimatePresence>")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
