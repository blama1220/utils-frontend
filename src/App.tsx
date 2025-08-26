import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Consulta from './pages/Consulta';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const path = window.location.pathname;
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {path === '/consulta' ? (
            <ProtectedRoute>
              <Consulta />
            </ProtectedRoute>
          ) : (
            <Home />
          )}
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
