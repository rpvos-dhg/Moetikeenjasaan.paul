# Maakt huisstijl/huisstijl.css (zonder @font-face) en het gegenereerde deel van huisstijl/theme.css.
# Gebruik: python3 scripts/build-theme.py [pad/naar/nieuwe/huisstijl.css]
# Zonder argument wordt huisstijl/huisstijl.css zelf opnieuw verwerkt. Het handgeschreven
# deel onderaan theme.css (vanaf "Handgeschreven") blijft staan.
import re, sys, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
out_css = os.path.join(root, 'huisstijl', 'huisstijl.css')
out_theme = os.path.join(root, 'huisstijl', 'theme.css')
src = sys.argv[1] if len(sys.argv) > 1 else out_css
css = open(src).read()
css_nofont = re.sub(r'@font-face\{[^}]*\}', '', css)
assert 'url(../fonts' not in css_nofont
open(out_css, 'w').write(css_nofont)

FALL_H = '"Clan Pro", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
FALL_B = '"Bernina Sans", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
def fix(v):
    v = v.replace('"Clan Pro"', FALL_H).replace('"Bernina Sans"', FALL_B)
    return v

# Lettertokens per breakpoint: :root{...} op topniveau en binnen @media(...){:root{...}}
blocks = []
for m in re.finditer(r'(@media\([^)]*\)\{)?:root\{([^{}]*)\}', css):
    decls = [d for d in m.group(2).split(';') if ('"Clan Pro"' in d or '"Bernina Sans"' in d) and d.strip().startswith('--')]
    if decls:
        body = ';\n  '.join(fix(d.strip()) for d in decls)
        sel = 'html:root {\n  ' + body + ';\n}'
        blocks.append((m.group(1) + '\n' + sel + '\n}') if m.group(1) else sel)

# Donker thema: de eigen context-strong-waarden (wit op ocean), zonder de vaste 'static'-kleuren
# Alleen het losse .context-strong-blok, niet de gedeelde selector die er ook op eindigt
m = re.search(r'\}\.context-strong\{([^{}]*--text-color-strong:[^{}]*)\}', css)
decls = [d.strip() for d in m.group(1).split(';') if d.strip().startswith('--') and '-static' not in d.split(':')[0]]
dark = 'html.dark,\nhtml.dark .context-default,\nhtml.dark .context-weak {\n  ' + ';\n  '.join(decls) + ';\n  color-scheme: dark;\n}'

head = """/*
 * Gegenereerd uit huisstijl.css door scripts/build-theme.py.
 * 1. Lettertokens met terugval: huisstijl noemt alleen "Clan Pro" en "Bernina Sans".
 *    Die fonts zitten niet in deze openbare repo; staan ze op het toestel, dan
 *    worden ze gebruikt, anders Inter.
 * 2. Donker thema (eigen aanvulling): de eigen context-strong-waarden als basis.
 *    De vlakken staan in het handgeschreven deel onderaan.
 */
"""
MARK = '/* ─── Handgeschreven'
hand = ''
if os.path.exists(out_theme):
    old = open(out_theme).read()
    if MARK in old: hand = '\n' + old[old.index(MARK):]
open(out_theme, 'w').write(head + '\n\n'.join(blocks) + '\n\n' + dark + '\n' + hand)
print(len(blocks), 'font blocks,', len(decls), 'dark decls')
