import { memo } from "react";
import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

const Avatar = memo(({ src, alt, name, className, size = "default" }) => {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    default: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizes[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt || name || "Avatar"}
          width={size === "sm" ? 32 : size === "lg" ? 48 : size === "xl" ? 64 : 40}
          height={size === "sm" ? 32 : size === "lg" ? 48 : size === "xl" ? 64 : 40}
          className="aspect-square h-full w-full object-cover"
          loading="lazy"
          unoptimized={src?.includes('cloudinary') || src?.startsWith('http')}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground font-semibold">
          {getInitials(name || alt || "?")}
        </div>
      )}
    </div>
  );
});

Avatar.displayName = "Avatar";

export default Avatar;