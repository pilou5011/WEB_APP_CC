'use client';



import { RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Label } from '@/components/ui/label';

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from '@/components/ui/select';

import { DashboardFilterMultiSelect } from '@/components/dashboard/dashboard-filter-multi-select';

import { DashboardRevenueFilter } from '@/components/dashboard/dashboard-revenue-filter';

import { useDashboardFilters } from '@/components/dashboard/dashboard-filter-provider';

import {
  hasActiveDashboardFilters,
  resolveFiscalYearSelectValue,
  FISCAL_YEAR_FILTER_ALL,
  isRevenueFilterActive,
} from '@/lib/dashboard/filters';
import { formatDashboardCurrency } from '@/lib/dashboard';



export function DashboardFilters() {

  const {

    filters,

    linkedOptions,

    optionsLoading,

    filterScopeLoading,

    setClientIds,

    setDepartments,

    setEstablishmentTypeIds,

    setTourIds,

    setFiscalYearKey,

    setRevenueFilter,

    resetFilters,

  } = useDashboardFilters();



  const active = hasActiveDashboardFilters(filters);

  const fiscalYearSelectValue = resolveFiscalYearSelectValue(

    filters.fiscalYearKey,

    linkedOptions.fiscalYears

  );

  const filtersDisabled = optionsLoading || filterScopeLoading;



  return (

    <Card className="border-slate-200 shadow-sm">

      <CardHeader className="pb-3">

        <div className="flex flex-wrap items-start justify-between gap-2">

          <div>

            <CardTitle className="text-lg">Filtres</CardTitle>

            <CardDescription>

              Filtres appliqués uniquement aux graphiques de performance commerciale.

            </CardDescription>

          </div>

          <Button

            id="reset_filters"

            type="button"

            variant="outline"

            size="sm"

            onClick={resetFilters}

            disabled={!active}

          >

            <RotateCcw className="mr-1 h-3 w-3" />

            Réinitialiser les filtres

          </Button>

        </div>

      </CardHeader>

      <CardContent className="space-y-4">

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

          <DashboardFilterMultiSelect

            label="Clients"

            placeholder="Tous les clients"

            searchPlaceholder="Rechercher un client..."

            options={linkedOptions.clients}

            selectedValues={filters.clientIds}

            onChange={setClientIds}

            disabled={filtersDisabled}

          />

          <DashboardFilterMultiSelect

            label="Département"

            placeholder="Tous les départements"

            searchPlaceholder="Rechercher un département..."

            options={linkedOptions.departments}

            selectedValues={filters.departments}

            onChange={setDepartments}

            disabled={filtersDisabled}

          />

          <DashboardFilterMultiSelect

            label="Type d'établissement"

            placeholder="Tous les types"

            searchPlaceholder="Rechercher un type..."

            options={linkedOptions.establishmentTypes}

            selectedValues={filters.establishmentTypeIds}

            onChange={setEstablishmentTypeIds}

            disabled={filtersDisabled}

          />

          <DashboardFilterMultiSelect

            label="Tournée"

            placeholder="Toutes les tournées"

            searchPlaceholder="Rechercher une tournée..."

            options={linkedOptions.tours}

            selectedValues={filters.tourIds}

            onChange={setTourIds}

            disabled={filtersDisabled}

          />



          <div className="space-y-1.5">

            <Label className="text-sm font-medium">Exercice comptable</Label>

            <Select

              value={fiscalYearSelectValue}

              onValueChange={(value) =>

                setFiscalYearKey(value === FISCAL_YEAR_FILTER_ALL ? null : value)

              }

              disabled={filtersDisabled}

            >

              <SelectTrigger>

                <SelectValue placeholder="Tous les exercices" />

              </SelectTrigger>

              <SelectContent>

                {linkedOptions.fiscalYears.map((option) => (

                  <SelectItem key={option.value} value={option.value}>

                    {option.label}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>



          <DashboardRevenueFilter
            operator={filters.revenueOperator}
            amount={filters.revenueAmount}
            disabled={optionsLoading}
            onChange={setRevenueFilter}
          />

        </div>



        {active && (

          <div className="flex flex-wrap gap-2">

            {filters.clientIds.length > 0 && (

              <Badge variant="secondary">{filters.clientIds.length} client(s)</Badge>

            )}

            {filters.departments.length > 0 && (

              <Badge variant="secondary">{filters.departments.length} département(s)</Badge>

            )}

            {filters.establishmentTypeIds.length > 0 && (

              <Badge variant="secondary">{filters.establishmentTypeIds.length} type(s)</Badge>

            )}

            {filters.tourIds.length > 0 && (

              <Badge variant="secondary">{filters.tourIds.length} tournée(s)</Badge>

            )}

            {filters.fiscalYearKey && (

              <Badge variant="secondary">

                {linkedOptions.fiscalYears.find((option) => option.value === filters.fiscalYearKey)

                  ?.label ?? 'Exercice sélectionné'}

              </Badge>

            )}

            {isRevenueFilterActive(filters) && filters.revenueAmount !== null && (

              <Badge variant="secondary">

                CA HT {filters.revenueOperator === 'gt' ? '>' : '<'}{' '}

                {formatDashboardCurrency(filters.revenueAmount)}

              </Badge>

            )}

          </div>

        )}

      </CardContent>

    </Card>

  );

}


