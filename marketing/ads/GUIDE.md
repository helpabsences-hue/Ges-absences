# Attendefy — guide pour lancer les publicités

What is already done in the code (PR `feat/ads-tracking`):

- `/tracking.js` loads **Meta Pixel, Google Analytics 4 / Google Ads and TikTok Pixel** — only on the
  landing page and the sign-up page, never inside the app (students' data), and only after the visitor
  clicks **Accepter** on the cookie banner.
- Events sent automatically:

  | Action of the visitor | Meta | Google | TikTok |
  |---|---|---|---|
  | Opens the page | `PageView` | page_view | page |
  | Clicks a sign-up button ("Essai gratuit…") | `Lead` | `generate_lead` | `SubmitForm` |
  | Clicks a WhatsApp link | `Contact` | `contact` (+ Ads conversion if `…_LEAD` is set) | `Contact` |
  | Clicks "Tarifs" | `ViewContent` | `view_item` | `ViewContent` |
  | **Creates a school account** | **`CompleteRegistration`** | **`sign_up` + Ads conversion** | **`CompleteRegistration`** |

- Logged-out visitors on `https://www.attendefy.com/` now see the landing page (before: the login form),
  so ads can link to the bare domain. A "Connexion" link was added to the menu.
- A privacy page: `/confidentialite.html` (linked from the footer and the banner). **Fill in the
  `[à compléter]` parts** (company name, address, e-mail, CNDP number).

Nothing is tracked until you put the IDs in Vercel (step 4).

---

## 1. Meta (Facebook + Instagram) — the most important for Morocco

1. Go to **business.facebook.com** → create a **Business portfolio** "Attendefy".
2. Add your **Facebook Page** and connect your **Instagram** account (Settings → Accounts).
3. **Ad account**: Settings → Accounts → Ad accounts → Create. Currency **MAD**, time zone
   **Africa/Casablanca** (both cannot be changed later). Add a payment card.
4. **Pixel**: Events Manager → **Connect data → Web** → name "Attendefy site" → choose
   **"Install code manually"** only to see the ID → copy the **Pixel ID** (15–16 digits).
   You don't need to paste any code: our `/tracking.js` does it.
5. **Verify the domain**: Settings → Brand safety → **Domains** → add `attendefy.com` →
   choose **DNS TXT record** → add that TXT record at your domain provider → Verify.
6. After step 4 below: Events Manager → your pixel → **Test events** → open
   `https://www.attendefy.com`, click **Accepter**, click "Essai gratuit" → you must see `PageView`
   and `Lead` arrive.

## 2. Google (Analytics + Ads)

1. **analytics.google.com** → Admin → Create property "Attendefy" (Morocco, MAD) → Web stream
   `https://www.attendefy.com` → copy the **Measurement ID** `G-XXXXXXXXXX`.
2. **ads.google.com** → create the account (MAD).
   Goals → Conversions → **New conversion action → Website** → enter the site → "Add manually" →
   category **Sign-up**, name "Inscription école" → **Use Google tag → Install the tag yourself**:
   copy the **Conversion ID** `AW-123456789` and the **Conversion label** (text after the `/`).
   (Optional: a second one, category **Contact**, for WhatsApp clicks → its label.)
3. In Google Ads → Tools → **Linked accounts → Google Analytics** → link the GA4 property.

## 3. TikTok (optional)

**ads.tiktok.com** → Tools → **Events → Web events → Set up web events → Manually install pixel code**
→ copy the **Pixel ID** (starts with `C…`).

## 4. Put the IDs in Vercel

Vercel → your project → **Settings → Environment Variables** (environment: *Production*) → add only
the ones you have:

| Name | Example |
|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | `123456789012345` |
| `NEXT_PUBLIC_GA4_ID` | `G-ABC123DEF4` |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | `AW-123456789` |
| `NEXT_PUBLIC_GOOGLE_ADS_SIGNUP` | sign-up conversion label |
| `NEXT_PUBLIC_GOOGLE_ADS_LEAD` | WhatsApp conversion label (optional) |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | `CABCDEFG12345` |

Then **Deployments → ⋯ → Redeploy**. These are public IDs (not secrets).

---

## 5. The first campaign on Meta (suggestion)

| Setting | Value |
|---|---|
| Objective | **Leads** (or Sales) → conversion location **Website** → event **CompleteRegistration** |
| Second ad set (works very well in Morocco) | Objective **Engagement → Messaging apps → WhatsApp** (link your WhatsApp Business number) |
| Location | Morocco (or your cities: Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir…) |
| Age | 28–60 |
| Audience | **Advantage+ audience**, with suggestions: school administration, private school, education, teachers, school owner |
| Placements | Advantage+ placements. Use the **vertical** video for Reels/Stories and the **square** one for Feed |
| Budget | e.g. 50–100 MAD / day per ad set; leave it 5–7 days before judging (learning phase) |
| Link | `https://www.attendefy.com/?utm_source=meta&utm_medium=paid&utm_campaign=lancement` |

Measure: cost per **CompleteRegistration** (trial started) and cost per WhatsApp conversation.
Stop the ads that cost much more than the others after ~1 week; keep the best.

For Google Ads, start with a **Search** campaign on keywords such as
`logiciel gestion absences`, `gestion scolaire maroc`, `application absence école`, `logiciel école privée maroc`,
`suivi absences élèves`.

## 6. Ad texts (copy-paste)

**A — Darija**
> واش باقي كتديرو l'appel على الورق وكتعيطو للواليدين واحد بواحد؟ 📋📞
> مع Attendefy: le prof كيدير l'appel ف ثواني، la direction كتشوف كلشي en temps réel، والواليدين كيوصلهم alerte automatiquement ✅
> جرّبو مجانا 30 يوم — sans engagement.

**B — Français**
> Fini les feuilles d'appel papier et les appels aux parents un par un.
> Avec Attendefy, vos enseignants font l'appel en quelques secondes, la direction suit tout en temps réel
> et les parents sont alertés automatiquement. Import direct depuis Massar.
> 👉 Essai gratuit 30 jours, sans engagement.

**C — Court (Stories / Reels)**
> L'appel en 1 clic. Les parents alertés automatiquement. 🎓 Essai gratuit 30 jours.

Headlines: `Essai gratuit 30 jours` · `Les parents alertés automatiquement` · `Import direct Massar`
Button: **S'inscrire** (website ad set) / **Envoyer un message WhatsApp** (WhatsApp ad set).

## 7. Before you launch — checklist

- [ ] PR `feat/ads-tracking` merged and the site redeployed
- [ ] IDs added in Vercel + redeploy; **Test events** shows PageView / Lead
- [ ] Domain verified on Meta
- [ ] `/confidentialite.html` completed (company, address, e-mail, CNDP)
- [ ] ElevenLabs on a **paid plan** (commercial licence for the voice), then ask Claude to regenerate it
- [ ] Prices and "30 jours gratuits" on the landing page are still correct
- [ ] Test a real sign-up from your phone after accepting cookies → `CompleteRegistration` appears in Events Manager
