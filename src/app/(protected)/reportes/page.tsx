'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://inmobiliaria-mgr.emergent.host/api';

type ReportType = 'summary' | 'byYear' | 'comparison' | 'projection' | 'oldReservations' | 'typology' | 'parkingStorage';

interface SummaryReport {
  totalProjects: number;
  totalUnits: number;
  totalSold: number;
  soldPercentage: number;
  byStatus: {
    disponible: number;
    reservado: number;
    promesa: number;
    escriturado: number;
  };
  totalValueUF: number;
  soldValueUF: number;
  availableValueUF: number;
}

interface MonthlyData {
  reservas: number;
  promesas: number;
  escrituras: number;
  total_value: number;
}

interface YearReport {
  year: number;
  total_sales: number;
  total_value_uf: number;
  monthly: Record<string, MonthlyData>;
}

interface YearComparison {
  year1: { year: number; month?: number; totalSales: number; totalValue: number };
  year2: { year: number; month?: number; totalSales: number; totalValue: number };
  variation: { salesPercentage: number; valuePercentage: number };
}

interface ProjectionReport {
  velocity: { monthlySales: number; monthlyValueUF: number };
  remaining: { units: number; valueUF: number };
  projection: { monthsToCompletion: number | null; projectedCompletionDate: string | null };
}

interface OldReservation {
  saleId: string;
  projectName: string;
  unitNumber: string;
  buyerName: string | null;
  daysOld: number;
  listPrice: number | null;
  reservationNumber: string | null;
}

interface OldReservationsReport {
  count: number;
  totalValueAtRisk: number;
  reservations: OldReservation[];
}

interface TypologyData {
  total: number;
  vendido: number;
  disponible: number;
  soldPercentage: number;
}

interface GlobalTypologyReport {
  typologies: Record<string, TypologyData>;
}

interface ParkingStorageProject {
  project_id: string;
  project_name: string;
  deptos_available: number;
  parking_available: number;
  parking_surplus: number;
  parking_surplus_value: number;
  storage_available: number;
  storage_surplus: number;
  storage_surplus_value: number;
}

interface ParkingStorageAnalysis {
  by_project: ParkingStorageProject[];
  totals: {
    deptos_available: number;
    parking_available: number;
    parking_surplus: number;
    parking_surplus_value: number;
    storage_available: number;
    storage_surplus: number;
    storage_surplus_value: number;
  };
}

const reportTypes: { id: ReportType; name: string }[] = [
  { id: 'summary', name: 'Resumen' },
  { id: 'byYear', name: 'Por Año' },
  { id: 'comparison', name: 'Comparativo' },
  { id: 'projection', name: 'Proyección' },
  { id: 'oldReservations', name: 'Reservas Antiguas' },
  { id: 'typology', name: 'Por Tipología' },
  { id: 'parkingStorage', name: 'Est/Bodegas' },
];

