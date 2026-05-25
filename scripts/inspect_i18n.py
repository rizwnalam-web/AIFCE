from pathlib import Path

path = Path('i18n.ts')
text = path.read_text(encoding='utf-8')
lines = text.splitlines()
print(f'Total lines: {len(lines)}')

print('\n--- LAST 10 LINES ---')
for i, line in enumerate(lines[-10:], start=len(lines)-9):
    print(f'{i}: {line!r}')

print('\n--- SPECIFIC LINE CHECKS ---')
for idx in [384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399]:
    if 1 <= idx <= len(lines):
        print(f'{idx}: {lines[idx-1]!r}')
    else:
        print(f'{idx}: out of range')

idx = next((i for i, l in enumerate(lines) if 'const translations:' in l), None)
print('\n--- TRANSLATIONS LINE INFO ---')
print(f'const translations index: {idx}')
if idx is not None:
    print(f'line {idx+1}: {lines[idx]!r}')

print('\n--- RAW BYTES AROUND const translations ---')
data = path.read_bytes()
pos = data.find(b'const translations:')
print(pos)
print(data[max(0, pos-80): pos+160])

print('\n--- LAST 120 BYTES ---')
print(data[-120:])
print('\n--- LAST 120 BYTES AS UTF-8 REPR ---')
print(repr(data[-120:].decode('utf-8', errors='replace')))
