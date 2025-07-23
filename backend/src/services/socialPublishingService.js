/**
 * Social Media Publishing Service
 * Direct publishing to Facebook, Instagram, LinkedIn, Twitter, and other platforms
 */

const axios = require('axios');
const FormData = require('form-data');
const { PrismaClient } = require('@prisma/client');
const { broadcastEvent } = require('./webhookService');

const prisma = new PrismaClient();

/**
 * Social platform configurations
 */
const PLATFORMS = {
  facebook: {
    name: 'Facebook',
    baseUrl: 'https://graph.facebook.com/v18.0',
    scopes: ['pages_manage_posts', 'pages_read_engagement'],
    mediaTypes: ['image', 'video', 'carousel'],
    maxImageSize: 4 * 1024 * 1024, // 4MB
    maxVideoSize: 1024 * 1024 * 1024, // 1GB
    aspectRatios: {
      feed: { min: 0.8, max: 1.91 },
      story: { min: 0.56, max: 0.56 }
    }
  },
  instagram: {
    name: 'Instagram',
    baseUrl: 'https://graph.facebook.com/v18.0',
    scopes: ['instagram_basic', 'instagram_content_publish'],
    mediaTypes: ['image', 'video', 'reel', 'story'],
    maxImageSize: 8 * 1024 * 1024, // 8MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    aspectRatios: {
      feed: { min: 0.8, max: 1.91 },
      story: { min: 0.56, max: 0.56 },
      reel: { min: 0.56, max: 0.56 }
    }
  },
  linkedin: {
    name: 'LinkedIn',
    baseUrl: 'https://api.linkedin.com/rest',
    scopes: ['w_member_social', 'r_basicprofile'],
    mediaTypes: ['image', 'video', 'document'],
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
    aspectRatios: {
      feed: { min: 0.5, max: 2.0 }
    }
  },
  twitter: {
    name: 'Twitter/X',
    baseUrl: 'https://api.twitter.com/2',
    scopes: ['tweet.write', 'users.read'],
    mediaTypes: ['image', 'video', 'gif'],
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 512 * 1024 * 1024, // 512MB
    aspectRatios: {
      feed: { min: 0.5, max: 2.0 }
    }
  },
  pinterest: {
    name: 'Pinterest',
    baseUrl: 'https://api.pinterest.com/v5',
    scopes: ['pins:write', 'boards:read'],
    mediaTypes: ['image'],
    maxImageSize: 10 * 1024 * 1024, // 10MB
    aspectRatios: {
      pin: { min: 0.5, max: 2.0 }
    }
  },
  tiktok: {
    name: 'TikTok',
    baseUrl: 'https://open-api.tiktok.com',
    scopes: ['video.upload'],
    mediaTypes: ['video'],
    maxVideoSize: 500 * 1024 * 1024, // 500MB
    aspectRatios: {
      video: { min: 0.56, max: 0.56 }
    }
  }
};

/**
 * Save social media account connection
 */
const connectSocialAccount = async (userId, platform, accountData) => {
  const { accessToken, refreshToken, accountId, accountName, expiresAt } = accountData;

  if (!PLATFORMS[platform]) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  try {
    // Verify token with platform
    const isValid = await verifyPlatformToken(platform, accessToken, accountId);
    if (!isValid) {
      throw new Error('Invalid access token');
    }

    // Save or update connection
    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform,
          accountId
        }
      },
      update: {
        accessToken,
        refreshToken,
        accountName,
        expiresAt,
        isActive: true,
        lastUsed: new Date()
      },
      create: {
        userId,
        platform,
        accountId,
        accountName,
        accessToken,
        refreshToken,
        expiresAt,
        isActive: true
      }
    });

    return {
      id: connection.id,
      platform,
      accountId,
      accountName,
      isActive: connection.isActive,
      connectedAt: connection.createdAt
    };
  } catch (error) {
    console.error('Error connecting social account:', error);
    throw error;
  }
};

/**
 * Disconnect social media account
 */
const disconnectSocialAccount = async (userId, connectionId) => {
  const connection = await prisma.socialConnection.findFirst({
    where: { id: connectionId, userId }
  });

  if (!connection) {
    throw new Error('Social connection not found');
  }

  await prisma.socialConnection.update({
    where: { id: connectionId },
    data: { isActive: false }
  });

  return true;
};

/**
 * List user's social connections
 */
