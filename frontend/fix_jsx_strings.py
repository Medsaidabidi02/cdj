import os
import re

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                if re.search(r'[\'"]<span', content):
                    print(f"Found in {path}")
                    # Let's fix it automatically if it's `{ "..." }` or `prop="..."`
                    content = re.sub(r'([:{=,\(\s])\s*[\'"](<span[^>]*>.*?</span>)[\'"]', r'\1 \2', content)
                    with open(path, 'w', encoding='utf-8') as out:
                        out.write(content)
                    print(f"Fixed {path}")
