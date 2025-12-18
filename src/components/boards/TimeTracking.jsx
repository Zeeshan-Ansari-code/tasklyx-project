"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Label from "../ui/Label";
import Textarea from "../ui/Textarea";
import { Card, CardContent } from "../ui/Card";
import Avatar from "../ui/Avatar";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const TimeTracking = ({ taskId, boardId, onUpdate }) => {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    hours: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (taskId && user?.id) {
      fetchTimeEntries();
    }
  }, [taskId, user]);

  const fetchTimeEntries = async () => {
    if (!taskId || !user?.id) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/time?userId=${user.id}`);
      const data = await res.json();

      if (res.ok) {
        setTimeEntries(data.timeEntries || []);
        setTotalHours(data.totalHours || 0);
      }
    } catch (error) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleAddTime = async (e) => {
    e.preventDefault();
    if (!taskId || !user?.id) return;

    const hours = parseFloat(newEntry.hours);
    if (!hours || hours <= 0) {
      toast.error("Please enter a valid number of hours");
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          hours,
          description: newEntry.description,
          date: newEntry.date,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Time logged successfully");
        setNewEntry({ hours: "", description: "", date: new Date().toISOString().split("T")[0] });
        setShowAddForm(false);
        fetchTimeEntries();
        onUpdate && onUpdate();
      } else {
        toast.error(data.message || "Failed to log time");
      }
    } catch (error) {
      toast.error("Failed to log time");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Tracking
          </h3>
          <p className="text-sm text-muted-foreground">
            Total: {totalHours.toFixed(2)} hours
          </p>
        </div>
        {!showAddForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Log Time
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleAddTime} className="space-y-3">
              <div>
                <Label required>Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={newEntry.hours}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, hours: e.target.value })
                  }
                  placeholder="0.00"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, date: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newEntry.description}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, description: e.target.value })
                  }
                  placeholder="What did you work on?"
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Log Time
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewEntry({
                      hours: "",
                      description: "",
                      date: new Date().toISOString().split("T")[0],
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {timeEntries.length > 0 ? (
        <div className="space-y-2">
          {timeEntries.map((entry) => (
            <div
              key={entry._id}
              className="flex items-start justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-start gap-3 flex-1">
                <Avatar
                  name={entry.user?.name || "User"}
                  src={entry.user?.avatar}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.hours}h</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {entry.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    by {entry.user?.name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No time entries yet. Log your first time entry!
        </p>
      )}
    </div>
  );
};

export default TimeTracking;

