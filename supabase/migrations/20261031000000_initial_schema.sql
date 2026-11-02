-- Esquema inicial del ERP: maestro de artículos, stock y vínculo con Tiendanube.
-- El acceso es solo desde el servidor (service role): RLS activo y sin políticas.

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Convierte un array JSON en text[] conservando el orden, que relaciona cada
-- atributo del producto con su valor en la variante.
create function public.jsonb_to_text_array(p_value jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(t.value order by t.ord), '{}')
  from jsonb_array_elements_text(coalesce(p_value, '[]'::jsonb)) with ordinality as t(value, ord);
$$;

-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  description text,
  brand       text,
  -- Nombres de atributos, por ejemplo {Talle,Color}. Tiendanube admite hasta 3.
  attributes  text[] not null default '{}' check (cardinality(attributes) <= 3),
  image_urls  text[] not null default '{}',
  visibility  text not null default 'hidden' check (visibility in ('visible', 'unlisted', 'hidden')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index products_created_at_idx on public.products (created_at desc);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Variantes: el SKU es la clave con la que se cruza el CSV de stock
-- ---------------------------------------------------------------------------
create table public.variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  sku           text not null unique check (length(btrim(sku)) > 0),
  -- Valores en el mismo orden que products.attributes, por ejemplo {M,Rojo}.
  option_values text[] not null default '{}',
  price         numeric(12, 2) not null check (price >= 0),
  cost          numeric(12, 2) check (cost >= 0),
  weight_kg     numeric(8, 3) check (weight_kg >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, option_values)
);

create trigger variants_set_updated_at
  before update on public.variants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Inventario: una fila por variante (depósito único en este MVP)
-- ---------------------------------------------------------------------------
create table public.inventory (
  variant_id uuid primary key references public.variants (id) on delete cascade,
  quantity   integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now()
);

create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Mapeo con los IDs devueltos por Tiendanube
-- ---------------------------------------------------------------------------
create table public.tiendanube_mappings (
  id             uuid primary key default gen_random_uuid(),
  store_id       bigint not null,
  entity_type    text not null check (entity_type in ('product', 'variant')),
  product_id     uuid references public.products (id) on delete cascade,
  variant_id     uuid references public.variants (id) on delete cascade,
  external_id    bigint not null,
  last_synced_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  check (
    (entity_type = 'product' and product_id is not null and variant_id is null)
    or (entity_type = 'variant' and variant_id is not null and product_id is null)
  ),
  unique (store_id, entity_type, external_id)
);

create unique index tiendanube_mappings_product_idx
  on public.tiendanube_mappings (store_id, product_id) where product_id is not null;
create unique index tiendanube_mappings_variant_idx
  on public.tiendanube_mappings (store_id, variant_id) where variant_id is not null;

-- ---------------------------------------------------------------------------
-- Vista de lectura para la tabla administrativa
-- ---------------------------------------------------------------------------
create view public.product_overview
with (security_invoker = true)
as
select
  p.id,
  p.name,
  p.brand,
  p.visibility,
  p.created_at,
  (
    select m.external_id::text
    from public.tiendanube_mappings m
    where m.product_id = p.id
    order by m.created_at
    limit 1
  ) as tiendanube_product_id,
  coalesce(s.total_stock, 0) as total_stock,
  coalesce(s.variants, '[]'::jsonb) as variants
from public.products p
left join lateral (
  select
    sum(coalesce(i.quantity, 0))::bigint as total_stock,
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'sku', v.sku,
        'option_values', v.option_values,
        'price', v.price,
        'quantity', coalesce(i.quantity, 0)
      )
      order by v.sku
    ) as variants
  from public.variants v
  left join public.inventory i on i.variant_id = v.id
  where v.product_id = p.id
) s on true;

-- ---------------------------------------------------------------------------
-- Operaciones atómicas
-- ---------------------------------------------------------------------------

-- Crea producto, variantes y stock inicial en una sola transacción.
create function public.create_product(p_product jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_variants jsonb;
begin
  insert into public.products (name, description, brand, attributes, image_urls, visibility)
  values (
    p_product ->> 'name',
    p_product ->> 'description',
    p_product ->> 'brand',
    public.jsonb_to_text_array(p_product -> 'attributes'),
    public.jsonb_to_text_array(p_product -> 'images'),
    p_product ->> 'visibility'
  )
  returning id into v_product_id;

  with input as (
    select value as variant from jsonb_array_elements(p_product -> 'variants')
  ),
  inserted as (
    insert into public.variants (product_id, sku, option_values, price, cost, weight_kg)
    select
      v_product_id,
      variant ->> 'sku',
      public.jsonb_to_text_array(variant -> 'values'),
      (variant ->> 'price')::numeric,
      (variant ->> 'cost')::numeric,
      (variant ->> 'weight')::numeric
    from input
    returning id, sku
  ),
  stocked as (
    insert into public.inventory (variant_id, quantity)
    select inserted.id, (input.variant ->> 'stock')::integer
    from inserted
    join input on input.variant ->> 'sku' = inserted.sku
  )
  select jsonb_agg(jsonb_build_object('id', inserted.id, 'sku', inserted.sku))
  into v_variants
  from inserted;

  return jsonb_build_object('product_id', v_product_id, 'variants', v_variants);
end;
$$;

-- Reemplaza el stock de los SKU recibidos e informa los que no existen.
-- Espera un array [{ "sku": text, "quantity": integer }] sin SKU repetidos.
create function public.import_stock(p_rows jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_updated integer;
  v_unknown text[];
begin
  with input as (
    select value ->> 'sku' as sku, (value ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_rows)
  ),
  upserted as (
    insert into public.inventory (variant_id, quantity)
    select v.id, input.quantity
    from input
    join public.variants v on v.sku = input.sku
    on conflict (variant_id) do update set quantity = excluded.quantity
    returning 1
  )
  select count(*) into v_updated from upserted;

  select coalesce(array_agg(input.sku order by input.sku), '{}')
  into v_unknown
  from (select value ->> 'sku' as sku from jsonb_array_elements(p_rows)) as input
  where not exists (select 1 from public.variants v where v.sku = input.sku);

  return jsonb_build_object('updated', v_updated, 'unknown_skus', to_jsonb(v_unknown));
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: nada es accesible con la clave pública
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.inventory enable row level security;
alter table public.tiendanube_mappings enable row level security;

revoke all on public.products, public.variants, public.inventory,
  public.tiendanube_mappings, public.product_overview
  from public, anon, authenticated;

grant select, insert, update, delete on public.products, public.variants,
  public.inventory, public.tiendanube_mappings to service_role;
grant select on public.product_overview to service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.jsonb_to_text_array(jsonb) from public, anon, authenticated;
revoke all on function public.create_product(jsonb) from public, anon, authenticated;
revoke all on function public.import_stock(jsonb) from public, anon, authenticated;

grant execute on function public.jsonb_to_text_array(jsonb) to service_role;
grant execute on function public.create_product(jsonb) to service_role;
grant execute on function public.import_stock(jsonb) to service_role;
