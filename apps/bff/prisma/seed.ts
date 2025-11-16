import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Default Tenant',
      slug: 'default',
      description: 'Default tenant for development',
      isActive: true,
    },
  })

  console.log('✅ Created default tenant:', defaultTenant.name)

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      isActive: true,
      tenantId: defaultTenant.id,
    },
  })

  console.log('✅ Created admin user:', adminUser.email)

  // Create admin permissions
  const resources = ['workflow', 'execution', 'plugin', 'user', 'tenant']
  const actions = ['create', 'read', 'update', 'delete', 'execute']

  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: {
          userId_resource_action: {
            userId: adminUser.id,
            resource,
            action,
          },
        },
        update: {},
        create: {
          userId: adminUser.id,
          resource,
          action,
        },
      })
    }
  }

  console.log('✅ Created admin permissions')

  // Create demo user
  const demoPassword = await bcrypt.hash('demo123', 10)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: demoPassword,
      name: 'Demo User',
      role: 'user',
      isActive: true,
      tenantId: defaultTenant.id,
    },
  })

  console.log('✅ Created demo user:', demoUser.email)

  // Create demo user permissions (limited)
  const demoResources = ['workflow', 'execution']
  const demoActions = ['create', 'read', 'update', 'delete', 'execute']

  for (const resource of demoResources) {
    for (const action of demoActions) {
      await prisma.permission.upsert({
        where: {
          userId_resource_action: {
            userId: demoUser.id,
            resource,
            action,
          },
        },
        update: {},
        create: {
          userId: demoUser.id,
          resource,
          action,
        },
      })
    }
  }

  console.log('✅ Created demo user permissions')

  // Create sample workflow
  const sampleWorkflow = await prisma.workflow.create({
    data: {
      name: 'Sample Workflow',
      description: 'A simple example workflow',
      definition: {
        nodes: [
          {
            id: 'input-1',
            type: 'input',
            position: { x: 100, y: 100 },
            data: {
              label: 'Input',
              config: {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          {
            id: 'llm-1',
            type: 'llm',
            position: { x: 300, y: 100 },
            data: {
              label: 'LLM Node',
              config: {
                model: 'llama2',
                prompt: 'Process this message: {{input.message}}',
              },
            },
          },
          {
            id: 'output-1',
            type: 'output',
            position: { x: 500, y: 100 },
            data: {
              label: 'Output',
              config: {},
            },
          },
        ],
        edges: [
          {
            id: 'e1-2',
            source: 'input-1',
            target: 'llm-1',
          },
          {
            id: 'e2-3',
            source: 'llm-1',
            target: 'output-1',
          },
        ],
      },
      version: 1,
      isActive: true,
      isPublic: true,
      tags: ['example', 'tutorial'],
      tenantId: defaultTenant.id,
      userId: adminUser.id,
    },
  })

  console.log('✅ Created sample workflow:', sampleWorkflow.name)

  // Create workflow version
  await prisma.workflowVersion.create({
    data: {
      workflowId: sampleWorkflow.id,
      version: 1,
      definition: sampleWorkflow.definition,
      changelog: 'Initial version',
    },
  })

  console.log('✅ Created workflow version')

  console.log('🎉 Database seeding completed!')
  console.log('\n📝 Login credentials:')
  console.log('   Admin: admin@example.com / admin123')
  console.log('   Demo:  demo@example.com / demo123')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
