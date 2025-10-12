import { ThemeProvider } from '@/components/ThemeProvider';
import Dashboard from '@/pages/Dashboard';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;
