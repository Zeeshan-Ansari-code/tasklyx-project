"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { cn } from "@/lib/utils";

const TaskFilters = ({ onFilterChange, boardMembers = [] }) => {
  const [filters, setFilters] = useState({
    priority: null,
    assignee: null,
    dueDate: null, // "overdue", "today", "thisWeek", "upcoming"
    completed: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key, value) => {
    const newFilters = {
      ...filters,
      [key]: filters[key] === value ? null : value,
    };
    setFilters(newFilters);
    onFilterChange && onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      priority: null,
      assignee: null,
      dueDate: null,
      completed: null,
    };
    setFilters(emptyFilters);
    onFilterChange && onFilterChange(emptyFilters);
  };

  const activeFiltersCount = Object.values(filters).filter((v) => v !== null).length;

  return (
    <div className="relative mb-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="relative hover:bg-accent transition-colors shadow-sm"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filter
        {activeFiltersCount > 0 && (
          <span className="ml-2 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </Button>

      {showFilters && (
        <div className="absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-xl z-[100] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filter Tasks</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-accent rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Priority Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <div className="flex gap-2 flex-wrap">
                {["low", "medium", "high", "urgent"].map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handleFilterChange("priority", priority)}
                    className={cn(
                      "px-3 py-1 rounded text-xs font-medium transition-colors",
                      filters.priority === priority
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee Filter */}
            {boardMembers.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Assignee</label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {boardMembers.map((member) => (
                    <button
                      key={member._id || member}
                      onClick={() => handleFilterChange("assignee", member._id || member)}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded text-sm hover:bg-accent transition-colors",
                        filters.assignee === (member._id || member) && "bg-accent"
                      )}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Due Date Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Due Date</label>
              <div className="space-y-1">
                {[
                  { value: "overdue", label: "Overdue" },
                  { value: "today", label: "Today" },
                  { value: "thisWeek", label: "This Week" },
                  { value: "upcoming", label: "Upcoming" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange("dueDate", option.value)}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded text-sm hover:bg-accent transition-colors",
                      filters.dueDate === option.value && "bg-accent"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Completed Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="space-y-1">
                <button
                  onClick={() => handleFilterChange("completed", false)}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded text-sm hover:bg-accent transition-colors",
                    filters.completed === false && "bg-accent"
                  )}
                >
                  Active
                </button>
                <button
                  onClick={() => handleFilterChange("completed", true)}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded text-sm hover:bg-accent transition-colors",
                    filters.completed === true && "bg-accent"
                  )}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskFilters;

