/**
 * Minimal UI bootstrap so esbuild can produce dist/UI.js
 * You can expand this as you implement packets 00..07.
 */

// Import styles
import './styles/tokens.css';
import './styles/components.css';
import './styles/grid.css';

// Export Table component
export { Table, createTable } from './components/Table';
export type {
  TableColumn,
  TableRow,
  TableAction,
  BulkAction,
  TableConfig
} from './components/Table';

// Export Drawer component
export { Drawer, createDrawer } from './components/Drawer';
export type { DrawerConfig } from './components/Drawer';

// Export Modal component
export {
  Modal,
  createModal,
  confirm,
  alert
} from './components/Modal';
export type { ModalConfig } from './components/Modal';

// Export Toast component
export {
  showToast,
  closeToast,
  closeAllToasts,
  toast
} from './components/Toast';
export type { ToastConfig, ToastType, ToastPosition } from './components/Toast';

// Export Dashboard page
export { Dashboard, createDashboard } from './pages/Dashboard';
export type { DashboardConfig, DashboardMetrics, QueueItem } from './pages/Dashboard';

// Export StatCard component
export { StatCard, createStatCard } from './components/StatCard';
export type { StatCardConfig, StatCardUpdateData } from './components/StatCard';

// Export ChartStyle utilities
export {
  getChartColors,
  ChartLegend,
  generateChartPatterns,
  formatChartValue,
  applyChartStyles,
  createChartTooltip,
  generateChartId,
  defaultChartConfig
} from './components/ChartStyle';
export type { ChartColors, ChartConfig, LegendItem } from './components/ChartStyle';

// Import for global access
import { Table, createTable } from './components/Table';
import { Drawer, createDrawer } from './components/Drawer';
import { Modal, createModal, confirm, alert } from './components/Modal';
import { showToast, closeToast, closeAllToasts, toast } from './components/Toast';
import { Dashboard, createDashboard } from './pages/Dashboard';
import { StatCard, createStatCard } from './components/StatCard';
import {
  getChartColors,
  ChartLegend,
  applyChartStyles,
  formatChartValue
} from './components/ChartStyle';

// Basic theme/density prefs (aligns with spec)
const THEME_KEY = 'ui.theme';
const DENSITY_KEY = 'ui.density';

function applyPrefs() {
  const theme = (localStorage.getItem(THEME_KEY) || 'light') as 'light'|'dark';
  const density = (localStorage.getItem(DENSITY_KEY) || 'comfortable') as 'comfortable'|'compact';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-density', density);
}

applyPrefs();

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app') || document.body.appendChild(document.createElement('div'));
  app.id = 'app';
  app.innerHTML = `
    <div class="container">
      <h1>GAS-PA UI scaffold</h1>
      <p>Bundle loaded from <code>dist/UI.js</code>.</p>
      <p><a href="/gallery/index.html">Open Gallery</a></p>
      <div style="margin-top:16px;">
        <button id="toggle-theme">Toggle Theme</button>
        <button id="toggle-density">Toggle Density</button>
      </div>
    </div>
  `;
  (document.getElementById('toggle-theme') as HTMLButtonElement).onclick = () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, t);
    applyPrefs();
  };
  (document.getElementById('toggle-density') as HTMLButtonElement).onclick = () => {
    const d = document.documentElement.getAttribute('data-density') === 'compact' ? 'comfortable' : 'compact';
    localStorage.setItem(DENSITY_KEY, d);
    applyPrefs();
  };
});

// Global window exports for Apps Script HTML Service
declare global {
  interface Window {
    Table: typeof Table;
    createTable: typeof createTable;
    Dashboard: typeof Dashboard;
    createDashboard: typeof createDashboard;
    StatCard: typeof StatCard;
    createStatCard: typeof createStatCard;
    ChartLegend: typeof ChartLegend;
    getChartColors: typeof getChartColors;
    formatChartValue: typeof formatChartValue;
    UI: {
      Table: typeof Table;
      createTable: typeof createTable;
      Dashboard: typeof Dashboard;
      createDashboard: typeof createDashboard;
      StatCard: typeof StatCard;
      createStatCard: typeof createStatCard;
      ChartLegend: typeof ChartLegend;
      getChartColors: typeof getChartColors;
      formatChartValue: typeof formatChartValue;
      applyChartStyles: typeof applyChartStyles;
    };
  }
}

// Make components available globally for HTML Service
if (typeof window !== 'undefined') {
  // Direct global access
  (window as any).Table = Table;
  (window as any).createTable = createTable;
  (window as any).Dashboard = Dashboard;
  (window as any).createDashboard = createDashboard;
  (window as any).StatCard = StatCard;
  (window as any).createStatCard = createStatCard;
  (window as any).ChartLegend = ChartLegend;
  (window as any).getChartColors = getChartColors;
  (window as any).formatChartValue = formatChartValue;

  // Namespaced access
  (window as any).UI = {
    Table,
    createTable,
    Dashboard,
    createDashboard,
    StatCard,
    createStatCard,
    ChartLegend,
    getChartColors,
    formatChartValue,
    applyChartStyles
  };
}
