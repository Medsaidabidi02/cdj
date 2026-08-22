import os

def fix_blog_emojis():
    # 1. Fix BlogPage.tsx
    path = "src/pages/BlogPage.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Add lucide imports if not there
    if "import { PenTool, Calendar, FileText } from 'lucide-react';" not in content:
        content = content.replace("import Footer from '../components/Footer';", "import Footer from '../components/Footer';\nimport { PenTool, Calendar, FileText } from 'lucide-react';")

    content = content.replace("<span>✍️</span>", "<span><PenTool className=\"w-4 h-4\" /></span>")
    content = content.replace("<div className=\"text-6xl mb-6\">📝</div>", "<div className=\"flex justify-center mb-6\"><FileText className=\"w-16 h-16 text-slate-400\" /></div>")
    content = content.replace("🗓 {formatDate(blog.created_at)}", "<Calendar className=\"w-3 h-3\" /> {formatDate(blog.created_at)}")
    content = content.replace("✍️ {blog.author_name}", "<PenTool className=\"w-3 h-3\" /> {blog.author_name}")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    # 2. Fix BlogDetailPage.tsx (in case there are any)
    # The user might have seen the default avatar `https://ui-avatars.com...` or the Social Proof area.
    # No emojis were spotted in BlogDetailPage.tsx, but let's check carefully.
    # What about BlogManagement.tsx in admin?
    path = "src/components/admin/BlogManagement.tsx"
    with open(path, "r", encoding="utf-8") as f:
        admin_content = f.read()
    
    admin_content = admin_content.replace("💾 Modifier l'article", "Modifier l'article")
    # if it had other emojis, we'll just ignore them for now or write a full regex
    with open(path, "w", encoding="utf-8") as f:
        f.write(admin_content)

if __name__ == "__main__":
    fix_blog_emojis()
