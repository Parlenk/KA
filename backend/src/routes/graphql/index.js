/**
 * GraphQL API for Creative Design Platform
 * Advanced query capabilities and real-time subscriptions
 */

const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub, withFilter } = require('graphql-subscriptions');
const { createRateLimitDirective } = require('graphql-rate-limit-directive');
const { shield, rule, and, or } = require('graphql-shield');
const { 
  authenticateGraphQL, 
  requireGraphQLScopes,
  rateLimitGraphQL 
} = require('../../middleware/graphqlAuth');

const typeDefs = `
  # Directives
  directive @rateLimit(
    max: Int = 60
    window: String = "1m"
    message: String = "Rate limit exceeded"
  ) on FIELD_DEFINITION

  directive @auth(requires: [String!]) on FIELD_DEFINITION

  # Scalars
  scalar DateTime
  scalar JSON
  scalar Upload

  # Enums
  enum DesignStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  enum ExportFormat {
    PNG
    JPG
    PDF
    SVG
    HTML5
    MP4
    GIF
  }

  enum ExportStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }

  enum AssetType {
    IMAGE
    VIDEO
    AUDIO
    FONT
  }

  enum WebhookEvent {
    DESIGN_CREATED
    DESIGN_UPDATED
    DESIGN_DELETED
    EXPORT_COMPLETED
    EXPORT_FAILED
  }

  # Types
  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: DateTime!
  }

  type Design {
    id: ID!
    name: String!
    description: String
    status: DesignStatus!
    width: Int!
    height: Int!
    thumbnail: String
    canvasData: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    user: User!
    designSet: DesignSet
    exports: [Export!]!
    template: Template
  }

  type DesignSet {
    id: ID!
    name: String!
    description: String
    designs: [Design!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    user: User!
  }

  type Template {
    id: ID!
    name: String!
    description: String
    category: String!
    width: Int!
    height: Int!
    thumbnail: String
    canvasData: JSON
    isPublic: Boolean!
    isPremium: Boolean!
    tags: [String!]!
    createdAt: DateTime!
    user: User!
    designs: [Design!]!
  }

  type Export {
    id: ID!
    format: ExportFormat!
    status: ExportStatus!
    progress: Int
    downloadUrl: String
    error: String
    settings: JSON
    createdAt: DateTime!
    completedAt: DateTime
    design: Design!
    user: User!
  }

  type Asset {
    id: ID!
    name: String!
    type: AssetType!
    url: String!
    thumbnailUrl: String
    size: Int!
    mimeType: String!
    dimensions: JSON
    tags: [String!]!
    createdAt: DateTime!
    user: User!
  }

  type BrandKit {
    id: ID!
    name: String!
    colors: [BrandColor!]!
    fonts: [BrandFont!]!
    logos: [BrandLogo!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    user: User!
  }

  type BrandColor {
    id: ID!
    name: String!
    hex: String!
    usage: Int!
    order: Int!
  }

  type BrandFont {
    id: ID!
    family: String!
    url: String
    type: String!
    variants: [String!]!
  }

  type BrandLogo {
    id: ID!
    name: String!
    url: String!
    type: String!
    dimensions: JSON
  }

  type Webhook {
    id: ID!
    url: String!
    events: [WebhookEvent!]!
    isActive: Boolean!
    secret: String!
    createdAt: DateTime!
    user: User!
  }

  type APIKey {
    id: ID!
    name: String!
    keyPrefix: String!
    scopes: [String!]!
    isActive: Boolean!
    lastUsed: DateTime
    createdAt: DateTime!
    expiresAt: DateTime
  }

  # Connection types for pagination
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type DesignConnection {
    edges: [DesignEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type DesignEdge {
    node: Design!
    cursor: String!
  }

  type TemplateConnection {
    edges: [TemplateEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type TemplateEdge {
    node: Template!
    cursor: String!
  }

  type ExportConnection {
    edges: [ExportEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type ExportEdge {
    node: Export!
    cursor: String!
  }

  # Input types
  input DesignInput {
    name: String!
    description: String
    width: Int!
    height: Int!
    canvasData: JSON
    templateId: ID
    designSetId: ID
  }

  input DesignUpdateInput {
    name: String
    description: String
    status: DesignStatus
    canvasData: JSON
  }

  input DesignSetInput {
    name: String!
    description: String
  }

  input TemplateInput {
    name: String!
    description: String
    category: String!
    width: Int!
    height: Int!
    canvasData: JSON!
    isPublic: Boolean
    isPremium: Boolean
    tags: [String!]
  }

  input ExportInput {
    designId: ID!
    format: ExportFormat!
    quality: Int
    width: Int
    height: Int
    background: String
  }

  input AssetInput {
    name: String!
    type: AssetType!
    tags: [String!]
  }

  input BrandKitInput {
    name: String!
  }

  input BrandColorInput {
    name: String!
    hex: String!
    order: Int
  }

  input BrandFontInput {
    family: String!
    url: String
    type: String!
    variants: [String!]
  }

  input BrandLogoInput {
    name: String!
    type: String!
  }

  input WebhookInput {
    url: String!
    events: [WebhookEvent!]!
  }

  input APIKeyInput {
    name: String!
    scopes: [String!]!
    expiresAt: DateTime
  }

  # Queries
  type Query {
    # Designs
    designs(
      first: Int
      after: String
      search: String
      status: DesignStatus
      createdAfter: DateTime
      createdBefore: DateTime
    ): DesignConnection! @rateLimit(max: 100) @auth(requires: ["designs:read"])

    design(id: ID!): Design @rateLimit(max: 200) @auth(requires: ["designs:read"])

    # Design Sets
    designSets: [DesignSet!]! @rateLimit(max: 50) @auth(requires: ["designs:read"])
    designSet(id: ID!): DesignSet @rateLimit(max: 100) @auth(requires: ["designs:read"])

    # Templates
    templates(
      first: Int
      after: String
      category: String
      search: String
      publicOnly: Boolean
    ): TemplateConnection! @rateLimit(max: 100)

    template(id: ID!): Template @rateLimit(max: 200)

    # Exports
    exports(
      first: Int
      after: String
      format: ExportFormat
      status: ExportStatus
    ): ExportConnection! @rateLimit(max: 50) @auth(requires: ["exports:read"])

    export(id: ID!): Export @rateLimit(max: 200) @auth(requires: ["exports:read"])

    # Assets
    assets(
      type: AssetType
      search: String
      tags: [String!]
    ): [Asset!]! @rateLimit(max: 100) @auth(requires: ["assets:read"])

    asset(id: ID!): Asset @rateLimit(max: 200) @auth(requires: ["assets:read"])

    # Brand Kits
    brandKits: [BrandKit!]! @rateLimit(max: 50) @auth(requires: ["brandkits:read"])
    brandKit(id: ID!): BrandKit @rateLimit(max: 100) @auth(requires: ["brandkits:read"])

    # Webhooks
    webhooks: [Webhook!]! @rateLimit(max: 20) @auth(requires: ["webhooks:read"])
    webhook(id: ID!): Webhook @rateLimit(max: 50) @auth(requires: ["webhooks:read"])

    # API Keys
    apiKeys: [APIKey!]! @rateLimit(max: 20) @auth(requires: ["apikeys:read"])

    # Analytics
    analytics(
      from: DateTime!
      to: DateTime!
      metrics: [String!]!
    ): JSON @rateLimit(max: 10) @auth(requires: ["analytics:read"])

    # System
    me: User! @rateLimit(max: 100)
    usage: JSON! @rateLimit(max: 50)
  }

  # Mutations
  type Mutation {
    # Designs
    createDesign(input: DesignInput!): Design! @rateLimit(max: 50) @auth(requires: ["designs:write"])
    updateDesign(id: ID!, input: DesignUpdateInput!): Design! @rateLimit(max: 100) @auth(requires: ["designs:write"])
    deleteDesign(id: ID!): Boolean! @rateLimit(max: 30) @auth(requires: ["designs:delete"])
    duplicateDesign(id: ID!, name: String): Design! @rateLimit(max: 20) @auth(requires: ["designs:write"])

    # Design Sets
    createDesignSet(input: DesignSetInput!): DesignSet! @rateLimit(max: 20) @auth(requires: ["designs:write"])
    updateDesignSet(id: ID!, input: DesignSetInput!): DesignSet! @rateLimit(max: 50) @auth(requires: ["designs:write"])
    deleteDesignSet(id: ID!): Boolean! @rateLimit(max: 10) @auth(requires: ["designs:delete"])
    addDesignToSet(designSetId: ID!, designId: ID!): DesignSet! @rateLimit(max: 50) @auth(requires: ["designs:write"])

    # Templates
    createTemplate(input: TemplateInput!): Template! @rateLimit(max: 10) @auth(requires: ["templates:write"])
    updateTemplate(id: ID!, input: TemplateInput!): Template! @rateLimit(max: 20) @auth(requires: ["templates:write"])
    deleteTemplate(id: ID!): Boolean! @rateLimit(max: 5) @auth(requires: ["templates:delete"])

    # Exports
    createExport(input: ExportInput!): Export! @rateLimit(max: 20) @auth(requires: ["exports:create"])
    cancelExport(id: ID!): Boolean! @rateLimit(max: 50) @auth(requires: ["exports:write"])

    # Assets
    uploadAsset(file: Upload!, input: AssetInput!): Asset! @rateLimit(max: 10) @auth(requires: ["assets:write"])
    updateAsset(id: ID!, input: AssetInput!): Asset! @rateLimit(max: 50) @auth(requires: ["assets:write"])
    deleteAsset(id: ID!): Boolean! @rateLimit(max: 30) @auth(requires: ["assets:delete"])

    # Brand Kits
    createBrandKit(input: BrandKitInput!): BrandKit! @rateLimit(max: 10) @auth(requires: ["brandkits:write"])
    updateBrandKit(id: ID!, input: BrandKitInput!): BrandKit! @rateLimit(max: 20) @auth(requires: ["brandkits:write"])
    deleteBrandKit(id: ID!): Boolean! @rateLimit(max: 5) @auth(requires: ["brandkits:delete"])
    
    addBrandColor(brandKitId: ID!, input: BrandColorInput!): BrandKit! @rateLimit(max: 50) @auth(requires: ["brandkits:write"])
    updateBrandColor(id: ID!, input: BrandColorInput!): BrandKit! @rateLimit(max: 50) @auth(requires: ["brandkits:write"])
    deleteBrandColor(id: ID!): BrandKit! @rateLimit(max: 50) @auth(requires: ["brandkits:write"])

    # Webhooks
    createWebhook(input: WebhookInput!): Webhook! @rateLimit(max: 5) @auth(requires: ["webhooks:write"])
    updateWebhook(id: ID!, input: WebhookInput!): Webhook! @rateLimit(max: 10) @auth(requires: ["webhooks:write"])
    deleteWebhook(id: ID!): Boolean! @rateLimit(max: 5) @auth(requires: ["webhooks:delete"])
    testWebhook(id: ID!): Boolean! @rateLimit(max: 5) @auth(requires: ["webhooks:write"])

    # API Keys
    createAPIKey(input: APIKeyInput!): APIKey! @rateLimit(max: 2) @auth(requires: ["apikeys:write"])
    revokeAPIKey(id: ID!): Boolean! @rateLimit(max: 5) @auth(requires: ["apikeys:delete"])
  }

  # Subscriptions
  type Subscription {
    # Real-time updates
    designUpdated(designId: ID): Design! @auth(requires: ["designs:read"])
    exportProgress(exportId: ID!): Export! @auth(requires: ["exports:read"])
    webhookEvent(events: [WebhookEvent!]): JSON! @auth(requires: ["webhooks:read"])
    
    # Analytics
    usageUpdated: JSON! @auth(requires: ["analytics:read"])
  }
`;

