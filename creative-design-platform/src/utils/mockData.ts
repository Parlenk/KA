// Mock data for demo purposes
export const mockDashboardData = {
  user_id: 'demo-user',
  timeframe: '30d' as const,
  overview: {
    total_designs: 127,
    active_projects: 8,
    collaborations: 23,
    exports_completed: 89,
    ai_interactions: 156,
    performance_score: 87,
    productivity_score: 92,
    trends: {
      designs_created: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.floor(Math.random() * 10) + 1,
        change_percentage: Math.random() * 20 - 10
      })),
      time_spent: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.floor(Math.random() * 480) + 120, // 2-8 hours in minutes
        change_percentage: Math.random() * 20 - 10
      })),
      collaboration_hours: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.floor(Math.random() * 120) + 30, // 0.5-2.5 hours
        change_percentage: Math.random() * 20 - 10
      })),
      ai_usage: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.floor(Math.random() * 20) + 1,
        change_percentage: Math.random() * 20 - 10
      }))
    }
  },
  design_analytics: {
    total_designs: 127,
    designs_by_category: {
      'social-media': 45,
      'display-ads': 32,
      'print': 28,
      'web': 22
    },
    average_design_time: 45,
    completion_rate: 0.89,
    popular_templates: [
      {
        id: 'template-1',
        name: 'Instagram Story Template',
        usage_count: 23,
        thumbnail: '/api/placeholder/200/300'
      },
      {
        id: 'template-2',
        name: 'Facebook Ad Template',
        usage_count: 19,
        thumbnail: '/api/placeholder/400/300'
      }
    ],
    design_complexity: {
      simple: 45,
      medium: 67,
      complex: 15
    },
    canvas_usage: {
      average_elements: 12,
      most_used_tools: [
        { tool: 'text', usage_count: 234, percentage: 35 },
        { tool: 'rectangle', usage_count: 189, percentage: 28 },
        { tool: 'image', usage_count: 156, percentage: 23 },
        { tool: 'circle', usage_count: 94, percentage: 14 }
      ],
      size_distribution: {
        'instagram-story': 45,
        'facebook-post': 32,
        'linkedin-banner': 28,
        'twitter-header': 22
      }
    },
    design_trends: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 10) + 1
    })),
    time_spent_by_phase: {
      planning: 15,
      designing: 60,
      reviewing: 15,
      finalizing: 10
    }
  },
  insights: [
    {
      id: 'insight-1',
      type: 'achievement' as const,
      priority: 'high' as const,
      title: 'Design Streak Achievement!',
      description: 'You\'ve created designs for 7 consecutive days. Keep up the great work!',
      action_url: '/achievements',
      action_text: 'View all achievements',
      created_at: new Date().toISOString()
    },
    {
      id: 'insight-2',
      type: 'recommendation' as const,
      priority: 'medium' as const,
      title: 'Optimize Your Workflow',
      description: 'Try using AI text generation to speed up your copywriting process by 40%.',
      action_url: '/ai-features',
      action_text: 'Explore AI features',
      created_at: new Date().toISOString()
    },
    {
      id: 'insight-3',
      type: 'tip' as const,
      priority: 'low' as const,
      title: 'Brand Consistency Tip',
      description: 'Your designs show 95% brand compliance. Consider creating brand guidelines for the remaining 5%.',
      created_at: new Date().toISOString()
    }
  ],
  generated_at: new Date().toISOString()
};

export const mockRealTimeMetrics = {
  active_users: 12,
  current_designs: 8,
  active_collaborations: 3,
  ongoing_exports: 2,
  ai_requests_per_minute: 5,
  system_load: 0.67
};

export const mockUserGoals = {
  goals: {
    designs_per_week: 10,
    collaboration_hours: 5,
    ai_efficiency_target: 80,
    brand_compliance_score: 95
  },
  progress: {
    designs_per_week: 7,
    collaboration_hours: 3.5,
    ai_efficiency_target: 75,
    brand_compliance_score: 92
  },
  achievements: [
    {
      goal: 'designs_per_week',
      achieved_at: '2024-01-15T10:30:00Z',
      value: 10
    },
    {
      goal: 'brand_compliance_score',
      achieved_at: '2024-01-10T14:20:00Z',
      value: 95
    }
  ]
};

