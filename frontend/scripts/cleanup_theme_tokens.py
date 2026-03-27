import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Deduplicate text classes
    content = content.replace('text-slate-900 text-app-text', 'text-app-text')
    content = content.replace('text-slate-500 text-app-text-muted', 'text-app-text-muted')
    content = content.replace('text-slate-400 text-app-text-muted', 'text-app-text-muted')
    content = content.replace('text-slate-700 text-app-text-muted', 'text-app-text-muted')

    # 2. Cleanup fragmented hover states
    content = re.sub(r'hover:bg-slate-100 dark:hover:bg-app-surface-soft text-slate-700 hover:bg-slate-100\b', 'hover:bg-app-surface-soft', content)
    content = re.sub(r'hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10\b', 'hover:bg-app-surface-soft', content)
    
    # 3. Cleanup background fragments
    content = re.sub(r'bg-slate-100 dark:bg-white/5\b', 'bg-app-surface-soft', content)
    content = re.sub(r'bg-slate-50 dark:bg-white/5\b', 'bg-app-surface-soft', content)
    content = re.sub(r'bg-white dark:bg-white/5\b', 'bg-app-surface', content)

    # 4. Remove redundant "light-only" classes that are already covered by variables
    # e.g. text-slate-900 is often redundant if text-app-text is there
    content = re.sub(r'text-slate-900\s+text-app-text\b', 'text-app-text', content)
    content = re.sub(r'text-app-text\s+text-slate-900\b', 'text-app-text', content)
    
    # 5. Handle the specific mess in Layout.jsx (navigation items)
    content = content.replace('bg-blue-600/20 text-blue-300 border border-blue-500/30 bg-blue-100 text-blue-700 border-blue-200', 'bg-primary/10 text-primary border border-primary/20 shadow-sm')
    content = content.replace('text-app-text-muted hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft text-slate-700 hover:bg-slate-100', 'text-app-text-muted hover:bg-app-surface-soft hover:text-app-text')

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned: {filepath}")

def main():
    base_dir = r"d:\ASSET-MANAGER\frontend"
    targets = ['pages', 'components']
    
    for target in targets:
        target_dir = os.path.join(base_dir, target)
        if not os.path.exists(target_dir):
            continue
            
        for root, dirs, files in os.walk(target_dir):
            for file in files:
                if file.endswith('.jsx') or file.endswith('.tsx') or file.endswith('.js'):
                    filepath = os.path.join(root, file)
                    process_file(filepath)

if __name__ == '__main__':
    main()
