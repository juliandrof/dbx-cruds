import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateCrud from './pages/CreateCrud';
import CrudView from './pages/CrudView';
import EditCrud from './pages/EditCrud';
import ImportData from './pages/ImportData';
import Settings from './pages/Settings';
import Toasts from './components/Toasts';

export default function App() {
  const { theme, accentColor, setTheme, setAccentColor } = useStore();

  useEffect(() => {
    // Apply persisted settings on mount
    setTheme(theme);
    setAccentColor(accentColor);
  }, []);

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateCrud />} />
          <Route path="/crud/:id" element={<CrudView />} />
          <Route path="/crud/:id/edit" element={<EditCrud />} />
          <Route path="/crud/:id/import" element={<ImportData />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toasts />
    </>
  );
}
