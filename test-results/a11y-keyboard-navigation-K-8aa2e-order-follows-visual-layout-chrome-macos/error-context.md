# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Component Gallery" [level=1] [ref=e3]
  - paragraph [ref=e4]: Scaffold for Playwright screenshots (headless).
  - toolbar "Theme and density controls" [ref=e5]:
    - button "Light theme" [ref=e6]: Light
    - button "Dark theme" [active] [ref=e7]: Dark
    - button "Compact density" [ref=e8]: Compact
    - button "Comfortable density" [ref=e9]: Comfortable
  - region "Component examples" [ref=e10]:
    - generic [ref=e11]:
      - heading "Buttons (placeholder)" [level=3] [ref=e12]
      - button "Primary button example" [ref=e13]: Primary
      - button "Disabled button example" [disabled] [ref=e14]: Disabled
    - generic [ref=e15]:
      - heading "Inputs (placeholder)" [level=3] [ref=e16]
      - textbox "Text input example" [ref=e17]:
        - /placeholder: Type here
    - generic [ref=e18]:
      - heading "Dashboard Demo" [level=3] [ref=e19]
      - paragraph [ref=e20]: Interactive dashboard with StatCards and micro-trends
      - link "Open Dashboard →" [ref=e21] [cursor=pointer]:
        - /url: dashboard-demo.html
    - generic [ref=e22]:
      - heading "Components" [level=3] [ref=e23]
      - list [ref=e24]:
        - listitem [ref=e25]: ✓ Table with virtualization
        - listitem [ref=e26]: ✓ Modal & Drawer
        - listitem [ref=e27]: ✓ Toast notifications
        - listitem [ref=e28]: ✓ StatCards with trends
        - listitem [ref=e29]: ✓ Chart utilities
```