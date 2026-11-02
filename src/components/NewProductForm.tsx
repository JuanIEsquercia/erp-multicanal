"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDemoStore } from "@/lib/demo/store";
import { newProductSchema } from "@/lib/schemas";
import { Card, inputClass, PageHeader, primaryButtonClass, secondaryButtonClass } from "./ui";

type VariantDraft = {
  sku: string;
  values: string;
  price: string;
  promotionalPrice: string;
  cost: string;
  weight: string;
  height: string;
  width: string;
  depth: string;
  barcode: string;
  stock: string;
};

const emptyVariant: VariantDraft = {
  sku: "",
  values: "",
  price: "",
  promotionalPrice: "",
  cost: "",
  weight: "",
  height: "",
  width: "",
  depth: "",
  barcode: "",
  stock: "0",
};

const splitList = (text: string, separator: string | RegExp) =>
  text.split(separator).map((item) => item.trim()).filter(Boolean);

const toNumber = (text: string) => Number(text.trim().replace(",", "."));
const toOptionalNumber = (text: string) => (text.trim() ? toNumber(text) : undefined);

export function NewProductForm() {
  const router = useRouter();
  const { createArticle } = useDemoStore();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("hidden");
  const [attributes, setAttributes] = useState("");
  const [images, setImages] = useState("");
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [freeShipping, setFreeShipping] = useState(false);
  const [requiresShipping, setRequiresShipping] = useState(true);
  const [variants,setVariants] = useState<VariantDraft[]>([emptyVariant]);
  const [errors, setErrors] = useState<string[]>([]);

  const updateVariant = (index: number, field: keyof VariantDraft, value: string) =>
    setVariants((current) =>
      current.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant)),
    );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const parsed = newProductSchema.safeParse({
      name,
      brand,
      description,
      visibility,
      attributes: splitList(attributes, ","),
      images: splitList(images, /\r?\n/),
      categories: splitList(categories, ","),
      tags: splitList(tags, ","),
      seoTitle,
      seoDescription,
      freeShipping,
      requiresShipping,
      variants: variants.map((variant) => ({
        sku: variant.sku,
        values: splitList(variant.values, ","),
        price: toNumber(variant.price),
        promotionalPrice: toOptionalNumber(variant.promotionalPrice),
        cost: toOptionalNumber(variant.cost),
        weight: toOptionalNumber(variant.weight),
        height: toOptionalNumber(variant.height),
        width: toOptionalNumber(variant.width),
        depth: toOptionalNumber(variant.depth),
        barcode: variant.barcode,
        stock: toNumber(variant.stock),
      })),
    });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
      return;
    }

    const result = createArticle(parsed.data);
    if (!result.ok) {
      setErrors([result.message]);
      return;
    }
    // Next conserva el estado de las páginas visitadas: sin esto, el formulario
    // reaparecería con los datos del artículo recién creado.
    setName("");
    setBrand("");
    setDescription("");
    setVisibility("hidden");
    setAttributes("");
    setImages("");
    setCategories("");
    setTags("");
    setSeoTitle("");
    setSeoDescription("");
    setFreeShipping(false);
    setRequiresShipping(true);
    setVariants([emptyVariant]);
    setErrors([]);
    router.push("/articulos");
  }

  return (
    <>
      <PageHeader title="Nuevo artículo" description="Queda en el maestro sin publicar. La publicación es un paso aparte." />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm sm:col-span-2">
              Nombre
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm">
              Marca
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="block text-sm">
            Descripción
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Atributos, separados por coma (máx. 3)
              <input placeholder="Talle, Color" value={attributes} onChange={(e) => setAttributes(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm">
              Visibilidad al publicar
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={inputClass}>
                <option value="hidden">Oculto</option>
                <option value="unlisted">No listado</option>
                <option value="visible">Visible</option>
              </select>
            </label>
            <label className="text-sm">
              URLs de imágenes, una por línea (máx. 9)
              <textarea rows={1} value={images} onChange={(e) => setImages(e.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Categorías, separadas por coma
              <input placeholder="Indumentaria > Remeras" value={categories} onChange={(e) => setCategories(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm">
              Tags, separados por coma
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={freeShipping} onChange={(e) => setFreeShipping(e.target.checked)} />
              Envío sin cargo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={requiresShipping} onChange={(e) => setRequiresShipping(e.target.checked)} />
              Producto físico
            </label>
          </div>

          <details>
            <summary className="cursor-pointer text-sm font-medium">SEO</summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Título para SEO
                <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm">
                Descripción para SEO
                <input value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} className={inputClass} />
              </label>
            </div>
          </details>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Variantes</legend>
            {variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-2 items-end gap-2 border-t border-slate-100 pt-3 sm:grid-cols-7">
                <label className="text-xs">
                  SKU
                  <input required value={variant.sku} onChange={(e) => updateVariant(index, "sku", e.target.value)} className={inputClass} />
                </label>
                <label className="text-xs">
                  Valores
                  <input placeholder="M, Rojo" value={variant.values} onChange={(e) => updateVariant(index, "values", e.target.value)} className={inputClass} />
                </label>
                <label className="text-xs">
                  Precio
                  <input required inputMode="decimal" value={variant.price} onChange={(e) => updateVariant(index, "price", e.target.value)} className={inputClass} />
                </label>
                <label className="text-xs">
                  Costo
                  <input inputMode="decimal" value={variant.cost} onChange={(e) => updateVariant(index, "cost", e.target.value)} className={inputClass} />
                </label>
                <label className="text-xs">
                  Peso (kg)
                  <input inputMode="decimal" value={variant.weight} onChange={(e) => updateVariant(index, "weight", e.target.value)} className={inputClass} />
                </label>
                <label className="text-xs">
                  Stock
                  <input required inputMode="numeric" value={variant.stock} onChange={(e) => updateVariant(index, "stock", e.target.value)} className={inputClass} />
                </label>
                <button
                  type="button"
                  disabled={variants.length === 1}
                  onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}
                  className={`${secondaryButtonClass} justify-center`}
                >
                  Quitar
                </button>
                <details className="col-span-2 sm:col-span-7">
                  <summary className="cursor-pointer text-xs">Más datos de la variante</summary>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <label className="text-xs">
                      Precio promocional
                      <input inputMode="decimal" value={variant.promotionalPrice} onChange={(e) => updateVariant(index, "promotionalPrice", e.target.value)} className={inputClass} />
                    </label>
                    <label className="text-xs">
                      Alto (cm)
                      <input inputMode="numeric" value={variant.height} onChange={(e) => updateVariant(index, "height", e.target.value)} className={inputClass} />
                    </label>
                    <label className="text-xs">
                      Ancho (cm)
                      <input inputMode="numeric" value={variant.width} onChange={(e) => updateVariant(index, "width", e.target.value)} className={inputClass} />
                    </label>
                    <label className="text-xs">
                      Profundidad (cm)
                      <input inputMode="numeric" value={variant.depth} onChange={(e) => updateVariant(index, "depth", e.target.value)} className={inputClass} />
                    </label>
                    <label className="text-xs">
                      Código de barras
                      <input value={variant.barcode} onChange={(e) => updateVariant(index, "barcode", e.target.value)} className={inputClass} />
                    </label>
                  </div>
                </details>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setVariants((current) => [...current, emptyVariant])}
              className={secondaryButtonClass}
            >
              Agregar variante
            </button>
          </fieldset>

          {errors.length > 0 && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {errors.map((message) => <p key={message} className="break-words">{message}</p>)}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primaryButtonClass}>Crear artículo</button>
            <Link href="/articulos" className={secondaryButtonClass}>Cancelar</Link>
          </div>
        </form>
      </Card>
    </>
  );
}
