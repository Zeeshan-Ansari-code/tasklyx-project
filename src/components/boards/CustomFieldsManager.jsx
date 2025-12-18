"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Label from "../ui/Label";
import Select from "../ui/Select";
import Modal from "../ui/Modal";
import { toast } from "sonner";

const CustomFieldsManager = ({ boardId, userId, isOpen, onClose }) => {
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newField, setNewField] = useState({
    name: "",
    type: "text",
    required: false,
    options: [],
    defaultValue: "",
  });
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    if (isOpen && boardId) {
      fetchCustomFields();
    }
  }, [isOpen, boardId]);

  const fetchCustomFields = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/custom-fields`);
      const data = await res.json();
      if (res.ok) {
        setCustomFields(data.customFieldDefinitions || []);
      }
    } catch (error) {
      toast.error("Failed to fetch custom fields");
    }
  };

  const handleAddField = async () => {
    if (!newField.name.trim()) {
      toast.error("Field name is required");
      return;
    }

    if (newField.type === "select" && newField.options.length === 0) {
      toast.error("At least one option is required for select type");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/custom-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newField,
          userId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Custom field added successfully");
        setShowAddModal(false);
        setNewField({
          name: "",
          type: "text",
          required: false,
          options: [],
          defaultValue: "",
        });
        fetchCustomFields();
      } else {
        toast.error(data.message || "Failed to add custom field");
      }
    } catch (error) {
      toast.error("Failed to add custom field");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!confirm("Are you sure you want to delete this custom field? This will remove all values from tasks.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/boards/${boardId}/custom-fields?fieldId=${fieldId}&userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Custom field deleted successfully");
        fetchCustomFields();
      } else {
        toast.error(data.message || "Failed to delete custom field");
      }
    } catch (error) {
      toast.error("Failed to delete custom field");
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    if (newOption.trim() && !newField.options.includes(newOption.trim())) {
      setNewField({
        ...newField,
        options: [...newField.options, newOption.trim()],
      });
      setNewOption("");
    }
  };

  const removeOption = (index) => {
    setNewField({
      ...newField,
      options: newField.options.filter((_, i) => i !== index),
    });
  };

  const getTypeLabel = (type) => {
    const labels = {
      text: "Text",
      number: "Number",
      date: "Date",
      select: "Select",
      checkbox: "Checkbox",
      url: "URL",
    };
    return labels[type] || type;
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Custom Fields" size="lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Define custom fields that will be available for all tasks in this board.
            </p>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>

          {customFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No custom fields defined yet.</p>
              <p className="text-sm mt-2">
                Add custom fields to capture additional information for tasks.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {customFields.map((field) => (
                <div
                  key={field.fieldId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{field.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({getTypeLabel(field.type)})
                      </span>
                      {field.required && (
                        <span className="text-xs text-red-500">Required</span>
                      )}
                    </div>
                    {field.type === "select" && field.options && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Options: {field.options.join(", ")}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.fieldId)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Field Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewField({
            name: "",
            type: "text",
            required: false,
            options: [],
            defaultValue: "",
          });
          setNewOption("");
        }}
        title="Add Custom Field"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label required>Field Name</Label>
            <Input
              value={newField.name}
              onChange={(e) =>
                setNewField({ ...newField, name: e.target.value })
              }
              placeholder="e.g., Story Points, Client Name"
              className="mt-2"
            />
          </div>

          <div>
            <Label required>Field Type</Label>
            <Select
              value={newField.type}
              onChange={(e) =>
                setNewField({ ...newField, type: e.target.value, options: [] })
              }
              className="mt-2"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Select (Dropdown)</option>
              <option value="checkbox">Checkbox</option>
              <option value="url">URL</option>
            </Select>
          </div>

          {newField.type === "select" && (
            <div>
              <Label required>Options</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                  placeholder="Add option..."
                />
                <Button type="button" size="sm" onClick={addOption}>
                  Add
                </Button>
              </div>
              {newField.options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newField.options.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      <span>{option}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newField.required}
              onChange={(e) =>
                setNewField({ ...newField, required: e.target.checked })
              }
              className="h-4 w-4 rounded"
            />
            <Label>Required field</Label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setNewField({
                  name: "",
                  type: "text",
                  required: false,
                  options: [],
                  defaultValue: "",
                });
                setNewOption("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddField} disabled={loading}>
              {loading ? "Adding..." : "Add Field"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CustomFieldsManager;

