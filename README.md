# ClinicAgenda

Sistema web de citas para clínica universitaria desarrollado con JavaScript directo, HTML, CSS, Bootstrap y Firebase.

## Modalidad utilizada

Opción B:

- HTML, CSS y JavaScript puro.
- Bootstrap.
- Firebase SDK.
- Firebase Authentication.
- Firestore Database.
- Sin React, Vue, Angular ni frameworks similares.

## Módulos del proyecto

- Autenticación.
- Dashboard privado.
- Pacientes.
- Médicos.
- Especialidades.
- Citas.

## Estructura

```txt
ClinicAgenda/
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── patients.html
│   ├── doctors.html
│   ├── specialties.html
│   ├── appointments.html
│   └── assets/
│       ├── css/
│       │   └── styles.css
│       └── js/
│           ├── firebase.js
│           ├── auth.js
│           ├── firestore.js
│           ├── validators.js
│           ├── ui.js
│           ├── main.js
│           └── dashboard.js
├── firestore.rules
├── README.md
└── .gitignore
```

## Configuración inicial

1. Crea un proyecto en Firebase.
2. Activa Authentication con proveedor Email/Password.
3. Crea una base de datos Firestore.
4. Copia la configuración web de Firebase.
5. Pega tus credenciales en:

```js
public/assets/js/firebase.js
```

Busca este bloque:

```js
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
```

6. Publica o copia las reglas de `firestore.rules` en Firebase Console.
7. Abre `public/index.html` con Live Server.

## Usuario administrador inicial

El sistema registra usuarios normales desde `register.html`.

Para crear el administrador inicial:

1. Registra el primer usuario.
2. Ve a Firestore > colección `users`.
3. Busca el documento cuyo ID coincide con el UID del usuario.
4. Cambia el campo `role` de `user` a `admin`.

## Ramas GitFlow sugeridas

```bash
git init
git add .
git commit -m "feat: estructura inicial de ClinicAgenda"
git branch develop
git checkout develop
git checkout -b feature/auth
```

Ramas mínimas:

- `main`
- `develop`
- `feature/auth`
- `feature/crud-principal`
- `feature/dashboard`
- `feature/ui`

## Fases propuestas

### Fase 1 - Base del proyecto y autenticación

- Crear estructura del proyecto.
- Configurar Firebase SDK.
- Login.
- Registro.
- Logout.
- Protección de vistas privadas.
- Dashboard inicial.

### Fase 2 - CRUD de pacientes y especialidades

- Crear, listar, ver detalle, editar, eliminar/desactivar.
- Buscar y filtrar registros.
- Validaciones de formularios.

### Fase 3 - CRUD de médicos

- Relacionar médicos con especialidades.
- Validar cédula profesional y correo único.
- Activar/desactivar médicos.

### Fase 4 - CRUD de citas

- Crear citas.
- Evitar citas duplicadas con mismo médico, fecha y hora.
- Cancelar y finalizar citas.
- Consultar citas por día.
- Filtrar por médico.

### Fase 5 - Dashboard, UI/UX y documentación

- Estadísticas del día.
- Citas programadas.
- Citas canceladas.
- Total de pacientes.
- Capturas, video demo, reglas Firestore y documento técnico.

## Colecciones Firestore

- `users`
- `patients`
- `doctors`
- `specialties`
- `appointments`

## Campos globales por registro

Cada registro operativo debe incluir:

- `id` generado por Firestore.
- `createdAt`.
- `updatedAt`.
- `createdBy`.
- `active`.

## Estado actual

Fase 1 creada: estructura base, autenticación, protección de vistas y dashboard inicial.
