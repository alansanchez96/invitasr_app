# Codex Routing para InvitaSR

Este directorio quedo organizado para que un prompt normal alcance para enrutar bien el trabajo dentro del repo, sin tener que decir manualmente que skill, agente u orquestador usar.

La automatizacion no depende de adivinar. Depende de una ruta explicita de contexto y decision.

## Fuente de verdad

### Contexto de producto y negocio

- `AGENTS.md`
- `AI_CONTEXT.md`
- `CLAUDE.md`

### Router operativo

- `.codex/ROUTING.md`
- `.agents/skills/invitasr-task-routing/SKILL.md`

### Capa de ejecucion

- `.codex/orchestrators/*.toml`
- `.codex/agents/*.toml`
- `.agents/skills/*/SKILL.md`

### Configuracion base

- `.codex/config.toml`

## Que cambia a partir de ahora

Antes habia skills, agentes y orquestadores, pero la decision estaba repartida entre varios archivos.

Ahora la logica queda asi:

1. cualquier pedido no trivial del repo debe pasar primero por la clasificacion de superficie
2. esa clasificacion asigna una sola ownership principal
3. luego se agregan solo las skills de apoyo necesarias
4. el riesgo de contrato, auth, planes o trabajo multi-superficie queda explicitado como riesgo secundario
5. si el runtime permite subagentes reales, la delegacion se hace solo por slices independientes; si no, se usa la misma logica de forma conceptual en un solo flujo

Eso significa que el prompt ya no tiene que decir usa tal skill. Tiene que describir bien el problema real.

## Orden de lectura automatico recomendado

Para una tarea no trivial en InvitaSR, el orden correcto de contexto es:

1. `AGENTS.md`
2. `.codex/ROUTING.md`
3. `AI_CONTEXT.md`
4. `CLAUDE.md`
5. `InvitaSR.postman_collection.json` si la tarea toca API, auth, filtros, pagos o checkout

Ese orden ya queda reforzado en:

- `.codex/config.toml`
- `.agents/skills/invitasr-task-routing/SKILL.md`
- `.codex/orchestrators/*.toml`

## Matriz de decision

### 1. Superficie principal

Usa esta clasificacion primero:

- `public-growth`: home, pricing, hero, CTA, FAQ, prueba social, framing de valor
- `public-onboarding`: seleccion de plan/template, registro, persistencia, checkout, continuidad post-login
- `auth-access`: login, logout, `me`, cookie vs token, guards, active plan, tenant status
- `backoffice-master`: modulos master, listados, filtros, tablas, modales, acciones operativas
- `shared-frontend`: componentes compartidos, layouts, stores, router, servicios, estilos
- `ux-copy-cross`: jerarquia visual, estados, claridad transversal, microcopy

Si el pedido toca varias superficies, hay que elegir una principal y declarar las demas como riesgos secundarios. No conviene dejar varios owners equivalentes.

### 2. Orquestador

- `public-growth-orchestrator` cuando la prioridad es conversion publica o onboarding comercial
- `backoffice-delivery-orchestrator` cuando domina el backoffice master
- `frontend-product-orchestrator` cuando es implementacion general, auth, contrato sensible o trabajo multi-superficie

Regla practica: si hay duda, usar `frontend-product-orchestrator`.

### 3. Agente principal

- `conversion-strategist` para copy, positioning, CTAs, pricing y percepcion de valor
- `frontend-builder` para implementacion Vue, rutas, stores, servicios, componentes y layouts
- `integration-guardian` para auth, sesion, payloads, estados, guards y compatibilidad frontend/backend
- `backoffice-operator` para modulos operativos master

Elegi uno como owner. Los demas, si aparecen, son apoyo o revision.

### 4. Skills de apoyo

#### Public growth

- `landing-conversion-audit`
- `copy-surface-review` si el problema es de mensaje
- `ux-ui-product-audit` si el problema es de claridad o jerarquia
- `vue-frontend-implementation` solo si hay cambios de codigo

#### Public onboarding

- `onboarding-frontend-flow`
- `vue-frontend-implementation`
- `frontend-api-contract-review` si hay payloads, redirects o checkout sensibles

#### Auth/access

- `auth-session-access-review`
- `frontend-api-contract-review`
- `vue-frontend-implementation` si hay implementacion real

#### Backoffice master

