import { addSoftDeleteFilter, supabase } from '@/lib/supabase';

export type DashboardProductCatalogEntry = {
  id: string;
  name: string;
  categoryId: string | null;
  subcategoryId: string | null;
};

export type DashboardProductCatalog = {
  products: DashboardProductCatalogEntry[];
  categoryNames: Map<string, string>;
  subcategoryNames: Map<string, string>;
  subcategoryCategoryIds: Map<string, string>;
};

export async function fetchDashboardProductCatalog(companyId: string): Promise<DashboardProductCatalog> {
  const [productsResult, categoriesResult, subcategoriesResult] = await Promise.all([
    addSoftDeleteFilter(
      supabase
        .from('products')
        .select('id, name, category_id, subcategory_id')
        .eq('company_id', companyId)
        .order('name', { ascending: true }),
      'products'
    ),
    addSoftDeleteFilter(
      supabase.from('product_categories').select('id, name').eq('company_id', companyId),
      'product_categories'
    ),
    addSoftDeleteFilter(
      supabase.from('product_subcategories').select('id, name, category_id').eq('company_id', companyId),
      'product_subcategories'
    ),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (subcategoriesResult.error) throw subcategoriesResult.error;

  const categoryNames = new Map<string, string>(
    (categoriesResult.data ?? []).map((row: { id: string; name: string }) => [row.id, row.name])
  );
  const subcategoryNames = new Map<string, string>();
  const subcategoryCategoryIds = new Map<string, string>();

  for (const row of subcategoriesResult.data ?? []) {
    const subcategory = row as { id: string; name: string; category_id: string };
    subcategoryNames.set(subcategory.id, subcategory.name);
    subcategoryCategoryIds.set(subcategory.id, subcategory.category_id);
  }

  return {
    products: (productsResult.data ?? []).map(
      (row: {
        id: string;
        name: string;
        category_id: string | null;
        subcategory_id: string | null;
      }) => ({
        id: row.id,
        name: row.name,
        categoryId: row.category_id,
        subcategoryId: row.subcategory_id,
      })
    ),
    categoryNames,
    subcategoryNames,
    subcategoryCategoryIds,
  };
}
