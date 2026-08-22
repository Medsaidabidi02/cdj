import os

def fix_homepage():
    path = "src/pages/HomePage.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Add imports if they don't exist
    if "from 'lucide-react'" not in content:
        content = content.replace(
            "import Header from '../components/Header';",
            "import Header from '../components/Header';\nimport { Scale, BookOpen, Sparkles } from 'lucide-react';"
        )
    
    # 2. Replace the badge emoji
    content = content.replace("<span>{t('hero.badge_icon', '⚖️')}</span>", "<Scale className=\"w-4 h-4\" />")
    
    # 3. Replace floating elements
    emoji1 = """                <div className="absolute top-1/4 -right-4 w-16 h-16 bg-white rounded-2xl shadow-glass flex items-center justify-center text-3xl transform rotate-12 animate-float">
                  ⚖️
                </div>"""
    icon1 = """                <div className="absolute top-1/4 -right-4 w-16 h-16 bg-white rounded-2xl shadow-glass flex items-center justify-center transform rotate-12 animate-float">
                  <Scale className="w-8 h-8 text-teal-600" />
                </div>"""
    content = content.replace(emoji1, icon1)

    emoji2 = """                <div className="absolute bottom-1/4 -left-4 w-16 h-16 bg-white rounded-2xl shadow-glass flex items-center justify-center text-3xl transform -rotate-6 animate-float-slow">
                  📚
                </div>"""
    icon2 = """                <div className="absolute bottom-1/4 -left-4 w-16 h-16 bg-white rounded-2xl shadow-glass flex items-center justify-center transform -rotate-6 animate-float-slow">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>"""
    content = content.replace(emoji2, icon2)

    emoji3 = """                <div className="absolute -top-4 left-1/4 w-12 h-12 bg-white rounded-full shadow-glass flex items-center justify-center text-2xl animate-pulse">
                  ✨
                </div>"""
    icon3 = """                <div className="absolute -top-4 left-1/4 w-12 h-12 bg-white rounded-full shadow-glass flex items-center justify-center animate-pulse">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </div>"""
    content = content.replace(emoji3, icon3)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    fix_homepage()
