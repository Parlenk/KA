const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Standard ad sizes data
const standardAdSizes = [
  // Social Media - Facebook
  { name: 'Facebook Feed Post', width: 1200, height: 630, category: 'social', platform: 'facebook' },
  { name: 'Facebook Square Post', width: 1080, height: 1080, category: 'social', platform: 'facebook' },
  { name: 'Facebook Story', width: 1080, height: 1920, category: 'social', platform: 'facebook' },
  { name: 'Facebook Cover Photo', width: 1200, height: 315, category: 'social', platform: 'facebook' },
  { name: 'Facebook Event Cover', width: 1920, height: 1080, category: 'social', platform: 'facebook' },
  { name: 'Facebook Video Landscape', width: 1280, height: 720, category: 'video', platform: 'facebook' },
  { name: 'Facebook Video Square', width: 1080, height: 1080, category: 'video', platform: 'facebook' },
  
  // Social Media - Instagram
  { name: 'Instagram Feed Post', width: 1080, height: 1080, category: 'social', platform: 'instagram' },
  { name: 'Instagram Story', width: 1080, height: 1920, category: 'social', platform: 'instagram' },
  { name: 'Instagram Reels', width: 1080, height: 1920, category: 'video', platform: 'instagram' },
  { name: 'Instagram Video Landscape', width: 1200, height: 628, category: 'video', platform: 'instagram' },
  { name: 'Instagram IGTV Cover', width: 420, height: 654, category: 'social', platform: 'instagram' },
  
  // Social Media - Twitter/X
  { name: 'Twitter/X Post', width: 1200, height: 675, category: 'social', platform: 'twitter' },
  { name: 'Twitter/X Header', width: 1500, height: 500, category: 'social', platform: 'twitter' },
  { name: 'Twitter/X Video', width: 1280, height: 720, category: 'video', platform: 'twitter' },
  
  // Social Media - LinkedIn
  { name: 'LinkedIn Feed Post', width: 1200, height: 627, category: 'social', platform: 'linkedin' },
  { name: 'LinkedIn Company Cover', width: 1536, height: 768, category: 'social', platform: 'linkedin' },
  { name: 'LinkedIn Personal Cover', width: 1584, height: 396, category: 'social', platform: 'linkedin' },
  { name: 'LinkedIn Article Cover', width: 1200, height: 627, category: 'social', platform: 'linkedin' },
  
  // Social Media - TikTok
  { name: 'TikTok Video', width: 1080, height: 1920, category: 'video', platform: 'tiktok' },
  { name: 'TikTok Profile Picture', width: 200, height: 200, category: 'social', platform: 'tiktok' },
  
  // Social Media - YouTube
  { name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'social', platform: 'youtube' },
  { name: 'YouTube Channel Art', width: 2560, height: 1440, category: 'social', platform: 'youtube' },
  { name: 'YouTube Video', width: 1920, height: 1080, category: 'video', platform: 'youtube' },
  { name: 'YouTube Shorts', width: 1080, height: 1920, category: 'video', platform: 'youtube' },
  
  // Social Media - Pinterest
  { name: 'Pinterest Pin', width: 1000, height: 1500, category: 'social', platform: 'pinterest' },
  { name: 'Pinterest Square Pin', width: 1080, height: 1080, category: 'social', platform: 'pinterest' },
  
  // Display Advertising - Google Ads
  { name: 'Medium Rectangle', width: 300, height: 250, category: 'display', platform: 'google-ads' },
  { name: 'Large Rectangle', width: 336, height: 280, category: 'display', platform: 'google-ads' },
  { name: 'Leaderboard', width: 728, height: 90, category: 'display', platform: 'google-ads' },
  { name: 'Wide Skyscraper', width: 160, height: 600, category: 'display', platform: 'google-ads' },
  { name: 'Mobile Banner', width: 320, height: 50, category: 'display', platform: 'google-ads' },
  { name: 'Large Mobile Banner', width: 320, height: 100, category: 'display', platform: 'google-ads' },
  { name: 'Half Page', width: 300, height: 600, category: 'display', platform: 'google-ads' },
  { name: 'Large Leaderboard', width: 970, height: 90, category: 'display', platform: 'google-ads' },
  { name: 'Billboard', width: 970, height: 250, category: 'display', platform: 'google-ads' },
  { name: 'Portrait', width: 300, height: 1050, category: 'display', platform: 'google-ads' },
  
  // Display Advertising - Facebook Ads
  { name: 'Facebook News Feed Desktop', width: 1200, height: 628, category: 'display', platform: 'facebook-ads' },
  { name: 'Facebook News Feed Mobile', width: 1080, height: 1080, category: 'display', platform: 'facebook-ads' },
  { name: 'Facebook Right Column', width: 1200, height: 628, category: 'display', platform: 'facebook-ads' },
  { name: 'Facebook Marketplace', width: 1200, height: 628, category: 'display', platform: 'facebook-ads' },
  { name: 'Facebook Instant Articles', width: 1200, height: 628, category: 'display', platform: 'facebook-ads' },
  
  // Print Media
  { name: 'A4 Portrait', width: 2480, height: 3508, category: 'print', platform: null },
  { name: 'A4 Landscape', width: 3508, height: 2480, category: 'print', platform: null },
  { name: 'A3 Portrait', width: 3508, height: 4961, category: 'print', platform: null },
  { name: 'A3 Landscape', width: 4961, height: 3508, category: 'print', platform: null },
  { name: 'Letter Portrait', width: 2550, height: 3300, category: 'print', platform: null },
  { name: 'Letter Landscape', width: 3300, height: 2550, category: 'print', platform: null },
  { name: 'Business Card', width: 1050, height: 600, category: 'print', platform: null },
  { name: 'Postcard 4x6', width: 1800, height: 1200, category: 'print', platform: null },
  { name: 'Postcard 5x7', width: 2100, height: 1500, category: 'print', platform: null },
  { name: 'Flyer A5', width: 1748, height: 2480, category: 'print', platform: null },
  { name: 'Poster A2', width: 4961, height: 7016, category: 'print', platform: null },
  { name: 'Banner 2x6 ft', width: 1440, height: 4320, category: 'print', platform: null },
  
  // Web/Digital
  { name: 'Desktop Wallpaper', width: 1920, height: 1080, category: 'web', platform: null },
  { name: 'Mobile Wallpaper', width: 1080, height: 1920, category: 'web', platform: null },
  { name: 'Website Header', width: 1200, height: 400, category: 'web', platform: null },
  { name: 'Website Banner', width: 1200, height: 300, category: 'web', platform: null },
  { name: 'Blog Header', width: 1200, height: 630, category: 'web', platform: null },
  { name: 'Email Header', width: 600, height: 200, category: 'web', platform: null },
  { name: 'Email Signature', width: 320, height: 120, category: 'web', platform: null },
  
  // Video Formats
  { name: 'Full HD 16:9', width: 1920, height: 1080, category: 'video', platform: null },
  { name: 'HD 16:9', width: 1280, height: 720, category: 'video', platform: null },
  { name: 'Square Video', width: 1080, height: 1080, category: 'video', platform: null },
  { name: 'Vertical Video 9:16', width: 1080, height: 1920, category: 'video', platform: null },
  { name: '4K Ultra HD', width: 3840, height: 2160, category: 'video', platform: null },
  { name: 'Cinema 21:9', width: 2560, height: 1080, category: 'video', platform: null },
  
  // Custom/Popular Sizes
  { name: 'Instagram Story Template', width: 1080, height: 1920, category: 'social', platform: 'instagram' },
  { name: 'Facebook Ad Square', width: 1200, height: 1200, category: 'display', platform: 'facebook-ads' },
  { name: 'Google Display Banner', width: 320, height: 50, category: 'display', platform: 'google-ads' },
  { name: 'LinkedIn Video', width: 1280, height: 720, category: 'video', platform: 'linkedin' },
  { name: 'Twitter Card', width: 1200, height: 628, category: 'social', platform: 'twitter' }
];

