import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type WeeklyActivityItem = { day: string; minutes: number };

const WeeklyActivityChart: React.FC<{ data: WeeklyActivityItem[] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="day" tick={{ fontSize: 13, fontWeight: 'bold' }} />
        <YAxis tick={{ fontSize: 11 }} unit="分" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={val => [`${val} 分钟`, '学习时长']}
        />
        <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklyActivityChart;
