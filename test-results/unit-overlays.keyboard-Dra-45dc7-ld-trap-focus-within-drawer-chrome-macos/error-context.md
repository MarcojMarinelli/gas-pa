# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Overlay Components Test Page" [level=1] [ref=e3]
  - button "Open Modal" [ref=e4]
  - button "Open Drawer" [active] [ref=e5]
  - button "Show Toast" [ref=e6]
  - textbox "Input before overlays" [ref=e7]
  - button "Button before overlays" [ref=e8]
  - generic [ref=e9]:
    - link "Link in middle" [ref=e10] [cursor=pointer]:
      - /url: "#"
    - combobox [ref=e11]:
      - option "Option 1" [selected]
      - option "Option 2"
  - textbox "Input after overlays" [ref=e12]
  - button "Button after overlays" [ref=e13]
```