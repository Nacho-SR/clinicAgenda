# Checklist del Sistema ClinicAgenda

Documento para organizar el trabajo del proyecto sin pisarse y con los criterios de la guía general visibles.

Actualizado tomando en cuenta:

- Requerimientos globales para todos los proyectos.
- Proyecto 5 - ClinicAgenda.
- Alcance corregido: los usuarios del sistema son administradores; pacientes y médicos son datos gestionados, no usuarios que inician sesión por ahora.

## Estado Actual

- Modalidad: Opción B, JavaScript directo + Firebase.
- Frontend: HTML, CSS, JavaScript puro y Bootstrap.
- Autenticación: Firebase Authentication.
- Base de datos: Firestore.
- Sesión: token Firebase + perfil `users/{uid}`.
- Rol de usuario del sistema: `admin`.
- Registro público actual: crea usuarios administradores del sistema.
- Vistas privadas protegidas con `requireAuth`.
- CRUD de pacientes: implementado.
- CRUD de especialidades: implementado.
- CRUD de médicos: pendiente.
- CRUD de citas: pendiente.
- Reglas Firestore base: agregadas en `firestore.rules`.

## Panorama General

ClinicAgenda administra:

- Pacientes.
- Médicos.
- Especialidades.
- Citas médicas.
- Métricas en dashboard.

Colecciones sugeridas:

- `users`
- `patients`
- `doctors`
- `specialties`
- `appointments`

Reglas transversales:

- Cada registro operativo debe manejar `id`, `createdAt`, `updatedAt`, `createdBy` y `active`.
- No se guardan contraseñas manualmente en Firestore.
- La autenticación se maneja con Firebase Authentication.
- La sesión de la app valida token, perfil, estado activo y rol `admin`.
- Las eliminaciones deben ser lógicas cuando aplique, usando `active: false`.

---

## Criterios de la Guía

### Tecnologías Permitidas

Ya tenemos:

- HTML.
- CSS.
- JavaScript puro.
- Bootstrap.
- Firebase SDK.
- Firebase Authentication.
- Firestore Database.

Falta o revisar:

- Confirmar que no se agreguen frameworks no permitidos.
- Confirmar configuración real de Firebase antes de la demo.

### Autenticación y Sesión

Ya tenemos:

- Registro de usuarios del sistema.
- Login.
- Logout.
- Protección de vistas privadas.
- Documento de usuario en `users/{uid}`.
- Campo `role: "admin"` para usuarios del sistema.
- Campo `active` para bloquear usuarios sin borrar credenciales.
- Lectura de token con `getIdToken()`.
- Lectura de datos del token con `getIdTokenResult()`.
- Sesión central exportada con `getCurrentSession()`.
- Helper `getCurrentToken()` para futuras llamadas que necesiten token.

Falta:

- Probar manualmente registro, login y logout con Firebase real.
- Crear usuario de prueba para la entrega.
- Confirmar si el registro público quedará abierto o si se limitará para la demo.

### CRUD Principal

Ya tenemos:

- CRUD de pacientes:
  - Crear.
  - Listar.
  - Ver detalle.
  - Editar.
  - Desactivar.
  - Buscar.
  - Filtrar.
- CRUD de especialidades:
  - Crear.
  - Listar.
  - Ver detalle.
  - Editar.
  - Desactivar.
  - Buscar.
  - Filtrar.

Falta:

- CRUD completo de médicos.
- CRUD completo de citas.
- Probar pacientes y especialidades contra Firestore real.

### Firebase / Firestore

Ya tenemos:

- Helper común `createRecord`.
- Helper común `updateRecord`.
- Helper común `deactivateRecord`.
- Helper común `getRecords`.
- Helper para validar duplicados.
- Helper preparado para validar disponibilidad de citas.
- Archivo `firestore.rules` con acceso solo para administradores activos.

Falta:

- Publicar reglas en Firebase Console.
- Revisar índices si Firestore los solicita.
- Cargar datos de prueba.

### Interfaz

Ya tenemos:

- Login.
- Registro.
- Dashboard.
- Navbar.
- Formularios.
- Tablas.
- Modales de detalle.
- Alertas de éxito/error.
- Confirmación antes de desactivar.
- Estados de carga.
- Estados vacíos.
- Diseño base responsivo.

Falta:

- Interfaz completa de médicos.
- Interfaz completa de citas.
- Pulir dashboard con citas reales.
- Revisar responsividad al final.

### Validaciones

Ya tenemos:

- Campos obligatorios.
- Correo válido.
- Fechas válidas.
- Horas válidas.
- Longitudes mínimas.
- Validación de duplicados en pacientes por correo.
- Validación de duplicados en especialidades por nombre.

Falta:

- Validar médicos duplicados por correo.
- Validar médicos duplicados por cédula profesional.
- Validar citas duplicadas por médico, fecha y hora.
- Validar estados de cita.

### Entregables

Ya iniciado:

- Código fuente.
- README.
- Checklist de avance.
- Autenticación.
- Dashboard.
- Dos CRUDs completos.
- Reglas Firestore base.

Falta:

- Mínimo 3 CRUDs completos.
- CRUD de citas.
- Capturas de pantalla.
- Video demo de 3 a 5 minutos.
- Usuario de prueba.
- Datos de prueba.
- Documento técnico breve.
- Diagrama de flujo para agendar cita.
- Evidencia de GitFlow.

---

## Bloque 1: Sesión, Auth y Seguridad

### Ya Tenemos

