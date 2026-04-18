import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  iconSize?: number;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { containerClassName = "", iconSize = 16, className = "", ...props },
    ref,
  ) => {
    return (
      <div className={cn("relative", containerClassName)}>
        <Search
          size={iconSize}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
        />
        <input
          ref={ref}
          type="text"
          className={cn(
            "pl-9 pr-4 h-9 w-full rounded-lg border border-[#E5E7EB] bg-white text-sm",
            "text-[#111111] placeholder:text-[#9CA3AF]",
            "focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111]",
            "transition-colors duration-200",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
