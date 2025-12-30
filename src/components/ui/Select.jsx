"use client";

import { useState, useRef, useEffect, Children } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

const Select = ({ 
  className, 
  error, 
  children, 
  placeholder,
  value,
  onChange,
  disabled,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);

  // Get the selected option text
  const getSelectedText = () => {
    if (!value && placeholder) return placeholder;
    const options = Array.from(selectRef.current?.options || []);
    const selected = options.find(opt => opt.value === value);
    return selected?.text || placeholder || "Select an option";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        selectRef.current &&
        !selectRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Extract options from children
  const extractOptions = () => {
    if (!children) return [];
    
    const options = [];
    
    Children.forEach(children, (child) => {
      if (!child || typeof child !== 'object') return;
      
      // Handle option elements
      if (child.type === 'option' || (child.props && child.props.value !== undefined)) {
        const value = child.props?.value ?? "";
        const text = typeof child.props?.children === 'string' 
          ? child.props.children 
          : child.props?.value ?? "";
        const disabled = child.props?.disabled ?? false;
        
        options.push({ value, text, disabled });
      }
    });
    
    return options;
  };

  const options = extractOptions();

  const handleOptionClick = (optionValue) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: optionValue },
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  return (
    <div className="w-full relative">
      {/* Hidden native select for form submission */}
      <select
        ref={selectRef}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>

      {/* Custom select button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-border/50 bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-border",
          error && "border-destructive focus:ring-destructive",
          isOpen && "ring-2 ring-primary/50 border-primary/50",
          className
        )}
      >
        <span className={cn(
          "truncate text-left",
          !value && placeholder && "text-muted-foreground"
        )}>
          {getSelectedText()}
        </span>
        <ChevronDown 
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Custom dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-100 w-full mt-1 bg-card border border-border/50 rounded-lg shadow-xl max-h-60 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="overflow-y-auto max-h-60 scrollbar-thin">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No options available
              </div>
            ) : (
              options.map((option, index) => {
                const optionValue = option.value;
                const optionText = option.text;
                const isSelected = String(value) === String(optionValue);
                const isDisabled = option.disabled;

                return (
                  <button
                    key={optionValue || index}
                    type="button"
                    onClick={() => !isDisabled && handleOptionClick(optionValue)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-all duration-150",
                      "hover:bg-accent/50 hover:text-foreground",
                      isSelected && "bg-accent/70 font-semibold text-foreground",
                      isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    <span className="truncate flex-1 pr-2">{optionText}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

export default Select;
