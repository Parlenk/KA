/**
 * Cloud Storage Service
 * Manages integration with Google Drive, Dropbox, and other cloud storage providers
 */

const axios = require('axios');
const FormData = require('form-data');
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const { Dropbox } = require('dropbox');
const { broadcastEvent } = require('./webhookService');

const prisma = new PrismaClient();

/**
 * Cloud storage provider configurations
 */
const PROVIDERS = {
  google_drive: {
    name: 'Google Drive',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
    supportedFormats: ['image/*', 'video/*', 'application/pdf', 'text/*']
  },
  dropbox: {
    name: 'Dropbox',
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    scopes: ['files.content.write', 'files.content.read'],
    maxFileSize: 150 * 1024 * 1024, // 150MB per upload
    supportedFormats: ['image/*', 'video/*', 'application/pdf', 'text/*']
  },
  onedrive: {
    name: 'Microsoft OneDrive',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['files.readwrite'],
    maxFileSize: 250 * 1024 * 1024, // 250MB
    supportedFormats: ['image/*', 'video/*', 'application/pdf', 'text/*']
  }
};

/**
 * Connect cloud storage account
 */
const connectCloudStorage = async (userId, provider, authData) => {
  const { accessToken, refreshToken, expiresAt, accountInfo } = authData;

  if (!PROVIDERS[provider]) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  try {
    // Verify token with provider
    const isValid = await verifyProviderToken(provider, accessToken, accountInfo.id);
    if (!isValid) {
      throw new Error('Invalid access token');
    }

    // Save or update connection
    const connection = await prisma.cloudStorageConnection.upsert({
      where: {
        userId_provider_accountId: {
          userId,
          provider,
          accountId: accountInfo.id
        }
      },
      update: {
        accessToken,
        refreshToken,
        expiresAt,
        accountName: accountInfo.name || accountInfo.email,
        accountEmail: accountInfo.email,
        isActive: true,
        lastSyncAt: new Date()
      },
      create: {
        userId,
        provider,
        accountId: accountInfo.id,
        accountName: accountInfo.name || accountInfo.email,
        accountEmail: accountInfo.email,
        accessToken,
        refreshToken,
        expiresAt,
        isActive: true
      }
    });

    // Initialize folder structure
    await initializeFolderStructure(connection.id, provider, accessToken);

    return {
      id: connection.id,
      provider,
      accountName: connection.accountName,
      accountEmail: connection.accountEmail,
      isActive: connection.isActive,
      connectedAt: connection.createdAt
    };
  } catch (error) {
    console.error('Error connecting cloud storage:', error);
    throw error;
  }
};

/**
 * Disconnect cloud storage account
 */
const disconnectCloudStorage = async (userId, connectionId) => {
  const connection = await prisma.cloudStorageConnection.findFirst({
    where: { id: connectionId, userId }
  });

  if (!connection) {
    throw new Error('Cloud storage connection not found');
  }

  await prisma.cloudStorageConnection.update({
    where: { id: connectionId },
    data: { isActive: false }
  });

  return true;
};

/**
 * List user's cloud storage connections
 */
const listCloudStorageConnections = async (userId) => {
  return await prisma.cloudStorageConnection.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      provider: true,
      accountName: true,
      accountEmail: true,
      isActive: true,
      lastSyncAt: true,
      createdAt: true,
      _count: {
        select: {
          syncedFiles: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Upload file to cloud storage
 */
const uploadToCloudStorage = async (userId, connectionId, fileData) => {
  const { fileName, fileBuffer, mimeType, designId, folderId } = fileData;

  try {
    const connection = await prisma.cloudStorageConnection.findFirst({
      where: { id: connectionId, userId, isActive: true }
    });

    if (!connection) {
      throw new Error('Cloud storage connection not found or inactive');
    }

    // Check file size limits
    const provider = PROVIDERS[connection.provider];
    if (fileBuffer.length > provider.maxFileSize) {
      throw new Error(`File too large. Maximum size for ${provider.name}: ${provider.maxFileSize / (1024 * 1024)}MB`);
    }

    let uploadResult;
    switch (connection.provider) {
      case 'google_drive':
        uploadResult = await uploadToGoogleDrive(connection, fileName, fileBuffer, mimeType, folderId);
        break;
      case 'dropbox':
        uploadResult = await uploadToDropbox(connection, fileName, fileBuffer, folderId);
        break;
      case 'onedrive':
        uploadResult = await uploadToOneDrive(connection, fileName, fileBuffer, folderId);
        break;
      default:
        throw new Error(`Upload not implemented for ${connection.provider}`);
    }

    // Save sync record
    const syncRecord = await prisma.cloudStorageFile.create({
      data: {
        connectionId,
        designId,
        fileName,
        fileSize: fileBuffer.length,
        mimeType,
        cloudFileId: uploadResult.fileId,
        cloudFilePath: uploadResult.filePath,
        shareUrl: uploadResult.shareUrl,
        uploadedAt: new Date(),
        userId
      }
    });

    // Update connection last sync
    await prisma.cloudStorageConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() }
    });

    // Broadcast webhook event
    await broadcastEvent('cloud_storage.uploaded', {
      fileId: syncRecord.id,
      designId,
      provider: connection.provider,
      fileName,
      shareUrl: uploadResult.shareUrl
    }, userId);

    return syncRecord;
  } catch (error) {
    console.error('Error uploading to cloud storage:', error);
    throw error;
  }
};

