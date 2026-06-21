"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartData {
  name: string;
  uids: number;
}

// OPTIMIZED: Removed framer-motion wrapper, reduced chart animation duration
export function DashboardChart({ data }: { data: ChartData[] }) {
  return (
    <div className="w-full h-[300px] mt-6 animate-fade-in">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: -20,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorUids" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="rgba(255,255,255,0.2)" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.2)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(10, 10, 26, 0.9)', 
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff'
            }}
            itemStyle={{ color: '#c4b5fd' }}
          />
          <Area 
            type="monotone" 
            dataKey="uids" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorUids)" 
            animationDuration={800}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
