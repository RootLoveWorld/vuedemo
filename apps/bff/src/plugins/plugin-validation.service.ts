import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import type { PluginManifest } from '@workflow/shared-types'
import * as crypto from 'crypto'
import { Buffer } from 'buffer'

@Injectable()
export class PluginValidationService {
  private readonly logger = new Logger(PluginValidationService.name)

  /**
   * Validate plugin manifest format
   */
  validateManifest(manifest: PluginManifest): void {
    // Check required fields
    if (!manifest.id) {
      throw new BadRequestException('Plugin manifest must have an id')
    }

    if (!manifest.name) {
      throw new BadRequestException('Plugin manifest must have a name')
    }

    if (!manifest.version) {
      throw new BadRequestException('Plugin manifest must have a version')
    }

    if (!manifest.author) {
      throw new BadRequestException('Plugin manifest must have an author')
    }

    if (!manifest.description) {
      throw new BadRequestException('Plugin manifest must have a description')
    }

    if (!manifest.category) {
      throw new BadRequestException('Plugin manifest must have a category')
    }

    // Validate category
    const validCategories = ['integration', 'ai', 'data', 'utility', 'custom']
    if (!validCategories.includes(manifest.category)) {
      throw new BadRequestException(
        `Invalid category. Must be one of: ${validCategories.join(', ')}`
      )
    }

    // Validate version format (semver)
    const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/
    if (!versionRegex.test(manifest.version)) {
      throw new BadRequestException('Version must follow semantic versioning (e.g., 1.0.0)')
    }

    // Validate frontend configuration if present
    if (manifest.frontend) {
      if (!manifest.frontend.component) {
        throw new BadRequestException('Frontend configuration must have a component path')
      }
      if (!manifest.frontend.configPanel) {
        throw new BadRequestException('Frontend configuration must have a configPanel path')
      }
    }

    // Validate backend configuration if present
    if (manifest.backend) {
      if (!manifest.backend.executor) {
        throw new BadRequestException('Backend configuration must have an executor path')
      }
      if (!manifest.backend.entrypoint) {
        throw new BadRequestException('Backend configuration must have an entrypoint path')
      }
    }

    // At least one of frontend or backend must be present
    if (!manifest.frontend && !manifest.backend) {
      throw new BadRequestException('Plugin must have at least frontend or backend configuration')
    }

    this.logger.log(`Manifest validation passed for plugin: ${manifest.name}`)
  }

  /**
   * Validate plugin permissions
   */
  validatePermissions(permissions: string[]): void {
    const validPermissions = [
      'workflow:read',
      'workflow:write',
      'workflow:execute',
      'execution:read',
      'execution:write',
      'storage:read',
      'storage:write',
      'network:http',
      'network:websocket',
      'system:env',
    ]

    for (const permission of permissions) {
      if (!validPermissions.includes(permission)) {
        throw new BadRequestException(
          `Invalid permission: ${permission}. Valid permissions: ${validPermissions.join(', ')}`
        )
      }
    }

    this.logger.log(`Permission validation passed: ${permissions.join(', ')}`)
  }

  /**
   * Verify plugin digital signature
   * This is a simplified implementation. In production, you would use proper PKI
   */
  verifySignature(pluginData: Buffer, signature: string, publicKey: string): boolean {
    try {
      // Create a verify object
      const verifier = crypto.createVerify('RSA-SHA256')
      verifier.update(pluginData)

      // Verify the signature
      const isValid = verifier.verify(publicKey, signature, 'base64')

      if (isValid) {
        this.logger.log('Plugin signature verification passed')
      } else {
        this.logger.warn('Plugin signature verification failed')
      }

      return isValid
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Signature verification error: ${errorMessage}`)
      return false
    }
  }

  /**
   * Calculate plugin file hash
   */
  calculateHash(fileBuffer: Buffer, algorithm: string = 'sha256'): string {
    const hash = crypto.createHash(algorithm)
    hash.update(fileBuffer)
    return hash.digest('hex')
  }

  /**
   * Verify plugin file integrity
   */
  verifyFileIntegrity(
    fileBuffer: Buffer,
    expectedHash: string,
    algorithm: string = 'sha256'
  ): boolean {
    const actualHash = this.calculateHash(fileBuffer, algorithm)
    const isValid = actualHash === expectedHash

    if (isValid) {
      this.logger.log('File integrity verification passed')
    } else {
      this.logger.warn(
        `File integrity verification failed. Expected: ${expectedHash}, Got: ${actualHash}`
      )
    }

    return isValid
  }

  /**
   * Validate plugin dependencies
   */
  validateDependencies(dependencies: { python?: string[]; npm?: string[] }): void {
    // Check for potentially dangerous dependencies
    const dangerousPythonPackages = ['os', 'subprocess', 'eval', 'exec']
    const dangerousNpmPackages = ['child_process', 'fs', 'eval']

    if (dependencies.python) {
      for (const pkg of dependencies.python) {
        const pkgName = pkg.split('==')[0].split('>=')[0].split('<=')[0].trim()
        if (dangerousPythonPackages.includes(pkgName)) {
          throw new BadRequestException(
            `Potentially dangerous Python dependency detected: ${pkgName}`
          )
        }
      }
    }

    if (dependencies.npm) {
      for (const pkg of dependencies.npm) {
        const pkgName = pkg.split('@')[0].trim()
        if (dangerousNpmPackages.includes(pkgName)) {
          throw new BadRequestException(`Potentially dangerous NPM dependency detected: ${pkgName}`)
        }
      }
    }

    this.logger.log('Dependency validation passed')
  }

  /**
   * Comprehensive plugin validation
   */
  async validatePlugin(
    manifest: PluginManifest,
    fileBuffer?: Buffer,
    signature?: string,
    publicKey?: string
  ): Promise<void> {
    // Validate manifest
    this.validateManifest(manifest)

    // Validate permissions if present
    if (manifest.permissions && manifest.permissions.length > 0) {
      this.validatePermissions(manifest.permissions)
    }

    // Validate dependencies if present
    if (manifest.dependencies) {
      this.validateDependencies(manifest.dependencies)
    }

    // Verify signature if provided
    if (fileBuffer && signature && publicKey) {
      const isSignatureValid = this.verifySignature(fileBuffer, signature, publicKey)
      if (!isSignatureValid) {
        throw new BadRequestException('Plugin signature verification failed')
      }
    }

    this.logger.log(`Complete validation passed for plugin: ${manifest.name}`)
  }
}
