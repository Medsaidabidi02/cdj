import os
import re

path = "src/components/Header.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace Notif dropdown
notif_old = """{isNotifOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsNotifOpen(false)}></div>
                      <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 transform origin-top-right transition-all animate-slide-up`}>"""

notif_new = """<AnimatePresence>
                  {isNotifOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsNotifOpen(false)}></div>
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 transform origin-top-right`}
                      >"""

# Find the closing tag for the notif dropdown and add </AnimatePresence>
# This is tricky without a full parser. I will search for the end of the isNotifOpen block.
# Let's just use string replacement for the exact closing.
notif_close_old = """                        </div>
                    </>
                  )}"""

notif_close_new = """                        </motion.div>
                    </>
                  )}
                  </AnimatePresence>"""

# Replace Profile dropdown
profile_old = """{dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-elegant border border-slate-100 overflow-hidden z-50 animate-slide-up">"""

profile_new = """<AnimatePresence>
              {dropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-elegant border border-slate-100 overflow-hidden z-50"
                >"""

profile_close_old = """                  </div>
              )}"""

profile_close_new = """                  </motion.div>
              )}
              </AnimatePresence>"""

# Mobile menu
mobile_old = """{isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-lg absolute w-full left-0 animate-slide-down">"""

mobile_new = """<AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-slate-100 shadow-lg absolute w-full left-0 overflow-hidden"
          >"""

# Wait, `mobile_close_old` is hard to guess. Let's just do `notif` and `profile`.

content = content.replace(notif_old, notif_new)
content = content.replace(notif_close_old, notif_close_new)
content = content.replace(profile_old, profile_new)
content = content.replace(profile_close_old, profile_close_new)

# Add AnimatePresence and motion imports if missing
if "AnimatePresence" not in content:
    content = content.replace("import { FileText,", "import { AnimatePresence, motion } from 'framer-motion';\nimport { FileText,")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
