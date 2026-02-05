import React from 'react';
import { format } from 'date-fns';
import { Shift, Employee } from '@/hooks/useSchedulerDatabase';

interface PrintableScheduleProps {
  companyName: string;
  weekDates: Date[];
  employees: Employee[];
  shifts: Shift[];
  getEmployeeName: (id: string) => string;
  teamName?: string;
}

export default function PrintableSchedule({
  companyName,
  weekDates,
  employees,
  shifts,
  getEmployeeName,
  teamName
}: PrintableScheduleProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const getShiftsForEmployeeAndDay = (employeeId: string, date: Date): Shift[] => {
    return shifts.filter(shift => {
      if (shift.employee_id !== employeeId) return false;
      const shiftDate = new Date(shift.start_time);
      return shiftDate.toDateString() === date.toDateString();
    });
  };

  const formatShiftTime = (shift: Shift): string => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  const weekRange = `${format(weekDates[0], 'MMM d')} - ${format(weekDates[6], 'MMM d, yyyy')}`;

  // Calculate weekly totals
  const totalHours = shifts.reduce((acc, shift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return acc + hours;
  }, 0);

  return (
    <div className="print-schedule p-4 bg-white text-black">
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold mb-1">{companyName}</h1>
        {teamName && <h2 className="text-lg font-medium text-gray-700">{teamName}</h2>}
        <p className="text-lg">Weekly Schedule: {weekRange}</p>
        <p className="text-sm text-gray-600 mt-1">
          Total: {shifts.length} shifts | {totalHours.toFixed(0)} hours | {employees.length} employees
        </p>
      </div>

      {/* Schedule Table - Vertical Layout (one employee per section) */}
      {employees.map((employee) => {
        const employeeShifts = shifts.filter(s => s.employee_id === employee.id);
        if (employeeShifts.length === 0) return null;

        return (
          <div key={employee.id} className="mb-6 page-break-inside-avoid">
            <h3 className="text-lg font-bold bg-gray-200 px-3 py-2 border border-gray-400">
              {employee.first_name} {employee.last_name}
              {employee.position && <span className="font-normal text-sm ml-2">({employee.position})</span>}
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-2 py-1 text-left w-24">Day</th>
                  <th className="border border-gray-400 px-2 py-1 text-left w-24">Date</th>
                  <th className="border border-gray-400 px-2 py-1 text-left">Shift Time</th>
                  <th className="border border-gray-400 px-2 py-1 text-left w-20">Hours</th>
                  <th className="border border-gray-400 px-2 py-1 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {weekDates.map((date, dayIndex) => {
                  const dayShifts = getShiftsForEmployeeAndDay(employee.id, date);
                  
                  if (dayShifts.length === 0) {
                    return (
                      <tr key={dayIndex} className="text-gray-400">
                        <td className="border border-gray-300 px-2 py-1">{days[dayIndex]}</td>
                        <td className="border border-gray-300 px-2 py-1">{format(date, 'dd/MM')}</td>
                        <td className="border border-gray-300 px-2 py-1">-</td>
                        <td className="border border-gray-300 px-2 py-1">-</td>
                        <td className="border border-gray-300 px-2 py-1">-</td>
                      </tr>
                    );
                  }

                  return dayShifts.map((shift, shiftIndex) => {
                    const start = new Date(shift.start_time);
                    const end = new Date(shift.end_time);
                    const hours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);
                    
                    return (
                      <tr key={`${dayIndex}-${shiftIndex}`}>
                        {shiftIndex === 0 && (
                          <>
                            <td className="border border-gray-300 px-2 py-1 font-medium" rowSpan={dayShifts.length}>
                              {days[dayIndex]}
                            </td>
                            <td className="border border-gray-300 px-2 py-1" rowSpan={dayShifts.length}>
                              {format(date, 'dd/MM')}
                            </td>
                          </>
                        )}
                        <td className="border border-gray-300 px-2 py-1 font-mono">
                          {formatShiftTime(shift)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">
                          {hours}h
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-gray-600">
                          {shift.notes || '-'}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
            {/* Employee weekly total */}
            <div className="text-right text-sm font-medium mt-1 pr-2">
              Weekly Total: {employeeShifts.reduce((acc, s) => {
                const start = new Date(s.start_time);
                const end = new Date(s.end_time);
                return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              }, 0).toFixed(1)} hours ({employeeShifts.length} shifts)
            </div>
          </div>
        );
      })}

      {/* Summary Table - All employees at a glance */}
      <div className="mt-8 page-break-before">
        <h3 className="text-lg font-bold mb-2 border-b-2 border-black pb-1">Weekly Summary</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 px-2 py-2 text-left">Employee</th>
              {weekDates.map((date, i) => (
                <th key={i} className="border border-gray-400 px-1 py-2 text-center text-xs">
                  {days[i]}<br/>{format(date, 'd/M')}
                </th>
              ))}
              <th className="border border-gray-400 px-2 py-2 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const employeeShifts = shifts.filter(s => s.employee_id === employee.id);
              if (employeeShifts.length === 0) return null;

              const weeklyHours = employeeShifts.reduce((acc, s) => {
                const start = new Date(s.start_time);
                const end = new Date(s.end_time);
                return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              }, 0);

              return (
                <tr key={employee.id}>
                  <td className="border border-gray-300 px-2 py-1 font-medium">
                    {employee.first_name} {employee.last_name.charAt(0)}.
                  </td>
                  {weekDates.map((date, dayIndex) => {
                    const dayShifts = getShiftsForEmployeeAndDay(employee.id, date);
                    return (
                      <td key={dayIndex} className="border border-gray-300 px-1 py-1 text-center text-xs">
                        {dayShifts.length > 0 ? (
                          dayShifts.map((s, i) => (
                            <div key={i}>{format(new Date(s.start_time), 'HH:mm')}</div>
                          ))
                        ) : '-'}
                      </td>
                    );
                  })}
                  <td className="border border-gray-300 px-2 py-1 text-center font-bold">
                    {weeklyHours.toFixed(0)}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
        Printed on {format(new Date(), 'MMMM d, yyyy \'at\' HH:mm')} | Zeno Time Flow
      </div>
    </div>
  );
}
