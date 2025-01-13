import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Gallery from './components/Gallery';
import Admin from './components/Admin';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/ui/toaster';
import { Image } from './components/ui/image';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  return (
    <Router>
      <div className='min-h-screen w-screen bg-background'>
        <header className='bg-white border-b'>
          <div className='max-w-7xl mx-auto'>
            <div className='flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8'>
              {/* Logo Section */}
              <div className='flex-shrink-0'>
                <NavLink to='/' className='flex items-center text-primary'>
                  <Image
                    className='w-18 h-10'
                    src='./src/assets/deen-akademie-logo.png'
                    alt='Logo'
                  />
                  <span className='font-bold text-lg hidden sm:block '>
                    Deen Akademie
                  </span>
                </NavLink>
              </div>

              {/* Slogan Section */}
              <div className='hidden md:block text-center'>
                <h1 className='text-2xl font-bold text-primary'>
                  Foto Contest Gewinnspiel
                </h1>
                <p className='text-sm text-muted-foreground mt-1'>
                  Wählen Sie die besten Aufnahmen
                </p>
              </div>

              {/* Navigation Links */}
              <nav className='flex space-x-1'>
                <NavLink
                  to='/'
                  className={({ isActive }) => `
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  Galerie
                </NavLink>
                <NavLink
                  to='/login'
                  className={({ isActive }) => `
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  Admin Login
                </NavLink>
              </nav>
            </div>
          </div>

          {/* Mobile Slogan - nur auf kleinen Bildschirmen sichtbar */}
          <div className='md:hidden text-center py-3 px-4 border-t'>
            <h1 className='text-xl font-bold text-primary'>
              Foto Contest Gewinnspiel
            </h1>
            <p className='text-xs text-muted-foreground mt-1'>
              Wählen Sie die besten Aufnahmen
            </p>
          </div>
        </header>

        <main>
          <Routes>
            <Route path='/' element={<Gallery supabase={supabase} />} />
            <Route path='/login' element={<Login supabase={supabase} />} />
            <Route
              path='/admin'
              element={
                <ProtectedRoute supabase={supabase}>
                  <Admin supabase={supabase} />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
      <Toaster />
    </Router>
  );
}

export default App;
