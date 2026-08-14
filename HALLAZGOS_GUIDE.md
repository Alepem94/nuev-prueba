# Guía de Hallazgos Editoriales

El dashboard ahora utiliza las pestañas existentes `Hallazgos` y `Observaciones`. No necesitas crear una pestaña nueva.

## 1. Pestaña `Hallazgos`

La estructura recomendada es:

| marca | mes | seccion | tipo | titulo | descripcion | prioridad |
|---|---|---|---|---|---|---|
| botanera | 2026-07 | overview | clave | La inversión concentrada en Mundial amplificó el alcance... | Meta superó la proyección;\nTikTok aportó crecimiento incremental;\nLa mayor eficiencia estuvo en... | 1 |
| botanera | 2026-07 | facebook | clave | Facebook lideró la generación de interacciones | | 1 |
| botanera | 2026-07 | facebook | observacion | | El contenido de Mundial concentró la mayor parte de la interacción. | 2 |
| botanera | 2026-07 | facebook | observacion | | El formato de video corto tuvo mejor respuesta. | 3 |
| botanera | 2026-07 | facebook | aprendizaje | | Mantener inversión en formatos que generan interacción durante ventanas de alta demanda. | 4 |
| botanera | 2026-07 | facebook-paid | clave | Paid Media elevó la escala sin perder eficiencia | | 1 |
| botanera | 2026-07 | facebook-paid | observacion | | La inversión se concentró en campañas de interacción. | 2 |
| botanera | 2026-07 | facebook-paid | aprendizaje | | Validar piezas y aprobaciones antes de activar pauta para aprovechar toda la ventana de inversión. | 3 |
| botanera | 2026-07 | instagram | clave | Instagram fue el principal motor de exposición | | 1 |
| botanera | 2026-07 | tiktok | clave | TikTok destacó por crecimiento de audiencia | | 1 |
| botanera | 2026-07 | google-ads | clave | Video concentró el mayor volumen de visualizaciones | | 1 |

### Valores válidos para `seccion`

- `overview`
- `facebook`
- `facebook-paid`
- `instagram`
- `instagram-paid`
- `tiktok`
- `tiktok-paid`
- `google-ads`
- `hallazgos` (legacy/general)

### Valores válidos para `tipo`

- `clave` → se muestra como **Hallazgo clave**.
- `observacion` → aparece dentro de **Observaciones**.
- `aprendizaje` → aparece dentro de **Aprendizajes**.

También se mantienen compatibles los tipos antiguos (`logro`, `alerta`, `oportunidad`, `insight`, `recomendacion`, `riesgo`).

## 2. Cómo escribir varios bullets

No necesitas una fila por bullet si pertenecen al mismo hallazgo. Puedes poner varios bullets en `descripcion`, separados por saltos de línea:

```text
El alcance creció 42% vs. mes anterior.
Instagram concentró la mayor exposición.
La inversión se concentró durante la ventana de Mundial.
```

El dashboard convierte automáticamente cada línea en una viñeta editorial.

También puedes escribirlos con `-`, `•` o numeración; el dashboard limpia esos símbolos para que la viñeta visual sea consistente.

## 3. Pestaña `Observaciones`

La pestaña existente sigue funcionando. Cualquier fila de `Observaciones` se convierte automáticamente en una **observación editorial** dentro del módulo correspondiente.

Esto permite que no tengas que migrar inmediatamente lo que ya tienes.

Para que una observación aparezca en una plataforma, utiliza la misma `seccion`:

- `overview`
- `facebook`
- `instagram`
- `tiktok`
- `google-ads`
- `facebook-paid`
- `instagram-paid`
- `tiktok-paid`

Si estás empezando a cargar nuevos análisis, recomiendo usar principalmente `Hallazgos`, porque ahí puedes distinguir explícitamente `clave`, `observacion` y `aprendizaje`.

## 4. Cómo aparece cada módulo

### Overview

Se muestra inmediatamente después de los KPI:

1. Etiqueta pequeña `Hallazgo clave`.
2. Titular en negritas.
3. Bullets debajo.
4. El módulo limita visualmente la altura de la lista para no romper el layout.

### Facebook / Instagram / TikTok

Aparece una tarjeta editorial antes de los KPI:

- Hallazgo clave visible.
- Botón `Hallazgos`.
- Al hacer clic se abre un modal con scroll.
- Dentro del modal se separan `Observaciones` y `Aprendizajes`.
- No hay límite de bullets dentro del modal.

### Paid Media

Al abrir el acordeón de `Paid Media`, aparece el mismo módulo editorial al final del contenido de Paid Media.

Para distinguirlo de la parte orgánica utiliza `facebook-paid`, `instagram-paid` o `tiktok-paid` en `seccion`.

### Google Ads

Se muestra el mismo patrón editorial al inicio de la sección:

- Hallazgo clave visible.
- Botón para abrir el detalle.
- Modal con Observaciones y Aprendizajes.

### Sección final `Hallazgos & Conclusiones`

Ahora utiliza todos los registros de `Hallazgos` del mes y los organiza editorialmente en:

- Hallazgos clave
- Observaciones
- Aprendizajes
- Otros hallazgos (para registros antiguos con tipos distintos)

## 5. Regla importante para cada mes

El valor de `mes` debe coincidir con el mes de los datos, preferentemente en formato `YYYY-MM`, por ejemplo:

`2026-07`

El valor de `marca` debe coincidir con el ID utilizado por el dashboard:

- `botanera`
- `chamoy`
- `pacific`

## 6. Ejemplo mínimo recomendado

Para un reporte mensual completo, bastaría con cargar:

- 1 fila `overview / clave`
- 2–5 filas `overview / observacion` o `aprendizaje`
- 1 fila `facebook / clave`
- 2–5 filas `facebook / observacion` o `aprendizaje`
- 1 fila `facebook-paid / clave`
- 2–5 filas `facebook-paid / observacion` o `aprendizaje`
- Lo mismo para Instagram y TikTok.
- 1 fila `google-ads / clave`
- 2–5 filas `google-ads / observacion` o `aprendizaje`

No existe un límite técnico de bullets en el modal.
