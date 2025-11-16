import apiClient from './client'
import type { Workflow, CreateWorkflowDto, UpdateWorkflowDto } from '@workflow/shared-types'

export interface WorkflowVersion {
  id: string
  workflowId: string
  version: number
  definition: any
  createdAt: Date
  createdBy: string
}

export const workflowsApi = {
  async getAll(): Promise<Workflow[]> {
    return apiClient.get('workflows').json()
  },

  async getById(id: string): Promise<Workflow> {
    return apiClient.get(`workflows/${id}`).json()
  },

  async create(data: CreateWorkflowDto): Promise<Workflow> {
    return apiClient.post('workflows', { json: data }).json()
  },

  async update(id: string, data: UpdateWorkflowDto): Promise<Workflow> {
    return apiClient.put(`workflows/${id}`, { json: data }).json()
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`workflows/${id}`)
  },

  async clone(id: string): Promise<Workflow> {
    return apiClient.post(`workflows/${id}/clone`).json()
  },

  // Version management
  async getVersionHistory(id: string): Promise<WorkflowVersion[]> {
    return apiClient.get(`workflows/${id}/versions`).json()
  },

  async getVersion(id: string, version: number): Promise<WorkflowVersion> {
    return apiClient.get(`workflows/${id}/versions/${version}`).json()
  },

  async rollbackToVersion(id: string, version: number): Promise<Workflow> {
    return apiClient.post(`workflows/${id}/versions/${version}/rollback`).json()
  },
}
