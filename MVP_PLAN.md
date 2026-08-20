# MVP Plan — LevelUp Liquid Glass Experience

## 1) Goal
Build a convincing MVP that feels polished, modern, and product-ready enough for stakeholder approval. The app should feel like a complete, premium tutoring system with working demo flows, not just a static mockup.

## 2) Primary MVP Objectives
- Make the experience feel complete for all four roles: student, teacher, assistant, and center.
- Show the core flows clearly and smoothly: browse, book, attend, pay, communicate, manage waiting lists.
- Deliver a premium visual system using the Liquid Glass aesthetic consistently across the whole product.
- Keep the implementation in-place and focused, without a full rewrite.

## 3) MVP Scope (Must-Have)
### A. Student experience
- Role switcher to enter student view.
- Home dashboard with clear next actions.
- Explore tutors and groups.
- Book a seat or join waiting list.
- Confirm booking and payment flow.
- View attendance and QR scan experience.
- View assignments, make-up requests, payments, and notifications.

### B. Teacher experience
- Dashboard with quick actions and metrics.
- Manage groups and capacity.
- Start attendance session and generate QR flow.
- Review submissions and assignments.
- Manage waiting list and invite students.
- Send communications and reminders.

### C. Assistant experience
- Review pending student actions.
- Manage attendance edge cases and makeup requests.
- Review submissions and follow-ups.
- Support the teacher/center workflow smoothly.

### D. Center experience
- Oversee overall operations.
- View payments and communications.
- Monitor waiting list and capacity demand.
- Adjust settings and internal actions.

## 4) Visual Design Direction (Must Match the Requested Style)
### Look and feel
- Liquid Glass aesthetic across all surfaces.
- Frosted translucent cards with subtle glossy highlights.
- Soft ambient lighting and smooth gradients.
- Cool blue/slate palette with refined depth and blur.
- Clean layered hierarchy with premium spacing.
- Smooth motion and polished micro-interactions.

### Design system requirements
- Use shared tokens for color, blur, depth, sheen, and radius.
- Apply theme toggle for light and dark states.
- Ensure text readability and contrast over glass cards.
- Keep motion subtle, elegant, and smooth.

### UI components to standardize
- Top bar
- Desktop rail / mobile nav
- Hero cards
- Group cards
- Stat cards
- Buttons
- Badges
- Search input panels
- QR panel
- Booking/payment card
- Empty states

## 5) Technical Implementation Plan
### Phase 1 — Foundation (Day 1)
- Lock the visual token system.
- Finalize the global Liquid Glass styles and utilities.
- Ensure theme toggle and dark/light parity works globally.
- Standardize shared components such as buttons, cards, badges, stat blocks.

### Phase 2 — Functional MVP Flows (Day 2–3)
- Finish student flow: explore, booking, payment, attendance, notifications.
- Finish teacher flow: groups, attendance, submissions, waitlist.
- Finish assistant/center flow: support screens and action summaries.
- Connect demo state transitions so flows feel alive and convincing.

### Phase 3 — Visual Polish (Day 3–4)
- Sweep the whole app for visual consistency.
- Replace remaining hard-coded colors and backgrounds.
- Improve spacing, depth, contrast, and typography rhythm.
- Polish hover, focus, and motion states.

### Phase 4 — QA and Stakeholder Readiness (Day 4)
- Verify all roles and screens are coherent.
- Test responsive layout on mobile/tablet/desktop.
- Review accessibility and readability.
- Prepare a short showcase with the preview route and polished screens.

## 6) Delivery Checklist
### Functional readiness
- All four roles are navigable and visually distinct.
- Core actions are available and understandable.
- Demo state transitions feel real and complete.
- The app can be presented as a working MVP in one sitting.

### Design readiness
- All major surfaces use the Liquid Glass system.
- The visual language is consistent across cards, nav, buttons, and panels.
- Light/dark modes feel intentional and premium.
- The app feels modern, calm, and high-end.

## 7) Definition of Done
The MVP is ready when:
- People can understand the system and its purpose in under 2 minutes.
- Every main role has a believable workflow.
- The UI looks premium and coherent.
- The product feels closer to a real platform than a prototype.

## 8) Recommended Order of Work
1. Finalize tokens and shared components.
2. Complete student core flow.
3. Complete teacher core flow.
4. Complete assistant/center support flow.
5. Polish visuals and motion.
6. QA and present.

## 9) Suggested Delivery Target
- MVP prototype: 4–5 working days of focused implementation.
- Visual polish: integrated throughout, not as a separate late-stage step.
