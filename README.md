# Mis Préstamos 💰

App web para gestionar préstamos personales. Mobile-first, instalable como PWA.

## Requisitos

- Una cuenta de Google (para Firebase)
- Opcional: una cuenta de GitHub (para hostear la app gratis)

## Instalación

### 1. Crear proyecto en Firebase

1. Andá a https://console.firebase.google.com
2. Creá un proyecto (nombre: `mis-prestamos`), **desactivá Google Analytics**
3. En el menú izquierdo:

### 2. Configurar Firestore

1. **Firestore Database** → Crear base de datos → **Modo prueba** → `us-central1` → Listo
2. Pestaña **Reglas** → pegá esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. **Publicar**

### 3. Configurar Authentication

1. **Authentication** → **Sign-in method** → **Correo electrónico/contraseña** → **Habilitar** → Guardar
2. Pestaña **Users** → **Add user** → Ingresá email y contraseña → Add user

### 4. Registrar app web

1. ⚙️ **Configuración del proyecto** → **Tus apps** → **Web** (`</>`)
2. Nombre: `mi-app` → **Registrar app**
3. Copiá el objeto `firebaseConfig` que aparece

### 5. Configurar Index.html

1. Abrí `Index.html`
2. Buscá la función `firebase.initializeApp({...})`
3. Reemplazá los valores con tu `firebaseConfig`

### 6. Subir a GitHub Pages (gratis)

1. Creá un repo en GitHub (ej: `mis-prestamos`)
2. Subí `Index.html` al repo
3. **Settings** → **Pages** → Branch: `main` → `/(root)` → **Save**
4. Esperá 1 minuto y abrí la URL que aparece

## Funcionalidades

- **Dashboard**: resumen del mes (prestado, recuperado, circulación, ganancias, últimos cobros)
- **Clientes**: alta, edición, eliminación, campos personalizados, alertas de vencimiento
- **Préstamos**: registro con tasa según plazo (7/15/30 días), descuento por cliente, pago
- **Reportes**: filtro por mes/año con detalle
- **Config**: tasas de interés, mensajes de WhatsApp, cambio de contraseña
- **WhatsApp**: tocando el teléfono del cliente se abre WhatsApp con mensaje personalizable
- **Modo oscuro**: toggle automático o manual

## Mensajes de WhatsApp

En Config podés personalizar el mensaje que se envía al tocar el teléfono.
Usá `{nombre}` y `{telefono}` como marcadores.

Ejemplo:
```
Hola {nombre}, te recordamos tu préstamo pendiente.
```
