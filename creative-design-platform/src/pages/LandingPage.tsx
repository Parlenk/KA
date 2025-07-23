import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <PaletteIcon className="h-8 w-8 text-indigo-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">Creative Design Platform</span>
            </div>
            <nav className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-indigo-600 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Create Stunning Ads with
              <span className="text-indigo-600"> AI-Powered Design</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your marketing with our intelligent design platform. Create professional
              advertisements in minutes, not hours, with the power of artificial intelligence.
            </p>
            {!isAuthenticated && (
              <div className="flex justify-center gap-4">
                <Link
                  to="/register"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg px-8 py-3 rounded-md font-medium"
                >
                  Start Creating Free
                </Link>
                <Link
                  to="#features"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-900 text-lg px-8 py-3 rounded-md font-medium"
                >
                  Learn More
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Everything You Need to Create Amazing Ads
              </h2>
              <p className="text-lg text-gray-600">
                Powerful tools and AI assistance to bring your creative vision to life
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                  <SparklesIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Generation</h3>
                <p className="text-gray-600">
                  Generate unique designs instantly with our advanced AI algorithms. Just describe
                  what you need and watch the magic happen.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                  <PaletteIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional Templates</h3>
                <p className="text-gray-600">
                  Choose from thousands of professionally designed templates optimized for different
                  platforms and marketing goals.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                  <RocketLaunchIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p className="text-gray-600">
                  Create and export your designs in minutes. Perfect for teams that need to move
                  fast without compromising quality.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {!isAuthenticated && (
          <div className="bg-indigo-600 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Transform Your Marketing?
              </h2>
              <p className="text-xl text-indigo-100 mb-8">
                Join thousands of creators and marketers who trust our platform
              </p>
              <Link
                to="/register"
                className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-lg text-indigo-600 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                Get Started for Free
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <PaletteIcon className="h-6 w-6 text-indigo-400 mr-2" />
            <span className="text-lg font-semibold">Creative Design Platform</span>
          </div>
          <p className="text-gray-400">
            © 2025 Creative Design Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}