# ⚽ Álbum Mundial 2026

Tracker personal para el álbum Panini FIFA World Cup 2026™ — construido para usar desde el celular y sincronizado en tiempo real con Firebase.

---

## 📱 Demo

🔗 [Ver álbum](https://nicoct04.github.io/album-mundial-2026)

---

## ✨ Funcionalidades

- **📗 Mi Álbum** — visualizá todas las estampas con su estado actual, filtrá por tengo / falta / repetida y buscá por código o jugadorr
- **❌ Faltantes** — lista de todas las estampas que aún no tenés
- **🔁 Repetidas** — estampas disponibles para intercambiar
- **✏️ Marcar** — zona protegida con PIN para actualizar el estado de cada estampa
- **📊 Progreso** — barra de progreso y estadísticas en tiempo real
- **🔄 Sincronización** — todos los cambios se sincronizan instantáneamente vía Firebase Firestore

---

## 🗂️ Datos

- **980 estampas** en total (48 selecciones)
- Cada selección incluye: escudo foil, foto del equipo y 18 jugadores
- Sección general con emblemas, mascotas y ciudades sede

---

## 🛠️ Stack

| Tecnología | Uso |
|---|---|
| HTML / CSS / JS | Frontend (un solo archivo) |
| Firebase Firestore | Base de datos en tiempo real |
| GitHub Pages | Hosting gratuito |

---

## 🔒 Seguridad

La sección de marcado está protegida con un PIN familiar. Las credenciales de Firebase son públicas por diseño (es el comportamiento estándar de Firebase Web) — la seguridad real se maneja desde las reglas de Firestore.

---

## 📦 Estructura

```
album-mundial-2026/
└── index.html    # App completa
```

---

<p align="center">Hecho con ❤️ para completar el álbum en familia 🏆</p>
