WEBSHOOKS DASHBOARD - EJEMPLOS DE CÓDIGO
========================================

═══════════════════════════════════════════════════════════════════════════════
1. KPI CARD COMPONENT
═══════════════════════════════════════════════════════════════════════════════

```typescript
// components/dashboard/KPICard.tsx

import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

export function KPICard({
  label,
  value,
  trend,
  icon,
  color = 'blue',
}: KPICardProps) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    red: 'border-red-200 bg-red-50',
    yellow: 'border-yellow-200 bg-yellow-50',
  };

  const trendColorClass = trend?.isPositive ? 'text-green-600' : 'text-red-600';
  const TrendIcon = trend?.isPositive ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{label}</h3>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>

      <div className="mb-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>

      {trend && (
        <div className={`flex items-center text-sm ${trendColorClass}`}>
          <TrendIcon size={16} className="mr-1" />
          <span>
            {trend.isPositive ? '+' : '-'}
            {Math.abs(trend.value)}% vs mes anterior
          </span>
        </div>
      )}
    </div>
  );
}

// USO:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <KPICard
    label="Clientes Activos"
    value="247"
    trend={{ value: 12, isPositive: true }}
    color="blue"
  />
  <KPICard
    label="Revenue MRR"
    value="$125,430"
    trend={{ value: 8, isPositive: true }}
    color="green"
  />
  <KPICard
    label="Queries Hoy"
    value="12,456"
    trend={{ value: 3, isPositive: false }}
    color="yellow"
  />
  <KPICard
    label="Uptime Platform"
    value="99.98%"
    trend={{ value: 0.02, isPositive: true }}
    color="green"
  />
</div>
```

═══════════════════════════════════════════════════════════════════════════════
2. AGENT CARD COMPONENT
═══════════════════════════════════════════════════════════════════════════════

