# Sistema de diseño — primitivos de UI

Guía corta para construir pantallas internas coherentes. **No inventes estilos
sueltos**: consume tokens y primitivos.

## Tokens (única fuente de verdad)

- [`src/styles/design-tokens.css`](../../styles/design-tokens.css) — colores, radios,
  sombras, espaciado, tipografía, z-index y grupos por componente (`--hm-button-*`,
  `--hm-card-*`, `--hm-panel-*`, `--hm-shell-*`).
- [`src/styles/theme-live.css`](../../styles/theme-live.css) — capa editable de tema.
- **Claro/oscuro**: lo aplica [`themePreferences.js`](../theme/themePreferences.js)
  reescribiendo los `--hm-color-*` en `:root` y poniendo `data-theme`. Si tu CSS
  consume tokens (no hex sueltos), el modo oscuro funciona solo.

### Movimiento

| Token | Valor | Úsalo para |
| --- | --- | --- |
| `--motion-fast` | 140ms | hovers, feedback inmediato |
| `--motion-normal` | 180ms | micro-transiciones de UI |
| `--motion-slow` | 240ms | entradas/salidas visibles |
| `--motion-modal` | = slow | apertura/cierre de modales |
| `--motion-page` | 320ms | transiciones de ruta |
| `--ease-out` | cubic-bezier(0.16, 1, 0.3, 1) | curva por defecto |
| `--ease-in-out` | cubic-bezier(0.65, 0, 0.35, 1) | movimientos simétricos |
| `--ease-spring-soft` | cubic-bezier(0.22, 1, 0.36, 1) | rebotes sutiles |

Reglas: anima solo `transform`/`opacity`/`clip-path`; nada de `width/height/top/left`.
Respeta siempre `@media (prefers-reduced-motion: reduce)`.

## Primitivos

### Botón → `RippleButton`

El botón canónico de la app es [`RippleButton`](./RippleButton/RippleButton.jsx)
(variantes `primary | secondary | danger | ghost`, tamaños `sm | md | lg`,
`fullWidth`, `forwardRef`). Antes de escribir un `<button>` con CSS propio,
pregúntate si esto lo cubre.

```jsx
<RippleButton variant="primary" size="lg" onClick={save}>Guardar</RippleButton>
```

### `Card`

Superficie estándar ([`Card`](./Card/Card.jsx)): borde + radio + sombra de los
tokens `--hm-card-*`.

```jsx
<Card as="article" padding="lg">…</Card>
<Card interactive as="button" onClick={open}>…</Card>   // clicable, con hover/focus
<Card variant="muted">…</Card>                          // fondo secundario, sin sombra
```

### `Modal` + `ModalHeader` / `ModalBody` / `ModalActions`

Modal base accesible ([`Modal`](./Modal/Modal.jsx)): portal, scroll lock, Esc,
click en el fondo, focus trap, foco inicial (`[data-autofocus]` o el panel),
restauración de foco, animación entrada/salida con `--motion-modal` y variante
bottom-sheet en móvil. **Todo modal nuevo se compone sobre este.**

```jsx
<Modal open={open} onClose={close} size="md">
  <ModalHeader eyebrow="Solicitud" title="Título del modal" />
  <ModalBody>…</ModalBody>
  <ModalActions>
    <RippleButton variant="secondary" onClick={close}>Cancelar</RippleButton>
    <RippleButton onClick={confirm}>Confirmar</RippleButton>
  </ModalActions>
</Modal>
```

Etiquetado: `ModalHeader title` etiqueta el dialog automáticamente; sin título,
pasa `ariaLabel` (o `labelledBy` si el contenido ya trae su propio id de título).

### `Field` + `Input` / `Textarea` / `Select`

Formulario con el cableado de accesibilidad hecho ([`Field`](./Field/Field.jsx)):
label asociada, `aria-describedby` para hint/error, `aria-invalid`, error con
`role="alert"` (se anuncia a lectores de pantalla).

```jsx
<Field label="Nombre" hint="Visible para tus vecinos" error={errors.name} required>
  <Input value={name} onChange={(e) => setName(e.target.value)} />
</Field>
```

Acepta cualquier elemento propio como hijo único: recibe `id`, `aria-*` y `required`
por `cloneElement`.

## Otros compartidos ya existentes

`SectionHeader`, `UserAvatar`, `AnimatedDropdown`, `BrandLogo`, `ActionStatusOverlay`,
layouts de shell en [`layouts/`](./layouts/). Revisa aquí antes de crear nada nuevo.
