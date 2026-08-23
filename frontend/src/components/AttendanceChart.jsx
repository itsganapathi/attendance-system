import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = { present: "#16a34a", absent: "#dc2626", late: "#d97706" };

export default function AttendanceChart({ present = 0, absent = 0, late = 0 }) {
  const data = [
    { name: "Present", value: present, key: "present" },
    { name: "Absent", value: absent, key: "absent" },
    { name: "Late", value: late, key: "late" },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return <p style={{ color: "#888" }}>No attendance data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
          {data.map((entry) => (
            <Cell key={entry.key} fill={COLORS[entry.key]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
