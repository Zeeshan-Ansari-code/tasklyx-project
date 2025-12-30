"use client";

import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";
import Modal from "./Modal";
import { cn } from "@/lib/utils";

const KeyboardShortcuts = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Cmd/Ctrl + ? for shortcuts help
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setShowModal(true);
      }

      // Escape to close modals/dropdowns and cancel editing
      if (e.key === "Escape") {
        // Close any open dropdowns or modals
        const activeElement = document.activeElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        
        // Close task/list creation inputs
        const taskInputs = document.querySelectorAll('[data-task-input], [data-list-input]');
        taskInputs.forEach(input => {
          if (input === activeElement) {
            // Trigger blur or cancel event
            input.blur();
            // Try to find and click cancel button
            const cancelButton = input.closest('[data-add-section]')?.querySelector('[data-cancel-button]');
            if (cancelButton) {
              cancelButton.click();
            }
          }
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { keys: ["⌘", "K"], description: "Focus search" },
        { keys: ["⌘", "/"], description: "Show keyboard shortcuts" },
        { keys: ["Esc"], description: "Close modals/dropdowns" },
      ],
    },
    {
      category: "Boards",
      items: [
        { keys: ["N"], description: "New board (when on boards page)" },
        { keys: ["E"], description: "Edit board (when viewing board)" },
      ],
    },
    {
      category: "Tasks",
      items: [
        { keys: ["T"], description: "New task (when viewing board)" },
        { keys: ["Enter"], description: "Save task/list" },
        { keys: ["Esc"], description: "Cancel editing" },
      ],
    },
  ];

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="hidden md:flex fixed bottom-4 right-4 z-40 p-3 bg-card border border-border rounded-lg shadow-lg hover:bg-accent transition-colors items-center justify-center"
        title="Keyboard Shortcuts (⌘/)"
      >
        <Keyboard className="h-5 w-5" />
      </button>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Keyboard Shortcuts">
        <div className="space-y-6">
          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="font-semibold mb-3">{category.category}</h3>
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd
                            className={cn(
                              "px-2 py-1 text-xs font-semibold rounded border border-border bg-muted",
                              keyIndex > 0 && "ml-1"
                            )}
                          >
                            {key}
                          </kbd>
                          {keyIndex < item.keys.length - 1 && (
                            <span className="mx-1 text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default KeyboardShortcuts;

