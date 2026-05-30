# Documento técnico breve - ClinicAgenda

## Nombre del proyecto

ClinicAgenda

## Descripción

ClinicAgenda es un sistema web para administrar citas de una clínica universitaria. Permite registrar pacientes, médicos, especialidades y citas médicas, además de consultar métricas generales desde un dashboard privado.

## Modalidad

Opción B: JavaScript directo, HTML, CSS, Bootstrap, Firebase SDK, Firebase Authentication y Firestore Database.

## Objetivo

Administrar la agenda médica de una clínica universitaria mediante un sistema web que permita registrar pacientes, médicos y especialidades, así como agendar, cancelar, finalizar y consultar citas médicas.

## Módulos principales

### Autenticación

Permite registrar usuarios, iniciar sesión, cerrar sesión y proteger vistas privadas.

### Dashboard

Muestra métricas generales:

- Citas del día.
- Citas programadas.
- Citas canceladas.
- Total de pacientes.
- Próximas citas.

### Pacientes

Permite crear, listar, ver detalle, editar, buscar, filtrar y desactivar pacientes.

### Especialidades

Permite administrar el catálogo de especialidades médicas.

### Médicos

Permite registrar médicos y relacionarlos con una especialidad médica.

### Citas

Permite crear citas médicas relacionando paciente, médico y especialidad. También permite cancelar, finalizar, marcar como no asistió y evitar citas duplicadas con el mismo médico, fecha y hora.

## Colecciones Firestore

- users
- patients
- doctors
- specialties
- appointments

## Campos globales

Cada registro operativo maneja:

- active
- createdAt
- updatedAt
- createdBy

## Estados de cita

- scheduled: cita programada.
- completed: cita finalizada.
- cancelled: cita cancelada.
- no_show: paciente no asistió.

## Validaciones principales

- Campos obligatorios.
- Correos válidos.
- Longitudes mínimas.
- Fechas válidas.
- No permitir citas en fecha u hora pasada.
- No permitir pacientes con correo duplicado.
- No permitir médicos con correo o cédula duplicada.
- No permitir especialidades duplicadas.
- No permitir citas duplicadas con el mismo médico, fecha y hora.

## Seguridad

El sistema utiliza Firebase Authentication para controlar el acceso y reglas de Firestore para proteger lectura y escritura de documentos.

## Flujo general para agendar una cita

1. El usuario inicia sesión.
2. Registra especialidades.
3. Registra médicos asociados a especialidades.
4. Registra pacientes.
5. Entra al módulo de citas.
6. Selecciona paciente, especialidad y médico.
7. Selecciona fecha y hora.
8. El sistema valida disponibilidad.
9. Se registra la cita con estado programada.