/**
 * Download file from cloud storage
 */
const downloadFromCloudStorage = async (userId, fileId) => {
  try {
    const file = await prisma.cloudStorageFile.findFirst({
      where: { id: fileId, userId },
      include: { connection: true }
    });

    if (!file || !file.connection.isActive) {
      throw new Error('Cloud storage file not found or connection inactive');
    }

    let downloadResult;
    switch (file.connection.provider) {
      case 'google_drive':
        downloadResult = await downloadFromGoogleDrive(file.connection, file.cloudFileId);
        break;
      case 'dropbox':
        downloadResult = await downloadFromDropbox(file.connection, file.cloudFilePath);
        break;
      case 'onedrive':
        downloadResult = await downloadFromOneDrive(file.connection, file.cloudFileId);
        break;
      default:
        throw new Error(`Download not implemented for ${file.connection.provider}`);
    }

    return {
      fileName: file.fileName,
      mimeType: file.mimeType,
      buffer: downloadResult.buffer
    };
  } catch (error) {
    console.error('Error downloading from cloud storage:', error);
    throw error;
  }
};

/**
 * Sync design assets to cloud storage
 */
const syncDesignToCloud = async (userId, designId, connectionId, options = {}) => {
  const { includeExports = true, createFolder = true } = options;

  try {
    const [design, connection] = await Promise.all([
      prisma.design.findFirst({
        where: { id: designId, userId },
        include: { exports: true }
      }),
      prisma.cloudStorageConnection.findFirst({
        where: { id: connectionId, userId, isActive: true }
      })
    ]);

    if (!design) {
      throw new Error('Design not found');
    }

    if (!connection) {
      throw new Error('Cloud storage connection not found or inactive');
    }

    const results = [];
    let folderId = null;

    // Create design folder if requested
    if (createFolder) {
      folderId = await createCloudFolder(connection, `Design - ${design.name}`);
    }

    // Upload design thumbnail
    if (design.thumbnail) {
      const thumbnailBuffer = await fetchFileBuffer(design.thumbnail);
      const uploadResult = await uploadToCloudStorage(userId, connectionId, {
        fileName: `${design.name}_thumbnail.png`,
        fileBuffer: thumbnailBuffer,
        mimeType: 'image/png',
        designId,
        folderId
      });
      results.push(uploadResult);
    }

    // Upload exports if requested
    if (includeExports && design.exports.length > 0) {
      for (const exportItem of design.exports) {
        if (exportItem.status === 'completed' && exportItem.downloadUrl) {
          const fileBuffer = await fetchFileBuffer(exportItem.downloadUrl);
          const uploadResult = await uploadToCloudStorage(userId, connectionId, {
            fileName: `${design.name}_${exportItem.format}.${getFileExtension(exportItem.format)}`,
            fileBuffer,
            mimeType: getMimeType(exportItem.format),
            designId,
            folderId
          });
          results.push(uploadResult);
        }
      }
    }

    // Broadcast completion event
    await broadcastEvent('cloud_storage.design_synced', {
      designId,
      provider: connection.provider,
      filesUploaded: results.length,
      folderId
    }, userId);

    return {
      designId,
      filesUploaded: results.length,
      files: results
    };
  } catch (error) {
    console.error('Error syncing design to cloud:', error);
    throw error;
  }
};

/**
 * Auto-sync functionality
 */
const enableAutoSync = async (userId, connectionId, settings) => {
  const { syncExports = true, syncDesigns = true, syncInterval = 'daily' } = settings;

  const connection = await prisma.cloudStorageConnection.findFirst({
    where: { id: connectionId, userId }
  });

  if (!connection) {
    throw new Error('Cloud storage connection not found');
  }

  await prisma.cloudStorageConnection.update({
    where: { id: connectionId },
    data: {
      autoSyncEnabled: true,
      autoSyncSettings: {
        syncExports,
        syncDesigns,
        syncInterval
      }
    }
  });

  return true;
};

/**
 * Google Drive implementation
 */
const uploadToGoogleDrive = async (connection, fileName, fileBuffer, mimeType, folderId) => {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken
    });

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : undefined
    };

    const media = {
      mimeType,
      body: fileBuffer
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id,name,webViewLink,webContentLink'
    });

    return {
      fileId: response.data.id,
      filePath: response.data.name,
      shareUrl: response.data.webViewLink
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
};

const downloadFromGoogleDrive = async (connection, fileId) => {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken
    });

    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });

    return {
      buffer: Buffer.from(response.data)
    };
  } catch (error) {
    console.error('Error downloading from Google Drive:', error);
    throw error;
  }
};

/**
 * Dropbox implementation
 */
