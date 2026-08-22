# Button Component

**Path**: `src/components/ui/Button.tsx`

The Button component handles all interactive button states, including default, secondary, outline, ghost, and destructive.

## Props
- `variant`: `"default" | "secondary" | "outline" | "ghost" | "link" | "destructive"`
- `size`: `"default" | "sm" | "lg" | "icon"`
- Supports all standard `HTMLButtonElement` props (e.g., `disabled`, `onClick`, `type`).

## Usage
```tsx
import { Button } from "../components/ui/Button"

// Primary Action
<Button>Buy Course</Button>

// Secondary Action (Cancel, Back)
<Button variant="secondary">Cancel</Button>

// Destructive Action (Delete)
<Button variant="destructive">Delete User</Button>

// Outline Action (Filters, Toggles)
<Button variant="outline">Filter Courses</Button>
```

## Rules
- **Do not** use custom padding classes (`px-8 py-4`) unless absolutely necessary. Rely on the `size` prop.
- **Do not** use inline Tailwind colors on the Button component. Rely on the `variant` prop.
- The `disabled` state automatically manages opacity and pointer-events.
