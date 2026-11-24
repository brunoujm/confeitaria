'use client';

import { PostEditor } from '@/components/editor/PostEditor';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};

export default function NewPostPage() {
  return (
    <PostEditor
      isEditing={false}
    />
  );
}