- Login con Firebase Auth.
- Registro con Firebase Auth.
- Logout.
- Perfil en `users/{uid}`.
- Token disponible mediante Firebase Auth.
- Validación de usuario activo.
- Validación de rol `admin`.
- Reglas Firestore para administradores activos.

### Falta

- Probar flujo completo con credenciales reales.
- Documentar usuario de prueba.
- Publicar reglas en Firebase.

### Tareas Pequeñas

- Commit `feat: agregar sesion admin con token`
  - Cargar token y perfil al iniciar sesión.
  - Bloquear usuarios inactivos o sin rol admin.

- Commit `docs: agregar reglas firestore base`
  - Mantener `firestore.rules`.
  - Documentar publicación en Firebase Console.

- Commit `test: documentar prueba manual de sesion`
  - Probar registro.
  - Probar login.
  - Probar logout.
  - Probar acceso a vista privada sin sesión.

---

## Bloque 2: Pacientes y Especialidades

### Ya Tenemos

- CRUD de pacientes.
- CRUD de especialidades.
- Búsqueda.
- Filtros.
- Desactivación lógica.
- Validaciones.
- Modales de detalle.

### Falta

- Prueba manual con Firebase real.
- Revisión final de textos y acentos.
- Confirmar que los datos sirvan para el flujo de citas.

### Tareas Pequeñas

- Commit `feat: pulir crud de pacientes`
  - Probar alta, edición, detalle y desactivación.
  - Ajustar errores detectados.

- Commit `feat: pulir crud de especialidades`
  - Probar alta, edición, detalle y desactivación.
  - Confirmar que solo especialidades activas se usen después.

---

## Bloque 3: Médicos

### Ya Tenemos

- Vista protegida `doctors.html`.
- Entrada en navbar.
- Placeholder del módulo.

### Falta

- Formulario.
- Tabla.
- Modal de detalle.
- Script `doctors.js`.
- Relación con especialidad.
- Validación de correo único.
- Validación de cédula profesional única.
- Edición y desactivación.

### Tareas Pequeñas

- Commit `feat: crear crud de medicos`
  - Crear estructura visual y script.
  - Implementar crear, listar, ver detalle, editar y desactivar.

- Commit `feat: relacionar medicos con especialidades`
  - Cargar especialidades activas.
  - Mostrar nombre de especialidad en tabla y detalle.

- Commit `feat: validar duplicados de medicos`
  - Evitar correo duplicado.
  - Evitar cédula profesional duplicada.

---

## Bloque 4: Citas

### Ya Tenemos

- Vista protegida `appointments.html`.
- Entrada en navbar.
- Helper `existsAppointmentSlot`.
- Dashboard preparado para contar citas.

### Falta

- Formulario de cita.
- Listado de citas.
- Script `appointments.js`.
- Cargar pacientes activos.
- Cargar médicos activos.
- Cargar especialidades activas.
- Estado inicial `scheduled`.
- Cancelar citas.
- Finalizar citas.
- Evitar duplicados por médico, fecha y hora.
- Filtros por día y médico.

### Tareas Pequeñas

- Commit `feat: crear formulario de citas`
  - Seleccionar paciente, médico, especialidad, fecha, hora y motivo.
  - Guardar cita programada.

- Commit `feat: validar disponibilidad de citas`
  - Usar `existsAppointmentSlot`.
  - Evitar choques de horario.

- Commit `feat: gestionar estados de citas`
  - Cancelar.
  - Finalizar.
  - Preparar `no_show` si se decide usar.

- Commit `feat: agregar filtros de agenda`
  - Filtrar por día.
  - Filtrar por médico.
  - Filtrar por estado.

---

## Bloque 5: Dashboard y Entrega

### Ya Tenemos

- Métricas base:
  - Citas del día.
  - Citas programadas.
  - Citas canceladas.
  - Total de pacientes.

### Falta

- Validar métricas con citas reales.
- Agregar datos de prueba.
- Capturas.
- Video demo.
- Diagrama de flujo.
- Documento técnico breve.
- Evidencia de GitFlow.

### Tareas Pequeñas

- Commit `feat: mejorar dashboard final`
  - Validar conteos.
  - Pulir estados vacíos.

- Commit `docs: agregar diagrama de flujo de citas`
  - Documentar flujo para agendar cita.

- Commit `docs: documentar usuario y datos de prueba`
  - Agregar credenciales de demo.
  - Listar datos mínimos.

- Commit `docs: preparar entrega final`
  - Guía de video.
  - Evidencia de GitFlow.
  - Documento técnico breve.

---

## Prioridad Recomendada

1. Probar sesión admin con token.
2. Publicar reglas Firestore.
3. Probar pacientes.
4. Probar especialidades.
5. Implementar médicos.
6. Implementar citas.
7. Validar dashboard.
8. Preparar entregables finales.

## Ruta de Commits Propuesta

1. `feat: agregar sesion admin con token`
2. `docs: recrear checklist de clinicagenda`
3. `docs: agregar reglas firestore base`
4. `test: documentar prueba manual de sesion`
5. `feat: pulir crud de pacientes`
6. `feat: pulir crud de especialidades`
7. `feat: crear crud de medicos`
8. `feat: relacionar medicos con especialidades`
9. `feat: validar duplicados de medicos`
10. `feat: crear formulario de citas`
11. `feat: validar disponibilidad de citas`
12. `feat: gestionar estados de citas`
13. `feat: agregar filtros de agenda`
14. `feat: mejorar dashboard final`
15. `docs: agregar diagrama de flujo de citas`
16. `docs: documentar usuario y datos de prueba`
17. `docs: preparar entrega final`
