import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Consulta from './pages/Consulta';

function App() {
  const path = window.location.pathname;
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {path === '/consulta' ? <Consulta /> : <Home />}
      </main>
      <Footer />
    </div>
  );
}

export default App;
