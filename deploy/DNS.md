# Activar cc.rodolfovalle.com

El dominio está registrado en el servidor privado del panel y pendiente de validación DNS y HTTPS. Estos valores proceden de la respuesta del proveedor para este dominio específico.

En la zona DNS de `rodolfovalle.com`, añadir:

| Tipo | Nombre relativo | Valor |
| --- | --- | --- |
| CNAME | `cc` | `custom-domains.chatgpt.site` |
| TXT | `_openai-site-verification.cc` | `openai-site-verification=oSNBZGyozh2jR_6egTff3S8FkjF-SYQUqulWQbxI6mQ` |
| TXT | `_cf-custom-hostname.cc` | `b78c7102-872c-4649-8362-f03383997099` |

Los nombres completos de los TXT son `_openai-site-verification.cc.rodolfovalle.com` y `_cf-custom-hostname.cc.rodolfovalle.com`. Si el proveedor añade automáticamente la zona, usar los nombres relativos de la tabla. Usar el TTL predeterminado del proveedor.

Este CNAME conserva el servidor y acceso privado actuales. No apunta a GitHub Pages. GitHub conserva el código fuente de `rbvk/cc`.

Después de guardar los registros, verificar el dominio con el proveedor y esperar a que el estado del dominio y su certificado sean `active`. El dominio no se considera operativo hasta comprobar HTTPS y que una visita sin autenticar no revele los datos del panel.

El sitio original permanece operativo durante la transición. No sustituir otros registros de `rodolfovalle.com`.

## Respuesta de registro

- Hostname: `cc.rodolfovalle.com`.
- Registro del dominio: `appgdom_6adcac2c37f08191ba4b0168b2e93a48`.
- Estado inicial: `pending`.
- Certificado inicial: `initializing`.
