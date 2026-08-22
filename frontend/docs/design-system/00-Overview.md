# Design System Overview

This folder contains the complete Design System documentation for the Clinique des Juristes platform. 
The components themselves are located in `src/components/ui/` as completely separate, reusable elements.

## Design Principles
- **Predictability**: Elements that do the same thing should look and behave the same.
- **Controlled Hierarchy**: Use the defined typography and spacing scales. Do not add arbitrary padding or arbitrary font sizes.
- **Intentional Loading**: No blank screens or generic spinners for major layout pieces. Use the `<Skeleton>` component.
- **No Decoration without Purpose**: No unnecessary shadows, gradients, or heavy glassmorphism.
- **Lucide Icons**: Emojis are strictly forbidden as UI elements.

## Global Rules
### 1. Spacing Scale
We rely exclusively on the Tailwind 4px grid.
- Small gaps: `gap-2` (8px), `gap-3` (12px)
- Padding (Cards/Modals): `p-6` (24px)
- Padding (Buttons/Inputs): `px-4 py-3`

### 2. Border Radii
- Modals, Cards, and large structural elements: `rounded-2xl` (16px)
- Interactive standard elements (Buttons, Inputs): `rounded-xl` (12px)
- Small elements (Badges, Skeletons): `rounded-md` (6px)

### 3. Shadows
- `shadow-sm`: Inputs, dropdowns, and minor borders.
- `shadow-soft`: Cards and default buttons. 
- `shadow-elegant`: Hover states for interactive cards.

### 4. Typography
- **Font**: Inter (fallback: Cairo for Arabic).
- **Scale**: Rely on index.css utility classes (`.page-title`, `.section-title`, `.card-title`) to avoid hardcoded font sizes in every view.
