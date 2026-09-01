import { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Sun, Moon } from 'lucide-react';
import { EditorProvider } from './context/EditorContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import EditorWorkspace from './components/EditorWorkspace';
import AdminPanel from './components/AdminPanel';
import { UserSession } from './types/editor';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Editor Workspace:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-100">Editor Workspace Notice</h2>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            {this.state.error?.message || "An unexpected issue occurred while rendering the workspace layout."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard' | 'editor' | 'admin'>('landing');
  const [user, setUser] = useState<UserSession | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Load session from localStorage on startup or default to direct unified editor session
  useEffect(() => {
    const token = localStorage.getItem('token');
    const id = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');
    const name = localStorage.getItem('userName');
    const role = localStorage.getItem('userRole');
    const department = localStorage.getItem('userDept');

    if (token && id && email && name && role && department) {
      setUser({
        token,
        id: parseInt(id),
        email,
        name,
        role: role as 'ADMIN' | 'FACULTY' | 'STUDENT',
        department
      });
    } else {
      // Default unified editorial workspace session (no login required)
      const defaultUser: UserSession = {
        token: 'default_admin_token',
        id: 1,
        email: 'admin@kprcas.ac.in',
        name: 'KPRCAS Editorial Team',
        role: 'ADMIN',
        department: 'Information Technology'
      };
      setUser(defaultUser);
      localStorage.setItem('token', defaultUser.token);
      localStorage.setItem('userId', defaultUser.id.toString());
      localStorage.setItem('userEmail', defaultUser.email);
      localStorage.setItem('userName', defaultUser.name);
      localStorage.setItem('userRole', defaultUser.role);
      localStorage.setItem('userDept', defaultUser.department);
    }
    setView('dashboard');
  }, []);

  const handleLogin = (session: UserSession) => {
    setUser(session);
    localStorage.setItem('token', session.token);
    localStorage.setItem('userId', session.id.toString());
    localStorage.setItem('userEmail', session.email);
    localStorage.setItem('userName', session.name);
    localStorage.setItem('userRole', session.role);
    localStorage.setItem('userDept', session.department);
    setView('dashboard');
  };

  const handleLogout = () => {
    // Re-initialize default unified session
    const defaultUser: UserSession = {
      token: 'default_admin_token',
      id: 1,
      email: 'editor@kprcas.ac.in',
      name: 'KPRCAS Editorial Team',
      role: 'ADMIN',
      department: 'Information Technology'
    };
    setUser(defaultUser);
    localStorage.setItem('token', defaultUser.token);
    localStorage.setItem('userId', defaultUser.id.toString());
    localStorage.setItem('userEmail', defaultUser.email);
    localStorage.setItem('userName', defaultUser.name);
    localStorage.setItem('userRole', defaultUser.role);
    localStorage.setItem('userDept', defaultUser.department);
    setEditingProjectId(null);
    setView('dashboard');
  };

  const startEditing = (projectId: number) => {
    setEditingProjectId(projectId);
    setView('editor');
  };

  const closeEditor = () => {
    setEditingProjectId(null);
    setView('dashboard');
  };

  // Modern Glassmorphic Navigation Bar for Landing Page
  const renderLanding = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col justify-between">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 px-6 py-4 glass shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold shadow-md shadow-primary/20">
              K
            </div>
            <span className="text-xl font-bold tracking-tight text-secondary">
              KPRCAS <span className="text-primary font-medium">Newsletter Studio</span>
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#templates" className="hover:text-primary transition-colors">Templates</a>
            <a href="#about" className="hover:text-primary transition-colors">About KPRCAS</a>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setView('auth')} 
              className="px-5 py-2 text-sm font-semibold text-primary hover:text-primary-dark dark:text-blue-400 dark:hover:text-blue-300 transition-all"
            >
              Sign In
            </button>
            <button 
              onClick={() => setView('auth')} 
              className="px-5 py-2.5 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary-dark shadow-md shadow-primary/20 dark:shadow-blue-500/10 transition-all hover:scale-[1.02]"
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="px-6 py-16 md:py-24 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center flex-grow">
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 bg-blue-100/60 border border-blue-200/50 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>AI-Powered Newsletters for KPRCAS</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-secondary leading-tight">
              Create College <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Newsletters
              </span> in Seconds.
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-lg leading-relaxed">
              Design professional, print-ready campus newsletters with KPRCAS Newsletter Studio. Drag-and-drop elements, leverage AI writing suggestions, and export beautiful PDF documents instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={() => setView('auth')} 
                className="px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-center"
              >
                Create Newsletter Now
              </button>
              <a 
                href="#features" 
                className="px-6 py-3.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all text-center"
              >
                Learn More
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-orange-300/20 rounded-full blur-3xl" />
            <div className="relative glass p-4 rounded-2xl shadow-xl overflow-hidden transform hover:rotate-1 hover:scale-[1.01] transition-all">
              <img 
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80" 
                alt="Builder Preview" 
                className="rounded-xl w-full h-[320px] object-cover shadow-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-secondary/10 to-transparent flex flex-col justify-end p-8 text-white">
                <p className="text-xs uppercase tracking-wider text-accent font-bold">Interactive Builder</p>
                <h3 className="text-lg font-bold">Canva-like Editing Work Area</h3>
                <p className="text-sm text-slate-300 mt-1">Smart Guides, alignment lines, and instant properties panels.</p>
              </div>
            </div>
          </div>
        </header>

        {/* Features Section */}
        <section id="features" className="bg-white border-t border-slate-100 py-16 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-extrabold text-secondary">Why KPRCAS Newsletter Studio?</h2>
              <p className="text-slate-500 max-w-lg mx-auto">Equipped with academic intelligence to help students and faculty members build stunning campus circulars.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-primary flex items-center justify-center font-bold mb-4 text-xl">✨</div>
                <h3 className="text-lg font-bold text-secondary mb-2">AI Content Suite</h3>
                <p className="text-sm text-slate-600">Generate newsletter title suggestions, enhance prompts, compose headlines, and perform styling recommendations dynamically.</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-accent flex items-center justify-center font-bold mb-4 text-xl">🎨</div>
                <h3 className="text-lg font-bold text-secondary mb-2">College Brand Kits</h3>
                <p className="text-sm text-slate-600">Access pre-seeded logos, official college typography, and color schemes (Royal Blue, Navy, Orange) approved for KPRCAS.</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center font-bold mb-4 text-xl">📄</div>
                <h3 className="text-lg font-bold text-secondary mb-2">Print Ready PDFs</h3>
                <p className="text-sm text-slate-600">Export high-quality multi-page PDF files in standard A4 or A3 sizes, with print bleed boundaries and page numbers.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="about" className="bg-secondary text-white py-12 px-6 border-t border-slate-800">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            <div className="text-center md:text-left space-y-2">
              <span className="text-lg font-bold tracking-wider">KPRCAS Newsletter Studio</span>
              <p className="text-xs text-slate-400">An editorial collaboration tool built for KPR College of Arts Science and Research.</p>
            </div>
            <div className="text-xs text-slate-400 text-center">
              © 2026 KPR College of Arts Science and Research. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    );
  };

  const renderContent = () => {
    switch (view) {
      case 'landing':
        return renderLanding();
      case 'auth':
        return <Auth onLogin={handleLogin} onBackToLanding={() => setView('landing')} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
      case 'dashboard':
        return user ? (
          <Dashboard 
            user={user} 
            onLogout={handleLogout} 
            onEditProject={startEditing} 
            onOpenAdmin={() => setView('admin')} 
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        ) : (
          <Auth onLogin={handleLogin} onBackToLanding={() => setView('landing')} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        );
      case 'admin':
        return user && (user.role === 'ADMIN' || user.role === 'FACULTY') ? (
          <AdminPanel 
            user={user} 
            onBackToDashboard={() => setView('dashboard')} 
            onLogout={handleLogout} 
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        ) : (
          <Dashboard 
            user={user!} 
            onLogout={handleLogout} 
            onEditProject={startEditing} 
            onOpenAdmin={() => setView('admin')} 
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        );
      case 'editor':
        return editingProjectId ? (
          <ErrorBoundary onReset={closeEditor}>
            <EditorProvider>
              <EditorWorkspace 
                projectId={editingProjectId} 
                user={user!} 
                onClose={closeEditor} 
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </EditorProvider>
          </ErrorBoundary>
        ) : (
          <Dashboard 
            user={user!} 
            onLogout={handleLogout} 
            onEditProject={startEditing} 
            onOpenAdmin={() => setView('admin')} 
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        );
      default:
        return renderLanding();
    }
  };

  return <div className="h-full select-none">{renderContent()}</div>;
}

export default App;