- `backoffice-master-operations`
- `vue-frontend-implementation`
- `frontend-api-contract-review` cuando filtros, paginacion, sorting o estados dependen del backend

#### UX/copy transversal

- `ux-ui-product-audit`
- `copy-surface-review`
- `vue-frontend-implementation` si ademas se implementa

Regla: una skill principal y hasta dos de apoyo suele ser suficiente.

## Politica de subagentes

Hay dos modos validos.

### A. Delegacion real

Se usa solo cuando:

- la sesion o la herramienta soporta subagentes
- el usuario pidio delegacion o el runtime la permite
- el trabajo se puede separar por ownership sin pisarse archivos

Ejemplos razonables:

- un subagente revisa `src/services/*` por riesgo de contrato
- otro implementa UX publica en `src/pages/public/*`
- otro audita `src/router/*` o `src/stores/session.ts` si hay auth o guards

### B. Delegacion conceptual

Si no conviene o no se puede delegar, se mantiene exactamente la misma logica en un solo flujo:

- owner principal
- skill o riesgo secundario
- chequeo explicito de impacto backend

Este segundo modo tambien es valido y probablemente sera el mas frecuente.

## Cuando planificar primero

Antes de editar, conviene plan si la tarea:

- afecta multiples modulos
- toca monetizacion, planes o permisos
- cambia contratos frontend/backend
- mezcla UX, copy e implementacion
- no esta lo bastante clara desde el prompt

En esos casos, el prompt deberia producir primero clasificacion, plan corto y luego ejecucion.

## Como escribir prompts para que el ruteo salga bien

No hace falta pedir una skill o un agente por nombre. Hace falta describir:

- superficie afectada
- problema real
- resultado esperado
- restricciones
- validacion

### Plantilla minima

```text
Quiero trabajar sobre [pantalla/modulo/flujo].
Hoy el problema es [problema].
Esto deberia mejorar [conversion / claridad / mantenibilidad / operacion / onboarding].
Tene en cuenta [planes / auth / contrato API / mobile / copy / backend].
Quiero que lo dejes implementado y validado.
```

### Ejemplos de ruteo esperado

```text
Quiero mejorar la home para que explique mejor el valor del producto y empuje mas al onboarding sin perder el tono premium.
```

Ruta esperada:
- superficie: `public-growth`
- owner: `conversion-strategist`
- skills: `landing-conversion-audit`, `copy-surface-review`, `ux-ui-product-audit`

```text
Necesito hacer mas robusto el paso entre seleccion de plan, registro y checkout para que no se pierda el draft.
```

Ruta esperada:
- superficie: `public-onboarding`
- owner: `frontend-builder`
- skills: `onboarding-frontend-flow`, `vue-frontend-implementation`, `frontend-api-contract-review`

```text
Revisa el modo cookie porque hay rebotes raros entre login, me y rutas protegidas.
```

Ruta esperada:
- superficie: `auth-access`
- owner: `integration-guardian`
- skills: `auth-session-access-review`, `frontend-api-contract-review`

```text
Quiero ordenar mejor el modulo de onboardings del backoffice, con filtros mas confiables y acciones mas claras.
```

Ruta esperada:
- superficie: `backoffice-master`
- owner: `backoffice-operator`
- skills: `backoffice-master-operations`, `vue-frontend-implementation`, `frontend-api-contract-review`

## Como extender esto sin romperlo

Si mas adelante agregas nuevas superficies o nuevos agentes:

1. actualiza primero `.codex/ROUTING.md`
2. luego ajusta `.agents/skills/invitasr-task-routing/SKILL.md`
3. despues sincroniza `.codex/orchestrators/*.toml`
4. recien ahi agrega o edita skills o agentes especificos

Si la logica cambia y no mantienes sincronizados esos tres niveles, el ruteo vuelve a dispersarse.

## Resultado buscado

El objetivo final de esta capa no es tener muchos archivos de IA.

El objetivo es que, con un prompt bien planteado, Codex pueda:

- entender el contexto de negocio de InvitaSR
- elegir el ownership tecnico correcto
- activar solo las skills necesarias
- decidir si necesita orquestacion multi-superficie
- señalar impacto con backend cuando corresponda
- desarrollar features de forma incremental sin reabrir cada vez la discusion sobre como enrutar el trabajo
