"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ProjectsPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchBoards();
    }
  }, [user]);

  const fetchBoards = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/boards?userId=${user.id}`);
      const data = await res.json();

      if (res.ok) {
        setBoards(data.boards || []);
      } else {
        toast.error(data.message || "Failed to fetch projects");
      }
    } catch (error) {
      toast.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const filteredBoards = boards.filter((board) =>
    board.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-lg">
            View and manage all your projects
          </p>
        </div>
        <Link href="/boards?create=true">
          <Button className="shadow-sm hover:shadow-md transition-shadow">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
        />
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      ) : filteredBoards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? "Try adjusting your search query"
                : "Get started by creating your first project"}
            </p>
            <Link href="/boards?create=true">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBoards.map((board) => (
            <Link key={board._id} href={`/boards/${board._id}`}>
              <Card className="h-full cursor-pointer border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-200 group overflow-hidden">
                <div
                  className={`h-36 rounded-t-xl ${board.background || "bg-blue-500"} relative transition-transform duration-200 group-hover:scale-105`}
                >
                  {board.isFavorite && (
                    <div className="absolute top-3 right-3">
                      <span className="text-yellow-400 text-xl drop-shadow-lg">★</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-lg mb-2 truncate group-hover:text-primary transition-colors">
                    {board.title}
                  </h3>
                  {board.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                      {board.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-border/50">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground font-medium">{formatDate(board.updatedAt)}</span>
                    </div>
                    <Badge variant="outline" className="capitalize font-medium">
                      {board.visibility || "private"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

