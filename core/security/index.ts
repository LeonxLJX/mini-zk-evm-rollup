import { ethers } from 'ethers';
import { getLogger } from '../utils/logger';

export enum Role {
  ADMIN = 'ADMIN',
  SEQUENCER = 'SEQUENCER',
  PROVER = 'PROVER',
  BRIDGE_OPERATOR = 'BRIDGE_OPERATOR',
  OBSERVER = 'OBSERVER'
}

export interface SecurityConfig {
  enableAccessControl: boolean;
  enableAuditLogging: boolean;
  adminAddresses: string[];
  maxFailedAttempts: number;
  lockoutDuration: number;
}

export interface AuditLog {
  timestamp: number;
  action: string;
  actor: string;
  target?: string;
  success: boolean;
  details?: string;
}

export class AccessControl {
  private roles: Map<string, Set<Role>>;
  private adminAddresses: Set<string>;
  private logger = getLogger();

  constructor(adminAddresses: string[]) {
    this.roles = new Map();
    this.adminAddresses = new Set(adminAddresses.map(address => address.toLowerCase()));
    
    // Grant admin role to all admin addresses
    adminAddresses.forEach(address => {
      const lowerAddr = address.toLowerCase();
      this.roles.set(lowerAddr, new Set([Role.ADMIN]));
    });
  }

  addRole(address: string, role: Role): void {
    const lowerAddr = address.toLowerCase();
    if (!this.roles.has(lowerAddr)) {
      this.roles.set(lowerAddr, new Set());
    }
    this.roles.get(lowerAddr)!.add(role);
    this.logger.info(`Added role ${role} to address ${address}`);
  }

  removeRole(address: string, role: Role): void {
    const lowerAddr = address.toLowerCase();
    if (this.roles.has(lowerAddr)) {
      this.roles.get(lowerAddr)!.delete(role);
      this.logger.info(`Removed role ${role} from address ${address}`);
    }
  }

  hasRole(address: string, role: Role): boolean {
    const lowerAddr = address.toLowerCase();
    // Admin has all roles
    if (this.adminAddresses.has(lowerAddr)) {
      return true;
    }
    return this.roles.get(lowerAddr)?.has(role) || false;
  }

  hasAnyRole(address: string, roles: Role[]): boolean {
    return roles.some(role => this.hasRole(address, role));
  }

  getAllRoles(address: string): Role[] {
    const lowerAddr = address.toLowerCase();
    if (this.adminAddresses.has(lowerAddr)) {
      return Object.values(Role);
    }
    return Array.from(this.roles.get(lowerAddr) || []);
  }

  addAdmin(address: string): void {
    const lowerAddr = address.toLowerCase();
    this.adminAddresses.add(lowerAddr);
    this.addRole(address, Role.ADMIN);
    this.logger.info(`Added admin privileges to address ${address}`);
  }

  removeAdmin(address: string): void {
    const lowerAddr = address.toLowerCase();
    this.adminAddresses.delete(lowerAddr);
    this.removeRole(address, Role.ADMIN);
    this.logger.info(`Removed admin privileges from address ${address}`);
  }

  isAdmin(address: string): boolean {
    return this.adminAddresses.has(address.toLowerCase());
  }

  getAdminAddresses(): string[] {
    return Array.from(this.adminAddresses);
  }
}

export class SecurityManager {
  private accessControl: AccessControl;
  private auditLogs: AuditLog[];
  private failedAttempts: Map<string, { count: number; lastAttempt: number }>;
  private config: SecurityConfig;
  private logger = getLogger();

  constructor(config: SecurityConfig) {
    this.config = config;
    this.accessControl = new AccessControl(config.adminAddresses);
    this.auditLogs = [];
    this.failedAttempts = new Map();
  }

  checkAccess(address: string, requiredRole: Role): void {
    if (!this.config.enableAccessControl) {
      return;
    }

    if (this.isLockedOut(address)) {
      throw new Error('Account is locked out due to too many failed attempts');
    }

    if (!this.accessControl.hasRole(address, requiredRole)) {
      this.recordFailedAttempt(address);
      this.logAudit('access_denied', address, undefined, false, `Missing required role: ${requiredRole}`);
      throw new Error('Unauthorized access');
    }

    this.logAudit('access_granted', address, undefined, true, `Role ${requiredRole} verified`);
  }

