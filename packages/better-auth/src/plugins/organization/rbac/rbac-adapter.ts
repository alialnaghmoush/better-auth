import type { AuthContext } from "../../../init";
import type {
	Permission,
	Role,
	RolePermission,
	MemberRole,
	Resource,
	ResourcePermission,
	AuditLog,
	Policy,
	PermissionInput,
	RoleInput,
	RolePermissionInput,
	MemberRoleInput,
	ResourceInput,
	ResourcePermissionInput,
	AuditLogInput,
	PolicyInput,
	PermissionContext,
	PolicyRule,
} from "./rbac-schema";

export interface RbacAdapterOptions {
	enableAuditLog?: boolean;
	enablePolicyEngine?: boolean;
	cacheTTL?: number;
}

export const getRbacAdapter = (
	context: AuthContext,
	options?: RbacAdapterOptions,
) => {
	const adapter = context.adapter;
	const enableAuditLog = options?.enableAuditLog ?? true;

	return {
		// Permission operations
		async createPermission(data: PermissionInput): Promise<Permission> {
			return await adapter.create<PermissionInput, Permission>({
				model: "permission",
				data,
			});
		},

		async findPermissionById(id: string): Promise<Permission | null> {
			return await adapter.findOne<Permission>({
				model: "permission",
				where: [{ field: "id", value: id }],
			});
		},

		async findPermissionByName(name: string): Promise<Permission | null> {
			return await adapter.findOne<Permission>({
				model: "permission",
				where: [{ field: "name", value: name }],
			});
		},

		async listPermissions(): Promise<Permission[]> {
			return await adapter.findMany<Permission>({
				model: "permission",
			});
		},

		async updatePermission(
			id: string,
			data: Partial<Permission>,
		): Promise<Permission> {
			const result = await adapter.update<Permission>({
				model: "permission",
				where: [{ field: "id", value: id }],
				update: data,
			});
			if (!result) {
				throw new Error(`Permission with id ${id} not found`);
			}
			return result;
		},

		async deletePermission(id: string): Promise<void> {
			await adapter.delete({
				model: "permission",
				where: [{ field: "id", value: id }],
			});
		},

		// Role operations
		async createRole(data: RoleInput): Promise<Role> {
			return await adapter.create<RoleInput, Role>({
				model: "role",
				data,
			});
		},

		async findRoleById(id: string): Promise<Role | null> {
			return await adapter.findOne<Role>({
				model: "role",
				where: [{ field: "id", value: id }],
			});
		},

		async findRolesByOrganization(organizationId: string): Promise<Role[]> {
			return await adapter.findMany<Role>({
				model: "role",
				where: [
					{
						field: "organizationId",
						value: organizationId,
					},
				],
			});
		},

		async listRoles(): Promise<Role[]> {
			return await adapter.findMany<Role>({
				model: "role",
			});
		},

		async updateRole(id: string, data: Partial<Role>): Promise<Role> {
			const result = await adapter.update<Role>({
				model: "role",
				where: [{ field: "id", value: id }],
				update: data,
			});
			if (!result) {
				throw new Error(`Role with id ${id} not found`);
			}
			return result;
		},

		async deleteRole(id: string): Promise<void> {
			await adapter.delete({
				model: "role",
				where: [{ field: "id", value: id }],
			});
		},

		// Role-Permission operations
		async assignPermissionToRole(
			data: RolePermissionInput,
		): Promise<RolePermission> {
			return await adapter.create<RolePermissionInput, RolePermission>({
				model: "rolePermission",
				data,
			});
		},

		async removePermissionFromRole(
			roleId: string,
			permissionId: string,
		): Promise<void> {
			await adapter.delete({
				model: "rolePermission",
				where: [
					{ field: "roleId", value: roleId },
					{ field: "permissionId", value: permissionId },
				],
			});
		},

		async getRolePermissions(roleId: string): Promise<RolePermission[]> {
			return await adapter.findMany<RolePermission>({
				model: "rolePermission",
				where: [{ field: "roleId", value: roleId }],
			});
		},

		// User-Role operations
		async assignRoleToUser(data: MemberRoleInput): Promise<MemberRole> {
			const memberRole = await adapter.create<MemberRoleInput, MemberRole>({
				model: "memberRole",
				data,
			});

			if (enableAuditLog) {
				await this.createAuditLog({
					action: "ROLE_ASSIGNED",
					resource: "member_role",
					resourceId: memberRole.id,
					userId: data.assignedBy,
					organizationId: data.organizationId,
					details: JSON.stringify({
						targetUserId: data.userId,
						roleId: data.roleId,
						teamId: data.teamId,
					}),
					timestamp: new Date(), // Add timestamp field per Zod schema
				});
			}

			return memberRole;
		},

		async removeRoleFromUser(
			userId: string,
			roleId: string,
			organizationId?: string,
			removedBy?: string,
		): Promise<void> {
			const whereClause = [
				{ field: "userId", value: userId },
				{ field: "roleId", value: roleId },
			];

			if (organizationId) {
				whereClause.push({ field: "organizationId", value: organizationId });
			}

			await adapter.delete({
				model: "memberRole",
				where: whereClause,
			});

			if (enableAuditLog && removedBy) {
				await this.createAuditLog({
					action: "ROLE_REMOVED",
					resource: "member_role",
					userId: removedBy,
					organizationId,
					details: JSON.stringify({
						targetUserId: userId,
						roleId,
					}),
					timestamp: new Date(), // Add timestamp field per Zod schema
				});
			}
		},

		async getUserRoles(
			userId: string,
			organizationId?: string,
		): Promise<MemberRole[]> {
			const whereClause = [{ field: "userId", value: userId }];

			if (organizationId) {
				whereClause.push({ field: "organizationId", value: organizationId });
			}

			return await adapter.findMany<MemberRole>({
				model: "memberRole",
				where: whereClause,
			});
		},

		// Resource operations
		async createResource(data: ResourceInput): Promise<Resource> {
			return await adapter.create<ResourceInput, Resource>({
				model: "resource",
				data,
			});
		},

		async findResourceById(id: string): Promise<Resource | null> {
			return await adapter.findOne<Resource>({
				model: "resource",
				where: [{ field: "id", value: id }],
			});
		},

		async findResourcesByOrganization(
			organizationId: string,
		): Promise<Resource[]> {
			return await adapter.findMany<Resource>({
				model: "resource",
				where: [{ field: "organizationId", value: organizationId }],
			});
		},

		async updateResource(
			id: string,
			data: Partial<Resource>,
		): Promise<Resource> {
			const result = await adapter.update<Resource>({
				model: "resource",
				where: [{ field: "id", value: id }],
				update: data,
			});
			if (!result) {
				throw new Error(`Resource with id ${id} not found`);
			}
			return result;
		},

		async deleteResource(id: string): Promise<void> {
			await adapter.delete({
				model: "resource",
				where: [{ field: "id", value: id }],
			});
		},

		// Resource Permission operations
		async grantResourcePermission(
			data: ResourcePermissionInput,
		): Promise<ResourcePermission> {
			return await adapter.create<ResourcePermissionInput, ResourcePermission>({
				model: "resourcePermission",
				data,
			});
		},

		async revokeResourcePermission(id: string): Promise<void> {
			await adapter.delete({
				model: "resourcePermission",
				where: [{ field: "id", value: id }],
			});
		},

		async getResourcePermissions(
			resourceId: string,
		): Promise<ResourcePermission[]> {
			return await adapter.findMany<ResourcePermission>({
				model: "resourcePermission",
				where: [{ field: "resourceId", value: resourceId }],
			});
		},

		// Audit Log operations
		async createAuditLog(data: AuditLogInput): Promise<AuditLog | null> {
			if (!enableAuditLog) {
				return null;
			}

			return await adapter.create<AuditLogInput, AuditLog>({
				model: "auditLog",
				data,
			});
		},

		async getAuditLogs(
			organizationId?: string,
			limit: number = 100,
			offset: number = 0,
			filters?: {
				userId?: string;
				action?: string;
				resource?: string;
			},
		): Promise<AuditLog[]> {
			const whereClause = [];

			if (organizationId) {
				whereClause.push({ field: "organizationId", value: organizationId });
			}

			if (filters?.userId) {
				whereClause.push({ field: "userId", value: filters.userId });
			}

			if (filters?.action) {
				whereClause.push({ field: "action", value: filters.action });
			}

			if (filters?.resource) {
				whereClause.push({ field: "resource", value: filters.resource });
			}

			return await adapter.findMany<AuditLog>({
				model: "auditLog",
				where: whereClause,
				limit,
				offset,
				sortBy: { field: "timestamp", direction: "desc" },
			});
		},

		// Policy operations
		async createPolicy(data: PolicyInput): Promise<Policy> {
			return await adapter.create<PolicyInput, Policy>({
				model: "policy",
				data,
			});
		},

		async findPolicyById(id: string): Promise<Policy | null> {
			return await adapter.findOne<Policy>({
				model: "policy",
				where: [{ field: "id", value: id }],
			});
		},

		async getPoliciesForOrganization(
			organizationId: string,
		): Promise<Policy[]> {
			return await adapter.findMany<Policy>({
				model: "policy",
				where: [
					{ field: "organizationId", value: organizationId },
					{ field: "isActive", value: true },
				],
				sortBy: { field: "priority", direction: "desc" },
			});
		},

		async updatePolicy(id: string, data: Partial<Policy>): Promise<Policy> {
			const result = await adapter.update<Policy>({
				model: "policy",
				where: [{ field: "id", value: id }],
				update: data,
			});
			if (!result) {
				throw new Error(`Policy with id ${id} not found`);
			}
			return result;
		},

		async deletePolicy(id: string): Promise<void> {
			await adapter.delete({
				model: "policy",
				where: [{ field: "id", value: id }],
			});
		},

		// Permission evaluation
		async evaluatePermission(context: PermissionContext): Promise<boolean> {
			// Get user roles
			const userRoles = await this.getUserRoles(
				context.userId,
				context.organizationId,
			);

			if (userRoles.length === 0) {
				return false;
			}

			// Get all role permissions in bulk to avoid N+1 queries
			const rolePermissions = await Promise.all(
				userRoles.map((userRole) => this.getRolePermissions(userRole.roleId)),
			);

			const allPermissions = rolePermissions.flat();

			// Get all unique permission IDs to fetch in bulk
			const permissionIds = Array.from(
				new Set(allPermissions.map((rp) => rp.permissionId)),
			);
			const permissions = await Promise.all(
				permissionIds.map((id) => this.findPermissionById(id)),
			);

			// Create a map for quick lookup
			const permissionMap = new Map<string, Permission>();
			permissions.forEach((permission) => {
				if (permission) {
					permissionMap.set(permission.id, permission);
				}
			});

			// Check if any role has the required permission
			const hasPermission = allPermissions.some((rolePermission) => {
				const permission = permissionMap.get(rolePermission.permissionId);
				if (!permission) return false;

				// Check if permission matches action and resource
				return this.matchesPermission(permission, rolePermission, context);
			});

			// If policies are enabled, evaluate them
			if (options?.enablePolicyEngine && context.organizationId) {
				const policies = await this.getPoliciesForOrganization(
					context.organizationId,
				);
				const policyResult = await this.evaluatePolicies(policies, context);

				// Policy can override role-based permissions
				if (policyResult !== null) {
					return policyResult;
				}
			}

			return hasPermission;
		},

		// Helper methods
		matchesPermission(
			permission: Permission,
			rolePermission: RolePermission,
			context: PermissionContext,
		): boolean {
			// Basic matching: resource:action format
			const permissionParts = permission.name.split(":");
			const contextParts = context.action.split(":");

			if (permissionParts.length !== contextParts.length) {
				return false;
			}

			for (let i = 0; i < permissionParts.length; i++) {
				if (
					permissionParts[i] !== "*" &&
					permissionParts[i] !== contextParts[i]
				) {
					return false;
				}
			}

			// Check conditions if present
			if (rolePermission.conditions) {
				return (
					rolePermission.granted &&
					this.evaluateConditions(rolePermission.conditions, context)
				);
			}

			return rolePermission.granted;
		},

		evaluateConditions(
			conditions: string,
			context: PermissionContext,
		): boolean {
			try {
				const conditionObj = JSON.parse(conditions);

				// Time-based restrictions
				if (conditionObj.timeRestricted && conditionObj.allowedHours) {
					const now = new Date();
					const currentTime = now.getHours() * 100 + now.getMinutes();
					const [startHour, startMin] = conditionObj.allowedHours
						.split("-")[0]
						.split(":")
						.map(Number);
					const [endHour, endMin] = conditionObj.allowedHours
						.split("-")[1]
						.split(":")
						.map(Number);
					const startTime = startHour * 100 + startMin;
					const endTime = endHour * 100 + endMin;

					if (currentTime < startTime || currentTime > endTime) {
						return false;
					}
				}

				// Day-based restrictions
				if (
					conditionObj.allowedDays &&
					Array.isArray(conditionObj.allowedDays)
				) {
					const now = new Date();
					const dayNames = [
						"sunday",
						"monday",
						"tuesday",
						"wednesday",
						"thursday",
						"friday",
						"saturday",
					];
					const currentDay = dayNames[now.getDay()];

					if (!conditionObj.allowedDays.includes(currentDay)) {
						return false;
					}
				}

				// IP whitelist restrictions
				if (
					conditionObj.ipWhitelist &&
					Array.isArray(conditionObj.ipWhitelist) &&
					context.conditions?.ipAddress
				) {
					// Simple check - in production, use proper CIDR matching
					const isAllowed = conditionObj.ipWhitelist.some(
						(allowedIp: string) => {
							if (allowedIp.includes("/")) {
								// CIDR notation - simplified check
								const [network] = allowedIp.split("/");
								return context.conditions!.ipAddress.startsWith(
									network.split(".").slice(0, 3).join("."),
								);
							}
							return context.conditions!.ipAddress === allowedIp;
						},
					);

					if (!isAllowed) {
						return false;
					}
				}

				// MFA requirement
				if (conditionObj.requireMFA && !context.conditions?.mfaVerified) {
					return false;
				}

				return true;
			} catch {
				return false;
			}
		},

		async evaluatePolicies(
			policies: Policy[],
			context: PermissionContext,
		): Promise<boolean | null> {
			for (const policy of policies) {
				try {
					const rules: PolicyRule[] = JSON.parse(policy.rules);

					for (const rule of rules) {
						if (this.ruleMatches(rule, context)) {
							return rule.effect === "allow";
						}
					}
				} catch (error) {
					console.error("Error evaluating policy:", policy.id, error);
				}
			}

			return null; // No policy matched
		},

		ruleMatches(rule: PolicyRule, context: PermissionContext): boolean {
			// Check resource match
			if (rule.resource && rule.resource !== context.resourceType) {
				return false;
			}

			// Check action match
			if (rule.action && rule.action !== context.action) {
				return false;
			}

			// Evaluate condition if present
			if (rule.condition) {
				// Simple condition evaluation
				// In production, use a proper expression evaluator
				return true; // Placeholder
			}

			return true;
		},

		// Utility methods for role hierarchy
		async getRoleHierarchy(organizationId?: string): Promise<Role[]> {
			const whereClause = organizationId
				? [{ field: "organizationId", value: organizationId }]
				: [];

			return await adapter.findMany<Role>({
				model: "role",
				where: whereClause,
				sortBy: { field: "level", direction: "asc" },
			});
		},

		async getEffectivePermissions(
			userId: string,
			organizationId?: string,
		): Promise<string[]> {
			const userRoles = await this.getUserRoles(userId, organizationId);
			const allPermissions = new Set<string>();

			for (const userRole of userRoles) {
				const rolePermissions = await this.getRolePermissions(userRole.roleId);

				for (const rolePermission of rolePermissions) {
					if (rolePermission.granted) {
						const permission = await this.findPermissionById(
							rolePermission.permissionId,
						);
						if (permission) {
							allPermissions.add(permission.name);
						}
					}
				}
			}

			return Array.from(allPermissions);
		},

		// Permission checking operations
		async checkUserPermission(
			userId: string,
			permission: string,
			organizationId?: string,
			context?: PermissionContext,
		): Promise<boolean> {
			const permissionContext: PermissionContext = context || {
				userId,
				organizationId,
				action: permission,
				resourceType: permission.split(":")[0] || "unknown",
			};

			return await this.evaluatePermission(permissionContext);
		},
	};
};