const uploadToDropbox = async (connection, fileName, fileBuffer, folderId) => {
  try {
    const dbx = new Dropbox({ accessToken: connection.accessToken });

    const path = folderId ? `/${folderId}/${fileName}` : `/${fileName}`;

    const response = await dbx.filesUpload({
      path,
      contents: fileBuffer,
      mode: 'overwrite',
      autorename: true
    });

    // Create shared link
    const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
      path: response.result.path_display
    });

    return {
      fileId: response.result.id,
      filePath: response.result.path_display,
      shareUrl: linkResponse.result.url
    };
  } catch (error) {
    console.error('Error uploading to Dropbox:', error);
    throw error;
  }
};

const downloadFromDropbox = async (connection, filePath) => {
  try {
    const dbx = new Dropbox({ accessToken: connection.accessToken });

    const response = await dbx.filesDownload({ path: filePath });

    return {
      buffer: response.result.fileBinary
    };
  } catch (error) {
    console.error('Error downloading from Dropbox:', error);
    throw error;
  }
};

/**
 * OneDrive implementation
 */
const uploadToOneDrive = async (connection, fileName, fileBuffer, folderId) => {
  try {
    const uploadUrl = folderId 
      ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${fileName}:/content`
      : `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`;

    const response = await axios.put(uploadUrl, fileBuffer, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/octet-stream'
      }
    });

    return {
      fileId: response.data.id,
      filePath: response.data.parentReference.path + '/' + response.data.name,
      shareUrl: response.data.webUrl
    };
  } catch (error) {
    console.error('Error uploading to OneDrive:', error);
    throw error;
  }
};

const downloadFromOneDrive = async (connection, fileId) => {
  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      buffer: Buffer.from(response.data)
    };
  } catch (error) {
    console.error('Error downloading from OneDrive:', error);
    throw error;
  }
};

/**
 * Helper functions
 */
const verifyProviderToken = async (provider, accessToken, accountId) => {
  try {
    switch (provider) {
      case 'google_drive':
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        const drive = google.drive({ version: 'v3', auth });
        const response = await drive.about.get({ fields: 'user' });
        return response.data.user.permissionId === accountId;

      case 'dropbox':
        const dbx = new Dropbox({ accessToken });
        const account = await dbx.usersGetCurrentAccount();
        return account.result.account_id === accountId;

      case 'onedrive':
        const meResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return meResponse.data.id === accountId;

      default:
        return true;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
};

const initializeFolderStructure = async (connectionId, provider, accessToken) => {
  // Create default folders for organized storage
  const folders = ['Designs', 'Exports', 'Assets'];

  for (const folderName of folders) {
    try {
      await createCloudFolder({ provider, accessToken }, folderName);
    } catch (error) {
      console.error(`Error creating folder ${folderName}:`, error);
    }
  }
};

const createCloudFolder = async (connection, folderName, parentId = null) => {
  switch (connection.provider) {
    case 'google_drive':
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: connection.accessToken });
      const drive = google.drive({ version: 'v3', auth });
      
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      };

      const response = await drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      return response.data.id;

    case 'dropbox':
      const dbx = new Dropbox({ accessToken: connection.accessToken });
      const path = parentId ? `/${parentId}/${folderName}` : `/${folderName}`;
      
      const folderResponse = await dbx.filesCreateFolderV2({ path });
      return folderResponse.result.metadata.id;

    case 'onedrive':
      const createUrl = parentId
        ? `https://graph.microsoft.com/v1.0/me/drive/items/${parentId}/children`
        : 'https://graph.microsoft.com/v1.0/me/drive/root/children';

      const onedriveResponse = await axios.post(createUrl, {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      }, {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return onedriveResponse.data.id;

    default:
      throw new Error(`Folder creation not implemented for ${connection.provider}`);
  }
};

const fetchFileBuffer = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
};

const getFileExtension = (format) => {
  const extensions = {
    'png': 'png',
    'jpg': 'jpg',
    'jpeg': 'jpg',
    'svg': 'svg',
    'pdf': 'pdf',
    'mp4': 'mp4',
    'gif': 'gif'
  };
  return extensions[format.toLowerCase()] || 'file';
};

const getMimeType = (format) => {
  const mimeTypes = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'gif': 'image/gif'
  };
  return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
};

/**
 * Get sync history
 */
const getSyncHistory = async (userId, options = {}) => {
  const { page = 1, limit = 20, provider, designId } = options;
  const offset = (page - 1) * limit;

  const where = { userId };
  if (provider) where.connection = { provider };
  if (designId) where.designId = designId;

  const [files, total] = await Promise.all([
    prisma.cloudStorageFile.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        connection: {
          select: {
            provider: true,
            accountName: true
          }
        },
        design: {
          select: {
            name: true,
            thumbnail: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    }),
    prisma.cloudStorageFile.count({ where })
  ]);

  return {
    files,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  PROVIDERS,
  connectCloudStorage,
  disconnectCloudStorage,
  listCloudStorageConnections,
  uploadToCloudStorage,
  downloadFromCloudStorage,
  syncDesignToCloud,
  enableAutoSync,
  getSyncHistory,
  verifyProviderToken
};