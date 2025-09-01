'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        '[&_p]:mb-4 [&_p:last-child]:mb-0',
        '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-4',
        '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-4', 
        '[&_li]:py-0.5 [&_li]:mb-1',
        '[&_h1]:mb-4 [&_h2]:mb-3 [&_h3]:mb-2',
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';