// Sample templates data
const sampleTemplates = [
  {
    name: 'Modern Social Media Post',
    description: 'Clean and modern design perfect for social media',
    category: 'social',
    tags: ['modern', 'clean', 'social', 'instagram'],
    thumbnail: '/templates/modern-social.jpg',
    isPremium: false,
    isPublic: true,
    designData: {
      canvas: {
        width: 1080,
        height: 1080,
        background: '#ffffff'
      },
      objects: [
        {
          type: 'text',
          properties: {
            text: 'Your Brand Name',
            x: 50,
            y: 50,
            fontSize: 48,
            fontFamily: 'Arial',
            color: '#333333'
          }
        }
      ]
    }
  },
  {
    name: 'Business Card Template',
    description: 'Professional business card design',
    category: 'print',
    tags: ['business', 'professional', 'card', 'print'],
    thumbnail: '/templates/business-card.jpg',
    isPremium: false,
    isPublic: true,
    designData: {
      canvas: {
        width: 1050,
        height: 600,
        background: '#ffffff'
      },
      objects: [
        {
          type: 'text',
          properties: {
            text: 'John Doe',
            x: 50,
            y: 200,
            fontSize: 28,
            fontFamily: 'Arial',
            color: '#000000',
            fontWeight: 'bold'
          }
        },
        {
          type: 'text',
          properties: {
            text: 'CEO & Founder',
            x: 50,
            y: 250,
            fontSize: 16,
            fontFamily: 'Arial',
            color: '#666666'
          }
        }
      ]
    }
  },
  {
    name: 'Web Banner Template',
    description: 'Eye-catching web banner for websites',
    category: 'web',
    tags: ['web', 'banner', 'header', 'website'],
    thumbnail: '/templates/web-banner.jpg',
    isPremium: false,
    isPublic: true,
    designData: {
      canvas: {
        width: 1200,
        height: 400,
        background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'
      },
      objects: [
        {
          type: 'text',
          properties: {
            text: 'Welcome to Our Website',
            x: 100,
            y: 150,
            fontSize: 42,
            fontFamily: 'Arial',
            color: '#ffffff',
            fontWeight: 'bold'
          }
        }
      ]
    }
  }
];

