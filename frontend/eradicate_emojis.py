import os
import re

EMOJI_TO_ICON = {
    '✅': 'Check',
    '❌': 'X',
    '✕': 'X',
    '🏫': 'School',
    '👨': 'User',
    '▶️': 'Play',
    '▶': 'Play',
    '🎯': 'Target',
    '💡': 'Lightbulb',
    '📝': 'FileText',
    '🔔': 'Bell',
    '✉️': 'Mail',
    '📽️': 'Video',
    '📅': 'Calendar',
    '➕': 'Plus',
    '🗑️': 'Trash',
    '🚀': 'Rocket',
    '💾': 'Save',
    '✏️': 'Edit',
    '📄': 'File',
    '👤': 'User',
    '🔗': 'Link',
    '👥': 'Users',
    '📊': 'BarChart',
    '🔍': 'Search',
    '📤': 'Upload',
    '🔧': 'Wrench',
    '🎥': 'Video',
    '👁️': 'Eye',
    '📂': 'Folder',
    '📖': 'BookOpen',
    '📬': 'Mailbox',
    '▼': 'ChevronDown',
    '✓': 'Check',
    '🔐': 'Lock',
    '🚫': 'Ban',
    '🛠️': 'Wrench',
    '🔄': 'RefreshCw',
    '🔑': 'Key',
    '📱': 'Smartphone',
    '💻': 'Laptop',
    '🚪': 'LogOut',
    '📋': 'Clipboard',
    '🎓': 'GraduationCap'
}

def process_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    found_icons = set()

    for emoji, icon in EMOJI_TO_ICON.items():
        if emoji in content:
            found_icons.add(icon)
            content = content.replace(emoji, f"<span className=\"inline-flex items-center justify-center\"><{icon} className=\"w-4 h-4\" /></span>")

    if found_icons:
        lucide_match = re.search(r"import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react['\"];?", content)
        if lucide_match:
            existing = [i.strip() for i in lucide_match.group(1).split(',')]
            for icon in found_icons:
                if icon not in existing:
                    existing.append(icon)
            new_import = f"import {{ {', '.join(existing)} }} from 'lucide-react'"
            # Note we don't add semicolon, let the existing one remain or we add it back?
            # Actually, `lucide_match.end()` includes the optional semicolon if we match it.
            # So:
            content = content[:lucide_match.start()] + new_import + ";" + content[lucide_match.end():]
        else:
            new_import = f"import {{ {', '.join(found_icons)} }} from 'lucide-react';\n"
            last_import = content.rfind("import ")
            if last_import != -1:
                end_of_line = content.find("\n", last_import)
                content = content[:end_of_line+1] + new_import + content[end_of_line+1:]
            else:
                content = new_import + content

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {path}")

for root, _, files in os.walk("src"):
    for file in files:
        if file.endswith(".tsx"):
            process_file(os.path.join(root, file))
