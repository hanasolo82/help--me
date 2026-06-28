# HelpMe — Fase 4 / Bloque 3: paquete de beta cerrada

> Material operativo listo para usar por el owner durante la beta cerrada (5-15 testers).
> Todo en **Stripe modo test**. Última revisión: 2026-06-28.
> Hermanos: [`phase-4-beta-plan.md`](./phase-4-beta-plan.md) (estrategia, stop/go, métricas),
> [`phase-4-beta-smoke-checklist.md`](./phase-4-beta-smoke-checklist.md) (smoke técnico de 13 pasos).
> Contacto de soporte de la beta: **helpme.app.contact@gmail.com**.

---

## 1. Checklist ANTES de invitar

No mandar la primera invitación hasta que todo esté en verde. Marcar `[x]` con fecha.

### Bloqueante (sin esto NO se invita)
- [ ] **Smoke en navegador** registrado en verde: pasos 7,8,9-UI,10,13 del smoke (checkout, return,
      chat en vivo, transfer real, recovery). Evidencia anotada en el smoke checklist.
- [ ] **Identidad legal completada** en Terms/Privacy (`[NOMBRE Y APELLIDOS]`, `[NIF_O_NIE]`,
      `[DIRECCION POSTAL]`). Bloqueante porque entran usuarios externos.
- [ ] **Secrets de CI verificados** (los 5 del gate financiero; `SUPABASE_URL` sin path REST).
- [ ] **Cada helper invitado** tiene Stripe Connect test completo (charges + payouts enabled).
- [ ] `verify:financial-drift` = **0 critical** la mañana de la apertura.

### Recomendado (no bloqueante, pero hacerlo)
- [ ] App levantada y accesible para los testers (URL estable de la beta).
- [ ] Tarjeta de prueba comunicada: `4242 4242 4242 4242`, fecha futura, CVC cualquiera.
- [ ] Buzón `helpme.app.contact@gmail.com` revisado y atendible a diario.
- [ ] Lista nominal de invitados (5-15) con su rol previsto (requester / helper / ambos).
- [ ] Plantilla de feedback (§3) compartida o enlazada.
- [ ] Scratch `tmp/prod-bootstrap.js` borrado (limpieza de señal, opcional).

> Verificación rápida de sistema (owner, terminal):
> `pnpm run verify:financial-drift` · `pnpm run verify:rls-payment-gate` · `pnpm run verify:rls-ownership`.
> Si algo sale en rojo → no invitar, diagnosticar primero.

---

## 2. Guion para testers

Mandar a cada tester su parte. Tono directo, pasos numerados. **Es Stripe de prueba: no se cobra dinero real.**

### 2A. Guion Requester (el que pide ayuda)

> Gracias por probar HelpMe. Estás en una beta cerrada con pagos de **prueba** (no se cobra nada real).
> Si algo se atasca o te confunde, apúntalo (paso, qué esperabas, qué pasó) y mándalo a
> **helpme.app.contact@gmail.com**.

1. Entra y crea tu cuenta.
2. **Publica una tarea**: título, descripción y lo que ofreces. Debe quedar visible como abierta.
3. Espera a que un helper se ofrezca (o coordina con tu pareja de prueba).
4. **Revisa las ofertas** y **acepta** a un helper.
5. **Paga la tarea**: te lleva a la pantalla de Stripe. Usa la tarjeta `4242 4242 4242 4242`,
   cualquier fecha futura y cualquier CVC.
   - *Comprueba:* antes de pagar **no** deberías poder chatear con el helper.
6. Al volver del pago deberías ver la tarea activa y el **chat abierto**. Escribe un mensaje.
   - *Si se queda “comprobando” mucho rato:* deberías ver opciones para reintentar, volver a la tarea o
     contactar soporte. Apunta si eso pasa.
7. Cuando el helper termine, **cierra la tarea / libera el pago**.
8. **Valora** al helper. Intenta valorar otra vez: no debería dejarte.

### 2B. Guion Helper (el que ayuda)

> Gracias por probar HelpMe como helper. Pagos de **prueba**, nada real. Reporta cualquier rareza a
> **helpme.app.contact@gmail.com**.

1. Entra, crea tu cuenta y **completa el alta de cobros (Stripe Connect) en modo prueba** hasta que
   quede habilitado. Sin esto no podrás cobrar al cerrar la tarea.
2. Busca una tarea abierta y pulsa **ofrecerte**.
3. Prueba a **retirar** tu candidatura y a **volver a ofrecerte**: ambas cosas deben funcionar.
4. Cuando el requester te acepte, espera a que pague. **Antes del pago no deberías poder chatear.**
5. Tras el pago, **chatea** con el requester.
6. Cuando termines, deja que el requester cierre la tarea. Comprueba que el **cobro de prueba** te
   llega una sola vez (sin duplicados).

