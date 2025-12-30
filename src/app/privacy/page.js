import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";

export const metadata = {
  title: "About Tasklyx | Project Information",
  description: "Learn about Tasklyx - Project Management Platform",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link href="/register">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Registration
          </Button>
        </Link>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">About Tasklyx</h1>
          <p className="text-muted-foreground mb-8">
            Project Management Platform Information
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">What is Tasklyx?</h2>
            <p className="mb-4">
              Tasklyx is a modern project management platform designed to help teams organize, collaborate, and deliver projects more efficiently. Built with a focus on simplicity and real-time collaboration, Tasklyx provides all the tools your team needs to stay productive and aligned.
            </p>
            <p>
              Whether you're managing a small team project or coordinating complex workflows across multiple departments, Tasklyx adapts to your needs with intuitive Kanban boards, smart task management, and seamless team collaboration.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Kanban Boards</h3>
            <p className="mb-4">
              Create and manage multiple Kanban boards to visualize your workflow. Organize tasks into customizable lists, drag and drop tasks between columns, and track progress at a glance.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Task Management</h3>
            <p className="mb-4">
              Create detailed tasks with:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Title, description, and priority levels (Low, Medium, High)</li>
              <li>Due dates and deadline tracking</li>
              <li>Task status: Pending, Ongoing, Paused, or Done</li>
              <li>Pause reasons for better communication</li>
              <li>File attachments and comments</li>
              <li>Multiple assignees per task</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Team Collaboration</h3>
            <p className="mb-4">
              Work together seamlessly with:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Role-based access control (Admin, Manager, Team Member, Viewer)</li>
              <li>Real-time updates and notifications</li>
              <li>Activity tracking and history</li>
              <li>Team member invitations and board sharing</li>
              <li>Comment threads on tasks</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Calendar Integration</h3>
            <p className="mb-4">
              View all your tasks and deadlines in a calendar view. See upcoming deadlines, track progress, and never miss an important date.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Notifications</h3>
            <p className="mb-4">
              Stay informed with real-time notifications for:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Task assignments and updates</li>
              <li>Task completions and reopenings</li>
              <li>Deadline reminders</li>
              <li>Team activities and board changes</li>
              <li>Comments and mentions</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Resource Management</h3>
            <p className="mb-4">
              Monitor team workload, allocate resources efficiently, and ensure balanced task distribution across team members.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Reports & Analytics</h3>
            <p className="mb-4">
              Generate insights with comprehensive reports on project progress, team performance, task completion rates, and velocity metrics.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Getting Started</h3>
            <ol className="list-decimal pl-6 mb-4 space-y-2">
              <li>Create an account with your email and password</li>
              <li>Set up your profile and preferences</li>
              <li>Create your first board or join an existing one</li>
              <li>Start adding tasks and inviting team members</li>
            </ol>

            <h3 className="text-xl font-semibold mb-3 mt-6">Board Management</h3>
            <p className="mb-4">
              Boards are the central workspace for your projects. Each board can contain multiple lists (columns) and tasks. You can:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Create unlimited boards for different projects</li>
              <li>Customize board settings and permissions</li>
              <li>Archive boards when projects are complete</li>
              <li>Export board data for backup or reporting</li>
              <li>Duplicate boards to reuse project templates</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Task Workflow</h3>
            <p className="mb-4">
              Tasks move through different stages:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Pending:</strong> Newly created tasks waiting to be started</li>
              <li><strong>Ongoing:</strong> Tasks currently in progress</li>
              <li><strong>Paused:</strong> Tasks temporarily halted (with optional reason)</li>
              <li><strong>Done:</strong> Completed tasks</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">User Roles</h2>
            <p className="mb-4">
              Tasklyx supports different user roles to match your team structure:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Admin:</strong> Full control over boards, members, and settings</li>
              <li><strong>Manager:</strong> Can manage tasks and team members within assigned boards</li>
              <li><strong>Team Member:</strong> Can create, edit, and complete tasks</li>
              <li><strong>Viewer:</strong> Read-only access to boards and tasks</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Dashboard Overview</h2>
            <p className="mb-4">
              Your dashboard provides a comprehensive view of your work:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Statistics:</strong> Overview of tasks, boards, and team activity</li>
              <li><strong>Recent Boards:</strong> Quick access to your most recent projects</li>
              <li><strong>Upcoming Deadlines:</strong> Tasks with approaching due dates</li>
              <li><strong>Recent Activity:</strong> Timeline of all team activities and updates</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Real-Time Collaboration</h2>
            <p className="mb-4">
              Tasklyx uses real-time technology to keep your team synchronized:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>See updates instantly as team members make changes</li>
              <li>Receive notifications in real-time</li>
              <li>Track activities as they happen</li>
              <li>Collaborate without refreshing the page</li>
            </ul>
          </section>

          <div className="mt-12 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              Tasklyx is designed to make project management simple and effective. Start organizing your work today!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