async function main() {
  console.log('🌱 Seeding database...');

  try {
    // Clear existing data
    await prisma.adSize.deleteMany();
    await prisma.template.deleteMany();
    
    console.log('📏 Seeding standard ad sizes...');
    
    // Seed ad sizes
    for (const size of standardAdSizes) {
      await prisma.adSize.create({
        data: size
      });
    }
    
    console.log(`✅ Created ${standardAdSizes.length} standard ad sizes`);
    
    console.log('📋 Seeding sample templates...');
    
    // Seed templates
    for (const template of sampleTemplates) {
      await prisma.template.create({
        data: template
      });
    }
    
    console.log(`✅ Created ${sampleTemplates.length} sample templates`);
    
    // Create a demo user
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: {
        email: 'demo@example.com',
        name: 'Demo User',
        password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: 'demo123'
        preferences: {
          defaultCanvasSize: '1080x1080',
          autoSave: true,
          gridSnap: true
        }
      }
    });
    
    console.log('👤 Created demo user');
    
    // Create a demo brand kit
    const demoBrandKit = await prisma.brandKit.create({
      data: {
        name: 'Default Brand Kit',
        isDefault: true,
        userId: demoUser.id,
        colors: {
          create: [
            {
              name: 'Primary Blue',
              hex: '#3b82f6',
              rgb: { r: 59, g: 130, b: 246 },
              hsl: { h: 217, s: 91, l: 60 }
            },
            {
              name: 'Secondary Green',
              hex: '#10b981',
              rgb: { r: 16, g: 185, b: 129 },
              hsl: { h: 160, s: 84, l: 39 }
            },
            {
              name: 'Accent Orange',
              hex: '#f59e0b',
              rgb: { r: 245, g: 158, b: 11 },
              hsl: { h: 38, s: 92, l: 50 }
            },
            {
              name: 'Neutral Gray',
              hex: '#6b7280',
              rgb: { r: 107, g: 114, b: 128 },
              hsl: { h: 220, s: 9, l: 46 }
            },
            {
              name: 'Dark Text',
              hex: '#111827',
              rgb: { r: 17, g: 24, b: 39 },
              hsl: { h: 221, s: 39, l: 11 }
            }
          ]
        },
        fonts: {
          create: [
            {
              family: 'Inter',
              variants: ['regular', 'medium', 'semibold', 'bold'],
              type: 'google',
              url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
            },
            {
              family: 'Playfair Display',
              variants: ['regular', 'bold'],
              type: 'google',
              url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap'
            }
          ]
        }
      }
    });
    
    console.log('🎨 Created demo brand kit');
    
    // Create a demo project with design set
    const demoProject = await prisma.project.create({
      data: {
        name: 'My First Design Project',
        description: 'A sample project to get you started',
        userId: demoUser.id,
        designSets: {
          create: {
            name: 'Social Media Campaign',
            canvases: {
              create: [
                {
                  name: 'Instagram Square Post',
                  width: 1080,
                  height: 1080,
                  sizeId: 'instagram-square',
                  platform: 'instagram',
                  backgroundColor: '#ffffff',
                  metadata: {
                    purpose: 'Instagram feed post',
                    targetAudience: 'general'
                  }
                },
                {
                  name: 'Instagram Story',
                  width: 1080,
                  height: 1920,
                  sizeId: 'instagram-story',
                  platform: 'instagram',
                  backgroundColor: '#ffffff',
                  metadata: {
                    purpose: 'Instagram story',
                    targetAudience: 'general'
                  }
                },
                {
                  name: 'Facebook Post',
                  width: 1200,
                  height: 630,
                  sizeId: 'facebook-feed',
                  platform: 'facebook',
                  backgroundColor: '#ffffff',
                  metadata: {
                    purpose: 'Facebook feed post',
                    targetAudience: 'general'
                  }
                }
              ]
            }
          }
        }
      }
    });
    
    console.log('📁 Created demo project with design set');
    
    console.log('🎉 Database seeding completed successfully!');
    
    // Print summary
    const counts = await Promise.all([
      prisma.adSize.count(),
      prisma.template.count(),
      prisma.user.count(),
      prisma.project.count(),
      prisma.designSet.count(),
      prisma.canvas.count(),
      prisma.brandKit.count()
    ]);
    
    console.log('\n📊 Database Summary:');
    console.log(`   Ad Sizes: ${counts[0]}`);
    console.log(`   Templates: ${counts[1]}`);
    console.log(`   Users: ${counts[2]}`);
    console.log(`   Projects: ${counts[3]}`);
    console.log(`   Design Sets: ${counts[4]}`);
    console.log(`   Canvases: ${counts[5]}`);
    console.log(`   Brand Kits: ${counts[6]}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });