'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { api, Project, Statistics } from '@/lib/api';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  disponible: 'bg-gray-400',
  reservado: 'bg-yellow-400',
  promesa: 'bg-green-500',
  escriturado: 'bg-blue-500',
};

interface ProjectWithStats extends Project {
  correctStats?: Statistics;
}

export default function ProyectosPage() {
  const { projects, isLoading: storeLoading } = useAppStore();
  const [projectsWithStats, setProjectsWithStats] = useState<ProjectWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCorrectStats = async () => {
      if (projects.length === 0) return;
      
      setIsLoading(true);
      
      // Load topographic data for each project to get correct stats
      const updatedProjects = await Promise.all(
        projects.map(async (project) => {
          try {
            const topoData = await api.getTopographicData(project.id);
            return {
              ...project,
              correctStats: topoData.statistics,
            };
          } catch (error) {
            console.error(`Error loading stats for ${project.name}:`, error);
            return { ...project, correctStats: project.stats };
          }
        })
      );
      
      setProjectsWithStats(updatedProjects);
      setIsLoading(false);
    };

    loadCorrectStats();
  }, [projects]);

  if (storeLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Proyectos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projectsWithStats.map((project) => {
          const stats = project.correctStats || project.stats;
          const total = (stats?.disponible || 0) + (stats?.reservado || 0) + 
                       (stats?.promesa || 0) + (stats?.escriturado || 0);
          const sold = (stats?.reservado || 0) + (stats?.promesa || 0) + (stats?.escriturado || 0);
          const soldPct = total > 0 ? Math.round((sold / total) * 100) : 0;

          return (
            <Link
              key={project.id}
              href={`/proyectos/${project.id}`}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition group"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{project.name}</h3>
                    <p className="text-blue-100 text-sm">{project.location}</p>
                  </div>
                  {/* Percentage Sold Badge */}
                  <div className="bg-white rounded-lg px-3 py-2 text-center min-w-16">
                    <p className="text-2xl font-bold text-blue-700">{soldPct}%</p>
                    <p className="text-xs text-blue-500">vendido</p>
                  </div>
                </div>
                <p className="text-blue-200 text-xs mt-2">{project.total_floors} pisos · {total} unidades</p>
              </div>

              {/* Stats */}
              <div className="p-4">
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
                    {(stats?.escriturado || 0) > 0 && (
                      <div
                        className="bg-blue-500"
                        style={{ width: `${((stats?.escriturado || 0) / total) * 100}%` }}
                      />
                    )}
                    {(stats?.promesa || 0) > 0 && (
                      <div
                        className="bg-green-500"
                        style={{ width: `${((stats?.promesa || 0) / total) * 100}%` }}
                      />
                    )}
                    {(stats?.reservado || 0) > 0 && (
                      <div
                        className="bg-yellow-400"
                        style={{ width: `${((stats?.reservado || 0) / total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className={`w-10 h-10 ${statusColors.disponible} rounded-lg mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm`}>
                      {stats?.disponible || 0}
                    </div>
                    <span className="text-xs text-gray-500">Disp.</span>
                  </div>
                  <div className="text-center">
                    <div className={`w-10 h-10 ${statusColors.reservado} rounded-lg mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm`}>
                      {stats?.reservado || 0}
                    </div>
                    <span className="text-xs text-gray-500">Res.</span>
                  </div>
                  <div className="text-center">
                    <div className={`w-10 h-10 ${statusColors.promesa} rounded-lg mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm`}>
                      {stats?.promesa || 0}
                    </div>
                    <span className="text-xs text-gray-500">Prom.</span>
                  </div>
                  <div className="text-center">
                    <div className={`w-10 h-10 ${statusColors.escriturado} rounded-lg mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm`}>
                      {stats?.escriturado || 0}
                    </div>
                    <span className="text-xs text-gray-500">Escr.</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 text-center">
                <span className="text-blue-600 text-sm font-medium group-hover:text-blue-800">
                  Ver topográfico →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
