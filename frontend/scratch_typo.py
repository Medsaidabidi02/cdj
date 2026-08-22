import os
import re

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts') or f.endswith('.css'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            original = content
            # text-[10px] -> text-[10px] is caption/tiny. Let's make it text-xs (12px)
            content = content.replace("text-[10px]", "text-[12px]")
            # text-[11px] -> text-xs
            content = content.replace("text-[11px]", "text-xs")
            # text-[13px] -> text-sm
            content = content.replace("text-[13px]", "text-sm")
            # text-[15px] -> text-base
            content = content.replace("text-[15px]", "text-base")
            # text-[17px] -> text-lg
            content = content.replace("text-[17px]", "text-lg")
            # text-[19px] -> text-xl
            content = content.replace("text-[19px]", "text-xl")
            
            if content != original:
                with open(path, 'w', encoding='utf-8') as out:
                    out.write(content)
                print(f"Fixed typo in {path}")