### 2C. Qué reportar siempre
Cualquiera de estos, manda correo enseguida: pagaste y no pasó nada · te cobraron dos veces · pudiste
chatear sin pagar · te quedaste en una pantalla sin salida · viste un texto roto/placeholder o un enlace
de contacto que no funciona.

---

## 3. Plantilla de feedback

Pásala a cada tester (correo, formulario simple o copia/pega). Mantenerla corta para que la rellenen.

```
HelpMe — feedback beta
----------------------
Tester:               (nombre / alias)
Rol:                  requester / helper / ambos
Fecha:                AAAA-MM-DD
Dispositivo + navegador:

1. ¿Completaste el flujo de principio a fin?   sí / no / a medias
   Si no: ¿en qué paso te quedaste?

2. Problemas encontrados (uno por línea):
   - Paso:            qué esperabas / qué pasó / ¿pudiste seguir?

3. ¿Algo con el PAGO? (cobro raro, doble cobro, pantalla colgada)   sí / no
   Detalle:

4. ¿Algo confuso en la EXPERIENCIA? (no sabías qué hacer)
   -

5. Del 1 al 5: ¿lo entendiste sin ayuda?        ___
   Del 1 al 5: ¿lo recomendarías?               ___

6. Comentario libre:
```

> Clasificación al recibirlo (la hace el owner): **bloqueante** (toca criterio de stop §5) /
> **beta-aceptable** / **later**. Los bloqueantes van al worklog y disparan el protocolo de pausa.

---

## 4. Plan de seguimiento diario

Rutina del owner mientras la beta esté abierta. ~10 minutos al día.

### Cada mañana
1. `pnpm run verify:financial-drift` → debe ser **0 critical** (≤6 warnings conocidos). Si critical → **pausar** (§5).
2. Revisar buzón `helpme.app.contact@gmail.com`. Clasificar cada report (bloqueante / beta-aceptable / later).
3. Panel **Stripe test**: ojear pagos del día. Buscar dobles cobros, transfers duplicados, pagos colgados.

### Después de cada ciclo de pago de un tester (las primeras veces)
4. Confirmar en Stripe + estado de la tarea: pago → tarea activa → cierre → transfer una sola vez.

### Registro diario (una línea en el worklog)
```
AAAA-MM-DD · testers activos: N · tareas cerradas: N · pagos: N · drift: 0 critical /
  W warnings · reports: N (bloqueantes: N) · acción: —
```

### Tabla de métricas (de `phase-4-beta-plan.md` §3)
Tiempo a checkout · éxito de retorno Stripe · tareas completadas · errores de pago · findings drift ·
reports de soporte. Señal sana = pagos sin incidencias, drift estable, reports bajos y no financieros.

---

## 5. Criterios para AMPLIAR, PAUSAR o CERRAR

### Ampliar (sumar más testers / acercarse a externa)
Tras **una semana** cumpliendo todo:
- 0 criterios de stop disparados.
- ≥3 ciclos R↔H completos de principio a fin sin incidencia de pago.
- `financial-drift` estable (0 critical) toda la semana.
- Reports de soporte bajos y ninguno bloqueante abierto.
- (Para pasar a **externa**: además, identidad legal completa y decisión explícita de pasar a Stripe live — fuera de este pack.)

### Pausar (cortar de inmediato, diagnosticar antes de seguir)
Cualquier criterio de **STOP** del plan beta (`phase-4-beta-plan.md` §4):
pago duplicado · dinero retenido sin estado claro · chat sin pago · usuario atrapado sin salida ·
error legal/contacto · drift `critical`.
**Protocolo:** dejar de invitar → no aceptar pagos nuevos → registrar incidente en worklog →
diagnosticar causa raíz → fix/mitigación → verificación verde de la capa afectada → reanudar.

### Cerrar la beta cerrada (darla por terminada)
- **Cierre exitoso:** se cumplieron los criterios de ampliar y se decide avanzar a la siguiente fase
  (externa/GA), o el aprendizaje buscado ya está. Registrar resumen en worklog.
- **Cierre por bandera roja:** un bloqueante de stop no tiene fix razonable a corto plazo → cerrar,
  documentar y volver a desarrollo antes de reintentar.

---

## Apéndice — referencias rápidas
- Tarjeta test: `4242 4242 4242 4242`, fecha futura, CVC cualquiera.
- Soporte beta: `helpme.app.contact@gmail.com`.
- Verificaciones owner: `verify:financial-drift`, `verify:rls-payment-gate`, `verify:rls-ownership`,
  `verify:webhook-reliability`.
- Estrategia y stop/go completos: [`phase-4-beta-plan.md`](./phase-4-beta-plan.md).
- Smoke técnico de 13 pasos: [`phase-4-beta-smoke-checklist.md`](./phase-4-beta-smoke-checklist.md).
