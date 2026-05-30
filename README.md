# ClinicAgenda

Sistema web de citas para clínica universitaria desarrollado con HTML, CSS, JavaScript directo, Bootstrap y Firebase.

## Modalidad Utilizada

Opción B:

- HTML, CSS y JavaScript puro.
- Bootstrap.
- Firebase SDK.
- Firebase Authentication.
- Firestore Database.
- Sin React, Vue, Angular ni frameworks similares.

## Alcance

ClinicAgenda administra pacientes, médicos, especialidades y citas médicas.

Los usuarios que inician sesión son usuarios del sistema. Por ahora todos se manejan como administradores (`admin`). Pacientes y médicos son registros administrados dentro del sistema, no usuarios que interactúan con la app.

## Sesión

La sesión usa:

- Firebase Authentication para login, registro, logout y token.
- `getIdToken()` para obtener el token vigente.
- `getIdTokenResult()` para leer información del token.
- Firestore `users/{uid}` para validar perfil, `role` y `active`.

Condiciones para entrar a módulos privados:

- Usuario autenticado.
- Documento existente en `users/{uid}`.
- `active` distinto de `false`.
- `role` igual a `admin`.

## Módulos del Proyecto

- Autenticación.
- Dashboard privado.
- Pacientes.
- Médicos.
- Especialidades.
- Citas.

## Estructura

```txt
clinicAgenda/
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
│           ├── dashboard.js
│           ├── patients.js
│           └── specialties.js
├── CHECKLIST_CLINICAGENDA.md
├── firestore.rules
├── README.md
└── .gitignore
```

## Configuración Inicial

1. Crear un proyecto en Firebase.
2. Activar Authentication con proveedor Email/Password.
3. Crear una base de datos Firestore.
4. Copiar la configuración web de Firebase.
5. Crear el archivo local `public/assets/js/firebase-config.js`.
6. Pegar la configuración con este formato:

```js
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

export { firebaseConfig };
```

El archivo `public/assets/js/firebase-config.js` está ignorado por Git.

7. Copiar el contenido de `firestore.rules` en Firebase Console > Firestore Database > Rules.
8. Abrir `public/index.html` con Live Server o un servidor estático local.

## Usuario Administrador Inicial

El registro desde `register.html` crea usuarios del sistema con:

```txt
role: admin
active: true
```

Si un usuario existe con otro rol por datos anteriores, actualizar su documento en `users/{uid}` y colocar:

```txt
role: admin
active: true
```

## Colecciones Firestore

- `users`
- `patients`
- `doctors`
- `specialties`
- `appointments`

## Campos Globales por Registro

Cada registro operativo debe incluir:

- `id` generado por Firestore.
- `createdAt`.
- `updatedAt`.
- `createdBy`.
- `active`.

## Estado Actual

- Estructura base creada.
- Autenticación con token y usuario administrador implementada.
- Protección de vistas privadas implementada.
- Dashboard inicial implementado.
- CRUD de pacientes implementado.
- CRUD de especialidades implementado.
- CRUD de médicos pendiente.
- CRUD de citas pendiente.
- Reglas Firestore base agregadas.
- Checklist de avance agregado.

## Documentación de Avance

El plan de trabajo, avance por bloques, criterios de la guía y ruta de commits están en:

[CHECKLIST_CLINICAGENDA.md](./CHECKLIST_CLINICAGENDA.md)
