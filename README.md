# Shiro Bot – Instalación en Termux

Bot de WhatsApp con panel de administración ejecutado completamente en Termux.

## Requisitos
- Android
- Termux (instalado desde F-Droid)
- Conexión a internet para la instalación

## Instalación

Actualizar Termux y preparar el entorno:

```bash
pkg update && pkg upgrade -y
pkg install git nodejs -y

## Clonar el repositorio:

git clone https://github.com/Zozuke/shiro.git
cd shiro

## Dar permisos al instalador:

chmod +x setup.sh

## Ejecutar la instalación:

./setup.sh

## Abrir el panel de administración:

node admin.js

## Iniciar el bot de WhatsApp:

node bot.js

## Escanea el código QR cuando aparezca para vincular WhatsApp.
```
Notas

Todo el panel funciona localmente en Termux

No usa servidores externos

La configuración se guarda en archivos JSON

No cierres Termux mientras el bot esté activo


Licencia

Uso educativo y personal
Uso educativo y personal.
El autor no se hace responsable del mal uso.

ayúdame a seguir dándole mantenimiento a este programa asiendome una pequeña colaboración al número:

```bash
+52 221 986 1564
```

te lo agradecería mucho 
