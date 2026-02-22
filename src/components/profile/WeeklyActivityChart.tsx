import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type WeeklyActivityItem = { day: string; minutes: number };

const WeeklyActivityChart: React.FC<{ data: WeeklyActivityItem[] }> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="day" tick={{ fontSize: 13, fontWeight: 'bold' }} />
        <YAxis tick={{ fontSize: 11 }} unit={t('weeklyActivity.minutesUnit', { defaultValue: 'm' })} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={val => [
            `${val} ${t('weeklyActivity.minutesLabel', { defaultValue: 'minutes' })}`,
            t('weeklyActivity.studyDuration', { defaultValue: 'Study time' }),
          ]}
        />
        <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklyActivityChart;
