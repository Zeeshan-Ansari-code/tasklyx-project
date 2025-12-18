"use client";

import { useState } from "react";
import { Briefcase, Code, Users, ShoppingCart, GraduationCap, Home } from "lucide-react";
import Button from "../ui/Button";
import { Card, CardContent } from "../ui/Card";

const templates = [
  {
    id: "project-management",
    name: "Project Management",
    description: "Track tasks, sprints, and milestones",
    icon: Briefcase,
    lists: ["Backlog", "To Do", "In Progress", "Review", "Done"],
    color: "bg-blue-500",
  },
  {
    id: "software-development",
    name: "Software Development",
    description: "Plan and track development work",
    icon: Code,
    lists: ["Ideas", "Planning", "Development", "Testing", "Deployed"],
    color: "bg-green-500",
  },
  {
    id: "team-collaboration",
    name: "Team Collaboration",
    description: "Organize team tasks and projects",
    icon: Users,
    lists: ["New", "Assigned", "In Progress", "Blocked", "Completed"],
    color: "bg-purple-500",
  },
  {
    id: "marketing-campaign",
    name: "Marketing Campaign",
    description: "Plan and execute marketing activities",
    icon: ShoppingCart,
    lists: ["Planning", "Content Creation", "Review", "Published", "Analytics"],
    color: "bg-pink-500",
  },
  {
    id: "personal-goals",
    name: "Personal Goals",
    description: "Track personal projects and goals",
    icon: Home,
    lists: ["Ideas", "Planning", "In Progress", "Review", "Completed"],
    color: "bg-yellow-500",
  },
  {
    id: "education",
    name: "Education",
    description: "Organize courses and assignments",
    icon: GraduationCap,
    lists: ["To Learn", "Learning", "Practice", "Review", "Mastered"],
    color: "bg-indigo-500",
  },
];

const BoardTemplates = ({ onSelectTemplate, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose a template to get started quickly with pre-configured lists
      </p>
      <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`text-left p-4 border rounded-lg hover:bg-accent transition-colors ${
                selectedTemplate?.id === template.id
                  ? "border-primary ring-2 ring-primary"
                  : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-10 w-10 rounded-lg ${template.color} flex items-center justify-center shrink-0`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.lists.slice(0, 3).map((list, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 bg-muted rounded"
                      >
                        {list}
                      </span>
                    ))}
                    {template.lists.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{template.lists.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (selectedTemplate) {
              onSelectTemplate(selectedTemplate);
            }
          }}
          disabled={!selectedTemplate}
        >
          Use Template
        </Button>
      </div>
    </div>
  );
};

export default BoardTemplates;

