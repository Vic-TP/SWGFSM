## Configuración Mercado Pago

Para que **tarjeta** y **Yape** funcionen, configura las credenciales de la misma aplicación en Mercado Pago:

1. **Backend** (`SWGFSM-back/backend/.env`):
   ```
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
   ```

2. **Frontend** (`SWGFSM-front/frontend/.env` — créalo copiando `.env.example`):
   ```
   REACT_APP_MP_PUBLIC_KEY=APP_USR-...
   ```

3. Reinicia backend y frontend después de cambiar las variables.

**Efectivo** funciona sin Mercado Pago (pago al recoger en tienda o en estación Metropolitano).

Las credenciales de prueba están en [developers.mercadopago.com](https://www.mercadopago.com.pe/developers). Si no las tienes, solicítalas al administrador del proyecto.

