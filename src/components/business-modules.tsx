import type { SupabaseClient } from "@supabase/supabase-js";
import { moduleAction } from "@/app/app/actions";

const formStyle = { display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "end" };
const fieldStyle = { minWidth: 130, flex: "1 1 130px" };

function Field({ name, label, type = "text", required, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string | number | null }) {
  return <label style={fieldStyle}><span>{label}</span><input name={name} type={type} step={type === "number" ? "any" : undefined} required={required} defaultValue={defaultValue ?? ""} /></label>;
}

function Hidden({ orgId, operation, back, id }: { orgId: string; operation: string; back: string; id?: string }) {
  return <><input type="hidden" name="organization_id" value={orgId} /><input type="hidden" name="operation" value={operation} /><input type="hidden" name="back" value={back} />{id && <input type="hidden" name="id" value={id} />}</>;
}

export async function ProductsModule({ orgId, supabase }: { orgId: string; supabase: SupabaseClient }) {
  const { data = [] } = await supabase.from("products").select("id,name,sku,category,brand,sale_price,cost_price").eq("organization_id", orgId).eq("is_active", true).order("created_at", { ascending: false });
  return <Module title="Productos" subtitle="Catálogo real de tu organización">
    <form action={moduleAction} style={formStyle}><Hidden orgId={orgId} operation="save_product" back="productos" />
      <Field name="name" label="Nombre" required /><Field name="sku" label="SKU" required /><Field name="category" label="Categoría" />
      <Field name="brand" label="Marca" /><Field name="sale_price" label="Precio venta" type="number" required /><Field name="cost_price" label="Costo" type="number" required />
      <Field name="initial_stock" label="Stock inicial" type="number" /><button className="button button--primary">Crear producto</button>
    </form>
    <Rows headers={["Producto","SKU","Precio","Acciones"]}>{(data ?? []).map((row) => <tr key={row.id}>
      <td><strong>{row.name}</strong><br /><small>{row.category || "Sin categoría"} · {row.brand || "Sin marca"}</small></td><td>{row.sku}</td><td>S/ {Number(row.sale_price).toFixed(2)}</td>
      <td><details><summary>Editar</summary><form action={moduleAction} style={formStyle}><Hidden orgId={orgId} operation="save_product" back="productos" id={row.id} />
        <Field name="name" label="Nombre" required defaultValue={row.name} /><Field name="sku" label="SKU" required defaultValue={row.sku} />
        <Field name="category" label="Categoría" defaultValue={row.category} /><Field name="brand" label="Marca" defaultValue={row.brand} />
        <Field name="sale_price" label="Venta" type="number" required defaultValue={row.sale_price} /><Field name="cost_price" label="Costo" type="number" required defaultValue={row.cost_price} />
        <button className="button button--secondary">Guardar</button></form></details>
        <form action={moduleAction}><Hidden orgId={orgId} operation="archive_product" back="productos" id={row.id} /><button className="panel-link panel-link--plain">Archivar</button></form>
      </td></tr>)}</Rows>
  </Module>;
}

