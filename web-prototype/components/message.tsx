import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';
import type { ComponentProps, HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage['role'];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group w-full py-4',
      from === 'user' ? 'is-user flex justify-end' : 'is-assistant',
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      'flex flex-col gap-2 overflow-hidden text-foreground text-sm',
      // User messages: very light gray rounded bubble, max-width with margin
      'group-[.is-user]:bg-gray-100 group-[.is-user]:dark:bg-gray-100 group-[.is-user]:dark:text-gray-900 group-[.is-user]:rounded-2xl group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:max-w-3xl group-[.is-user]:mr-4',
      // Assistant messages: full width with centered container, no background
      'group-[.is-assistant]:max-w-3xl group-[.is-assistant]:mx-auto group-[.is-assistant]:px-4 group-[.is-assistant]:py-2',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar className={cn('size-8 ring-1 ring-border', className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || 'ME'}</AvatarFallback>
  </Avatar>
);
