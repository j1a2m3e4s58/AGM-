import type {
  AGMSettings,
  AppUser,
  AuditEntry,
  BulkCreateResult,
  CheckIn,
  DashboardMetrics,
  ImportBatch,
  LoginResponse,
  ProxyData,
  Registration,
  RegistrationUpdate,
  SearchResult,
  Session,
  Shareholder,
  ShareholderInput,
} from "../backend";
import {
  CheckInMethod,
  ImportStatus,
  RegistrationType,
  ShareholderStatus,
  UserRole,
} from "../backend";
import bawjiaseSeed from "../data/bawjiase-shareholders.json";

type Result<T> = { __kind__: "ok"; ok: T } | { __kind__: "err"; err: string };
type PasswordResetCode = {
  code: string;
  username: string;
  issuedBy: string;
  issuedAt: bigint;
  expiresAt: bigint;
  attempts: bigint;
};

type InternalUser = AppUser & { plainPassword: string };
type PersistedMockState = {
  version: number;
  settings: AGMSettings;
  users: InternalUser[];
  sessions: Session[];
  shareholders: Shareholder[];
  registrations: Registration[];
  checkIns: CheckIn[];
  importBatches: ImportBatch[];
  auditEntries: AuditEntry[];
  passwordResetCodes: PasswordResetCode[];
};
type SeedRow = {
  shareholderNumber: string;
  fullName: string;
  idNumber: string;
  shareholding: number;
  tags: string[];
};

const DEFAULT_ADMIN = "T4N4AMEG8F5";
const MOCK_STATE_STORAGE_KEY = "agm_mock_backend_state";
const MOCK_STATE_VERSION = 2;
const now = () => BigInt(Date.now()) * BigInt(1_000_000);
const DEFAULT_SETTINGS: AGMSettings = {
  venue: "",
  sessionTimeoutMinutes: BigInt(120),
  quorumThreshold: BigInt(50),
  agmDate: "",
  agmName: "BAWJIASE COMMUNITY BANK AGM",
};
const seedRows = bawjiaseSeed.shareholders as SeedRow[];

let settings: AGMSettings = { ...DEFAULT_SETTINGS };

const users = new Map<string, InternalUser>();
const sessions = new Map<string, Session>();
const shareholders = new Map<string, Shareholder>();
const registrations = new Map<string, Registration>();
const checkIns = new Map<string, CheckIn>();
const importBatches = new Map<string, ImportBatch>();
const auditEntries: AuditEntry[] = [];
const passwordResetCodes = new Map<string, PasswordResetCode>();

function serializeWithBigInt(value: unknown) {
  return JSON.stringify(value, (_key, currentValue) =>
    typeof currentValue === "bigint"
      ? { __type: "bigint", value: currentValue.toString() }
      : currentValue,
  );
}

function deserializeWithBigInt<T>(value: string): T {
  return JSON.parse(value, (_key, currentValue) => {
    if (
      currentValue &&
      typeof currentValue === "object" &&
      currentValue.__type === "bigint"
    ) {
      return BigInt(currentValue.value);
    }
    return currentValue;
  }) as T;
}

function toBigInt(value: bigint | number | string | undefined, fallback = 0n) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim() !== "") return BigInt(value);
  return fallback;
}

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function snapshotState(): PersistedMockState {
  return {
    version: MOCK_STATE_VERSION,
    settings: { ...settings },
    users: [...users.values()],
    sessions: [...sessions.values()],
    shareholders: [...shareholders.values()],
    registrations: [...registrations.values()],
    checkIns: [...checkIns.values()],
    importBatches: [...importBatches.values()],
    auditEntries: [...auditEntries],
    passwordResetCodes: [...passwordResetCodes.values()],
  };
}

function persistState() {
  if (!hasStorage()) return;
  window.localStorage.setItem(
    MOCK_STATE_STORAGE_KEY,
    serializeWithBigInt(snapshotState()),
  );
}