  checkAdminAccess(address: string): void {
    this.checkAccess(address, Role.ADMIN);
  }

  checkSequencerAccess(address: string): void {
    this.checkAccess(address, Role.SEQUENCER);
  }

  checkProverAccess(address: string): void {
    this.checkAccess(address, Role.PROVER);
  }

  checkBridgeOperatorAccess(address: string): void {
    this.checkAccess(address, Role.BRIDGE_OPERATOR);
  }

  addRole(address: string, role: Role): void {
    this.accessControl.addRole(address, role);
    this.logAudit('role_added', address, undefined, true, `Added role ${role}`);
  }

  removeRole(address: string, role: Role): void {
    this.accessControl.removeRole(address, role);
    this.logAudit('role_removed', address, undefined, true, `Removed role ${role}`);
  }

  addAdmin(address: string): void {
    this.accessControl.addAdmin(address);
    this.logAudit('admin_added', address, undefined, true, 'Added admin privileges');
  }

  removeAdmin(address: string): void {
    this.accessControl.removeAdmin(address);
    this.logAudit('admin_removed', address, undefined, true, 'Removed admin privileges');
  }

  validateTransaction(tx: { from: string; to: string; value: string; gasLimit: number }): void {
    // Validate address formats
    if (!ethers.isAddress(tx.from)) {
      throw new Error('Invalid from address');
    }
    if (!ethers.isAddress(tx.to)) {
      throw new Error('Invalid to address');
    }

    // Validate value
    const value = BigInt(tx.value);
    if (value < 0n) {
      throw new Error('Value must be non-negative');
    }

    // Validate gas limit
    if (tx.gasLimit < 21000) {
      throw new Error('Gas limit below minimum required');
    }

    this.logAudit('transaction_validated', tx.from, tx.to, true, `Value: ${tx.value}, Gas: ${tx.gasLimit}`);
  }

  private recordFailedAttempt(address: string): void {
    const lowerAddr = address.toLowerCase();
    const attempts = this.failedAttempts.get(lowerAddr) || { count: 0, lastAttempt: Date.now() };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.failedAttempts.set(lowerAddr, attempts);

    if (attempts.count >= this.config.maxFailedAttempts) {
      this.logger.warn(`Account ${address} locked out due to ${attempts.count} failed attempts`);
    }
  }

  private isLockedOut(address: string): boolean {
    const lowerAddr = address.toLowerCase();
    const attempts = this.failedAttempts.get(lowerAddr);
    if (!attempts || attempts.count < this.config.maxFailedAttempts) {
      return false;
    }

    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    return timeSinceLastAttempt < this.config.lockoutDuration;
  }

  private logAudit(action: string, actor: string, target?: string, success: boolean = true, details?: string): void {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const log: AuditLog = {
      timestamp: Date.now(),
      action,
      actor,
      target,
      success,
      details
    };

    this.auditLogs.push(log);
    
    // Limit audit log size
    if (this.auditLogs.length > 1000) {
      this.auditLogs.shift();
    }

    this.logger.debug(`Audit log: ${action} by ${actor} ${success ? 'succeeded' : 'failed'}${details ? ` - ${details}` : ''}`);
  }

  getAuditLogs(limit: number = 100): AuditLog[] {
    return this.auditLogs.slice(-limit);
  }

  getAccessControl(): AccessControl {
    return this.accessControl;
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Security configuration updated');
  }

  resetFailedAttempts(address: string): void {
    this.failedAttempts.delete(address.toLowerCase());
    this.logger.info(`Reset failed attempts for address ${address}`);
  }

  clearAuditLogs(): void {
    this.auditLogs = [];
    this.logger.info('Audit logs cleared');
  }
}

export function createSecurityManager(config: SecurityConfig): SecurityManager {
  return new SecurityManager(config);
}
