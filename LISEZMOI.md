# Vu d'Auteuil : mise en route

Ce dossier contient ton site complet. Une fois en ligne, tu n'auras plus à toucher à ces fichiers : tu écriras et modifieras tes brèves dans l'éditeur Pages CMS, depuis ton ordinateur ou ton téléphone.

Compte environ 30 minutes, une seule fois.

---

## 1. Créer ton compte GitHub

GitHub héberge gratuitement le site.

1. Va sur github.com et crée un compte.
2. Choisis bien ton nom d'utilisateur : il apparaîtra dans l'adresse du site tant que tu n'as pas ton propre nom de domaine. Par exemple, avec le nom `vudauteuil`, le site sera sur `https://vudauteuil.github.io`.

## 2. Créer le dépôt du site

1. En haut à droite, clique sur **+** puis **New repository**.
2. Nom du dépôt : exactement `ton-nom-utilisateur.github.io` (par exemple `vudauteuil.github.io`).
3. Coche **Public**. La formule gratuite de GitHub Pages exige un dépôt public.
4. Ne coche rien d'autre et clique sur **Create repository**.

## 3. Envoyer les fichiers

1. Dézippe le dossier sur ton ordinateur.
2. Sur la page du dépôt vide, clique sur le lien **uploading an existing file**.
3. Ouvre le dossier dézippé, sélectionne **tout son contenu** (pas le dossier lui-même) et glisse-le dans la fenêtre de GitHub.
4. En bas, clique sur **Commit changes**.

**Vérifie le fichier `.pages.yml`.** Son nom commence par un point, donc ton ordinateur le cache et il peut ne pas avoir été envoyé. S'il n'apparaît pas dans la liste des fichiers du dépôt :

1. Clique sur **Add file** puis **Create new file**.
2. Nom du fichier : `.pages.yml`
3. Colle tout le contenu du fichier `pages-cms-config.txt` (ouvre-le avec un éditeur de texte).
4. Clique sur **Commit changes**.

## 4. Mettre le site en ligne

1. Dans le dépôt, va dans **Settings** puis **Pages** (menu de gauche).
2. Sous **Build and deployment**, choisis **Deploy from a branch**, puis la branche **main** et le dossier **/ (root)**. Clique sur **Save**.
3. Attends une à deux minutes. Le site est en ligne sur `https://ton-nom-utilisateur.github.io`.

Si le site ne s'affiche pas, ouvre l'onglet **Actions** du dépôt : chaque mise en ligne y apparaît, avec une croix rouge en cas d'erreur. Envoie-moi le message d'erreur et je corrige.

## 5. Brancher l'éditeur Pages CMS

1. Va sur app.pagescms.org et connecte-toi avec ton compte GitHub.
2. Autorise Pages CMS à accéder à ton dépôt du site quand il te le demande.
3. Ouvre le dépôt dans Pages CMS. Le menu affiche : **Brèves**, **Réglages du site**, **L'épopée**, **La galerie des tifos**, **Le lexique**, **Les chants**, **Pages fixes**.

## 6. Premiers réglages

Dans **Réglages du site** : ton nom de plume, ton slogan, tes liens Instagram et X. Enregistre.

Dans **Pages fixes** : complète **À propos** et **Mentions légales** (les passages entre crochets).

---

## Au quotidien : écrire une brève

1. Dans Pages CMS, ouvre **Brèves** et crée une nouvelle entrée.
2. Remplis le formulaire : titre, date du match, compétition, adversaire, score, buteurs, chapeau, photo, notes du virage.
3. Écris le texte dans l'éditeur. Le bouton **citation** met une phrase en exergue, en grandes capitales.
4. Enregistre. La brève est en ligne environ une minute plus tard, en tête de l'accueil.

**Garder un brouillon** : décoche **Publiée** avant d'enregistrer. La brève est sauvegardée mais n'apparaît pas sur le site. Recoche la case quand elle est prête.

**Modifier une brève** : ouvre-la dans la liste, change ce que tu veux, enregistre.

**Mettre à jour l'épopée** : dans **L'épopée**, change la phrase de chaque chapitre (« Leader à la trêve… »). Le lien vers le dernier épisode se met à jour tout seul.

**Ajouter un mot au lexique** : dans **Le lexique**, ajoute une ligne. Le mot apparaît sur la page /lexique/, à sa lettre. Coche « Afficher aussi sur l'accueil » pour le montrer en page d'accueil (huit mots au maximum).

**Faire un lien vers le lexique dans une brève** : sélectionne le mot dans le texte, clique sur le bouton lien et colle l'adresse `/lexique/#` suivie du mot, en minuscules, sans accent et avec des tirets à la place des espaces. Exemples : `/lexique/#craquage`, `/lexique/#deplacement`, `/lexique/#douzieme-homme`.

**Le baromètre** (/barometre/) se calcule tout seul à partir des notes de chaque brève. Écris toujours le nom de l'homme du soir de la même façon, sinon il compte pour deux joueurs. La saison suivie est celle indiquée dans **L'épopée**.

**Les images de partage** : quand on partage une brève sur WhatsApp, X ou Instagram, une image apparaît avec le titre, le score et la note du virage. Elle est fabriquée toute seule à chaque mise en ligne : tu n'as rien à faire. Si tu ajoutes une photo principale à la brève, elle sert de fond à l'image.

**Ajouter un tifo** : dans **La galerie des tifos**, ajoute une fiche avec ta photo. Sans photo, le texte « affiché » apparaît en grand à la place.

**Ajouter un chant** : dans **Les chants**, ajoute une fiche (nom, air d'origine, quand on le chante, son histoire). Raconte le chant avec tes mots, sans recopier les paroles.

**Photos** : remplis toujours le champ de description (ou la légende) : c'est ce que lisent les personnes malvoyantes et Google. Utilise tes propres photos, ou celles dont l'auteur t'a donné l'accord. Pas de captures d'écran de comptes Instagram ou X.

---

## Plus tard

**Ton nom de domaine** (par exemple vudauteuil.fr) : achète-le chez un registraire français, puis indique-le dans **Settings > Pages > Custom domain** sur GitHub. GitHub affiche la marche à suivre.

**La newsletter** : crée-la sur un service de newsletter, puis colle le lien d'inscription dans **Réglages du site**. Le bloc « Le coup de sifflet final, dans ta boîte » et le lien du menu apparaissent alors automatiquement.

**Changer le nom ou le logo** : dans **Réglages du site**, champs « Logo, début » et « Logo, fin ». Le nom technique du site est dans `_config.yml`, ligne `title`.

**Changer les couleurs** : en haut du fichier `assets/css/style.css`.

---

## Comment le site est mis en ligne

Depuis novembre 2026, c'est un petit programme de GitHub qui construit le site à chaque enregistrement (fichier `.github/workflows/site.yml`) : il fabrique les images de partage, puis le site, puis le met en ligne. Chaque mise en ligne apparaît dans l'onglet **Actions** du dépôt.

Réglage à faire une seule fois : **Settings > Pages > Build and deployment > Source : GitHub Actions**.

Si une mise en ligne échoue, une croix rouge apparaît dans l'onglet **Actions** et le site reste tel qu'il était. Envoie-moi le message d'erreur et je corrige.