export default function ReportesPage() {
  const { projects } = useAppStore();
  const [selectedReport, setSelectedReport] = useState<ReportType>('summary');
  const [isLoading, setIsLoading] = useState(true);

  // Report states
  const [summaryReport, setSummaryReport] = useState<SummaryReport | null>(null);
  const [yearReport, setYearReport] = useState<YearReport | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonReport, setComparisonReport] = useState<YearComparison | null>(null);
  const [compYear1, setCompYear1] = useState(new Date().getFullYear() - 1);
  const [compMonth1, setCompMonth1] = useState<number | null>(null);
  const [compYear2, setCompYear2] = useState(new Date().getFullYear());
  const [compMonth2, setCompMonth2] = useState<number | null>(null);
  const [projectionReport, setProjectionReport] = useState<ProjectionReport | null>(null);
  const [oldReservationsReport, setOldReservationsReport] = useState<OldReservationsReport | null>(null);
  const [monthsThreshold, setMonthsThreshold] = useState(2);
  const [typologyReport, setTypologyReport] = useState<GlobalTypologyReport | null>(null);
  const [parkingReport, setParkingReport] = useState<ParkingStorageAnalysis | null>(null);

  const formatUF = (value: number) => {
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value);
  };

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i);

  useEffect(() => {
    loadReport();
  }, [selectedReport, selectedYear, monthsThreshold, compYear1, compMonth1, compYear2, compMonth2]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      switch (selectedReport) {
        case 'summary':
          // Load topographic data from all projects to get correct stats
          const projectsRes = await fetch(`${API_BASE}/projects`);
          const projectsList = await projectsRes.json();
          
          let totalStats = { disponible: 0, reservado: 0, promesa: 0, escriturado: 0 };
          let totalValueUF = 0;
          let soldValueUF = 0;
          let availableValueUF = 0;
          
          // Load topographic data for each project
          for (const project of projectsList) {
            try {
              const topoRes = await fetch(`${API_BASE}/projects/${project.id}/topographic`);
              const topoData = await topoRes.json();
              const stats = topoData.statistics || {};
              
              totalStats.disponible += stats.disponible || 0;
              totalStats.reservado += stats.reservado || 0;
              totalStats.promesa += stats.promesa || 0;
              totalStats.escriturado += stats.escriturado || 0;
              
              // Calculate values from floors data
              if (topoData.floors) {
                Object.values(topoData.floors).forEach((units: any) => {
                  units.forEach((unit: any) => {
                    const price = unit.list_price || 0;
                    totalValueUF += price;
                    if (unit.status === 'disponible') {
                      availableValueUF += price;
                    } else if (unit.status !== 'bloqueado') {
                      soldValueUF += price;
                    }
                  });
                });
              }
            } catch (e) {
              console.error(`Error loading topo for ${project.name}:`, e);
            }
          }
          
          const totalUnits = totalStats.disponible + totalStats.reservado + totalStats.promesa + totalStats.escriturado;
          const totalSold = totalStats.reservado + totalStats.promesa + totalStats.escriturado;
          const soldPercentage = totalUnits > 0 ? Math.round((totalSold / totalUnits) * 100) : 0;
          
          setSummaryReport({
            totalProjects: projectsList.length,
            totalUnits,
            totalSold,
            soldPercentage,
            byStatus: totalStats,
            totalValueUF,
            soldValueUF,
            availableValueUF,
          });
          break;

        case 'byYear':
          const yearRes = await fetch(`${API_BASE}/reports/by-year?year=${selectedYear}`);
          const yearData = await yearRes.json();
          setYearReport(yearData);
          break;

        case 'comparison':
          // Use the new period-comparison endpoint that properly supports months
          const period1 = compMonth1 !== null ? String(compMonth1) : 'full';
          const period2 = compMonth2 !== null ? String(compMonth2) : 'full';
          const compUrl = `${API_BASE}/reports/period-comparison?year1=${compYear1}&period1=${period1}&year2=${compYear2}&period2=${period2}`;
          
          const compRes = await fetch(compUrl);
          const compData = await compRes.json();
          
          setComparisonReport({
            year1: { 
              year: compData.period1?.year || compYear1, 
              month: compMonth1 ?? undefined,
              totalSales: compData.period1?.total_sales || 0, 
              totalValue: compData.period1?.total_value || 0 
            },
            year2: { 
              year: compData.period2?.year || compYear2, 
              month: compMonth2 ?? undefined,
              totalSales: compData.period2?.total_sales || 0, 
              totalValue: compData.period2?.total_value || 0 
            },
            variation: { 
              salesPercentage: compData.variation?.sales_percentage || 0, 
              valuePercentage: compData.variation?.value_percentage || 0 
            },
          });
          break;

        case 'projection':
          const projRes = await fetch(`${API_BASE}/reports/projection`);
          const projData = await projRes.json();
          setProjectionReport({
            velocity: { monthlySales: projData.velocity?.monthly_sales || 0, monthlyValueUF: projData.velocity?.monthly_value_uf || 0 },
            remaining: { units: projData.remaining?.units || 0, valueUF: projData.remaining?.value_uf || 0 },
            projection: { monthsToCompletion: projData.projection?.months_to_completion, projectedCompletionDate: projData.projection?.projected_completion_date },
          });
          break;

        case 'oldReservations':
          const oldRes = await fetch(`${API_BASE}/reports/stale-reservations?days=${monthsThreshold * 30}`);
          const oldData = await oldRes.json();
          setOldReservationsReport({
            count: oldData.count || 0,
            totalValueAtRisk: oldData.reservations?.reduce((sum: number, r: any) => sum + (r.list_price || 0), 0) || 0,
            reservations: (oldData.reservations || []).map((r: any) => ({
              saleId: r.id,
              projectName: r.project_name,
              unitNumber: r.unit_number,
              buyerName: r.buyer_name,
              daysOld: r.days_since_reservation,
              listPrice: r.list_price,
              reservationNumber: r.reservation_number,
            })),
          });
          break;

        case 'typology':
          const typoRes = await fetch(`${API_BASE}/reports/by-typology-global`);
          const typoData = await typoRes.json();
          setTypologyReport({ typologies: typoData.typologies || {} });
          break;

        case 'parkingStorage':
          const parkRes = await fetch(`${API_BASE}/reports/parking-storage-analysis`);
          const parkData = await parkRes.json();
          setParkingReport(parkData);
          break;
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSummaryReport = () => {
    if (!summaryReport) return null;
    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-blue-600 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-2xl font-bold">{summaryReport.totalProjects}</p>
            <p className="text-sm text-gray-500">Proyectos</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-purple-600 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold">{summaryReport.totalUnits}</p>
            <p className="text-sm text-gray-500">Unidades</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-green-600 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold">{summaryReport.totalSold}</p>
            <p className="text-sm text-gray-500">Vendidas</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-orange-600 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="text-2xl font-bold">{summaryReport.soldPercentage}%</p>
            <p className="text-sm text-gray-500">% Vendido</p>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Distribución por Estado</h3>
          <div className="space-y-3">
            {[
              { label: 'Disponibles', count: summaryReport.byStatus.disponible, color: 'bg-gray-400' },
              { label: 'Reservados', count: summaryReport.byStatus.reservado, color: 'bg-yellow-500' },
              { label: 'Promesas', count: summaryReport.byStatus.promesa, color: 'bg-green-500' },
              { label: 'Escriturados', count: summaryReport.byStatus.escriturado, color: 'bg-blue-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-gray-700">{item.label}</span>
                </div>
                <span className="font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Value Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Valor en UF</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total</span>
              <span className="font-bold">UF {formatUF(summaryReport.totalValueUF)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vendido</span>
              <span className="font-bold text-green-600">UF {formatUF(summaryReport.soldValueUF)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Disponible</span>
              <span className="font-bold">UF {formatUF(summaryReport.availableValueUF)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderYearReport = () => {
    if (!yearReport) return null;
    return (
      <div className="space-y-6">
        {/* Year Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                selectedYear === year
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Year Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Resumen {yearReport.year}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{yearReport.total_sales}</p>
              <p className="text-sm text-gray-500">Ventas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">UF {formatUF(yearReport.total_value_uf)}</p>
              <p className="text-sm text-gray-500">Valor Total</p>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Ventas por Mes</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm text-gray-500">Mes</th>
                  <th className="text-center py-2 text-sm text-gray-500">Reservas</th>
                  <th className="text-center py-2 text-sm text-gray-500">Promesas</th>
                  <th className="text-center py-2 text-sm text-gray-500">Escrituras</th>
                  <th className="text-right py-2 text-sm text-gray-500">Valor UF</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(yearReport.monthly)
                  .filter(([_, data]) => data.reservas > 0 || data.promesas > 0 || data.escrituras > 0)
                  .map(([month, data]) => (
                    <tr key={month} className="border-b last:border-0">
                      <td className="py-3 font-medium">{monthNames[parseInt(month) - 1]}</td>
                      <td className="text-center">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                          {data.reservas}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {data.promesas}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {data.escrituras}
                        </span>
                      </td>
                      <td className="text-right font-medium">UF {formatUF(data.total_value)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderComparisonReport = () => {
    if (!comparisonReport) return null;
    const { year1, year2, variation } = comparisonReport;
    
    const formatPeriodLabel = (year: number, month?: number) => {
      if (month !== undefined) {
        return `${monthNames[month - 1]} ${year}`;
      }
      return `${year}`;
    };
    
    return (
      <div className="space-y-4">
        {/* Period Selectors - Mobile optimized */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Seleccionar Períodos</h3>
          <div className="space-y-3">
            {/* Period 1 */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Período 1</p>
              <div className="flex gap-2">
                <select
                  value={compYear1}
                  onChange={(e) => setCompYear1(parseInt(e.target.value))}
                  className="flex-1 px-2 py-2 border rounded-lg text-sm"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={compMonth1 ?? ''}
                  onChange={(e) => setCompMonth1(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 px-2 py-2 border rounded-lg text-sm"
                >
                  <option value="">Año completo</option>
                  {monthNames.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Period 2 */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Período 2</p>
              <div className="flex gap-2">
                <select
                  value={compYear2}
                  onChange={(e) => setCompYear2(parseInt(e.target.value))}
                  className="flex-1 px-2 py-2 border rounded-lg text-sm"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={compMonth2 ?? ''}
                  onChange={(e) => setCompMonth2(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 px-2 py-2 border rounded-lg text-sm"
                >
                  <option value="">Año completo</option>
                  {monthNames.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Results - Vertical layout for mobile */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <p className="text-sm font-semibold text-gray-600">{formatPeriodLabel(year1.year, year1.month)}</p>
              <p className="text-2xl font-bold text-blue-600">{year1.totalSales}</p>
              <p className="text-xs text-gray-500">ventas</p>
            </div>
            
            <div className="px-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
            
            <div className="text-center flex-1">
              <p className="text-sm font-semibold text-gray-600">{formatPeriodLabel(year2.year, year2.month)}</p>
              <p className="text-2xl font-bold text-blue-600">{year2.totalSales}</p>
              <p className="text-xs text-gray-500">ventas</p>
            </div>
          </div>
          
          {/* Variation badge */}
          <div className="text-center pt-3 border-t">
            <span className={`inline-block px-4 py-2 rounded-full text-lg font-bold ${variation.salesPercentage >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {variation.salesPercentage >= 0 ? '+' : ''}{variation.salesPercentage.toFixed(1)}%
            </span>
            <p className="text-xs text-gray-500 mt-1">Variación en ventas</p>
          </div>
        </div>

        {/* Value Variation */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Variación en Valor</h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Valor UF</span>
            <span className={`font-bold ${variation.valuePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {variation.valuePercentage >= 0 ? '+' : ''}{variation.valuePercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectionReport = () => {
    if (!projectionReport) return null;
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Velocidad de Ventas</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Ventas mensuales</span>
              <span className="font-bold">{projectionReport.velocity.monthlySales.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valor mensual</span>
              <span className="font-bold">UF {formatUF(projectionReport.velocity.monthlyValueUF)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Inventario Disponible</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Unidades</span>
              <span className="font-bold">{projectionReport.remaining.units}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valor</span>
              <span className="font-bold">UF {formatUF(projectionReport.remaining.valueUF)}</span>
            </div>
          </div>
        </div>

        {projectionReport.projection.monthsToCompletion && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Proyección de Cierre</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Meses restantes</span>
                <span className="font-bold text-blue-600">{projectionReport.projection.monthsToCompletion.toFixed(1)}</span>
              </div>
              {projectionReport.projection.projectedCompletionDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha estimada</span>
                  <span className="font-bold text-green-600">
                    {new Date(projectionReport.projection.projectedCompletionDate).toLocaleDateString('es-CL')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOldReservationsReport = () => {
    if (!oldReservationsReport) return null;
    
    // Group by project
    const byProject: Record<string, OldReservation[]> = {};
    oldReservationsReport.reservations.forEach((r) => {
      if (!byProject[r.projectName]) byProject[r.projectName] = [];
      byProject[r.projectName].push(r);
    });

    return (
      <div className="space-y-6">
        {/* Threshold Selector */}
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <span className="text-gray-700">Antigüedad: {monthsThreshold} meses</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMonthsThreshold(Math.max(1, monthsThreshold - 1))}
              className="px-3 py-1 bg-gray-200 rounded-lg"
            >
              -
            </button>
            <button
              onClick={() => setMonthsThreshold(Math.min(12, monthsThreshold + 1))}
              className="px-3 py-1 bg-gray-200 rounded-lg"
            >
              +
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">📊 Resumen General</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Reservas en riesgo</p>
              <p className="text-3xl font-bold text-orange-600">{oldReservationsReport.count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Valor en riesgo</p>
              <p className="text-2xl font-bold text-red-600">UF {formatUF(oldReservationsReport.totalValueAtRisk)}</p>
            </div>
          </div>
        </div>

        {/* By Project */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Por Proyecto</h3>
          {Object.entries(byProject).map(([projectName, reservations]) => {
            const totalValue = reservations.reduce((sum, r) => sum + (r.listPrice || 0), 0);
            const avgDays = Math.round(reservations.reduce((sum, r) => sum + r.daysOld, 0) / reservations.length);
            
            return (
              <div key={projectName} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{projectName}</h4>
                    <p className="text-sm text-gray-500">{reservations.length} reservas · ~{avgDays} días</p>
                  </div>
                  <span className="text-orange-600 font-bold">UF {formatUF(totalValue)}</span>
                </div>
                <div className="space-y-2">
                  {reservations.slice(0, 5).map((r) => (
                    <div key={r.saleId} className="flex justify-between items-center text-sm py-1 border-t">
                      <div>
                        <span className="font-medium">Depto {r.unitNumber}</span>
                        <span className="text-gray-500 ml-2">{r.buyerName || 'Sin nombre'}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        r.daysOld > 90 ? 'bg-red-100 text-red-700' :
                        r.daysOld > 60 ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.daysOld} días
                      </span>
                    </div>
                  ))}
                  {reservations.length > 5 && (
                    <p className="text-sm text-gray-400 text-center pt-2">
                      +{reservations.length - 5} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTypologyReport = () => {
    if (!typologyReport || !typologyReport.typologies) return null;
    const typologies = typologyReport.typologies;
    
    return (
      <div className="space-y-4">
        {Object.entries(typologies)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, data]: [string, any]) => (
            <div key={name} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-800">{name}</h4>
                <span className="text-sm text-gray-500">{data.total} unidades</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${data.sold_percentage || 0}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-gray-500">Vendidas</p>
                  <p className="font-bold text-green-600">{data.vendido || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Disponibles</p>
                  <p className="font-bold">{data.disponible || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">% Vendido</p>
                  <p className="font-bold text-blue-600">{(data.sold_percentage || 0).toFixed(1)}%</p>
                </div>
              </div>
              {data.total_value > 0 && (
                <div className="mt-3 pt-3 border-t text-sm text-gray-500">
                  Valor total: UF {formatUF(data.total_value)} | Vendido: UF {formatUF(data.sold_value)}
                </div>
              )}
            </div>
          ))}
      </div>
    );
  };

  const renderParkingStorageReport = () => {
    if (!parkingReport) return null;
    const { totals, by_project } = parkingReport;
    return (
      <div className="space-y-6">
        {/* Totals */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Resumen General</h3>
          
          <div className="mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Deptos Disponibles:</span>
              <span className="font-bold">{totals.deptos_available}</span>
            </div>
          </div>

          <div className="border-t pt-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-600">🚗</span>
              <span className="font-medium">Estacionamientos</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Disponibles:</span>
                <span className="font-medium">{totals.parking_available}</span>
              </div>
              <div className="flex justify-between">
                <span>{totals.parking_surplus >= 0 ? 'Superávit:' : 'Déficit:'}</span>
                <span className={`font-bold ${totals.parking_surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(totals.parking_surplus)}
                </span>
              </div>
              {totals.parking_surplus_value > 0 && (
                <div className="flex justify-between">
                  <span>Valor Superávit:</span>
                  <span className="font-bold text-green-600">UF {formatUF(totals.parking_surplus_value)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-orange-600">📦</span>
              <span className="font-medium">Bodegas</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Disponibles:</span>
                <span className="font-medium">{totals.storage_available}</span>
              </div>
              <div className="flex justify-between">
                <span>{totals.storage_surplus >= 0 ? 'Superávit:' : 'Déficit:'}</span>
                <span className={`font-bold ${totals.storage_surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(totals.storage_surplus)}
                </span>
              </div>
              {totals.storage_surplus_value > 0 && (
                <div className="flex justify-between">
                  <span>Valor Superávit:</span>
                  <span className="font-bold text-green-600">UF {formatUF(totals.storage_surplus_value)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* By Project */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800">Por Proyecto</h3>
          {by_project.map((project) => (
            <div key={project.project_id} className="bg-white rounded-xl p-4 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3">{project.project_name}</h4>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-2xl font-bold">{project.deptos_available}</p>
                  <p className="text-gray-500">Deptos</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-bold">{project.parking_available}</span>
                    <span className={`text-xs ${project.parking_surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({project.parking_surplus >= 0 ? '+' : ''}{project.parking_surplus})
                    </span>
                  </div>
                  <p className="text-gray-500">Est.</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-bold">{project.storage_available}</span>
                    <span className={`text-xs ${project.storage_surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({project.storage_surplus >= 0 ? '+' : ''}{project.storage_surplus})
                    </span>
                  </div>
                  <p className="text-gray-500">Bod.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (selectedReport) {
      case 'summary': return renderSummaryReport();
      case 'byYear': return renderYearReport();
      case 'comparison': return renderComparisonReport();
      case 'projection': return renderProjectionReport();
      case 'oldReservations': return renderOldReservationsReport();
      case 'typology': return renderTypologyReport();
      case 'parkingStorage': return renderParkingStorageReport();
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>

      {/* Report Type Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {reportTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedReport(type.id)}
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition ${
              selectedReport === type.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type.name}
          </button>
        ))}
      </div>

      {/* Report Content */}
      {renderReport()}
    </div>
  );
}