export async function InventoryModule({ orgId, supabase }: { orgId: string; supabase: SupabaseClient }) {
  const [{ data = [] }, { data: movements = [] }] = await Promise.all([
    supabase.from("inventory_balances").select("quantity,minimum_quantity,products(id,name,sku)").eq("organization_id", orgId).order("quantity"),
    supabase.from("stock_movements").select("id,quantity,notes,created_at,products(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(20),
  ]);
  return <Module title="Inventario" subtitle="Ajustes transaccionales y trazabilidad">
    <Rows headers={["Producto","Stock","Ajuste"]}>{(data ?? []).map((row, index) => {
      const product = row.products as unknown as { id: string; name: string; sku: string } | null;
      return <tr key={product?.id ?? index}><td><strong>{product?.name}</strong><br /><small>{product?.sku}</small></td><td>{Number(row.quantity)}</td><td>
        {product && <form action={moduleAction} style={formStyle}><Hidden orgId={orgId} operation="inventory" back="inventario" id={product.id} />
          <Field name="quantity" label="Cantidad (+/-)" type="number" required /><Field name="notes" label="Motivo" required /><button className="button button--secondary">Aplicar</button></form>}
      </td></tr>;
    })}</Rows>
    <h3>Últimos movimientos</h3><Rows headers={["Producto","Cantidad","Motivo","Fecha"]}>{(movements ?? []).map((row) => <tr key={row.id}><td>{(row.products as unknown as { name: string } | null)?.name}</td><td>{Number(row.quantity)}</td><td>{row.notes || "—"}</td><td>{new Intl.DateTimeFormat("es-PE").format(new Date(row.created_at))}</td></tr>)}</Rows>
  </Module>;
}

export async function CustomersModule(props: { orgId: string; supabase: SupabaseClient }) { return <ContactsModule {...props} kind="customer" />; }
export async function SuppliersModule(props: { orgId: string; supabase: SupabaseClient }) { return <ContactsModule {...props} kind="supplier" />; }

export async function CategoriesModule({ orgId, supabase }: { orgId: string; supabase: SupabaseClient }) {
  const { data } = await supabase.from("products").select("category,brand").eq("organization_id", orgId).eq("is_active", true);
  const counts = new Map<string, number>();
  for (const row of data ?? []) for (const value of [row.category, row.brand]) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return <Module title="Categorías y marcas" subtitle="Se actualizan desde el catálogo de productos"><Rows headers={["Nombre","Productos"]}>{[...counts].sort().map(([name, count]) => <tr key={name}><td>{name}</td><td>{count}</td></tr>)}</Rows></Module>;
}

async function ContactsModule({ orgId, supabase, kind }: { orgId: string; supabase: SupabaseClient; kind: "customer" | "supplier" }) {
  const table = kind === "customer" ? "customers" : "suppliers";
  const back = kind === "customer" ? "clientes" : "proveedores";
  const title = kind === "customer" ? "Clientes" : "Proveedores";
  const { data = [] } = await supabase.from(table).select("id,name,document,phone,email,address").eq("organization_id", orgId).eq("is_active", true).order("created_at", { ascending: false });
  return <Module title={title} subtitle={`CRUD real de ${title.toLowerCase()}`}>
    <form action={moduleAction} style={formStyle}><Hidden orgId={orgId} operation={`save_${kind}`} back={back} />
      <Field name="name" label="Nombre" required /><Field name="document" label={kind === "supplier" ? "RUC" : "DNI/RUC"} /><Field name="phone" label="Teléfono" />
      <Field name="email" label="Correo" type="email" /><Field name="address" label="Dirección" /><button className="button button--primary">Agregar</button>
    </form>
    <Rows headers={["Nombre","Documento","Contacto","Acciones"]}>{(data ?? []).map((row) => <tr key={row.id}><td><strong>{row.name}</strong><br /><small>{row.address || "—"}</small></td><td>{row.document || "—"}</td><td>{row.phone || "—"}<br /><small>{row.email}</small></td><td>
      <details><summary>Editar</summary><form action={moduleAction} style={formStyle}><Hidden orgId={orgId} operation={`save_${kind}`} back={back} id={row.id} />
        <Field name="name" label="Nombre" required defaultValue={row.name} /><Field name="document" label="Documento" defaultValue={row.document} /><Field name="phone" label="Teléfono" defaultValue={row.phone} />
        <Field name="email" label="Correo" type="email" defaultValue={row.email} /><Field name="address" label="Dirección" defaultValue={row.address} /><button className="button button--secondary">Guardar</button></form></details>
      <form action={moduleAction}><Hidden orgId={orgId} operation={`archive_${kind}`} back={back} id={row.id} /><button className="panel-link panel-link--plain">Archivar</button></form>
    </td></tr>)}</Rows>
  </Module>;
}

export async function CashModule({ orgId, supabase }: { orgId: string; supabase: SupabaseClient }) {
  const { data = [] } = await supabase.from("cash_movements").select("id,movement_type,amount,payment_method,description,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
  const balance = (data ?? []).reduce((sum, row) => sum + Number(row.amount) * (row.movement_type === "income" ? 1 : -1), 0);
  return <Module title="Caja" subtitle={`Balance registrado: S/ ${balance.toFixed(2)}`}>
    <form action={moduleAction} style={formStyle}><Hidden orgId={orgId} operation="cash" back="caja" />
      <label style={fieldStyle}><span>Tipo</span><select name="movement_type"><option value="income">Ingreso</option><option value="expense">Gasto</option></select></label>
      <Field name="amount" label="Monto" type="number" required /><label style={fieldStyle}><span>Medio</span><select name="payment_method"><option value="efectivo">Efectivo</option><option value="yape">Yape/Plin</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></label>
      <Field name="description" label="Descripción" required /><button className="button button--primary">Registrar</button>
    </form>
    <Rows headers={["Tipo","Monto","Medio","Descripción","Fecha"]}>{(data ?? []).map((row) => <tr key={row.id}><td>{row.movement_type === "income" ? "Ingreso" : "Gasto"}</td><td>S/ {Number(row.amount).toFixed(2)}</td><td>{row.payment_method}</td><td>{row.description}</td><td>{new Intl.DateTimeFormat("es-PE").format(new Date(row.created_at))}</td></tr>)}</Rows>
  </Module>;
}

export async function ReportsModule({ orgId, supabase }: { orgId: string; supabase: SupabaseClient }) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: sales = [] }, { data: stock = [] }, { data: cash = [] }] = await Promise.all([
    supabase.from("sales").select("total,created_at").eq("organization_id", orgId).eq("status", "completed").gte("created_at", since),
    supabase.from("inventory_balances").select("quantity,products(name,cost_price,sale_price)").eq("organization_id", orgId),
    supabase.from("cash_movements").select("movement_type,amount").eq("organization_id", orgId).gte("created_at", since),
  ]);
  const revenue = (sales ?? []).reduce((sum, row) => sum + Number(row.total), 0);
  const cashBalance = (cash ?? []).reduce((sum, row) => sum + Number(row.amount) * (row.movement_type === "income" ? 1 : -1), 0);
  const stockValue = (stock ?? []).reduce((sum, row) => sum + Number(row.quantity) * Number((row.products as unknown as { cost_price: number } | null)?.cost_price ?? 0), 0);
  return <Module title="Reportes" subtitle="Últimos 30 días, datos reales"><section className="kpi-grid"><Kpi label="Ventas" value={`S/ ${revenue.toFixed(2)}`} /><Kpi label="Operaciones" value={String((sales ?? []).length)} /><Kpi label="Caja" value={`S/ ${cashBalance.toFixed(2)}`} /><Kpi label="Inventario al costo" value={`S/ ${stockValue.toFixed(2)}`} /></section></Module>;
}

export async function SettingsModule({ orgId, supabase }: { orgId: string; supabase: SupabaseClient }) {
  const { data } = await supabase.from("organizations").select("name,business_type").eq("id", orgId).single();
  return <Module title="Configuración" subtitle="Datos visibles de tu empresa"><form action={moduleAction} style={formStyle}><Hidden orgId={orgId} operation="settings" back="configuracion" />
    <Field name="name" label="Nombre comercial" required defaultValue={data?.name} /><Field name="business_type" label="Rubro" required defaultValue={data?.business_type} /><button className="button button--primary">Guardar cambios</button>
  </form></Module>;
}

function Module({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div><div className="page-heading"><div><span>Gestión</span><h1>{title}</h1><p>{subtitle}</p></div></div><article className="panel-card" style={{ display: "grid", gap: 22 }}>{children}</article></div>; }
function Rows({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="data-table-wrap"><table className="data-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Kpi({ label, value }: { label: string; value: string }) { return <article className="kpi-card"><small>{label}</small><strong>{value}</strong></article>; }
