import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface HostComboboxOption {
  id: string;
  name: string;
  email?: string | null;
  employee_id?: string | null;
  department?: { id: string; name: string } | null;
}

interface HostComboboxProps {
  value?: string | null;
  options: HostComboboxOption[];
  onChange: (id: string, option: HostComboboxOption | undefined) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  showClear?: boolean;
  showDepartment?: boolean;
}

export function HostCombobox({
  value,
  options,
  onChange,
  onClear,
  placeholder = 'Select host',
  disabled = false,
  className,
  triggerClassName,
  showClear = true,
  showDepartment = true,
}: HostComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value) || null;

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'flex-1 justify-between font-normal',
              !selected && 'text-muted-foreground',
              triggerClassName,
            )}
          >
            <span className="truncate">
              {selected
                ? showDepartment && selected.department?.name
                  ? `${selected.name} - ${selected.department.name}`
                  : selected.name
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command
            filter={(itemValue, search) => {
              if (!search) return 1;
              return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Search host..." autoFocus />
            <CommandList>
              <CommandEmpty>No host found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const haystack = [
                    opt.name,
                    opt.email || '',
                    opt.employee_id || '',
                    opt.department?.name || '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <CommandItem
                      key={opt.id}
                      value={`${haystack} ${opt.id}`}
                      onSelect={() => {
                        onChange(opt.id, opt);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === opt.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">
                          {opt.name}
                          {showDepartment && opt.department?.name
                            ? ` - ${opt.department.name}`
                            : ''}
                        </span>
                        {(opt.email || opt.employee_id) && (
                          <span className="text-xs text-muted-foreground truncate">
                            {[opt.employee_id, opt.email].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {showClear && selected && onClear && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onClear}
          title="Clear host"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}