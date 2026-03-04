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

const statusLabels: Record<string, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  promesa: 'Promesa',
  escriturado: 'Escriturado',
};

interface ProjectWithStats extends Project {
  correctStats?: Statistics;
}

export default function DashboardPage() {
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

  // Calculate totals from correct stats
  const totals = projectsWithStats.reduce(
    (acc, project) => {
      const stats = project.correctStats || project.stats;
      acc.disponible += stats?.disponible || 0;
      acc.reservado += stats?.reservado || 0;
      acc.promesa += stats?.promesa || 0;
      acc.escriturado += stats?.escriturado || 0;
      return acc;
    },
    { disponible: 0, reservado: 0, promesa: 0, escriturado: 0 }
  );

  const totalSales = totals.reservado + totals.promesa + totals.escriturado;

  if (storeLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 ${statusColors[key]} rounded-lg flex items-center justify-center`}>
                <span className="text-white text-xl font-bold">
                  {totals[key as keyof typeof totals]}
                </span>
              </div>
              <div className="ml-4">
                <p className="text-gray-500 text-sm">{label}</p>
                <p className="text-2xl font-bold text-gray-800">
                  {totals[key as keyof typeof totals]}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Sales Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100">Total Ventas</p>
            <p className="text-4xl font-bold">{totalSales}</p>
          </div>
          <div className="text-6xl opacity-20">📊</div>
        </div>
      </div>

      {/* Projects Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Proyectos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.location}</p>
                  </div>
                  <span className="bg-blue-600 text-white text-sm font-bold px-2.5 py-1 rounded">
                    {soldPct}%
                  </span>
                </div>

                {/* Stats Bar */}
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-200 mb-3">
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

                {/* Stats Numbers */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto mb-1"></div>
                    <span className="text-gray-600">{stats?.disponible || 0}</span>
                  </div>
                  <div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full mx-auto mb-1"></div>
                    <span className="text-gray-600">{stats?.reservado || 0}</span>
                  </div>
                  <div>
                    <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
                    <span className="text-gray-600">{stats?.promesa || 0}</span>
                  </div>
                  <div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
                    <span className="text-gray-600">{stats?.escriturado || 0}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
