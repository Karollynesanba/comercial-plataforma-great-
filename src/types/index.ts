// User Roles
export type UserRole =
  | "ADMIN"
  | "SETOR_COMERCIAL"
  | "SDR"
  | "CLOSER"
  | "COORDENADOR_COMERCIAL";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  SETOR_COMERCIAL: "Setor Comercial",
  SDR: "SDR",
  CLOSER: "Closer",
  COORDENADOR_COMERCIAL: "Coordenador/Head Comercial",
};

export const COMMERCIAL_ROLE_PERMISSIONS = {
  SDR: {
    canCreate: true,
    canEditBasic: true,
    canEditAdvanced: true,
    canMoveToNegociacao: true,
    canMoveToFechado: true,
    canMoveToPerdido: true,
    canExport: true,
    canManageLists: true,
  },
  CLOSER: {
    canCreate: true,
    canEditBasic: true,
    canEditAdvanced: true,
    canMoveToNegociacao: true,
    canMoveToFechado: true,
    canMoveToPerdido: true,
    canExport: true,
    canManageLists: true,
  },
  COORDENADOR_COMERCIAL: {
    canCreate: true,
    canEditBasic: true,
    canEditAdvanced: true,
    canMoveToNegociacao: true,
    canMoveToFechado: true,
    canMoveToPerdido: true,
    canExport: true,
    canManageLists: true,
  },
};

export type Module = "COMERCIAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: string;
  active: boolean;
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  createdAt: Date;
}

export type PlanType = "MENSAL" | "TRIMESTRAL" | "SEMESTRAL";
export type StatusComercial = "NOVO" | "EM_NEGOCIACAO" | "FECHADO" | "PERDIDO";

export interface Client {
  id: string;
  clientName: string;
  clinicName: string;
  plan: PlanType;
  dealValue: number;
  creativeSource: string;
  statusComercial: StatusComercial;
  createdByUserId: string;
  assignedTeamId?: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  entity?: string;
  entityId?: string;
  createdAt: Date;
}

export interface KPIData {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

export interface SalesGoal {
  id: string;
  month: string;
  goalValue: number;
  currentValue: number;
  createdByUserId: string;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: Date;
}