```typescript
// components/dashboard/AgentCard.tsx

import { Cog, MoreVertical } from 'lucide-react';
import Image from 'next/image';

interface AgentCardProps {
  id: string;
  name: string;
  type: string; // 'Recepción', 'Soporte', 'Ventas'
  image: string;
  status: 'online' | 'offline' | 'degraded';
  queries: number;
  latency: number; // ms
  errorRate: number; // %
  onConfig?: () => void;
  onMore?: () => void;
}

export function AgentCard({
  id,
  name,
  type,
  image,
  status,
  queries,
  latency,
  errorRate,
  onConfig,
  onMore,
}: AgentCardProps) {
  const statusColors = {
    online: 'text-green-600 bg-green-50',
    offline: 'text-red-600 bg-red-50',
    degraded: 'text-yellow-600 bg-yellow-50',
  };

  const statusDots = {
    online: '🟢',
    offline: '🔴',
    degraded: '🟡',
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image Container */}
      <div className="relative h-48 bg-gray-100 overflow-hidden group">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover group-hover:opacity-75 transition-opacity"
        />
        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
          <button className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-blue-600 text-white rounded font-medium transition-opacity">
            Ver detalles
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900">{name}</h3>
        <p className="text-sm text-gray-600 mb-3">{type}</p>

        {/* Status */}
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${statusColors[status]}`}>
          {statusDots[status]} {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Degraded'}
        </div>

        {/* Metrics */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Queries:</span>
            <span className="font-semibold text-gray-900">{queries.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Latencia:</span>
            <span className="font-semibold text-gray-900">{latency}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Error Rate:</span>
            <span className={`font-semibold ${errorRate > 1 ? 'text-red-600' : 'text-green-600'}`}>
              {errorRate}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t pt-3">
          <button
            onClick={onConfig}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded border border-gray-200"
          >
            <Cog size={16} />
            Configurar
          </button>
          <button
            onClick={onMore}
            className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded border border-gray-200"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// USO:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <AgentCard
    id="1"
    name="Recepción IA"
    type="Recepción"
    image="/agents/reception.jpg"
    status="online"
    queries={1243}
    latency={245}
    errorRate={0.2}
    onConfig={() => console.log('Config')}
  />
  {/* ... más cards */}
</div>
```

═══════════════════════════════════════════════════════════════════════════════
3. ADVANCED TABLE COMPONENT
═══════════════════════════════════════════════════════════════════════════════

```typescript
// components/dashboard/DataTable.tsx

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      })
    : data;

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full">
        {/* Header */}
        <thead className="bg-gray-800 text-white">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-700"
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={idx}
              className={`border-t hover:bg-blue-50 cursor-pointer transition ${
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-4 text-sm text-gray-900">
                  {col.render ? col.render(row[col.key]) : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// USO:
interface Client {
  id: string;
  name: string;
  email: string;
  plan: string;
  mrr: number;
  agents: number;
  health: string;
}

<DataTable<Client>
  columns={[
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'plan', label: 'Plan' },
    {
      key: 'mrr',
      label: 'MRR',
      render: (val) => `$${val.toLocaleString()}`,
      sortable: true,
    },
    { key: 'agents', label: 'Agentes', sortable: true },
    {
      key: 'health',
      label: 'Health',
      render: (val) =>
        val === 'good' ? (
          <span className="text-green-600 font-semibold">🟢 Good</span>
        ) : (
          <span className="text-red-600 font-semibold">🔴 Bad</span>
        ),
    },
  ]}
  data={clients}
  onRowClick={(row) => console.log('Clicked:', row)}
/>
```

═══════════════════════════════════════════════════════════════════════════════
4. CHART EXAMPLES (Recharts)
═══════════════════════════════════════════════════════════════════════════════

```typescript
// components/dashboard/RevenueChart.tsx

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { month: 'Jan', revenue: 24000, target: 22000 },
  { month: 'Feb', revenue: 32000, target: 24000 },
  { month: 'Mar', revenue: 28000, target: 26000 },
  { month: 'Apr', revenue: 35000, target: 28000 },
  // ...
];

export function RevenueChart() {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#0066FF"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="target"
            stroke="#6B7280"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

```typescript
// components/dashboard/AgentDistribution.tsx

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Recepción', value: 30 },
  { name: 'Soporte', value: 40 },
  { name: 'Ventas', value: 20 },
  { name: 'Otros', value: 10 },
];

const COLORS = ['#0066FF', '#10B981', '#FBBF24', '#EF4444'];

export function AgentDistribution() {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Agent Mix</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

═══════════════════════════════════════════════════════════════════════════════
5. MARKETPLACE AGENT CARD
═══════════════════════════════════════════════════════════════════════════════

```typescript
// components/marketplace/AgentListingCard.tsx

import { Star, ShoppingCart } from 'lucide-react';
import Image from 'next/image';

interface AgentListingCardProps {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: number;
  reviews: number;
  price: number;
  isPopular?: boolean;
  isNew?: boolean;
  onViewDetails: () => void;
  onAddToCart: () => void;
}

export function AgentListingCard({
  id,
  name,
  description,
  image,
  rating,
  reviews,
  price,
  isPopular,
  isNew,
  onViewDetails,
  onAddToCart,
}: AgentListingCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Image Container */}
      <div className="relative h-56 bg-gray-100 overflow-hidden group">
        <Image src={image} alt={name} fill className="object-cover" />

        {/* Badges */}
        <div className="absolute top-3 right-3 flex gap-2">
          {isPopular && (
            <span className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold">
              Popular
            </span>
          )}
          {isNew && (
            <span className="bg-green-500 text-white px-3 py-1 rounded text-xs font-bold">
              🆕 New
            </span>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
          <button
            onClick={onViewDetails}
            className="opacity-0 group-hover:opacity-100 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold transition-opacity"
          >
            Ver detalles
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{description}</p>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={16}
                className={i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {rating.toFixed(1)} ({reviews} reviews)
          </span>
        </div>

        {/* Price & Button */}
        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-2xl font-bold text-blue-600">${price}/mes</span>
          <button
            onClick={onAddToCart}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <ShoppingCart size={18} />
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}
```

═══════════════════════════════════════════════════════════════════════════════
6. LAYOUT DASHBOARD PRINCIPAL
═══════════════════════════════════════════════════════════════════════════════

```typescript
// app/[locale]/admin/layout.tsx

import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

═══════════════════════════════════════════════════════════════════════════════

Estos componentes son el punto de partida. ¿Necesitas que profundice en alguno específico?