export const mockCustomReports = [
  {
    id: 'report-1',
    name: 'Weekly Design Summary',
    description: 'Overview of design activity and performance metrics',
    timeframe: '7d',
    metrics: ['designs_created', 'collaboration_time', 'export_count'],
    filters: {},
    chart_type: 'line' as const,
    created_at: '2024-01-01T00:00:00Z',
    last_run: '2024-01-19T09:00:00Z',
    is_scheduled: true,
    schedule_frequency: 'weekly' as const
  },
  {
    id: 'report-2',
    name: 'Brand Compliance Report',
    description: 'Monthly brand guideline compliance analysis',
    timeframe: '30d',
    metrics: ['compliance_score', 'violations', 'auto_fixes'],
    filters: { brand_kit_id: 'primary' },
    chart_type: 'bar' as const,
    created_at: '2024-01-01T00:00:00Z',
    last_run: '2024-01-18T12:00:00Z',
    is_scheduled: false
  }
];

export const mockPerformanceMetrics = {
  lcp: 1250,
  fid: 45,
  cls: 0.08,
  memory_usage: 125,
  api_response_time: 380,
  canvas_fps: 58
};

export const mockPerformanceAlerts = [
  {
    id: 'alert-1',
    metric: 'Memory Usage',
    threshold: 100,
    current_value: 125,
    severity: 'warning' as const,
    description: 'Memory usage is higher than recommended threshold',
    recommendation: 'Consider optimizing component lifecycle and checking for memory leaks',
    created_at: new Date().toISOString()
  }
];

export const mockOptimizationSuggestions = [
  {
    id: 'opt-1',
    type: 'bundle' as const,
    title: 'Code Splitting Opportunity',
    description: 'Large bundle detected. Consider lazy loading non-critical components.',
    priority: 'high' as const,
    estimated_improvement: '25% faster initial load',
    implementation: {
      difficulty: 'medium' as const,
      estimated_time: '2-3 hours',
      steps: [
        'Identify large components in bundle analyzer',
        'Implement React.lazy() for route-based splitting',
        'Add loading fallbacks for better UX',
        'Test and measure improvement'
      ]
    },
    metrics_impact: {
      lcp_improvement: 800,
      fid_improvement: 20
    }
  },
  {
    id: 'opt-2',
    type: 'image' as const,
    title: 'Image Optimization',
    description: 'Unoptimized images detected. Implement WebP format and lazy loading.',
    priority: 'medium' as const,
    estimated_improvement: '15% bandwidth reduction',
    implementation: {
      difficulty: 'easy' as const,
      estimated_time: '1 hour',
      steps: [
        'Convert images to WebP format',
        'Add lazy loading attributes',
        'Implement responsive image sizes'
      ]
    },
    metrics_impact: {
      lcp_improvement: 400
    }
  }
];

export const mockBrandGuidelines = [
  {
    id: 'guideline-1',
    brand_kit_id: 'demo-brand-kit',
    name: 'Primary Color Usage',
    description: 'Use primary brand colors for headers and call-to-action elements',
    category: 'colors' as const,
    rule_type: 'required' as const,
    severity: 'error' as const,
    rules: [
      {
        id: 'rule-1',
        type: 'color_usage' as const,
        property: 'color',
        operator: 'equals' as const,
        value: '#3B82F6',
        message: 'Primary elements must use brand blue (#3B82F6)',
        auto_fix: true
      }
    ],
    is_active: true,
    order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'demo-user'
  },
  {
    id: 'guideline-2',
    brand_kit_id: 'demo-brand-kit',
    name: 'Typography Standards',
    description: 'Use consistent typography hierarchy across all designs',
    category: 'typography' as const,
    rule_type: 'preferred' as const,
    severity: 'warning' as const,
    rules: [
      {
        id: 'rule-2',
        type: 'font_usage' as const,
        property: 'fontFamily',
        operator: 'equals' as const,
        value: 'Inter',
        message: 'Use Inter font family for body text',
        auto_fix: true
      }
    ],
    is_active: true,
    order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'demo-user'
  }
];

