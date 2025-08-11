import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Consulta from './pages/Consulta';

function App() {
  const path = window.location.pathname;
  return (
    <>
      <Header />
      {path === '/consulta' ? <Consulta /> : <Home />}
      <Footer />
    </>
  );
}

export default App;
