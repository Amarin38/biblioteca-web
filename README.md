# Biblioteca Web

Aplicación para gestionar una biblioteca: libros, ejemplares, usuarios, préstamos, multas, lectura de PDF y reportes.

- **Backend:** API REST con Express 5, TypeScript y SQLite.
- **Frontend:** React 19 con Vite, servido por nginx.
- **Todo corre en Docker**: no hace falta instalar Node ni nada más.

---

## 1. Cómo levantarla

Único requisito: tener **Docker** con **Docker Compose**.

```bash
docker compose up -d
```

Cuando termina, abrir en el navegador: **http://localhost:8083**

La base de datos ya viene incluida (`data/biblioteca.db`) con 40 libros, 2 ejemplares por libro y estas cuentas de prueba:

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@example.com | 12345678 |
| Usuario común | user@example.com | 12345678 |

Para detenerla: `docker compose down`.

---

## 2. Cómo usar la aplicación web

1. **Ingresar** (arriba a la derecha) con una de las cuentas de arriba, o crear una cuenta nueva.
2. **Inicio:** buscar un libro por título, abrirlo y registrar el préstamo.
3. **Préstamos:** ver los propios, devolver, renovar, leer el PDF del libro y pagar multas.
4. **Catálogo** y **Reportes:** solo aparecen para el administrador. Catálogo permite dar de alta, modificar y dar de baja libros y ejemplares. Reportes muestra totales y rankings.

---

## 3. Cómo usar la API (5 pasos)

La API está en **http://localhost:8083/api** y responde siempre en JSON. También hay una documentación interactiva (Swagger) en **http://localhost:8083/api/docs**: ahí se puede probar cada endpoint desde el navegador (botón **Authorize** para pegar el token).

**Paso 1. Iniciar sesión y guardar el token**

```bash
API=http://localhost:8083/api

curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"EMAIL","password":"CONTRASEÑA"}'
```

La respuesta trae el token y el id del usuario:

```json
{ "token": "eyJhbGciOi...", "usuario": { "idUsuario": 3, "nombre": "...", "email": "...", "tipo": "normal", "admin": false } }
```

Guardarlos en variables (reemplazar por los valores de la respuesta):

```bash
TOKEN=eyJhbGciOi...
ID=3
```

**Paso 2. Ver libros** (no necesita token)

```bash
curl -s "$API/libros?limit=5"
curl -s "$API/libros?titulo=quijote"
```

**Paso 3. Ver los ejemplares de un libro** y elegir uno con `"estado":"disponible"`

```bash
curl -s $API/libros/9789501000078/ejemplares
```

**Paso 4. Pedir un ejemplar prestado** (necesita token)

```bash
curl -s -X POST $API/prestamos \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "[{\"idUsuario\":$ID,\"idEjemplar\":\"9789501000071\"}]"
```

**Paso 5. Devolverlo** (usar el `idPrestamo` de la respuesta anterior)

```bash
curl -s -X POST $API/prestamos/1/devolucion -H "Authorization: Bearer $TOKEN"
```

Otras operaciones frecuentes, con el mismo formato:

```bash
# Renovar un préstamo
curl -s -X POST $API/prestamos/1/renovaciones -H "Authorization: Bearer $TOKEN"

# Consultar la multa y pagar una parte
curl -s $API/prestamos/1/multa -H "Authorization: Bearer $TOKEN"
curl -s -X POST $API/prestamos/1/multa/pagos \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"monto":100}'

# Crear una cuenta nueva
curl -s -X POST $API/auth/registro -H 'Content-Type: application/json' \
  -d '{"nombre":"Ana","email":"ana@ejemplo.com","password":"clave-segura-1"}'
```

---

## 4. Referencia de endpoints

Todas las rutas parten de `/api` (por ejemplo, `GET /api/libros`).

**Quién puede usar cada endpoint (columna Acceso):**

| Acceso | Significa |
|---|---|
| Público | No necesita token. |
| Sesión | Necesita el token en el header `Authorization: Bearer <token>`. Cada usuario solo accede a lo suyo (sus préstamos y su cuenta). |
| Admin | Necesita el token de una cuenta de administrador. |