// Create PubSub instance for subscriptions
const pubsub = new PubSub();

const resolvers = {
  // Queries
  Query: {
    designs: async (parent, args, context) => {
      const { first = 20, after, search, status, createdAfter, createdBefore } = args;
      const { user, prisma } = context;

      const where = { userId: user.id };
      
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }
      if (status) {
        where.status = status.toLowerCase();
      }
      if (createdAfter || createdBefore) {
        where.createdAt = {};
        if (createdAfter) where.createdAt.gte = createdAfter;
        if (createdBefore) where.createdAt.lte = createdBefore;
      }

      const cursor = after ? { id: after } : undefined;
      
      const designs = await prisma.design.findMany({
        where,
        take: first + 1,
        cursor,
        skip: cursor ? 1 : 0,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: true,
          designSet: true,
          exports: { take: 5, orderBy: { createdAt: 'desc' } },
          template: true
        }
      });

      const hasNextPage = designs.length > first;
      const edges = designs.slice(0, first).map(design => ({
        node: design,
        cursor: design.id
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor
        },
        totalCount: await prisma.design.count({ where })
      };
    },

    design: async (parent, { id }, context) => {
      const { user, prisma } = context;
      return await prisma.design.findFirst({
        where: { id, userId: user.id },
        include: {
          user: true,
          designSet: { include: { designs: true } },
          exports: { orderBy: { createdAt: 'desc' } },
          template: true
        }
      });
    },

    templates: async (parent, args, context) => {
      const { first = 20, after, category, search, publicOnly } = args;
      const { user, prisma } = context;

      const where = {};
      
      if (publicOnly) {
        where.isPublic = true;
      } else if (user) {
        where.OR = [
          { isPublic: true },
          { userId: user.id }
        ];
      } else {
        where.isPublic = true;
      }

      if (category) {
        where.category = category;
      }
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      const cursor = after ? { id: after } : undefined;
      
      const templates = await prisma.template.findMany({
        where,
        take: first + 1,
        cursor,
        skip: cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          _count: { select: { designs: true } }
        }
      });

      const hasNextPage = templates.length > first;
      const edges = templates.slice(0, first).map(template => ({
        node: template,
        cursor: template.id
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor
        },
        totalCount: await prisma.template.count({ where })
      };
    },

    me: async (parent, args, context) => {
      return context.user;
    },

    usage: async (parent, args, context) => {
      const { user, prisma } = context;
      
      const [designCount, exportCount, assetCount] = await Promise.all([
        prisma.design.count({ where: { userId: user.id } }),
        prisma.export.count({ where: { userId: user.id } }),
        prisma.asset.count({ where: { userId: user.id } })
      ]);

      return {
        designs: designCount,
        exports: exportCount,
        assets: assetCount,
        apiCalls: user.apiCallsCount || 0
      };
    }
  },

  // Mutations
  Mutation: {
    createDesign: async (parent, { input }, context) => {
      const { user, prisma } = context;
      
      const design = await prisma.design.create({
        data: {
          ...input,
          status: 'draft',
          userId: user.id
        },
        include: {
          user: true,
          designSet: true,
          template: true
        }
      });

      // Publish to subscriptions
      pubsub.publish('DESIGN_UPDATED', { designUpdated: design });

      return design;
    },

    updateDesign: async (parent, { id, input }, context) => {
      const { user, prisma } = context;
      
      const design = await prisma.design.update({
        where: { id, userId: user.id },
        data: input,
        include: {
          user: true,
          designSet: true,
          exports: true,
          template: true
        }
      });

      // Publish to subscriptions
      pubsub.publish('DESIGN_UPDATED', { designUpdated: design });

      return design;
    },

    createExport: async (parent, { input }, context) => {
      const { user, prisma, exportQueue } = context;
      
      const exportJob = await prisma.export.create({
        data: {
          ...input,
          status: 'pending',
          userId: user.id,
          settings: {
            quality: input.quality || 90,
            width: input.width,
            height: input.height,
            background: input.background
          }
        },
        include: {
          design: true,
          user: true
        }
      });

      // Queue export job
      await exportQueue.add('export', {
        exportId: exportJob.id,
        designId: input.designId,
        format: input.format,
        settings: exportJob.settings
      });

      return exportJob;
    },

    createWebhook: async (parent, { input }, context) => {
      const { user, prisma } = context;
      const crypto = require('crypto');
      
      const webhook = await prisma.webhook.create({
        data: {
          ...input,
          secret: crypto.randomBytes(32).toString('hex'),
          isActive: true,
          userId: user.id
        },
        include: {
          user: true
        }
      });

      return webhook;
    }
  },

  // Subscriptions
  Subscription: {
    designUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['DESIGN_UPDATED']),
        (payload, variables, context) => {
          if (!variables.designId) return true;
          return payload.designUpdated.id === variables.designId;
        }
      )
    },

    exportProgress: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['EXPORT_PROGRESS']),
        (payload, variables) => {
          return payload.exportProgress.id === variables.exportId;
        }
      )
    }
  }
};

