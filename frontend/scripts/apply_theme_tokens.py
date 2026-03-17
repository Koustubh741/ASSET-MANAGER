import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Text Colors (Muted / Subtext)
    # text-slate-500 -> text-slate-600 dark:text-slate-500
    content = re.sub(r'(?<!dark:)text-slate-500(?!/)', r'text-slate-600 dark:text-slate-500', content)
    # text-slate-400 -> text-slate-600 dark:text-slate-400
    content = re.sub(r'(?<!dark:)text-slate-400(?!/)', r'text-slate-600 dark:text-slate-400', content)
    # text-slate-300 -> text-slate-700 dark:text-slate-300
    content = re.sub(r'(?<!dark:)text-slate-300(?!/)', r'text-slate-700 dark:text-slate-300', content)
    
    # 2. Text Colors (Neutral / Base)
    # text-slate-200 -> text-slate-800 dark:text-slate-200
    content = re.sub(r'(?<!dark:)text-slate-200(?!/)', r'text-slate-800 dark:text-slate-200', content)
    # text-slate-100 -> text-slate-900 dark:text-slate-100
    content = re.sub(r'(?<!dark:)text-slate-100(?!/)', r'text-slate-900 dark:text-slate-100', content)
    # text-white -> text-slate-900 dark:text-white
    content = re.sub(r'(?<!dark:)text-white(?!/)', r'text-slate-900 dark:text-white', content)
    # text-slate-800 -> text-slate-900 dark:text-slate-800
    content = re.sub(r'(?<!dark:)text-slate-800(?!/)', r'text-slate-900 dark:text-slate-800', content)

    # 3. Border Opacities (Lines / Dividers)
    # border-white/5 -> border-slate-200 dark:border-white/5
    content = re.sub(r'(?<!dark:)border-white/5\b', r'border-slate-200 dark:border-white/5', content)
    # border-white/10 -> border-slate-200 dark:border-white/10
    content = re.sub(r'(?<!dark:)border-white/10\b', r'border-slate-200 dark:border-white/10', content)
    # border-white/20 -> border-slate-300 dark:border-white/20
    content = re.sub(r'(?<!dark:)border-white/20\b', r'border-slate-300 dark:border-white/20', content)
    
    # 4. Background Opacities (Containers / Cards)
    # bg-white/5 -> bg-slate-100 dark:bg-white/5
    content = re.sub(r'(?<!dark:)(?<!hover:)bg-white/5\b', r'bg-slate-100 dark:bg-white/5', content)
    # bg-white/10 -> bg-slate-200 dark:bg-white/10
    content = re.sub(r'(?<!dark:)(?<!hover:)bg-white/10\b', r'bg-slate-200 dark:bg-white/10', content)
    
    # 5. Hover States
    # hover:bg-white/10 -> hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/10
    content = re.sub(r'(?<!dark:)hover:bg-white/10\b', r'hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/10', content)
    # hover:bg-white/5 -> hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5
    content = re.sub(r'(?<!dark:)hover:bg-white/5\b', r'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5', content)
    # hover:text-white -> hover:text-slate-900 dark:hover:text-white
    content = re.sub(r'(?<!dark:)hover:text-white\b', r'hover:text-slate-900 dark:hover:text-white', content)
    
    # Clean up double darkness
    content = content.replace('dark:dark:', 'dark:')
    content = content.replace('hover:hover:', 'hover:')

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Processed: {filepath}")

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
