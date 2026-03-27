import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # --- MAPPINGS: Hardcoded Patterns -> Semantic Tokens ---
    
    # 1. Backgrounds (Surface / Soft)
    # bg-slate-200 dark:bg-white/10 -> bg-app-surface
    content = re.sub(r'bg-slate-200 dark:bg-white/10\b', 'bg-app-surface', content)
    # bg-slate-100 dark:bg-white/5 -> bg-app-surface-soft
    content = re.sub(r'bg-slate-100 dark:bg-white/5\b', 'bg-app-surface-soft', content)
    # bg-slate-50 dark:bg-white/5 -> bg-app-surface-soft
    content = re.sub(r'bg-slate-50 dark:bg-white/5\b', 'bg-app-surface-soft', content)
    
    # 2. Text Colors (Main / Muted)
    # text-slate-900 dark:text-white -> text-app-text
    content = re.sub(r'text-slate-900 dark:text-white\b', 'text-app-text', content)
    # text-slate-500 dark:text-slate-400 -> text-app-text-muted
    content = re.sub(r'text-slate-500 dark:text-slate-400\b', 'text-app-text-muted', content)
    # text-slate-700 dark:text-slate-300 -> text-app-text-muted
    content = re.sub(r'text-slate-700 dark:text-slate-300\b', 'text-app-text-muted', content)
    
    # 3. Borders (Main / Soft)
    # border-slate-200 dark:border-white/5 -> border-app-border
    content = re.sub(r'border-slate-200 dark:border-white/5\b', 'border-app-border', content)
    # border-slate-200 dark:border-white/10 -> border-app-border
    content = re.sub(r'border-slate-200 dark:border-white/10\b', 'border-app-border', content)
    # border-slate-300 dark:border-white/20 -> border-app-border-soft
    content = re.sub(r'border-slate-300 dark:border-white/20\b', 'border-app-border-soft', content)

    # 4. Interactive / Hover States
    # hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 -> hover:bg-app-surface-soft
    content = re.sub(r'hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10\b', 'hover:bg-app-surface-soft', content)
    # hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10 -> hover:bg-app-surface-soft
    content = re.sub(r'hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10\b', 'hover:bg-app-surface-soft', content)

    # 5. Clean up remaining hardcoded dark variants that should be semantic
    content = re.sub(r'dark:text-white\b', 'text-app-text', content)
    content = re.sub(r'dark:text-slate-100\b', 'text-app-text', content)
    content = re.sub(r'dark:text-slate-400\b', 'text-app-text-muted', content)
    content = re.sub(r'dark:bg-white/10\b', 'bg-app-surface', content)
    content = re.sub(r'dark:bg-white/5\b', 'bg-app-surface-soft', content)
    content = re.sub(r'dark:border-white/10\b', 'border-app-border', content)
    content = re.sub(r'dark:border-white/5\b', 'border-app-border', content)

    # Prevent double class names
    content = content.replace('text-app-text text-app-text', 'text-app-text')
    content = content.replace('bg-app-surface bg-app-surface', 'bg-app-surface')

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Refactored: {filepath}")

def main():
    base_dir = r"d:\ASSET-MANAGER\frontend"
    targets = ['pages', 'components']
    
    print("Starting Semantic Theme Refactor...")
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
