import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    replacements = {
        r'\bbg-slate-950\b': 'bg-slate-50 dark:bg-slate-950',
        r'\bbg-slate-900\b': 'bg-white dark:bg-slate-900',
        r'\bbg-slate-800\b': 'bg-slate-100 dark:bg-slate-800',
        r'\bbg-slate-700\b': 'bg-slate-200 dark:bg-slate-700',
        r'\bbg-slate-600\b': 'bg-slate-300 dark:bg-slate-600',
        r'\btext-white\b': 'text-slate-900 dark:text-white',
        r'\btext-slate-300\b': 'text-slate-700 dark:text-slate-300',
        r'\btext-slate-400\b': 'text-slate-600 dark:text-slate-400',
        r'\btext-slate-500\b': 'text-slate-500 dark:text-slate-400',
        r'\btext-slate-600\b': 'text-slate-500 dark:text-slate-400',
        r'\bborder-white/5\b': 'border-slate-200 dark:border-white/5',
        r'\bborder-white/10\b': 'border-slate-300 dark:border-white/10',
        r'\bborder-white/20\b': 'border-slate-300 dark:border-white/20',
        r'\bbg-white/5\b': 'bg-slate-100 dark:bg-white/5',
        r'\bbg-white/10\b': 'bg-slate-200 dark:bg-white/10',
        r'bg-white/\[0\.01\]': 'bg-white dark:bg-white/[0.01]',
        r'bg-white/\[0\.02\]': 'bg-slate-50 dark:bg-white/[0.02]',
        r'bg-white/\[0\.03\]': 'bg-slate-50 dark:bg-white/[0.03]',
        r'bg-white/\[0\.05\]': 'bg-slate-100 dark:bg-white/[0.05]',
        
        # Font Sizes (Tone down excessive sizes)
        r'\btext-5xl\b': 'text-3xl',
        r'\btext-4xl\b': 'text-2xl',
        r'\btext-3xl\b': 'text-xl',
        r'\btext-\[9px\]\b': 'text-xs',
        r'\btext-\[10px\]\b': 'text-xs',
        r'\btext-\[11px\]\b': 'text-sm',
        r'\btext-\[12px\]\b': 'text-sm',
        
        # Shadows
        r'\bshadow-inner\b': 'shadow-sm dark:shadow-inner'
    }

    # Don't double-replace dark: prefixes if they already exist
    for pattern, replacement in replacements.items():
        # Only replace if NOT already prefixed with dark:
        content = re.sub(r'(?<!dark:)' + pattern, replacement, content)

    # Some cleanup for duplicate classes like "text-slate-900 dark:text-slate-900 dark:text-white"
    content = re.sub(r'text-slate-[0-9]+\s+dark:text-slate-[0-9]+\s+dark:text-white', 'text-slate-900 dark:text-white', content)
    content = re.sub(r'text-slate-[0-9]+\s+dark:text-white\s+dark:text-white', 'text-slate-900 dark:text-white', content)
    
    # Specific layout background fixes
    content = re.sub(r'bg-\[\#05060A\]', 'bg-slate-50 dark:bg-[#05060A]', content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    target_dirs = ['frontend/components', 'frontend/pages']
    
    for directory in target_dirs:
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith('.jsx'):
                    process_file(os.path.join(root, file))

    print("Bulk replacement complete.")

if __name__ == "__main__":
    main()
