import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  // Create a ref to prevent the warning by not accessing flushSync directly in a lifecycle method
  const [checked, setChecked] = React.useState(props.checked || false);
  
  // Handle checked change manually to avoid flushSync warning
  const handleCheckedChange = (checked: boolean) => {
    setChecked(checked);
    if (props.onCheckedChange) {
      // Use setTimeout to defer the execution outside of React rendering cycle
      setTimeout(() => {
        props.onCheckedChange?.(checked);
      }, 0);
    }
  };
  
  // Update local state when props change
  React.useEffect(() => {
    if (props.checked !== undefined && props.checked !== checked) {
      setChecked(props.checked);
    }
  }, [props.checked]);
  
  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        className
      )}
      {...props}
      ref={ref}
      checked={checked}
      onCheckedChange={handleCheckedChange}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitives.Root>
  );
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