### Autenticación

| Verbo | Ruta | Acceso | Descripción | Códigos de estado |
|---|---|---|---|---|
| POST | `/auth/registro` | Público | Crea una cuenta común y devuelve el token. | 201, 400, 409 |
| POST | `/auth/login` | Público | Inicia sesión y devuelve el token. | 200, 400, 401, 429 |

### Libros

| Verbo | Ruta | Acceso | Descripción | Códigos de estado |
|---|---|---|---|---|
| GET | `/libros` | Público | Lista libros. Filtros: `titulo`, `autor`, `genero`, `limit`, `offset`. | 200, 400 |
| GET | `/libros/{isbn}` | Público | Detalle de un libro. | 200, 404 |
| POST | `/libros` | Admin | Crea uno o varios libros. | 201, 400, 401, 403, 409 |
| PATCH | `/libros/{isbn}` | Admin | Modifica el título y/o la sinopsis. | 200, 400, 401, 403, 404 |
| DELETE | `/libros/{isbn}` | Admin | Elimina un libro que no tenga ejemplares. | 204, 401, 403, 404, 409 |
| GET | `/libros/{isbn}/ejemplares` | Público | Lista los ejemplares de un libro. | 200, 404 |
| POST | `/libros/{isbn}/ejemplares` | Admin | Crea uno o varios ejemplares de un libro. | 201, 400, 401, 403, 404, 409 |
| GET | `/libros/{isbn}/pdf` | Sesión | Entrega el PDF del libro. Exige tener un préstamo vigente de ese libro. | 200, 401, 403, 404 |

### Ejemplares

| Verbo | Ruta | Acceso | Descripción | Códigos de estado |
|---|---|---|---|---|
| GET | `/ejemplares` | Público | Lista ejemplares. Filtros: `estado`, `limit`, `offset`. | 200, 400 |
| GET | `/ejemplares/{codigoBarras}` | Público | Detalle de un ejemplar. | 200, 404 |
| PATCH | `/ejemplares/{codigoBarras}` | Admin | Cambia el estado (`disponible`, `prestado` o `baja`). | 200, 400, 401, 403, 404 |
| DELETE | `/ejemplares/{codigoBarras}` | Admin | Elimina un ejemplar. | 204, 401, 403, 404, 409 |
| GET | `/ejemplares/{codigoBarras}/pdf` | Sesión | Entrega el PDF del libro del ejemplar. Exige tener un préstamo vigente de ese ejemplar. | 200, 401, 403, 404 |

### Usuarios

Cada usuario solo puede ver y modificar su propia cuenta.

| Verbo | Ruta | Acceso | Descripción | Códigos de estado |
|---|---|---|---|---|
| GET | `/usuarios/{idUsuario}` | Sesión | Datos de la propia cuenta. | 200, 401, 403 |
| PUT | `/usuarios/{idUsuario}` | Sesión | Reemplaza los datos de la propia cuenta (`nombre`, `email`, `tipo`). | 200, 400, 401, 403, 409 |
| DELETE | `/usuarios/{idUsuario}` | Sesión | Elimina la propia cuenta, si no tiene préstamos. | 204, 401, 403, 409 |
| GET | `/usuarios/{idUsuario}/prestamos` | Sesión | Lista los préstamos de la propia cuenta. | 200, 401, 403 |
| GET | `/usuarios` | Sesión | Reservado: en esta versión responde 403 (las cuentas se crean con `/auth/registro`). | 401, 403 |
| POST | `/usuarios` | Sesión | Reservado: en esta versión responde 403 (las cuentas se crean con `/auth/registro`). | 400, 401, 403 |

### Préstamos

Cada usuario solo ve y opera sobre sus propios préstamos.

