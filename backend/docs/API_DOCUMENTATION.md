# Creative Design Platform API Documentation

## Table of Contents
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [REST API Reference](#rest-api-reference)
- [GraphQL API](#graphql-api)
- [Webhooks](#webhooks)
- [Social Media Integration](#social-media-integration)
- [Cloud Storage Integration](#cloud-storage-integration)
- [SDK Examples](#sdk-examples)
- [Changelog](#changelog)

## Getting Started

The Creative Design Platform API provides programmatic access to design creation, management, and publishing capabilities. Built with modern REST and GraphQL endpoints, it supports real-time collaboration, multi-format exports, and third-party integrations.

### Base URL
```
Production: https://api.creativeplatform.com/
Staging: https://staging-api.creativeplatform.com/
```

### API Versioning
The API uses URL-based versioning. The current version is `v1`.
```
https://api.creativeplatform.com/api/v1/
```

### Quick Start Example
```bash
# Get your API key from the dashboard
export API_KEY="cp_live_your_api_key_here"

# Create a new design set
curl -X POST "https://api.creativeplatform.com/api/v1/design-sets" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Design Set",
    "projectId": "proj_123456789"
  }'
```

## Authentication

The API uses API key authentication. All requests must include your API key in the `X-API-Key` header.

### API Key Format
```
cp_{environment}_{32_character_key}
```

### Scopes
API keys support granular scopes to limit access:

- `designs:read` - View designs and canvas data
- `designs:write` - Create and modify designs
- `designs:delete` - Delete designs
- `exports:read` - View export jobs and results
- `exports:write` - Create export jobs
- `templates:read` - Access template library
- `templates:write` - Create and modify templates
- `assets:read` - View asset library
- `assets:write` - Upload and manage assets
- `brand_kits:read` - View brand kits
- `brand_kits:write` - Create and modify brand kits
- `webhooks:read` - View webhook configurations
- `webhooks:write` - Create and modify webhooks
- `webhooks:delete` - Delete webhooks
- `social_media:read` - View social connections
- `social_media:write` - Publish to social platforms
- `cloud_storage:read` - View cloud storage connections
- `cloud_storage:write` - Upload to cloud storage
- `analytics:read` - View usage analytics

### Authentication Example
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.creativeplatform.com/api/v1',
  headers: {
    'X-API-Key': 'cp_live_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

// All requests will automatically include authentication
const response = await client.get('/design-sets');
```

## Rate Limiting

API requests are rate-limited to ensure fair usage and system stability.

### Limits
- **General API**: 1000 requests per 15 minutes per API key
- **Webhook Management**: 50 requests per 15 minutes per API key
- **Cloud Storage Operations**: 100 requests per 15 minutes per API key
- **Social Media Publishing**: 50 requests per 15 minutes per API key

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please try again later.",
  "retryAfter": 900
}
```

## Error Handling

The API uses conventional HTTP response codes and returns detailed error information in JSON format.

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `413` - Payload Too Large
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error description",
  "details": [
    {
      "field": "email",
      "code": "invalid_email",
      "message": "Invalid email format"
    }
  ],
  "requestId": "req_1234567890abcdef",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED` - Missing or invalid API key
- `INSUFFICIENT_SCOPE` - API key lacks required permissions
- `VALIDATION_ERROR` - Request validation failed
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

## REST API Reference

### Design Sets

Design sets group multiple canvas sizes together for synchronized editing.

#### Create Design Set
```http
POST /api/v1/design-sets
```

**Parameters:**
```json
{
  "name": "string (required)",
  "projectId": "string (required)",
  "description": "string (optional)",
  "masterCanvasId": "string (optional)",
  "syncSettings": {
    "syncColors": "boolean (default: true)",
    "syncFonts": "boolean (default: true)",
    "syncLayout": "boolean (default: false)",
    "syncAnimations": "boolean (default: false)"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "ds_1234567890abcdef",
    "name": "My Design Set",
    "projectId": "proj_123456789",
    "masterCanvasId": null,
    "syncSettings": {
      "syncColors": true,
      "syncFonts": true,
      "syncLayout": false,
      "syncAnimations": false
    },
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

#### List Design Sets
```http
GET /api/v1/design-sets
```

**Query Parameters:**
- `projectId` (string, optional) - Filter by project
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Results per page
- `search` (string, optional) - Search by name

**Response:**
```json
{
  "data": [
    {
      "id": "ds_1234567890abcdef",
      "name": "My Design Set",
      "canvasCount": 5,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### Get Design Set
```http
GET /api/v1/design-sets/{id}
```

**Response:**
```json
{
  "data": {
    "id": "ds_1234567890abcdef",
    "name": "My Design Set",
    "canvases": [
      {
        "id": "canvas_123",
        "name": "Instagram Square",
        "width": 1080,
        "height": 1080,
        "platform": "instagram"
      }
    ],
    "syncSettings": {
      "syncColors": true,
      "syncFonts": true
    }
  }
}
```

#### Update Design Set
```http
PUT /api/v1/design-sets/{id}
```

#### Delete Design Set
```http
DELETE /api/v1/design-sets/{id}
```

### Canvases

Canvases represent individual design artboards with specific dimensions.

#### Create Canvas
```http
POST /api/v1/canvases
```

**Parameters:**
```json
{
  "designSetId": "string (required)",
  "name": "string (optional)",
  "width": "integer (required)",
  "height": "integer (required)",
  "sizeId": "string (required)",
  "platform": "string (optional)",
  "backgroundColor": "string (default: #ffffff)"
}
```

#### Get Canvas
```http
GET /api/v1/canvases/{id}
```

**Response:**
```json
{
  "data": {
    "id": "canvas_123",
    "name": "Instagram Square",
    "width": 1080,
    "height": 1080,
    "sizeId": "instagram-square",
    "platform": "instagram",
    "backgroundColor": "#ffffff",
    "objects": [
      {
        "id": "obj_456",
        "type": "text",
        "properties": {
          "x": 100,
          "y": 100,
          "text": "Hello World",
          "fontSize": 24
        }
      }
    ]
  }
}
```

#### Update Canvas
```http
PUT /api/v1/canvases/{id}
```

#### Add Object to Canvas
```http
POST /api/v1/canvases/{id}/objects
```

**Parameters:**
```json
{
  "type": "text|image|shape|video",
  "properties": {
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 50,
    "text": "Sample Text",
    "fontSize": 24,
    "fill": "#000000"
  }
}
```

### Animations

Create and manage timeline-based animations for canvas objects.

#### Create Animation
```http
POST /api/v1/animations
```

**Parameters:**
```json
{
  "canvasId": "string (required)",
  "objectId": "string (required)",
  "timeline": {
    "duration": 3000,
    "keyframes": [
      {
        "time": 0,
        "properties": {
          "x": 0,
          "opacity": 0
        }
      },
      {
        "time": 1000,
        "properties": {
          "x": 100,
          "opacity": 1
        }
      }
    ]
  }
}
```

#### Apply Animation Preset
```http
POST /api/v1/animations/presets
```

**Parameters:**
```json
{
  "canvasId": "string (required)",
  "objectId": "string (required)",
  "preset": "fade-in|slide-left|zoom-in|bounce-in",
  "duration": 1000,
  "easing": "ease-in-out"
}
```

### Brand Kits

Manage brand assets including colors, fonts, and logos.

#### Create Brand Kit
```http
POST /api/v1/brand-kits
```

**Parameters:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "isDefault": "boolean (default: false)"
}
```

#### Add Colors to Brand Kit
```http
POST /api/v1/brand-kits/{id}/colors
```

**Parameters:**
```json
{
  "colors": [
    {
      "name": "Primary Blue",
      "hex": "#007bff",
      "usage": "primary"
    },
    {
      "name": "Secondary Gray",
      "hex": "#6c757d",
      "usage": "secondary"
    }
  ]
}
```

#### Upload Font to Brand Kit
```http
POST /api/v1/brand-kits/{id}/fonts
```

**Content-Type:** `multipart/form-data`

**Parameters:**
- `font` (file) - Font file (TTF, OTF, WOFF, WOFF2)
- `name` (string) - Font display name
- `category` (string) - Font category (serif, sans-serif, script, etc.)

### Export Jobs

Generate exports in various formats for designs.

#### Create Export Job
```http
POST /api/v1/exports
```

**Parameters:**
```json
{
  "canvasId": "string (required)",
  "format": "png|jpg|svg|pdf|html5|mp4|gif",
  "settings": {
    "quality": 90,
    "transparent": true,
    "scale": 2,
    "frameRate": 30,
    "duration": 5000
  },
  "platformPreset": "instagram-story|facebook-post|google-ads"
}
```

**Response:**
```json
{
  "data": {
    "id": "export_123",
    "status": "pending",
    "format": "png",
    "settings": {
      "quality": 90,
      "transparent": true,
      "scale": 2
    },
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

#### Get Export Status
```http
GET /api/v1/exports/{id}
```

**Response:**
```json
{
  "data": {
    "id": "export_123",
    "status": "completed",
    "format": "png",
    "downloadUrl": "https://cdn.creativeplatform.com/exports/export_123.png",
    "fileSize": 245760,
    "completedAt": "2024-01-01T12:01:30Z"
  }
}
```

#### Batch Export
```http
POST /api/v1/exports/batch
```

**Parameters:**
```json
{
  "designSetId": "string (required)",
  "formats": ["png", "jpg", "svg"],
  "settings": {
    "quality": 90,
    "scale": 2
  }
}
```

### Templates

Access and use pre-built design templates.

#### List Templates
```http
GET /api/v1/templates
```

**Query Parameters:**
- `category` (string) - Filter by category
- `tags` (string) - Comma-separated tags
- `search` (string) - Search by name or description
- `page` (integer) - Page number
- `limit` (integer) - Results per page

**Response:**
```json
{
  "data": [
    {
      "id": "template_123",
      "name": "Modern Social Post",
      "category": "social-media",
      "tags": ["modern", "minimal", "square"],
      "thumbnail": "https://cdn.creativeplatform.com/templates/template_123_thumb.jpg",
      "isPremium": false
    }
  ]
}
```

#### Use Template
```http
POST /api/v1/templates/{id}/use
```

**Parameters:**
```json
{
  "projectId": "string (required)",
  "name": "string (optional)"
}
```

### Assets

Manage uploaded media assets.

#### Upload Asset
```http
POST /api/v1/assets
```

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (file) - Media file to upload
- `folder` (string, optional) - Organization folder
- `tags` (string, optional) - Comma-separated tags

**Response:**
```json
{
  "data": {
    "id": "asset_123",
    "filename": "image.jpg",
    "url": "https://cdn.creativeplatform.com/assets/asset_123.jpg",
    "thumbnailUrl": "https://cdn.creativeplatform.com/assets/asset_123_thumb.jpg",
    "fileSize": 245760,
    "mimeType": "image/jpeg",
    "dimensions": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

#### List Assets
```http
GET /api/v1/assets
```

**Query Parameters:**
- `folder` (string) - Filter by folder
- `type` (string) - Filter by type (image, video, audio)
- `tags` (string) - Filter by tags
- `search` (string) - Search by filename
- `page` (integer) - Page number
- `limit` (integer) - Results per page

## GraphQL API

The GraphQL endpoint provides a flexible query interface for complex data requirements.

### Endpoint
```
POST /api/graphql
WebSocket: wss://api.creativeplatform.com/api/graphql
```

### Authentication
Include your API key in the `X-API-Key` header or use the `Authorization` header with `Bearer` token.

### Schema Overview

#### Types
```graphql
type DesignSet {
  id: ID!
  name: String!
  canvases: [Canvas!]!
  exports: [Export!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Canvas {
  id: ID!
  name: String
  width: Int!
  height: Int!
  objects: [CanvasObject!]!
  animations: [Animation!]!
}

type CanvasObject {
  id: ID!
  type: ObjectType!
  properties: JSON!
  animations: [Animation!]!
}

type Animation {
  id: ID!
  timeline: JSON!
  duration: Int!
  status: AnimationStatus!
}

type Export {
  id: ID!
  format: ExportFormat!
  status: ExportStatus!
  downloadUrl: String
  settings: JSON!
}
```

#### Queries
```graphql
type Query {
  designSet(id: ID!): DesignSet
  designSets(first: Int, after: String): DesignSetConnection!
  canvas(id: ID!): Canvas
  templates(category: String, tags: [String!]): [Template!]!
  brandKit(id: ID!): BrandKit
  assets(folder: String, type: AssetType): [Asset!]!
}
```

#### Mutations
```graphql
type Mutation {
  createDesignSet(input: CreateDesignSetInput!): DesignSet!
  updateCanvas(id: ID!, input: UpdateCanvasInput!): Canvas!
  addCanvasObject(canvasId: ID!, input: AddObjectInput!): CanvasObject!
  createAnimation(input: CreateAnimationInput!): Animation!
  createExport(input: CreateExportInput!): Export!
}
```

#### Subscriptions
```graphql
type Subscription {
  designSetUpdated(id: ID!): DesignSet!
  exportProgress(id: ID!): Export!
  canvasObjectChanged(canvasId: ID!): CanvasObject!
}
```

### Example Queries

#### Get Design Set with Canvases
```graphql
query GetDesignSet($id: ID!) {
  designSet(id: $id) {
    id
    name
    canvases {
      id
      name
      width
      height
      objects {
        id
        type
        properties
      }
    }
  }
}
```

#### Create New Canvas
```graphql
mutation CreateCanvas($input: CreateCanvasInput!) {
  createCanvas(input: $input) {
    id
    name
    width
    height
  }
}
```

#### Subscribe to Export Progress
```graphql
subscription ExportProgress($id: ID!) {
  exportProgress(id: $id) {
    id
    status
    progress
    downloadUrl
  }
}
```

## Webhooks

Configure webhooks to receive real-time notifications about platform events.

### Webhook Events
- `design.created` - New design set created
- `design.updated` - Design set modified
- `design.deleted` - Design set deleted
- `export.completed` - Export job finished successfully
- `export.failed` - Export job failed
- `template.published` - Template published
- `user.subscription.updated` - Subscription status changed
- `cloud_storage.uploaded` - File uploaded to cloud storage
- `social.published` - Content published to social media

### Register Webhook
```http
POST /api/webhooks
```

**Parameters:**
```json
{
  "url": "https://your-app.com/webhooks/creative-platform",
  "events": ["design.created", "export.completed"],
  "description": "Main webhook for design events",
  "isActive": true
}
```

**Response:**
```json
{
  "data": {
    "id": "wh_1234567890abcdef",
    "url": "https://your-app.com/webhooks/creative-platform",
    "events": ["design.created", "export.completed"],
    "secret": "whsec_1234567890abcdef",
    "isActive": true,
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

### Webhook Payload Format
```json
{
  "event": "design.created",
  "data": {
    "id": "ds_1234567890abcdef",
    "name": "New Design Set",
    "userId": "user_123456789",
    "createdAt": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "webhookId": "wh_1234567890abcdef"
}
```

### Webhook Verification
Verify webhook authenticity using HMAC signatures:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Express.js webhook handler
app.post('/webhooks/creative-platform', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }
  
  // Process webhook event
  console.log('Received event:', req.body.event);
  res.status(200).send('OK');
});
```

## Social Media Integration

Publish designs directly to social media platforms.

### Supported Platforms
- Facebook (Pages and Personal)
- Instagram (Posts, Stories, Reels)
- LinkedIn (Personal and Company)
- Twitter/X
- Pinterest
- TikTok

### Connect Social Account
```http
POST /api/social-media/connect
```

**Parameters:**
```json
{
  "platform": "instagram",
  "accessToken": "oauth_access_token",
  "refreshToken": "oauth_refresh_token",
  "expiresAt": "2024-12-31T23:59:59Z",
  "accountInfo": {
    "id": "instagram_account_123",
    "name": "@my_instagram",
    "profilePicture": "https://instagram.com/profile.jpg"
  }
}
```

### Publish to Social Media
```http
POST /api/social-media/publish
```

**Parameters:**
```json
{
  "canvasId": "canvas_123",
  "connectionId": "conn_456",
  "platform": "instagram",
  "content": "Check out my new design! #creative #design",
  "mediaUrls": ["https://cdn.creativeplatform.com/exports/export_123.png"],
  "options": {
    "isStory": false,
    "scheduleTime": "2024-01-02T10:00:00Z"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "pub_789",
    "platform": "instagram",
    "status": "published",
    "platformPostId": "18234567890123456",
    "platformUrl": "https://instagram.com/p/ABC123def456/",
    "publishedAt": "2024-01-01T12:00:00Z"
  }
}
```

## Cloud Storage Integration

Sync design assets with cloud storage providers.

### Supported Providers
- Google Drive
- Dropbox
- Microsoft OneDrive

### Connect Cloud Storage
```http
POST /api/cloud-storage/connect
```

**Parameters:**
```json
{
  "provider": "google_drive",
  "accessToken": "oauth_access_token",
  "refreshToken": "oauth_refresh_token",
  "expiresAt": "2024-12-31T23:59:59Z",
  "accountInfo": {
    "id": "google_account_123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Upload to Cloud Storage
```http
POST /api/cloud-storage/upload
```

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (file) - File to upload
- `connectionId` (string) - Cloud storage connection ID
- `canvasId` (string, optional) - Associated canvas
- `folderId` (string, optional) - Target folder

### Sync Design to Cloud
```http
POST /api/cloud-storage/sync-design
```

**Parameters:**
```json
{
  "canvasId": "canvas_123",
  "connectionId": "conn_456",
  "includeExports": true,
  "createFolder": true
}
```

## SDK Examples

### JavaScript/Node.js SDK

```javascript
const CreativePlatform = require('@creative-platform/sdk');

const client = new CreativePlatform({
  apiKey: 'cp_live_your_api_key_here',
  environment: 'production' // or 'staging'
});

// Create a design set
const designSet = await client.designSets.create({
  name: 'My Campaign',
  projectId: 'proj_123456789'
});

// Add a canvas
const canvas = await client.canvases.create({
  designSetId: designSet.id,
  width: 1080,
  height: 1080,
  sizeId: 'instagram-square'
});

// Add text object
const textObject = await client.canvases.addObject(canvas.id, {
  type: 'text',
  properties: {
    x: 100,
    y: 100,
    text: 'Hello World',
    fontSize: 24,
    fill: '#000000'
  }
});

// Create export
const exportJob = await client.exports.create({
  canvasId: canvas.id,
  format: 'png',
  settings: {
    quality: 90,
    scale: 2
  }
});

// Wait for completion
const completedExport = await client.exports.waitForCompletion(exportJob.id);
console.log('Download URL:', completedExport.downloadUrl);
```

### Python SDK

```python
from creative_platform import CreativePlatform

client = CreativePlatform(
    api_key='cp_live_your_api_key_here',
    environment='production'
)

# Create design set
design_set = client.design_sets.create(
    name='My Campaign',
    project_id='proj_123456789'
)

# Add canvas
canvas = client.canvases.create(
    design_set_id=design_set.id,
    width=1080,
    height=1080,
    size_id='instagram-square'
)

# Export design
export_job = client.exports.create(
    canvas_id=canvas.id,
    format='png',
    settings={'quality': 90, 'scale': 2}
)

# Download result
with open('my_design.png', 'wb') as f:
    f.write(client.exports.download(export_job.id))
```

### React Hook

```jsx
import { useCreativePlatform } from '@creative-platform/react';

function DesignEditor() {
  const { client, loading, error } = useCreativePlatform({
    apiKey: process.env.REACT_APP_CREATIVE_PLATFORM_API_KEY
  });

  const [designSets, setDesignSets] = useState([]);

  useEffect(() => {
    async function loadDesignSets() {
      try {
        const response = await client.designSets.list();
        setDesignSets(response.data);
      } catch (err) {
        console.error('Failed to load design sets:', err);
      }
    }

    if (client) {
      loadDesignSets();
    }
  }, [client]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>My Design Sets</h1>
      {designSets.map(designSet => (
        <div key={designSet.id}>
          <h3>{designSet.name}</h3>
          <p>Created: {new Date(designSet.createdAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

## Changelog

### Version 1.0.0 (Latest)
- Initial API release
- Complete design creation and management
- Multi-size canvas support with smart sync
- Timeline-based animation system
- Brand kit management
- Multi-format export pipeline
- Social media publishing integration
- Cloud storage sync capabilities
- Webhook system for real-time events
- GraphQL API with subscriptions
- Comprehensive test coverage

### Upcoming Features
- Video editing capabilities
- AI-powered design suggestions
- Advanced collaboration features
- Template marketplace
- Mobile SDK
- Desktop application API
- Advanced analytics dashboard

---

For additional support, visit our [Developer Portal](https://developers.creativeplatform.com) or contact our API support team at api-support@creativeplatform.com.