// Security rules
const permissions = shield({
  Query: {
    designs: and(authenticateGraphQL, requireGraphQLScopes(['designs:read'])),
    design: and(authenticateGraphQL, requireGraphQLScopes(['designs:read'])),
    exports: and(authenticateGraphQL, requireGraphQLScopes(['exports:read'])),
    assets: and(authenticateGraphQL, requireGraphQLScopes(['assets:read'])),
    me: authenticateGraphQL
  },
  Mutation: {
    createDesign: and(authenticateGraphQL, requireGraphQLScopes(['designs:write'])),
    updateDesign: and(authenticateGraphQL, requireGraphQLScopes(['designs:write'])),
    deleteDesign: and(authenticateGraphQL, requireGraphQLScopes(['designs:delete'])),
    createExport: and(authenticateGraphQL, requireGraphQLScopes(['exports:create']))
  },
  Subscription: {
    designUpdated: authenticateGraphQL,
    exportProgress: authenticateGraphQL
  }
});

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// Apply rate limiting directive
const rateLimitDirective = createRateLimitDirective({
  keyGenerator: (root, args, context) => context.user?.id || context.req.ip
});

// Create Apollo Server
const createGraphQLServer = () => {
  return new ApolloServer({
    schema,
    schemaDirectives: {
      rateLimit: rateLimitDirective
    },
    context: ({ req, connection }) => {
      if (connection) {
        // WebSocket connection for subscriptions
        return connection.context;
      }
      
      return {
        req,
        user: req.user,
        prisma: req.prisma,
        exportQueue: req.exportQueue,
        pubsub
      };
    },
    subscriptions: {
      onConnect: async (connectionParams, webSocket, context) => {
        // Authenticate WebSocket connections
        const token = connectionParams.authorization;
        if (!token) {
          throw new Error('Missing authorization token');
        }

        try {
          const user = await authenticateToken(token);
          return { user };
        } catch (error) {
          throw new Error('Invalid authorization token');
        }
      }
    },
    playground: process.env.NODE_ENV === 'development',
    introspection: process.env.NODE_ENV === 'development',
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      
      if (process.env.NODE_ENV === 'production') {
        // Don't expose internal errors in production
        if (error.message.includes('Database') || error.message.includes('Internal')) {
          return new Error('Internal server error');
        }
      }

      return error;
    }
  });
};

module.exports = {
  createGraphQLServer,
  typeDefs,
  resolvers,
  pubsub
};