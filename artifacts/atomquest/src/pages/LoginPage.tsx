import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const DEMO_CREDENTIALS = [
  { username: "agent", password: "agent123", role: "Agent", color: "text-cyan-400" },
  { username: "admin", password: "admin123", role: "Admin", color: "text-purple-400" },
  { username: "customer", password: "customer123", role: "Customer", color: "text-emerald-400" },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await loginMutation.mutateAsync({ data: { username, password } });
      login(result.user, result.token);
      if (result.user.role === "admin") {
        setLocation("/admin");
      } else if (result.user.role === "agent") {
        setLocation("/agent");
      } else {
        toast({ title: "Customers must join via invite link", variant: "destructive" });
      }
    } catch {
      toast({ title: "Invalid credentials", description: "Check your username and password.", variant: "destructive" });
    }
  };

  const fillCredential = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setUsername(cred.username);
    setPassword(cred.password);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-bold text-sm text-primary-foreground">AQ</span>
            </div>
            <span className="text-xl font-semibold tracking-tight">AtomQuest</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sign in to your account to continue</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium tracking-wide uppercase">Demo Accounts</CardTitle>
            <CardDescription className="text-xs">Click to fill credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DEMO_CREDENTIALS.map(cred => (
                <button
                  key={cred.username}
                  type="button"
                  onClick={() => fillCredential(cred)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-muted hover:bg-muted/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${cred.color} w-16`}>{cred.role}</span>
                    <span className="text-sm font-mono text-foreground">{cred.username}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{cred.password}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
