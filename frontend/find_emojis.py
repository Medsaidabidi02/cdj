import os
import re

def contains_emoji(text):
    # This regex covers most emoji ranges
    emoji_pattern = re.compile(
        r'['
        r'\U0001f600-\U0001f64f'  # emoticons
        r'\U0001f300-\U0001f5ff'  # symbols & pictographs
        r'\U0001f680-\U0001f6ff'  # transport & map symbols
        r'\U0001f1e0-\U0001f1ff'  # flags (iOS)
        r'\U00002702-\U000027b0'
        r'\U000024c2-\U0001f251'
        r']+', flags=re.UNICODE)
    return emoji_pattern.findall(text)

files_with_emojis = []

for root, _, files in os.walk("src"):
    for file in files:
        if file.endswith((".tsx", ".ts")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                emojis = contains_emoji(content)
                if emojis:
                    files_with_emojis.append((path, set(emojis)))

for path, emojis in files_with_emojis:
    print(f"{path}: {emojis}")
