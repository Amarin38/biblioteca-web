# biblioteca-web

Aplicación web para la gestión de una biblioteca: administración de los libros digitales, de los ejemplares físicos, de los usuarios y del ciclo de préstamos.
 
## Propósito
 
El objetivo es reemplazar el registro manual de préstamos por un sistema centralizado que permita saber, en cualquier momento, qué ejemplares están disponibles, quién tiene cada uno y qué préstamos están vencidos.
 
El modelo distingue entre el **libro** como obra (identificado por su isbn) y el **ejemplar** como copia física (identificada por su código de barras), de modo que la biblioteca puede tener varias copias de un mismo título y seguir el estado de cada una por separado.

## Endpoints

### Libros
- GET /libros?titulo=&autor=&genero=&page=&size= -> Devuelve un listado de libros, si no se le incluyen filtros devuelve todos los libros.
- GET /libros/{isbn} -> Devuelve el detalle del libro concreto.
- GET /libros/{isbn}/ejemplares -> Ejemplares del libro específico.
- POST /libros -> Crea un libro
- POST /libros/{isbn}/ejemplares ->  Crea un ejemplar nuevo de un libro específico.
- PUT /libros/{isbn} -> Modifica un libro específico.
- DELETE /libros/{isbn} -> Da de baja un libro específico y lanza un error si tiene ejemplares asociados.


### Ejemplares
- GET /ejemplares?isbn=&estado=disponible&page=&size= -> Con un query consulta los ejemplares disponibles.
- GET /ejemplares/{codigoBarras} -> Devuelve el detalle del ejemplar concreto.
- PATCH /ejemplares/{codigoBarras} -> Cambia el estado manualmente.
- DELETE /ejemplares/{codigoBarras} -> Da de baja el ejemplar y lanza un error si tiene un préstamo activo.


### Usuarios
- GET /usuarios?nombre=&email=&tipo=&page=&size= -> Devuelve un listado de usuarios.
- GET /usuarios/{idUsuario} -> Devuelve el detalle del usuario en concreto.
- POST /usuarios -> Da de alta un usuario.
- PUT /usuarios/{idUsuario} -> Modifica un usuario concreto.
- DELETE /usuarios/{idUsuario} -> Da de baja un usuario.


### Prestamos
- GET /prestamos?estado=&idUsuario=&page=&size= -> Devuelve un listado de prestamos.
- GET /prestamos/{idPrestamo} -> Devuelve el detalle de un préstamo
- GET /prestamos/{idPrestamo}/multa -> Consultar multa calculada dado el tiempo de atraso.
- POST /prestamos -> Crea un préstamo y se le tiene que pasar un body con el idUsuario y el codigoBarras.
- POST /prestamos/{idPrestamo}/devolucion -> Finaliza el préstamo.
- POST /prestamos/{idPrestamo}/multa/pagos -> Registra el pago de la multa.
- POST /prestamos/{idPrestamo}/renovaciones -> Renovar o extender la fechaDevolucion.


## Status Codes

### Libros
| Verbo HTTP | Endpoint | Éxito | Errores |
|:---:|:---|:---:|:---|
| `GET` | `/libros?titulo=&autor=&genero=&page=&size=` | `200` OK | `400` query inválida |
| `GET` | `/libros/{isbn}` | `200` OK | `404` libro inexistente |
| `GET` | `/libros/{isbn}/ejemplares` | `200` OK | `404` libro inexistente |
| `POST` | `/libros` | `201` libro creado | `400` body inválido<br>`409` isbn ya registrado |
| `POST` | `/libros/{isbn}/ejemplares` | `201` libro creado | `400` body inválido<br>`404` libro inexistente<br>`409` código de barras duplicado |
| `PUT` | `/libros/{isbn}` | `200` libro actualizado | `400` body inválido<br>`404` libro inexistente |
| `DELETE` | `/libros/{isbn}` | `204` libro eliminado | `404` libro inexistente<br>`409` tiene ejemplares asociados |


### Ejemplares
| Método | Endpoint | Éxito | Errores |
|:---:|:---|:---:|:---|
| `GET` | `/ejemplares?isbn=&estado=&page=&size=` | `200` OK | `400` query inválida |
| `GET` | `/ejemplares/{codigoBarras}` | `200` OK | `404` ejemplar inexistente |
| `PATCH` | `/ejemplares/{codigoBarras}` | `200` ejemplar actualizado | `400` body inválido<br>`404` ejemplar inexistente |
| `DELETE` | `/ejemplares/{codigoBarras}` | `204` ejemplar eliminado | `404` ejemplar inexistente<br>`409` tiene préstamo activo |


### Usuarios
| Método | Endpoint | Éxito | Errores |
|:---:|:---|:---:|:---|
| `GET` | `/usuarios?nombre=&email=&tipo=&page=&size=` | `200` OK | `400` query inválida |
| `GET` | `/usuarios/{idUsuario}` | `200` OK | `404` usuario inexistente |
| `POST` | `/usuarios` | `201` usuario creado | `400` body inválido |
| `PUT` | `/usuarios/{idUsuario}` | `200` usuario actualizado | `400` body inválido<br>`404` usuario |
| `DELETE` | `/usuarios/{idUsuario}` | `204` usuario eliminado | `404` usuario inexistente<br>`409` tiene préstamos activos |


### Préstamos
| Método | Endpoint | Éxito | Errores |
|:---:|:---|:---:|:---|
| `GET` | `/prestamos?estado=&idUsuario=&page=&size=` | `200` OK | `400` query inválida |
| `GET` | `/prestamos/{idPrestamo}` | `200` OK | `404` préstamo inexistente |
| `GET` | `/prestamos/{idPrestamo}/multa` | `200` OK | `404` préstamo inexistente |
| `POST` | `/prestamos` | `201` préstamo creado | `400` body inválido<br>`404` usuario o ejemplar inexistente<br>`409` ejemplar no disponible<br>`422` usuario con límite alcanzado o multa impaga |
| `POST` | `/prestamos/{idPrestamo}/devolucion` | `200` préstamo finalizado | `404` préstamo inexistente<br>`409` préstamo ya finalizado |
| `POST` | `/prestamos/{idPrestamo}/multa/pagos` | `201` multa pagada | `400` body inválido<br>`404` préstamo inexistente<br>`409` sin multa pendiente o ya pagada |
| `POST` | `/prestamos/{idPrestamo}/renovaciones` | `201` préstamo renovado | `404` préstamo inexistente<br>`409` préstamo finalizado<br>`422` máximo de renovaciones alcanzado o préstamo vencido |