function hydrateState(state: PersistedMockState) {
  settings = {
    ...DEFAULT_SETTINGS,
    ...state.settings,
    sessionTimeoutMinutes: toBigInt(
      state.settings?.sessionTimeoutMinutes,
      DEFAULT_SETTINGS.sessionTimeoutMinutes,
    ),
    quorumThreshold: toBigInt(
      state.settings?.quorumThreshold,
      DEFAULT_SETTINGS.quorumThreshold,
    ),
  };
  users.clear();
  sessions.clear();
  shareholders.clear();
  registrations.clear();
  checkIns.clear();
  importBatches.clear();
  passwordResetCodes.clear();
  auditEntries.splice(0, auditEntries.length);

  for (const user of state.users) {
    users.set(user.username, {
      ...user,
      createdAt: toBigInt(user.createdAt),
      sessionExpiry: user.sessionExpiry
        ? toBigInt(user.sessionExpiry)
        : undefined,
      lastLogin: user.lastLogin ? toBigInt(user.lastLogin) : undefined,
    });
  }
  for (const session of state.sessions ?? []) {
    sessions.set(session.token, {
      ...session,
      expiresAt: toBigInt(session.expiresAt),
    });
  }
  for (const shareholder of state.shareholders) {
    shareholders.set(shareholder.id, {
      ...shareholder,
      importedAt: toBigInt(shareholder.importedAt),
      shareholding: toBigInt(shareholder.shareholding),
    });
  }
  for (const registration of state.registrations) {
    registrations.set(registration.id, {
      ...registration,
      registeredAt: toBigInt(registration.registeredAt),
      updatedAt: toBigInt(registration.updatedAt),
    });
  }
  for (const checkIn of state.checkIns) {
    checkIns.set(checkIn.id, {
      ...checkIn,
      checkedInAt: toBigInt(checkIn.checkedInAt),
    });
  }
  for (const batch of state.importBatches) {
    importBatches.set(batch.id, {
      ...batch,
      totalRows: toBigInt(batch.totalRows),
      duplicatesSkipped: toBigInt(batch.duplicatesSkipped),
      importedRows: toBigInt(batch.importedRows),
      uploadedAt: toBigInt(batch.uploadedAt),
    });
  }
  for (const code of state.passwordResetCodes) {
    passwordResetCodes.set(code.username, {
      ...code,
      issuedAt: toBigInt(code.issuedAt),
      expiresAt: toBigInt(code.expiresAt),
      attempts: toBigInt(code.attempts),
    });
  }
  auditEntries.push(
    ...state.auditEntries.map((entry) => ({
      ...entry,
      performedAt: toBigInt(entry.performedAt),
    })),
  );
}

function loadPersistedState(): PersistedMockState | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(MOCK_STATE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return deserializeWithBigInt<PersistedMockState>(raw);
  } catch {
    return null;
  }
}

function isLegacyDemoState(state: PersistedMockState) {
  return (
    state.settings.agmName.includes("Demo") ||
    state.shareholders.some((item) =>
      ["Ama Mensah", "Kwame Asante", "Esi Owusu"].includes(item.fullName),
    )
  );
}

function buildInitialState(): PersistedMockState {
  const createdAt = now();
  const importedBy = DEFAULT_ADMIN;
  const initialUsers: InternalUser[] = [
    {
      principal: "",
      username: DEFAULT_ADMIN,
      createdAt,
      role: UserRole.SuperAdmin,
      isActive: true,
      passwordHash: DEFAULT_ADMIN,
      sessionExpiry: undefined,
      lastLogin: undefined,
      mustChangePassword: false,
      plainPassword: DEFAULT_ADMIN,
    },
  ];

  const initialShareholders: Shareholder[] = seedRows.map((row, index) => ({
    id: `sh_bawjiase_${index + 1}`,
    status: ShareholderStatus.NotRegistered,
    tags: row.tags ?? [],
    fullName: row.fullName,
    importedAt: createdAt,
    importedBy,
    email: undefined,
    shareholderNumber: row.shareholderNumber,
    idNumber: row.idNumber,
    phone: undefined,
    shareholding: BigInt(row.shareholding ?? 0),
  }));

  return {
    version: MOCK_STATE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    users: initialUsers,
    sessions: [],
    shareholders: initialShareholders,
    registrations: [],
    checkIns: [],
    importBatches: [],
    auditEntries: [
      {
        id: id("audit"),
        action: "INIT",
        entityId: "seed",
        performedAt: createdAt,
        performedBy: DEFAULT_ADMIN,
        details: `Loaded ${seedRows.length} shareholders from ${bawjiaseSeed.sourceFile}`,
        entityType: "system",
        ipAddress: "127.0.0.1",
      },
    ],
    passwordResetCodes: [],
  };
}

