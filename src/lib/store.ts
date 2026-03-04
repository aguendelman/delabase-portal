import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Project, api } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAuth: (user: User, token: string) => void;
}

interface AppState {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  setSelectedProject: (project: Project | null) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        try {
          const response = await api.login(email, password);
          api.setToken(response.access_token);
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
          });
          return true;
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },
      logout: () => {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },
      setAuth: (user: User, token: string) => {
        api.setToken(token);
        set({ user, token, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.setToken(state.token);
        }
      },
    }
  )
);

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  selectedProject: null,
  isLoading: false,
  error: null,
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await api.getProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      set({ error: 'Error al cargar proyectos', isLoading: false });
    }
  },
  setSelectedProject: (project) => set({ selectedProject: project }),
  setError: (error) => set({ error }),
}));
