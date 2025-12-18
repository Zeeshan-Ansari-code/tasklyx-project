"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, Users, Flag, FileText, CheckCircle2, X, Search, MessageSquare, Send, Tag, Paperclip, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Label from "../ui/Label";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import Select from "../ui/Select";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import TimeTracking from "./TimeTracking";

const TaskEditModal = ({ isOpen, onClose, task, boardId, lists, boardMembers = [], onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const assigneeDropdownRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const commentsEndRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    list: "",
    priority: "medium",
    dueDate: "",
    completed: false,
    assignees: [],
    labels: [],
    customFields: {},
  });
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);

  useEffect(() => {
    if (task && boardId) {
      // Extract assignee IDs
      const assigneeIds = (task.assignees || []).map((assignee) => 
        assignee._id || assignee
      );
      
      setFormData({
        title: task.title || "",
        description: task.description || "",
        list: task.list?._id || task.list || "",
        priority: task.priority || "medium",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
        completed: task.completed || false,
        assignees: assigneeIds,
        labels: task.labels || [],
        customFields: task.customFields || {},
      });

      // Set comments
      setComments(task.comments || []);

      // Fetch custom field definitions
      fetchCustomFieldDefinitions();
    }
  }, [task, boardId]);

  const fetchCustomFieldDefinitions = async () => {
    if (!boardId) return;
    try {
      const res = await fetch(`/api/boards/${boardId}/custom-fields`);
      const data = await res.json();
      if (res.ok) {
        setCustomFieldDefinitions(data.customFieldDefinitions || []);
      }
    } catch (error) {
      // Silently fail
    }
  };

  // Scroll to bottom when comments change
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  // Close assignee dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(event.target)
      ) {
        setShowAssigneeDropdown(false);
        setAssigneeSearch("");
      }
    };

    if (showAssigneeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAssigneeDropdown]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !task || !user) return;

    setAddingComment(true);

    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newComment.trim(),
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Add the new comment to the list
        const newCommentData = {
          ...data.comment,
          user: {
            _id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          },
        };
        setComments([...comments, newCommentData]);
        setNewComment("");
        toast.success("Comment added");
        onUpdate && onUpdate();
      } else {
        toast.error(data.message || "Failed to add comment");
      }
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task) return;

    setLoading(true);

    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description,
        priority: formData.priority,
        completed: formData.completed,
        assignees: formData.assignees,
        labels: formData.labels,
        customFields: formData.customFields,
        userId: user?.id, // Include userId for notifications
      };

      if (formData.dueDate) {
        updateData.dueDate = new Date(formData.dueDate).toISOString();
      } else {
        updateData.dueDate = null;
      }

      if (formData.list && formData.list !== task.list?._id && formData.list !== task.list) {
        updateData.list = formData.list;
      }

      console.log(`[TaskEditModal] Updating task ${task._id} with data:`, updateData);

      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      console.log(`[TaskEditModal] Response status: ${res.status}`);
      console.log(`[TaskEditModal] Response data:`, data);

      if (res.ok) {
        toast.success("Task updated successfully");
        onUpdate && onUpdate();
        onClose();
      } else {
        console.error(`[TaskEditModal] Error response:`, data);
        toast.error(data.message || "Failed to update task");
      }
    } catch (error) {
      console.error(`[TaskEditModal] Exception:`, error);
      toast.error("Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: "low", label: "Low", color: "default" },
    { value: "medium", label: "Medium", color: "warning" },
    { value: "high", label: "High", color: "info" },
    { value: "urgent", label: "Urgent", color: "destructive" },
  ];

  if (!task) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Edit Task" 
      size="lg"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="task-edit-form" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
      <form id="task-edit-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <Label required>Title</Label>
          <Input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="Task title"
            required
          />
        </div>

        {/* Description */}
        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Add a more detailed description..."
            rows={4}
          />
        </div>

        {/* List Selection */}
        {lists && lists.length > 0 && (
          <div>
            <Label>List</Label>
            <Select
              value={formData.list}
              onChange={(e) =>
                setFormData({ ...formData, list: e.target.value })
              }
            >
              {lists.map((list) => (
                <option key={list._id} value={list._id}>
                  {list.title}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Priority and Due Date Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <div className="flex gap-2 mt-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, priority: option.value })
                  }
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.priority === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="mt-2"
            />
          </div>
        </div>

        {/* Assignees */}
        <div>
          <Label>Assignees</Label>
          <div className="mt-2 space-y-2">
            {/* Selected Assignees */}
            {formData.assignees.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {formData.assignees.map((assigneeId) => {
                  const assignee = boardMembers.find(
                    (m) => (m._id || m) === assigneeId
                  );
                  if (!assignee) return null;
                  
                  return (
                    <div
                      key={assigneeId}
                      className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full"
                    >
                      <Avatar
                        name={assignee.name}
                        src={assignee.avatar}
                        size="sm"
                      />
                      <span className="text-sm">{assignee.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            assignees: formData.assignees.filter(
                              (id) => id !== assigneeId
                            ),
                          });
                        }}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Add Assignee Dropdown */}
            <div className="relative" ref={assigneeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
              >
                <Users className="h-4 w-4" />
                Add Assignee
              </button>
              
              {showAssigneeDropdown && (
                <div className="absolute z-100 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-hidden top-full left-0 right-0 sm:right-auto max-w-[calc(100vw-4rem)] sm:max-w-none">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        className="pl-8"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {boardMembers
                      .filter((member) => {
                        const isAssigned = formData.assignees.includes(
                          member._id || member
                        );
                        const matchesSearch =
                          !assigneeSearch ||
                          member.name
                            .toLowerCase()
                            .includes(assigneeSearch.toLowerCase()) ||
                          member.email
                            .toLowerCase()
                            .includes(assigneeSearch.toLowerCase());
                        return !isAssigned && matchesSearch;
                      })
                      .map((member) => (
                        <button
                          key={member._id || member}
                          type="button"
                          onClick={() => {
                            const memberId = member._id || member;
                            if (!formData.assignees.includes(memberId)) {
                              setFormData({
                                ...formData,
                                assignees: [...formData.assignees, memberId],
                              });
                            }
                            setShowAssigneeDropdown(false);
                            setAssigneeSearch("");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left"
                        >
                          <Avatar
                            name={member.name}
                            src={member.avatar}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    {boardMembers.filter(
                      (member) =>
                        !formData.assignees.includes(member._id || member) &&
                        (!assigneeSearch ||
                          member.name
                            .toLowerCase()
                            .includes(assigneeSearch.toLowerCase()) ||
                          member.email
                            .toLowerCase()
                            .includes(assigneeSearch.toLowerCase()))
                    ).length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No members available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Completed Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="completed"
            checked={formData.completed}
            onChange={(e) =>
              setFormData({ ...formData, completed: e.target.checked })
            }
            className="h-4 w-4 rounded"
          />
          <Label htmlFor="completed" className="cursor-pointer">
            Mark as completed
          </Label>
        </div>

        {/* Labels */}
        <div>
          <Label>Labels</Label>
          <div className="mt-2 space-y-2">
            {/* Existing Labels */}
            {formData.labels.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {formData.labels.map((label, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: label.color || "#3b82f6" }}
                  >
                    <Tag className="h-3 w-3" />
                    <span>{label.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          labels: formData.labels.filter((_, i) => i !== index),
                        });
                      }}
                      className="ml-1 hover:opacity-80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Label */}
            {showLabelInput ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    placeholder="Label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <Input
                    type="color"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="h-10 w-16 p-1 cursor-pointer"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (newLabelName.trim()) {
                      setFormData({
                        ...formData,
                        labels: [
                          ...formData.labels,
                          { name: newLabelName.trim(), color: newLabelColor },
                        ],
                      });
                      setNewLabelName("");
                      setNewLabelColor("#3b82f6");
                      setShowLabelInput(false);
                    }
                  }}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowLabelInput(false);
                    setNewLabelName("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLabelInput(true)}
              >
                <Tag className="h-4 w-4 mr-2" />
                Add Label
              </Button>
            )}
          </div>
        </div>

        {/* Attachments */}
        {task && (
          <div>
            <Label>Attachments</Label>
            <div className="mt-2 space-y-2">
              {task.attachments && task.attachments.length > 0 ? (
                <div className="space-y-2">
                  {task.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-sm text-primary hover:underline truncate"
                      >
                        {attachment.name}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {attachment.uploadedAt
                          ? new Date(attachment.uploadedAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No attachments yet
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info("File upload feature coming soon");
                }}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Add Attachment
              </Button>
            </div>
          </div>
        )}

        {/* Custom Fields Section */}
        {customFieldDefinitions.length > 0 && (
          <div className="pt-4 border-t border-border">
            <Label className="text-base font-semibold mb-4 block">Custom Fields</Label>
            <div className="space-y-4">
              {customFieldDefinitions.map((fieldDef) => {
                const fieldValue = formData.customFields[fieldDef.fieldId] || fieldDef.defaultValue || "";
                
                return (
                  <div key={fieldDef.fieldId}>
                    <Label>
                      {fieldDef.name}
                      {fieldDef.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {fieldDef.type === "text" && (
                      <Input
                        value={fieldValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customFields: {
                              ...formData.customFields,
                              [fieldDef.fieldId]: e.target.value,
                            },
                          })
                        }
                        placeholder={`Enter ${fieldDef.name.toLowerCase()}`}
                        required={fieldDef.required}
                        className="mt-2"
                      />
                    )}
                    {fieldDef.type === "number" && (
                      <Input
                        type="number"
                        value={fieldValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customFields: {
                              ...formData.customFields,
                              [fieldDef.fieldId]: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder={`Enter ${fieldDef.name.toLowerCase()}`}
                        required={fieldDef.required}
                        className="mt-2"
                      />
                    )}
                    {fieldDef.type === "date" && (
                      <Input
                        type="date"
                        value={fieldValue ? new Date(fieldValue).toISOString().split("T")[0] : ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customFields: {
                              ...formData.customFields,
                              [fieldDef.fieldId]: e.target.value ? new Date(e.target.value).toISOString() : null,
                            },
                          })
                        }
                        required={fieldDef.required}
                        className="mt-2"
                      />
                    )}
                    {fieldDef.type === "select" && (
                      <Select
                        value={fieldValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customFields: {
                              ...formData.customFields,
                              [fieldDef.fieldId]: e.target.value,
                            },
                          })
                        }
                        required={fieldDef.required}
                        placeholder={`Select ${fieldDef.name.toLowerCase()}`}
                        className="mt-2"
                      >
                        {fieldDef.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    )}
                    {fieldDef.type === "checkbox" && (
                      <div className="mt-2">
                        <input
                          type="checkbox"
                          checked={fieldValue === true}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customFields: {
                                ...formData.customFields,
                                [fieldDef.fieldId]: e.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 rounded"
                        />
                        <span className="ml-2 text-sm text-muted-foreground">
                          {fieldDef.name}
                        </span>
                      </div>
                    )}
                    {fieldDef.type === "url" && (
                      <Input
                        type="url"
                        value={fieldValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customFields: {
                              ...formData.customFields,
                              [fieldDef.fieldId]: e.target.value,
                            },
                          })
                        }
                        placeholder="https://example.com"
                        required={fieldDef.required}
                        className="mt-2"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Time Tracking Section */}
        {task && (
          <div className="pt-4 border-t border-border">
            <TimeTracking
              taskId={task._id}
              boardId={boardId}
              onUpdate={onUpdate}
            />
          </div>
        )}

        {/* Comments Section */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4" />
            <Label className="text-base font-semibold">
              Comments ({comments.length})
            </Label>
          </div>

          {/* Comments List */}
          <div className="max-h-64 overflow-y-auto space-y-4 mb-4">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment, index) => {
                const commentUser = comment.user || {};
                return (
                  <div key={index} className="flex gap-3">
                    <Avatar
                      name={commentUser.name || "User"}
                      src={commentUser.avatar}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {commentUser.name || "Unknown User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm bg-muted rounded-lg p-2 whitespace-pre-wrap wrap-break-word">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Add Comment Form */}
          {user && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Avatar
                  name={user.name || "User"}
                  src={user.avatar}
                  size="sm"
                />
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleAddComment();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addingComment}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {addingComment ? "Adding..." : "Add Comment"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Task Info */}
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Created:</span>{" "}
              {formatDate(task.createdAt)}
            </div>
            <div>
              <span className="font-medium">Last updated:</span>{" "}
              {formatDate(task.updatedAt)}
            </div>
          </div>
        </div>

      </form>
    </Modal>
  );
};

export default TaskEditModal;