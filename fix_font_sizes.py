import os
import re

# Mapping of microscopic/too-small sizes to readable ones
# We target the IT Staff Dashboard specifically and then the rest of the components

FONT_SIZE_UPGRADES = [
    # Microscopic custom sizes → proper Tailwind scale
    (r'\btext-\[9px\]\b',    'text-xs'),     # 9px  → 12px
    (r'\btext-\[10px\]\b',   'text-xs'),     # 10px → 12px  
    (r'\btext-\[11px\]\b',   'text-xs'),     # 11px → 12px
    (r'\btext-\[12px\]\b',   'text-sm'),     # 12px → 14px (already readable but normalize)
    
    # Tiny tracking (ultra-wide letter-spacing on small text makes it worse)
    # Tone down extreme tracking on tiny text — keep the style but less extreme
    (r'\btracking-\[0\.8em\]\b',  'tracking-[0.3em]'),
    (r'\btracking-\[0\.6em\]\b',  'tracking-[0.25em]'),
    (r'\btracking-\[0\.5em\]\b',  'tracking-[0.2em]'),
    (r'\btracking-\[0\.4em\]\b',  'tracking-widest'),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content

    for pattern, replacement in FONT_SIZE_UPGRADES:
        content = re.sub(pattern, replacement, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

def main():
    dirs = ['frontend/components', 'frontend/pages']
    for d in dirs:
        for root, _, files in os.walk(d):
            for f in files:
                if f.endswith('.jsx'):
                    process_file(os.path.join(root, f))
    print("Done fixing font sizes.")

if __name__ == "__main__":
    main()