| Verbo | Ruta | Acceso | Descripción | Códigos de estado |
|---|---|---|---|---|
| GET | `/prestamos` | Sesión | Lista los préstamos propios. Filtros: `estado`, `idEjemplar`, `limit`, `offset`. | 200, 400, 401 |
| POST | `/prestamos` | Sesión | Registra un préstamo a nombre propio. El ejemplar pasa a `prestado`. | 201, 400, 401, 403, 404, 409 |
| GET | `/prestamos/{idPrestamo}` | Sesión | Detalle de un préstamo. | 200, 401, 403, 404 |
| PATCH | `/prestamos/{idPrestamo}` | Sesión | Cambia el estado del préstamo. | 200, 400, 401, 403, 404 |
| DELETE | `/prestamos/{idPrestamo}` | Sesión | Elimina un préstamo que ya no está activo. | 204, 401, 403, 404, 409 |
| POST | `/prestamos/{idPrestamo}/devolucion` | Sesión | Registra la devolución: finaliza el préstamo y libera el ejemplar. | 200, 401, 403, 404, 409 |
| POST | `/prestamos/{idPrestamo}/renovaciones` | Sesión | Renueva el préstamo: extiende la fecha de vencimiento. | 201, 401, 403, 404, 409 |
| GET | `/prestamos/{idPrestamo}/multa` | Sesión | Calcula la multa: días de atraso, monto, pagado y saldo. | 200, 401, 403, 404 |
| GET | `/prestamos/{idPrestamo}/multa/pagos` | Sesión | Lista los pagos hechos de la multa. | 200, 401, 403, 404 |
| POST | `/prestamos/{idPrestamo}/multa/pagos` | Sesión | Registra un pago (total o parcial) de la multa. | 201, 400, 401, 403, 404, 409 |

### Reportes

| Verbo | Ruta | Acceso | Descripción | Códigos de estado |
|---|---|---|---|---|
| GET | `/reportes/resumen` | Admin | Totales, libros más prestados y préstamos por género y por mes. | 200, 401, 403 |

---

## 5. Códigos de estado

Todos los errores responden con el mismo formato:

```json
{ "error": "Mensaje que explica qué pasó" }
```

| Código | Significado | Cuándo ocurre |
|---|---|---|
| 200 | OK | Consulta o modificación correcta. |
| 201 | Creado | Se creó el recurso. Viene con el header `Location` apuntando a él. |
| 204 | Sin contenido | Se eliminó correctamente. No devuelve cuerpo. |
| 400 | Petición inválida | Faltan datos, tienen un formato incorrecto o sobran campos. |
| 401 | No autenticado | Falta el token, es inválido o venció. También: email o contraseña incorrectos. |
| 403 | Sin permiso | No es administrador, el recurso es de otro usuario o falta un préstamo vigente para leer el PDF. |
| 404 | No existe | El libro, ejemplar, préstamo o ruta no existe (o el libro no tiene PDF). |
| 409 | Conflicto | La operación choca con el estado actual. Ver la tabla siguiente. |
| 429 | Demasiados intentos | 8 logins fallidos seguidos para un mismo email: esperar unos minutos. |

**Cuándo da 409 cada endpoint:**

| Endpoint | Motivo |
|---|---|
| `POST /auth/registro` | Ya existe una cuenta con ese email. |
| `POST /libros` | Ya existe un libro con ese ISBN. |
| `DELETE /libros/{isbn}` | El libro todavía tiene ejemplares. |
| `POST /libros/{isbn}/ejemplares` | Ya existe un ejemplar con ese código de barras. |
| `DELETE /ejemplares/{codigoBarras}` | Tiene un préstamo activo, o tiene historial de préstamos y no está en estado `baja`. |
| `PUT /usuarios/{idUsuario}` | El email ya lo usa otra cuenta. |
| `DELETE /usuarios/{idUsuario}` | La cuenta tiene préstamos. |
| `POST /prestamos` | El ejemplar no está disponible. |
| `DELETE /prestamos/{idPrestamo}` | El préstamo sigue activo. |
| `POST /prestamos/{idPrestamo}/devolucion` | El préstamo ya estaba finalizado. |
| `POST /prestamos/{idPrestamo}/renovaciones` | No está activo, está vencido o llegó al máximo de renovaciones. |
| `POST /prestamos/{idPrestamo}/multa/pagos` | El préstamo no tiene multa pendiente. |