const listSocialConnections = async (userId) => {
  return await prisma.socialConnection.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      platform: true,
      accountId: true,
      accountName: true,
      isActive: true,
      lastUsed: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Publish design to social media platform
 */
const publishToSocial = async (userId, publishData) => {
  const {
    designId,
    connectionId,
    platform,
    content,
    mediaUrls,
    options = {}
  } = publishData;

  try {
    // Get design and connection
    const [design, connection] = await Promise.all([
      prisma.design.findFirst({
        where: { id: designId, userId },
        include: { exports: true }
      }),
      prisma.socialConnection.findFirst({
        where: { id: connectionId, userId, isActive: true }
      })
    ]);

    if (!design) {
      throw new Error('Design not found');
    }

    if (!connection) {
      throw new Error('Social connection not found or inactive');
    }

    if (connection.platform !== platform) {
      throw new Error('Platform mismatch');
    }

    // Validate media
    await validateMediaForPlatform(platform, mediaUrls, options);

    // Create publication record
    const publication = await prisma.socialPublication.create({
      data: {
        designId,
        connectionId,
        platform,
        content: content || '',
        mediaUrls,
        options,
        status: 'pending',
        userId
      }
    });

    // Publish to platform
    let result;
    switch (platform) {
      case 'facebook':
        result = await publishToFacebook(connection, content, mediaUrls, options);
        break;
      case 'instagram':
        result = await publishToInstagram(connection, content, mediaUrls, options);
        break;
      case 'linkedin':
        result = await publishToLinkedIn(connection, content, mediaUrls, options);
        break;
      case 'twitter':
        result = await publishToTwitter(connection, content, mediaUrls, options);
        break;
      case 'pinterest':
        result = await publishToPinterest(connection, content, mediaUrls, options);
        break;
      case 'tiktok':
        result = await publishToTikTok(connection, content, mediaUrls, options);
        break;
      default:
        throw new Error(`Publishing to ${platform} not implemented`);
    }

    // Update publication with result
    const updatedPublication = await prisma.socialPublication.update({
      where: { id: publication.id },
      data: {
        status: result.success ? 'published' : 'failed',
        platformPostId: result.postId,
        platformUrl: result.url,
        error: result.error,
        publishedAt: result.success ? new Date() : null
      }
    });

    // Update connection last used
    await prisma.socialConnection.update({
      where: { id: connectionId },
      data: { lastUsed: new Date() }
    });

    // Broadcast webhook event
    await broadcastEvent('social.published', {
      publicationId: publication.id,
      designId,
      platform,
      status: updatedPublication.status,
      postUrl: result.url
    }, userId);

    return updatedPublication;
  } catch (error) {
    console.error('Error publishing to social media:', error);
    throw error;
  }
};

/**
 * Facebook publishing
 */
const publishToFacebook = async (connection, content, mediaUrls, options) => {
  try {
    const { pageId, scheduleTime } = options;
    const targetId = pageId || connection.accountId;

    if (mediaUrls.length === 0) {
      // Text-only post
      const response = await axios.post(
        `${PLATFORMS.facebook.baseUrl}/${targetId}/feed`,
        {
          message: content,
          published: !scheduleTime,
          scheduled_publish_time: scheduleTime ? Math.floor(new Date(scheduleTime).getTime() / 1000) : undefined,
          access_token: connection.accessToken
        }
      );

      return {
        success: true,
        postId: response.data.id,
        url: `https://facebook.com/${response.data.id}`
      };
    } else if (mediaUrls.length === 1) {
      // Single media post
      const mediaUrl = mediaUrls[0];
      const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');

      if (isVideo) {
        const response = await axios.post(
          `${PLATFORMS.facebook.baseUrl}/${targetId}/videos`,
          {
            description: content,
            source: mediaUrl,
            published: !scheduleTime,
            scheduled_publish_time: scheduleTime ? Math.floor(new Date(scheduleTime).getTime() / 1000) : undefined,
            access_token: connection.accessToken
          }
        );

        return {
          success: true,
          postId: response.data.id,
          url: `https://facebook.com/${response.data.id}`
        };
      } else {
        const response = await axios.post(
          `${PLATFORMS.facebook.baseUrl}/${targetId}/photos`,
          {
            message: content,
            url: mediaUrl,
            published: !scheduleTime,
            scheduled_publish_time: scheduleTime ? Math.floor(new Date(scheduleTime).getTime() / 1000) : undefined,
            access_token: connection.accessToken
          }
        );

        return {
          success: true,
          postId: response.data.id,
          url: `https://facebook.com/${response.data.id}`
        };
      }
    } else {
      // Multiple media post (carousel)
      const attachments = await Promise.all(
        mediaUrls.map(async (url) => {
          const isVideo = url.includes('.mp4') || url.includes('.mov');
          
          if (isVideo) {
            const uploadResponse = await axios.post(
              `${PLATFORMS.facebook.baseUrl}/${targetId}/videos`,
              {
                source: url,
                published: false,
                access_token: connection.accessToken
              }
            );
            return { media_fbid: uploadResponse.data.id };
          } else {
            const uploadResponse = await axios.post(
              `${PLATFORMS.facebook.baseUrl}/${targetId}/photos`,
              {
                url: url,
                published: false,
                access_token: connection.accessToken
              }
            );
            return { media_fbid: uploadResponse.data.id };
          }
        })
      );

      const response = await axios.post(
        `${PLATFORMS.facebook.baseUrl}/${targetId}/feed`,
        {
          message: content,
          attached_media: attachments,
          published: !scheduleTime,
          scheduled_publish_time: scheduleTime ? Math.floor(new Date(scheduleTime).getTime() / 1000) : undefined,
          access_token: connection.accessToken
        }
      );

      return {
        success: true,
        postId: response.data.id,
        url: `https://facebook.com/${response.data.id}`
      };
    }
  } catch (error) {
    console.error('Facebook publishing error:', error);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * Instagram publishing
 */
const publishToInstagram = async (connection, content, mediaUrls, options) => {
  try {
    const { isStory = false, isReel = false } = options;
    const mediaUrl = mediaUrls[0]; // Instagram supports single media per post

    if (!mediaUrl) {
      throw new Error('Instagram requires media content');
    }

    const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');
    
    // Create media container
    const containerData = {
      access_token: connection.accessToken
    };

    if (isVideo) {
      containerData.media_type = isReel ? 'REELS' : 'VIDEO';
      containerData.video_url = mediaUrl;
    } else {
      containerData.image_url = mediaUrl;
    }

    if (content && !isStory) {
      containerData.caption = content;
    }

    const containerResponse = await axios.post(
      `${PLATFORMS.instagram.baseUrl}/${connection.accountId}/media`,
      containerData
    );

    const creationId = containerResponse.data.id;

    // Wait for media to be processed
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Publish the media
    const publishResponse = await axios.post(
      `${PLATFORMS.instagram.baseUrl}/${connection.accountId}/media_publish`,
      {
        creation_id: creationId,
        access_token: connection.accessToken
      }
    );

    return {
      success: true,
      postId: publishResponse.data.id,
      url: `https://instagram.com/p/${publishResponse.data.id}`
    };
  } catch (error) {
    console.error('Instagram publishing error:', error);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * LinkedIn publishing
 */
const publishToLinkedIn = async (connection, content, mediaUrls, options) => {
  try {
    const { isCompanyPage = false, companyId } = options;
    const author = isCompanyPage && companyId 
      ? `urn:li:organization:${companyId}`
      : `urn:li:person:${connection.accountId}`;

    const shareData = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: mediaUrls.length > 0 ? 'IMAGE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    if (mediaUrls.length > 0) {
      // Upload media first
      const mediaAssets = await Promise.all(
        mediaUrls.map(async (url) => {
          const uploadResponse = await uploadMediaToLinkedIn(connection.accessToken, url, author);
          return {
            status: 'READY',
            description: {
              text: content
            },
            media: uploadResponse.asset,
            title: {
              text: 'Shared from Creative Platform'
            }
          };
        })
      );

      shareData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets;
    }

    const response = await axios.post(
      `${PLATFORMS.linkedin.baseUrl}/ugcPosts`,
      shareData,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    return {
      success: true,
      postId: response.data.id,
      url: `https://linkedin.com/feed/update/${response.data.id}`
    };
  } catch (error) {
    console.error('LinkedIn publishing error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Twitter publishing
 */
const publishToTwitter = async (connection, content, mediaUrls, options) => {
  try {
    const tweetData = {
      text: content
    };

    if (mediaUrls.length > 0) {
      // Upload media first
      const mediaIds = await Promise.all(
        mediaUrls.map(url => uploadMediaToTwitter(connection.accessToken, url))
      );

      tweetData.media = {
        media_ids: mediaIds
      };
    }

    const response = await axios.post(
      `${PLATFORMS.twitter.baseUrl}/tweets`,
      tweetData,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      postId: response.data.data.id,
      url: `https://twitter.com/user/status/${response.data.data.id}`
    };
  } catch (error) {
    console.error('Twitter publishing error:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Pinterest publishing
 */
const publishToPinterest = async (connection, content, mediaUrls, options) => {
  try {
    const { boardId } = options;
    
    if (!boardId) {
      throw new Error('Board ID is required for Pinterest');
    }

    if (!mediaUrls[0]) {
      throw new Error('Pinterest requires an image');
    }

    const pinData = {
      link: options.link || '',
      title: options.title || content.substring(0, 100),
      description: content,
      board_id: boardId,
      media_source: {
        source_type: 'image_url',
        url: mediaUrls[0]
      }
    };

    const response = await axios.post(
      `${PLATFORMS.pinterest.baseUrl}/pins`,
      pinData,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      postId: response.data.id,
      url: `https://pinterest.com/pin/${response.data.id}`
    };
  } catch (error) {
    console.error('Pinterest publishing error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * TikTok publishing
 */
const publishToTikTok = async (connection, content, mediaUrls, options) => {
  try {
    const videoUrl = mediaUrls[0];
    
    if (!videoUrl) {
      throw new Error('TikTok requires a video');
    }

    // Note: TikTok API implementation varies and may require different approach
    // This is a simplified version
    const postData = {
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl
      },
      post_info: {
        title: content,
        privacy_level: 'SELF_ONLY', // Default to private
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000
      }
    };

    const response = await axios.post(
      `${PLATFORMS.tiktok.baseUrl}/v2/post/publish/`,
      postData,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      postId: response.data.data.publish_id,
      url: response.data.data.share_url
    };
  } catch (error) {
    console.error('TikTok publishing error:', error);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * Validate media for platform
 */
const validateMediaForPlatform = async (platform, mediaUrls, options) => {
  const config = PLATFORMS[platform];
  
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  for (const url of mediaUrls) {
    // Check file size (simplified - in production, you'd fetch the file)
    // const response = await axios.head(url);
    // const fileSize = parseInt(response.headers['content-length']);
    
    const isVideo = url.includes('.mp4') || url.includes('.mov');
    const maxSize = isVideo ? config.maxVideoSize : config.maxImageSize;
    
    // Additional platform-specific validations would go here
  }

  return true;
};

/**
 * Verify platform token
 */
const verifyPlatformToken = async (platform, accessToken, accountId) => {
  try {
    switch (platform) {
      case 'facebook':
      case 'instagram':
        const fbResponse = await axios.get(
          `${PLATFORMS.facebook.baseUrl}/me?access_token=${accessToken}`
        );
        return fbResponse.data.id === accountId;
        
      case 'linkedin':
        const liResponse = await axios.get(
          `${PLATFORMS.linkedin.baseUrl}/people/~`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );
        return liResponse.data.id === accountId;
        
      case 'twitter':
        const twResponse = await axios.get(
          `${PLATFORMS.twitter.baseUrl}/users/me`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );
        return twResponse.data.data.id === accountId;
        
      default:
        return true; // Skip verification for other platforms
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
};

/**
 * Helper functions for media upload
 */
const uploadMediaToLinkedIn = async (accessToken, mediaUrl, author) => {
  // LinkedIn media upload implementation
  // This is simplified - actual implementation would handle file upload
  return { asset: 'urn:li:digitalmediaAsset:example' };
};

const uploadMediaToTwitter = async (accessToken, mediaUrl) => {
  // Twitter media upload implementation
  // This is simplified - actual implementation would handle file upload
  return 'media_id_example';
};

/**
 * Get publication history
 */
const getPublicationHistory = async (userId, options = {}) => {
  const { page = 1, limit = 20, platform, status } = options;
  const offset = (page - 1) * limit;

  const where = { userId };
  if (platform) where.platform = platform;
  if (status) where.status = status;

  const [publications, total] = await Promise.all([
    prisma.socialPublication.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        design: {
          select: {
            id: true,
            name: true,
            thumbnail: true
          }
        },
        connection: {
          select: {
            platform: true,
            accountName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.socialPublication.count({ where })
  ]);

  return {
    publications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  PLATFORMS,
  connectSocialAccount,
  disconnectSocialAccount,
  listSocialConnections,
  publishToSocial,
  getPublicationHistory,
  validateMediaForPlatform,
  verifyPlatformToken
};