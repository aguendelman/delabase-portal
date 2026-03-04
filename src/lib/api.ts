const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://inmobiliaria-mgr.emergent.host/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  total_floors: number;
  units_per_floor: number[];
  stats: {
    disponible: number;
    reservado: number;
    promesa: number;
    escriturado: number;
  };
  total_sales: number;
}

export interface Sale {
  id: string;
  project_id: string;
  project_name: string;
  unit_number: string;
  buyer_name: string;
  buyer_rut?: string;
  buyer_nationality?: string;
  status: string;
  list_price: number;
  net_price?: number;
  discount?: number;
  reservation_date: string;
  reservation_number: string;
  promise_date?: string;
  deed_date?: string;
  seller?: string;
  parking_1?: string;
  parking_2?: string;
  storage?: string;
}

export interface TopographicData {
  project: Project;
  floors: Record<string, Unit[]>;
  statistics: Statistics;
}

export interface Unit {
  id: string;
  unit_number: number | string;
  floor: number;
  line: string;
  unit_type: string;
  orientation: string;
  status: string;
  list_price: number;
  surface_total?: number;
  surface_util?: number;
  surface_terrace?: number;
  bedrooms?: number;
  bathrooms?: number;
  sale?: Sale;
}

export interface Statistics {
  disponible: number;
  reservado: number;
  promesa: number;
  escriturado: number;
  bloqueado?: number;
  total?: number;
  vendidos?: number;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Login error response:', errorText);
      if (response.status === 401) {
        throw new Error('Email o contraseña incorrectos');
      }
      throw new Error(`Error del servidor: ${response.status}`);
    }

    return response.json();
  }

  async getProjects(): Promise<Project[]> {
    return this.fetch<Project[]>('/projects');
  }

  async getTopographicData(projectId: string): Promise<TopographicData> {
    return this.fetch<TopographicData>(`/projects/${projectId}/topographic`);
  }

  async getSales(projectId?: string): Promise<Sale[]> {
    const query = projectId ? `?project_id=${projectId}` : '';
    return this.fetch<Sale[]>(`/sales${query}`);
  }

  async getReportsByYear(): Promise<any> {
    return this.fetch<any>('/reports/by-year');
  }

  async getReportsByPeriod(period: string): Promise<any> {
    return this.fetch<any>(`/reports/by-period?period=${period}`);
  }

  async getProjectUnits(projectId: string): Promise<Unit[]> {
    return this.fetch<Unit[]>(`/projects/${projectId}/units`);
  }
}

export const api = new ApiService();
