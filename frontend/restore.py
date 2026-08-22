import json
import os

transcript_path = r"C:\Users\LENOVO\.gemini\antigravity\brain\d6cbd450-d8ba-4758-99cb-ae881c933411\.system_generated\logs\transcript_full.jsonl"

file_contents = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    tool_name = call.get('name', '')
                    if tool_name in ['write_to_file', 'default_api:write_to_file']:
                        args = call.get('args', {})
                        target = args.get('TargetFile')
                        content = args.get('CodeContent')
                        if target and content and target.endswith('.tsx'):
                            file_contents[target] = content
        except Exception as e:
            pass

print(f"Found {len(file_contents)} complete files in transcript.")

for target, content in file_contents.items():
    if "components" in target or "pages" in target:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Restored {target}")
