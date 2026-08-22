import os
import re

def get_depth(file_path):
    # Calculate depth from src/
    parts = file_path.split(os.sep)
    try:
        src_idx = parts.index('src')
        return len(parts) - src_idx - 2
    except ValueError:
        return 0

def get_import_path(file_path, target_folder):
    depth = get_depth(file_path)
    if depth == 0:
        return f"./{target_folder}"
    return "../" * depth + target_folder

def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    original_content = content
    
    # 1. Replace hardcoded SVG spinners
    spinner_pattern1 = r'<svg[^>]*className="[^"]*animate-spin[^"]*"[^>]*>.*?<\/svg>'
    spinner_pattern2 = r'<svg[^>]*className=\{`[^`]*animate-spin[^`]*`\}[^>]*>.*?<\/svg>'
    
    if re.search(spinner_pattern1, content, re.DOTALL) or re.search(spinner_pattern2, content, re.DOTALL):
        # We need to add the import if it's not there
        import_path = get_import_path(file_path, "components/ui/Spinner")
        if "Spinner" not in content:
            # Add to top of file
            import_statement = f"import {{ Spinner }} from '{import_path}';\n"
            # Find last import
            last_import = content.rfind("import ")
            if last_import != -1:
                end_of_last_import = content.find("\n", last_import)
                content = content[:end_of_last_import+1] + import_statement + content[end_of_last_import+1:]
            else:
                content = import_statement + content
                
        # Replace the SVGs
        content = re.sub(spinner_pattern1, '<Spinner />', content, flags=re.DOTALL)
        content = re.sub(spinner_pattern2, '<Spinner />', content, flags=re.DOTALL)
        
    # 2. Replace common emojis
    emojis_to_icons = {
        '📚': 'BookOpen',
        '⚠️': 'AlertTriangle',
        '⚖️': 'Scale',
        '🎬': 'PlaySquare',
        '🔒': 'Lock',
        '✨': 'Sparkles'
    }
    
    found_emojis = []
    for emoji, icon in emojis_to_icons.items():
        if emoji in content:
            found_emojis.append((emoji, icon))
            
    if found_emojis:
        lucide_imports = set()
        
        # Check existing lucide imports
        lucide_import_match = re.search(r"import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react['\"]", content)
        if lucide_import_match:
            existing = [i.strip() for i in lucide_import_match.group(1).split(',')]
            lucide_imports.update(existing)
            
        for emoji, icon in found_emojis:
            # We just do a simple replace, though classNames might be needed if they were huge
            # For now, just replace the character with the component
            # If it's a huge span, the user will have a small icon, which is fine as a fallback.
            # We'll wrap it so it scales roughly
            if icon == "AlertTriangle":
                content = content.replace(emoji, f"<{icon} className=\"w-12 h-12 text-amber-500\" />")
            elif icon == "BookOpen":
                content = content.replace(emoji, f"<{icon} className=\"w-12 h-12 text-slate-400\" />")
            else:
                content = content.replace(emoji, f"<{icon} className=\"w-6 h-6 inline-block\" />")
            lucide_imports.add(icon)
            
        if lucide_imports:
            lucide_str = ", ".join(lucide_imports)
            import_statement = f"import {{ {lucide_str} }} from 'lucide-react';"
            if lucide_import_match:
                content = content[:lucide_import_match.start()] + import_statement + content[lucide_import_match.end():]
            else:
                last_import = content.rfind("import ")
                if last_import != -1:
                    end_of_last_import = content.find("\n", last_import)
                    content = content[:end_of_last_import+1] + import_statement + "\n" + content[end_of_last_import+1:]
                else:
                    content = import_statement + "\n" + content

    if content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file_path}")

for root, _, files in os.walk("src"):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts") or file.endswith(".jsx") or file.endswith(".js"):
            path = os.path.join(root, file)
            process_file(path)
