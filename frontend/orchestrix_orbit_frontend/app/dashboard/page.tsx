// Static researcher dashboard overview matching Pasted image.png pixel-for-pixel

type TaskStatus = "In Progress" | "To Do" | "Blocked";
type TaskPriority = "High" | "Medium" | "Low";
type BookingStatus = "Confirmed" | "Pending";

interface Task {
  name: string;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  due: string;
}

interface Booking {
  resource: string;
  project: string;
  time: string;
  status: BookingStatus;
}

const tasks: Task[] = [
  { name: "Data synthesis review",   project: "Alpha Centauri",             status: "In Progress", priority: "High",   due: "Today"    },
  { name: "Calibrate sensors",        project: "Project Beta",               status: "To Do",       priority: "Medium", due: "Tomorrow" },
  { name: "Draft methodology section",project: "Thesis 2026",               status: "Blocked",     priority: "High",   due: "Aug 18"   },
  { name: "Peer review submission",   project: "Journal of Advanced Physics",status: "To Do",       priority: "Low",    due: "Aug 20"   },
  { name: "Update cluster nodes",     project: "Infrastructure",            status: "In Progress", priority: "Medium", due: "Aug 22"   },
];

const bookings: Booking[] = [
  { resource: "GPU Lab Workstation 3",     project: "Project Beta",       time: "Today, 15:00",    status: "Confirmed" },
  { resource: "Electron Microscope Suite", project: "Material Sci Group", time: "Tomorrow, 09:00", status: "Pending"   },
  { resource: "Conference Room A",         project: "Weekly Sync",        time: "18 Aug, 11:00",   status: "Confirmed" },
];

function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === "Blocked") {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-semibold rounded bg-[#fee2e2] text-[#991b1b]">
        Blocked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-semibold rounded bg-white border border-[#d4d4d4] text-black">
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-medium rounded border border-dashed border-[#a3a3a3] text-[#525252]">
      {priority}
    </span>
  );
}

function BookingBadge({ status }: { status: BookingStatus }) {
  return (
    <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[11px] font-semibold rounded bg-white border border-[#d4d4d4] text-black">
      {status}
    </span>
  );
}

export default function ResearcherOverviewPage() {
  return (
    <div className="max-w-[1200px] mx-auto">

      {/* Page Title Header */}
      <div className="mb-6 pb-4 border-b border-[#e5e5e5]">
        <h1 className="text-3xl font-bold text-black tracking-tight">Overview</h1>
        <p className="text-sm text-[#737373] mt-1">Saturday, 16 August 2026</p>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "OPEN TASKS",      value: "12", sub: "across 3 projects"   },
          { label: "DUE TODAY",       value: "3",  sub: "tasks need attention" },
          { label: "ACTIVE BOOKINGS", value: "2",  sub: "next: GPU Lab, 3 PM" },
          { label: "NOTIFICATIONS",   value: "7",  sub: "unread alerts"        },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-[#e5e5e5] rounded-lg p-5 flex flex-col justify-between"
          >
            <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              {stat.label}
            </span>
            <div className="text-3xl font-bold text-black my-2">
              {stat.value}
            </div>
            <span className="text-xs text-[#737373]">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* 2 Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* MY TASKS (Takes 2 Columns) */}
        <div className="lg:col-span-2 flex flex-col">
          <h2 className="text-[11px] font-semibold text-[#737373] uppercase tracking-widest mb-3">
            MY TASKS
          </h2>

          <div className="bg-white border border-[#e5e5e5] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f6f6f6] border-b border-[#e5e5e5]">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#737373]">Task</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#737373]">Project</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#737373]">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#737373]">Priority</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#737373] text-right">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {tasks.map((task) => (
                  <tr key={task.name} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-black">
                      {task.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#525252]">
                      {task.project}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3 text-sm text-[#525252] text-right">
                      {task.due}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* View All Tasks Footer */}
            <div className="p-3 border-t border-[#e5e5e5] text-center bg-white">
              <button className="text-xs font-semibold text-black hover:underline cursor-pointer">
                View all tasks →
              </button>
            </div>
          </div>
        </div>

        {/* UPCOMING BOOKINGS (Takes 1 Column) */}
        <div className="flex flex-col">
          <h2 className="text-[11px] font-semibold text-[#737373] uppercase tracking-widest mb-3">
            UPCOMING BOOKINGS
          </h2>

          <div className="bg-white border border-[#e5e5e5] rounded-lg divide-y divide-[#f0f0f0]">
            {bookings.map((booking) => (
              <div key={booking.resource} className="p-4 flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-black leading-tight">
                    {booking.resource}
                  </p>
                  <p className="text-xs text-[#737373] mt-1">{booking.project}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-mono text-xs text-black">{booking.time}</p>
                  <BookingBadge status={booking.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
