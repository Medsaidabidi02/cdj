import os
import re

path = "src/pages/AdminDashboard.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix tabItems
# We want to remove the quotes around the icon value
content = re.sub(r"icon:\s*'(<[^>]+>)'", r"icon: \1", content)
content = re.sub(r'icon:\s*"(<[^>]+>)"', r"icon: \1", content)

# Fix logout button corrupted character
# <span>+-</span>
# Let's replace the whole logout button span
content = re.sub(r"<span>.*?-</span>\s*<span>DAcconnexion</span>", r"<span><LogOut className=\"w-4 h-4\" /></span>\n              <span>Déconnexion</span>", content)

# Fix encoding issues that might have happened with accents
content = content.replace("DAcconnexion", "Déconnexion")
content = content.replace("VidAcos", "Vidéos")
content = content.replace("vidAco", "vidéo")
content = content.replace("vidAcos", "vidéos")
content = content.replace("CrAcer", "Créer")
content = content.replace("pAcdagogique", "pédagogique")
content = content.replace("gAcrer", "gérer")
content = content.replace("actualitAcs", "actualités")
content = content.replace("TAclAccharger", "Télécharger")
content = content.replace("Actudiants", "étudiants")
content = content.replace("privAcs", "privés")
content = content.replace("approuvAc", "approuvé")
content = content.replace("mis A jour", "mis à jour")
content = content.replace("supprimAc", "supprimé")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
