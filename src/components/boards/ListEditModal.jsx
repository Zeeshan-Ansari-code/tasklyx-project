"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Label from "../ui/Label";
import Button from "../ui/Button";
import { toast } from "sonner";

const ListEditModal = ({ isOpen, onClose, list, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (list) {
      setTitle(list.title || "");
    }
  }, [list]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!list || !title.trim()) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/lists/${list._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("List updated successfully");
        onUpdate && onUpdate();
        onClose();
      } else {
        toast.error(data.message || "Failed to update list");
      }
    } catch (error) {
      toast.error("Failed to update list");
    } finally {
      setLoading(false);
    }
  };

  if (!list) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit List">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label required>List Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter list title"
            required
            autoFocus
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ListEditModal;