---

## 6. Formato de los datos

**Libro**

| Campo | Detalle |
|---|---|
| `isbn` | Texto de 13 dígitos. |
| `titulo`, `autor` | Texto. |
| `genero` | Uno de: ficción, no ficción, fantasía, ciencia ficción, misterio, thriller, romance, terror, aventura, novela histórica, biografía, autobiografía, ensayo, poesía, drama, autoayuda, infantil, juvenil, comedia, distopía, realismo mágico, cuento, historia, antropología, ciencia, divulgación científica, filosofía, psicología, sociología, economía, política. |
| `fechaLanzamiento` | Fecha `AAAA-MM-DD`, no futura. |
| `sinopsis` | Texto, opcional. |

**Ejemplar:** `codigoBarras` (texto de exactamente 13 caracteres), `isbn` del libro y `estado` (`disponible`, `prestado` o `baja`).

**Préstamo:** al crearlo se envía `idUsuario` e `idEjemplar`. La respuesta incluye `idPrestamo`, `fechaVencimiento`, `renovaciones` y `estado` (`activo`, `vencido` o `finalizado`).

**Multa:** $50 por cada día de atraso. Se puede pagar en partes enviando `{ "monto": 100 }`.

**Usuario:** `nombre`, `email` (único) y `tipo` (`socio`, `docente` o `normal`). Para registrarse: `nombre`, `email` y `password` (entre 8 y 128 caracteres). Una cuenta nueva siempre es de tipo `normal` y nunca administrador.

**Paginación:** los listados aceptan `limit` (1 o más) y `offset`.

---

## 7. Pruebas automáticas

Hay 66 pruebas de los endpoints (`backend/tests/api.test.mjs`), hechas con el framework de testing integrado de Node (`node:test`), sin dependencias. Cada corrida crea sus propios datos y los elimina al terminar.

Con la aplicación levantada, desde la raíz del repositorio:

```bash
ADMIN_EMAIL=correo-del-admin ADMIN_PASSWORD='contraseña' ./deploy.sh
```

`deploy.sh` levanta Docker y corre las pruebas. Si se omiten las dos variables, solo levanta Docker. Resultado esperado: `✓ 66 pruebas pasaron`.

También se pueden correr directamente: `cd backend && ADMIN_EMAIL=... ADMIN_PASSWORD='...' npm test`.

---

## 8. Configuración y scripts

**Variables de entorno del backend** (definidas en `docker-compose.yml`):

| Variable | Para qué sirve | Valor por defecto |
|---|---|---|
| `PORT` | Puerto del backend dentro de Docker. | `3000` |
| `DB_PATH` | Archivo de la base SQLite. | `/data/biblioteca.db` |
| `PDF_DIR` | Carpeta con los PDF de los libros (`<título>.pdf`). | `/pdfs` |
| `JWT_SECRET` | Clave para firmar los tokens (mínimo 16 caracteres). | valor de desarrollo del compose |
| `JWT_EXPIRA` | Duración de la sesión. | `12h` |
| `TZ` | Zona horaria (afecta las fechas de préstamos y multas). | `America/Argentina/Buenos_Aires` |

**Scripts de la raíz del repositorio:**

| Script | Qué hace |
|---|---|
| `deploy.sh` | Levanta Docker y corre las pruebas. |
| `usuarios.sh` | Gestiona cuentas: `crear "Nombre" email [clave] [tipo]`, `admin <email>`, `quitar-admin <email>`, `listar`. |
| `cargar-libros.sh` | Carga 40 libros con 2 ejemplares cada uno (necesita `EMAIL` y `CLAVE` de un administrador). |
| `generar-pdfs-ejemplo.py` | Genera un PDF de ejemplo por libro en `pdfs/`. |

**Scripts de `package.json`:**

| Carpeta | Scripts |
|---|---|
| `backend/` | `dev`, `start`, `test`, `typecheck`, `lint`, `build`, `db:check` |
| `frontend/` | `dev`, `build`, `lint`, `preview` |