function buildSeedShareholders(importedBy = DEFAULT_ADMIN): Shareholder[] {
  const importedAt = now();
  return seedRows.map((row, index) => ({
    id: `sh_bawjiase_${index + 1}`,
    status: ShareholderStatus.NotRegistered,
    tags: row.tags ?? [],
    fullName: row.fullName,
    importedAt,
    importedBy,
    email: undefined,
    shareholderNumber: row.shareholderNumber,
    idNumber: row.idNumber,
    phone: undefined,
    shareholding: BigInt(row.shareholding ?? 0),
  }));
}

function ensureSeedShareholders() {
  if (shareholders.size > 0) return;
  if (registrations.size > 0 || checkIns.size > 0) return;

  const restored = buildSeedShareholders();
  for (const shareholder of restored) {
    shareholders.set(shareholder.id, shareholder);
  }

  addAudit(
    "RESTORE_SHAREHOLDERS",
    "shareholder",
    "*",
    DEFAULT_ADMIN,
    `Restored ${restored.length} seeded shareholders after empty-state recovery`,
  );
  persistState();
}

function ok<T>(value: T): Result<T> {
  return { __kind__: "ok", ok: value };
}

function err<T = never>(message: string): Result<T> {
  return { __kind__: "err", err: message };
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function addAudit(
  action: string,
  entityType: string,
  entityId: string,
  performedBy: string,
  details: string,
) {
  auditEntries.unshift({
    id: id("audit"),
    action,
    entityId,
    performedAt: now(),
    performedBy,
    details,
    entityType,
    ipAddress: "127.0.0.1",
  });
}

function requireSession(token: string): Result<Session> {
  const session = sessions.get(token);
  if (!session) return err("INVALID_SESSION");
  if (session.expiresAt < now()) {
    sessions.delete(token);
    return err("SESSION_EXPIRED");
  }
  const renewed = {
    ...session,
    expiresAt: now() + settings.sessionTimeoutMinutes * BigInt(60_000_000_000),
  };
  sessions.set(token, renewed);
  return ok(renewed);
}

function requireAdmin(token: string): Result<Session> {
  const session = requireSession(token);
  if (session.__kind__ === "err") return session;
  if (
    session.ok.role !== UserRole.SuperAdmin &&
    session.ok.role !== UserRole.RegistrationOfficer
  ) {
    return err("FORBIDDEN");
  }
  return session;
}

function requireSuperAdmin(token: string): Result<Session> {
  const session = requireSession(token);
  if (session.__kind__ === "err") return session;
  if (session.ok.role !== UserRole.SuperAdmin) return err("FORBIDDEN");
  return session;
}

function sanitizeUser(user: InternalUser): AppUser {
  const { plainPassword: _plainPassword, ...safeUser } = user;
  return safeUser;
}

function redactShareholder(shareholder: Shareholder, session: Session): Shareholder {
  if (session.role === UserRole.SuperAdmin) return shareholder;
  return {
    ...shareholder,
    idNumber: "REDACTED",
    email: undefined,
    phone: undefined,
  };
}

function computeDashboardMetrics(): DashboardMetrics {
  const all = [...shareholders.values()];
  const total = BigInt(all.length);
  const registeredInPerson = BigInt(
    all.filter((item) => item.status === ShareholderStatus.RegisteredInPerson)
      .length,
  );
  const registeredProxy = BigInt(
    all.filter((item) => item.status === ShareholderStatus.RegisteredProxy)
      .length,
  );
  const checkedIn = BigInt(
    all.filter((item) => item.status === ShareholderStatus.CheckedIn).length,
  );
  const registered = registeredInPerson + registeredProxy + checkedIn;
  const notRegistered = total - registered;
  const attendanceRate =
    all.length === 0 ? 0 : Number(checkedIn) / Number(total || BigInt(1));

  return {
    totalShareholders: total,
    quorumStatus: Number(checkedIn) >= Number(settings.quorumThreshold),
    lastUpdated: now(),
    registeredInPerson,
    attendanceRate,
    registeredProxy,
    checkedIn,
    notRegistered,
    registered,
  };
}

function seed() {
  if (users.size > 0 || shareholders.size > 0) return;
  const persisted = loadPersistedState();
  if (persisted && !isLegacyDemoState(persisted)) {
    hydrateState(persisted);
    ensureSeedShareholders();
    persistState();
    return;
  }
  const initialState = buildInitialState();
  hydrateState(initialState);
  persistState();
}

seed();

export const mockBackend = {
  async login(username: string, password: string): Promise<Result<LoginResponse>> {
    const user = users.get(username);
    if (!user || user.plainPassword !== password) return err("INVALID_CREDENTIALS");
    if (!user.isActive) return err("ACCOUNT_DISABLED");

    const token = id("session");
    const expiresAt =
      now() + settings.sessionTimeoutMinutes * BigInt(60_000_000_000);
    const session: Session = {
      token,
      expiresAt,
      username: user.username,
      role: user.role,
    };
    sessions.set(token, session);

    const updatedUser: InternalUser = {
      ...user,
      lastLogin: now(),
      sessionExpiry: expiresAt,
    };
    users.set(user.username, updatedUser);
    addAudit("LOGIN", "user", user.username, user.username, "User logged in");
    persistState();

    return ok({
      token,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  },

  async validateSession(token: string): Promise<Result<Session>> {
    return requireSession(token);
  },

  async logout(token: string): Promise<void> {
    sessions.delete(token);
    persistState();
  },

  async changePassword(
    username: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<Result<null>> {
    const user = users.get(username);
    if (!user || user.plainPassword !== oldPassword) {
      return err("INVALID_CREDENTIALS");
    }
    if (newPassword.length < 8) return err("PASSWORD_TOO_SHORT");

    users.set(username, {
      ...user,
      plainPassword: newPassword,
      passwordHash: newPassword,
      mustChangePassword: false,
    });
    addAudit("CHANGE_PASSWORD", "user", username, username, "Password changed");
    persistState();
    return ok(null);
  },

  async changePasswordSecure(
    token: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<Result<null>> {
    const session = requireSession(token);
    if (session.__kind__ === "err") return session;
    return this.changePassword(session.ok.username, oldPassword, newPassword);
  },

  async createPasswordResetCode(
    adminToken: string,
    username: string,
  ): Promise<Result<PasswordResetCode>> {
    const session = requireSuperAdmin(adminToken);
    if (session.__kind__ === "err") return session;
    const user = users.get(username);
    if (!user) return err("USER_NOT_FOUND");
    const reset: PasswordResetCode = {
      code: `RST-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      username,
      issuedBy: session.ok.username,
      issuedAt: now(),
      expiresAt: now() + BigInt(15 * 60_000_000_000),
      attempts: BigInt(0),
    };
    passwordResetCodes.set(username, reset);
    addAudit("ISSUE_RESET_CODE", "user", username, session.ok.username, "Issued password reset code");
    persistState();
    return ok(reset);
  },

  async resetPasswordWithCode(
    username: string,
    resetCode: string,
    newPassword: string,
  ): Promise<Result<null>> {
    const user = users.get(username);
    if (!user) return err("USER_NOT_FOUND");
    const issued = passwordResetCodes.get(username);
    if (!issued || issued.code !== resetCode) return err("INVALID_RESET_CODE");
    if (issued.expiresAt < now()) {
      passwordResetCodes.delete(username);
      return err("RESET_CODE_EXPIRED");
    }
    if (newPassword.length < 8) return err("PASSWORD_TOO_SHORT");

    users.set(username, {
      ...user,
      plainPassword: newPassword,
      passwordHash: newPassword,
      mustChangePassword: false,
    });
    passwordResetCodes.delete(username);
    addAudit("RESET_PASSWORD", "user", username, username, "Password reset");
    persistState();
    return ok(null);
  },

  async getSettings(): Promise<AGMSettings> {
    return settings;
  },

  async updateSettings(
    adminToken: string,
    newSettings: AGMSettings,
  ): Promise<Result<AGMSettings>> {
    const session = requireAdmin(adminToken);
    if (session.__kind__ === "err") return session;
    Object.assign(settings, newSettings);
    addAudit("UPDATE_SETTINGS", "settings", "agm", session.ok.username, "Settings updated");
    persistState();
    return ok(settings);
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return computeDashboardMetrics();
  },

  async getAllShareholders(): Promise<Shareholder[]> {
    ensureSeedShareholders();
    return [...shareholders.values()];
  },

  async getAllShareholdersSecure(token: string): Promise<Result<Shareholder[]>> {
    const session = requireSession(token);
    if (session.__kind__ === "err") return session;
    ensureSeedShareholders();
    return ok([...shareholders.values()].map((item) => redactShareholder(item, session.ok)));
  },

  async getShareholder(idValue: string): Promise<Shareholder | null> {
    ensureSeedShareholders();
    return shareholders.get(idValue) ?? null;
  },

  async getShareholderSecure(
    token: string,
    idValue: string,
  ): Promise<Result<Shareholder | null>> {
    const session = requireSession(token);
    if (session.__kind__ === "err") return session;
    ensureSeedShareholders();
    const shareholder = shareholders.get(idValue) ?? null;
    return ok(shareholder ? redactShareholder(shareholder, session.ok) : null);
  },

  async getShareholderByNumber(shareholderNumber: string): Promise<Shareholder | null> {
    ensureSeedShareholders();
    return (
      [...shareholders.values()].find(
        (item) => item.shareholderNumber === shareholderNumber,
      ) ?? null
    );
  },

  async getShareholderByNumberSecure(
    token: string,
    shareholderNumber: string,
  ): Promise<Result<Shareholder | null>> {
    const session = requireSession(token);
    if (session.__kind__ === "err") return session;
    ensureSeedShareholders();
    const shareholder =
      [...shareholders.values()].find(
        (item) => item.shareholderNumber === shareholderNumber,
      ) ?? null;
    return ok(shareholder ? redactShareholder(shareholder, session.ok) : null);
  },

  async searchShareholders(
    searchQuery: string,
    statusFilter: ShareholderStatus | null,
    page: bigint,
    pageSize: bigint,
  ): Promise<SearchResult> {
    ensureSeedShareholders();
    const filtered = [...shareholders.values()].filter((item) => {
      const matchesQuery =
        !searchQuery ||
        item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shareholderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.idNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    const start = Number(page * pageSize);
    const end = start + Number(pageSize);
    return {
      total: BigInt(filtered.length),
      page,
      items: filtered.slice(start, end),
    };
  },

  async searchShareholdersSecure(
    token: string,
    searchQuery: string,
    statusFilter: ShareholderStatus | null,
    page: bigint,
    pageSize: bigint,
  ): Promise<Result<SearchResult>> {
    const session = requireSession(token);
    if (session.__kind__ === "err") return session;
    const result = await this.searchShareholders(
      searchQuery,
      statusFilter,
      page,
      pageSize,
    );
    return ok({
      ...result,
      items: result.items.map((item) => redactShareholder(item, session.ok)),
    });
  },

  async createShareholder(
    data: ShareholderInput,
    importedBy: string,
  ): Promise<Result<Shareholder>> {
    const shareholder: Shareholder = {
      id: id("sh"),
      status: ShareholderStatus.NotRegistered,
      tags: data.tags,
      fullName: data.fullName,
      importedAt: now(),
      importedBy,
      email: data.email,
      shareholderNumber: data.shareholderNumber,
      idNumber: data.idNumber,
      phone: data.phone,
      shareholding: data.shareholding,
    };
    shareholders.set(shareholder.id, shareholder);
    addAudit(
      "CREATE_SHAREHOLDER",
      "shareholder",
      shareholder.id,
      importedBy,
      `Created ${shareholder.shareholderNumber}`,
    );
    persistState();
    return ok(shareholder);
  },

  async bulkCreateShareholders(
    items: ShareholderInput[],
    importedBy: string,
  ): Promise<BulkCreateResult> {
    let created = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const item of items) {
      const exists = [...shareholders.values()].some(
        (current) =>
          current.shareholderNumber === item.shareholderNumber ||
          current.idNumber === item.idNumber,
      );
      if (exists) {
        duplicates += 1;
        continue;
      }
      const shareholder: Shareholder = {
        id: id("sh"),
        status: ShareholderStatus.NotRegistered,
        tags: item.tags,
        fullName: item.fullName,
        importedAt: now(),
        importedBy,
        email: item.email,
        shareholderNumber: item.shareholderNumber,
        idNumber: item.idNumber,
        phone: item.phone,
        shareholding: item.shareholding,
      };
      shareholders.set(shareholder.id, shareholder);
      addAudit(
        "CREATE_SHAREHOLDER",
        "shareholder",
        shareholder.id,
        importedBy,
        `Created ${shareholder.shareholderNumber}`,
      );
      created += 1;
    }

    persistState();
    return {
      created: BigInt(created),
      errors,
      duplicates: BigInt(duplicates),
    };
  },

  async updateShareholderStatus(
    idValue: string,
    status: ShareholderStatus,
    updatedBy: string,
  ): Promise<Result<Shareholder>> {
    const shareholder = shareholders.get(idValue);
    if (!shareholder) return err("SHAREHOLDER_NOT_FOUND");
    const updated = { ...shareholder, status };
    shareholders.set(idValue, updated);
    addAudit("UPDATE_STATUS", "shareholder", idValue, updatedBy, `Status: ${status}`);
    persistState();
    return ok(updated);
  },

  async deleteAllShareholders(deletedBy: string): Promise<Result<bigint>> {
    const count = shareholders.size;
    shareholders.clear();
    registrations.clear();
    checkIns.clear();
    addAudit("DELETE_ALL_SHAREHOLDERS", "shareholder", "*", deletedBy, "Cleared shareholder data");
    persistState();
    return ok(BigInt(count));
  },

  async getAllRegistrations(): Promise<Registration[]> {
    return [...registrations.values()];
  },

  async getRegistration(idValue: string): Promise<Registration | null> {
    return registrations.get(idValue) ?? null;
  },

  async getRegistrationByShareholder(shareholderId: string): Promise<Registration | null> {
    return (
      [...registrations.values()].find(
        (registration) => registration.shareholderId === shareholderId,
      ) ?? null
    );
  },

  async registerShareholder(
    shareholderId: string,
    regType: RegistrationType,
    proxyData: ProxyData | null,
    registeredBy: string,
  ): Promise<Result<Registration>> {
    const shareholder = shareholders.get(shareholderId);
    if (!shareholder) return err("SHAREHOLDER_NOT_FOUND");

    const registration: Registration = {
      id: id("reg"),
      shareholderId,
      verificationCode: id("verify").toUpperCase(),
      proxyContact: proxyData?.proxyContact,
      proxyProofKey: proxyData?.proxyProofKey,
      updatedAt: now(),
      updatedBy: registeredBy,
      proxyFraudFlags: [],
      notes: undefined,
      proxyName: proxyData?.proxyName,
      proxyProofValidated: regType === RegistrationType.Proxy ? false : true,
      registrationType: regType,
      registeredAt: now(),
      registeredBy,
    };
    registrations.set(registration.id, registration);

    const status =
      regType === RegistrationType.Proxy
        ? ShareholderStatus.RegisteredProxy
        : ShareholderStatus.RegisteredInPerson;
    shareholders.set(shareholderId, { ...shareholder, status });
    addAudit("REGISTER_SHAREHOLDER", "registration", registration.id, registeredBy, regType);
    persistState();
    return ok(registration);
  },

  async updateRegistration(
    idValue: string,
    updates: RegistrationUpdate,
    updatedBy: string,
  ): Promise<Result<Registration>> {
    const registration = registrations.get(idValue);
    if (!registration) return err("REGISTRATION_NOT_FOUND");
    const verificationFromNotes = updates.notes
      ? updates.notes
          .split("\n")
          .find((line) => line.startsWith("Verification Code:"))
          ?.split(":")
          .slice(1)
          .join(":")
          .trim()
      : undefined;
    const updated: Registration = {
      ...registration,
      notes: updates.notes ?? registration.notes,
      verificationCode:
        verificationFromNotes && verificationFromNotes.length > 0
          ? verificationFromNotes
          : registration.verificationCode,
      proxyContact: updates.proxyData?.proxyContact ?? registration.proxyContact,
      proxyName: updates.proxyData?.proxyName ?? registration.proxyName,
      proxyProofKey:
        updates.proxyData?.proxyProofKey ?? registration.proxyProofKey,
      updatedAt: now(),
      updatedBy,
    };
    registrations.set(idValue, updated);
    addAudit("UPDATE_REGISTRATION", "registration", idValue, updatedBy, "Updated");
    persistState();
    return ok(updated);
  },

  async cancelRegistration(
    idValue: string,
    cancelledBy: string,
    reason: string,
  ): Promise<Result<null>> {
    const registration = registrations.get(idValue);
    if (!registration) return err("REGISTRATION_NOT_FOUND");
    registrations.delete(idValue);
    const shareholder = shareholders.get(registration.shareholderId);
    if (shareholder) {
      shareholders.set(registration.shareholderId, {
        ...shareholder,
        status: ShareholderStatus.NotRegistered,
      });
    }
    addAudit("CANCEL_REGISTRATION", "registration", idValue, cancelledBy, reason);
    persistState();
    return ok(null);
  },

  async validateProxyProof(
    registrationId: string,
    validated: boolean,
    fraudFlags: string[],
    validatedBy: string,
  ): Promise<Result<Registration>> {
    const registration = registrations.get(registrationId);
    if (!registration) return err("REGISTRATION_NOT_FOUND");
    const updated = {
      ...registration,
      proxyProofValidated: validated,
      proxyFraudFlags: fraudFlags,
      updatedAt: now(),
      updatedBy: validatedBy,
    };
    registrations.set(registrationId, updated);
    addAudit("VALIDATE_PROXY", "registration", registrationId, validatedBy, `${validated}`);
    persistState();
    return ok(updated);
  },

  async getAllCheckIns(): Promise<CheckIn[]> {
    return [...checkIns.values()];
  },

  async getCheckIn(idValue: string): Promise<CheckIn | null> {
    return checkIns.get(idValue) ?? null;
  },

  async getCheckInByShareholder(shareholderId: string): Promise<CheckIn | null> {
    return (
      [...checkIns.values()].find((item) => item.shareholderId === shareholderId) ??
      null
    );
  },

  async checkInShareholder(
    shareholderId: string,
    registrationId: string,
    method: CheckInMethod,
    checkedInBy: string,
  ): Promise<Result<CheckIn>> {
    const shareholder = shareholders.get(shareholderId);
    const registration = registrations.get(registrationId);
    if (!shareholder) return err("SHAREHOLDER_NOT_FOUND");
    if (!registration || registration.shareholderId !== shareholderId) {
      return err("REGISTRATION_NOT_FOUND");
    }
    const checkIn: CheckIn = {
      id: id("checkin"),
      shareholderId,
      method,
      checkedInAt: now(),
      checkedInBy,
      registrationId,
    };
    checkIns.set(checkIn.id, checkIn);
    shareholders.set(shareholderId, {
      ...shareholder,
      status: ShareholderStatus.CheckedIn,
    });
    addAudit("CHECK_IN", "checkin", checkIn.id, checkedInBy, method);
    persistState();
    return ok(checkIn);
  },

  async undoCheckIn(shareholderId: string, undoneBy: string): Promise<Result<null>> {
    const item = [...checkIns.values()].find(
      (checkIn) => checkIn.shareholderId === shareholderId,
    );
    if (!item) return err("CHECKIN_NOT_FOUND");
    checkIns.delete(item.id);
    const registration = [...registrations.values()].find(
      (entry) => entry.shareholderId === shareholderId,
    );
    const shareholder = shareholders.get(shareholderId);
    if (shareholder) {
      shareholders.set(shareholderId, {
        ...shareholder,
        status: registration
          ? registration.registrationType === RegistrationType.Proxy
            ? ShareholderStatus.RegisteredProxy
            : ShareholderStatus.RegisteredInPerson
          : ShareholderStatus.NotRegistered,
      });
    }
    addAudit("UNDO_CHECK_IN", "checkin", item.id, undoneBy, "Reverted");
    persistState();
    return ok(null);
  },

  async createImportBatch(
    filename: string,
    uploadedBy: string,
    totalRows: bigint,
  ): Promise<ImportBatch> {
    const batch: ImportBatch = {
      id: id("import"),
      status: ImportStatus.Pending,
      totalRows,
      duplicatesSkipped: BigInt(0),
      filename,
      importedRows: BigInt(0),
      uploadedAt: now(),
      uploadedBy,
    };
    importBatches.set(batch.id, batch);
    addAudit("CREATE_IMPORT_BATCH", "import", batch.id, uploadedBy, filename);
    persistState();
    return batch;
  },

  async updateImportBatchStatus(
    idValue: string,
    status: ImportStatus,
    importedRows: bigint,
    duplicates: bigint,
  ): Promise<Result<ImportBatch>> {
    const batch = importBatches.get(idValue);
    if (!batch) return err("IMPORT_BATCH_NOT_FOUND");
    const updated = {
      ...batch,
      status,
      importedRows,
      duplicatesSkipped: duplicates,
    };
    importBatches.set(idValue, updated);
    persistState();
    return ok(updated);
  },

  async getImportBatch(idValue: string): Promise<ImportBatch | null> {
    return importBatches.get(idValue) ?? null;
  },

  async getImportBatches(): Promise<ImportBatch[]> {
    return [...importBatches.values()];
  },

  async getUsers(adminToken: string): Promise<Result<AppUser[]>> {
    const session = requireAdmin(adminToken);
    if (session.__kind__ === "err") return session;
    return ok([...users.values()].map(sanitizeUser));
  },

  async createUser(
    adminToken: string,
    username: string,
    password: string,
    role: UserRole,
  ): Promise<Result<AppUser>> {
    const session = requireSuperAdmin(adminToken);
    if (session.__kind__ === "err") return session;
    if (users.has(username)) return err("USERNAME_TAKEN");

    const user: InternalUser = {
      principal: "",
      username,
      createdAt: now(),
      role,
      isActive: true,
      passwordHash: password,
      sessionExpiry: undefined,
      lastLogin: undefined,
      mustChangePassword: true,
      plainPassword: password,
    };
    users.set(username, user);
    addAudit("CREATE_USER", "user", username, session.ok.username, role);
    persistState();
    return ok(sanitizeUser(user));
  },

  async updateUserRole(
    adminToken: string,
    username: string,
    role: UserRole,
  ): Promise<Result<AppUser>> {
    const session = requireSuperAdmin(adminToken);
    if (session.__kind__ === "err") return session;
    const user = users.get(username);
    if (!user) return err("USER_NOT_FOUND");
    const updated = { ...user, role };
    users.set(username, updated);
    addAudit("UPDATE_USER_ROLE", "user", username, session.ok.username, role);
    persistState();
    return ok(sanitizeUser(updated));
  },

  async deactivateUser(adminToken: string, username: string): Promise<Result<null>> {
    const session = requireSuperAdmin(adminToken);
    if (session.__kind__ === "err") return session;
    const user = users.get(username);
    if (!user) return err("USER_NOT_FOUND");
    users.set(username, { ...user, isActive: false });
    addAudit("DEACTIVATE_USER", "user", username, session.ok.username, "Disabled");
    persistState();
    return ok(null);
  },

  async getActiveSessions(adminToken: string): Promise<Result<Session[]>> {
    const session = requireSuperAdmin(adminToken);
    if (session.__kind__ === "err") return session;
    return ok([...sessions.values()]);
  },

  async forceLogout(adminToken: string, username: string): Promise<Result<null>> {
    const session = requireSuperAdmin(adminToken);
    if (session.__kind__ === "err") return session;
    for (const [token, activeSession] of sessions.entries()) {
      if (activeSession.username === username) {
        sessions.delete(token);
      }
    }
    addAudit("FORCE_LOGOUT", "user", username, session.ok.username, "Ended sessions");
    persistState();
    return ok(null);
  },

  async getAuditLog(
    entityType: string | null,
    entityId: string | null,
    limit: bigint,
  ): Promise<AuditEntry[]> {
    return auditEntries
      .filter((entry) => {
        const matchesType = !entityType || entry.entityType === entityType;
        const matchesId = !entityId || entry.entityId === entityId;
        return matchesType && matchesId;
      })
      .slice(0, Number(limit));
  },

  async getAuditLogForExport(): Promise<AuditEntry[]> {
    return [...auditEntries];
  },
};
