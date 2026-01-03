Aquí está EN UN SOLO README, TODO JUNTO, para copiar y pegar. Nada más.

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

# Clonar el repositorio:

git clone https://github.com/Zozuke/shiro.git
cd shiro

Dar permisos al instalador:

chmod +x setup.sh

Ejecutar la instalación:

./setup.sh

Abrir el panel de administración:

node admin.js

Iniciar el bot de WhatsApp:

node bot.js

Escanea el código QR cuando aparezca para vincular WhatsApp.

Notas

Todo funciona localmente en Termux

No usa servidores externos

La configuración se guarda en archivos JSON

No cierres Termux mientras el bot esté activo


Licencia

Uso educativo y personal

Ya.  
Eso **ES** un solo README. Copia, pega y se acabó.# shiro
