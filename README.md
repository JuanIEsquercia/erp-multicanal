# ERP Ventas

ERP para centralizar la operación de la empresa. El ERP es la única fuente de artículos, precios y stock; Tiendanube y el futuro portal de compradores reciben esos datos.

## Modo prueba

La aplicación no se conecta con ningún servicio y no necesita variables de entorno. Los datos viven en la memoria del navegador: se mantienen al navegar por el menú y vuelven al estado inicial al recargar la página.

```bash
npm install
npm run dev
```

## Comandos

- `npm run dev`: servidor local
- `npm test`: pruebas
- `npm run lint`: linter
- `npm run build`: build de producción

## Estructura

| Ubicación | Contenido |
| --- | --- |
| `src/lib/modules.ts` | Definición del menú |
| `src/lib/demo/` | Estado de prueba, datos de ejemplo y canal simulado |
| `src/components/` | Interfaz |
| `src/app/` | Una ruta por módulo |

Módulos con lógica en memoria: Panel, Ventas, Artículos, Inventario y Tiendanube (simulado). El resto muestra datos de ejemplo y sus funciones previstas, definidos en `src/lib/demo/module-data.ts`.

## Convivencia con Tango

Cada artículo indica qué sistema lo gestiona. Solo los gestionados en el ERP se venden y publican desde acá; el stock de los demás es informativo. La migración avanza pasando artículos de Tango al ERP, empezando por los de mayor rotación.

## Ventas

Cada venta tiene tres datos independientes:

- **Origen:** Tiendanube, portal o local.
- **Pago:** pendiente → informado (lo reporta el canal o el vendedor) → consolidado (se confirmó el monto acreditado). También puede quedar anulado.
- **Factura:** sin facturar o facturada, con el número del comprobante emitido fuera del ERP.

## CSV de stock

Separado por coma, punto y coma o tabulación, con encabezado:

```csv
sku;stock
REM-M-NEG;12
BUZ-L;0
```

El valor del archivo reemplaza al stock actual. Antes de aplicar se muestran los cambios, y se omiten las filas con errores y los SKU que no existen.

## Integraciones pendientes (desactivadas)

Este código no se ejecuta y queda para la etapa de conexión:

- `supabase/migrations/`: esquema de base de datos. Falta sumar los movimientos de stock.
- `src/app/_pendiente/`: rutas de API. La carpeta con `_` queda fuera del enrutado de Next.js.
- `src/_pendiente/proxy.ts`: protección de acceso. Se activa moviéndolo a `src/proxy.ts`.
- `src/lib/tiendanube.ts`, `src/lib/supabase.ts`, `src/lib/env.ts`: clientes y configuración. Ver `.env.example`.
# erp-multicanal
