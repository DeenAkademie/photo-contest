import * as React from "react"
import { cn } from "../../lib/utils"

const Image = React.forwardRef(({ className, alt, ...props }, ref) => (
  <img
    ref={ref}
    className={cn(
      "h-auto w-full",
      className
    )}
    alt={alt}
    {...props}
  />
))
Image.displayName = "Image"

export { Image } 