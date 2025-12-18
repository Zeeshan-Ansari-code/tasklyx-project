"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Power, PowerOff, ExternalLink, Clock, AlertCircle } from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Label from "../ui/Label";
import Modal from "../ui/Modal";
import Badge from "../ui/Badge";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

const WEBHOOK_EVENTS = [
  { value: "task.created", label: "Task Created" },
  { value: "task.updated", label: "Task Updated" },
  { value: "task.deleted", label: "Task Deleted" },
  { value: "task.completed", label: "Task Completed" },
  { value: "task.moved", label: "Task Moved" },
  { value: "list.created", label: "List Created" },
  { value: "list.updated", label: "List Updated" },
  { value: "list.deleted", label: "List Deleted" },
  { value: "board.updated", label: "Board Updated" },
  { value: "member.added", label: "Member Added" },
  { value: "member.removed", label: "Member Removed" },
];

const WebhooksManager = ({ boardId, userId, isOpen, onClose }) => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    url: "",
    events: [],
  });

  useEffect(() => {
    if (isOpen && boardId) {
      fetchWebhooks();
    }
  }, [isOpen, boardId]);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/webhooks`);
      const data = await res.json();
      if (res.ok) {
        setWebhooks(data.webhooks || []);
      }
    } catch (error) {
      toast.error("Failed to fetch webhooks");
    }
  };

  const handleAddWebhook = async () => {
    if (!newWebhook.url.trim()) {
      toast.error("Webhook URL is required");
      return;
    }

    if (newWebhook.events.length === 0) {
      toast.error("At least one event is required");
      return;
    }

    // Validate URL
    try {
      new URL(newWebhook.url);
    } catch (error) {
      toast.error("Invalid URL format");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newWebhook,
          userId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Webhook created successfully");
        setShowAddModal(false);
        setNewWebhook({ url: "", events: [] });
        fetchWebhooks();
      } else {
        toast.error(data.message || "Failed to create webhook");
      }
    } catch (error) {
      toast.error("Failed to create webhook");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!confirm("Are you sure you want to delete this webhook?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/boards/${boardId}/webhooks/${webhookId}?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Webhook deleted successfully");
        fetchWebhooks();
      } else {
        toast.error(data.message || "Failed to delete webhook");
      }
    } catch (error) {
      toast.error("Failed to delete webhook");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWebhook = async (webhookId, currentStatus) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/webhooks/${webhookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: !currentStatus,
          userId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Webhook ${!currentStatus ? "activated" : "deactivated"}`);
        fetchWebhooks();
      } else {
        toast.error(data.message || "Failed to update webhook");
      }
    } catch (error) {
      toast.error("Failed to update webhook");
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (eventValue) => {
    if (newWebhook.events.includes(eventValue)) {
      setNewWebhook({
        ...newWebhook,
        events: newWebhook.events.filter((e) => e !== eventValue),
      });
    } else {
      setNewWebhook({
        ...newWebhook,
        events: [...newWebhook.events, eventValue],
      });
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Webhooks" size="lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Configure webhooks to receive real-time notifications about board events.
            </p>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </div>

          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No webhooks configured yet.</p>
              <p className="text-sm mt-2">
                Add a webhook to receive notifications when events occur in this board.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook._id}
                  className={`p-4 border rounded-lg ${
                    !webhook.active ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <a
                          href={webhook.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:underline flex items-center gap-1"
                        >
                          {webhook.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Badge variant={webhook.active ? "default" : "outline"}>
                          {webhook.active ? "Active" : "Inactive"}
                        </Badge>
                        {webhook.failureCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {webhook.failureCount} failures
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {webhook.events.map((event) => {
                          const eventLabel =
                            WEBHOOK_EVENTS.find((e) => e.value === event)?.label ||
                            event;
                          return (
                            <Badge key={event} variant="outline" className="text-xs">
                              {eventLabel}
                            </Badge>
                          );
                        })}
                      </div>
                      {webhook.lastTriggered && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last triggered: {formatDateTime(webhook.lastTriggered)}
                        </p>
                      )}
                      {webhook.createdBy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Created by: {webhook.createdBy.name || webhook.createdBy.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleToggleWebhook(webhook._id, webhook.active)
                        }
                        disabled={loading}
                        title={webhook.active ? "Deactivate" : "Activate"}
                      >
                        {webhook.active ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWebhook(webhook._id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Webhook Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewWebhook({ url: "", events: [] });
        }}
        title="Add Webhook"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label required>Webhook URL</Label>
            <Input
              type="url"
              value={newWebhook.url}
              onChange={(e) =>
                setNewWebhook({ ...newWebhook, url: e.target.value })
              }
              placeholder="https://example.com/webhook"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your endpoint will receive POST requests with webhook payloads.
            </p>
          </div>

          <div>
            <Label required>Events</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select the events you want to receive notifications for.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto p-2 border rounded-md">
              {WEBHOOK_EVENTS.map((event) => (
                <label
                  key={event.value}
                  className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={newWebhook.events.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">{event.label}</span>
                </label>
              ))}
            </div>
            {newWebhook.events.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {newWebhook.events.length} event(s) selected
              </p>
            )}
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs font-medium mb-1">Webhook Payload Format:</p>
            <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
              {JSON.stringify(
                {
                  event: "task.created",
                  data: { taskId: "...", boardId: "...", title: "..." },
                  timestamp: "2024-01-01T00:00:00.000Z",
                },
                null,
                2
              )}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              A signature will be included in the <code>X-Webhook-Signature</code> header
              for verification.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setNewWebhook({ url: "", events: [] });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddWebhook} disabled={loading}>
              {loading ? "Creating..." : "Create Webhook"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default WebhooksManager;