export const mockComplianceResult = {
  design_id: 'demo-design',
  overall_score: 87,
  violations: [
    {
      id: 'violation-1',
      guideline_id: 'guideline-1',
      rule_id: 'rule-1',
      element_id: 'text-element-1',
      severity: 'warning' as const,
      message: 'Text color should match brand guidelines',
      current_value: '#000000',
      expected_value: '#3B82F6',
      can_auto_fix: true,
      coordinates: { x: 100, y: 50, width: 200, height: 30 }
    }
  ],
  warnings: [
    {
      id: 'warning-1',
      message: 'Consider using larger font size for better readability',
      recommendation: 'Increase font size to at least 14px',
      element_ids: ['text-element-2'],
      impact_score: 0.7
    }
  ],
  suggestions: [
    {
      id: 'suggestion-1',
      type: 'improvement' as const,
      title: 'Improve Color Contrast',
      description: 'Increase contrast ratio for better accessibility',
      priority: 'medium' as const,
      implementation_effort: 'easy' as const,
      expected_impact: 'Better accessibility compliance',
      action_required: { type: 'color_adjustment', target_ratio: 4.5 }
    }
  ],
  checked_at: new Date().toISOString(),
  guidelines_version: '1.0.0'
};

export const mockTemplates = [
  {
    id: 'template-1',
    name: 'Instagram Story - Product Launch',
    description: 'Modern product launch template for Instagram stories',
    category: 'social-media',
    tags: ['instagram', 'product', 'modern', 'sale'],
    thumbnail: '/api/placeholder/300/400',
    preview_url: '/api/placeholder/300/400',
    is_premium: false,
    created_at: new Date().toISOString(),
    usage_count: 245,
    rating: 4.8,
    dimensions: { width: 1080, height: 1920 },
    color_palette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
    design_elements: ['text', 'image', 'shape', 'gradient'],
    ai_tags: ['energetic', 'modern', 'commercial']
  },
  {
    id: 'template-2',
    name: 'Facebook Ad - E-commerce',
    description: 'High-converting e-commerce ad template',
    category: 'advertising',
    tags: ['facebook', 'ecommerce', 'conversion', 'cta'],
    thumbnail: '/api/placeholder/400/300',
    preview_url: '/api/placeholder/400/300',
    is_premium: true,
    created_at: new Date().toISOString(),
    usage_count: 189,
    rating: 4.9,
    dimensions: { width: 1200, height: 630 },
    color_palette: ['#2ECC71', '#E74C3C', '#3498DB', '#F39C12'],
    design_elements: ['text', 'image', 'button', 'badge'],
    ai_tags: ['professional', 'trustworthy', 'action-oriented']
  },
  {
    id: 'template-3',
    name: 'LinkedIn Banner - Professional',
    description: 'Clean professional banner for LinkedIn profiles',
    category: 'social-media',
    tags: ['linkedin', 'professional', 'corporate', 'banner'],
    thumbnail: '/api/placeholder/600/200',
    preview_url: '/api/placeholder/600/200',
    is_premium: false,
    created_at: new Date().toISOString(),
    usage_count: 156,
    rating: 4.6,
    dimensions: { width: 1584, height: 396 },
    color_palette: ['#0077B5', '#313335', '#F3F2F0', '#00A0DC'],
    design_elements: ['text', 'logo', 'pattern'],
    ai_tags: ['corporate', 'minimal', 'professional']
  }
];

// Add more mock data as needed for other components
export const mockAIFeatures = [
  {
    id: 'image-generation',
    name: 'AI Image Generation',
    description: 'Generate custom images from text descriptions',
    status: 'available' as const,
    usage_count: 45,
    success_rate: 0.92
  },
  {
    id: 'background-removal',
    name: 'Background Removal',
    description: 'Automatically remove backgrounds from images',
    status: 'available' as const,
    usage_count: 78,
    success_rate: 0.96
  },
  {
    id: 'text-generation',
    name: 'AI Copywriting',
    description: 'Generate marketing copy and headlines',
    status: 'available' as const,
    usage_count: 123,
    success_rate: 0.89
  }
];