import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'
import { Buffer } from 'buffer'

@Injectable()
export class PluginStorageService implements OnModuleInit {
  private readonly logger = new Logger(PluginStorageService.name)
  private minioClient: Minio.Client
  private readonly bucketName: string

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost')
    const port = this.configService.get<number>('MINIO_PORT', 9000)
    const useSSL = this.configService.get<boolean>('MINIO_USE_SSL', false)
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin')
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin')

    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME', 'plugins')

    this.minioClient = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    })
  }

  async onModuleInit() {
    try {
      // Check if bucket exists, create if not
      const bucketExists = await this.minioClient.bucketExists(this.bucketName)
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1')
        this.logger.log(`Created bucket: ${this.bucketName}`)
      } else {
        this.logger.log(`Bucket ${this.bucketName} already exists`)
      }
    } catch (error) {
      this.logger.error(`Failed to initialize MinIO bucket: ${error.message}`)
      // Don't throw error to allow service to start even if MinIO is not available
    }
  }

  /**
   * Upload a plugin file to MinIO
   */
  async uploadPlugin(
    tenantId: string,
    pluginId: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string = 'application/zip'
  ): Promise<string> {
    try {
      const objectName = `${tenantId}/${pluginId}/${fileName}`

      // Upload file to MinIO
      await this.minioClient.putObject(this.bucketName, objectName, fileBuffer, fileBuffer.length, {
        'Content-Type': contentType,
      })

      this.logger.log(`Uploaded plugin file: ${objectName}`)

      // Return the object URL
      return `${this.bucketName}/${objectName}`
    } catch (error) {
      this.logger.error(`Failed to upload plugin file: ${error.message}`)
      throw new Error(`Failed to upload plugin file: ${error.message}`)
    }
  }

  /**
   * Download a plugin file from MinIO
   */
  async downloadPlugin(tenantId: string, pluginId: string, fileName: string): Promise<Buffer> {
    try {
      const objectName = `${tenantId}/${pluginId}/${fileName}`

      // Get object stream
      const stream = await this.minioClient.getObject(this.bucketName, objectName)

      // Convert stream to buffer
      const chunks: Buffer[] = []
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
      })
    } catch (error) {
      this.logger.error(`Failed to download plugin file: ${error.message}`)
      throw new Error(`Failed to download plugin file: ${error.message}`)
    }
  }

  /**
   * Delete a plugin file from MinIO
   */
  async deletePlugin(tenantId: string, pluginId: string, fileName: string): Promise<void> {
    try {
      const objectName = `${tenantId}/${pluginId}/${fileName}`

      await this.minioClient.removeObject(this.bucketName, objectName)

      this.logger.log(`Deleted plugin file: ${objectName}`)
    } catch (error) {
      this.logger.error(`Failed to delete plugin file: ${error.message}`)
      throw new Error(`Failed to delete plugin file: ${error.message}`)
    }
  }

  /**
   * Get a presigned URL for downloading a plugin
   */
  async getDownloadUrl(
    tenantId: string,
    pluginId: string,
    fileName: string,
    expirySeconds: number = 3600
  ): Promise<string> {
    try {
      const objectName = `${tenantId}/${pluginId}/${fileName}`

      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        expirySeconds
      )

      return url
    } catch (error) {
      this.logger.error(`Failed to generate download URL: ${error.message}`)
      throw new Error(`Failed to generate download URL: ${error.message}`)
    }
  }

  /**
   * Get a presigned URL for uploading a plugin
   */
  async getUploadUrl(
    tenantId: string,
    pluginId: string,
    fileName: string,
    expirySeconds: number = 3600
  ): Promise<string> {
    try {
      const objectName = `${tenantId}/${pluginId}/${fileName}`

      const url = await this.minioClient.presignedPutObject(
        this.bucketName,
        objectName,
        expirySeconds
      )

      return url
    } catch (error) {
      this.logger.error(`Failed to generate upload URL: ${error.message}`)
      throw new Error(`Failed to generate upload URL: ${error.message}`)
    }
  }

  /**
   * List all plugin files for a tenant
   */
  async listPluginFiles(tenantId: string, pluginId?: string): Promise<string[]> {
    try {
      const prefix = pluginId ? `${tenantId}/${pluginId}/` : `${tenantId}/`

      const objectsList: string[] = []
      const stream = this.minioClient.listObjectsV2(this.bucketName, prefix, true)

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (obj.name) {
            objectsList.push(obj.name)
          }
        })
        stream.on('end', () => resolve(objectsList))
        stream.on('error', reject)
      })
    } catch (error) {
      this.logger.error(`Failed to list plugin files: ${error.message}`)
      throw new Error(`Failed to list plugin files: ${error.message}`)
    }
  }

  /**
   * Check if a plugin file exists
   */
  async pluginFileExists(tenantId: string, pluginId: string, fileName: string): Promise<boolean> {
    try {
      const objectName = `${tenantId}/${pluginId}/${fileName}`

      await this.minioClient.statObject(this.bucketName, objectName)
      return true
    } catch (error) {
      if (error.code === 'NotFound') {
        return false
      }
      throw error
    }
  }
}
