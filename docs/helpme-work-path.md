# Ruta de Trabajo de HelpMe

Última actualización: 2026-06-03

## Objetivo

Trabajar en este orden para no perder el foco:

1. Verificar el bucle básico del producto: ver tareas, aceptar tareas y comunicar tareas.
2. Cerrar el ciclo con pagos en modo test.
3. Dejar el frontend más claro, atractivo y coherente.

## Fase 1: Núcleo del producto

### Qué debe funcionar

- Un solicitante ve ayudantes disponibles.
- Un ayudante ve tareas publicadas abiertas.
- Un solicitante puede contactar con un ayudante.
- Un ayudante puede aceptar una tarea abierta.
- Ambos pueden intercambiar mensajes en una conversación persistida.

### Qué hay que verificar

- El solicitante ve ayudantes en descubrimiento.
- El ayudante ve tareas abiertas publicadas por otra persona.
- El solicitante puede abrir el perfil o la vista previa del ayudante.
- El solicitante puede iniciar conversación con el ayudante.
- El ayudante puede aceptar una tarea abierta.
- La conversación persiste tras refrescar.
- Los mensajes persisten tras refrescar.
- El solicitante no ve sus propias tareas como oportunidades para ayudantes.
- El ayudante no ve sus propias tareas como oportunidades abiertas.

### Documento de apoyo

- [Estado final del producto](./helpme-final-status.md)
- [Validación manual de beta cerrada](./helpme-beta-manual-validation.md)

## Fase 2: Pagos en modo test

### Qué debe funcionar

- Una tarea puede pasar por el flujo de pago en modo de prueba.
- El ciclo puede completarse sin tocar la arquitectura financiera real.
- El equipo puede observar y validar el flujo con datos seguros.

### Qué hay que verificar

- Identificar el flujo exacto de prueba que se va a ejecutar.
- Confirmar qué pantallas o acciones inician el pago.
- Confirmar que el cambio de estado se ve en la UI.
- Confirmar que el estado del pago puede observarse con seguridad en modo de prueba.
- Confirmar que el ciclo se completa sin trucos manuales.

## Fase 3: Frontend

### Qué debe mejorar

- Más claridad visual.
- Mejor jerarquía y espaciado.
- Tarjetas, paneles y acciones más legibles.
- Mejor presentación en mapa, tareas, perfil y chat.

### Qué hay que verificar

- Revisar las páginas principales de requester y helper.
- Mejorar primero las pantallas más visibles.
- Mantener tokens, estilos y componentes existentes.
- No introducir librerías nuevas ni rediseños.

## Reglas de trabajo

- No perder el foco en el flujo principal del producto.
- No saltar al frontend antes de cerrar lo fundamental.
- No tocar pagos más allá del plan de prueba hasta que la fase 1 esté sólida.
- Mantener este archivo como índice de trabajo, no como duplicado de los checklists.
- Actualizarlo después de cada sesión de HelpMe.
