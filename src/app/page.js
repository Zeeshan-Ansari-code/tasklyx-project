"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Kanban, Users, Zap, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const features = [
    {
      icon: Kanban,
      title: "Kanban Boards",
      description: "Organize your work with intuitive drag-and-drop boards",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Work together seamlessly with your team in real-time",
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "See changes instantly with live synchronization",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and protected at all times",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold">
            Project Management Made{" "}
            <span className="text-primary">Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Organize, collaborate, and deliver projects faster with Tasklyx.
            The modern way to manage your team's work.
          </p>
          <div className="flex gap-4 justify-center mt-8">
            <Link href="/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Screenshot/Demo */}
        <div className="mt-16 rounded-lg border shadow-2xl overflow-hidden max-w-5xl mx-auto">
          <div className="aspect-video bg-gradient-blue flex items-center justify-center">
            <Kanban className="h-32 w-32 text-white/50" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to succeed
          </h2>
          <p className="text-muted-foreground text-lg">
            Powerful features to help your team stay organized
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="text-center p-6 rounded-lg border hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary rounded-2xl p-12 text-center text-primary-foreground">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of teams already using Tasklyx
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}