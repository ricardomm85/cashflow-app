'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, onCheckedChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(props.checked || false);

    React.useEffect(() => {
      if (ref && typeof ref === 'object' && 'current' in ref && ref.current) {
        if (indeterminate) {
          ref.current.indeterminate = true;
        } else {
          ref.current.indeterminate = false;
        }
      }
    }, [indeterminate, ref]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsChecked(e.target.checked);
      onCheckedChange?.(e.target.checked);
      props.onChange?.(e);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          className="sr-only"
          checked={isChecked}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            'h-4 w-4 rounded border border-primary transition-colors',
            isChecked || indeterminate ? 'bg-primary border-primary' : 'bg-background'
          )}
        >
          {(isChecked || indeterminate) && (
            <Check className="h-3 w-3 text-primary-foreground mx-auto mt-0.5" />
          )}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
