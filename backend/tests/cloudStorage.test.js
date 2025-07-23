/**
 * Cloud Storage Service Tests
 * Comprehensive test suite for cloud storage integration functionality
 */

const request = require('supertest');
const app = require('../src/server');
const { PrismaClient } = require('@prisma/client');
const {
  connectCloudStorage,
  uploadToCloudStorage,
  downloadFromCloudStorage,
  syncDesignToCloud,
  getSyncHistory,
  PROVIDERS
} = require('../src/services/cloudStorageService');

const prisma = new PrismaClient();

// Mock external API calls
jest.mock('googleapis');
jest.mock('dropbox');
jest.mock('axios');

describe('Cloud Storage Service', () => {
  let testUser;
  let testConnection;
  let testCanvas;
  let testApiKey;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'cloudstorage@test.com',
        name: 'Cloud Storage Tester',
        password: 'hashedpassword123'
      }
    });

    // Create test API key
    testApiKey = await prisma.apiKey.create({
      data: {
        name: 'Test Cloud Storage Key',
        keyPrefix: 'cs_test',
        keyHash: 'hashed_key_value',
        scopes: ['cloud_storage:read', 'cloud_storage:write'],
        userId: testUser.id
      }
    });

    // Create test project and canvas
    const testProject = await prisma.project.create({
      data: {
        name: 'Test Project',
        userId: testUser.id
      }
    });

    const testDesignSet = await prisma.designSet.create({
      data: {
        name: 'Test Design Set',
        projectId: testProject.id
      }
    });

    testCanvas = await prisma.canvas.create({
      data: {
        name: 'Test Canvas',
        width: 1080,
        height: 1080,
        sizeId: 'instagram-square',
        designSetId: testDesignSet.id
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.cloudStorageFile.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.cloudStorageConnection.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.canvas.deleteMany({
      where: { designSet: { project: { userId: testUser.id } } }
    });
    await prisma.designSet.deleteMany({
      where: { project: { userId: testUser.id } }
    });
    await prisma.project.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.apiKey.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create fresh test connection for each test
    testConnection = await prisma.cloudStorageConnection.create({
      data: {
        provider: 'google_drive',
        accountId: 'test_account_123',
        accountName: 'Test Account',
        accountEmail: 'test@example.com',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        userId: testUser.id
      }
    });
  });

  afterEach(async () => {
    // Clean up test connections after each test
    await prisma.cloudStorageFile.deleteMany({
      where: { connectionId: testConnection.id }
    });
    await prisma.cloudStorageConnection.delete({
      where: { id: testConnection.id }
    });
  });

  describe('Provider Configuration', () => {
    test('should have all required providers configured', () => {
      expect(PROVIDERS).toHaveProperty('google_drive');
      expect(PROVIDERS).toHaveProperty('dropbox');
      expect(PROVIDERS).toHaveProperty('onedrive');

      Object.values(PROVIDERS).forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('maxFileSize');
        expect(provider).toHaveProperty('supportedFormats');
      });
    });

    test('should return provider list via API', async () => {
      const response = await request(app)
        .get('/api/cloud-storage/providers')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const googleDrive = response.body.data.find(p => p.id === 'google_drive');
      expect(googleDrive).toBeDefined();
      expect(googleDrive.name).toBe('Google Drive');
    });
  });

  describe('Connection Management', () => {
    test('should connect cloud storage account', async () => {
      const connectionData = {
        provider: 'dropbox',
        accessToken: 'test_dropbox_token',
        refreshToken: 'test_dropbox_refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        accountInfo: {
          id: 'dropbox_account_456',
          name: 'Dropbox Test User',
          email: 'dropbox@test.com'
        }
      };

      // Mock token verification
      jest.mocked(require('../src/services/cloudStorageService').verifyProviderToken)
        .mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/cloud-storage/connect')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .send(connectionData)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.provider).toBe('dropbox');
      expect(response.body.data.accountName).toBe('Dropbox Test User');

      // Verify in database
      const connection = await prisma.cloudStorageConnection.findFirst({
        where: {
          userId: testUser.id,
          provider: 'dropbox',
          accountId: 'dropbox_account_456'
        }
      });
      expect(connection).toBeTruthy();
      expect(connection.isActive).toBe(true);
    });

    test('should list user connections', async () => {
      const response = await request(app)
        .get('/api/cloud-storage/connections')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      
      const connection = response.body.data.find(c => c.id === testConnection.id);
      expect(connection).toBeDefined();
      expect(connection.provider).toBe('google_drive');
    });

    test('should disconnect cloud storage account', async () => {
      const response = await request(app)
        .delete(`/api/cloud-storage/connections/${testConnection.id}`)
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .expect(204);

      // Verify connection is deactivated
      const connection = await prisma.cloudStorageConnection.findUnique({
        where: { id: testConnection.id }
      });
      expect(connection.isActive).toBe(false);
    });

    test('should test connection validity', async () => {
      // Mock successful verification
      jest.mocked(require('../src/services/cloudStorageService').verifyProviderToken)
        .mockResolvedValueOnce(true);

      const response = await request(app)
        .post(`/api/cloud-storage/test/${testConnection.id}`)
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .expect(200);

      expect(response.body.status).toBe('connected');
      expect(response.body.message).toContain('working properly');
    });
  });

  describe('File Upload and Management', () => {
    test('should upload file to cloud storage', async () => {
      // Create a test file buffer
      const testFileBuffer = Buffer.from('test file content');
      
      // Mock the actual cloud upload
      jest.mocked(require('../src/services/cloudStorageService').uploadToCloudStorage)
        .mockResolvedValueOnce({
          id: 'test_file_123',
          fileName: 'test.png',
          fileSize: testFileBuffer.length,
          shareUrl: 'https://drive.google.com/file/test'
        });

      const response = await request(app)
        .post('/api/cloud-storage/upload')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .field('connectionId', testConnection.id)
        .field('canvasId', testCanvas.id)
        .attach('file', testFileBuffer, 'test.png')
        .expect(201);

      expect(response.body.data).toHaveProperty('fileName', 'test.png');
      expect(response.body.data).toHaveProperty('shareUrl');
    });

    test('should sync canvas to cloud storage', async () => {
      const syncData = {
        canvasId: testCanvas.id,
        connectionId: testConnection.id,
        includeExports: true,
        createFolder: true
      };

      // Mock the sync function
      jest.mocked(require('../src/services/cloudStorageService').syncDesignToCloud)
        .mockResolvedValueOnce({
          canvasId: testCanvas.id,
          filesUploaded: 2,
          files: [
            { fileName: 'canvas_thumbnail.png' },
            { fileName: 'canvas_export.jpg' }
          ]
        });

      const response = await request(app)
        .post('/api/cloud-storage/sync-design')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .send(syncData)
        .expect(200);

      expect(response.body.data.filesUploaded).toBe(2);
      expect(response.body.data.canvasId).toBe(testCanvas.id);
    });

    test('should get sync history', async () => {
      // Create some test sync records
      await prisma.cloudStorageFile.create({
        data: {
          fileName: 'test_history.png',
          fileSize: 1024,
          mimeType: 'image/png',
          cloudFileId: 'cloud_file_123',
          cloudFilePath: '/test/test_history.png',
          connectionId: testConnection.id,
          canvasId: testCanvas.id,
          userId: testUser.id
        }
      });

      const response = await request(app)
        .get('/api/cloud-storage/history')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.files).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('total');
    });

    test('should configure auto-sync settings', async () => {
      const autoSyncSettings = {
        connectionId: testConnection.id,
        settings: {
          syncExports: true,
          syncDesigns: false,
          syncInterval: 'daily'
        }
      };

      const response = await request(app)
        .post('/api/cloud-storage/auto-sync')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .send(autoSyncSettings)
        .expect(200);

      expect(response.body.message).toContain('configured successfully');

      // Verify in database
      const connection = await prisma.cloudStorageConnection.findUnique({
        where: { id: testConnection.id }
      });
      expect(connection.autoSyncEnabled).toBe(true);
      expect(connection.autoSyncSettings).toEqual(autoSyncSettings.settings);
    });
  });

  describe('Error Handling', () => {
    test('should reject invalid provider', async () => {
      const invalidConnectionData = {
        provider: 'invalid_provider',
        accessToken: 'test_token',
        accountInfo: {
          id: 'test_id',
          name: 'Test User'
        }
      };

      const response = await request(app)
        .post('/api/cloud-storage/connect')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .send(invalidConnectionData)
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    test('should reject file upload without connection', async () => {
      const testFileBuffer = Buffer.from('test content');

      const response = await request(app)
        .post('/api/cloud-storage/upload')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .field('connectionId', '00000000-0000-0000-0000-000000000000')
        .attach('file', testFileBuffer, 'test.png')
        .expect(404);

      expect(response.body.error).toBe('CONNECTION_NOT_FOUND');
    });

    test('should handle file size limits', async () => {
      // Create an oversized file buffer (mock)
      const oversizedBuffer = Buffer.alloc(200 * 1024 * 1024); // 200MB

      const response = await request(app)
        .post('/api/cloud-storage/upload')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .field('connectionId', testConnection.id)
        .attach('file', oversizedBuffer, 'large_file.png')
        .expect(413);

      expect(response.body.error).toBe('FILE_TOO_LARGE');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/cloud-storage/connections')
        .expect(401);

      expect(response.body.error).toBe('AUTHENTICATION_REQUIRED');
    });

    test('should require proper scopes', async () => {
      // Create API key with limited scopes
      const limitedApiKey = await prisma.apiKey.create({
        data: {
          name: 'Limited Key',
          keyPrefix: 'cs_limited',
          keyHash: 'limited_hash',
          scopes: ['cloud_storage:read'], // Missing write scope
          userId: testUser.id
        }
      });

      const response = await request(app)
        .post('/api/cloud-storage/upload')
        .set('X-API-Key', `${limitedApiKey.keyPrefix}.test_suffix`)
        .field('connectionId', testConnection.id)
        .attach('file', Buffer.from('test'), 'test.png')
        .expect(403);

      expect(response.body.error).toBe('INSUFFICIENT_SCOPE');

      // Cleanup
      await prisma.apiKey.delete({
        where: { id: limitedApiKey.id }
      });
    });
  });

  describe('Service Functions', () => {
    test('connectCloudStorage should create connection', async () => {
      // Mock token verification
      jest.mocked(require('../src/services/cloudStorageService').verifyProviderToken)
        .mockResolvedValueOnce(true);

      const result = await connectCloudStorage(testUser.id, 'dropbox', {
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        expiresAt: new Date(Date.now() + 3600000),
        accountInfo: {
          id: 'service_test_123',
          name: 'Service Test User',
          email: 'service@test.com'
        }
      });

      expect(result).toHaveProperty('id');
      expect(result.provider).toBe('dropbox');
      expect(result.accountName).toBe('Service Test User');

      // Cleanup
      await prisma.cloudStorageConnection.delete({
        where: { id: result.id }
      });
    });

    test('getSyncHistory should return paginated results', async () => {
      // Create test files
      const files = [];
      for (let i = 0; i < 5; i++) {
        files.push(await prisma.cloudStorageFile.create({
          data: {
            fileName: `test_file_${i}.png`,
            fileSize: 1024 * (i + 1),
            mimeType: 'image/png',
            cloudFileId: `cloud_file_${i}`,
            cloudFilePath: `/test/test_file_${i}.png`,
            connectionId: testConnection.id,
            userId: testUser.id
          }
        }));
      }

      const result = await getSyncHistory(testUser.id, {
        page: 1,
        limit: 3
      });

      expect(result.files).toHaveLength(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.pages).toBe(2);

      // Cleanup
      await Promise.all(files.map(file => 
        prisma.cloudStorageFile.delete({ where: { id: file.id } })
      ));
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent uploads', async () => {
      const uploadPromises = [];
      
      for (let i = 0; i < 5; i++) {
        uploadPromises.push(
          request(app)
            .post('/api/cloud-storage/upload')
            .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
            .field('connectionId', testConnection.id)
            .attach('file', Buffer.from(`test content ${i}`), `test_${i}.txt`)
        );
      }

      const results = await Promise.allSettled(uploadPromises);
      
      // At least some uploads should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      expect(successful.length).toBeGreaterThan(0);
    });

    test('should handle large sync operations', async () => {
      // Mock a large sync with many files
      jest.mocked(require('../src/services/cloudStorageService').syncDesignToCloud)
        .mockResolvedValueOnce({
          canvasId: testCanvas.id,
          filesUploaded: 50,
          files: Array.from({ length: 50 }, (_, i) => ({
            fileName: `large_sync_file_${i}.png`
          }))
        });

      const response = await request(app)
        .post('/api/cloud-storage/sync-design')
        .set('X-API-Key', `${testApiKey.keyPrefix}.test_key_suffix`)
        .send({
          canvasId: testCanvas.id,
          connectionId: testConnection.id,
          includeExports: true
        })
        .expect(200);

      expect(response.body.data.filesUploaded).toBe(50);
    });
  });
});

describe('Cloud Storage Integration Tests', () => {
  // Additional integration tests would go here
  // These would test actual interactions with cloud providers
  // in a controlled test environment
});