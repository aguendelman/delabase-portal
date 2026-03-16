"use client";

import { useState, useEffect } from "react";

// Colores para los estados de entrega
const DELIVERY_STATUS_COLORS: Record<string, string> = {
  no_vendido: "#9CA3AF",      // Gris
  sin_visita: "#FBBF24",       // Amarillo
  con_observaciones: "#EF4444", // Rojo
  listo_para_entrega: "#22C55E", // Verde
  entregado: "#3B82F6",        // Azul
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  no_vendido: "No Vendido",
  sin_visita: "Sin Visita",
  con_observaciones: "Con Observaciones",
  listo_para_entrega: "Listo para Entrega",
  entregado: "Entregado",
};

interface DeliveryProject {
  id: string;
  name: string;
  statistics: {
    no_vendido: number;
    sin_visita: number;
    con_observaciones: number;
    listo_para_entrega: number;
    entregado: number;
    total: number;
  };
  updated_at: string;
}

interface DeliveryUnit {
  unit_number: string;
  floor: string;
  line: string;
  status: string;
  status_raw: string;
  owner_name: string | null;
  parking_1: string | null;
  parking_2: string | null;
  storage_1: string | null;
  storage_2: string | null;
  observations_date: string | null;
  updated_at: string;
}

interface DeliveryDetail {
  project: {
    id: string;
    name: string;
  };
  floors: Record<string, DeliveryUnit[]>;
  statistics: {
    no_vendido: number;
    sin_visita: number;
    con_observaciones: number;
    listo_para_entrega: number;
    entregado: number;
    total: number;
  };
  last_updated: string;
}

