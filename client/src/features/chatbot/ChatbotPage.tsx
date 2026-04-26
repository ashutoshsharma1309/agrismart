import { ChatPanel } from './ChatPanel';

export function ChatbotPage() {
  return (
    <div className="container-page py-6 md:py-10">
      <div className="mx-auto h-[calc(100vh-12rem)] max-w-3xl overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <ChatPanel variant="fullscreen" />
      </div>
    </div>
  );
}
