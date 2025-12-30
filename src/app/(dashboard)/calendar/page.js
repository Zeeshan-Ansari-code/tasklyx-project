"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function CalendarPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchTasks();
    }
  }, [user, currentDate]);

  const fetchTasks = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // Get all boards user is part of
      const boardsRes = await fetch(`/api/boards?userId=${user.id}`);
      const boardsData = await boardsRes.json();

      if (boardsRes.ok) {
        const boardIds = (boardsData.boards || []).map((b) => b._id);
        
        // Fetch tasks from all boards
        const allTasks = [];
        for (const boardId of boardIds) {
          try {
            const listsRes = await fetch(`/api/boards/${boardId}/lists`);
            const listsData = await listsRes.json();
            
            if (listsRes.ok) {
              for (const list of listsData.lists || []) {
                const tasksRes = await fetch(`/api/lists/${list._id}/tasks`);
                const tasksData = await tasksRes.json();
                
                if (tasksRes.ok) {
                  allTasks.push(...(tasksData.tasks || []));
                }
              }
            }
          } catch (error) {
            // Continue with other boards
          }
        }

        // Filter tasks with due dates
        const tasksWithDueDates = allTasks.filter(
          (task) => task.dueDate && !task.completed
        );
        setTasks(tasksWithDueDates);
      }
    } catch (error) {
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getTasksForDate = (date) => {
    if (!date) return [];
    // Use local date comparison to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getFullYear() === year &&
        taskDate.getMonth() === month &&
        taskDate.getDate() === day
      );
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days = getDaysInMonth(currentDate);
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground text-lg">
            View tasks by their due dates
          </p>
        </div>
        <Button onClick={goToToday} className="shadow-sm hover:shadow-md transition-shadow">
          Today
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="lg:col-span-2 max-w-3xl w-full mx-auto">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {monthNames[currentDate.getMonth()]}{" "}
                    {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateMonth(-1)}
                      className="hover:bg-accent transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateMonth(1)}
                      className="hover:bg-accent transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-5">
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {/* Day headers */}
                  {dayNames.map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-semibold text-muted-foreground p-2 uppercase tracking-wider"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {days.map((date, index) => {
                    const dayTasks = date ? getTasksForDate(date) : [];
                    const taskCount = dayTasks.length;
                    const isSelected = selectedDate && date && 
                      date.toDateString() === selectedDate.toDateString();

                    return (
                      <button
                        key={index}
                        onClick={() => date && setSelectedDate(date)}
                        className={cn(
                          "h-16 sm:h-20 p-1.5 sm:p-2 border rounded-xl text-xs sm:text-sm transition-all duration-200 flex flex-col items-center justify-center",
                          !date ? "border-transparent" : "border-border/50 hover:bg-accent/50 hover:border-primary/50",
                          isToday(date) && "ring-2 ring-primary shadow-md",
                          isPast(date) && date && "opacity-50",
                          isSelected && "bg-primary text-primary-foreground shadow-lg scale-[1.02]",
                          taskCount > 0 && "font-semibold"
                        )}
                        disabled={!date}
                      >
                        <span>{date ? date.getDate() : ""}</span>
                        {taskCount > 0 && (
                          <div className="flex gap-0.5 mt-1">
                            {[...Array(Math.min(taskCount, 3))].map((_, i) => (
                              <div
                                key={i}
                                className={`h-1 w-1 rounded-full ${
                                  isSelected
                                    ? "bg-primary-foreground"
                                    : "bg-primary"
                                }`}
                              />
                            ))}
                            {taskCount > 3 && (
                              <span className="text-[10px] sm:text-xs">+{taskCount - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Date Tasks */}
          <div>
            <Card className="border-border/50 shadow-sm sticky top-24">
              <CardHeader>
                <CardTitle>
                  {selectedDate
                    ? formatDate(selectedDate)
                    : "Select a date"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  selectedDateTasks.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedDateTasks.map((task) => (
                        <Link
                          key={task._id}
                          href={`/boards/${task.board}?task=${task._id}`}
                        >
                          <div className="p-3.5 border border-border/50 rounded-xl hover:bg-accent/50 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {task.title}
                                </p>
                                {task.priority && (
                                  <Badge
                                    variant={
                                      task.priority === "urgent"
                                        ? "destructive"
                                        : task.priority === "high"
                                        ? "info"
                                        : task.priority === "medium"
                                        ? "warning"
                                        : "default"
                                    }
                                    className="capitalize text-xs mt-1"
                                  >
                                    {task.priority}
                                  </Badge>
                                )}
                              </div>
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tasks due on this date
                    </p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Click on a date to view tasks
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

