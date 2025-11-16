import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@WebSocketGateway({
  cors: {
    origin: '*', // In production, set this to your frontend URL
    credentials: true,
  },
  namespace: 'executions',
})
export class ExecutionsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ExecutionsGateway.name)

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized')
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`)
        client.disconnect()
        return
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token)
      client.data.userId = payload.sub || payload.id

      this.logger.log(`Client ${client.id} connected (User: ${client.data.userId})`)
    } catch (error) {
      this.logger.error(`Failed to authenticate client ${client.id}:`, error.message)
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`)
  }

  /**
   * Subscribe to execution updates
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() executionId: string) {
    if (!executionId) {
      return { event: 'error', data: 'Execution ID is required' }
    }

    // Join room for this execution
    client.join(executionId)
    this.logger.log(`Client ${client.id} subscribed to execution ${executionId}`)

    return { event: 'subscribed', data: executionId }
  }

  /**
   * Unsubscribe from execution updates
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() executionId: string) {
    if (!executionId) {
      return { event: 'error', data: 'Execution ID is required' }
    }

    // Leave room for this execution
    client.leave(executionId)
    this.logger.log(`Client ${client.id} unsubscribed from execution ${executionId}`)

    return { event: 'unsubscribed', data: executionId }
  }

  /**
   * Send execution status update to subscribed clients
   */
  sendStatus(executionId: string, status: string, metadata?: any) {
    this.logger.log(`Sending status update for execution ${executionId}: ${status}`)

    this.server.to(executionId).emit('status', {
      executionId,
      status,
      metadata,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send execution log to subscribed clients
   */
  sendLog(
    executionId: string,
    log: {
      level: string
      message: string
      nodeId?: string
      metadata?: any
    }
  ) {
    this.server.to(executionId).emit('log', {
      executionId,
      ...log,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send execution result to subscribed clients
   */
  sendResult(executionId: string, result: any) {
    this.logger.log(`Sending result for execution ${executionId}`)

    this.server.to(executionId).emit('result', {
      executionId,
      result,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send execution error to subscribed clients
   */
  sendError(executionId: string, error: string, metadata?: any) {
    this.logger.error(`Sending error for execution ${executionId}: ${error}`)

    this.server.to(executionId).emit('error', {
      executionId,
      error,
      metadata,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send node execution update
   */
  sendNodeUpdate(executionId: string, nodeId: string, status: string, data?: any) {
    this.server.to(executionId).emit('node-update', {
      executionId,
      nodeId,
      status,
      data,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send progress update
   */
  sendProgress(
    executionId: string,
    progress: {
      current: number
      total: number
      percentage: number
      message?: string
    }
  ) {
    this.server.to(executionId).emit('progress', {
      executionId,
      ...progress,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Broadcast message to all connected clients (admin only)
   */
  broadcast(event: string, data: any) {
    this.logger.log(`Broadcasting ${event} to all clients`)
    this.server.emit(event, data)
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    // Find all sockets for this user
    const sockets = Array.from(this.server.sockets.sockets.values())
    const userSockets = sockets.filter((socket) => socket.data.userId === userId)

    userSockets.forEach((socket) => {
      socket.emit(event, data)
    })

    this.logger.log(`Sent ${event} to user ${userId} (${userSockets.length} connections)`)
  }
}
