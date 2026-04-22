// Centralized user mapping - connects names to emails and roles
export interface UserMapping {
  name: string;
  email: string;
  role: 'ADMIN' | 'COORDENADOR_COMERCIAL' | 'CLOSER' | 'SDR';
  vendedorKey?: 'HERBERT' | 'CLED' | 'PEDRO_H' | 'PEDRO_JUAN' | 'CAETANO';
  agendadorKey?: 'MIGUEL' | 'FELIPE' | 'HERBERT';
}

export const TEAM_USERS: Record<string, UserMapping> = {
  // Admin universal
  BRUNO: {
    name: 'Bruno Gomes',
    email: 'brunogomestjf@gmail.com',
    role: 'ADMIN',
  },
  // Coordenador Comercial
  CLED: {
    name: 'Cled',
    email: 'cledinhosport10@gmail.com',
    role: 'COORDENADOR_COMERCIAL',
    vendedorKey: 'CLED',
  },
  // Closer
  HERBERT: {
    name: 'Hebert',
    email: 'josehebert103@gmail.com',
    role: 'CLOSER',
    vendedorKey: 'HERBERT',
    agendadorKey: 'HERBERT',
  },
  // SDRs
  MIGUEL: {
    name: 'Miguel',
    email: 'miguelfrancisco232490@gmail.com',
    role: 'SDR',
    agendadorKey: 'MIGUEL',
  },
  FELIPE: {
    name: 'Felipe',
    email: 'feliperangel.rego03@gmail.com',
    role: 'SDR',
    agendadorKey: 'FELIPE',
  },
  // Additional Closers
  PEDRO_JUAN: {
    name: 'Pedro Juan',
    email: 'pedroojuann1@gmail.com',
    role: 'CLOSER',
    vendedorKey: 'PEDRO_JUAN',
  },
  CAETANO: {
    name: 'Caetano',
    email: 'cadulucena6@gmail.com',
    role: 'CLOSER',
    vendedorKey: 'CAETANO',
  },
};

// Get user mapping by email
export function getUserByEmail(email: string): UserMapping | undefined {
  return Object.values(TEAM_USERS).find(
    u => u.email.toLowerCase() === email.toLowerCase()
  );
}

// Get user mapping by name (case insensitive)
export function getUserByName(name: string): UserMapping | undefined {
  const normalizedName = name.toLowerCase().trim();
  return Object.values(TEAM_USERS).find(
    u => u.name.toLowerCase() === normalizedName
  );
}

// Get user mapping by vendedor key
export function getUserByVendedorKey(key: 'HERBERT' | 'CLED' | 'PEDRO_H' | 'PEDRO_JUAN' | 'CAETANO'): UserMapping | undefined {
  return Object.values(TEAM_USERS).find(u => u.vendedorKey === key);
}

// Get user mapping by agendador key
export function getUserByAgendadorKey(key: 'MIGUEL' | 'FELIPE' | 'HERBERT'): UserMapping | undefined {
  return Object.values(TEAM_USERS).find(u => u.agendadorKey === key);
}

// Permission helpers
export function isAdmin(email: string, role?: string): boolean {
  if (role === 'ADMIN') return true;
  const user = getUserByEmail(email);
  return user?.role === 'ADMIN';
}

export function isCoordinator(email: string, role?: string): boolean {
  if (role === 'COORDENADOR_COMERCIAL') return true;
  const user = getUserByEmail(email);
  return user?.role === 'COORDENADOR_COMERCIAL';
}

export function isAdminOrCoordinator(email: string, role?: string): boolean {
  return isAdmin(email, role) || isCoordinator(email, role);
}

// Check if user can edit all platform components
export function canEditPlatform(userEmail: string, userRole: string): boolean {
  // Admin has universal access
  if (isAdmin(userEmail, userRole)) return true;
  // Coordenador Comercial can edit everything in commercial module
  if (userRole === 'COORDENADOR_COMERCIAL' || isCoordinator(userEmail, userRole)) return true;
  return false;
}

// Check if user can see specific vendedor's commission
export function canSeeCommission(
  viewerEmail: string, 
  viewerRole: string, 
  targetVendedor: 'HERBERT' | 'CLED' | 'PEDRO_H' | 'PEDRO_JUAN' | 'CAETANO'
): boolean {
  // Admin sees all
  if (isAdmin(viewerEmail, viewerRole)) return true;
  // Coordenador sees all
  if (viewerRole === 'COORDENADOR_COMERCIAL' || isCoordinator(viewerEmail, viewerRole)) return true;
  // Vendedor can see their own commission
  const viewer = getUserByEmail(viewerEmail);
  if (viewer?.vendedorKey === targetVendedor) return true;
  return false;
}

// Get display name for vendedor key
export function getVendedorDisplayName(key: 'HERBERT' | 'CLED' | 'PEDRO_H' | 'PEDRO_JUAN' | 'CAETANO'): string {
  const user = getUserByVendedorKey(key);
  if (user) return user.name;
  // Fallback for unknown vendors
  return key;
}

// Get display name for agendador key
export function getAgendadorDisplayName(key: 'MIGUEL' | 'FELIPE' | 'HERBERT'): string {
  const user = getUserByAgendadorKey(key);
  return user?.name || key;
}
