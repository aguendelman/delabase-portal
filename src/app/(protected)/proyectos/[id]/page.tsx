'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, TopographicData, Unit } from '@/lib/api';

type TabType = 'topographic' | 'typology';

interface TypologyStat {
  typology: string;
  total: number;
  sold: number;
  available: number;
  soldPercentage: number;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<TopographicData | null>(null);
  const [unitsData, setUnitsData] = useState<Record<string, Unit>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<TabType>('topographic');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!params.id) return;
      setIsLoading(true);
      try {
        // Load topographic data
        const topoData = await api.getTopographicData(params.id as string);
        setData(topoData);
        
        // Load units data for surface info
        try {
          const units = await api.getProjectUnits(params.id as string);
          const unitsMap: Record<string, Unit> = {};
          units.forEach(unit => {
            unitsMap[String(unit.unit_number)] = unit;
          });
          setUnitsData(unitsMap);
        } catch (e) {
          console.error('Error loading units:', e);
        }
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [params.id]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'disponible': return 'bg-gray-400';
      case 'reservado': return 'bg-yellow-500';
      case 'promesa': return 'bg-green-500';
      case 'escriturado': return 'bg-blue-500';
      case 'bloqueado': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'disponible': return 'Disponible';
      case 'reservado': return 'Reservado';
      case 'promesa': return 'Promesa';
      case 'escriturado': return 'Escriturado';
      case 'bloqueado': return 'Bloqueado';
      default: return status;
    }
  };

  const formatUF = (value: number | undefined) => {
    if (!value) return 'N/A';
    return `UF ${new Intl.NumberFormat('es-CL').format(value)}`;
  };

  const calculateTypologyStats = (): TypologyStat[] => {
    if (!data?.floors) return [];
    
    const stats: Record<string, { total: number; sold: number }> = {};
    
    Object.values(data.floors).forEach(units => {
      units.forEach(unit => {
        const typology = unit.unit_type || 'Sin tipo';
        if (!stats[typology]) {
          stats[typology] = { total: 0, sold: 0 };
        }
        stats[typology].total += 1;
        if (unit.status !== 'disponible' && unit.status !== 'bloqueado') {
          stats[typology].sold += 1;
        }
      });
    });

    return Object.entries(stats)
      .map(([typology, { total, sold }]) => ({
        typology,
        total,
        sold,
        available: total - sold,
        soldPercentage: total > 0 ? (sold / total) * 100 : 0,
      }))
      .sort((a, b) => a.typology.localeCompare(b.typology));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No se pudieron cargar los datos</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Volver
        </button>
      </div>
    );
  }

  const floors = Object.entries(data.floors || {}).sort(([a], [b]) => parseInt(b) - parseInt(a));
  const typologyStats = calculateTypologyStats();

  return (
    <div className="space-y-6">
      {/* Unit Detail Modal */}
      {selectedUnit && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUnit(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`${getStatusColor(selectedUnit.status)} p-4 rounded-t-2xl`}>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">Depto {selectedUnit.unit_number}</h2>
                  <p className="text-white text-opacity-90">{data.project?.name}</p>
                </div>
                <button 
                  onClick={() => setSelectedUnit(null)}
                  className="text-white text-opacity-80 hover:text-opacity-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-2">
                <span className="inline-block bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {getStatusLabel(selectedUnit.status)}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Unit Info Section */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Información de la Unidad</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Número</p>
                    <p className="text-lg font-bold text-gray-800">{selectedUnit.unit_number}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Piso</p>
                    <p className="text-lg font-bold text-gray-800">{selectedUnit.floor || Math.floor(Number(selectedUnit.unit_number) / 100)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Línea</p>
                    <p className="text-lg font-bold text-gray-800">{selectedUnit.line || String(selectedUnit.unit_number).slice(-2)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Tipo</p>
                    <p className="text-lg font-bold text-gray-800">{selectedUnit.unit_type || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Orientación</p>
                    <p className="text-lg font-bold text-gray-800">{selectedUnit.orientation || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Estado</p>
                    <p className="text-lg font-bold text-gray-800">{getStatusLabel(selectedUnit.status).charAt(0)}</p>
                  </div>
                </div>
              </div>

              {/* Surface Info Section */}
              {(() => {
                const unitDetails = unitsData[String(selectedUnit.unit_number)];
                if (!unitDetails?.surface_total && !unitDetails?.surface_util) return null;
                
                return (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Superficies</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {unitDetails.surface_total && (
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Sup. Total</p>
                          <p className="text-lg font-bold text-blue-700">{unitDetails.surface_total.toFixed(1)} m²</p>
                        </div>
                      )}
                      {unitDetails.surface_util && (
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Sup. Interior</p>
                          <p className="text-lg font-bold text-blue-700">{unitDetails.surface_util.toFixed(1)} m²</p>
                        </div>
                      )}
                      {unitDetails.surface_terrace && unitDetails.surface_terrace > 0 && (
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Terraza</p>
                          <p className="text-lg font-bold text-green-700">{unitDetails.surface_terrace.toFixed(1)} m²</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Bedrooms and Bathrooms from unit_type */}
                    {selectedUnit.unit_type && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Dormitorios</p>
                          <p className="text-lg font-bold text-gray-800">
                            {selectedUnit.unit_type.match(/(\d)D/)?.[1] || '-'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Baños</p>
                          <p className="text-lg font-bold text-gray-800">
                            {selectedUnit.unit_type.match(/(\d)B/)?.[1] || '-'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Price Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">Precio</h3>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500">Precio Lista</p>
                  <p className="text-2xl font-bold text-green-700">{formatUF(selectedUnit.list_price)}</p>
                </div>
              </div>

              {/* Sale Info (if sold) */}
              {selectedUnit.sale && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Información de Venta</h3>
                  
                  {selectedUnit.sale.buyer_name && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500">Comprador</p>
                      <p className="font-medium text-gray-800">{selectedUnit.sale.buyer_name}</p>
                      {selectedUnit.sale.buyer_rut && (
                        <p className="text-sm text-gray-500">RUT: {selectedUnit.sale.buyer_rut}</p>
                      )}
                    </div>
                  )}

                  {selectedUnit.sale.reservation_number && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500">N° Reserva</p>
                      <p className="font-medium text-gray-800">#{selectedUnit.sale.reservation_number}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {selectedUnit.sale.reservation_date && (
                      <div>
                        <p className="text-xs text-gray-500">Fecha Reserva</p>
                        <p className="font-medium text-gray-800">
                          {new Date(selectedUnit.sale.reservation_date).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    )}
                    {selectedUnit.sale.promise_date && (
                      <div>
                        <p className="text-xs text-gray-500">Fecha Promesa</p>
                        <p className="font-medium text-gray-800">
                          {new Date(selectedUnit.sale.promise_date).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    )}
                    {selectedUnit.sale.deed_date && (
                      <div>
                        <p className="text-xs text-gray-500">Fecha Escritura</p>
                        <p className="font-medium text-gray-800">
                          {new Date(selectedUnit.sale.deed_date).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Price Info */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {selectedUnit.sale.list_price && (
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Lista</p>
                        <p className="text-sm font-bold text-gray-800">{formatUF(selectedUnit.sale.list_price)}</p>
                      </div>
                    )}
                    {selectedUnit.sale.discount && selectedUnit.sale.discount > 0 && (
                      <div className="bg-red-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Dcto</p>
                        <p className="text-sm font-bold text-red-600">-{formatUF(selectedUnit.sale.discount)}</p>
                      </div>
                    )}
                    {selectedUnit.sale.net_price && (
                      <div className="bg-green-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Neto</p>
                        <p className="text-sm font-bold text-green-600">{formatUF(selectedUnit.sale.net_price)}</p>
                      </div>
                    )}
                  </div>

                  {/* Parking & Storage */}
                  {(selectedUnit.sale.parking_1 || selectedUnit.sale.parking_2 || selectedUnit.sale.storage) && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {selectedUnit.sale.parking_1 && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          🚗 Est. {selectedUnit.sale.parking_1}
                        </span>
                      )}
                      {selectedUnit.sale.parking_2 && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          🚗 Est. {selectedUnit.sale.parking_2}
                        </span>
                      )}
                      {selectedUnit.sale.storage && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
                          📦 Bod. {selectedUnit.sale.storage}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Seller */}
                  {selectedUnit.sale.seller && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">Vendedor</p>
                      <p className="font-medium text-gray-800">{selectedUnit.sale.seller}</p>
                    </div>
                  )}
                </div>
              )}

              {/* No sale info message for available units */}
              {!selectedUnit.sale && selectedUnit.status === 'disponible' && (
                <div className="border-t pt-4 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <p>Unidad disponible para venta</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t">
              <button
                onClick={() => setSelectedUnit(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{data.project?.name}</h1>
          <p className="text-gray-500">{data.project?.location}</p>
        </div>
      </div>

      {/* Stats Summary - Clickable filters */}
      <div className="grid grid-cols-6 gap-2">
        {/* "Todos" button */}
        <button
          onClick={() => setStatusFilter(null)}
          className={`bg-white rounded-lg p-3 shadow-sm text-center transition hover:shadow-md ${
            statusFilter === null ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-blue-600 mx-auto mb-2"></div>
          <p className="text-xl font-bold text-gray-800">
            {(data.statistics?.disponible || 0) + (data.statistics?.reservado || 0) + 
             (data.statistics?.promesa || 0) + (data.statistics?.escriturado || 0) + 
             (data.statistics?.bloqueado || 0)}
          </p>
          <p className="text-xs text-gray-500">Todos</p>
        </button>
        {[
          { label: 'Disponible', value: data.statistics?.disponible || 0, color: 'bg-gray-400', status: 'disponible' },
          { label: 'Reservado', value: data.statistics?.reservado || 0, color: 'bg-yellow-500', status: 'reservado' },
          { label: 'Promesa', value: data.statistics?.promesa || 0, color: 'bg-green-500', status: 'promesa' },
          { label: 'Escriturado', value: data.statistics?.escriturado || 0, color: 'bg-blue-500', status: 'escriturado' },
          { label: 'Bloqueado', value: data.statistics?.bloqueado || 0, color: 'bg-red-500', status: 'bloqueado' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setStatusFilter(statusFilter === stat.status ? null : stat.status)}
            className={`bg-white rounded-lg p-3 shadow-sm text-center transition hover:shadow-md ${
              statusFilter === stat.status ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${stat.color} mx-auto mb-2`}></div>
            <p className="text-xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Filter indicator */}
      {statusFilter && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-blue-800">
            Mostrando solo: <strong>{getStatusLabel(statusFilter)}</strong>
          </span>
          <button
            onClick={() => setStatusFilter(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex space-x-2">
        <button
          onClick={() => setSelectedTab('topographic')}
          className={`px-4 py-2 rounded-full font-medium transition ${
            selectedTab === 'topographic'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Topográfico
        </button>
        <button
          onClick={() => setSelectedTab('typology')}
          className={`px-4 py-2 rounded-full font-medium transition ${
            selectedTab === 'typology'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Por Tipología
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === 'topographic' ? (
        /* Topographic View */
        <div className="bg-white rounded-xl shadow-sm p-4 overflow-x-auto">
          <p className="text-sm text-gray-500 mb-4">Haz clic en un departamento para ver más información</p>
          <div className="min-w-fit">
            {floors.map(([floor, units]) => {
              const sortedUnits = [...units].sort((a, b) => {
                const numA = typeof a.unit_number === 'string' ? parseInt(a.unit_number) : a.unit_number;
                const numB = typeof b.unit_number === 'string' ? parseInt(b.unit_number) : b.unit_number;
                return numA - numB;
              });

              // Filter units by status if a filter is active
              const filteredUnits = statusFilter 
                ? sortedUnits.filter(u => u.status?.toLowerCase() === statusFilter)
                : sortedUnits;

              // Skip floor if no units match the filter
              if (statusFilter && filteredUnits.length === 0) return null;

              return (
                <div key={floor} className="flex items-center mb-2">
                  <div className="w-12 text-right pr-3 text-sm font-medium text-gray-600">
                    P{floor}
                  </div>
                  <div className="flex gap-1">
                    {sortedUnits.map((unit) => {
                      const realUnitNumber = String(unit.unit_number);
                      const isFiltered = statusFilter && unit.status?.toLowerCase() !== statusFilter;
                      
                      return (
                        <button
                          key={unit.id || `${floor}-${unit.unit_number}`}
                          onClick={() => !isFiltered && setSelectedUnit(unit)}
                          className={`min-w-12 h-10 px-1 rounded flex items-center justify-center text-white text-xs font-medium transition-all ${
                            isFiltered 
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-30' 
                              : `${getStatusColor(unit.status)} hover:opacity-80 hover:scale-105 cursor-pointer`
                          }`}
                          title={`Depto ${realUnitNumber} - ${unit.status} - ${unit.unit_type || 'N/A'}`}
                        >
                          {realUnitNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
            {[
              { label: 'Disponible', color: 'bg-gray-400' },
              { label: 'Reservado', color: 'bg-yellow-500' },
              { label: 'Promesa', color: 'bg-green-500' },
              { label: 'Escriturado', color: 'bg-blue-500' },
              { label: 'Bloqueado', color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${item.color}`}></div>
                <span className="text-sm text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Typology View */
        <div className="space-y-4">
          {typologyStats.map((stat) => (
            <div key={stat.typology} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">{stat.typology}</h3>
                <span className="text-sm text-gray-500">{stat.total} unidades</span>
              </div>

              {/* Progress Bar */}
              <div className="h-6 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${stat.soldPercentage}%` }}
                ></div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">Vendidos</p>
                  <p className="text-xl font-bold text-green-600">{stat.sold}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Disponibles</p>
                  <p className="text-xl font-bold text-gray-700">{stat.available}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">% Vendido</p>
                  <p className="text-xl font-bold text-blue-600">{stat.soldPercentage.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Financial Stats Footer */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{data.statistics?.vendidos || 0}</p>
            <p className="text-sm text-gray-600">Vendidos</p>
            <p className="text-xs text-gray-400">
              ({data.statistics?.reservado || 0} res + {data.statistics?.promesa || 0} prom + {data.statistics?.escriturado || 0} escr)
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{data.statistics?.disponible || 0}</p>
            <p className="text-sm text-gray-600">Disponibles</p>
          </div>
        </div>
      </div>
    </div>
  );
}
