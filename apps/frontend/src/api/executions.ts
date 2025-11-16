import apiClient from './client'
import type { Execution, ExecutionLog } from '@/stores/execution'

export interface ExecuteWorkflowDto {
  workflowId: string
  inputData: any
}

export const executionsApi = {
  async execute(data: ExecuteWorkflowDto): Promise<Execution> {
    return apiClient.post('executions', { json: data }).json()
  },

  async getAll(): Promise<Execution[]> {
    return apiClient.get('executions').json()
  },

  async getHistory(): Promise<Execution[]> {
    return apiClient.get('executions').json()
  },

  async getById(id: string): Promise<Execution> {
    return apiClient.get(`executions/${id}`).json()
  },

  async stop(id: string): Promise<void> {
    await apiClient.post(`executions/${id}/stop`)
  },

  async getLogs(id: string): Promise<ExecutionLog[]> {
    return apiClient.get(`executions/${id}/logs`).json()
  },
}
