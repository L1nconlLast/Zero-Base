import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardWeeklyProgressChartProps {
  weekData: Array<{ name: string; horas: number }>;
}

const DashboardWeeklyProgressChart: React.FC<DashboardWeeklyProgressChartProps> = ({ weekData }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={weekData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="name"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
          label={{ value: 'Horas', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(148,163,184,0.25)',
            borderRadius: '8px',
            color: '#e2e8f0',
          }}
        />
        <Bar dataKey="horas" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DashboardWeeklyProgressChart;
