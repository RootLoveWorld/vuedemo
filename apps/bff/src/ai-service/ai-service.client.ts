import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom, retry, catchError, timeout } from 'rxjs'
import { AxiosError } from 'axios'

export interface ExecuteWorkflowPayload {
  executionId: string
  definition: any
  inputData: any
}

export interface ExecuteWorkflowResponse {
  executionId: string
  status: string
  message?: string
}

export interface StopExecutionPayload {
  executionId: string
  reason?: string
}

export interface ModelInfo {
  name: string
  size?: string
  modified_at?: string
}

@Injectable()
export class AiServiceClient {
  private readonly logger = new Logger(AiServiceClient.name)
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly maxRetries: number

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.baseUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000')
    this.timeout = this.configService.get<number>('AI_SERVICE_TIMEOUT', 300000) // 5 minutes
    this.maxRetries = this.configService.get<number>('AI_SERVICE_MAX_RETRIES', 3)

    this.logger.log(`AI Service Client initialized with base URL: ${this.baseUrl}`)
  }

  /**
   * Execute a workflow on the AI Service
   */
  async executeWorkflow(payload: ExecuteWorkflowPayload): Promise<ExecuteWorkflowResponse> {
    this.logger.log(`Executing workflow for execution ${payload.executionId}`)

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<ExecuteWorkflowResponse>(`${this.baseUrl}/api/v1/execute`, payload, {
            timeout: this.timeout,
          })
          .pipe(
            timeout(this.timeout),
            retry({
              count: this.maxRetries,
              delay: (error, retryCount) => {
                // Exponential backoff: 1s, 2s, 4s
                const delayMs = Math.pow(2, retryCount - 1) * 1000
                this.logger.warn(
                  `Retry ${retryCount}/${this.maxRetries} for execution ${payload.executionId} after ${delayMs}ms`
                )
                return new Promise((resolve) => setTimeout(resolve, delayMs))
              },
              resetOnSuccess: true,
            }),
            catchError((error: AxiosError) => {
              this.logger.error(`Failed to execute workflow ${payload.executionId}:`, error.message)
              throw this.handleError(error)
            })
          )
      )

      this.logger.log(`Workflow execution ${payload.executionId} triggered successfully`)
      return response.data
    } catch (error) {
      this.logger.error(`Error executing workflow ${payload.executionId}:`, error)
      throw error
    }
  }

  /**
   * Stop a running execution
   */
  async stopExecution(executionId: string, reason?: string): Promise<void> {
    this.logger.log(`Stopping execution ${executionId}`)

    try {
      await firstValueFrom(
        this.httpService
          .post(`${this.baseUrl}/api/v1/execute/${executionId}/stop`, {
            reason,
          })
          .pipe(
            timeout(10000), // 10 seconds timeout for stop requests
            catchError((error: AxiosError) => {
              this.logger.error(`Failed to stop execution ${executionId}:`, error.message)
              throw this.handleError(error)
            })
          )
      )

      this.logger.log(`Execution ${executionId} stop signal sent`)
    } catch (error) {
      this.logger.error(`Error stopping execution ${executionId}:`, error)
      throw error
    }
  }

  /**
   * Get execution status from AI Service
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    this.logger.log(`Getting status for execution ${executionId}`)

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/execute/${executionId}/status`).pipe(
          timeout(5000), // 5 seconds timeout
          catchError((error: AxiosError) => {
            this.logger.error(`Failed to get status for execution ${executionId}:`, error.message)
            throw this.handleError(error)
          })
        )
      )

      return response.data
    } catch (error) {
      this.logger.error(`Error getting execution status ${executionId}:`, error)
      throw error
    }
  }

  /**
   * Get available models from Ollama
   */
  async listModels(): Promise<ModelInfo[]> {
    this.logger.log('Fetching available models from AI Service')

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ models: ModelInfo[] }>(`${this.baseUrl}/api/v1/models`).pipe(
          timeout(10000), // 10 seconds timeout
          catchError((error: AxiosError) => {
            this.logger.error('Failed to fetch models:', error.message)
            throw this.handleError(error)
          })
        )
      )

      this.logger.log(`Found ${response.data.models?.length || 0} models`)
      return response.data.models || []
    } catch (error) {
      this.logger.error('Error fetching models:', error)
      throw error
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<ModelInfo> {
    this.logger.log(`Fetching info for model: ${modelName}`)

    try {
      const response = await firstValueFrom(
        this.httpService.get<ModelInfo>(`${this.baseUrl}/api/v1/models/${modelName}`).pipe(
          timeout(5000),
          catchError((error: AxiosError) => {
            this.logger.error(`Failed to fetch model info for ${modelName}:`, error.message)
            throw this.handleError(error)
          })
        )
      )

      return response.data
    } catch (error) {
      this.logger.error(`Error fetching model info for ${modelName}:`, error)
      throw error
    }
  }

  /**
   * Health check for AI Service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`).pipe(
          timeout(5000),
          catchError(() => {
            return Promise.resolve({ data: { status: 'unhealthy' } })
          })
        )
      )

      const isHealthy = response.data?.status === 'healthy' || response.status === 200
      this.logger.log(`AI Service health check: ${isHealthy ? 'healthy' : 'unhealthy'}`)
      return isHealthy
    } catch (error) {
      this.logger.warn('AI Service health check failed:', error.message)
      return false
    }
  }

  /**
   * Handle HTTP errors and convert to appropriate exceptions
   */
  private handleError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const message = error.response.data?.['message'] || error.message

      this.logger.error(`AI Service error (${status}): ${message}`)

      return new Error(`AI Service error (${status}): ${message}`)
    } else if (error.request) {
      // Request was made but no response received
      this.logger.error('AI Service did not respond:', error.message)
      return new Error('AI Service is not responding. Please try again later.')
    } else {
      // Something else happened
      this.logger.error('Error setting up request to AI Service:', error.message)
      return new Error(`Failed to communicate with AI Service: ${error.message}`)
    }
  }
}
