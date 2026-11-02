export type ModuleContent = {
  description: string;
  planned: string[];
  table?: { columns: string[]; rows: string[][] };
};

// Datos ficticios para ver la forma de cada módulo mientras no tenga lógica propia.
export const MODULE_CONTENT: Record<string, ModuleContent> = {
  cotizaciones: {
    description: "Presupuestos con precios y stock actualizados desde el ERP.",
    planned: [
      "Cotizar con la lista de precios asignada a cada comprador",
      "Definir la vigencia de cada cotización",
      "Convertir una cotización aprobada en pedido",
    ],
    table: {
      columns: ["Cotización", "Comprador", "Ítems", "Total", "Vigencia", "Estado"],
      rows: [
        ["C-0311", "Comercial Norte SRL", "12", "$ 640.000", "05/11/2026", "Enviada"],
        ["C-0310", "Distribuidora Sur SA", "4", "$ 98.700", "03/11/2026", "Aprobada"],
      ],
    },
  },
  clientes: {
    description: "Compradores mayoristas y clientes de la tienda online.",
    planned: [
      "Crear compradores y darles acceso al portal",
      "Asignar lista de precios y condiciones de pago",
      "Consultar historial de pedidos y saldo",
    ],
    table: {
      columns: ["Cliente", "Tipo", "Lista de precios", "Acceso al portal"],
      rows: [
        ["Comercial Norte SRL", "Mayorista", "Mayorista A", "Activo"],
        ["Distribuidora Sur SA", "Mayorista", "Mayorista B", "Activo"],
        ["Lucía Ejemplo", "Tienda online", "Minorista", "No aplica"],
      ],
    },
  },
  precios: {
    description: "Listas de precios por canal y tipo de comprador.",
    planned: [
      "Mantener una lista base y derivar otras con reglas",
      "Actualizar precios en forma masiva",
      "Publicar cambios en cotizaciones y canales de venta",
    ],
    table: {
      columns: ["Lista", "Regla", "Usada por"],
      rows: [
        ["Minorista", "Precio base", "Tiendanube"],
        ["Mayorista A", "Base − 20 %", "Portal"],
        ["Mayorista B", "Base − 15 %", "Portal"],
      ],
    },
  },
  compras: {
    description: "Órdenes de compra y recepción de mercadería.",
    planned: [
      "Emitir órdenes de compra a proveedores",
      "Registrar recepciones, que suman stock",
      "Actualizar costos de los artículos",
    ],
    table: {
      columns: ["Orden", "Proveedor", "Total", "Entrega", "Estado"],
      rows: [
        ["OC-208", "Textil Ejemplo SA", "$ 1.250.000", "12/11/2026", "Emitida"],
        ["OC-207", "Insumos Demo SRL", "$ 320.000", "28/10/2026", "Recibida"],
      ],
    },
  },
  proveedores: {
    description: "Datos de proveedores y sus condiciones comerciales.",
    planned: ["Administrar contactos y condiciones de pago", "Consultar órdenes y saldo por proveedor"],
    table: {
      columns: ["Proveedor", "Rubro", "Condición de pago"],
      rows: [
        ["Textil Ejemplo SA", "Indumentaria", "30 días"],
        ["Insumos Demo SRL", "Packaging", "Contado"],
      ],
    },
  },
  envios: {
    description: "Preparación y seguimiento de los despachos.",
    planned: [
      "Generar envíos a partir de los pedidos",
      "Asignar transporte y código de seguimiento",
      "Registrar entregas e incidencias",
    ],
    table: {
      columns: ["Envío", "Pedido", "Destino", "Transporte", "Estado"],
      rows: [
        ["E-540", "V-1022", "Bahía Blanca", "Transporte Demo", "En camino"],
        ["E-539", "V-1023", "CABA", "Correo Ejemplo", "Por despachar"],
      ],
    },
  },
  facturacion: {
    description: "Comprobantes de venta asociados a los pedidos.",
    planned: ["Generar facturas y notas de crédito", "Consultar comprobantes por cliente y período"],
    table: {
      columns: ["Comprobante", "Cliente", "Pedido", "Total", "Estado"],
      rows: [["Ejemplo 0001-00000452", "Distribuidora Sur SA", "V-1022", "$ 412.500", "Emitido"]],
    },
  },
  cobranzas: {
    description: "Cobros y cuentas corrientes de los clientes.",
    planned: ["Registrar cobros e imputarlos a comprobantes", "Controlar saldos y vencimientos"],
    table: {
      columns: ["Cliente", "Saldo", "Próximo vencimiento"],
      rows: [
        ["Comercial Norte SRL", "$ 185.000", "15/11/2026"],
        ["Distribuidora Sur SA", "$ 0", "—"],
      ],
    },
  },
  reportes: {
    description: "Indicadores de ventas, stock y operación.",
    planned: ["Ventas por canal, cliente y artículo", "Rotación y valorización de stock", "Exportar a Excel"],
  },
  portal: {
    description: "Sistema de ventas para los compradores a los que la empresa les da acceso.",
    planned: [
      "Ingreso solo con usuarios creados por la empresa",
      "Cotizar con precios y stock actualizados desde el ERP",
      "Confirmar pedidos y consultar su estado",
    ],
  },
  usuarios: {
    description: "Personas del equipo y permisos por módulo. Los compradores se gestionan en Clientes.",
    planned: ["Crear usuarios internos", "Definir qué puede ver y hacer cada rol"],
    table: {
      columns: ["Rol", "Acceso previsto"],
      rows: [
        ["Administración", "Todos los módulos"],
        ["Ventas", "Comercial y consulta de stock"],
        ["Depósito", "Inventario, compras y envíos"],
      ],
    },
  },
  configuracion: {
    description: "Datos de la empresa y parámetros generales.",
    planned: ["Datos fiscales y comerciales", "Depósitos y transportes", "Conexiones con servicios externos"],
  },
};
