import { addSoftDeleteFilter, supabase, type Client, type EstablishmentType, type TourName } from '@/lib/supabase';
import { getDepartmentFromPostalCode } from '@/lib/postal-code-utils';

export type DashboardClientCatalogEntry = {
  id: string;
  name: string;
  department: string | null;
  establishmentTypeId: string | null;
  tourId: string | null;
};

export type DashboardCatalog = {
  clients: DashboardClientCatalogEntry[];
  establishmentTypeNames: Map<string, string>;
  tourNames: Map<string, string>;
};

function mapClient(client: Client): DashboardClientCatalogEntry {
  const department =
    client.department ||
    (client.postal_code ? getDepartmentFromPostalCode(client.postal_code) : null);

  return {
    id: client.id,
    name: client.name,
    department,
    establishmentTypeId: client.establishment_type_id,
    tourId: client.tour_name_id,
  };
}

export async function fetchDashboardClientCatalog(companyId: string): Promise<DashboardCatalog> {
  const [clientsResult, typesResult, toursResult] = await Promise.all([
    addSoftDeleteFilter(
      supabase.from('clients').select('*').eq('company_id', companyId),
      'clients'
    ),
    addSoftDeleteFilter(supabase.from('establishment_types').select('*'), 'establishment_types'),
    addSoftDeleteFilter(
      supabase.from('tour_names').select('*').eq('company_id', companyId),
      'tour_names'
    ),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (typesResult.error) throw typesResult.error;
  if (toursResult.error) throw toursResult.error;

  const establishmentTypeNames = new Map<string, string>(
    (typesResult.data ?? []).map((type: EstablishmentType) => [type.id, type.name])
  );
  const tourNames = new Map<string, string>(
    (toursResult.data ?? []).map((tour: TourName) => [tour.id, tour.name])
  );

  return {
    clients: (clientsResult.data ?? []).map(mapClient),
    establishmentTypeNames,
    tourNames,
  };
}

export function resolveCatalogClientIds(
  catalog: DashboardClientCatalogEntry[],
  filters: {
    clientIds: string[];
    departments: string[];
    establishmentTypeIds: string[];
    tourIds: string[];
  }
): string[] {
  let pool = catalog;

  if (filters.departments.length > 0) {
    pool = pool.filter((client) => client.department && filters.departments.includes(client.department));
  }
  if (filters.tourIds.length > 0) {
    pool = pool.filter((client) => client.tourId && filters.tourIds.includes(client.tourId));
  }
  if (filters.establishmentTypeIds.length > 0) {
    pool = pool.filter(
      (client) =>
        client.establishmentTypeId &&
        filters.establishmentTypeIds.includes(client.establishmentTypeId)
    );
  }
  if (filters.clientIds.length > 0) {
    pool = pool.filter((client) => filters.clientIds.includes(client.id));
  }

  return pool.map((client) => client.id);
}
