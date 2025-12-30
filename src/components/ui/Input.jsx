import { cn } from "@/lib/utils";

const Input = ({ className, type = "text", error, ...props }) => {
  return (
    <div className={cn("w-full", type === "date" && "relative")}>
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border/50 bg-background px-3.5 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          type === "date" && "pr-12",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default Input;