export default function EntregasPage() {
  const [projects, setProjects] = useState<DeliveryProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<DeliveryProject | null>(null);
  const [deliveryDetail, setDeliveryDetail] = useState<DeliveryDetail | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<DeliveryUnit | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://inmobiliaria-mgr.emergent.host/api";

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/deliveries/projects`);
      if (!response.ok) throw new Error("Error al cargar proyectos");
      const data = await response.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError("No se pudieron cargar los proyectos de entregas");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetail = async (projectId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/deliveries/${projectId}`);
      if (!response.ok) throw new Error("Error al cargar detalle");
      const data = await response.json();
      setDeliveryDetail(data);
      setError(null);
    } catch (err) {
      setError("No se pudo cargar el detalle del proyecto");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: DeliveryProject) => {
    setSelectedProject(project);
    setFilterStatus(null);
    setSelectedUnit(null);
    fetchProjectDetail(project.id);
  };

  const handleBack = () => {
    if (selectedUnit) {
      setSelectedUnit(null);
    } else if (deliveryDetail) {
      setDeliveryDetail(null);
      setSelectedProject(null);
      setFilterStatus(null);
    }
  };

  const getFilteredUnits = () => {
    if (!deliveryDetail) return {};
    if (!filterStatus) return deliveryDetail.floors;

    const filtered: Record<string, DeliveryUnit[]> = {};
    for (const [floor, units] of Object.entries(deliveryDetail.floors)) {
      const filteredUnits = units.filter((u) => u.status === filterStatus);
      if (filteredUnits.length > 0) {
        filtered[floor] = filteredUnits;
      }
    }
    return filtered;
  };

  // Vista de lista de proyectos
  const renderProjectList = () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Entregas</h1>
      
      {projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-6xl mb-4">📦</div>
          <p>No hay proyectos en proceso de entrega</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectSelect(project)}
              className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                {project.name}
              </h2>
              
              {/* Estadísticas */}
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {Object.entries(DELIVERY_STATUS_LABELS).map(([status, label]) => (
                  <div key={status}>
                    <div
                      className="text-xl font-bold"
                      style={{ color: DELIVERY_STATUS_COLORS[status] }}
                    >
                      {project.statistics[status as keyof typeof project.statistics] || 0}
                    </div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
              
              {/* Barra de progreso */}
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                {Object.keys(DELIVERY_STATUS_LABELS).map((status) => {
                  const count = project.statistics[status as keyof typeof project.statistics] || 0;
                  const percentage = project.statistics.total > 0 
                    ? (count / project.statistics.total) * 100 
                    : 0;
                  return (
                    <div
                      key={status}
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: DELIVERY_STATUS_COLORS[status],
                      }}
                    />
                  );
                })}
              </div>
              
              <div className="mt-2 text-xs text-gray-400 text-right">
                Actualizado: {new Date(project.updated_at).toLocaleDateString("es-CL")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Vista de detalle del proyecto (topográfico)
  const renderProjectDetail = () => {
    if (!deliveryDetail) return null;
    const filteredFloors = getFilteredUnits();
    const sortedFloors = Object.entries(filteredFloors).sort(
      (a, b) => parseInt(b[0]) - parseInt(a[0])
    );

    return (
      <div className="space-y-4">
        {/* Header con botón volver */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {deliveryDetail.project.name}
          </h1>
        </div>

        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterStatus === null
                ? "bg-gray-800 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Todos ({deliveryDetail.statistics.total})
          </button>
          {Object.entries(DELIVERY_STATUS_LABELS).map(([status, label]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 transition-all ${
                filterStatus === status
                  ? "ring-2 ring-offset-1"
                  : "hover:opacity-80"
              }`}
              style={{
                backgroundColor: filterStatus === status 
                  ? DELIVERY_STATUS_COLORS[status] 
                  : `${DELIVERY_STATUS_COLORS[status]}33`,
                color: filterStatus === status ? "white" : DELIVERY_STATUS_COLORS[status],
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: DELIVERY_STATUS_COLORS[status] }}
              />
              {label} ({deliveryDetail.statistics[status as keyof typeof deliveryDetail.statistics] || 0})
            </button>
          ))}
        </div>

        {/* Topográfico */}
        <div className="bg-white rounded-lg shadow p-4">
          {sortedFloors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay unidades con este estado
            </div>
          ) : (
            sortedFloors.map(([floor, units]) => (
              <div key={floor} className="mb-6 last:mb-0">
                <div className="text-sm font-medium text-gray-500 mb-2">
                  Piso {floor}
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                  {units.map((unit) => (
                    <div
                      key={unit.unit_number}
                      onClick={() => setSelectedUnit(unit)}
                      className="aspect-square rounded flex items-center justify-center text-white text-xs sm:text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                      style={{
                        backgroundColor: DELIVERY_STATUS_COLORS[unit.status] || "#6B7280",
                      }}
                      title={`${unit.unit_number} - ${DELIVERY_STATUS_LABELS[unit.status]}`}
                    >
                      {unit.unit_number}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 text-sm bg-white rounded-lg shadow p-4">
          <span className="font-medium text-gray-600">Leyenda:</span>
          {Object.entries(DELIVERY_STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: DELIVERY_STATUS_COLORS[status] }}
              />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Vista de detalle de unidad (Modal)
  const renderUnitModal = () => {
    if (!selectedUnit) return null;

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={() => setSelectedUnit(null)}
      >
        <div 
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                Departamento {selectedUnit.unit_number}
              </h2>
              <button
                onClick={() => setSelectedUnit(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Estado */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Estado:</span>
              <span
                className="px-3 py-1 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: DELIVERY_STATUS_COLORS[selectedUnit.status] }}
              >
                {DELIVERY_STATUS_LABELS[selectedUnit.status]}
              </span>
            </div>

            {/* Propietario */}
            {selectedUnit.owner_name && (
              <div className="border-t pt-3">
                <span className="text-gray-500 text-sm">Propietario</span>
                <p className="font-medium">{selectedUnit.owner_name}</p>
              </div>
            )}

            {/* Estacionamientos */}
            {(selectedUnit.parking_1 || selectedUnit.parking_2) && (
              <div className="border-t pt-3">
                <span className="text-gray-500 text-sm">Estacionamientos</span>
                <p className="font-medium">
                  {[selectedUnit.parking_1, selectedUnit.parking_2].filter(Boolean).join(", ")}
                </p>
              </div>
            )}

            {/* Bodegas */}
            {(selectedUnit.storage_1 || selectedUnit.storage_2) && (
              <div className="border-t pt-3">
                <span className="text-gray-500 text-sm">Bodegas</span>
                <p className="font-medium">
                  {[selectedUnit.storage_1, selectedUnit.storage_2].filter(Boolean).join(", ")}
                </p>
              </div>
            )}

            {/* Fecha de observaciones */}
            {selectedUnit.observations_date && (
              <div className="border-t pt-3">
                <span className="text-gray-500 text-sm">Fecha de observaciones</span>
                <p className="font-medium">
                  {new Date(selectedUnit.observations_date).toLocaleDateString("es-CL")}
                </p>
              </div>
            )}

            {/* Última actualización */}
            <div className="border-t pt-3 text-sm text-gray-400">
              Última actualización: {new Date(selectedUnit.updated_at).toLocaleString("es-CL")}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchProjects}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {deliveryDetail ? renderProjectDetail() : renderProjectList()}
      {renderUnitModal()}
    </div>
  );
}
